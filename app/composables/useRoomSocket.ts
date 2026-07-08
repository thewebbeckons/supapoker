import type { Player, Room, Story, VotesMap } from "~/types/room";

interface RoomSocketState {
  room: Ref<Room | null>;
  stories: Ref<Story[]>;
  players: Ref<Player[]>;
  votes: Ref<VotesMap>;
  lastPokeId: Ref<string | null>;
  isConnected: Ref<boolean>;
  connect: () => void;
  disconnect: () => void;
  send: (payload: unknown) => boolean;
}

type SharedRoomSocketState = RoomSocketState & {
  socket: WebSocket | null;
  activeSubscribers: number;
};

const roomSockets = new Map<string, SharedRoomSocketState>();
const STORY_FLOW_STATUSES = new Set(["active", "voting", "voted"]);

function storyUpdatedAtValue(story: Story) {
  return Date.parse(story.updatedAt || story.updated_at || "") || 0;
}

function isFlowStory(story: Story) {
  return STORY_FLOW_STATUSES.has(story.status);
}

function mergeStories(currentStories: Story[], incomingStories: Story[]) {
  const currentById = new Map(currentStories.map(story => [story.id, story]));
  let ignoredStaleFlowStory = false;

  const stories = incomingStories.map((incomingStory) => {
    const currentStory = currentById.get(incomingStory.id);
    if (!currentStory) return incomingStory;

    if (storyUpdatedAtValue(currentStory) > storyUpdatedAtValue(incomingStory)) {
      ignoredStaleFlowStory ||= isFlowStory(currentStory) || isFlowStory(incomingStory);
      return currentStory;
    }

    return incomingStory;
  });

  return {
    stories,
    ignoredStaleFlowStory,
  };
}

function createRoomSocket(roomId: string): SharedRoomSocketState {
  const room = ref<Room | null>(null);
  const stories = ref<Story[]>([]);
  const players = ref<Player[]>([]);
  const votes = ref<VotesMap>({});
  const lastPokeId = ref<string | null>(null);
  const isConnected = ref(false);
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = false;

  function websocketUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/rooms/${roomId}/socket`;
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function applyMessage(message: any) {
    if (message.type === "state") {
      const incomingStories = message.stories ?? [];
      const merged = mergeStories(stories.value, incomingStories);

      room.value = message.room ?? null;
      stories.value = merged.stories;
      players.value = message.players ?? [];
      if (!merged.ignoredStaleFlowStory) {
        votes.value = message.votes ?? {};
      }
    }

    if (message.type === "presence") {
      players.value = message.players ?? [];
    }

    if (message.type === "room_deleted") {
      void navigateTo("/rooms");
    }

    if (message.type === "poke") {
      lastPokeId.value = message.id ?? crypto.randomUUID();
    }
  }

  function connect() {
    if (typeof window === "undefined") return;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

    shouldReconnect = true;
    clearReconnectTimer();
    socket = new WebSocket(websocketUrl());

    socket.addEventListener("open", () => {
      isConnected.value = true;
    });

    socket.addEventListener("message", (event) => {
      try {
        applyMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed realtime messages.
      }
    });

    socket.addEventListener("close", () => {
      isConnected.value = false;
      socket = null;
      if (shouldReconnect) {
        reconnectTimer = setTimeout(connect, 1500);
      }
    });

    socket.addEventListener("error", () => {
      isConnected.value = false;
    });
  }

  function disconnect() {
    shouldReconnect = false;
    clearReconnectTimer();
    if (socket) {
      socket.close();
      socket = null;
    }
    isConnected.value = false;
  }

  function send(payload: unknown) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }

  return {
    room,
    stories,
    players,
    votes,
    lastPokeId,
    isConnected,
    connect,
    disconnect,
    send,
    activeSubscribers: 0,
    get socket() {
      return socket;
    },
    set socket(value) {
      socket = value;
    },
  };
}

export function useRoomSocket(roomId: string, isEnabled: Ref<boolean> = ref(true)) {
  let state = roomSockets.get(roomId);
  if (!state) {
    state = createRoomSocket(roomId);
    roomSockets.set(roomId, state);
  }
  let isAcquired = false;

  function acquire() {
    if (typeof window === "undefined" || isAcquired || !state) return;
    if (!roomSockets.has(roomId)) {
      roomSockets.set(roomId, state);
    }
    isAcquired = true;
    state.activeSubscribers += 1;
    state.connect();
  }

  function release() {
    if (typeof window === "undefined" || !isAcquired || !state) return;

    isAcquired = false;
    state.activeSubscribers = Math.max(0, state.activeSubscribers - 1);

    if (state.activeSubscribers === 0) {
      state.disconnect();
      if (roomSockets.get(roomId) === state) {
        roomSockets.delete(roomId);
      }
    }
  }

  watch(
    isEnabled,
    (enabled) => {
      if (enabled) {
        acquire();
      } else {
        release();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    release();
  });

  return state;
}
