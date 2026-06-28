import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));

  try {
    await getRoomSessionStub(event, roomId).deleteRoom();
  } catch (error) {
    console.error("[rooms] Failed to clean up realtime room after delete", { roomId, error });
  }

  return { ok: true };
});
