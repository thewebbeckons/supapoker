import type { Player, Profile } from "~/types/room";

export function useRoomPresence(
  roomId: string,
  roomCreatorId: ComputedRef<string | null | undefined> | Ref<string | null | undefined>,
  isEnabled: Ref<boolean> = ref(true),
) {
  const socket = useRoomSocket(roomId, isEnabled);
  const { user } = useCurrentUser();
  const toast = useToast();
  const { data: profile } = useAsyncData(
    "room-presence-profile",
    async () => {
      if (!isEnabled.value || !user.value) return null;
      return await $fetch<Profile>("/api/profile");
    },
    {
      watch: [isEnabled, user],
      default: () => null,
    },
  );

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

  const players = computed<Player[]>(() => {
    const creatorId = roomCreatorId.value;
    if (!creatorId || socket.players.value.some(player => player.id === creatorId)) {
      return socket.players.value;
    }

    if (user.value?.id !== creatorId) {
      return socket.players.value;
    }

    return [
      {
        id: user.value.id,
        name: profile.value?.name || user.value.name || user.value.email,
        avatar: profile.value?.avatar || user.value.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value.id}`,
        isModerator: true,
        isOnline: true,
      },
      ...socket.players.value,
    ];
  });

  const onlineUsers = computed(() =>
    new Set(players.value.filter(player => player.isOnline).map(player => player.id)),
  );

  return {
    players,
    onlineUsers,
    pokeUsers,
    lastPokeId: socket.lastPokeId,
  };
}
