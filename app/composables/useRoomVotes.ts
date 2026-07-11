import type { Story } from "~/types/room";
import { HIDDEN_VOTE } from "~/utils/room-realtime";
import type { RoomRealtimeSession } from "./useRoomRealtime";

interface QueuedVote {
  storyId: string;
  value: string;
}

export function useRoomVotes(
  roomId: MaybeRefOrGetter<string>,
  realtime: RoomRealtimeSession,
  activeStory: ComputedRef<Story | undefined>,
  isVoting: ComputedRef<boolean>,
  isEnabled: Ref<boolean> = ref(true),
) {
  const { user } = useCurrentUser();
  const votes = realtime.votes;
  const selectedCard = ref<string | null>(null);
  let acceptedVote: string | null = null;
  let queuedVote: QueuedVote | null = null;
  let isSendingVote = false;

  function setMyVisibleVote(value: string | null) {
    const userId = user.value?.id;
    if (!userId) return;

    realtime.updateVotes((current) => {
      const next = { ...current };
      if (value === null) delete next[userId];
      else next[userId] = value;
      return next;
    });
  }

  async function flushVotes() {
    if (isSendingVote) return;
    isSendingVote = true;

    try {
      while (queuedVote && isEnabled.value) {
        const vote = queuedVote;
        queuedVote = null;

        try {
          await $fetch(`/api/rooms/${toValue(roomId)}/stories/${vote.storyId}/votes`, {
            method: "POST",
            body: { value: vote.value },
          });
          acceptedVote = vote.value;
        } catch {
          if (!queuedVote
            && activeStory.value?.id === vote.storyId
            && selectedCard.value === vote.value) {
            selectedCard.value = acceptedVote;
            setMyVisibleVote(acceptedVote);
          }
        }
      }
    } finally {
      isSendingVote = false;
      if (queuedVote && isEnabled.value) void flushVotes();
    }
  }

  function selectCard(cardValue: string) {
    const story = activeStory.value;
    if (!isEnabled.value || !isVoting.value || !story || !user.value) return;

    selectedCard.value = cardValue;
    setMyVisibleVote(cardValue);
    queuedVote = { storyId: story.id, value: cardValue };
    void flushVotes();
  }

  watch(
    [() => activeStory.value?.id, () => activeStory.value?.status, votes, () => user.value?.id],
    () => {
      if (!isEnabled.value || !isVoting.value || !user.value) {
        selectedCard.value = null;
        acceptedVote = null;
        queuedVote = null;
        return;
      }

      const serverVote = votes.value[user.value.id];
      if (!isSendingVote && !queuedVote) {
        if (serverVote && serverVote !== HIDDEN_VOTE) {
          acceptedVote = serverVote;
          selectedCard.value = serverVote;
        } else {
          acceptedVote = null;
          selectedCard.value = null;
        }
      }
    },
    { immediate: true },
  );

  return {
    votes,
    selectedCard,
    selectCard,
  };
}
