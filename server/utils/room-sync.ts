import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export async function syncRoomSession(event: H3Event, roomId: string) {
  const stub = getRoomSessionStub(event, roomId);
  const sequence = await stub.beginStateSync();
  const snapshot = await getRoomRealtimeSnapshot(roomId);
  await stub.commitStateSync(sequence, snapshot);
  return snapshot;
}

export async function syncUserRoomSessions(event: H3Event, userId: string) {
  const [participantRows, adminRows] = await Promise.all([
    db
      .select({ roomId: schema.roomParticipants.roomId })
      .from(schema.roomParticipants)
      .where(eq(schema.roomParticipants.userId, userId)),
    db
      .select({ roomId: schema.rooms.id })
      .from(schema.rooms)
      .where(eq(schema.rooms.adminUserId, userId)),
  ]);

  const roomIds = new Set([
    ...participantRows.map(row => row.roomId),
    ...adminRows.map(row => row.roomId),
  ]);

  await Promise.all([...roomIds].map(roomId => syncRoomSession(event, roomId)));
}
