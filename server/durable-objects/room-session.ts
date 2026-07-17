/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from "cloudflare:workers";
import type {
  ConnectedRoomUser,
  RoomRealtimeServerMessage,
  RoomRealtimeState,
  VotesMap,
} from "~/types/room";
import {
  decodeRoomConnectionUser,
  isConnectedRoomUser,
  isRoomRealtimeState,
  ROOM_DELETED_CLOSE_CODE,
  ROOM_SESSION_USER_HEADER,
  votesForViewer,
} from "~/utils/room-realtime";
import { DEFAULT_CARD_VALUES, isCardDeckVote } from "~/utils/card-decks";

interface Env {}

interface VoteRow {
  [key: string]: string;
  story_id: string;
  user_id: string;
  vote_value: string;
}

const STATE_KEY = "state";
const REVISION_KEY = "revision";
const SYNC_SEQUENCE_KEY = "sync_sequence";
const COMMITTED_SYNC_KEY = "committed_sync";
const DELETED_KEY = "deleted";

function emptyState(): RoomRealtimeState {
  return {
    room: null,
    stories: [],
    players: [],
  };
}

function parseState(value: string | null | undefined): RoomRealtimeState {
  if (!value) return emptyState();

  try {
    const state: unknown = JSON.parse(value);
    return isRoomRealtimeState(state) ? state : emptyState();
  } catch {
    return emptyState();
  }
}

function numericVote(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function summarizeVotes(votes: VotesMap) {
  const voteCount = Object.keys(votes).length;
  const numericValues = Object.values(votes)
    .map(numericVote)
    .filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return {
      average: null,
      voteCount,
    };
  }

  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return {
    average: Number((total / numericValues.length).toFixed(2)),
    voteCount,
  };
}

export class RoomSession extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS votes (
          story_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          vote_value TEXT NOT NULL,
          PRIMARY KEY (story_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS revealed_votes (
          story_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          vote_value TEXT NOT NULL,
          PRIMARY KEY (story_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS closed_voting_stories (
          story_id TEXT PRIMARY KEY
        );
      `);

      if (!this.ctx.getWebSocketAutoResponse()) {
        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
      }
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    if (this.isDeleted()) {
      return new Response("Room deleted", { status: 410 });
    }

    const user = decodeRoomConnectionUser(request.headers.get(ROOM_SESSION_USER_HEADER));
    if (!user) {
      return new Response("Invalid room connection", { status: 401 });
    }

    return this.acceptConnection(user);
  }

  async syncState(state: RoomRealtimeState, broadcast = true): Promise<number> {
    const sequence = this.reserveStateSync();
    return this.commitStateSync(sequence, state, broadcast);
  }

  async beginStateSync(): Promise<number> {
    return this.reserveStateSync();
  }

  async commitStateSync(
    sequence: number,
    state: RoomRealtimeState,
    broadcast = true,
  ): Promise<number> {
    this.assertActive();

    if (!Number.isSafeInteger(sequence) || sequence <= 0) {
      throw new Error("Invalid room state sync sequence.");
    }

    if (!isRoomRealtimeState(state)) {
      throw new Error("Invalid room realtime state.");
    }

    const committedSequence = this.readMetaNumber(COMMITTED_SYNC_KEY);
    if (sequence <= committedSequence) return this.readRevision();

    const revision = this.readRevision() + 1;
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      STATE_KEY,
      JSON.stringify(state),
    );
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      REVISION_KEY,
      String(revision),
    );
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      COMMITTED_SYNC_KEY,
      String(sequence),
    );

    if (broadcast) this.broadcastSnapshot();
    return revision;
  }

  async resetVotes(storyId: string): Promise<void> {
    this.assertActive();
    this.ctx.storage.sql.exec("DELETE FROM votes WHERE story_id = ?", storyId);
    this.ctx.storage.sql.exec("DELETE FROM revealed_votes WHERE story_id = ?", storyId);
    this.ctx.storage.sql.exec("DELETE FROM closed_voting_stories WHERE story_id = ?", storyId);
  }

  async closeVoting(storyId: string): Promise<void> {
    this.assertActive();
    this.markVotingClosed(storyId);
  }

  async discardVotes(storyId: string): Promise<void> {
    this.assertActive();
    this.markVotingClosed(storyId);
    this.ctx.storage.sql.exec("DELETE FROM votes WHERE story_id = ?", storyId);
    this.ctx.storage.sql.exec("DELETE FROM revealed_votes WHERE story_id = ?", storyId);
  }

  async getVoteResult(storyId: string) {
    this.assertActive();
    const revealedVotes = this.readRevealedVotes(storyId);
    const votes = Object.keys(revealedVotes).length > 0 ? revealedVotes : this.readVotes(storyId);

    return {
      votes,
      ...summarizeVotes(votes),
    };
  }

  async revealVotes(storyId: string) {
    this.assertActive();
    if (this.isVotingClosed(storyId)) {
      throw new Error("Voting is already closed for this story.");
    }

    const story = this.readState().stories.find(candidate => candidate.id === storyId);
    if (story?.status !== "voting") {
      throw new Error("Story is not accepting votes.");
    }

    this.markVotingClosed(storyId);
    const votes = this.readVotes(storyId);
    this.ctx.storage.sql.exec("DELETE FROM revealed_votes WHERE story_id = ?", storyId);
    for (const [userId, voteValue] of Object.entries(votes)) {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO revealed_votes (story_id, user_id, vote_value) VALUES (?, ?, ?)",
        storyId,
        userId,
        voteValue,
      );
    }

    return {
      votes,
      ...summarizeVotes(votes),
    };
  }

  async submitVote(storyId: string, userId: string, voteValue: string) {
    this.assertActive();
    const cardValues = this.readState().room?.cardValues ?? DEFAULT_CARD_VALUES;
    if (!isCardDeckVote(voteValue, cardValues)) {
      throw new Error("Invalid vote value.");
    }

    if (this.isVotingClosed(storyId)) {
      throw new Error("Voting is closed for this story.");
    }

    const story = this.readState().stories.find(candidate => candidate.id === storyId);
    if (story?.status !== "voting") {
      throw new Error("Story is not accepting votes.");
    }

    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO votes (story_id, user_id, vote_value) VALUES (?, ?, ?)",
      storyId,
      userId,
      voteValue,
    );

    this.broadcastVotes(storyId);
    return { ok: true };
  }

  async beginDelete(): Promise<void> {
    const deletionState = this.readMetaValue(DELETED_KEY);
    if (!deletionState) {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        DELETED_KEY,
        "deleting",
      );
    }

    this.notifyRoomDeleted();
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }

  async cancelDelete(): Promise<void> {
    if (this.readMetaValue(DELETED_KEY) !== "deleting") return;
    this.ctx.storage.sql.exec("DELETE FROM meta WHERE key = ?", DELETED_KEY);
    await this.ctx.storage.deleteAlarm();
  }

  async finalizeDelete(): Promise<void> {
    if (!this.isDeleted()) throw new Error("Room deletion was not started.");
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      DELETED_KEY,
      "deleted",
    );
  }

  async poke(fromUserId: string): Promise<void> {
    this.assertActive();
    this.broadcast({
      type: "poke",
      id: crypto.randomUUID(),
      fromUserId,
    });
  }

  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message !== "string") return;

    try {
      const command: unknown = JSON.parse(message);
      if (typeof command === "object"
        && command !== null
        && "type" in command
        && command.type === "resync") {
        const user = this.connectionUser(socket);
        if (user) this.send(socket, this.buildSnapshotMessage(user.id));
      }
    } catch {
      this.send(socket, {
        type: "error",
        code: "invalid_message",
        message: "Invalid realtime message.",
      });
    }
  }

  override webSocketClose(socket: WebSocket): void {
    this.broadcastPresence(socket);
  }

  override webSocketError(socket: WebSocket): void {
    this.broadcastPresence(socket);
  }

  override alarm(): void {
    this.notifyRoomDeleted();
    this.ctx.storage.sql.exec("DELETE FROM meta WHERE key <> ?", DELETED_KEY);
    this.ctx.storage.sql.exec("DELETE FROM votes");
    this.ctx.storage.sql.exec("DELETE FROM revealed_votes");
    this.ctx.storage.sql.exec("DELETE FROM closed_voting_stories");
  }

  private acceptConnection(user: ConnectedRoomUser): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(user);
    this.send(server, this.buildSnapshotMessage(user.id));
    this.broadcastPresence();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private readState(): RoomRealtimeState {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", STATE_KEY)
      .toArray()[0];
    return parseState(row?.value);
  }

  private readRevision(): number {
    return this.readMetaNumber(REVISION_KEY);
  }

  private readMetaNumber(key: string): number {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key)
      .toArray()[0];
    const value = Number(row?.value ?? 0);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  private readMetaValue(key: string): string | null {
    return this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key)
      .toArray()[0]?.value ?? null;
  }

  private reserveStateSync(): number {
    this.assertActive();
    const sequence = this.readMetaNumber(SYNC_SEQUENCE_KEY) + 1;
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      SYNC_SEQUENCE_KEY,
      String(sequence),
    );
    return sequence;
  }

  private isDeleted(): boolean {
    return this.readMetaValue(DELETED_KEY) !== null;
  }

  private assertActive(): void {
    if (this.isDeleted()) throw new Error("Room has been deleted.");
  }

  private isVotingClosed(storyId: string): boolean {
    return this.ctx.storage.sql
      .exec<{ story_id: string }>(
        "SELECT story_id FROM closed_voting_stories WHERE story_id = ?",
        storyId,
      )
      .toArray().length > 0;
  }

  private markVotingClosed(storyId: string): void {
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO closed_voting_stories (story_id) VALUES (?)",
      storyId,
    );
  }

  private notifyRoomDeleted(): void {
    this.broadcast({ type: "room_deleted" });
    for (const socket of this.connectedSockets()) {
      try {
        socket.close(ROOM_DELETED_CLOSE_CODE, "Room deleted");
      } catch {
        // The socket is already closed.
      }
    }
  }

  private readVotes(storyId: string): VotesMap {
    const rows = this.ctx.storage.sql
      .exec<VoteRow>("SELECT story_id, user_id, vote_value FROM votes WHERE story_id = ?", storyId)
      .toArray();

    return Object.fromEntries(rows.map(row => [row.user_id, row.vote_value]));
  }

  private readRevealedVotes(storyId: string): VotesMap {
    const rows = this.ctx.storage.sql
      .exec<VoteRow>("SELECT story_id, user_id, vote_value FROM revealed_votes WHERE story_id = ?", storyId)
      .toArray();

    return Object.fromEntries(rows.map(row => [row.user_id, row.vote_value]));
  }

  private buildVotesMessage(
    storyId: string,
    viewerId: string,
    revealVotes = false,
  ): RoomRealtimeServerMessage {
    const currentVotes = this.readVotes(storyId);
    const revealedVotes = revealVotes ? this.readRevealedVotes(storyId) : {};
    const votes = revealVotes && Object.keys(revealedVotes).length > 0
      ? revealedVotes
      : votesForViewer(currentVotes, viewerId, revealVotes);

    return {
      type: "votes",
      storyId,
      votes,
    };
  }

  private buildSnapshotMessage(viewerId: string): RoomRealtimeServerMessage {
    const state = this.readState();
    const activeStory = state.stories.find(story => ["active", "voting", "voted"].includes(story.status));
    const currentVotes = activeStory ? this.readVotes(activeStory.id) : {};
    const revealedVotes = activeStory ? this.readRevealedVotes(activeStory.id) : {};

    let votes: VotesMap = {};
    if (activeStory?.status === "voting") {
      votes = votesForViewer(currentVotes, viewerId, false);
    } else if (activeStory?.status === "voted") {
      votes = Object.keys(revealedVotes).length > 0 ? revealedVotes : currentVotes;
    }

    return {
      type: "snapshot",
      revision: this.readRevision(),
      room: state.room,
      stories: state.stories,
      players: this.withOnlineState(state.players),
      votes,
    };
  }

  private broadcastSnapshot(): void {
    for (const socket of this.connectedSockets()) {
      const user = this.connectionUser(socket);
      if (user) this.send(socket, this.buildSnapshotMessage(user.id));
    }
  }

  private broadcastVotes(storyId: string, revealVotes = false): void {
    for (const socket of this.connectedSockets()) {
      const user = this.connectionUser(socket);
      if (user) this.send(socket, this.buildVotesMessage(storyId, user.id, revealVotes));
    }
  }

  private withOnlineState(
    players: RoomRealtimeState["players"],
    excludedSocket?: WebSocket,
  ) {
    const onlineIds = new Set(this.connectedUsers(excludedSocket).map(user => user.id));
    return players.map(player => ({
      ...player,
      isOnline: onlineIds.has(player.id),
    }));
  }

  private broadcastPresence(excludedSocket?: WebSocket): void {
    const players = this.withOnlineState(this.readState().players, excludedSocket);
    this.broadcast({ type: "presence", players }, excludedSocket);
  }

  private broadcast(payload: RoomRealtimeServerMessage, excludedSocket?: WebSocket): void {
    for (const socket of this.connectedSockets(excludedSocket)) {
      this.send(socket, payload);
    }
  }

  private send(socket: WebSocket, payload: RoomRealtimeServerMessage): void {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      try {
        socket.close(1011, "Realtime delivery failed");
      } catch {
        // The socket is already closed.
      }
    }
  }

  private connectedSockets(excludedSocket?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter(socket => socket !== excludedSocket);
  }

  private connectionUser(socket: WebSocket): ConnectedRoomUser | null {
    const user: unknown = socket.deserializeAttachment();
    return isConnectedRoomUser(user) ? user : null;
  }

  private connectedUsers(excludedSocket?: WebSocket): ConnectedRoomUser[] {
    return this.connectedSockets(excludedSocket)
      .map(socket => this.connectionUser(socket))
      .filter((user): user is ConnectedRoomUser => user !== null);
  }
}
