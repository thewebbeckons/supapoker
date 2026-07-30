<script lang="ts" setup>
import type { Room } from "~/types/room";

const route = useRoute();

const roomId = computed(() => String(route.params.id));
const { user, refresh: refreshCurrentUser } = useCurrentUser();
const toast = useToast();
const posthog = usePostHog();

const isJoinModalOpen = ref(false);
const isJoiningRoom = ref(false);
const joinDisplayName = ref("");

const {
    data: inviteRoom,
    status: inviteStatus,
    error: inviteError,
} = await useAsyncData(
    `room-invite-${roomId.value}`,
    () => $fetch<{ id: string; name: string; description: string | null }>(`/api/rooms/${roomId.value}/invite`),
    { watch: [roomId] },
);

const {
    data: roomAccess,
    status: roomStatus,
    error: roomError,
    refresh: refreshAccess,
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
    if (inviteError.value) return true;
    if (!user.value || roomStatus.value === "idle" || roomStatus.value === "pending") return false;

    return Boolean(roomError.value) || !roomAccess.value || !initialRoom.value;
});
const hasJoinedRoom = computed(() => Boolean(initialRoom.value && roomAccess.value?.isParticipant));

watch(
    [inviteStatus, roomStatus, roomAccess, hasRoomLoadFailed, user],
    ([publicStatus, accessStatus, access, loadFailed, currentUser]) => {
        if (publicStatus === "idle" || publicStatus === "pending") return;
        if (currentUser && (accessStatus === "idle" || accessStatus === "pending")) return;

        if (loadFailed || (currentUser && !access)) {
            isJoinModalOpen.value = false;
            return;
        }

        isJoinModalOpen.value = !access?.isParticipant;
        if (currentUser?.isAnonymous && currentUser.name !== "Guest" && !joinDisplayName.value) {
            joinDisplayName.value = currentUser.name;
        }
    },
    { immediate: true },
);

async function joinRoom() {
    if (!canJoinRoom.value) return;

    isJoiningRoom.value = true;

    try {
        if (!user.value) {
            const result = await authClient.signIn.anonymous();
            if (result.error) throw new Error(result.error.message || "Unable to start a guest session.");
            await refreshCurrentUser();
        }

        await $fetch(`/api/rooms/${roomId.value}/join`, {
            method: "POST",
            body: user.value?.isAnonymous ? { name: joinDisplayName.value } : {},
        });
        await Promise.all([refreshCurrentUser(), refreshAccess()]);
        posthog?.capture("room_joined", { room_id: roomId.value, is_guest: Boolean(user.value?.isAnonymous) });
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
    if (inviteRoom.value?.name) return inviteRoom.value.name;
    if (room.value?.name) return room.value.name;
    return "Join this room";
});

const joinModalDescription = computed(() => {
    if (inviteRoom.value?.description) return inviteRoom.value.description;
    if (room.value?.description) return room.value.description;
    return "You've been invited to collaborate in this planning poker room.";
});

const isRoomLoading = computed(() => {
    if (inviteStatus.value === "idle" || inviteStatus.value === "pending") return true;
    return Boolean(user.value && (roomStatus.value === "idle" || roomStatus.value === "pending"));
});

const canJoinRoom = computed(() => {
    if (isJoiningRoom.value) return false;
    if (!user.value || user.value.isAnonymous) return joinDisplayName.value.trim().length >= 2;
    return true;
});

const notNowPath = computed(() => user.value && !user.value.isAnonymous ? "/rooms" : "/");
const authRedirect = computed(() => route.fullPath);

const showRoomError = computed(() => {
    return hasRoomLoadFailed.value;
});

const realtime = useRoomRealtime(roomId, hasJoinedRoom);
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

async function onRoomUpdated() {
    await Promise.all([refreshAccess(), realtime.refresh()]);
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
            :to="notNowPath"
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

                    <UFormField
                        v-if="!user || user.isAnonymous"
                        label="Your name"
                        required
                    >
                        <UInput
                            v-model="joinDisplayName"
                            autofocus
                            maxlength="80"
                            placeholder="How teammates will see you"
                            icon="i-lucide-user"
                            class="w-full"
                            @keyup.enter="joinRoom"
                        />
                    </UFormField>

                    <p v-if="!user || user.isAnonymous" class="text-xs text-neutral-500">
                        Prefer a permanent profile?
                        <NuxtLink :to="{ path: '/login', query: { redirectTo: authRedirect } }" class="text-neutral-300 hover:text-white">Log in</NuxtLink>
                        or
                        <NuxtLink :to="{ path: '/signup', query: { redirectTo: authRedirect } }" class="text-neutral-300 hover:text-white">sign up</NuxtLink>.
                    </p>

                    <div class="flex justify-end gap-2">
                        <UButton
                            :to="notNowPath"
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

    <RoomRealtimeBoard
        v-else
        :room-id="roomId"
        :room="room ?? null"
        :realtime="realtime"
        :can-edit="canEdit"
        :has-joined="hasJoinedRoom"
        @room-updated="onRoomUpdated"
    />
</template>
