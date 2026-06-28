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
  send: (payload: unknown) => void;
}

const roomSockets = new Map<string, RoomSocketState & { socket: WebSocket | null }>();

function createRoomSocket(roomId: string): RoomSocketState & { socket: WebSocket | null } {
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
      room.value = message.room ?? null;
      stories.value = message.stories ?? [];
      players.value = message.players ?? [];
      votes.value = message.votes ?? {};
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
    if (!import.meta.client) return;
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
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
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

  watch(
    isEnabled,
    (enabled) => {
      if (!import.meta.client) return;
      if (enabled) {
        state.connect();
      } else {
        state.disconnect();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    state?.disconnect();
  });

  return state;
}
