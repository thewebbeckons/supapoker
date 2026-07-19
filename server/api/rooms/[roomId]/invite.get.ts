export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  const room = await requireRoom(roomId);
  return {
    id: room.id,
    name: room.name,
    description: room.description,
  };
});
