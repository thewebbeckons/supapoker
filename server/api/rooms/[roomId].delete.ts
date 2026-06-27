import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));
  await getRoomSessionStub(event, roomId).deleteRoom();

  return { ok: true };
});
