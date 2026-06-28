import { eq, max } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const createStoriesSchema = z.object({
  titles: z.array(z.string().min(1).max(240)).min(1).max(50),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  const body = await readValidatedBody(event, createStoriesSchema.parse);
  const [sortOrderRow] = await db
    .select({ value: max(schema.stories.sortOrder) })
    .from(schema.stories)
    .where(eq(schema.stories.roomId, roomId));
  const nextSortOrder = (sortOrderRow?.value ?? -1) + 1;

  const now = new Date();
  const rows = body.titles.map((title, index) => ({
    id: crypto.randomUUID(),
    roomId,
    title: title.trim(),
    status: "pending" as const,
    sortOrder: nextSortOrder + index,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(schema.stories).values(rows);
  await syncRoomSession(event, roomId);

  setResponseStatus(event, 201);
  return rows.map(row => ({
    ...row,
    finalEstimate: null,
    voteAverage: null,
    voteCount: 0,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    room_id: row.roomId,
  }));
});
