export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  const room = await requireRoom(roomId);
  const joined = await isRoomParticipant(roomId, user.id);

  return {
    room,
    isParticipant: joined || room.adminUserId === user.id,
  };
});
