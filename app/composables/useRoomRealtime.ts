import type {
  Room,
  RoomConnectionStatus,
  RoomRealtimeState,
  Story,
  VotesMap,
} from "~/types/room";
import {
  parseRoomRealtimeMessage,
  ROOM_DELETED_CLOSE_CODE,
} from "~/utils/room-realtime";

type RoomIdSource = MaybeRefOrGetter<string>;

interface RoomHttpSnapshot extends RoomRealtimeState {
  votes?: VotesMap;
}

export interface RoomRealtimeSession {
  room: Readonly<Ref<Room | null>>;
  stories: Readonly<Ref<Story[]>>;
  players: Readonly<Ref<RoomRealtimeState["players"]>>;
  votes: Readonly<Ref<VotesMap>>;
  lastPokeId: Readonly<Ref<string | null>>;
  status: Readonly<Ref<RoomConnectionStatus>>;
  isConnected: ComputedRef<boolean>;
  error: Readonly<Ref<string | null>>;
  refresh: () => Promise<void>;
  updateStories: (updater: (stories: Story[]) => Story[]) => void;
  updateVotes: (updater: (votes: VotesMap) => VotesMap) => void;
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if ("response" in error
    && typeof error.response === "object"
    && error.response !== null
    && "status" in error.response
    && typeof error.response.status === "number") {
    return error.response.status;
  }

  return undefined;
}

export function useRoomRealtime(
  roomId: RoomIdSource,
  isEnabled: Ref<boolean> = ref(true),
): RoomRealtimeSession {
  const requestUrl = useRequestURL();
  const resolvedRoomId = computed(() => toValue(roomId));
  const room = ref<Room | null>(null);
  const stories = ref<Story[]>([]);
  const players = ref<RoomRealtimeState["players"]>([]);
  const votes = ref<VotesMap>({});
  const lastPokeId = ref<string | null>(null);
  const status = ref<RoomConnectionStatus>("idle");
  const error = ref<string | null>(null);
  const isConnected = computed(() => status.value === "connected");

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let shouldReconnect = false;
  let reconnectAttempt = 0;
  let socketGeneration = 0;
  let refreshRequestId = 0;
  let latestRevision = 0;
  let hasRealtimeSnapshot = false;

  function websocketUrl(id: string) {
    const protocol = requestUrl.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${requestUrl.host}/api/rooms/${encodeURIComponent(id)}/socket`;
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function clearHeartbeat() {
    if (!heartbeatTimer) return;
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function resetState() {
    room.value = null;
    stories.value = [];
    players.value = [];
    votes.value = {};
    lastPokeId.value = null;
    error.value = null;
    latestRevision = 0;
    hasRealtimeSnapshot = false;
    refreshRequestId += 1;
  }

  function stopConnection(nextStatus: RoomConnectionStatus = "idle") {
    shouldReconnect = false;
    socketGeneration += 1;
    clearReconnectTimer();
    clearHeartbeat();

    const activeSocket = socket;
    socket = null;
    if (activeSocket && activeSocket.readyState < WebSocket.CLOSING) {
      activeSocket.close(1000, "Room connection closed");
    }

    status.value = nextStatus;
  }

  function applyHttpSnapshot(snapshot: RoomHttpSnapshot) {
    room.value = snapshot.room;
    stories.value = snapshot.stories;

    if (!hasRealtimeSnapshot) {
      players.value = snapshot.players;
    } else {
      const currentOnlineState = new Map(
        players.value.map(player => [player.id, player.isOnline]),
      );
      players.value = snapshot.players.map(player => ({
        ...player,
        isOnline: currentOnlineState.get(player.id) ?? false,
      }));
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, "votes")) {
      votes.value = snapshot.votes ?? {};
    }
  }

  function applyMessage(raw: string) {
    const message = parseRoomRealtimeMessage(raw);
    if (!message) return;

    if (message.type === "snapshot") {
      if (message.revision < latestRevision) return;

      latestRevision = message.revision;
      hasRealtimeSnapshot = true;
      room.value = message.room;
      stories.value = message.stories;
      players.value = message.players;
      votes.value = message.votes;
      error.value = null;
      return;
    }

    if (message.type === "presence") {
      players.value = message.players;
      return;
    }

    if (message.type === "votes") {
      const currentStory = stories.value.find(story => ["active", "voting", "voted"].includes(story.status));
      if (currentStory?.id === message.storyId) votes.value = message.votes;
      return;
    }

    if (message.type === "room_deleted") {
      stopConnection("disconnected");
      void navigateTo("/rooms");
      return;
    }

    if (message.type === "poke") {
      lastPokeId.value = message.id;
      return;
    }

    error.value = message.message;
  }

  async function refresh() {
    const id = resolvedRoomId.value;
    if (!isEnabled.value || !id) return;

    const requestId = ++refreshRequestId;
    const revisionAtStart = latestRevision;

    try {
      const snapshot = await $fetch<RoomHttpSnapshot>(`/api/rooms/${id}/snapshot`);
      if (requestId !== refreshRequestId
        || id !== resolvedRoomId.value
        || !isEnabled.value
        || latestRevision !== revisionAtStart) return;

      applyHttpSnapshot(snapshot);
    } catch (cause) {
      if (requestId !== refreshRequestId) return;

      const statusCode = errorStatus(cause);
      if (statusCode === 404) {
        stopConnection("disconnected");
        resetState();
        status.value = "disconnected";
        void navigateTo("/rooms");
        return;
      }
      if (statusCode === 401 || statusCode === 403) {
        shouldReconnect = false;
        clearReconnectTimer();
        status.value = "disconnected";
      }
      error.value = "Unable to synchronize the room.";
    }
  }

  function scheduleReconnect() {
    if (!shouldReconnect || !isEnabled.value || reconnectTimer) return;

    const delay = Math.min(1_000 * 2 ** reconnectAttempt, 10_000);
    reconnectAttempt += 1;
    status.value = "reconnecting";
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect() {
    if (!import.meta.client || !isEnabled.value || !resolvedRoomId.value) return;
    if (socket && socket.readyState < WebSocket.CLOSING) return;

    shouldReconnect = true;
    clearReconnectTimer();
    status.value = reconnectAttempt > 0 ? "reconnecting" : "connecting";

    const generation = ++socketGeneration;
    const candidate = new WebSocket(websocketUrl(resolvedRoomId.value));
    socket = candidate;

    candidate.addEventListener("open", () => {
      if (socket !== candidate || generation !== socketGeneration) return;

      reconnectAttempt = 0;
      status.value = "connected";
      error.value = null;
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (candidate.readyState === WebSocket.OPEN) candidate.send("ping");
      }, 25_000);
    });

    candidate.addEventListener("message", (event) => {
      if (socket !== candidate || generation !== socketGeneration) return;
      if (event.data === "pong" || typeof event.data !== "string") return;
      applyMessage(event.data);
    });

    candidate.addEventListener("close", (event) => {
      if (socket !== candidate || generation !== socketGeneration) return;

      socket = null;
      clearHeartbeat();
      if (event.code === ROOM_DELETED_CLOSE_CODE) {
        shouldReconnect = false;
        status.value = "disconnected";
        void navigateTo("/rooms");
        return;
      }
      if (!shouldReconnect || !isEnabled.value) {
        status.value = "disconnected";
        return;
      }

      error.value = "Realtime connection lost. Reconnecting…";
      void refresh();
      scheduleReconnect();
    });

    candidate.addEventListener("error", () => {
      if (socket !== candidate || generation !== socketGeneration) return;
      error.value = "Realtime connection unavailable.";
      if (candidate.readyState < WebSocket.CLOSING) candidate.close();
    });
  }

  function updateStories(updater: (current: Story[]) => Story[]) {
    stories.value = updater(stories.value);
  }

  function updateVotes(updater: (current: VotesMap) => VotesMap) {
    votes.value = updater(votes.value);
  }

  function restoreConnection() {
    if (!isEnabled.value) return;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resync" }));
      return;
    }

    clearReconnectTimer();
    connect();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") restoreConnection();
  }

  watch(
    [resolvedRoomId, isEnabled],
    ([nextRoomId, enabled], [previousRoomId]) => {
      if (!enabled || !nextRoomId) {
        stopConnection();
        resetState();
        return;
      }

      if (nextRoomId !== previousRoomId) {
        stopConnection();
        resetState();
      }

      shouldReconnect = true;
      void refresh();
      connect();
    },
    { immediate: true },
  );

  onMounted(() => {
    window.addEventListener("online", restoreConnection);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onUnmounted(() => {
    window.removeEventListener("online", restoreConnection);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    stopConnection();
  });

  return {
    room: computed(() => room.value),
    stories: computed(() => stories.value),
    players: computed(() => players.value),
    votes: computed(() => votes.value),
    lastPokeId: computed(() => lastPokeId.value),
    status: computed(() => status.value),
    isConnected,
    error: computed(() => error.value),
    refresh,
    updateStories,
    updateVotes,
  };
}
