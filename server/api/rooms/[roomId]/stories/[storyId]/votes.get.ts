import { and, eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  const storyId = getRouterParam(event, "storyId");
  if (!roomId || !storyId) throw createError({ statusCode: 400, message: "Room ID and story ID are required." });

  await requireRoomParticipant(roomId, user.id);
  const story = await db.query.stories.findFirst({
    where: and(eq(schema.stories.id, storyId), eq(schema.stories.roomId, roomId)),
  });

  if (!story) {
    throw createError({ statusCode: 404, message: "Story not found." });
  }

  const rows = await listStoryVoteSnapshots(storyId);
  return Object.fromEntries(rows.map(row => [row.userId, row.voteValue]));
});
