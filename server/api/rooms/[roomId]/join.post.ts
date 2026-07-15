import { db, schema } from "hub:db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const joinRoomSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoom(roomId);
  const body = await readValidatedBody(event, joinRoomSchema.parse);
  const now = new Date();

  if (isAnonymousAppUser(user)) {
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.userId, user.id),
    });
    const name = body.name || profile?.name;
    if (!name) throw createError({ statusCode: 400, message: "Display name is required." });

    await db.batch([
      db.insert(schema.profiles).values({
        userId: user.id,
        name,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: schema.profiles.userId,
        set: { name, lastActiveAt: now, updatedAt: now },
      }),
      db.insert(schema.roomParticipants).values({ roomId, userId: user.id, joinedAt: now }).onConflictDoNothing(),
    ]);
  } else {
    await db.insert(schema.roomParticipants)
      .values({ roomId, userId: user.id, joinedAt: now })
      .onConflictDoNothing();
  }

  await syncRoomSession(event, roomId);
  return { ok: true };
});
