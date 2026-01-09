<script lang="ts" setup>
import type { Database } from "~/types/database.types";

const route = useRoute();

const roomId = route.params.id as string;
const client = useSupabaseClient<Database>();
const user = useSupabaseUser();
const toast = useToast();

const players = ref<any[]>([]);
const votes = ref<Record<string, string>>({}); // userId -> voteValue

const selectedCard = ref<string | null>(null);
const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isNewStoryModalOpen = ref(false);
const isStoryEditModalOpen = ref(false);
const isStoryDeleteModalOpen = ref(false);
const selectedStory = ref<any>(null);

// Channel refs for proper lifecycle management
const presenceChannel = ref<any>(null);
const storiesChannel = ref<any>(null);
const votesChannel = ref<any>(null);

const { data: stories, refresh: refreshStories } = await useAsyncData(
    `room-stories-${roomId}`,
    async () => {
        const { data } = await client
            .from("stories")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true });
        return data || [];
    },
);

// Combined data fetching: Participate first, then fetch room
// We wrap this in useAsyncData to handle the async state and errors gracefully.
const {
    data: room,
    status: roomStatus,
    error: roomError,
    refresh,
} = await useAsyncData(
    `room-${roomId}`,
    async () => {
        // 1. Ensure user is logged in
        if (!user.value) throw new Error("User not authenticated");

        // 2. Add to participants table BEFORE fetching room
        // This is required because RLS policies now restrict "select" on rooms
        // to only creators or existing participants.
        const { error: joinError } = await client
            .from("room_participants")
            .upsert(
                {
                    room_id: roomId,
                    user_id: user.value.sub,
                    joined_at: new Date().toISOString(),
                },
                { onConflict: "room_id,user_id" },
            );

        if (joinError) {
            console.error("Failed to join room:", joinError);
            // We might continue if it's just a duplicate, but upsert handles that.
            // If it's a real error, we might fail early or try to fetch anyway.
        }

        // 3. Fetch Room Data
        const { data, error: fetchError } = await client
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();

        if (fetchError) throw fetchError;
        return data;
    },
    {
        watch: [user],
    },
);

const canEdit = computed(() => {
    return !!(
        user.value &&
        room.value &&
        room.value.created_by === user.value.sub
    );
});

const activeStory = computed(() => {
    return stories.value?.find((s: any) =>
        ["active", "voting", "voted"].includes(s.status),
    );
});

const isVoting = computed(() => activeStory.value?.status === "voting");
const isVoted = computed(() => activeStory.value?.status === "voted");

async function fetchVotes() {
    if (!activeStory.value) return;
    const { data } = await client
        .from("story_votes")
        .select("user_id, vote_value")
        .eq("story_id", activeStory.value.id);

    if (data) {
        const newVotes: Record<string, string> = {};
        data.forEach((v: any) => {
            newVotes[v.user_id] = v.vote_value;
        });
        votes.value = newVotes;
    }
}

// Watch active story ID to re-fetch votes when story changes
watch(
    () => activeStory.value?.id,
    () => {
        votes.value = {};
        selectedCard.value = null;
        fetchVotes();
    },
);

// Realtime channels are set up in onMounted for proper lifecycle management
const onlineUsers = ref<Set<string>>(new Set());

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

// onlineUsers is declared above with channels

async function fetchParticipants() {
    const { data: participants } = await client
        .from("room_participants")
        .select("user_id")
        .eq("room_id", roomId);

    if (participants && participants.length > 0) {
        const userIds = participants.map((p: any) => p.user_id);

        const { data: profiles } = await client
            .from("profile")
            .select("user_id, name, avatar")
            .in("user_id", userIds);

        const profileMap = new Map();
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.user_id, p));
        }

        players.value = userIds.map((uid: string) => {
            const profile = profileMap.get(uid);
            return {
                id: uid,
                name: profile?.name || "Anonymous",
                avatar:
                    profile?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                status: onlineUsers.value.has(uid) ? "waiting" : "offline",
                time: "00:00:00", // This seems to be unused or mock? Let's leave it.
                vote: votes.value[uid] ?? null, // Get vote from votes map
                hasVoted: votes.value[uid] !== undefined,
                isModerator: room.value && uid === room.value.created_by,
                isOnline: onlineUsers.value.has(uid),
            };
        });
    } else {
        players.value = [];
    }
}

onMounted(async () => {
    console.log(`[Realtime] Setting up channels for room: ${roomId}`);

    // 1. Setup Presence Channel
    presenceChannel.value = client.channel(`room:${roomId}`, {
        config: {
            presence: {
                key: user.value?.sub,
            },
        },
    });

    presenceChannel.value
        .on("presence", { event: "sync" }, () => {
            const newState = presenceChannel.value!.presenceState();
            const onlineIds = Object.keys(newState);
            onlineUsers.value = new Set(onlineIds);
            console.log(`[Realtime] Presence sync - online users:`, onlineIds);
            // Update players online status directly without full fetch
            if (players.value) {
                players.value.forEach((p) => {
                    p.isOnline = onlineUsers.value.has(p.id);
                    p.status = p.isOnline ? "waiting" : "offline";
                });
            }
            // Keep the fetchParticipants for now to ensure we capture new joins
            fetchParticipants();
        })
        .on("broadcast", { event: "poke" }, (payload: any) => {
            console.log(`[Realtime] Poke received from:`, payload.payload?.from);
            // Only play if poke came from someone else (we already played locally)
            if (payload.payload?.from !== user.value?.sub) {
                playPokeSound();
            }
        })
        .subscribe(async (status: string) => {
            console.log(`[Realtime] Presence Channel Status: ${status}`);
            if (status === "SUBSCRIBED") {
                await presenceChannel.value!.track({
                    user_id: user.value?.sub,
                    online_at: new Date().toISOString(),
                });
            }
        });

    // Initial fetch
    await fetchParticipants();

    // 2. Setup Stories Realtime Channel
    storiesChannel.value = client.channel(`room-stories:${roomId}`);
    storiesChannel.value
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "stories",
                filter: `room_id=eq.${roomId}`,
            },
            (payload: any) => {
                console.log(
                    `[Realtime] Stories Event: ${payload.eventType}`,
                    { storyId: payload.new?.id || payload.old?.id, status: payload.new?.status },
                );

                // Update stories based on payload
                if (payload.eventType === "INSERT") {
                    if (stories.value) {
                        // Create new array to trigger Vue reactivity
                        const newStories = [...stories.value, payload.new].sort(
                            (a: any, b: any) =>
                                new Date(a.created_at).getTime() -
                                new Date(b.created_at).getTime(),
                        );
                        stories.value = newStories;
                    }
                } else if (payload.eventType === "UPDATE") {
                    if (stories.value) {
                        const existingStory = stories.value.find(
                            (s: any) => s.id === payload.new.id,
                        );
                        
                        if (existingStory) {
                            const oldStatus = existingStory.status;
                            const newStatus = payload.new.status;

                            console.log(`[Realtime] Story status: ${oldStatus} -> ${newStatus}`);

                            // Replace array to trigger Vue reactivity
                            stories.value = stories.value.map((s: any) =>
                                s.id === payload.new.id ? { ...payload.new } : s
                            );

                            // If status changed to voting (Start or Restart Vote), clear votes locally
                            if (
                                newStatus === "voting" &&
                                oldStatus !== "voting"
                            ) {
                                console.log(
                                    "[Realtime] Status changed to voting, clearing local votes",
                                );
                                votes.value = {};
                                if (players.value) {
                                    players.value.forEach((p) => {
                                        p.vote = null;
                                        p.hasVoted = false;
                                    });
                                }
                                selectedCard.value = null;
                            }

                            // If status changed to voted (reveal), refetch votes to ensure we have latest
                            if (newStatus === "voted" && oldStatus !== "voted") {
                                console.log("[Realtime] Status changed to voted, refetching votes for reveal");
                                fetchVotes();
                            }

                            // If status changed to completed, clear votes and selected card
                            if (newStatus === "completed" && oldStatus !== "completed") {
                                console.log("[Realtime] Story completed, clearing votes");
                                votes.value = {};
                                if (players.value) {
                                    players.value.forEach((p) => {
                                        p.vote = null;
                                        p.hasVoted = false;
                                    });
                                }
                                selectedCard.value = null;
                            }
                        }
                    }
                } else if (payload.eventType === "DELETE") {
                    if (stories.value) {
                        stories.value = stories.value.filter(
                            (s: any) => s.id !== payload.old.id,
                        );
                    }
                }
            },
        )
        .subscribe((status: string) => {
            console.log(`[Realtime] Stories Channel Status: ${status}`);
        });

    // 3. Setup Votes Realtime Channel
    votesChannel.value = client.channel(`room-votes:${roomId}`);
    votesChannel.value
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "story_votes",
                filter: `room_id=eq.${roomId}`,
            },
            (payload: any) => {
                console.log(
                    `[Realtime] Votes Event: ${payload.eventType}`,
                    { 
                        storyId: payload.new?.story_id || payload.old?.story_id,
                        userId: payload.new?.user_id || payload.old?.user_id,
                        hasValue: !!payload.new?.vote_value
                    },
                );

                // If it's an INSERT/UPDATE
                if (
                    payload.eventType === "INSERT" ||
                    payload.eventType === "UPDATE"
                ) {
                    const { user_id, vote_value, story_id } = payload.new;

                    // Check if this vote is for the active story
                    if (activeStory.value?.id === story_id) {
                        votes.value[user_id] = vote_value;
                        console.log(`[Realtime] Updated vote for user ${user_id}: hasVoted=true`);

                        // Update player in list
                        if (players.value) {
                            const player = players.value.find(
                                (p) => p.id === user_id,
                            );
                            if (player) {
                                player.vote = vote_value;
                                player.hasVoted = true;
                            }
                        }
                    } else {
                        console.warn(
                            `[Realtime] Received vote for non-active story: ${story_id}, Active: ${activeStory.value?.id}`,
                        );
                    }
                } else if (payload.eventType === "DELETE") {
                    // Handle vote deletion (e.g., when votes are cleared on restart)
                    const deleted = payload.old;
                    console.log(`[Realtime] Vote deleted for user ${deleted?.user_id}`);
                    if (deleted?.user_id && votes.value[deleted.user_id]) {
                        delete votes.value[deleted.user_id];
                        // Update player in list
                        if (players.value) {
                            const player = players.value.find((p) => p.id === deleted.user_id);
                            if (player) {
                                player.vote = null;
                                player.hasVoted = false;
                            }
                        }
                    }
                }
            },
        )
        .subscribe((status: string) => {
            console.log(`[Realtime] Votes Channel Status: ${status}`);
        });

    // Fetch initial votes
    fetchVotes();
});

// Play poke sound
function playPokeSound() {
    const audio = new Audio('/cawcaw.mp3');
    audio.play().catch((err) => {
        console.warn('[Poke] Could not play sound:', err);
    });
}

// Broadcast poke to all users
function pokeUsers() {
    if (!presenceChannel.value) return;
    presenceChannel.value.send({
        type: 'broadcast',
        event: 'poke',
        payload: { from: user.value?.sub },
    });
    // Also play locally for immediate feedback
    playPokeSound();
}

onUnmounted(() => {
    console.log(`[Realtime] Cleaning up channels for room: ${roomId}`);
    if (presenceChannel.value) {
        client.removeChannel(presenceChannel.value);
        presenceChannel.value = null;
    }
    if (storiesChannel.value) {
        client.removeChannel(storiesChannel.value);
        storiesChannel.value = null;
    }
    if (votesChannel.value) {
        client.removeChannel(votesChannel.value);
        votesChannel.value = null;
    }
});

function openEditModal(): void {
    isEditModalOpen.value = true;
}

async function selectCard(cardValue: string) {
    if (!isVoting.value || !activeStory.value || !user.value) return;

    // Optimistic update
    selectedCard.value = cardValue;

    const { error } = await client.from("story_votes").upsert(
        {
            room_id: roomId,
            story_id: activeStory.value.id,
            user_id: user.value.sub,
            vote_value: cardValue,
        },
        { onConflict: "story_id,user_id" },
    );

    if (error) {
        console.error("Error voting:", error);
        toast.add({
            title: "Vote failed",
            description: error.message,
            color: "error",
        });
    }
}

async function onSetActive(story: any) {
    if (!room.value || !story) return;

    // Batch update: set all active/voting/voted stories in this room to pending
    await client
        .from("stories")
        .update({ status: "pending" })
        .eq("room_id", roomId)
        .in("status", ["active", "voting", "voted"]);

    // Set target story to active
    const { error } = await client
        .from("stories")
        .update({ status: "active" })
        .eq("id", story.id);

    if (error) {
        toast.add({
            title: "Error",
            description: error.message,
            color: "error",
        });
    } else {
        toast.add({ title: "Active Story Updated", color: "success" });
    }
}

async function onStartVote() {
    if (!activeStory.value || !room.value) return;

    const storyId = activeStory.value.id;
    const newUpdatedAt = new Date().toISOString();

    // Clear existing votes for this story first
    await client.from("story_votes").delete().eq("story_id", storyId);

    const { error } = await client
        .from("stories")
        .update({
            status: "voting",
            updated_at: newUpdatedAt,
        })
        .eq("id", storyId);

    if (error) {
        toast.add({
            title: "Error starting vote",
            description: error.message,
            color: "error",
        });
    } else {
        // Optimistic update: Replace array element to trigger Vue reactivity
        if (stories.value) {
            stories.value = stories.value.map((s: any) =>
                s.id === storyId ? { ...s, status: "voting", updated_at: newUpdatedAt } : s
            );
        }
        // Clear local votes state
        votes.value = {};
        selectedCard.value = null;
        if (players.value) {
            players.value.forEach((p) => {
                p.vote = null;
                p.hasVoted = false;
            });
        }
    }
}

async function onStopVote() {
    if (!activeStory.value) return;
    const storyId = activeStory.value.id;

    const { error } = await client
        .from("stories")
        .update({ status: "voted" })
        .eq("id", storyId);

    if (error) {
        toast.add({
            title: "Error stopping vote",
            description: error.message,
            color: "error",
        });
    } else {
        // Optimistic update: Replace array element to trigger Vue reactivity
        if (stories.value) {
            stories.value = stories.value.map((s: any) =>
                s.id === storyId ? { ...s, status: "voted" } : s
            );
        }
    }
}

async function onCompleteStory() {
    if (!activeStory.value) return;
    const storyId = activeStory.value.id;

    const { error } = await client
        .from("stories")
        .update({ status: "completed" })
        .eq("id", storyId);

    if (error) {
        toast.add({
            title: "Error completing story",
            description: error.message,
            color: "error",
        });
    } else {
        // Optimistic update: Replace array element to trigger Vue reactivity
        if (stories.value) {
            stories.value = stories.value.map((s: any) =>
                s.id === storyId ? { ...s, status: "completed" } : s
            );
        }
        // Clear votes and selected card for the creator
        votes.value = {};
        if (players.value) {
            players.value.forEach((p) => {
                p.vote = null;
                p.hasVoted = false;
            });
        }
        selectedCard.value = null;
    }
}

function onEditStory(story: any) {
    selectedStory.value = story;
    isStoryEditModalOpen.value = true;
}

function onDeleteStory(story: any) {
    selectedStory.value = story;
    isStoryDeleteModalOpen.value = true;
}
</script>

<template>
    <div
        v-if="roomStatus === 'pending'"
        class="flex justify-center items-center h-screen"
    >
        <UProgress animation="carousel" />
    </div>

    <div
        v-else-if="roomError || !room"
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
                                        @click="onStopVote"
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
                                        @click="onStartVote"
                                    >
                                        Restart Vote
                                    </UButton>
                                    <UButton
                                        size="sm"
                                        color="success"
                                        variant="subtle"
                                        icon="i-lucide-check-circle"
                                        @click="onCompleteStory"
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
                                        @click="onStartVote"
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
                    :stories="stories || []"
                    :can-manage="canEdit"
                    @set-active="onSetActive"
                    @edit="onEditStory"
                    @delete="onDeleteStory"
                />
            </div>

            <!-- Sidebar Grid -->
            <RoomSidebar
                :players="players"
                :active-story="activeStory"
                :is-voted="isVoted"
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
        />
        <RoomStoryDeleteModal
            v-model="isStoryDeleteModalOpen"
            :story="selectedStory"
        />
    </div>
</template>
