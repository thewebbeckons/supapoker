import type { RoomSocketBootstrap } from "~/types/room";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomParticipant(roomId, user.id);
  const syncSequence = await getRoomSessionStub(event, roomId).beginStateSync();
  const state = await getRoomRealtimeSnapshot(roomId);
  const currentPlayer = state.players.find(player => player.id === user.id);

  return {
    syncSequence,
    user: {
      id: user.id,
      name: currentPlayer?.name ?? user.name ?? user.email,
      avatar: currentPlayer?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    },
    state,
  } satisfies RoomSocketBootstrap;
});
