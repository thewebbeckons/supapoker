import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setActive"), storyId: z.string() }),
  z.object({ type: z.literal("startVote"), storyId: z.string() }),
  z.object({ type: z.literal("stopVote"), storyId: z.string() }),
  z.object({ type: z.literal("completeStory"), storyId: z.string() }),
  z.object({ type: z.literal("poke") }),
]);

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const roomId = getRouterParam(event, "roomId");
  if (!roomId) throw createError({ statusCode: 400, message: "Room ID is required." });

  await requireRoomAdmin(roomId, user.id);
  const body = await readValidatedBody(event, actionSchema.parse);
  const now = new Date();
  const stub = getRoomSessionStub(event, roomId);

  if (body.type === "poke") {
    await stub.poke(user.id);
    return { ok: true };
  }

  const story = await db.query.stories.findFirst({
    where: and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)),
  });
  if (!story) {
    throw createError({ statusCode: 404, message: "Story not found." });
  }

  if (body.type === "setActive") {
    if (story.status === "completed") {
      throw createError({ statusCode: 400, message: "Completed stories cannot be made active." });
    }

    const currentVotingStory = await db.query.stories.findFirst({
      where: and(eq(schema.stories.roomId, roomId), eq(schema.stories.status, "voting")),
    });
    if (currentVotingStory && currentVotingStory.id !== body.storyId) {
      await stub.closeVoting(currentVotingStory.id);
    }
    await stub.discardVotes(body.storyId);

    await db.batch([
      db
        .update(schema.stories)
        .set({ status: "pending", updatedAt: now })
        .where(and(
          eq(schema.stories.roomId, roomId),
          inArray(schema.stories.status, ["active", "voting", "voted"]),
        )),
      db
        .update(schema.stories)
        .set({ status: "active", updatedAt: now })
        .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId))),
      db
        .delete(schema.storyVoteSnapshots)
        .where(eq(schema.storyVoteSnapshots.storyId, body.storyId)),
    ]);
    await syncRoomSession(event, roomId);
    return { ok: true };
  }

  if (body.type === "startVote") {
    if (!["active", "voted"].includes(story.status)) {
      throw createError({ statusCode: 400, message: "Only active or voted stories can start voting." });
    }

    await stub.resetVotes(body.storyId);
    await db.batch([
      db
        .update(schema.stories)
        .set({ status: "voting", updatedAt: now })
        .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId))),
      db
        .delete(schema.storyVoteSnapshots)
        .where(eq(schema.storyVoteSnapshots.storyId, body.storyId)),
    ]);
    await syncRoomSession(event, roomId);
    return { ok: true };
  }

  if (body.type === "stopVote") {
    if (story.status !== "voting") {
      throw createError({ statusCode: 400, message: "Only voting stories can stop voting." });
    }

    const result = await stub.revealVotes(body.storyId);
    const updateStory = db
      .update(schema.stories)
      .set({
        status: "voted",
        voteAverage: result.average,
        voteCount: result.voteCount,
        updatedAt: now,
      })
      .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));
    const clearSnapshots = db
      .delete(schema.storyVoteSnapshots)
      .where(eq(schema.storyVoteSnapshots.storyId, body.storyId));

    const snapshotRows = Object.entries(result.votes).map(([voterId, voteValue]) => ({
      storyId: body.storyId,
      userId: voterId,
      voteValue: String(voteValue),
      createdAt: now,
    }));
    if (snapshotRows.length > 0) {
      await db.batch([
        updateStory,
        clearSnapshots,
        db.insert(schema.storyVoteSnapshots).values(snapshotRows),
      ]);
    } else {
      await db.batch([updateStory, clearSnapshots]);
    }

    const phStopVote = useServerPostHog();
    const phStopVoteSessionId = getHeader(event, "x-posthog-session-id");
    const phStopVoteDistinctId = getHeader(event, "x-posthog-distinct-id") || user.id;
    phStopVote.capture({
      distinctId: phStopVoteDistinctId,
      event: "server_vote_revealed",
      properties: {
        $session_id: phStopVoteSessionId,
        room_id: roomId,
        story_id: body.storyId,
        vote_count: result.voteCount,
        vote_average: result.average,
      },
    });
    await phStopVote.flush();

    await syncRoomSession(event, roomId);
    return result;
  }

  if (story.status !== "voted") {
    throw createError({ statusCode: 400, message: "Only voted stories can be completed." });
  }

  const result = await stub.getVoteResult(body.storyId);
  const updateStory = db
    .update(schema.stories)
    .set({
      status: "completed",
      finalEstimate: result.average,
      voteAverage: result.average,
      voteCount: result.voteCount,
      updatedAt: now,
    })
    .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));
  const clearSnapshots = db
    .delete(schema.storyVoteSnapshots)
    .where(eq(schema.storyVoteSnapshots.storyId, body.storyId));

  const snapshotRows = Object.entries(result.votes).map(([voterId, voteValue]) => ({
    storyId: body.storyId,
    userId: voterId,
    voteValue: String(voteValue),
    createdAt: now,
  }));
  if (snapshotRows.length > 0) {
    await db.batch([
      updateStory,
      clearSnapshots,
      db.insert(schema.storyVoteSnapshots).values(snapshotRows),
    ]);
  } else {
    await db.batch([updateStory, clearSnapshots]);
  }

  const phComplete = useServerPostHog();
  const phCompleteSessionId = getHeader(event, "x-posthog-session-id");
  const phCompleteDistinctId = getHeader(event, "x-posthog-distinct-id") || user.id;
  phComplete.capture({
    distinctId: phCompleteDistinctId,
    event: "server_story_completed",
    properties: {
      $session_id: phCompleteSessionId,
      room_id: roomId,
      story_id: body.storyId,
      final_estimate: result.average,
      vote_count: result.voteCount,
    },
  });
  await phComplete.flush();

  await syncRoomSession(event, roomId);
  return result;
});
