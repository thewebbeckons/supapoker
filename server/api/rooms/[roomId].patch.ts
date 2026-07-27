import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const updateRoomSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  adminUserId: z.string().min(1).optional(),
  mode: z.enum(["realtime", "async"]).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  const existingRoom = await requireRoomAdmin(roomId, user.id);
  const body = await readValidatedBody(event, updateRoomSchema.parse);
  const transferTarget = body.adminUserId && body.adminUserId !== user.id
    ? body.adminUserId
    : undefined;
  const nextMode = body.mode && body.mode !== existingRoom.mode ? body.mode : undefined;

  if (nextMode) {
    // Switching modes mid-flight would mean either collapsing several open
    // async stories into the single realtime slot, or inventing an expected
    // voter roster for a story that is already open. Requiring a quiet room
    // keeps this a pure metadata write with no vote state to migrate.
    const inFlight = await db.query.stories.findFirst({
      where: and(
        eq(schema.stories.roomId, roomId),
        inArray(schema.stories.status, ["active", "voting", "voted"]),
      ),
    });
    if (inFlight) {
      throw createError({
        statusCode: 400,
        message: "Finish or reset the story in progress before changing room mode.",
        data: { code: "ROOM_MODE_BUSY" },
      });
    }
  }

  if (transferTarget) {
    const canTransfer = await isRoomParticipant(roomId, transferTarget);
    if (!canTransfer) {
      throw createError({ statusCode: 400, message: "Admin can only be transferred to a room participant." });
    }

    const targetUser = await db.query.user.findFirst({
      where: eq(schema.user.id, transferTarget),
    });
    if (!targetUser || isAnonymousAppUser(targetUser)) {
      throw createError({
        statusCode: 400,
        message: "Guest users cannot be made room admins.",
        data: { code: "GUEST_CANNOT_BE_ADMIN" },
      });
    }
  }

  const update = db.update(schema.rooms)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(transferTarget ? { adminUserId: transferTarget } : {}),
      ...(nextMode ? { mode: nextMode } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId))
    .returning();

  const [room] = transferTarget && isAnonymousAppUser(user)
    ? (await db.batch([
        update,
        db.delete(schema.guestRoomOwnerships)
          .where(eq(schema.guestRoomOwnerships.userId, user.id)),
      ]))[0]
    : await update;

  if (!room) {
    throw createError({ statusCode: 404, message: "Room not found." });
  }

  await syncRoomSession(event, roomId);
  return mapRoom(room);
});
