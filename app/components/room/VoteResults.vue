<script lang="ts" setup>
const CARD_LABELS: Record<string, string> = {
    '0': '0',
    '0.5': '½',
    '1': '1',
    '2': '2',
    '3': '3',
    '5': '5',
    '8': '8',
    '13': '13',
    '20': '20',
    '40': '40',
    '100': '100',
    '?': '?',
    'coffee': '☕'
}

// Non-numeric values excluded from average calculation
const NON_NUMERIC_VALUES = ['?', 'coffee']

const props = defineProps<{
    votes: Record<string, string>
}>()

// Calculate vote tallies - count how many people voted for each value
const voteTallies = computed(() => {
    const counts: Record<string, number> = {}
    
    Object.values(props.votes).forEach(vote => {
        counts[vote] = (counts[vote] || 0) + 1
    })
    
    // Convert to array and sort by count descending
    return Object.entries(counts)
        .map(([value, count]) => ({
            value,
            label: CARD_LABELS[value] || value,
            count,
            isNumeric: !NON_NUMERIC_VALUES.includes(value)
        }))
        .sort((a, b) => b.count - a.count)
})

// Calculate total votes for percentage calculation
const totalVotes = computed(() => Object.values(props.votes).length)

// Calculate max count for bar width scaling
const maxCount = computed(() => {
    if (voteTallies.value.length === 0) return 1
    return Math.max(...voteTallies.value.map(t => t.count))
})

// Calculate average vote (excluding non-numeric values)
const averageVote = computed(() => {
    const numericVotes = Object.values(props.votes)
        .filter(v => !NON_NUMERIC_VALUES.includes(v))
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v))
    
    if (numericVotes.length === 0) return null
    
    const sum = numericVotes.reduce((acc, val) => acc + val, 0)
    return (sum / numericVotes.length).toFixed(1)
})

// Get color class based on value
function getBarColor(value: string): string {
    if (NON_NUMERIC_VALUES.includes(value)) {
        return 'bg-neutral-400 dark:bg-neutral-600'
    }
    return 'bg-primary-500 dark:bg-primary-400'
}
</script>

<template>
    <div class="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
        <!-- Average Vote Display -->
        <div v-if="averageVote !== null" class="text-center">
            <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Average Vote
            </p>
            <div
                class="text-6xl font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 rounded-2xl px-8 py-4 border-2 border-primary-200 dark:border-primary-800">
                {{ averageVote }}
            </div>
        </div>
        <div v-else class="text-center">
            <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                No numeric votes to calculate average
            </p>
        </div>

        <!-- Vote Distribution Bar Chart -->
        <div class="w-full">
            <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-4">
                Vote Distribution
            </p>

            <div v-if="voteTallies.length === 0" class="text-center text-neutral-400 py-8">
                No votes recorded
            </div>

            <div v-else class="space-y-3">
                <div v-for="tally in voteTallies" :key="tally.value"
                    class="flex items-center gap-4 group hover:bg-neutral-50 dark:hover:bg-neutral-800/30 rounded-lg p-2 -mx-2 transition-colors">
                    <!-- Card Label -->
                    <div
                        class="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shrink-0">
                        <span v-if="tally.value === 'coffee'" class="text-xl">☕</span>
                        <span v-else class="text-xl font-medium text-neutral-700 dark:text-neutral-200">
                            {{ tally.label }}
                        </span>
                    </div>

                    <!-- Bar -->
                    <div class="flex-1 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden relative">
                        <div class="h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-3"
                            :class="getBarColor(tally.value)" :style="{ width: `${(tally.count / maxCount) * 100}%` }">
                            <span v-if="(tally.count / maxCount) > 0.2"
                                class="text-sm font-bold text-white whitespace-nowrap">
                                {{ tally.count }} vote{{ tally.count !== 1 ? 's' : '' }}
                            </span>
                        </div>
                        <span v-if="(tally.count / maxCount) <= 0.2"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-600 dark:text-neutral-300">
                            {{ tally.count }} vote{{ tally.count !== 1 ? 's' : '' }}
                        </span>
                    </div>

                    <!-- Percentage -->
                    <div class="w-16 text-right shrink-0">
                        <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            {{ Math.round((tally.count / totalVotes) * 100) }}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Summary -->
        <div class="text-center text-sm text-neutral-400 dark:text-neutral-500">
            {{ totalVotes }} total vote{{ totalVotes !== 1 ? 's' : '' }}
        </div>
    </div>
</template>
