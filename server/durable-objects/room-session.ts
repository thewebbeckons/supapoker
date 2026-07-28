/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from "cloudflare:workers";
import type {
  ConnectedRoomUser,
  RoomRealtimeServerMessage,
  RoomRealtimeState,
  StoryVoteProgress,
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
import { consensusValue, summarizeVotes, voteProgress } from "~/utils/async-voting";

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
    const votes = this.readFrozenVotes(storyId);

    return {
      votes,
      consensus: consensusValue(votes),
      ...summarizeVotes(votes),
    };
  }

  /**
   * Closes voting and freezes the result. Idempotent: when voting is already
   * closed it returns the frozen result instead of throwing, so a retry or a
   * second racing caller can never strand a story in `voting` with the Durable
   * Object refusing both further votes and any reveal.
   */
  async finalizeVoting(storyId: string) {
    this.assertActive();

    if (this.isVotingClosed(storyId)) {
      const frozenVotes = this.readFrozenVotes(storyId);
      return {
        votes: frozenVotes,
        consensus: consensusValue(frozenVotes),
        ...summarizeVotes(frozenVotes),
      };
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
      consensus: consensusValue(votes),
      ...summarizeVotes(votes),
    };
  }

  /**
   * `expectedVoterIds` is supplied by async rooms and comes from D1, never from
   * Durable Object storage, which is wiped when a room is deleted. When the last
   * expected voter votes, this latches voting closed inside the same RPC call
   * and reports `shouldFinalize`. A Durable Object handles one call at a time and
   * the latch is checked before it is set, so exactly one caller can win the race
   * and exactly one request goes on to write the result to D1.
   */
  async submitVote(
    storyId: string,
    userId: string,
    voteValue: string,
    expectedVoterIds?: string[],
  ) {
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

    const progress = expectedVoterIds
      ? voteProgress(expectedVoterIds, Object.keys(this.readVotes(storyId)))
      : null;
    const shouldFinalize = Boolean(progress && progress.expected > 0 && progress.voted >= progress.expected);
    if (shouldFinalize) this.markVotingClosed(storyId);

    this.broadcastVotes(storyId);
    return {
      ok: true as const,
      voted: progress?.voted ?? 0,
      expected: progress?.expected ?? 0,
      shouldFinalize,
    };
  }

  /** Counts and voter ids per story. Never returns vote values. */
  async getVoteProgress(
    entries: { storyId: string; expectedVoterIds: string[] }[],
  ): Promise<Record<string, StoryVoteProgress>> {
    this.assertActive();

    const result: Record<string, StoryVoteProgress> = {};
    for (const entry of entries) {
      const voterIds = Object.keys(this.readVotes(entry.storyId));
      const progress = voteProgress(entry.expectedVoterIds, voterIds);
      result[entry.storyId] = {
        voted: progress.voted,
        expected: progress.expected,
        voterIds,
      };
    }
    return result;
  }

  /**
   * One viewer's own card on each story, for the HTTP snapshot path. Async rooms
   * are usually cold, so the page load cannot rely on a live socket.
   */
  async getViewerVotes(viewerId: string, storyIds: string[]): Promise<Record<string, string>> {
    this.assertActive();

    const result: Record<string, string> = {};
    for (const storyId of storyIds) {
      const vote = this.readVotes(storyId)[viewerId];
      if (vote !== undefined) result[storyId] = vote;
    }
    return result;
  }

  async transferUserIdentity(fromUserId: string, toUserId: string): Promise<void> {
    this.assertActive();
    if (fromUserId === toUserId) return;

    for (const table of ["votes", "revealed_votes"] as const) {
      this.ctx.storage.sql.exec(
        `INSERT OR IGNORE INTO ${table} (story_id, user_id, vote_value)
         SELECT story_id, ?, vote_value FROM ${table} WHERE user_id = ?`,
        toUserId,
        fromUserId,
      );
      this.ctx.storage.sql.exec(`DELETE FROM ${table} WHERE user_id = ?`, fromUserId);
    }

    for (const socket of this.connectedSockets()) {
      const user = this.connectionUser(socket);
      if (user?.id === fromUserId) {
        socket.serializeAttachment({ ...user, id: toUserId });
      }
    }

    this.broadcastSnapshot();
    this.broadcastPresence();
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

  /**
   * The authoritative result for a story: the frozen reveal when one exists,
   * otherwise whatever is still live.
   */
  private readFrozenVotes(storyId: string): VotesMap {
    const revealedVotes = this.readRevealedVotes(storyId);
    return Object.keys(revealedVotes).length > 0 ? revealedVotes : this.readVotes(storyId);
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
