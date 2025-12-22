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
    // 1. Mark as participant
    if (user.value) {
        await client
            .from('room_participants')
            .upsert({
                room_id: roomId,
                user_id: user.value.sub,
                joined_at: new Date().toISOString()
            }, { onConflict: 'room_id,user_id' }) // Just update joined_at if exists
    }

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
})

onUnmounted(() => {
    channel.unsubscribe()
})

const STORIES = [
    { title: '5372', status: 'Active' }
]

const { data: room, status, error, refresh } = await useAsyncData(`room-${roomId}`, async () => {
    const { data, error } = await client
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

    if (error) throw error
    return data
})

const selectedCard = ref<number | null>(3) // Default to 3 for visual match with screenshot

function copyRoomUrl() {
    copy(window.location.href)
    toast.add({ title: 'Copied!', description: 'Room URL copied to clipboard.', color: 'success' })
}

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isNewStoryModalOpen = ref(false)

const canEdit = computed(() => {
    return user.value && room.value && room.value.created_by === user.value.sub
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
                    <div class="text-center">
                        <span class="text-lg font-medium text-neutral-600 dark:text-neutral-400">
                            {{ room.current_story_card || 'No Active Story' }}
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
                <div
                    class="h-48 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
                    <div class="flex items-center gap-6 px-6 py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <button class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                            Active Stories
                            <UBadge color="error" size="xs" class="rounded-full">1</UBadge>
                        </button>
                        <button
                            class="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-2">
                            Completed Stories
                            <UBadge color="neutral" variant="soft" size="xs" class="rounded-full">1491
                            </UBadge>
                        </button>
                        <button
                            class="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-2">
                            All Stories
                            <UBadge color="neutral" variant="soft" size="xs" class="rounded-full">1492
                            </UBadge>
                        </button>
                    </div>
                    <div class="p-0 overflow-y-auto">
                        <div v-for="story in STORIES" :key="story.title"
                            class="flex items-center px-6 py-3 bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-primary-500">
                            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ story.title
                            }}</span>
                        </div>
                    </div>
                </div>
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
        <RoomNewStoryModal v-model="isNewStoryModalOpen" :room="room" @success="refresh" />

        <!-- Delete Room Modal -->
        <RoomDeleteModal v-model="isDeleteModalOpen" :room="room" />
    </div>
</template>
