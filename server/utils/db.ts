import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "hub:db";
import type { CurrentUser } from "~/composables/useCurrentUser";
import type { Player, Room, Story, StoryVoteSnapshot } from "~/types/room";
import { requireRoomSessionNamespace } from "./cloudflare";

function toIso(value: Date | string | number | null | undefined) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function mapRoom(row: typeof schema.rooms.$inferSelect): Room {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    adminUserId: row.adminUserId,
    created_by: row.adminUserId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

export function mapStory(row: typeof schema.stories.$inferSelect): Story {
  return {
    id: row.id,
    roomId: row.roomId,
    room_id: row.roomId,
    title: row.title,
    status: row.status,
    sortOrder: row.sortOrder,
    finalEstimate: row.finalEstimate,
    voteAverage: row.voteAverage,
    voteCount: row.voteCount,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

export function avatarUrlFromPath(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/api/avatars/${path}`;
}

export async function ensureProfileForUser(user: Pick<CurrentUser, "id" | "email" | "name" | "image">) {
  const existing = await db.query.profiles.findFirst({
    where: eq(schema.profiles.userId, user.id),
  });

  if (existing) return existing;

  const [profile] = await db
    .insert(schema.profiles)
    .values({
      userId: user.id,
      name: user.name || user.email,
      avatarPath: user.image ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return profile;
}

export async function getRoomById(roomId: string) {
  const row = await db.query.rooms.findFirst({
    where: eq(schema.rooms.id, roomId),
  });

  return row ? mapRoom(row) : null;
}

export async function isRoomParticipant(roomId: string, userId: string) {
  const participant = await db.query.roomParticipants.findFirst({
    where: and(
      eq(schema.roomParticipants.roomId, roomId),
      eq(schema.roomParticipants.userId, userId),
    ),
  });

  return Boolean(participant);
}

export async function requireRoom(roomId: string) {
  const room = await getRoomById(roomId);
  if (!room) {
    throw createError({
      statusCode: 404,
      message: "Room not found.",
    });
  }
  return room;
}

export async function requireRoomParticipant(roomId: string, userId: string) {
  const room = await requireRoom(roomId);
  const isParticipant = await isRoomParticipant(roomId, userId);

  if (!isParticipant && room.adminUserId !== userId) {
    throw createError({
      statusCode: 403,
      message: "Join this room before accessing it.",
    });
  }

  return room;
}

export async function requireRoomAdmin(roomId: string, userId: string) {
  const room = await requireRoomParticipant(roomId, userId);
  if (room.adminUserId !== userId) {
    throw createError({
      statusCode: 403,
      message: "Only the room admin can do that.",
    });
  }
  return room;
}

export async function listRoomStories(roomId: string) {
  const rows = await db
    .select()
    .from(schema.stories)
    .where(eq(schema.stories.roomId, roomId))
    .orderBy(asc(schema.stories.sortOrder), asc(schema.stories.createdAt));

  return rows.map(mapStory);
}

export async function listRoomPlayers(roomId: string, adminUserId: string): Promise<Player[]> {
  const participants = await db
    .select()
    .from(schema.roomParticipants)
    .where(eq(schema.roomParticipants.roomId, roomId))
    .orderBy(asc(schema.roomParticipants.joinedAt));

  const userIds = participants.map(participant => participant.userId);
  if (userIds.length === 0) return [];

  const profiles = await db
    .select()
    .from(schema.profiles)
    .where(inArray(schema.profiles.userId, userIds));

  const profileMap = new Map(profiles.map(profile => [profile.userId, profile]));

  return userIds.map((userId) => {
    const profile = profileMap.get(userId);
    return {
      id: userId,
      name: profile?.name ?? "Unknown user",
      avatar: avatarUrlFromPath(profile?.avatarPath) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      isModerator: userId === adminUserId,
      isOnline: false,
    };
  });
}

export async function getRoomRealtimeSnapshot(roomId: string) {
  const room = await requireRoom(roomId);
  const [stories, players] = await Promise.all([
    listRoomStories(roomId),
    listRoomPlayers(roomId, room.adminUserId),
  ]);

  return {
    room,
    stories,
    players,
  };
}

export async function listStoryVoteSnapshots(storyId: string): Promise<StoryVoteSnapshot[]> {
  const rows = await db
    .select()
    .from(schema.storyVoteSnapshots)
    .where(eq(schema.storyVoteSnapshots.storyId, storyId));

  return rows.map(row => ({
    storyId: row.storyId,
    story_id: row.storyId,
    userId: row.userId,
    user_id: row.userId,
    voteValue: row.voteValue,
    vote_value: row.voteValue,
    createdAt: toIso(row.createdAt),
    created_at: toIso(row.createdAt),
  }));
}

export function getRoomSessionStub(event: Parameters<typeof requireRoomSessionNamespace>[0], roomId: string) {
  return requireRoomSessionNamespace(event).getByName(roomId) as DurableObjectStub<import("../durable-objects/room-session").RoomSession>;
}
