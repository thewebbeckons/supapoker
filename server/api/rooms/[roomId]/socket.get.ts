import { toWebRequest } from "h3";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  const room = await requireRoomParticipant(roomId, user.id);
  const snapshot = await getRoomRealtimeSnapshot(roomId);
  const players = await listRoomPlayers(roomId, room.adminUserId);
  const currentPlayer = players.find(player => player.id === user.id);

  return getRoomSessionStub(event, roomId).joinRoom(
    toWebRequest(event),
    {
      id: user.id,
      name: currentPlayer?.name ?? user.name ?? user.email,
      avatar: currentPlayer?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    },
    snapshot,
  );
});
