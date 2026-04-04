import type { Database } from '~/types/database.types'
import type { Player } from '~/types/room'

export function useRoomPresence(
    roomId: string,
    roomCreatorId: ComputedRef<string | null | undefined> | Ref<string | null | undefined>,
    isEnabled: Ref<boolean> = ref(true),
) {
    const client = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const { playPokeSoundIfEnabled } = usePokeSound()

    const players = ref<Player[]>([])
    const onlineUsers = ref<Set<string>>(new Set())

    let presenceChannel: ReturnType<typeof client.channel> | null = null

    // Fetch participants + profiles once on mount
    async function fetchParticipants() {
        if (!isEnabled.value) {
            players.value = []
            return
        }

        const { data: participants } = await client
            .from('room_participants')
            .select('user_id')
            .eq('room_id', roomId)

        if (!participants || participants.length === 0) {
            players.value = []
            return
        }

        const userIds = participants.map((p: any) => p.user_id)

        const { data: profiles } = await client
            .from('profile')
            .select('user_id, name, avatar')
            .in('user_id', userIds)

        const profileMap = new Map<string, { name: string | null; avatar: string | null }>()
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.user_id, p))
        }

        players.value = userIds.map((uid: string) => {
            const profile = profileMap.get(uid)
            return {
                id: uid,
                name: profile?.name || 'Anonymous',
                avatar: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                isModerator: uid === roomCreatorId.value,
                isOnline: onlineUsers.value.has(uid),
            }
        })
    }

    function playPokeSound() {
        void playPokeSoundIfEnabled()
    }

    function pokeUsers() {
        if (!presenceChannel) return
        presenceChannel.send({
            type: 'broadcast',
            event: 'poke',
            payload: { from: user.value?.sub },
        })
        playPokeSound()
    }

    function setupChannel() {
        if (!isEnabled.value || presenceChannel) return

        presenceChannel = client.channel(`room:${roomId}`, {
            config: {
                private: true,
                presence: {
                    key: user.value?.sub,
                },
            },
        })

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel!.presenceState()
                const onlineIds = Object.keys(newState)
                onlineUsers.value = new Set(onlineIds)

                // Presence only toggles known participants. Unknown ids are ignored.
                players.value = players.value.map(p => ({
                    ...p,
                    isOnline: onlineUsers.value.has(p.id),
                }))
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_participants',
                    filter: `room_id=eq.${roomId}`,
                },
                () => {
                    fetchParticipants()
                },
            )
            .on('broadcast', { event: 'poke' }, (payload: any) => {
                if (payload.payload?.from !== user.value?.sub) {
                    playPokeSound()
                }
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel!.track({
                        user_id: user.value?.sub,
                        online_at: new Date().toISOString(),
                    })
                }
            })
    }

    function cleanupChannel() {
        if (presenceChannel) {
            client.removeChannel(presenceChannel)
            presenceChannel = null
        }
    }

    watch(
        isEnabled,
        async (enabled) => {
            if (!enabled) {
                players.value = []
                onlineUsers.value = new Set()
                cleanupChannel()
                return
            }

            await fetchParticipants()
            setupChannel()
        },
        { immediate: true },
    )

    onUnmounted(() => {
        cleanupChannel()
    })

    return {
        players,
        onlineUsers,
        pokeUsers,
    }
}
