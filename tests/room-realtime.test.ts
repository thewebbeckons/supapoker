import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeRoomConnectionUser,
  encodeRoomConnectionUser,
  HIDDEN_VOTE,
  isRoomSocketBootstrap,
  parseRoomRealtimeMessage,
  votesForViewer,
} from "../app/utils/room-realtime.ts";
import {
  cardValuesValidationError,
  isCardDeckVote,
  parseCustomCardValues,
} from "../app/utils/card-decks.ts";

const room = {
  id: "room-1",
  name: "Realtime room",
  description: null,
  adminUserId: "admin-1",
  cardDeckId: "modified-fibonacci" as const,
  cardValues: ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
  createdAt: "2026-07-11T12:00:00.000Z",
  updatedAt: "2026-07-11T12:00:00.000Z",
  created_at: "2026-07-11T12:00:00.000Z",
  updated_at: "2026-07-11T12:00:00.000Z",
};

const story = {
  id: "story-1",
  roomId: room.id,
  room_id: room.id,
  title: "Estimate realtime",
  status: "voting" as const,
  sortOrder: 0,
  finalEstimate: null,
  voteAverage: null,
  voteCount: 0,
  createdAt: "2026-07-11T12:00:00.000Z",
  updatedAt: "2026-07-11T12:00:00.000Z",
  created_at: "2026-07-11T12:00:00.000Z",
  updated_at: "2026-07-11T12:00:00.000Z",
};

const players = [
  {
    id: "admin-1",
    name: "Admin",
    avatar: "/admin.png",
    isModerator: true,
    isOnline: true,
  },
  {
    id: "user-1",
    name: "User",
    avatar: "/user.png",
    isModerator: false,
    isOnline: true,
  },
];

test("connection user encoding safely round-trips unicode", () => {
  const user = {
    id: "user-1",
    name: "Josée 🐦",
    avatar: "/avatar/Josée.png?size=64&theme=dark",
  };

  assert.deepEqual(decodeRoomConnectionUser(encodeRoomConnectionUser(user)), user);
  assert.equal(decodeRoomConnectionUser("not-json"), null);
  assert.equal(decodeRoomConnectionUser("x".repeat(8_193)), null);
});

test("hidden votes reveal only the current viewer's card", () => {
  const votes = { "admin-1": "5", "user-1": "8" };

  assert.deepEqual(votesForViewer(votes, "admin-1", false), {
    "admin-1": "5",
    "user-1": HIDDEN_VOTE,
  });
  assert.deepEqual(votesForViewer(votes, "user-1", false), {
    "admin-1": HIDDEN_VOTE,
    "user-1": "8",
  });
  assert.deepEqual(votesForViewer(votes, "admin-1", true), votes);
});

test("only cards from the planning poker deck are accepted", () => {
  assert.equal(isCardDeckVote("0.5", room.cardValues), true);
  assert.equal(isCardDeckVote("☕", room.cardValues), true);
  assert.equal(isCardDeckVote("999", room.cardValues), false);
  assert.equal(isCardDeckVote(8, room.cardValues), false);
  assert.equal(isCardDeckVote("XL", ["S", "M", "L", "XL"]), true);
});

test("custom decks are parsed and reject ambiguous values", () => {
  assert.deepEqual(parseCustomCardValues("Tiny, Small\nMedium, Large"), [
    "Tiny",
    "Small",
    "Medium",
    "Large",
  ]);
  assert.equal(cardValuesValidationError(["S", "M", "L"]), null);
  assert.match(cardValuesValidationError(["S", "S"]) ?? "", /unique/i);
  assert.match(cardValuesValidationError(["S", "__voted__"]) ?? "", /reserved/i);
});

test("the socket bootstrap validates the complete room state", () => {
  assert.equal(isRoomSocketBootstrap({
    syncSequence: 3,
    user: { id: "admin-1", name: "Admin", avatar: "/admin.png" },
    state: { room, stories: [story], players },
  }), true);

  assert.equal(isRoomSocketBootstrap({
    syncSequence: 0,
    user: { id: "admin-1", name: "", avatar: "/admin.png" },
    state: { room, stories: [story], players },
  }), false);
});

test("the client parser accepts typed snapshots and rejects malformed frames", () => {
  const snapshot = parseRoomRealtimeMessage(JSON.stringify({
    type: "snapshot",
    revision: 7,
    room,
    stories: [story],
    players,
    votes: { "admin-1": "5", "user-1": HIDDEN_VOTE },
  }));

  assert.equal(snapshot?.type, "snapshot");
  if (snapshot?.type === "snapshot") {
    assert.equal(snapshot.revision, 7);
    assert.equal(snapshot.players.every(player => player.isOnline), true);
  }

  assert.equal(parseRoomRealtimeMessage("not-json"), null);
  assert.equal(parseRoomRealtimeMessage(JSON.stringify({
    type: "snapshot",
    revision: 6.5,
    room,
    stories: [story],
    players,
    votes: {},
  })), null);
  assert.equal(parseRoomRealtimeMessage(JSON.stringify({
    type: "votes",
    storyId: "story-1",
    votes: { "user-1": 8 },
  })), null);
});
