import type { H3Event } from "h3";

export async function syncRoomSession(event: H3Event, roomId: string) {
  const snapshot = await getRoomRealtimeSnapshot(roomId);
  await getRoomSessionStub(event, roomId).syncState(snapshot);
  return snapshot;
}
