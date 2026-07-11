import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  const stub = getRoomSessionStub(event, roomId);
  await stub.beginDelete();

  try {
    await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));
  } catch (error) {
    try {
      await stub.cancelDelete();
    } catch (rollbackError) {
      console.error("[rooms] Failed to roll back realtime room deletion", {
        roomId,
        error: rollbackError,
      });
    }
    throw error;
  }

  try {
    await stub.finalizeDelete();
  } catch (error) {
    console.error("[rooms] Failed to finalize realtime room deletion", { roomId, error });
  }

  return { ok: true };
});
