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

  return {
    votes,
    selectedCard,
    selectCard,
  };
}
