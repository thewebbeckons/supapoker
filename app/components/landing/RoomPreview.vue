<script lang="ts" setup>
const CARDS = [
  { label: '0', value: '0' },
  { label: '½', value: '0.5' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '5', value: '5' },
  { label: '8', value: '8' },
  { label: '13', value: '13' },
]

const players = [
  { id: '1', name: 'Sarah M.', initials: 'SM', color: 'bg-blue-500', voted: true },
  { id: '2', name: 'Alex K.', initials: 'AK', color: 'bg-green-500', voted: true },
  { id: '3', name: 'Jordan P.', initials: 'JP', color: 'bg-purple-500', voted: false },
  { id: '4', name: 'Casey T.', initials: 'CT', color: 'bg-orange-500', voted: true },
  { id: '5', name: 'Morgan L.', initials: 'ML', color: 'bg-pink-500', voted: true },
]

const stories = [
  { id: '1', title: 'User authentication flow', status: 'completed' },
  { id: '2', title: 'API rate limiting implementation', status: 'active' },
  { id: '3', title: 'Dashboard analytics widgets', status: 'pending' },
]

const hoveredCard = ref<string | null>(null)
const selectedCard = ref<string | null>('5')

function onHoverCard(value: string | null) {
  hoveredCard.value = value
}
</script>

<template>
  <div class="h-full bg-white dark:bg-neutral-900 flex">
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              Sprint 24 Planning
            </h1>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Estimating backend tasks
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge color="warning" variant="subtle" size="xs">
              <UIcon name="i-lucide-clock" class="w-3 h-3 mr-1" />
              Voting
            </UBadge>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
        <div class="text-center mb-4">
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Current Story</p>
          <h2 class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            API rate limiting implementation
          </h2>
        </div>

        <div class="grid grid-cols-4 gap-2 max-w-md">
          <div
            v-for="card in CARDS"
            :key="card.value"
            class="relative flex items-center justify-center w-14 h-20 rounded-lg border-2 transition-all duration-200 cursor-pointer"
            :class="[
              selectedCard === card.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 -translate-y-1 shadow-md'
                : hoveredCard === card.value
                  ? 'border-primary-300 dark:border-primary-700 -translate-y-0.5 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
            ]"
            @mouseenter="onHoverCard(card.value)"
            @mouseleave="onHoverCard(null)"
            @click="selectedCard = card.value"
          >
            <span
              class="text-2xl font-light"
              :class="selectedCard === card.value
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-neutral-700 dark:text-neutral-200'"
            >
              {{ card.label }}
            </span>
            <span
              class="absolute top-1 left-1 text-[10px] font-medium text-neutral-400"
            >
              {{ card.label }}
            </span>
            <span
              class="absolute bottom-1 right-1 text-[10px] font-medium text-neutral-400 transform rotate-180"
            >
              {{ card.label }}
            </span>
          </div>
        </div>
      </div>

      <div class="border-t border-neutral-200 dark:border-neutral-800 p-3">
        <div class="flex items-center gap-2 overflow-x-auto">
          <div
            v-for="story in stories"
            :key="story.id"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors"
            :class="[
              story.status === 'active'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                : story.status === 'completed'
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                  : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300'
            ]"
          >
            <UIcon
              v-if="story.status === 'completed'"
              name="i-lucide-check-circle"
              class="w-3 h-3 text-green-500"
            />
            <UIcon
              v-else-if="story.status === 'active'"
              name="i-lucide-play-circle"
              class="w-3 h-3"
            />
            {{ story.title }}
          </div>
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 whitespace-nowrap">
            <UIcon name="i-lucide-plus" class="w-3 h-3" />
            Add story
          </button>
        </div>
      </div>
    </div>

    <div class="w-48 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4 flex flex-col">
      <h3 class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
        Players
      </h3>
      <div class="space-y-2 flex-1">
        <div
          v-for="player in players"
          :key="player.id"
          class="flex items-center gap-2 p-2 rounded-lg"
          :class="player.voted ? 'bg-white dark:bg-neutral-800' : ''"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
            :class="player.color"
          >
            {{ player.initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">
              {{ player.name }}
            </p>
          </div>
          <div v-if="player.voted" class="w-2 h-2 rounded-full bg-green-500" />
          <div v-else class="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
      </div>
      <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <p class="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          {{ players.filter(p => p.voted).length }}/{{ players.length }} voted
        </p>
      </div>
    </div>
  </div>
</template>