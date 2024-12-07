<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const q = ref('')
const isOpen = ref(false)

const { data: rooms, refresh } = await useAsyncData('rooms', async () => {
  const { data } = await supabase.from('rooms').select('uuid, name, last_story, current_story, modified_at').eq('admin_id', user.value.id)


  return data
})

const filteredRooms = computed(() => {
  if (!q.value) {
    return rooms.value
  }

  return rooms.value.filter((room) => {
    //ts-ignore
    if (room.name.toLowerCase().includes(q.value.toLowerCase())) {
      return room
    }
  })
})

</script>

<template>
  <UContainer class="space-y-8">
    <div class="space-y-4">
      <div class="flex flex-row gap-1 items-center">
        <UIcon name="i-heroicons-users" class="w-8 h-8" />
        <h1 class="font-bold text-xl">Rooms</h1>
      </div>
      <div class="flex flex-row justify-between items-center">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass-20-solid" size="xl" color="white" :trailing="false"
          placeholder="Search..." class="max-w-2xl w-[400px]" />
        <UButton color="primary" size="lg" :ui="{ rounded: 'rounded-full' }" @click="isOpen = true">Create Room
        </UButton>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard v-for="room in filteredRooms" :key="room.id" :ui="{ shadow: '' }"
        class="cursor-pointer transition-all hover:ring-primary-700" @click="$router.push(room.url)">
        <template #header>
          <h2 class="font-semibold text-ellipsis overflow-hidden text-nowrap">{{ room.name }}</h2>
        </template>
        <pre>{{ room.last_story }}</pre>
        <template #footer>
          <div class="text-gray-600 text-sm">Last used: {{ useDateFormat(room.modified_at, 'MMM Do, YYYY') }}</div>
        </template>
      </UCard>
    </div>
  </UContainer>
  <UModal v-model="isOpen">
    <RoomCreateForm @close="isOpen = false; refresh()" />
  </UModal>
</template>