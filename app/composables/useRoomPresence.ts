import type { RoomRealtimeSession } from "./useRoomRealtime";

export function useRoomPresence(
  roomId: MaybeRefOrGetter<string>,
  realtime: RoomRealtimeSession,
) {
  const toast = useToast();
  const lastPokeId = ref<string | null>(null);
  const players = realtime.players;

  watch(realtime.lastPokeId, (pokeId) => {
    if (pokeId) lastPokeId.value = pokeId;
  });

  async function pokeUsers() {
    try {
      await $fetch(`/api/rooms/${toValue(roomId)}/actions`, {
        method: "POST",
        body: { type: "poke" },
      });

      if (!realtime.isConnected.value) {
        lastPokeId.value = crypto.randomUUID();
      }
    } catch (error: any) {
      toast.add({
        title: "Unable to poke users",
        description: error?.data?.message ?? error?.message ?? "Action failed.",
        color: "error",
      });
    }
  }

  const onlineUsers = computed(() =>
    new Set(players.value.filter(player => player.isOnline).map(player => player.id)),
  );

  return {
    players,
    onlineUsers,
    pokeUsers,
    lastPokeId,
  };
}
