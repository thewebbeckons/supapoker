<script lang="ts" setup>
interface RoomListItem {
  id: string;
  name: string;
  description: string | null;
  role: "creator" | "participant";
  lastUsed: string;
}

definePageMeta({
  middleware: ["registered-auth"],
});

const { user } = useCurrentUser();
const toast = useToast();
const search = ref("");
const isCreateRoomModalOpen = ref(false);
const isCreatingRoom = ref(false);
const newRoomName = ref("");
const newRoomDescription = ref("");

const viewMode = useCookie<"card" | "list">("rooms-view-mode", {
  default: () => "card",
});

const {
  data: rooms,
  refresh,
  status,
} = await useAsyncData(
  "rooms",
  async () => {
    if (!user.value) return [];
    return $fetch<RoomListItem[]>("/api/rooms");
  },
  {
    watch: [user],
    default: () => [],
  },
);

const filteredRooms = computed(() => {
  if (!rooms.value) return [];
  if (!search.value) return rooms.value;
  return rooms.value.filter(room =>
    room.name.toLowerCase().includes(search.value.toLowerCase()),
  );
});

function openCreateRoomModal() {
  newRoomName.value = "";
  newRoomDescription.value = "";
  isCreateRoomModalOpen.value = true;
}

async function createRoom() {
  if (isCreatingRoom.value || !newRoomName.value.trim() || !user.value) return;

  isCreatingRoom.value = true;
  try {
    const room = await $fetch<{ id: string }>("/api/rooms", {
      method: "POST",
      body: {
        name: newRoomName.value,
        description: newRoomDescription.value,
      },
    });

    toast.add({
      title: "Room Created",
      description: `Room "${newRoomName.value}" has been created!`,
      color: "success",
    });

    await refresh();
    isCreateRoomModalOpen.value = false;
    await navigateTo(`/rooms/${room.id}`);
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message ?? "Failed to create room",
      color: "error",
    });
  } finally {
    isCreatingRoom.value = false;
  }
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
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search rooms..." class="w-full max-w-xs" />
        <UButton label="Create Room" icon="i-lucide-plus" color="primary" @click="openCreateRoomModal" />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-layout-grid"
          :color="viewMode === 'card' ? 'primary' : 'neutral'"
          :variant="viewMode === 'card' ? 'solid' : 'ghost'"
          @click="viewMode = 'card'"
        />
        <UButton
          icon="i-lucide-list"
          :color="viewMode === 'list' ? 'primary' : 'neutral'"
          :variant="viewMode === 'list' ? 'solid' : 'ghost'"
          @click="viewMode = 'list'"
        />
      </div>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UProgress animation="carousel" />
    </div>

    <div v-else-if="filteredRooms.length === 0" class="text-center py-12 text-neutral-500">
      No rooms found.
    </div>

    <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="room in filteredRooms" :key="room.id" class="hover:border-primary-500 transition-colors">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-semibold text-lg">{{ room.name }}</h2>
              <p class="text-sm text-neutral-500">{{ room.description || 'No description' }}</p>
            </div>
            <UBadge :color="room.role === 'creator' ? 'primary' : 'neutral'" variant="subtle">
              {{ room.role === 'creator' ? 'Admin' : 'Joined' }}
            </UBadge>
          </div>
        </template>

        <div class="flex items-center justify-between">
          <LastUsedTime :time="room.lastUsed" />
          <UButton :to="`/rooms/${room.id}`" label="Open" icon="i-lucide-arrow-right" trailing />
        </div>
      </UCard>
    </div>

    <div v-else class="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      <NuxtLink
        v-for="room in filteredRooms"
        :key="room.id"
        :to="`/rooms/${room.id}`"
        class="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <div>
          <p class="font-medium">{{ room.name }}</p>
          <p class="text-sm text-neutral-500">{{ room.description || 'No description' }}</p>
        </div>
        <div class="flex items-center gap-3">
          <LastUsedTime :time="room.lastUsed" />
          <UIcon name="i-lucide-arrow-right" />
        </div>
      </NuxtLink>
    </div>

    <UModal v-model:open="isCreateRoomModalOpen" title="Create Room" description="Create a planning poker room." :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Room Name" required>
            <UInput v-model="newRoomName" placeholder="e.g. Sprint Planning" @keydown.enter="createRoom" autofocus />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="newRoomDescription" placeholder="Optional description..." :rows="3" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="isCreateRoomModalOpen = false" />
            <UButton label="Create" color="primary" :loading="isCreatingRoom" :disabled="isCreatingRoom || !newRoomName.trim()" @click="createRoom" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
