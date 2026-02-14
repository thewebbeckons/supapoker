<script lang="ts" setup>
import type { Database } from "~/types/database.types";

// Use Nuxt's auto-imported composables for Supabase
const client = useSupabaseClient<Database>();
const user = useSupabaseUser();
const toast = useToast();

// Interface for localized Room object
interface Room {
    id: string;
    name: string;
    description: string | null;
    role: "creator" | "participant";
    lastUsed: string; // Date string
}
type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

const search = ref("");
const isCreateRoomModalOpen = ref(false);
const newRoomName = ref("");
const newRoomDescription = ref("");

// View mode: 'card' or 'list'
const viewMode = useCookie<"card" | "list">("rooms-view-mode", {
    default: () => "card",
});

function mapRoomRow(room: RoomRow, userId: string): Room {
    return {
        id: room.id,
        name: room.name,
        description: room.description,
        role: room.created_by === userId ? "creator" : "participant",
        lastUsed: room.updated_at,
    };
}

// Fetch rooms from Supabase
const {
    data: rooms,
    refresh,
    status,
} = await useAsyncData(
    "rooms",
    async () => {
        if (!user.value) return [];

        const { data, error } = await client
            .from("rooms")
            .select("*")
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Error fetching rooms:", error);
            toast.add({
                title: "Error",
                description: "Failed to load rooms.",
                color: "error",
            });
            return [];
        }

        const userId = user.value.sub;
        return data.map((room: RoomRow) => mapRoomRow(room, userId));
    },
    {
        watch: [user],
    },
);

// Filter rooms based on search
const filteredRooms = computed(() => {
    if (!rooms.value) return [];
    if (!search.value) return rooms.value;
    return rooms.value.filter((room) =>
        room.name.toLowerCase().includes(search.value.toLowerCase()),
    );
});

function upsertRoomFromRealtime(roomRow: RoomRow) {
    if (!rooms.value || !user.value) return;

    const nextRoom = mapRoomRow(roomRow, user.value.sub);
    const roomIndex = rooms.value.findIndex((room) => room.id === nextRoom.id);

    if (roomIndex === -1) {
        rooms.value = [nextRoom, ...rooms.value];
    } else {
        const nextRooms = [...rooms.value];
        nextRooms[roomIndex] = nextRoom;
        rooms.value = nextRooms;
    }

    rooms.value = [...rooms.value].sort(
        (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime(),
    );
}

let roomsChannel: ReturnType<typeof client.channel> | null = null;

function cleanupRoomsChannel() {
    if (!roomsChannel) return;
    client.removeChannel(roomsChannel);
    roomsChannel = null;
}

function setupRoomsChannel() {
    if (!user.value || roomsChannel) return;

    roomsChannel = client.channel(`rooms-list:${user.value.sub}`);
    roomsChannel
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "rooms",
            },
            (payload: any) => {
                if (!rooms.value) return;

                if (payload.eventType === "DELETE") {
                    rooms.value = rooms.value.filter(
                        (room) => room.id !== payload.old.id,
                    );
                    return;
                }

                if (
                    payload.eventType === "INSERT" ||
                    payload.eventType === "UPDATE"
                ) {
                    upsertRoomFromRealtime(payload.new as RoomRow);
                }
            },
        )
        .subscribe();
}

watch(
    user,
    (nextUser, previousUser) => {
        if (!nextUser) {
            cleanupRoomsChannel();
            return;
        }

        if (previousUser?.sub && previousUser.sub !== nextUser.sub) {
            cleanupRoomsChannel();
        }

        setupRoomsChannel();
    },
    { immediate: true },
);

onUnmounted(() => {
    cleanupRoomsChannel();
});

function openCreateRoomModal() {
    newRoomName.value = "";
    newRoomDescription.value = "";
    isCreateRoomModalOpen.value = true;
}

async function createRoom() {
    if (!newRoomName.value.trim() || !user.value) return;

    const { data: room, error: roomError } = await client
        .from("rooms")
        .insert({
            name: newRoomName.value,
            description: newRoomDescription.value,
            created_by: user.value.sub,
        })
        .select("id")
        .single();

    if (roomError || !room) {
        toast.add({
            title: "Error",
            description: roomError?.message ?? "Failed to create room",
            color: "error",
        });
        return;
    }

    const { error: participantError } = await client
        .from("room_participants")
        .insert({
            room_id: room.id,
            user_id: user.value.sub,
            joined_at: new Date().toISOString(),
        });

    if (participantError) {
        toast.add({
            title: "Warning",
            description: "Room created but failed to add you as participant",
            color: "warning",
        });
    }

    toast.add({
        title: "Room Created",
        description: `Room "${newRoomName.value}" has been created!`,
        color: "success",
    });

    await refresh();
    isCreateRoomModalOpen.value = false;
}
</script>

<template>
    <div class="container mx-auto p-4 sm:p-8 space-y-8">
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold">Rooms</h1>
            <p class="text-neutral-400">Manage your poker rooms.</p>
        </div>

        <div class="flex justify-between items-center gap-4">
            <div class="flex items-center gap-2">
                <UInput
                    v-model="search"
                    icon="i-lucide-search"
                    placeholder="Search rooms..."
                    class="w-full max-w-xs"
                />
                <UButton
                    label="Create Room"
                    icon="i-lucide-plus"
                    color="primary"
                    @click="openCreateRoomModal"
                />
            </div>
            <div class="flex items-center gap-2">
                    <UButton
                        icon="i-lucide-layout-grid"
                        :color="viewMode === 'card' ? 'primary' : 'neutral'"
                        :variant="viewMode === 'card' ? 'solid' : 'ghost'"
                        @click="viewMode = 'card'"
                        aria-label="Card view"
                    />
                    <UButton
                        icon="i-lucide-list"
                        :color="viewMode === 'list' ? 'primary' : 'neutral'"
                        :variant="viewMode === 'list' ? 'solid' : 'ghost'"
                        @click="viewMode = 'list'"
                        aria-label="List view"
                    />
            </div>
        </div>

        <!-- Card View -->
        <div
            v-if="viewMode === 'card'"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
            <UCard
                v-for="room in filteredRooms"
                :key="room.id"
                @click="navigateTo(`/rooms/${room.id}`)"
                class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer flex flex-col h-full"
                :ui="{ body: 'flex-1' }"
            >
                <div class="flex flex-col items-start gap-1">
                    <h3 class="font-bold text-lg truncate w-full">
                        {{ room.name }}
                    </h3>
                    <p
                        v-if="room.description"
                        class="text-sm text-neutral-500 line-clamp-2 font-normal"
                    >
                        {{ room.description }}
                    </p>
                </div>

                <template #footer>
                    <div class="flex justify-between items-center">
                        <div
                            class="text-sm text-neutral-500 flex items-center gap-2"
                        >
                            <UIcon name="i-lucide-clock" class="w-4 h-4" />
                            <ClientOnly>
                                <LastUsedTime :time="room.lastUsed" />
                            </ClientOnly>
                        </div>

                        <UBadge
                            :color="
                                room.role === 'creator' ? 'primary' : 'neutral'
                            "
                            variant="subtle"
                            size="xs"
                        >
                            {{ room.role }}
                        </UBadge>
                    </div>
                </template>
            </UCard>
        </div>

        <!-- List View -->
        <div v-else class="flex flex-col gap-2">
            <div
                v-for="room in filteredRooms"
                :key="room.id"
                @click="navigateTo(`/rooms/${room.id}`)"
                class="flex items-center justify-between gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer"
            >
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3">
                        <h3 class="font-bold truncate">{{ room.name }}</h3>
                        <UBadge
                            :color="
                                room.role === 'creator' ? 'primary' : 'neutral'
                            "
                            variant="subtle"
                            size="xs"
                        >
                            {{ room.role }}
                        </UBadge>
                    </div>
                    <p
                        v-if="room.description"
                        class="text-sm text-neutral-500 truncate mt-1"
                    >
                        {{ room.description }}
                    </p>
                </div>

                <div
                    class="text-sm text-neutral-500 flex items-center gap-2 shrink-0"
                >
                    <UIcon name="i-lucide-clock" class="w-4 h-4" />
                    <ClientOnly>
                        <LastUsedTime :time="room.lastUsed" />
                    </ClientOnly>
                </div>
            </div>
        </div>

        <UModal
            v-model:open="isCreateRoomModalOpen"
            title="Create Room"
            description="Give your new room a name."
            :ui="{ content: 'sm:max-w-xl' }"
        >
            <template #body>
                <div class="flex flex-col gap-4">
                    <UFormField label="Room Name" required>
                        <UInput
                            v-model="newRoomName"
                            placeholder="e.g. Friday Night Poker"
                            @keydown.enter="createRoom"
                            class="w-full"
                            autofocus
                        />
                    </UFormField>

                    <UFormField label="Description">
                        <UTextarea
                            v-model="newRoomDescription"
                            placeholder="Optional description..."
                            :rows="3"
                            class="w-full"
                        />
                    </UFormField>

                    <div class="flex justify-end gap-2">
                        <UButton
                            label="Cancel"
                            color="neutral"
                            variant="ghost"
                            @click="isCreateRoomModalOpen = false"
                        />
                        <UButton
                            label="Create"
                            color="primary"
                            @click="createRoom"
                            :disabled="!newRoomName.trim()"
                        />
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
