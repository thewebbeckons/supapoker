import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoom(roomId);
  await db
    .insert(schema.roomParticipants)
    .values({
      roomId,
      userId: user.id,
      joinedAt: new Date(),
    })
    .onConflictDoNothing();

  await syncRoomSession(event, roomId);
  return { ok: true };
});
