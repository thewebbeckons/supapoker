import type { Story, StoryStatus } from "~/types/room";
import type { RoomRealtimeSession } from "./useRoomRealtime";

type StoryActionType = "setActive" | "startVote" | "stopVote" | "completeStory";

interface PendingStoryAction {
  id: number;
  type: StoryActionType;
  storyId: string;
  optimisticStatus: StoryStatus;
}

export function useRoomStories(
  roomId: MaybeRefOrGetter<string>,
  realtime: RoomRealtimeSession,
  isEnabled: Ref<boolean> = ref(true),
) {
  const toast = useToast();
  const sourceStories = realtime.stories;
  const pendingStoryAction = ref<PendingStoryAction | null>(null);
  let nextActionId = 0;

  const stories = computed(() => {
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
  });

  const activeStory = computed(() =>
    stories.value.find(story => ["active", "voting", "voted"].includes(story.status)),
  );
  const isVoting = computed(() => activeStory.value?.status === "voting");
  const isVoted = computed(() => activeStory.value?.status === "voted");
  const isStoryActionPending = computed(() => pendingStoryAction.value !== null);
  const pendingStoryActionType = computed(() => pendingStoryAction.value?.type ?? null);

  async function refreshStories() {
    if (!isEnabled.value) return;
    await realtime.refresh();
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
      await $fetch(`/api/rooms/${toValue(roomId)}/actions`, {
        method: "POST",
        body: { type, storyId },
      });
      await refreshStories();
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: error?.data?.message ?? error?.message ?? "Action failed.",
        color: "error",
      });
      await refreshStories();
    } finally {
      if (pendingStoryAction.value?.id === actionId) {
        pendingStoryAction.value = null;
      }
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
    realtime.updateStories(current => current.map(story =>
      story.id === id ? { ...story, ...updates } : story,
    ));
  }

  function removeStoryLocally(id: string) {
    realtime.updateStories(current => current.filter(story => story.id !== id));
  }

  watch(sourceStories, (nextStories) => {
    const pending = pendingStoryAction.value;
    if (!pending) return;

    const latestStory = nextStories.find(story => story.id === pending.storyId);
    if (!latestStory || latestStory.status === pending.optimisticStatus) {
      pendingStoryAction.value = null;
    }
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
    refreshStories,
    updateStoryLocally,
    removeStoryLocally,
  };
}
