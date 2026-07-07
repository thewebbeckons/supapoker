import type { Story } from "~/types/room";
import type { StoryStatusChangeCallback } from "./useRoomStories";

export function useRoomVotes(
  roomId: string,
  activeStory: ComputedRef<Story | undefined>,
  isVoting: ComputedRef<boolean>,
  onStoryStatusChange: Ref<StoryStatusChangeCallback | null>,
  isEnabled: Ref<boolean> = ref(true),
) {
  const socket = useRoomSocket(roomId, isEnabled);
  const { user } = useCurrentUser();
  const votes = socket.votes;
  const selectedCard = ref<string | null>(null);
  let revealedVotesTimer: ReturnType<typeof setInterval> | null = null;

  async function persistVote(storyId: string, userId: string, cardValue: string, sentOverSocket: boolean) {
    try {
      await $fetch(`/api/rooms/${roomId}/stories/${storyId}/votes`, {
        method: "POST",
        body: { value: cardValue },
      });
    } catch {
      if (sentOverSocket || selectedCard.value !== cardValue) return;
      selectedCard.value = null;
      const nextVotes = { ...votes.value };
      delete nextVotes[userId];
      votes.value = nextVotes;
    }
  }

  function selectCard(cardValue: string) {
    const story = activeStory.value;
    const currentUser = user.value;
    if (!isEnabled.value || !isVoting.value || !story || !currentUser) return;

    selectedCard.value = cardValue;
    votes.value = { ...votes.value, [currentUser.id]: cardValue };

    const sentOverSocket = socket.send({ type: "vote", value: cardValue });
    void persistVote(story.id, currentUser.id, cardValue, sentOverSocket);
  }

  function clearVotes() {
    votes.value = {};
    selectedCard.value = null;
  }

  function stopRevealedVotesRefresh() {
    if (!revealedVotesTimer) return;
    clearInterval(revealedVotesTimer);
    revealedVotesTimer = null;
  }

  async function fetchRevealedVotes(storyId: string) {
    if (!isEnabled.value || activeStory.value?.id !== storyId || activeStory.value?.status !== "voted") return;

    try {
      votes.value = await $fetch<Record<string, string>>(`/api/rooms/${roomId}/stories/${storyId}/votes`);
    } catch {
      // Realtime messages are still primary; ignore transient fallback refresh failures.
    }
  }

  onStoryStatusChange.value = (oldStatus: string, newStatus: string) => {
    if (!isEnabled.value) return;
    if (newStatus === "voting" && oldStatus !== "voting") clearVotes();
    if (newStatus === "completed" && oldStatus !== "completed") clearVotes();
  };

  watch(
    [() => activeStory.value?.id, isEnabled],
    () => {
      selectedCard.value = null;
    },
    { immediate: true },
  );

  watch(
    [() => activeStory.value?.id, () => activeStory.value?.status, isEnabled],
    ([storyId, status, enabled]) => {
      stopRevealedVotesRefresh();
      if (!enabled || !storyId || status !== "voted") return;

      void fetchRevealedVotes(storyId);
      if (typeof window !== "undefined") {
        revealedVotesTimer = setInterval(() => {
          void fetchRevealedVotes(storyId);
        }, 1000);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    stopRevealedVotesRefresh();
  });

  return {
    votes,
    selectedCard,
    selectCard,
  };
}
