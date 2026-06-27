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
    await db
      .update(schema.stories)
      .set({ status: "pending", updatedAt: now })
      .where(and(
        eq(schema.stories.roomId, roomId),
        inArray(schema.stories.status, ["active", "voting", "voted"]),
      ));
    await db
      .update(schema.stories)
      .set({ status: "active", updatedAt: now })
      .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));
    await syncRoomSession(event, roomId);
    await stub.setActiveStory(body.storyId);
    return { ok: true };
  }

  if (body.type === "startVote") {
    await db
      .update(schema.stories)
      .set({ status: "voting", updatedAt: now })
      .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));
    await syncRoomSession(event, roomId);
    await stub.startVote(body.storyId);
    return { ok: true };
  }

  if (body.type === "stopVote") {
    const result = await stub.stopVote(body.storyId);
    await db
      .update(schema.stories)
      .set({
        status: "voted",
        voteAverage: result.average,
        voteCount: result.voteCount,
        updatedAt: now,
      })
      .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));
    await syncRoomSession(event, roomId);
    return result;
  }

  const result = await stub.completeStory(body.storyId);
  await db
    .update(schema.stories)
    .set({
      status: "completed",
      finalEstimate: result.average,
      voteAverage: result.average,
      voteCount: result.voteCount,
      updatedAt: now,
    })
    .where(and(eq(schema.stories.id, body.storyId), eq(schema.stories.roomId, roomId)));

  await db
    .delete(schema.storyVoteSnapshots)
    .where(eq(schema.storyVoteSnapshots.storyId, body.storyId));

  const snapshotRows = Object.entries(result.votes).map(([voterId, voteValue]) => ({
    storyId: body.storyId,
    userId: voterId,
    voteValue: String(voteValue),
    createdAt: now,
  }));
  if (snapshotRows.length > 0) {
    await db.insert(schema.storyVoteSnapshots).values(snapshotRows);
  }

  await syncRoomSession(event, roomId);
  return result;
});
