<script setup lang="ts">
const columns = [{
  key: 'id',
  label: 'ID'
}, {
  key: 'name',
  label: 'Name'
}, {
  key: 'title',
  label: 'Title'
}, {
  key: 'last_story',
  label: 'Last Story'
}, {
  key: 'last_used',
  label: 'Last Used'
}]

const rooms = [
  {
    id: 1,
    name: 'Jane Cooper',
    title: 'Regional Paradigm Technician',
    last_story: '10/21/2020',
    last_used: '10/21/2020'
  },
  {
    id: 2,
    name: 'Jane Cooper',
    title: 'Regional Paradigm Technician',
    last_story: '10/21/2020',
    last_used: '10/21/2020'
  },
  {
    id: 3,
    name: 'Jane Cooper',
    title: 'Regional Paradigm Technician',
    last_story: '10/21/2020',
    last_used: '10/21/2020'
  },
  {
    id: 4,
    name: 'Jane Cooper',
    title: 'Regional Paradigm Technician',
    last_story: '10/21/2020',
    last_used: '10/21/2020'
  }
]

const q = ref('')

const filteredRows = computed(() => {
  if (!q.value) {
    return rooms
  }

  return rooms.filter((room) => {
    return Object.values(room).some((value) => {
      return String(value).toLowerCase().includes(q.value.toLowerCase())
    })
  })
})
</script>

<template>
  <div>
    <h1 class="font-bold text-xl mb-3">Rooms</h1>
    <div class="flex flex-row justify-between px-3 py-3.5 border-b border-gray-200 dark:border-gray-700">
      <UInput v-model="q" placeholder="Filter people..." />
      <UButton color="blue">Create Room</UButton>
    </div>
    <UTable :rows="filteredRows" :columns="columns" />
  </div>
</template>