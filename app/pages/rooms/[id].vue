<script lang="ts" setup>
import type { Room, Story, TransferCandidate } from "~/types/room";

definePageMeta({
    middleware: ["auth"],
});

const route = useRoute();

const roomId = computed(() => String(route.params.id));
const { user } = useCurrentUser();
const toast = useToast();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isNewStoryModalOpen = ref(false);
const isStoryEditModalOpen = ref(false);
const isStoryDeleteModalOpen = ref(false);
const isStoryCompleteModalOpen = ref(false);
const isStoryVotesModalOpen = ref(false);
const selectedStory = ref<Story | null>(null);
const isJoinModalOpen = ref(false);
const isJoiningRoom = ref(false);
const pokeBurstKey = ref(0);

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
    data: roomAccess,
    status: roomStatus,
    error: roomError,
    refresh,
} = await useAsyncData(
    `room-access-${roomId.value}`,
    async () => {
        if (!user.value) return null;
        return $fetch<{ room: Room; isParticipant: boolean }>(`/api/rooms/${roomId.value}`);
    },
    {
        watch: [user, roomId],
    },
);

const initialRoom = computed(() => roomAccess.value?.room ?? null);
const hasRoomLoadFailed = computed(() => {
    if (!user.value || roomStatus.value === "idle" || roomStatus.value === "pending") return false;

    return Boolean(roomError.value) || !roomAccess.value || !initialRoom.value;
});
const hasJoinedRoom = computed(() => Boolean(initialRoom.value && roomAccess.value?.isParticipant));

watch(
    [roomStatus, roomAccess, hasRoomLoadFailed, user],
    ([status, access, loadFailed, currentUser]) => {
        if (!currentUser || status === "idle" || status === "pending") return;

        if (loadFailed || !access) {
            isJoinModalOpen.value = false;
            return;
        }

        isJoinModalOpen.value = !access.isParticipant;
    },
    { immediate: true },
);

async function joinRoom() {
    if (!user.value || isJoiningRoom.value) return;

    isJoiningRoom.value = true;

    try {
        await $fetch(`/api/rooms/${roomId.value}/join`, { method: "POST" });
        await refresh();
        isJoinModalOpen.value = false;
    } catch (error: any) {
        toast.add({
            title: "Unable to join room",
            description: error?.data?.message ?? error.message,
            color: "error",
        });
    } finally {
        isJoiningRoom.value = false;
    }
}

const joinModalTitle = computed(() => {
    if (inviteRoomName.value) return inviteRoomName.value;
    if (room.value?.name) return room.value.name;
    return "Join this room";
});

const joinModalDescription = computed(() => {
    if (inviteRoomDescription.value) return inviteRoomDescription.value;
    if (room.value?.description) return room.value.description;
    return "You've been invited to collaborate in this planning poker room.";
});

const isRoomLoading = computed(() => {
    if (!user.value) return true;
    return roomStatus.value === "idle" || roomStatus.value === "pending";
});

const canJoinRoom = computed(() => {
    if (isJoiningRoom.value) return false;
    return Boolean(user.value);
});

const showRoomError = computed(() => {
    return hasRoomLoadFailed.value;
});

const realtime = useRoomRealtime(roomId, hasJoinedRoom);
const connectionStatus = realtime.status;
const room = computed(() => {
    const realtimeRoom = realtime.room.value;
    const accessRoom = initialRoom.value;
    if (!realtimeRoom) return accessRoom;
    if (!accessRoom) return realtimeRoom;

    const realtimeUpdatedAt = Date.parse(realtimeRoom.updatedAt || realtimeRoom.updated_at);
    const accessUpdatedAt = Date.parse(accessRoom.updatedAt || accessRoom.updated_at);
    return accessUpdatedAt > realtimeUpdatedAt ? accessRoom : realtimeRoom;
});

const canEdit = computed(() => {
    return !!(
        user.value &&
        room.value &&
        room.value.adminUserId === user.value.id
    );
});

const currentRoomCreatorId = computed(() => room.value?.adminUserId);

// Composables
const {
    stories,
    activeStory,
    isVoting,
    isVoted,
    isStoryActionPending,
    pendingStoryActionType,
    setActive,
    startVote,
    stopVote,
    completeStory,
    refreshStories,
    updateStoryLocally,
    removeStoryLocally,
} = useRoomStories(roomId, realtime, hasJoinedRoom);

const { votes, selectedCard, selectCard } = useRoomVotes(
    roomId,
    realtime,
    activeStory,
    isVoting,
    hasJoinedRoom,
);

const { players, pokeUsers, lastPokeId } = useRoomPresence(roomId, realtime);

watch(lastPokeId, (value) => {
    if (!value) return;
    pokeBurstKey.value += 1;
});

const transferCandidates = computed<TransferCandidate[]>(() =>
    players.value
        .filter((player) => player.id !== currentRoomCreatorId.value)
        .map((player) => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isOnline: player.isOnline,
        })),
);

// Modal handlers
function openEditModal(): void {
    isEditModalOpen.value = true;
}

function onEditStory(story: Story) {
    selectedStory.value = story;
    isStoryEditModalOpen.value = true;
}

function onDeleteStory(story: Story) {
    selectedStory.value = story;
    isStoryDeleteModalOpen.value = true;
}

function onStoryEditSuccess(story: Story) {
    updateStoryLocally(story.id, story);
    selectedStory.value = story;
    void refreshStories();
}

function onViewVotes(story: Story) {
    selectedStory.value = story;
    isStoryVotesModalOpen.value = true;
}

function onStoryDeleteSuccess() {
    if (selectedStory.value) removeStoryLocally(selectedStory.value.id);
    selectedStory.value = null;
    isStoryDeleteModalOpen.value = false;
    void refreshStories();
}

async function onRoomEditSuccess() {
    await Promise.all([refresh(), realtime.refresh()]);
}

watch(stories, (nextStories) => {
    const selected = selectedStory.value;
    if (!selected) return;

    const latestStory = nextStories.find((story) => story.id === selected.id);
    if (latestStory) {
        selectedStory.value = latestStory;
        return;
    }

    isStoryEditModalOpen.value = false;
    isStoryDeleteModalOpen.value = false;
    isStoryVotesModalOpen.value = false;
    selectedStory.value = null;
});
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
                            :disabled="!canJoinRoom"
                            label="Join room"
                            @click="joinRoom"
                        />
                    </div>
                </div>
            </template>
        </UModal>
    </div>

    <div v-else class="min-h-screen">
        <ClientOnly>
            <RoomBirdBurst :burst-key="pokeBurstKey" />
        </ClientOnly>

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
                            {{ room?.name }}
                        </h1>
                        <p
                            class="text-sm text-neutral-500 dark:text-neutral-400"
                        >
                            {{ room?.description }}
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
                                <template v-if="pendingStoryActionType === 'startVote'">
                                    <UButton
                                        size="sm"
                                        color="primary"
                                        variant="solid"
                                        icon="i-lucide-loader-circle"
                                        loading
                                        disabled
                                    >
                                        Starting Vote
                                    </UButton>
                                </template>
                                <template v-else-if="pendingStoryActionType === 'stopVote'">
                                    <UButton
                                        size="sm"
                                        color="error"
                                        variant="solid"
                                        icon="i-lucide-loader-circle"
                                        loading
                                        disabled
                                    >
                                        Stopping Vote
                                    </UButton>
                                </template>
                                <template v-else-if="isVoting">
                                    <UButton
                                        size="sm"
                                        color="error"
                                        variant="solid"
                                        icon="i-lucide-square"
                                        :disabled="isStoryActionPending"
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
                                        :disabled="isStoryActionPending"
                                        @click="startVote"
                                    >
                                        Restart Vote
                                    </UButton>
                                    <UButton
                                        size="sm"
                                        color="success"
                                        variant="subtle"
                                        icon="i-lucide-check-circle"
                                        :disabled="isStoryActionPending"
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
                                        :disabled="isStoryActionPending"
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
                :room="room ?? null"
                :connection-status="connectionStatus"
            />
        </div>

        <!-- Edit Room Modal -->
        <RoomEditModal
            v-model="isEditModalOpen"
            :room="room ?? null"
            :transfer-candidates="transferCandidates"
            @success="onRoomEditSuccess"
        />

        <!-- New Story Modal -->
        <RoomNewStoryModal
            v-model="isNewStoryModalOpen"
            :room="room ?? null"
            @success="refreshStories"
        />

        <!-- Delete Room Modal -->
        <RoomDeleteModal v-model="isDeleteModalOpen" :room="room ?? null" />

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
            :story="activeStory ?? null"
            @confirm="completeStory"
        />

        <!-- Story Votes Modal -->
        <RoomStoryVotesModal
            v-model="isStoryVotesModalOpen"
            :story="selectedStory"
        />
    </div>
</template>
