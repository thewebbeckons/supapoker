import { and, eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  const storyId = getRouterParam(event, "storyId");
  if (!roomId || !storyId) throw createError({ statusCode: 400, message: "Room ID and story ID are required." });

  await requireRoomAdmin(roomId, user.id);
  await db
    .delete(schema.stories)
    .where(and(eq(schema.stories.id, storyId), eq(schema.stories.roomId, roomId)));

  await syncRoomSession(event, roomId);
  return { ok: true };
});
