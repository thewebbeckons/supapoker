<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";
import type { Room, Story, TransferCandidate } from "~/types/room";

definePageMeta({
    middleware: ["auth"],
});

const route = useRoute();

const roomId = computed(() => String(route.params.id));
const { user } = useCurrentUser();
const toast = useToast();
const { copy } = useClipboard();

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

function copyRoomUrl(): void {
    const inviteUrl = new URL(window.location.href);

    if (room.value?.name) {
        inviteUrl.searchParams.set("roomName", room.value.name);
    }

    if (room.value?.description) {
        inviteUrl.searchParams.set("roomDescription", room.value.description);
    }

    copy(inviteUrl.toString());
    toast.add({
        title: "Copied!",
        description: "Room URL copied to clipboard.",
        color: "success",
    });
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

    <div v-else class="room-page">
        <ClientOnly>
            <RoomBirdBurst :burst-key="pokeBurstKey" />
        </ClientOnly>

        <div class="room-shell">
            <main class="room-main">
                <header class="room-header">
                    <div>
                        <p class="room-kicker">PLANNING ROOM · {{ roomId.slice(0, 8) }}</p>
                        <h1>{{ room?.name }}</h1>
                        <p>{{ room?.description || "Estimate together, then reveal as a team." }}</p>
                    </div>
                    <RoomControls
                        :can-edit="canEdit"
                        @new-story="isNewStoryModalOpen = true"
                        @invite-teammate="copyRoomUrl"
                        @edit-room="openEditModal"
                        @delete-room="isDeleteModalOpen = true"
                    />
                </header>

                <section class="vote-stage">
                    <div class="current-story">
                        <template v-if="activeStory">
                            <span>CURRENT STORY</span>
                            <h2>{{ activeStory.title }}</h2>
                            <div class="story-state" :class="{ live: isVoting }">
                                <i />
                                {{ isVoting ? "Voting open" : isVoted ? "Votes revealed" : "Ready to vote" }}
                                <RoomTimer v-if="isVoting" :story="activeStory" />
                            </div>
                            <div v-if="canEdit" class="vote-actions">
                                <template v-if="pendingStoryActionType === 'startVote'">
                                    <UButton
                                        size="sm"
                                        color="primary"
                                        variant="subtle"
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
                                        variant="subtle"
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
                                        variant="subtle"
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
                                        variant="subtle"
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
                        <template v-else>
                            <span>CURRENT STORY</span>
                            <h2>No active story</h2>
                            <p class="empty-story-copy">Choose a story below to prepare the next vote.</p>
                        </template>
                    </div>

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
                </section>

                <RoomStoriesPanel
                    :stories="stories"
                    :can-manage="canEdit"
                    @set-active="setActive"
                    @edit="onEditStory"
                    @delete="onDeleteStory"
                    @view-votes="onViewVotes"
                />
            </main>

            <RoomSidebar
                :players="players"
                :active-story="activeStory"
                :is-voted="isVoted"
                :votes="votes"
                :connection-status="connectionStatus"
                :can-poke="canEdit"
                @poke-users="pokeUsers"
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

<style scoped>
.room-page {
    min-height: calc(100dvh - 4rem);
    padding-block: 1.5rem;
}

.room-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 17rem;
    min-height: calc(100dvh - 8rem);
    color: #d4d4d8;
    border: 1px solid rgba(255, 255, 255, 0.11);
    background: #0a0a0c;
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
}

.room-main {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.room-header {
    display: flex;
    min-height: 7rem;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.4rem 1.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.room-kicker,
.current-story > span,
.story-state {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.room-kicker { color: #60a5fa; }
.room-header h1 { margin-top: 0.4rem; color: #fafafa; font-size: 1.35rem; font-weight: 600; }
.room-header > div > p:last-child { margin-top: 0.3rem; color: #92929c; font-size: 0.86rem; }

.vote-stage {
    display: grid;
    flex: 1;
    align-content: center;
    justify-items: center;
    min-height: 32rem;
    padding: 3.25rem 1.5rem;
    background: radial-gradient(circle at 50% 42%, rgba(37, 99, 235, 0.075), transparent 42%);
}

.current-story { margin-bottom: 2.6rem; text-align: center; }
.current-story > span { color: #888892; }
.current-story h2 { max-width: 48rem; margin-top: 0.7rem; color: #fafafa; font-size: clamp(1.2rem, 2vw, 1.55rem); font-weight: 500; }
.story-state { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.85rem; color: #92929c; letter-spacing: 0.08em; }
.story-state.live { color: #7ab8ff; }
.story-state > i { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.story-state :deep(.room-timer) { margin-left: 0.35rem; }
.vote-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 1.25rem; }
.empty-story-copy { margin-top: 0.6rem; color: #85858f; font-size: 0.82rem; }

@media (max-width: 960px) {
    .room-shell { grid-template-columns: minmax(0, 1fr) 14rem; }
}

@media (max-width: 760px) {
    .room-page { padding-block: 0; }
    .room-shell { display: flex; min-height: auto; flex-direction: column; border-inline: 0; }
    .room-header { min-height: 6rem; padding: 1rem; }
    .vote-stage { min-height: 30rem; padding: 2.5rem 0.75rem; }
}

@media (max-width: 520px) {
    .room-header { align-items: flex-start; gap: 1rem; }
    .room-header h1 { font-size: 1.2rem; }
    .room-header > div > p:last-child { max-width: 15rem; }
    .current-story { margin-bottom: 2rem; }
}
</style>
