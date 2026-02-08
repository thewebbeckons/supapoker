import type { Database } from '~/types/database.types'
import type { Story, StoryStatus } from '~/types/room'

export type StoryStatusChangeCallback = (oldStatus: string, newStatus: string) => void

export function useRoomStories(roomId: string, isEnabled: Ref<boolean> = ref(true)) {
    const client = useSupabaseClient<Database>()
    const toast = useToast()

    const stories = ref<Story[]>([])
    const onStoryStatusChange = ref<StoryStatusChangeCallback | null>(null)

    const activeStory = computed(() =>
        stories.value.find(s => ['active', 'voting', 'voted'].includes(s.status))
    )
    const isVoting = computed(() => activeStory.value?.status === 'voting')
    const isVoted = computed(() => activeStory.value?.status === 'voted')

    // Initial fetch
    async function fetchStories() {
        if (!isEnabled.value) {
            stories.value = []
            return
        }

        const { data } = await client
            .from('stories')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
        stories.value = data || []
    }

    // Story state transitions — all with optimistic updates

    async function setActive(story: Story) {
        // Optimistic: set target to active, reset others
        stories.value = stories.value.map(s => {
            if (s.id === story.id) return { ...s, status: 'active' as StoryStatus }
            if (['active', 'voting', 'voted'].includes(s.status)) return { ...s, status: 'pending' as StoryStatus }
            return s
        })

        // DB: reset all active/voting/voted to pending
        await client
            .from('stories')
            .update({ status: 'pending' })
            .eq('room_id', roomId)
            .in('status', ['active', 'voting', 'voted'])

        const { error } = await client
            .from('stories')
            .update({ status: 'active' })
            .eq('id', story.id)

        if (error) {
            toast.add({ title: 'Error', description: error.message, color: 'error' })
            await fetchStories() // rollback
        } else {
            toast.add({ title: 'Active Story Updated', color: 'success' })
        }
    }

    async function startVote() {
        if (!activeStory.value) return
        const storyId = activeStory.value.id
        const oldStatus = activeStory.value.status
        const newUpdatedAt = new Date().toISOString()

        // Clear existing votes
        await client.from('story_votes').delete().eq('story_id', storyId)

        const { error } = await client
            .from('stories')
            .update({ status: 'voting', updated_at: newUpdatedAt })
            .eq('id', storyId)

        if (error) {
            toast.add({ title: 'Error starting vote', description: error.message, color: 'error' })
        } else {
            // Optimistic update
            stories.value = stories.value.map(s =>
                s.id === storyId ? { ...s, status: 'voting', updated_at: newUpdatedAt } : s
            )
            // Notify votes composable so it clears votes for the creator
            if (onStoryStatusChange.value) {
                onStoryStatusChange.value(oldStatus, 'voting')
            }
        }
    }

    async function stopVote() {
        if (!activeStory.value) return
        const storyId = activeStory.value.id
        const oldStatus = activeStory.value.status

        const { error } = await client
            .from('stories')
            .update({ status: 'voted' })
            .eq('id', storyId)

        if (error) {
            toast.add({ title: 'Error stopping vote', description: error.message, color: 'error' })
        } else {
            stories.value = stories.value.map(s =>
                s.id === storyId ? { ...s, status: 'voted' } : s
            )
            // Notify votes composable so it fetches final votes for the creator
            if (onStoryStatusChange.value) {
                onStoryStatusChange.value(oldStatus, 'voted')
            }
        }
    }

    async function completeStory() {
        if (!activeStory.value) return
        const storyId = activeStory.value.id
        const oldStatus = activeStory.value.status

        const { error } = await client
            .from('stories')
            .update({ status: 'completed' })
            .eq('id', storyId)

        if (error) {
            toast.add({ title: 'Error completing story', description: error.message, color: 'error' })
        } else {
            stories.value = stories.value.map(s =>
                s.id === storyId ? { ...s, status: 'completed' } : s
            )
            // Notify votes composable so it clears votes for the creator
            if (onStoryStatusChange.value) {
                onStoryStatusChange.value(oldStatus, 'completed')
            }
        }
    }

    // Local update helpers for modal success handlers
    function updateStoryLocally(id: string, updates: Partial<Story>) {
        stories.value = stories.value.map(s =>
            s.id === id ? { ...s, ...updates } : s
        )
    }

    function removeStoryLocally(id: string) {
        stories.value = stories.value.filter(s => s.id !== id)
    }

    // Realtime channel
    let storiesChannel: ReturnType<typeof client.channel> | null = null

    function cleanupChannel() {
        if (storiesChannel) {
            client.removeChannel(storiesChannel)
            storiesChannel = null
        }
    }

    function setupChannel() {
        if (!isEnabled.value || storiesChannel) return

        storiesChannel = client.channel(`room-stories:${roomId}`)
        storiesChannel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stories',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        const exists = stories.value.some(s => s.id === payload.new.id)
                        if (!exists) {
                            stories.value = [...stories.value, payload.new].sort(
                                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                            )
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const existing = stories.value.find(s => s.id === payload.new.id)
                        if (existing) {
                            const oldStatus = existing.status
                            const newStatus = payload.new.status

                            stories.value = stories.value.map(s =>
                                s.id === payload.new.id ? { ...payload.new } : s
                            )

                            // Notify votes composable of status changes
                            if (oldStatus !== newStatus && onStoryStatusChange.value) {
                                onStoryStatusChange.value(oldStatus, newStatus)
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        stories.value = stories.value.filter(s => s.id !== payload.old.id)
                    }
                }
            )
            .subscribe()
    }

    watch(
        isEnabled,
        async (enabled) => {
            if (!enabled) {
                stories.value = []
                cleanupChannel()
                return
            }

            await fetchStories()
            setupChannel()
        },
        { immediate: true },
    )

    onUnmounted(() => {
        cleanupChannel()
    })

    return {
        stories,
        activeStory,
        isVoting,
        isVoted,
        setActive,
        startVote,
        stopVote,
        completeStory,
        updateStoryLocally,
        removeStoryLocally,
        onStoryStatusChange,
    }
}
