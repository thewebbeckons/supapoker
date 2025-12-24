<script lang="ts" setup>
import type { Database } from '~/types/database.types'

// Use Nuxt's auto-imported composables for Supabase
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

// Interface for localized Room object
interface Room {
    id: string
    name: string
    description: string | null
    role: 'creator' | 'participant'
    lastUsed: string // Date string
}

const search = ref('')
const isCreateRoomModalOpen = ref(false)
const newRoomName = ref('')
const newRoomDescription = ref('')

// Fetch rooms from Supabase
const { data: rooms, refresh, status } = await useAsyncData('rooms', async () => {
    if (!user.value) return []

    const { data, error } = await client
        .from('rooms')
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching rooms:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to load rooms.',
            color: 'error'
        })
        return []
    }

    const userId = user.value.sub
    return data.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        role: room.created_by === userId ? 'creator' : 'participant',
        lastUsed: room.updated_at
    })) as Room[]
}, {
    watch: [user]
})

// Filter rooms based on search
const filteredRooms = computed(() => {
    if (!rooms.value) return []
    if (!search.value) return rooms.value
    return rooms.value.filter(room => room.name.toLowerCase().includes(search.value.toLowerCase()))
})

function openCreateRoomModal() {
    newRoomName.value = ''
    newRoomDescription.value = ''
    isCreateRoomModalOpen.value = true
}

async function createRoom() {
    if (!newRoomName.value.trim() || !user.value) return

    const { error } = await client.from('rooms').insert({
        name: newRoomName.value,
        description: newRoomDescription.value,
        created_by: user.value.sub
    })

    if (error) {
        toast.add({
            title: 'Error',
            description: error.message,
            color: 'error'
        })
        return
    }

    toast.add({
        title: 'Room Created',
        description: `Room "${newRoomName.value}" has been created!`,
        color: 'success'
    })

    await refresh()
    isCreateRoomModalOpen.value = false
}
</script>

<template>
    <div class="container mx-auto p-4 sm:p-8 space-y-8">
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold">Rooms</h1>
            <p class="text-neutral-400">Manage your poker rooms.</p>
        </div>

        <div class="flex justify-between items-center gap-4">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Search rooms..." class="w-full max-w-xs" />
            <UButton label="Create Room" icon="i-lucide-plus" color="primary" @click="openCreateRoomModal" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <UCard v-for="room in filteredRooms" :key="room.id" @click="navigateTo(`/rooms/${room.id}`)"
                class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer flex flex-col h-full"
                :ui="{ body: 'flex-1' }">
                <div class="flex flex-col items-start gap-1">
                    <h3 class="font-bold text-lg truncate w-full">{{ room.name }}</h3>
                    <p v-if="room.description" class="text-sm text-neutral-500 line-clamp-2 font-normal">
                        {{ room.description }}
                    </p>
                </div>

                <template #footer>
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-neutral-500 flex items-center gap-2">
                            <UIcon name="i-lucide-clock" class="w-4 h-4" />
                            <!-- We need a way to use useTimeAgo here. 
                     Since useTimeAgo returns a ref, using it directly in template: {{ useTimeAgo(date).value }} 
                     creates a new ref on every render.
                     Let's create a specialized component for this part to be clean.
                -->
                            <ClientOnly>
                                <LastUsedTime :time="room.lastUsed" />
                            </ClientOnly>
                        </div>

                        <UBadge :color="room.role === 'creator' ? 'primary' : 'neutral'" variant="subtle" size="xs">
                            {{ room.role }}
                        </UBadge>
                    </div>
                </template>
            </UCard>
        </div>

        <UModal v-model:open="isCreateRoomModalOpen" title="Create Room" description="Give your new room a name."
            :ui="{ content: 'sm:max-w-xl' }">
            <template #body>
                <div class="flex flex-col gap-4">
                    <UFormField label="Room Name" required>
                        <UInput v-model="newRoomName" placeholder="e.g. Friday Night Poker" @keydown.enter="createRoom"
                            class="w-full" autofocus />
                    </UFormField>

                    <UFormField label="Description">
                        <UTextarea v-model="newRoomDescription" placeholder="Optional description..." :rows="3"
                            class="w-full" />
                    </UFormField>

                    <div class="flex justify-end gap-2">
                        <UButton label="Cancel" color="neutral" variant="ghost"
                            @click="isCreateRoomModalOpen = false" />
                        <UButton label="Create" color="primary" @click="createRoom" :disabled="!newRoomName.trim()" />
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
