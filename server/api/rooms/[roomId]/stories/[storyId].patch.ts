import { and, eq } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const updateStorySchema = z.object({
  title: z.string().min(1).max(240),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  const storyId = getRouterParam(event, "storyId");
  if (!roomId || !storyId) throw createError({ statusCode: 400, message: "Room ID and story ID are required." });

  await requireRoomAdmin(roomId, user.id);
  const body = await readValidatedBody(event, updateStorySchema.parse);
  const [story] = await db
    .update(schema.stories)
    .set({ title: body.title.trim(), updatedAt: new Date() })
    .where(and(eq(schema.stories.id, storyId), eq(schema.stories.roomId, roomId)))
    .returning();

  if (!story) {
    throw createError({ statusCode: 404, message: "Story not found." });
  }

  await syncRoomSession(event, roomId);
  return mapStory(story);
});
