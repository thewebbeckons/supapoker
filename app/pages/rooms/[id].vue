<script lang="ts" setup>
import type { Database } from "~/types/database.types";

const route = useRoute();

const roomId = route.params.id as string;
const client = useSupabaseClient<Database>();
const user = useSupabaseUser();
const toast = useToast();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isNewStoryModalOpen = ref(false);
const isStoryEditModalOpen = ref(false);
const isStoryDeleteModalOpen = ref(false);
const isStoryCompleteModalOpen = ref(false);
const isStoryVotesModalOpen = ref(false);
const selectedStory = ref<any>(null);
const isJoinModalOpen = ref(false);
const isJoiningRoom = ref(false);
const hasJoinedRoom = ref(false);

function getInviteQueryValue(
    key: "roomName" | "roomDescription",
): string {
    const value = route.query[key];

    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return "";
}

const inviteRoomName = computed(() => getInviteQueryValue("roomName"));
const inviteRoomDescription = computed(() =>
    getInviteQueryValue("roomDescription"),
);

const {
    data: isParticipant,
    status: participantStatus,
} = await useAsyncData(
    `room-participant-${roomId}`,
    async () => {
        if (!user.value) return false;

        const { data, error } = await client
            .from("room_participants")
            .select("room_id")
            .eq("room_id", roomId)
            .eq("user_id", user.value.sub)
            .maybeSingle();

        if (error) {
            console.error("Failed to check room membership:", error);
            return false;
        }

        return Boolean(data);
    },
    {
        watch: [user],
    },
);

watch(
    [participantStatus, isParticipant],
    ([status, participant]) => {
        if (status !== "success") return;

        hasJoinedRoom.value = Boolean(participant);
        isJoinModalOpen.value = !hasJoinedRoom.value;
    },
    { immediate: true },
);

async function joinRoom() {
    if (!user.value || isJoiningRoom.value) return;

    isJoiningRoom.value = true;

    try {
        const { error } = await client
            .from("room_participants")
            .upsert(
                {
                    room_id: roomId,
                    user_id: user.value.sub,
                    joined_at: new Date().toISOString(),
                },
                { onConflict: "room_id,user_id" },
            );

        if (error) {
            toast.add({
                title: "Unable to join room",
                description: error.message,
                color: "error",
            });
            return;
        }

        hasJoinedRoom.value = true;
        isJoinModalOpen.value = false;
    } finally {
        isJoiningRoom.value = false;
    }
}

const {
    data: room,
    status: roomStatus,
    error: roomError,
    refresh,
} = await useAsyncData(
    `room-${roomId}`,
    async () => {
        if (!user.value || !hasJoinedRoom.value) return null;

        const { data, error: fetchError } = await client
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();

        if (fetchError) throw fetchError;
        return data;
    },
    {
        watch: [user, hasJoinedRoom],
    },
);

const joinModalTitle = computed(() => {
    if (inviteRoomName.value) return inviteRoomName.value;
    return "Join this room";
});

const joinModalDescription = computed(() => {
    if (inviteRoomDescription.value) return inviteRoomDescription.value;
    return "You've been invited to collaborate in this planning poker room.";
});

const isRoomLoading = computed(() => {
    return (
        participantStatus.value === "pending" ||
        (hasJoinedRoom.value &&
            (roomStatus.value === "idle" || roomStatus.value === "pending"))
    );
});

const showRoomError = computed(() => {
    if (!hasJoinedRoom.value) return false;
    if (roomStatus.value === "idle" || roomStatus.value === "pending") {
        return false;
    }

    return hasJoinedRoom.value && (Boolean(roomError.value) || !room.value);
});

const canEdit = computed(() => {
    return !!(
        user.value &&
        room.value &&
        room.value.created_by === user.value.sub
    );
});

const roomCreatorId = computed(() => room.value?.created_by);

// Composables
const {
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
} = useRoomStories(roomId, hasJoinedRoom);

const { votes, selectedCard, selectCard } = useRoomVotes(
    roomId,
    activeStory,
    isVoting,
    onStoryStatusChange,
    hasJoinedRoom,
);

const { players, pokeUsers } = useRoomPresence(
    roomId,
    roomCreatorId,
    hasJoinedRoom,
);

let roomChannel: ReturnType<typeof client.channel> | null = null;

function cleanupRoomChannel() {
    if (roomChannel) {
        client.removeChannel(roomChannel);
        roomChannel = null;
    }
}

function setupRoomChannel() {
    if (!hasJoinedRoom.value || roomChannel) return;

    roomChannel = client.channel(`room-meta:${roomId}`);
    roomChannel
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "rooms",
                filter: `id=eq.${roomId}`,
            },
            (payload: any) => {
                room.value = payload.new;
            },
        )
        .on(
            "postgres_changes",
            {
                event: "DELETE",
                schema: "public",
                table: "rooms",
                filter: `id=eq.${roomId}`,
            },
            async () => {
                toast.add({
                    title: "Room deleted",
                    description: "This room was removed.",
                    color: "warning",
                });
                await navigateTo("/rooms");
            },
        )
        .subscribe();
}

watch(
    hasJoinedRoom,
    (joined) => {
        if (!joined) {
            cleanupRoomChannel();
            return;
        }

        setupRoomChannel();
    },
    { immediate: true },
);

onUnmounted(() => {
    cleanupRoomChannel();
});

// Fetch current user profile
const { data: userProfile } = await useAsyncData("user-profile", async () => {
    if (!user.value) return null;
    const { data } = await client
        .from("profile")
        .select("name, avatar")
        .eq("user_id", user.value.sub)
        .single();
    return data;
});

// Modal handlers
function openEditModal(): void {
    isEditModalOpen.value = true;
}

function onEditStory(story: any) {
    selectedStory.value = story;
    isStoryEditModalOpen.value = true;
}

function onDeleteStory(story: any) {
    selectedStory.value = story;
    isStoryDeleteModalOpen.value = true;
}

function onStoryEditSuccess(payload: { id: string; title: string }) {
    updateStoryLocally(payload.id, { title: payload.title });
}

function onStoryDeleteSuccess() {
    if (selectedStory.value) {
        removeStoryLocally(selectedStory.value.id);
    }
}

function onViewVotes(story: any) {
    selectedStory.value = story;
    isStoryVotesModalOpen.value = true;
}
</script>

<template>
    <div
        v-if="isRoomLoading"
        class="flex justify-center items-center h-screen"
    >
        <UProgress animation="carousel" />
    </div>

    <div
        v-else-if="showRoomError"
        class="container mx-auto p-8 text-center"
    >
        <h1 class="text-2xl font-bold text-error-500">Error</h1>
        <p class="text-neutral-500">Room not found or could not be loaded.</p>
        <UButton
            to="/rooms"
            color="neutral"
            variant="ghost"
            class="mt-4"
            icon="i-lucide-arrow-left"
        >
            Back to Dashboard
        </UButton>
    </div>

    <div v-else-if="!hasJoinedRoom" class="min-h-screen">
        <UModal
            v-model:open="isJoinModalOpen"
            :dismissible="false"
            title="Room Invitation"
            :description="joinModalDescription"
            :ui="{ content: 'sm:max-w-lg' }"
        >
            <template #body>
                <div class="flex flex-col gap-4">
                    <div
                        class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900/70"
                    >
                        <p
                            class="text-xs uppercase tracking-wide text-neutral-500"
                        >
                            Room
                        </p>
                        <p class="text-lg font-semibold text-neutral-900 dark:text-white">
                            {{ joinModalTitle }}
                        </p>
                        <p class="text-sm text-neutral-500 mt-2">
                            Room ID: {{ roomId }}
                        </p>
                    </div>

                    <div class="flex justify-end gap-2">
                        <UButton
                            to="/rooms"
                            color="neutral"
                            variant="ghost"
                            label="Not now"
                        />
                        <UButton
                            color="primary"
                            :loading="isJoiningRoom"
                            label="Join room"
                            @click="joinRoom"
                        />
                    </div>
                </div>
            </template>
        </UModal>
    </div>

    <div v-else class="min-h-screen">
        <div class="grid grid-cols-1 lg:grid-cols-4 overflow-hidden gap-6 p-6">
            <!-- Main Content Area -->
            <div
                class="lg:col-span-3 flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden"
            >
                <div class="p-6 pb-2 flex justify-between items-start">
                    <div>
                        <h1
                            class="text-2xl font-semibold text-neutral-700 dark:text-neutral-200"
                        >
                            {{ room.name }}
                        </h1>
                        <p
                            class="text-sm text-neutral-500 dark:text-neutral-400"
                        >
                            {{ room.description }}
                        </p>
                    </div>
                    <!-- Room Actions/Edit -->
                    <RoomControls
                        :can-edit="canEdit"
                        @new-story="isNewStoryModalOpen = true"
                        @edit-room="openEditModal"
                        @delete-room="isDeleteModalOpen = true"
                        @poke-users="pokeUsers"
                    />
                </div>

                <div
                    class="flex-1 flex flex-col justify-center items-center gap-8 overflow-y-auto p-6"
                >
                    <!-- Current Story Indicator -->
                    <div
                        class="text-center min-h-8 flex items-center justify-center gap-4"
                    >
                        <template v-if="activeStory">
                            <h2
                                class="text-xl font-semibold text-neutral-800 dark:text-neutral-100"
                            >
                                {{ activeStory.title }}
                            </h2>
                            <div v-if="canEdit" class="flex items-center gap-2">
                                <template v-if="isVoting">
                                    <UButton
                                        size="sm"
                                        color="error"
                                        variant="solid"
                                        icon="i-lucide-square"
                                        @click="stopVote"
                                    >
                                        Stop Vote
                                    </UButton>
                                </template>
                                <template v-else-if="isVoted">
                                    <UButton
                                        size="sm"
                                        color="primary"
                                        variant="solid"
                                        icon="i-lucide-rotate-ccw"
                                        @click="startVote"
                                    >
                                        Restart Vote
                                    </UButton>
                                    <UButton
                                        size="sm"
                                        color="success"
                                        variant="subtle"
                                        icon="i-lucide-check-circle"
                                        @click="isStoryCompleteModalOpen = true"
                                    >
                                        Complete Story
                                    </UButton>
                                </template>
                                <template v-else>
                                    <UButton
                                        size="sm"
                                        color="primary"
                                        variant="solid"
                                        icon="i-lucide-play-circle"
                                        @click="startVote"
                                    >
                                        Start Vote
                                    </UButton>
                                </template>
                            </div>
                        </template>
                        <span
                            v-else
                            class="text-lg font-medium text-neutral-400 dark:text-neutral-500"
                        >
                            No Active Story
                        </span>
                    </div>

                    <!-- Vote Results or Cards Grid -->
                    <RoomVoteResults
                        v-if="isVoted"
                        :votes="votes"
                    />
                    <RoomPokerTable
                        v-else
                        :model-value="selectedCard"
                        :is-voting="isVoting"
                        @update:model-value="selectCard"
                    />
                </div>

                <!-- Stories Panel (Bottom) -->
                <RoomStoriesPanel
                    :stories="stories"
                    :can-manage="canEdit"
                    @set-active="setActive"
                    @edit="onEditStory"
                    @delete="onDeleteStory"
                    @view-votes="onViewVotes"
                />
            </div>

            <!-- Sidebar Grid -->
            <RoomSidebar
                :players="players"
                :active-story="activeStory"
                :is-voted="isVoted"
                :votes="votes"
                :room="room"
            />
        </div>

        <!-- Edit Room Modal -->
        <RoomEditModal
            v-model="isEditModalOpen"
            :room="room"
            @success="refresh"
        />

        <!-- New Story Modal -->
        <RoomNewStoryModal
            v-model="isNewStoryModalOpen"
            :room="room"
        />

        <!-- Delete Room Modal -->
        <RoomDeleteModal v-model="isDeleteModalOpen" :room="room" />

        <!-- Story Edit/Delete Modals -->
        <RoomStoryEditModal
            v-model="isStoryEditModalOpen"
            :story="selectedStory"
            @success="onStoryEditSuccess"
        />
        <RoomStoryDeleteModal
            v-model="isStoryDeleteModalOpen"
            :story="selectedStory"
            @success="onStoryDeleteSuccess"
        />

        <!-- Story Complete Confirmation Modal -->
        <RoomStoryCompleteModal
            v-model="isStoryCompleteModalOpen"
            :story="activeStory"
            @confirm="completeStory"
        />

        <!-- Story Votes Modal -->
        <RoomStoryVotesModal
            v-model="isStoryVotesModalOpen"
            :story="selectedStory"
        />
    </div>
</template>
