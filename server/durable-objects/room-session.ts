/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from "cloudflare:workers";
import type { Player, Room, Story, VotesMap } from "~/types/room";

interface Env {}

interface RoomState {
  room: Room | null;
  stories: Story[];
  players: Player[];
}

interface ConnectedUser {
  id: string;
  name: string;
  avatar: string;
}

interface VoteRow {
  [key: string]: string;
  story_id: string;
  user_id: string;
  vote_value: string;
}

const EMPTY_STATE: RoomState = {
  room: null,
  stories: [],
  players: [],
};

function parseState(value: string | null | undefined): RoomState {
  if (!value) return EMPTY_STATE;
  try {
    return JSON.parse(value) as RoomState;
  } catch {
    return EMPTY_STATE;
  }
}

function numericVote(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function summarizeVotes(votes: VotesMap) {
  const numericValues = Object.values(votes)
    .map(numericVote)
    .filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return {
      average: null,
      voteCount: 0,
    };
  }

  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return {
    average: Number((total / numericValues.length).toFixed(2)),
    voteCount: numericValues.length,
  };
}

export class RoomSession extends DurableObject<Env> {
  private sockets = new Map<WebSocket, ConnectedUser>();

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
      `);
    });
  }

  async joinRoom(request: Request, user: ConnectedUser, state: RoomState): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    await this.syncState(state, false);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    this.sockets.set(server, user);
    server.serializeAttachment(user);
    server.send(JSON.stringify(await this.buildStateMessage()));
    this.broadcastPresence();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async syncState(state: RoomState, broadcast = true) {
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('state', ?)",
      JSON.stringify(state),
    );

    if (broadcast) {
      this.broadcast(await this.buildStateMessage());
    }
  }

  async startVote(storyId: string) {
    this.ctx.storage.sql.exec("DELETE FROM votes WHERE story_id = ?", storyId);
    this.ctx.storage.sql.exec("DELETE FROM revealed_votes WHERE story_id = ?", storyId);
    await this.updateStoryStatus(storyId, "voting");
    this.broadcast(await this.buildStateMessage());
  }

  async stopVote(storyId: string) {
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

    await this.updateStoryStatus(storyId, "voted");
    this.broadcast(await this.buildStateMessage(true));

    return {
      votes,
      ...summarizeVotes(votes),
    };
  }

  async completeStory(storyId: string) {
    const revealedVotes = this.readRevealedVotes(storyId);
    const votes = Object.keys(revealedVotes).length > 0 ? revealedVotes : this.readVotes(storyId);

    await this.updateStoryStatus(storyId, "completed");
    this.broadcast(await this.buildStateMessage(true));

    return {
      votes,
      ...summarizeVotes(votes),
    };
  }

  async setActiveStory(storyId: string) {
    const state = await this.readState();
    state.stories = state.stories.map(story => {
      if (story.id === storyId) return { ...story, status: "active" };
      if (["active", "voting", "voted"].includes(story.status)) {
        return { ...story, status: "pending" };
      }
      return story;
    });
    await this.syncState(state);
  }

  async deleteRoom() {
    this.broadcast({ type: "room_deleted" });
    for (const socket of this.sockets.keys()) {
      socket.close(1000, "Room deleted");
    }
  }

  async poke(fromUserId: string) {
    this.broadcast({
      type: "poke",
      id: crypto.randomUUID(),
      fromUserId,
    });
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const user = this.sockets.get(socket) ?? socket.deserializeAttachment() as ConnectedUser | undefined;
    if (!user || typeof message !== "string") return;

    let parsed: { type?: string; value?: string };
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type === "vote" && parsed.value) {
      const state = await this.readState();
      const activeStory = state.stories.find(story => story.status === "voting");
      if (!activeStory) return;

      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO votes (story_id, user_id, vote_value) VALUES (?, ?, ?)",
        activeStory.id,
        user.id,
        parsed.value,
      );

      this.broadcast(await this.buildStateMessage());
    }

  }

  override webSocketClose(socket: WebSocket) {
    this.sockets.delete(socket);
    this.broadcastPresence();
  }

  override webSocketError(socket: WebSocket) {
    this.sockets.delete(socket);
    this.broadcastPresence();
  }

  private async updateStoryStatus(storyId: string, status: Story["status"]) {
    const state = await this.readState();
    state.stories = state.stories.map(story =>
      story.id === storyId ? { ...story, status } : story,
    );
    await this.syncState(state, false);
  }

  private async readState() {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM meta WHERE key = 'state'")
      .one();
    return parseState(row?.value);
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

  private async buildStateMessage(revealVotes = false) {
    const state = await this.readState();
    const activeStory = state.stories.find(story => ["active", "voting", "voted"].includes(story.status));
    const shouldRevealVotes = revealVotes || activeStory?.status === "voted" || activeStory?.status === "completed";
    const votes = activeStory
      ? shouldRevealVotes
        ? this.readVotes(activeStory.id)
        : Object.fromEntries(Object.keys(this.readVotes(activeStory.id)).map(userId => [userId, "__voted__"]))
      : {};

    return {
      type: "state",
      room: state.room,
      stories: state.stories,
      players: this.withOnlineState(state.players),
      votes,
    };
  }

  private withOnlineState(players: Player[]) {
    const onlineIds = new Set([...this.sockets.values()].map(user => user.id));
    return players.map(player => ({
      ...player,
      isOnline: onlineIds.has(player.id),
    }));
  }

  private broadcastPresence() {
    void this.readState().then(state => {
      this.broadcast({
        type: "presence",
        players: this.withOnlineState(state.players),
      });
    });
  }

  private broadcast(payload: unknown) {
    const message = JSON.stringify(payload);
    for (const socket of this.sockets.keys()) {
      try {
        socket.send(message);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}
