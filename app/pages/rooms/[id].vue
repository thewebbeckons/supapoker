<script lang="ts" setup>
import type { Database } from '~/types/database.types'
import { useClipboard } from '@vueuse/core'

const route = useRoute()
const { copy } = useClipboard()

const roomId = route.params.id as string
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

// --- Mock Data constants ---
const CARDS = [
    { label: '0', value: 0 },
    { label: '½', value: 0.5 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '5', value: 5 },
    { label: '8', value: 8 },
    { label: '13', value: 13 },
    { label: '20', value: 20 },
    { label: '40', value: 40 },
    { label: '100', value: 100 },
    { label: '?', value: -1 },
    { label: '☕', value: -2, icon: 'i-lucide-coffee' }
]

const players = ref<any[]>([])

// Realtime Presence Logic
const channel = client.channel(`room:${roomId}`, {
    config: {
        presence: {
            key: user.value?.sub,
        },
    },
})

// Fetch current user profile
const { data: userProfile } = await useAsyncData('user-profile', async () => {
    if (!user.value) return null
    const { data } = await client
        .from('profile')
        .select('name, avatar')
        .eq('user_id', user.value.sub)
        .single()
    return data
})

const onlineUsers = ref<Set<string>>(new Set())

async function fetchParticipants() {
    const { data: participants } = await client
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId)

    if (participants && participants.length > 0) {
        const userIds = participants.map((p: any) => p.user_id)

        const { data: profiles } = await client
            .from('profile')
            .select('user_id, name, avatar')
            .in('user_id', userIds)

        const profileMap = new Map()
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.user_id, p))
        }

        players.value = userIds.map((uid: string) => {
            const profile = profileMap.get(uid)
            return {
                id: uid,
                name: profile?.name || 'Anonymous',
                avatar: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                status: onlineUsers.value.has(uid) ? 'waiting' : 'offline',
                time: '00:00:00',
                vote: null,
                isModerator: room.value && uid === room.value.created_by,
                isOnline: onlineUsers.value.has(uid)
            }
        })
    } else {
        players.value = []
    }
}

onMounted(async () => {
    // 2. Setup Realtime
    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState()
            const onlineIds = Object.keys(newState)
            onlineUsers.value = new Set(onlineIds)
            fetchParticipants() // Refresh list to update online status
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: user.value?.sub,
                    online_at: new Date().toISOString(),
                })
            }
        })

    // Initial fetch
    await fetchParticipants()

    // 3. Setup Stories Realtime
    const storiesChannel = client.channel(`room-stories:${roomId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stories', filter: `room_id=eq.${roomId}` },
            () => {
                refreshStories()
            }
        )
        .subscribe()
})

onUnmounted(() => {
    channel.unsubscribe()
})

const { data: stories, refresh: refreshStories } = await useAsyncData(`room-stories-${roomId}`, async () => {
    const { data } = await client
        .from('stories')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
    return data || []
})

// Combined data fetching: Participate first, then fetch room
// We wrap this in useAsyncData to handle the async state and errors gracefully.
const { data: room, status, error, refresh } = await useAsyncData(`room-${roomId}`, async () => {
    // 1. Ensure user is logged in
    if (!user.value) throw new Error('User not authenticated')

    // 2. Add to participants table BEFORE fetching room
    // This is required because RLS policies now restrict "select" on rooms 
    // to only creators or existing participants.
    const { error: joinError } = await client
        .from('room_participants')
        .upsert({
            room_id: roomId,
            user_id: user.value.sub,
            joined_at: new Date().toISOString()
        }, { onConflict: 'room_id,user_id' })

    if (joinError) {
        console.error('Failed to join room:', joinError)
        // We might continue if it's just a duplicate, but upsert handles that.
        // If it's a real error, we might fail early or try to fetch anyway.
    }

    // 3. Fetch Room Data
    const { data, error: fetchError } = await client
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

    if (fetchError) throw fetchError
    return data
}, {
    watch: [user]
})

const selectedCard = ref<number | null>(3) // Default to 3 for visual match with screenshot

function copyRoomUrl() {
    copy(window.location.href)
    toast.add({ title: 'Copied!', description: 'Room URL copied to clipboard.', color: 'success' })
}

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isNewStoryModalOpen = ref(false)
const isStoryEditModalOpen = ref(false)
const isStoryDeleteModalOpen = ref(false)
const selectedStory = ref<any>(null)

const canEdit = computed(() => {
    return !!(user.value && room.value && room.value.created_by === user.value.sub)
})

const activeStory = computed(() => {
    return stories.value?.find((s: any) => s.status === 'active')
})

function openEditModal(): void {
    isEditModalOpen.value = true
}

function selectCard(cardValue: number) {
    selectedCard.value = cardValue
}

const settingsItems = computed(() => [
    [{
        label: 'Poke Users',
        icon: 'i-lucide-megaphone',
        onSelect: () => {
            const audio = new Audio('/cawcaw.mp3')
            audio.play()
        }
    }],
    [{
        label: 'Edit Room Details',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal()
    }],
    [{
        label: 'Delete Room',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => { isDeleteModalOpen.value = true }
    }]
])

async function onSetActive(story: any) {
    if (!room.value || !story) return

    // 1. Set all other stories to pending if they were active (optional, but good for cleanup)
    // Actually, we just need to set this one to active. 
    // AND we probably want to set the room's current_story_card to null if we switch stories?
    // For now, let's just update the status.

    // Better approach:
    // 1. Update this story to 'active'
    // 2. Update all other 'active' stories to 'pending' (or 'completed'?) - usually pending if not voted.
    // Let's just set this one to active. The UI highlighting handles the rest.
    // However, to ensure only one is active:

    // Batch update: set all active stories in this room to pending
    await client
        .from('stories')
        .update({ status: 'pending' })
        .eq('room_id', roomId)
        .eq('status', 'active')

    // Set target story to active
    const { error } = await client
        .from('stories')
        .update({ status: 'active' })
        .eq('id', story.id)

    if (error) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    } else {
        toast.add({ title: 'Active Story Updated', color: 'success' })
        refreshStories()
    }
}

function onEditStory(story: any) {
    selectedStory.value = story
    isStoryEditModalOpen.value = true
}

function onDeleteStory(story: any) {
    selectedStory.value = story
    isStoryDeleteModalOpen.value = true
}
</script>

<template>
    <div v-if="status === 'pending'" class="flex justify-center items-center h-screen">
        <UProgress animation="carousel" />
    </div>

    <div v-else-if="error || !room" class="container mx-auto p-8 text-center">
        <h1 class="text-2xl font-bold text-error-500">Error</h1>
        <p class="text-neutral-500">Room not found or could not be loaded.</p>
        <UButton to="/rooms" color="neutral" variant="ghost" class="mt-4" icon="i-lucide-arrow-left">
            Back to Dashboard
        </UButton>
    </div>

    <div v-else class="min-h-screen">
        <div class="grid grid-cols-1 lg:grid-cols-4 overflow-hidden gap-6 p-6">
            <!-- Main Content Area -->
            <div
                class="lg:col-span-3 flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                <div class="p-6 pb-2 flex justify-between items-start">
                    <div>
                        <h1 class="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{{ room.name }}</h1>
                        <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ room.description }}</p>
                    </div>
                    <!-- Room Actions/Edit -->
                    <div class="flex items-center self-center gap-2">
                        <UButton v-if="canEdit" label="New Story" icon="i-lucide-plus" color="primary" size="sm"
                            @click="isNewStoryModalOpen = true" />

                        <UDropdownMenu v-if="canEdit" :items="settingsItems"
                            :content="{ align: 'end', side: 'bottom' }">
                            <UButton icon="i-lucide-settings" color="neutral" variant="ghost" size="sm" />
                        </UDropdownMenu>
                    </div>
                </div>

                <div class="flex-1 flex flex-col justify-center items-center gap-8 overflow-y-auto p-6">
                    <!-- Current Story Indicator -->
                    <div class="text-center min-h-[32px] flex items-center justify-center gap-4">
                        <template v-if="activeStory">
                            <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                                {{ activeStory.title }}
                            </h2>
                            <div v-if="canEdit" class="flex items-center gap-2">
                                <UButton size="sm" color="primary" variant="solid" icon="i-lucide-play-circle">
                                    Start Vote
                                </UButton>
                                <UButton size="sm" color="success" variant="subtle" icon="i-lucide-check-circle">
                                    Complete Story
                                </UButton>
                            </div>
                        </template>
                        <span v-else class="text-lg font-medium text-neutral-400 dark:text-neutral-500">
                            No Active Story
                        </span>
                    </div>

                    <!-- Cards Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
                        <button v-for="card in CARDS" :key="card.value" @click="selectCard(card.value)"
                            class="relative group flex flex-col items-center justify-center w-24 h-36 rounded-xl border-2 transition-all duration-200 bg-white dark:bg-neutral-800 shadow-sm hover:-translate-y-1 hover:shadow-md cursor-pointer"
                            :class="[
                                selectedCard === card.value
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800'
                            ]">
                            <!-- Card Content - Big Center -->
                            <span class="text-4xl font-light"
                                :class="selectedCard === card.value ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-200'">
                                <UIcon v-if="card.icon" :name="card.icon" class="w-8 h-8" />
                                <template v-else>{{ card.label }}</template>
                            </span>

                            <!-- Corner values -->
                            <span class="absolute top-2 left-2 text-xs font-medium text-neutral-400">
                                <template v-if="!card.icon">{{ card.label }}</template>
                                <UIcon v-else :name="card.icon" class="w-3 h-3" />
                            </span>
                            <span
                                class="absolute bottom-2 right-2 text-xs font-medium text-neutral-400 transform rotate-180">
                                <template v-if="!card.icon">{{ card.label }}</template>
                                <UIcon v-else :name="card.icon" class="w-3 h-3" />
                            </span>

                            <!-- Active Indicator overlay for selected card -->
                            <div v-if="selectedCard === card.value"
                                class="absolute inset-0 rounded-xl bg-primary-500/10 dark:bg-primary-400/10 pointer-events-none">
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Stories Panel (Bottom) -->
                <RoomStoriesPanel :stories="stories || []" :can-manage="canEdit" @set-active="onSetActive"
                    @edit="onEditStory" @delete="onDeleteStory" />
            </div>

            <!-- Sidebar Grid -->
            <div
                class="lg:col-span-1 flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <!-- Status Banner -->
                <div class="bg-primary-500 text-white p-4 text-center">
                    <p class="text-sm font-medium">Waiting for moderator to finalise vote</p>
                </div>

                <!-- Timer & Header -->
                <div class="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                    <h2 class="font-medium text-neutral-900 dark:text-white">Players:</h2>
                    <div class="flex items-center gap-1.5 text-primary-500 font-mono text-sm">
                        <UIcon name="i-lucide-clock" class="w-4 h-4" />
                        <span>62:13:57</span>
                    </div>
                </div>

                <!-- Player List -->
                <div class="flex-1 overflow-y-auto">
                    <div v-for="player in players" :key="player.id"
                        class="flex items-center justify-between p-4 border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <UAvatar :src="player.avatar" :alt="player.name" size="md" />
                                <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900"
                                    :class="player.status === 'voted' ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'">
                                </div>
                            </div>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-sm font-medium text-neutral-900 dark:text-white min-h-5">{{
                                        player.name }}</span>
                                    <UIcon v-if="player.isModerator" name="i-lucide-badge-check"
                                        class="w-3.5 h-3.5 text-primary-500" />
                                    <UIcon v-else-if="player.status === 'voted'" name="i-lucide-check-circle-2"
                                        class="w-3.5 h-3.5 text-blue-400" />
                                </div>
                                <span class="text-xs text-neutral-400">{{ player.time }}</span>
                            </div>
                        </div>
                        <div class="text-lg font-medium text-neutral-700 dark:text-neutral-300">
                            {{ player.vote }}
                        </div>
                    </div>
                </div>

                <!-- Invite Section -->
                <div class="p-4 border-t border-neutral-200 dark:border-neutral-800">
                    <UButton block color="neutral" variant="soft" icon="i-lucide-copy" label="Invite a teammate"
                        @click="copyRoomUrl" />
                </div>
            </div>
        </div>

        <!-- Edit Room Modal -->
        <RoomEditModal v-model="isEditModalOpen" :room="room" @success="refresh" />

        <!-- New Story Modal -->
        <RoomNewStoryModal v-model="isNewStoryModalOpen" :room="room" @success="refreshStories" />

        <!-- Delete Room Modal -->
        <RoomDeleteModal v-model="isDeleteModalOpen" :room="room" />

        <!-- Story Edit/Delete Modals -->
        <RoomStoryEditModal v-model="isStoryEditModalOpen" :story="selectedStory" @success="refreshStories" />
        <RoomStoryDeleteModal v-model="isStoryDeleteModalOpen" :story="selectedStory" @success="refreshStories" />
    </div>
</template>
