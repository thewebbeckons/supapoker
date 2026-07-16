import type {
  ConnectedRoomUser,
  Player,
  Room,
  RoomRealtimeState,
  RoomRealtimeServerMessage,
  RoomSocketBootstrap,
  Story,
  VotesMap,
} from "~/types/room";
export const HIDDEN_VOTE = "__voted__";
export const ROOM_SESSION_USER_HEADER = "x-supapoker-room-user";
export const ROOM_DELETED_CLOSE_CODE = 4_004;
const STORY_STATUSES = new Set(["pending", "active", "voting", "voted", "completed"]);
const CARD_DECK_IDS = new Set([
  "modified-fibonacci",
  "fibonacci",
  "t-shirt",
  "effort",
  "powers-of-two",
  "linear",
  "custom",
]);
const MAX_ENCODED_USER_LENGTH = 8_192;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRoom(value: unknown): value is Room {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.name === "string"
    && (typeof value.description === "string" || value.description === null)
    && typeof value.adminUserId === "string"
    && typeof value.cardDeckId === "string"
    && CARD_DECK_IDS.has(value.cardDeckId)
    && Array.isArray(value.cardValues)
    && value.cardValues.length >= 2
    && value.cardValues.every(card => typeof card === "string");
}

function isStory(value: unknown): value is Story {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.roomId === "string"
    && typeof value.title === "string"
    && typeof value.status === "string"
    && STORY_STATUSES.has(value.status);
}

function isPlayer(value: unknown): value is Player {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.avatar === "string"
    && typeof value.isModerator === "boolean"
    && typeof value.isOnline === "boolean";
}

function isVotesMap(value: unknown): value is VotesMap {
  return isRecord(value) && Object.values(value).every(vote => typeof vote === "string");
}

export function isConnectedRoomUser(value: unknown): value is ConnectedRoomUser {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && value.name.length > 0
    && typeof value.avatar === "string"
    && value.avatar.length > 0;
}

export function isRoomSocketBootstrap(value: unknown): value is RoomSocketBootstrap {
  return isRecord(value)
    && typeof value.syncSequence === "number"
    && Number.isSafeInteger(value.syncSequence)
    && value.syncSequence > 0
    && isConnectedRoomUser(value.user)
    && isRoomRealtimeState(value.state);
}

export function isRoomRealtimeState(value: unknown): value is RoomRealtimeState {
  if (!isRecord(value)) return false;
  return (value.room === null || isRoom(value.room))
    && Array.isArray(value.stories)
    && value.stories.every(isStory)
    && Array.isArray(value.players)
    && value.players.every(isPlayer);
}

export function encodeRoomConnectionUser(user: ConnectedRoomUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function decodeRoomConnectionUser(value: string | null): ConnectedRoomUser | null {
  if (!value || value.length > MAX_ENCODED_USER_LENGTH) return null;

  try {
    const user: unknown = JSON.parse(decodeURIComponent(value));
    return isConnectedRoomUser(user) ? user : null;
  } catch {
    return null;
  }
}

export function votesForViewer(
  votes: VotesMap,
  viewerId: string,
  revealVotes: boolean,
): VotesMap {
  if (revealVotes) return { ...votes };

  return Object.fromEntries(
    Object.entries(votes).map(([userId, vote]) => [
      userId,
      userId === viewerId ? vote : HIDDEN_VOTE,
    ]),
  );
}

export function parseRoomRealtimeMessage(raw: string): RoomRealtimeServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === "snapshot") {
    if (typeof value.revision !== "number"
      || !Number.isSafeInteger(value.revision)
      || value.revision < 0
      || (value.room !== null && !isRoom(value.room))
      || !Array.isArray(value.stories)
      || !value.stories.every(isStory)
      || !Array.isArray(value.players)
      || !value.players.every(isPlayer)
      || !isVotesMap(value.votes)) return null;
    return {
      type: "snapshot",
      revision: value.revision,
      room: value.room,
      stories: value.stories,
      players: value.players,
      votes: value.votes,
    };
  }

  if (value.type === "presence") {
    if (!Array.isArray(value.players) || !value.players.every(isPlayer)) return null;
    return { type: "presence", players: value.players };
  }

  if (value.type === "votes") {
    if (typeof value.storyId !== "string" || !isVotesMap(value.votes)) return null;
    return { type: "votes", storyId: value.storyId, votes: value.votes };
  }

  if (value.type === "poke") {
    if (typeof value.id !== "string" || typeof value.fromUserId !== "string") return null;
    return { type: "poke", id: value.id, fromUserId: value.fromUserId };
  }

  if (value.type === "room_deleted") return { type: "room_deleted" };

  if (value.type === "error") {
    if (typeof value.code !== "string" || typeof value.message !== "string") return null;
    return { type: "error", code: value.code, message: value.message };
  }

  return null;
}
