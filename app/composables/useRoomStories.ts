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

    stories.value = await $fetch<Story[]>(`/api/rooms/${roomId}/stories`);
  }

  async function runAction(type: "setActive" | "startVote" | "stopVote" | "completeStory", storyId: string) {
    try {
      await $fetch(`/api/rooms/${roomId}/actions`, {
        method: "POST",
        body: { type, storyId },
      });
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: error?.data?.message ?? error?.message ?? "Action failed.",
        color: "error",
      });
    }
  }

  async function setActive(story: Story) {
    await runAction("setActive", story.id);
  }

  async function startVote() {
    if (!activeStory.value) return;
    await runAction("startVote", activeStory.value.id);
  }

  async function stopVote() {
    if (!activeStory.value) return;
    await runAction("stopVote", activeStory.value.id);
  }

  async function completeStory() {
    if (!activeStory.value) return;
    await runAction("completeStory", activeStory.value.id);
  }

  function updateStoryLocally(id: string, updates: Partial<Story>) {
    stories.value = stories.value.map(story =>
      story.id === id ? { ...story, ...updates } : story,
    );
  }

  function removeStoryLocally(id: string) {
    stories.value = stories.value.filter(story => story.id !== id);
  }

  watch(isEnabled, (enabled) => {
    if (enabled) void fetchStories();
  }, { immediate: true });

  return {
    stories,
    activeStory,
    isVoting,
    isVoted,
    setActive,
    startVote,
    stopVote,
    completeStory,
    updateStoryLocally,
    removeStoryLocally,
    onStoryStatusChange,
  };
}
