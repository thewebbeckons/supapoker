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

  function selectCard(cardValue: string) {
    if (!isEnabled.value || !isVoting.value || !activeStory.value || !user.value) return;
    selectedCard.value = cardValue;
    votes.value = { ...votes.value, [user.value.id]: cardValue };
    socket.send({ type: "vote", value: cardValue });
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
