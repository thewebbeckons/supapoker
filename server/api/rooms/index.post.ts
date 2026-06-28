import { db, schema } from "hub:db";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const body = await readValidatedBody(event, createRoomSchema.parse);
  const now = new Date();
  const roomId = crypto.randomUUID();

  const room = await db.transaction(async (tx) => {
    const [createdRoom] = await tx
      .insert(schema.rooms)
      .values({
        id: roomId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        adminUserId: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!createdRoom) {
      throw createError({ statusCode: 500, message: "Unable to create room." });
    }

    await tx.insert(schema.roomParticipants).values({
      roomId,
      userId: user.id,
      joinedAt: now,
    });

    return createdRoom;
  });

  await syncRoomSession(event, roomId);

  setResponseStatus(event, 201);
  return mapRoom(room);
});
