import { eq } from "drizzle-orm";
import { useLogger } from "evlog";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const log = useLogger(event);
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
      log.error(
        rollbackError instanceof Error ? rollbackError : String(rollbackError),
        { operation: "room.delete.realtime-rollback" },
      );
    }
    throw error;
  }

  try {
    await stub.finalizeDelete();
  } catch (error) {
    log.error(
      error instanceof Error ? error : String(error),
      { operation: "room.delete.realtime-finalize" },
    );
  }

  return { ok: true };
});
