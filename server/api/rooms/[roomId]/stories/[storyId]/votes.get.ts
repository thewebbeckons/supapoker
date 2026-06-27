export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  const storyId = getRouterParam(event, "storyId");
  if (!roomId || !storyId) throw createError({ statusCode: 400, message: "Room ID and story ID are required." });

  await requireRoomParticipant(roomId, user.id);
  const rows = await listStoryVoteSnapshots(storyId);
  return Object.fromEntries(rows.map(row => [row.userId, row.voteValue]));
});
