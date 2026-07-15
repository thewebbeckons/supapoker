import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
  turnstileToken: z.string().min(1).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const body = await readValidatedBody(event, createRoomSchema.parse);
  const now = new Date();
  const roomId = crypto.randomUUID();
  const anonymous = isAnonymousAppUser(user);

  if (anonymous) {
    const existingRoomId = await getGuestOwnedRoomId(user.id);
    if (existingRoomId) {
      throw createError({
        statusCode: 409,
        message: "Guests can create one active room. Create an account to make more.",
        data: { code: "GUEST_ROOM_LIMIT", roomId: existingRoomId },
      });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.userId, user.id),
    });
    const displayName = body.displayName || profile?.name;
    if (!displayName) {
      throw createError({ statusCode: 400, message: "Display name is required." });
    }
    if (!body.turnstileToken) {
      throw createError({
        statusCode: 403,
        message: "Please complete the security check.",
        data: { code: "TURNSTILE_FAILED" },
      });
    }
    await verifyGuestRoomCreation(event, body.turnstileToken);

    let createdRooms: (typeof schema.rooms.$inferSelect)[];
    try {
      const results = await db.batch([
        db.insert(schema.profiles).values({
          userId: user.id,
          name: displayName,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: schema.profiles.userId,
          set: { name: displayName, lastActiveAt: now, updatedAt: now },
        }),
        db.insert(schema.rooms).values({
          id: roomId,
          name: body.name,
          description: body.description?.trim() || null,
          adminUserId: user.id,
          createdAt: now,
          updatedAt: now,
        }).returning(),
        db.insert(schema.roomParticipants).values({ roomId, userId: user.id, joinedAt: now }),
        db.insert(schema.guestRoomOwnerships).values({ userId: user.id, roomId, createdAt: now }),
      ]);
      createdRooms = results[1];
    } catch (error) {
      const existingRoomId = await getGuestOwnedRoomId(user.id);
      if (existingRoomId) {
        throw createError({
          statusCode: 409,
          message: "Guests can create one active room. Create an account to make more.",
          data: { code: "GUEST_ROOM_LIMIT", roomId: existingRoomId },
        });
      }
      throw error;
    }

    const [room] = createdRooms;
    if (!room) throw createError({ statusCode: 500, message: "Unable to create room." });
    await syncRoomSession(event, roomId);
    setResponseStatus(event, 201);
    return mapRoom(room);
  }

  const [createdRooms] = await db.batch([
    db
      .insert(schema.rooms)
      .values({
        id: roomId,
        name: body.name,
        description: body.description?.trim() || null,
        adminUserId: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
    db.insert(schema.roomParticipants).values({
      roomId,
      userId: user.id,
      joinedAt: now,
    }),
  ]);

  const [room] = createdRooms;

  if (!room) {
    throw createError({ statusCode: 500, message: "Unable to create room." });
  }

  await syncRoomSession(event, roomId);

  setResponseStatus(event, 201);
  return mapRoom(room);
});
