import { desc, eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);

  const rows = await db
    .select({ room: schema.rooms })
    .from(schema.roomParticipants)
    .innerJoin(schema.rooms, eq(schema.roomParticipants.roomId, schema.rooms.id))
    .where(eq(schema.roomParticipants.userId, user.id))
    .orderBy(desc(schema.rooms.updatedAt));

  return rows.map(({ room }) => ({
    ...mapRoom(room),
    role: room.adminUserId === user.id ? "creator" : "participant",
    lastUsed: mapRoom(room).updated_at,
  }));
});
