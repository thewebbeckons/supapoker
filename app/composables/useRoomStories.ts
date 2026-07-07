import type { Story, StoryStatus } from "~/types/room";

export type StoryStatusChangeCallback = (oldStatus: string, newStatus: string) => void;

export function useRoomStories(roomId: string, isEnabled: Ref<boolean> = ref(true)) {
  const toast = useToast();
  const socket = useRoomSocket(roomId, isEnabled);
  const stories = socket.stories;
  const onStoryStatusChange = ref<StoryStatusChangeCallback | null>(null);

  const activeStory = computed(() =>
    stories.value.find(story => ["active", "voting", "voted"].includes(story.status)),
  );
  const isVoting = computed(() => activeStory.value?.status === "voting");
  const isVoted = computed(() => activeStory.value?.status === "voted");
  let lastActiveStoryId: string | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

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
    if (!isEnabled.value) {
      stories.value = [];
      return;
    }

    try {
      stories.value = await $fetch<Story[]>(`/api/rooms/${roomId}/stories`);
    } catch {
      // The websocket remains the primary realtime path; ignore transient fallback refresh failures.
    }
  }

  function withStoryStatus(storyId: string, status: StoryStatus) {
    return stories.value.map((story) => {
      if (story.id === storyId) return { ...story, status };
      if (status === "active" && ["active", "voting", "voted"].includes(story.status)) {
        return { ...story, status: "pending" as const };
      }
      return story;
    });
  }

  function requestRealtimeRefresh(attempts = 10) {
    if (socket.send({ type: "refresh_state" }) || attempts <= 1) return;

    setTimeout(() => requestRealtimeRefresh(attempts - 1), 100);
  }

  async function runAction(
    type: "setActive" | "startVote" | "stopVote" | "completeStory",
    storyId: string,
    optimisticStatus: StoryStatus,
  ) {
    const previousStories = stories.value;
    stories.value = withStoryStatus(storyId, optimisticStatus);

    try {
      await $fetch(`/api/rooms/${roomId}/actions`, {
        method: "POST",
        body: { type, storyId },
      });
      requestRealtimeRefresh();
    } catch (error: any) {
      stories.value = previousStories;
      toast.add({
        title: "Error",
        description: error?.data?.message ?? error?.message ?? "Action failed.",
        color: "error",
      });
    }
  }

  async function setActive(story: Story) {
    await runAction("setActive", story.id, "active");
  }

  async function startVote() {
    if (!activeStory.value) return;
    await runAction("startVote", activeStory.value.id, "voting");
  }

  async function stopVote() {
    if (!activeStory.value) return;
    await runAction("stopVote", activeStory.value.id, "voted");
  }

  async function completeStory() {
    if (!activeStory.value) return;
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

  function stopFallbackRefresh() {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  watch(isEnabled, (enabled) => {
    stopFallbackRefresh();
    if (!enabled) {
      stories.value = [];
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
