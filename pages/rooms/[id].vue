<script lang="ts" setup>
const route = useRoute()
const roomId = route.params.id as string

const players = ref([
  { id: 1, name: 'Player 1', isAdmin: false },
  { id: 2, name: 'Player 2', isAdmin: false },
  { id: 3, name: 'Player 3', isAdmin: false },
  { id: 4, name: 'Player 4', isAdmin: false },
])

const currentStory = ref('')
const currentPlayerId = ref('') // Assume this is set when the player joins the room
const voting = ref(false)
const elapsedTime = ref(0)
const allPlayersVoted = ref(false)
let timerInterval: number | null = null
const cardOptions = ref(['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕️'])
const votes = ref([])
const hasVoted = ref(false)
const showResults = ref(false)
const selectedCard = ref(null)

const startGame = () => {
  voting.value = true
  hasVoted.value = false
  showResults.value = false
  startTimer()
}

const startTimer = () => {
  elapsedTime.value = 0
  timerInterval = setInterval(() => {
    if (!allPlayersVoted.value) {
      elapsedTime.value++
    } else {
      stopTimer()
    }
  }, 1000)
}

const selectCard = async (cardValue: string) => {
  alert(cardValue)
  // try {
  //   const { data, error } = await supabase
  //     .from('votes')
  //     .upsert({
  //       room_id: roomId,
  //       story_id: currentStory.value,
  //       player_id: currentPlayerId.value,
  //       vote_value: cardValue
  //     }, {
  //       onConflict: 'room_id,story_id,player_id'
  //     })

  //   if (error) throw error
  //   selectedCard.value = cardValue
  //   console.log('Vote recorded successfully:', data)
  // } catch (error) {
  //   console.error('Error recording vote:', error)
  // }
}

const stopTimer = () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

watch(allPlayersVoted, (newValue) => {
  if (newValue) {
    stopTimer()
  }
})

// Remember to call stopTimer when component is unmounted
onUnmounted(() => {
  stopTimer()
})
// TODO: get room data from API
/* 
- create a planning poker game room; where players can join and vote on stories.
- room leader can start the game, which will show the title of the story to vote on and a list of card options.
- timer will start when voting begins, and players can vote by clicking on the card they want to vote on.
- when voting is complete, the room leader can see the results of the voting.
- room leader can end the game, which will show the results of the voting.
- room leader can then start a new voting session.
*/
</script>

<template>
  <UContainer class="space-y-8">
    <div class="flex flex-row gap-3 justify-between items-center">
      <h1 class="font-bold text-xl">Room: {{ $route.params.id }}</h1>
      <UButton @click="startGame" label="Start Game" />
    </div>
    <div class="flex flex-row gap-6 sm:gap-12 justify-between">
      <main>
        <!-- grid of playing cards-->
        <div class="grid grid-cols-4 gap-6 justify-between align-center">
          <UCard v-for="card in cardOptions" :key="card" :ui="{ body: { padding: 'p-8 sm:p-12' } }"
            class="grid place-content-center text-2xl cursor-pointer" @click="selectCard(card)">
            <!-- <UButton class="flex flex-col items-center" @click="selectCard(card)" :disabled="!voting"
              :class="{ 'bg-green-500': card === selectedCard }">
              <span>{{ card }}</span>
            </UButton> -->
            {{ card }}
          </UCard>
        </div>
      </main>
      <aside>
        <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
          <template #header>
            <h3 class="text-xl font-semibold">Participants</h3>
          </template>
          <p v-if="voting">Time Elapsed: {{ elapsedTime }}</p>
          <ul class="divide-y divide-gray-200">
            <li v-for="i in 10" :key="i" class="grid grid-cols-2 gap-6 px-4 py-6">
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