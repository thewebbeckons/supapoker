<script setup>

const q = ref('')

const rooms = ref([
  {
    id: 1,
    name: "Conference Room A",
    last_story: 'PD-1001',
    last_used: 'Jan 10, 2023',
    url: '/rooms/qjuadhasdhwhq'
  },
  {
    id: 2,
    name: "Meeting Room B",
    last_story: 'PD-1002',
    last_used: 'Feb 15, 2023',
    url: '/rooms/qjuadhasdhwhq'
  },
  {
    id: 3,
    name: "Training Room C",
    last_story: 'PD-1003',
    last_used: 'Mar 20, 2023',
    url: '/rooms/qjuadhasdhwhq'
  },
  {
    id: 4,
    name: "Board Room D",
    last_story: 'PD-1004',
    last_used: 'Apr 25, 2023',
    url: '/rooms/qjuadhasdhwhq'
  },
  {
    id: 5,
    name: "Lounge Room E Oh super long baby arms with lots of things",
    last_story: 'PD-1005',
    last_used: 'May 30, 2023',
    url: '/rooms/qjuadhasdhwhq'
  }
])

const filteredRooms = computed(() => {
  if (!q.value) {
    return rooms.value
  }

  return rooms.value.filter((room) => {
    if (room.name.toLowerCase().includes(q.value.toLowerCase())) {
      return room
    }
  })
})

const ui = {
  color: {
    white: {
      outline: 'shadow-lg rounded-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white ring-2 ring-inset ring-gray-600 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400'
    }
  }
}

</script>

<template>
  <UContainer class="space-y-8">
    <div class="space-y-4">
      <div class="flex flex-row gap-1 items-center">
        <UIcon name="i-heroicons-users" class="w-8 h-8" />
        <h1 class="font-bold text-xl">Rooms</h1>
      </div>
      <UInput v-model="q" icon="i-heroicons-magnifying-glass-20-solid" size="xl" color="white" :trailing="false"
        placeholder="Search..." class="max-w-2xl" :ui="ui" />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="rounded-md border-dashed border-2 border-primary-600 bg-blue-50 grid place-items-center">
        <UButton color="primary" :ui="{ rounded: 'rounded-full' }">Create Room</UButton>
      </div>
      <UCard v-for="room in filteredRooms" :key="room.id" :ui="{ shadow: '' }"
        class="cursor-pointer transition-all hover:translate-x-1 hover:-translate-y-1" @click="$router.push(room.url)">
        <template #header>
          <h2 class="font-semibold text-ellipsis overflow-hidden text-nowrap">{{ room.name }}</h2>
        </template>
        <pre>{{ room.last_story }}</pre>
        <template #footer>
          <div class="text-gray-600 text-sm">Last used: {{ room.last_used }}</div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>