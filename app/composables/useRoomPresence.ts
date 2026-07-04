export function useRoomPresence(
  roomId: string,
  _roomCreatorId: ComputedRef<string | null | undefined> | Ref<string | null | undefined>,
  isEnabled: Ref<boolean> = ref(true),
) {
  const socket = useRoomSocket(roomId, isEnabled);
  const toast = useToast();

  async function pokeUsers() {
    try {
      const previousPokeId = socket.lastPokeId.value;

      await $fetch(`/api/rooms/${roomId}/actions`, {
        method: "POST",
        body: { type: "poke" },
      });

      if (socket.lastPokeId.value === previousPokeId) {
        socket.lastPokeId.value = crypto.randomUUID();
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
    new Set(socket.players.value.filter(player => player.isOnline).map(player => player.id)),
  );

  return {
    players: socket.players,
    onlineUsers,
    pokeUsers,
    lastPokeId: socket.lastPokeId,
  };
}
