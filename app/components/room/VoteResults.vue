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
    '☕': '☕'
}

// Non-numeric values excluded from average calculation
const NON_NUMERIC_VALUES = ['?', '☕']

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

</script>

<template>
    <div class="vote-results">
        <div v-if="averageVote !== null" class="average-vote">
            <span>AVERAGE VOTE</span>
            <strong>{{ averageVote }}</strong>
        </div>
        <div v-else class="no-average">
            No numeric votes to calculate an average
        </div>

        <div class="distribution">
            <p>VOTE DISTRIBUTION</p>

            <div v-if="voteTallies.length === 0" class="no-votes">
                No votes recorded
            </div>

            <div v-else class="tallies">
                <div v-for="tally in voteTallies" :key="tally.value" class="tally-row">
                    <div class="result-card">
                        <span v-if="tally.value === '☕'" class="text-xl">☕</span>
                        <span v-else>{{ tally.label }}</span>
                    </div>

                    <div class="bar-track">
                        <i :class="{ neutral: !tally.isNumeric }" :style="{ width: `${(tally.count / maxCount) * 100}%` }" />
                    </div>

                    <span class="tally-count">{{ tally.count }} · {{ Math.round((tally.count / totalVotes) * 100) }}%</span>
                </div>
            </div>
        </div>

        <div class="vote-summary">
            {{ totalVotes }} total vote{{ totalVotes !== 1 ? 's' : '' }}
        </div>
    </div>
</template>

<style scoped>
.vote-results { display: grid; width: 100%; max-width: 38rem; grid-template-columns: 8rem minmax(0, 1fr); gap: 2rem; align-items: center; }
.average-vote { display: flex; flex-direction: column; align-items: center; }
.average-vote span, .distribution > p { color: #a8a8b2; font-size: 0.68rem; letter-spacing: 0.14em; }
.average-vote strong { display: grid; width: 7rem; height: 9rem; margin-top: 0.75rem; place-items: center; color: #93c5fd; border: 1px solid #3b82f6; background: #0d1930; box-shadow: 0 16px 30px rgba(0, 0, 0, 0.32); font-size: 2.25rem; font-weight: 500; }
.no-average, .no-votes { color: #a8a8b2; font-size: 0.78rem; text-align: center; }
.tallies { display: grid; gap: 0.55rem; margin-top: 1rem; }
.tally-row { display: grid; grid-template-columns: 2.25rem minmax(0, 1fr) 4rem; gap: 0.75rem; align-items: center; }
.result-card { display: grid; width: 2.4rem; height: 3rem; place-items: center; color: #c4c4cc; border: 1px solid #3a3a42; background: #101014; font-size: 0.95rem; }
.bar-track { height: 2px; overflow: hidden; background: #202026; }
.bar-track i { display: block; height: 100%; background: #2563eb; box-shadow: 0 0 8px #2563eb; transition: width 500ms ease; }
.bar-track i.neutral { background: #71717a; box-shadow: none; }
.tally-count { color: #a8a8b2; font-size: 0.68rem; text-align: right; }
.vote-summary { grid-column: 1 / -1; color: #a1a1aa; font-size: 0.72rem; text-align: center; }

@media (max-width: 560px) {
    .vote-results { grid-template-columns: 1fr; gap: 1.5rem; }
    .average-vote strong { width: 5rem; height: 6.5rem; }
}
</style>
