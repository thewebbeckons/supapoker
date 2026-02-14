import type { Database } from '~/types/database.types'
import type { Story, VotesMap } from '~/types/room'
import type { StoryStatusChangeCallback } from './useRoomStories'

export function useRoomVotes(
    roomId: string,
    activeStory: ComputedRef<Story | undefined>,
    isVoting: ComputedRef<boolean>,
    onStoryStatusChange: Ref<StoryStatusChangeCallback | null>,
    isEnabled: Ref<boolean> = ref(true),
) {
    const client = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const toast = useToast()

    const votes = ref<VotesMap>({})
    const selectedCard = ref<string | null>(null)

    async function fetchVotes() {
        if (!isEnabled.value) return
        if (!activeStory.value) return
        const { data } = await client
            .from('story_votes')
            .select('user_id, vote_value')
            .eq('story_id', activeStory.value.id)

        if (data) {
            const newVotes: VotesMap = {}
            data.forEach((v: any) => {
                newVotes[v.user_id] = v.vote_value
            })
            votes.value = newVotes
        }
    }

    async function selectCard(cardValue: string) {
        if (!isEnabled.value) return
        if (!isVoting.value || !activeStory.value || !user.value) return
        const userId = user.value.sub
        const previousVote = votes.value[userId]
        const previousSelectedCard = selectedCard.value

        // Optimistic update — both selectedCard and votes map
        selectedCard.value = cardValue
        votes.value = { ...votes.value, [userId]: cardValue }

        const { error } = await client.from('story_votes').upsert(
            {
                room_id: roomId,
                story_id: activeStory.value.id,
                user_id: userId,
                vote_value: cardValue,
            },
            { onConflict: 'story_id,user_id' },
        )

        if (error) {
            console.error('Error voting:', error)
            // Rollback optimistic vote to previous local state
            if (previousVote === undefined) {
                const { [userId]: _, ...rest } = votes.value
                votes.value = rest
            } else {
                votes.value = { ...votes.value, [userId]: previousVote }
            }
            selectedCard.value = previousSelectedCard
            toast.add({ title: 'Vote failed', description: error.message, color: 'error' })
        }
    }

    function clearVotes() {
        votes.value = {}
        selectedCard.value = null
    }

    // Register callback for story status changes
    onStoryStatusChange.value = (oldStatus: string, newStatus: string) => {
        if (!isEnabled.value) return

        if (newStatus === 'voting' && oldStatus !== 'voting') {
            clearVotes()
        }
        if (newStatus === 'voted' && oldStatus !== 'voted') {
            fetchVotes()
        }
        if (newStatus === 'completed' && oldStatus !== 'completed') {
            clearVotes()
        }
        if (
            oldStatus === 'voting' &&
            !['voting', 'voted', 'completed'].includes(newStatus)
        ) {
            fetchVotes()
        }
    }

    // Watch active story changes — clear & refetch
    watch(
        [() => activeStory.value?.id, isEnabled],
        ([, enabled]) => {
            if (!enabled) {
                clearVotes()
                return
            }

            votes.value = {}
            selectedCard.value = null
            fetchVotes()
        },
        { immediate: true },
    )

    // Realtime channel
    let votesChannel: ReturnType<typeof client.channel> | null = null

    function cleanupChannel() {
        if (votesChannel) {
            client.removeChannel(votesChannel)
            votesChannel = null
        }
    }

    function setupChannel() {
        if (!isEnabled.value || votesChannel) return

        votesChannel = client.channel(`room-votes:${roomId}`)
        votesChannel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'story_votes',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const { user_id, vote_value, story_id } = payload.new
                        if (activeStory.value?.id === story_id) {
                            // Create new object for reactivity
                            votes.value = { ...votes.value, [user_id]: vote_value }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old
                        if (deleted?.user_id && votes.value[deleted.user_id]) {
                            const { [deleted.user_id]: _, ...rest } = votes.value
                            votes.value = rest
                        }
                    }
                }
            )
            .subscribe()
    }

    watch(
        isEnabled,
        (enabled) => {
            if (!enabled) {
                clearVotes()
                cleanupChannel()
                return
            }

            setupChannel()
            fetchVotes()
        },
        { immediate: true },
    )

    onUnmounted(() => {
        cleanupChannel()
    })

    return {
        votes,
        selectedCard,
        selectCard,
    }
}
