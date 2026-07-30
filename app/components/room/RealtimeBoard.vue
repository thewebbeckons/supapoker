<script lang="ts" setup>
import { useClipboard } from '@vueuse/core'
import type { Room, Story, TransferCandidate } from '~/types/room'
import type { RoomRealtimeSession } from '~/composables/useRoomRealtime'
import { DEFAULT_CARD_VALUES } from '~/utils/card-decks'

const props = defineProps<{
    roomId: string
    room: Room | null
    realtime: RoomRealtimeSession
    canEdit: boolean
    hasJoined: boolean
}>()

const emit = defineEmits<{
    (e: 'room-updated'): void
}>()

const toast = useToast()
const { copy } = useClipboard()
const posthog = usePostHog()

const roomId = computed(() => props.roomId)
const hasJoined = computed(() => props.hasJoined)

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isNewStoryModalOpen = ref(false)
const isStoryEditModalOpen = ref(false)
const isStoryDeleteModalOpen = ref(false)
const isStoryCompleteModalOpen = ref(false)
const isStoryVotesModalOpen = ref(false)
const selectedStory = ref<Story | null>(null)
const pokeBurstKey = ref(0)

const connectionStatus = props.realtime.status

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
} = useRoomStories(roomId, props.realtime, hasJoined)

const { votes, selectedCard, selectCard } = useRoomVotes(
    roomId,
    props.realtime,
    activeStory,
    isVoting,
    hasJoined,
)

const { players, pokeUsers, lastPokeId } = useRoomPresence(roomId, props.realtime)

const currentRoomCreatorId = computed(() => props.room?.adminUserId)

const allVotesCounted = computed(() => {
    if (!isVoting.value) return false

    const onlinePlayers = players.value.filter((player) => player.isOnline)
    return (
        onlinePlayers.length > 0 &&
        onlinePlayers.every((player) => votes.value[player.id] !== undefined)
    )
})

watch(lastPokeId, (value) => {
    if (!value) return
    pokeBurstKey.value += 1
})

function handlePokeUsers() {
    posthog?.capture('poke_team_clicked', { room_id: roomId.value })
    pokeUsers()
}

const transferCandidates = computed<TransferCandidate[]>(() =>
    players.value
        .filter((player) => player.id !== currentRoomCreatorId.value && !player.isAnonymous)
        .map((player) => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isOnline: player.isOnline,
            isAnonymous: player.isAnonymous,
        })),
)

// Modal handlers
function openEditModal(): void {
    isEditModalOpen.value = true
}

function onEditStory(story: Story) {
    selectedStory.value = story
    isStoryEditModalOpen.value = true
}

function onDeleteStory(story: Story) {
    selectedStory.value = story
    isStoryDeleteModalOpen.value = true
}

function onStoryEditSuccess(story: Story) {
    updateStoryLocally(story.id, story)
    selectedStory.value = story
    void refreshStories()
}

function onViewVotes(story: Story) {
    selectedStory.value = story
    isStoryVotesModalOpen.value = true
}

function onStoryDeleteSuccess() {
    if (selectedStory.value) removeStoryLocally(selectedStory.value.id)
    selectedStory.value = null
    isStoryDeleteModalOpen.value = false
    void refreshStories()
}

function onRoomEditSuccess() {
    emit('room-updated')
}

function copyRoomUrl(): void {
    const inviteUrl = new URL(`/rooms/${roomId.value}`, window.location.origin)

    copy(inviteUrl.toString())
    toast.add({
        title: 'Copied!',
        description: 'Room URL copied to clipboard.',
        color: 'success',
    })
}

watch(stories, (nextStories) => {
    const selected = selectedStory.value
    if (!selected) return

    const latestStory = nextStories.find((story) => story.id === selected.id)
    if (latestStory) {
        selectedStory.value = latestStory
        return
    }

    isStoryEditModalOpen.value = false
    isStoryDeleteModalOpen.value = false
    isStoryVotesModalOpen.value = false
    selectedStory.value = null
})
</script>

<template>
    <div class="room-page">
        <ClientOnly>
            <RoomBirdBurst :burst-key="pokeBurstKey" />
        </ClientOnly>

        <div class="room-shell">
            <main class="room-main">
                <header class="room-header">
                    <div>
                        <p class="room-kicker">PLANNING ROOM · {{ roomId.slice(0, 8) }}</p>
                        <h1>{{ room?.name }}</h1>
                        <p class="room-description">{{ room?.description || "Estimate together, then reveal as a team." }}</p>
                    </div>
                    <RoomControls
                        :can-edit="canEdit"
                        @invite-teammate="copyRoomUrl"
                        @edit-room="openEditModal"
                        @delete-room="isDeleteModalOpen = true"
                    >
                        <template v-if="canEdit && activeStory">
                            <UButton
                                v-if="pendingStoryActionType === 'startVote'"
                                size="sm"
                                color="primary"
                                variant="subtle"
                                icon="i-lucide-loader-circle"
                                loading
                                disabled
                            >
                                Starting Vote
                            </UButton>
                            <UButton
                                v-else-if="pendingStoryActionType === 'stopVote'"
                                size="sm"
                                color="error"
                                variant="subtle"
                                icon="i-lucide-loader-circle"
                                loading
                                disabled
                            >
                                Stopping Vote
                            </UButton>
                            <UButton
                                v-else-if="isVoting"
                                size="sm"
                                color="error"
                                variant="subtle"
                                icon="i-lucide-square"
                                :disabled="isStoryActionPending"
                                @click="stopVote"
                            >
                                Stop Vote
                            </UButton>
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
                            <UButton
                                v-else
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
                    </RoomControls>
                </header>

                <section class="vote-stage">
                    <div v-if="canEdit && allVotesCounted" class="vote-complete-badge" aria-live="polite">
                        <UBadge
                            label="All votes counted"
                            icon="i-lucide-circle-check"
                            color="success"
                            variant="subtle"
                            size="sm"
                        />
                    </div>

                    <div class="current-story">
                        <template v-if="activeStory">
                            <span>CURRENT STORY</span>
                            <h2>{{ activeStory.title }}</h2>
                            <div class="story-state" :class="{ live: isVoting }">
                                <i />
                                {{ isVoting ? "Voting open" : isVoted ? "Votes revealed" : "Ready to vote" }}
                                <RoomTimer v-if="isVoting" :story="activeStory" />
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
                        :cards="room?.cardValues ?? DEFAULT_CARD_VALUES"
                    />
                    <RoomPokerTable
                        v-else
                        :cards="room?.cardValues ?? DEFAULT_CARD_VALUES"
                        :model-value="selectedCard"
                        :is-voting="isVoting"
                        @update:model-value="selectCard"
                    />
                </section>

                <RoomStoriesPanel
                    :stories="stories"
                    :can-manage="canEdit"
                    @new-story="isNewStoryModalOpen = true"
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
                @poke-users="handlePokeUsers"
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
            :card-values="room?.cardValues ?? DEFAULT_CARD_VALUES"
            :votes="votes"
            @confirm="completeStory"
        />

        <!-- Story Votes Modal -->
        <RoomStoryVotesModal
            v-model="isStoryVotesModalOpen"
            :story="selectedStory"
            :card-values="room?.cardValues ?? DEFAULT_CARD_VALUES"
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
.room-description { margin-top: 0.3rem; color: #b4b4bd; font-size: 0.86rem; }

.vote-stage {
    position: relative;
    display: grid;
    flex: 1;
    align-content: center;
    justify-items: center;
    min-height: 32rem;
    padding: 3.25rem 1.5rem;
    background: radial-gradient(circle at 50% 42%, rgba(37, 99, 235, 0.075), transparent 42%);
}

.vote-complete-badge {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    animation: vote-complete-enter 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes vote-complete-enter {
    0% { opacity: 0; transform: translateY(-0.4rem) scale(0.96); }
    48% { opacity: 1; transform: translateY(0) scale(1); }
    64% { transform: translateX(-2px); }
    78% { transform: translateX(2px); }
    90% { transform: translateX(-1px); }
    100% { opacity: 1; transform: translateX(0); }
}

.current-story { margin-bottom: 2.6rem; text-align: center; }
.current-story > span { color: #a8a8b2; }
.current-story h2 { max-width: 48rem; margin-top: 0.7rem; color: #fafafa; font-size: clamp(1.2rem, 2vw, 1.55rem); font-weight: 500; }
.story-state { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.85rem; color: #b4b4bd; letter-spacing: 0.08em; }
.story-state.live { color: #7ab8ff; }
.story-state > i { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.story-state :deep(.room-timer) { margin-left: 0.35rem; }
.empty-story-copy { margin-top: 0.6rem; color: #a8a8b2; font-size: 0.82rem; }

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
    .vote-complete-badge { top: 0.75rem; right: 0.75rem; }
}

@media (prefers-reduced-motion: reduce) {
    .vote-complete-badge { animation: none; }
}
</style>
