import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const updateRoomSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  adminUserId: z.string().min(1).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  const body = await readValidatedBody(event, updateRoomSchema.parse);

  if (body.adminUserId) {
    const canTransfer = await isRoomParticipant(roomId, body.adminUserId);
    if (!canTransfer) {
      throw createError({ statusCode: 400, message: "Admin can only be transferred to a room participant." });
    }
  }

  const [room] = await db
    .update(schema.rooms)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.adminUserId ? { adminUserId: body.adminUserId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId))
    .returning();

  if (!room) {
    throw createError({ statusCode: 404, message: "Room not found." });
  }

  await syncRoomSession(event, roomId);
  return mapRoom(room);
});
