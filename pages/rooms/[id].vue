<script lang="ts" setup>
const route = useRoute()
const room = ref({
  id: '1u1717aha7171',
  name: 'Roomy',
  admin_id: '1'
})

const players = ref([
  { id: 1, name: 'Player 1', isAdmin: false },
  { id: 2, name: 'Player 2', isAdmin: false },
  { id: 3, name: 'Player 3', isAdmin: false },
  { id: 4, name: 'Player 4', isAdmin: false },
])

const voting = ref(false)
const elapsedTime = ref('00:00:00')
const cardOptions = ref(['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕️'])

</script>

<template>
  <UContainer class="space-y-8">
    <div class="flex flex-row gap-3 justify-between items-center">
      <h1 class="font-bold text-xl">{{ room.name }}</h1>
    </div>
    <div class="flex flex-row gap-6 sm:gap-12 justify-between">
      <main class="space-y-6">
        <!-- grid of playing cards-->
        <div class="grid grid-cols-4 gap-6 justify-between align-center">
          <UCard v-for="card in cardOptions" :key="card" :ui="{ body: { padding: 'p-8 sm:p-12' } }"
            class="grid place-content-center text-2xl cursor-pointer">
            <!-- <UButton class="flex flex-col items-center" @click="selectCard(card)" :disabled="!voting"
              :class="{ 'bg-green-500': card === selectedCard }">
              <span>{{ card }}</span>
            </UButton> -->
            {{ card }}
          </UCard>
        </div>
        <div>
          <UCard>
            <template #header>
              <h3 class="text-xl font-semibold">Game Controls</h3>
            </template>
            <div class="flex flex-row justify-between gap-3">
              <UButton>Start Game</UButton>
              <UButton>Next Story</UButton>
              <UButton>Add Story</UButton>
            </div>
          </UCard>
        </div>
        <GameStoryHistoryTabs />
      </main>
      <aside>
        <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
          <template #header>
            <div class="grid grid-cols-2 items-center justify-between">
              <h3 class="text-xl font-semibold">Participants</h3>
              <p class="text-xl text-right text-gray-500">{{ elapsedTime }}</p>
            </div>
          </template>
          <ul class="divide-y divide-gray-200">
            <li v-for="i in 10" :key="i" class="grid grid-cols-2 gap-2 px-4 py-6">
              <div class="flex flex-row gap-2 items-center justify-start">
                <UChip position="top-left" inset>
                  <UAvatar icon="i-heroicons-photo" :alt="'Player' + i" />
                </UChip>
                <span>Player {{ i }}</span>
              </div>
              <div class="flex flex-row items-center justify-end">
                <span class="px-3 py-2 bg-blue-100 rounded">8</span>
              </div>
            </li>
          </ul>
        </UCard>
      </aside>
    </div>
  </UContainer>
</template>