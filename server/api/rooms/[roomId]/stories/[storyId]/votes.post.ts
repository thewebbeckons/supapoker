import { and, eq } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";
import { isCardDeckVote, MAX_CARD_VALUE_LENGTH } from "~/utils/card-decks";

const voteSchema = z.object({
  value: z.string().min(1).max(MAX_CARD_VALUE_LENGTH),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  const storyId = getRouterParam(event, "storyId");
  if (!roomId || !storyId) throw createError({ statusCode: 400, message: "Room ID and story ID are required." });

  const room = await requireRoomParticipant(roomId, user.id);
  const body = await readValidatedBody(event, voteSchema.parse);
  if (!isCardDeckVote(body.value, room.cardValues)) {
    throw createError({ statusCode: 400, message: "That card is not part of this room's deck." });
  }

  const story = await db.query.stories.findFirst({
    where: and(eq(schema.stories.id, storyId), eq(schema.stories.roomId, roomId)),
  });
  if (!story) {
    throw createError({ statusCode: 404, message: "Story not found." });
  }
  if (story.status !== "voting") {
    throw createError({ statusCode: 400, message: "Story is not accepting votes." });
  }

  return getRoomSessionStub(event, roomId).submitVote(storyId, user.id, body.value);
});
