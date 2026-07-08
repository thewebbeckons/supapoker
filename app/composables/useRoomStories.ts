import type { Story, StoryStatus } from "~/types/room";

export type StoryStatusChangeCallback = (oldStatus: string, newStatus: string) => void;
type StoryActionType = "setActive" | "startVote" | "stopVote" | "completeStory";

interface PendingStoryAction {
  id: number;
  type: StoryActionType;
  storyId: string;
  optimisticStatus: StoryStatus;
}

export function useRoomStories(roomId: string, isEnabled: Ref<boolean> = ref(true)) {
  const toast = useToast();
  const socket = useRoomSocket(roomId, isEnabled);
  const sourceStories = socket.stories;
  const onStoryStatusChange = ref<StoryStatusChangeCallback | null>(null);
  const pendingStoryAction = ref<PendingStoryAction | null>(null);
  let nextActionId = 0;

  const stories = computed({
    get: () => {
      const pending = pendingStoryAction.value;
      if (!pending) return sourceStories.value;

      let hasPendingStory = false;
      const nextStories = sourceStories.value.map((story) => {
        if (story.id === pending.storyId) {
          hasPendingStory = true;
          return { ...story, status: pending.optimisticStatus };
        }

        if (pending.optimisticStatus === "active" && ["active", "voting", "voted"].includes(story.status)) {
          return { ...story, status: "pending" as const };
        }

        return story;
      });

      return hasPendingStory ? nextStories : sourceStories.value;
    },
    set: (nextStories: Story[]) => {
      sourceStories.value = nextStories;
    },
  });

  const activeStory = computed(() =>
    stories.value.find(story => ["active", "voting", "voted"].includes(story.status)),
  );
  const isVoting = computed(() => activeStory.value?.status === "voting");
  const isVoted = computed(() => activeStory.value?.status === "voted");
  const isStoryActionPending = computed(() => pendingStoryAction.value !== null);
  const pendingStoryActionType = computed(() => pendingStoryAction.value?.type ?? null);
  let lastActiveStoryId: string | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let nextFetchRequestId = 0;
  let latestAppliedFetchRequestId = 0;

  watch(
    () => activeStory.value ? { id: activeStory.value.id, status: activeStory.value.status } : null,
    (nextStory, previousStory) => {
      if (nextStory) {
        lastActiveStoryId = nextStory.id;
      }

      const previousStatus = previousStory?.status;
      const completedStoryId = lastActiveStoryId ?? previousStory?.id;
      const nextStatus = nextStory?.status
        ?? stories.value.find(story => story.id === completedStoryId && story.status === "completed")?.status;

      if (!nextStatus || !previousStatus || nextStatus === previousStatus) return;
      onStoryStatusChange.value?.(previousStatus, nextStatus);
    },
  );

  async function fetchStories() {
    const requestId = ++nextFetchRequestId;

    if (!isEnabled.value) {
      sourceStories.value = [];
      latestAppliedFetchRequestId = requestId;
      return;
    }

    try {
      const nextStories = await $fetch<Story[]>(`/api/rooms/${roomId}/stories`);
      if (!isEnabled.value || requestId < latestAppliedFetchRequestId) return;

      latestAppliedFetchRequestId = requestId;
      sourceStories.value = nextStories;
    } catch {
      // The websocket remains the primary realtime path; ignore transient fallback refresh failures.
    }
  }

  function requestRealtimeRefresh(attempts = 10) {
    if (socket.send({ type: "refresh_state" }) || attempts <= 1) return;

    setTimeout(() => requestRealtimeRefresh(attempts - 1), 100);
  }

  async function runAction(
    type: StoryActionType,
    storyId: string,
    optimisticStatus: StoryStatus,
  ) {
    if (pendingStoryAction.value) return;

    const actionId = ++nextActionId;
    pendingStoryAction.value = {
      id: actionId,
      type,
      storyId,
      optimisticStatus,
    };

    try {
      await $fetch(`/api/rooms/${roomId}/actions`, {
        method: "POST",
        body: { type, storyId },
      });
      requestRealtimeRefresh();
      await fetchStories();
    } catch (error: any) {
      if (pendingStoryAction.value?.id === actionId) {
        pendingStoryAction.value = null;
      }
      await fetchStories();
      toast.add({
        title: "Error",
        description: error?.data?.message ?? error?.message ?? "Action failed.",
        color: "error",
      });
    }
  }

  async function setActive(story: Story) {
    if (isStoryActionPending.value) return;
    await runAction("setActive", story.id, "active");
  }

  async function startVote() {
    if (!activeStory.value || isStoryActionPending.value) return;
    await runAction("startVote", activeStory.value.id, "voting");
  }

  async function stopVote() {
    if (!activeStory.value || isStoryActionPending.value) return;
    await runAction("stopVote", activeStory.value.id, "voted");
  }

  async function completeStory() {
    if (!activeStory.value || isStoryActionPending.value) return;
    await runAction("completeStory", activeStory.value.id, "completed");
  }

  function updateStoryLocally(id: string, updates: Partial<Story>) {
    stories.value = stories.value.map(story =>
      story.id === id ? { ...story, ...updates } : story,
    );
  }

  function removeStoryLocally(id: string) {
    stories.value = stories.value.filter(story => story.id !== id);
  }

  watch(sourceStories, (nextStories) => {
    const pending = pendingStoryAction.value;
    if (!pending) return;

    const latestStory = nextStories.find(story => story.id === pending.storyId);
    if (!latestStory || latestStory.status === pending.optimisticStatus) {
      pendingStoryAction.value = null;
    }
  });

  function stopFallbackRefresh() {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  watch(isEnabled, (enabled) => {
    stopFallbackRefresh();
    if (!enabled) {
      sourceStories.value = [];
      return;
    }

    void fetchStories();

    if (typeof window !== "undefined") {
      refreshTimer = setInterval(() => {
        void fetchStories();
      }, 1000);
    }
  }, { immediate: true });

  onUnmounted(() => {
    stopFallbackRefresh();
  });

  return {
    stories,
    activeStory,
    isVoting,
    isVoted,
    isStoryActionPending,
    pendingStoryActionType,
    setActive,
    startVote,
    stopVote,
    completeStory,
    refreshStories: fetchStories,
    updateStoryLocally,
    removeStoryLocally,
    onStoryStatusChange,
  };
}
