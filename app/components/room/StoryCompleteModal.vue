<script lang="ts" setup>
import type { Story, VotesMap } from '~/types/room'
import { consensusValue, nearestDeckCard } from '~/utils/async-voting'
import { displayCardValue } from '~/utils/card-decks'

const props = defineProps<{
    modelValue: boolean
    story: Story | null
    cardValues: string[]
    votes: VotesMap
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', finalEstimate?: string): void
}>()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

/** null means "fall back to the numeric mean", which is the legacy behaviour. */
const selected = ref<string | null>(null)

const consensus = computed(() => consensusValue(props.votes))
const average = computed(() => props.story?.voteAverage ?? null)
const suggested = computed(() => consensus.value ?? nearestDeckCard(average.value, props.cardValues))

watch(isOpen, (open) => {
    if (open) selected.value = suggested.value
}, { immediate: true })

/**
 * Omitting the estimate falls back to the numeric mean, which only exists for
 * numeric decks. On a t-shirt or effort deck that fallback would store nothing
 * at all, so a card must be picked.
 */
const canConfirm = computed(() => selected.value !== null || average.value !== null)

function confirm() {
    if (!canConfirm.value) return
    emit('confirm', selected.value ?? undefined)
    isOpen.value = false
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Complete Story"
        description="Pick the estimate this story lands on." :ui="{ content: 'sm:max-w-md' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <div>
                    <p class="text-xs uppercase tracking-wide text-neutral-500">Final estimate</p>
                    <p v-if="consensus" class="text-xs text-neutral-400 mt-1">
                        The team was unanimous on <b>{{ displayCardValue(consensus) }}</b>.
                    </p>
                    <p v-else-if="average !== null" class="text-xs text-neutral-400 mt-1">
                        Votes averaged <b>{{ average }}</b>. Pick the card the team settled on.
                    </p>
                    <p v-else class="text-xs text-neutral-400 mt-1">
                        This deck has no numeric average, so choose the agreed card.
                    </p>

                    <div class="estimate-grid">
                        <button
                            v-for="card in cardValues"
                            :key="card"
                            type="button"
                            class="estimate-card"
                            :class="{ selected: selected === card }"
                            :aria-pressed="selected === card"
                            :aria-label="`Final estimate ${displayCardValue(card)}`"
                            @click="selected = card"
                        >
                            {{ displayCardValue(card) }}
                        </button>
                    </div>

                    <UButton
                        v-if="average !== null"
                        class="mt-3"
                        size="xs"
                        color="neutral"
                        :variant="selected === null ? 'subtle' : 'ghost'"
                        :label="`Use the numeric average (${average})`"
                        @click="selected = null"
                    />
                </div>

                <div
                    class="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-amber-500 mt-0.5" />
                        <p class="text-sm text-amber-600 dark:text-amber-300">
                            Completing <strong>{{ story?.title }}</strong> will lock it. You won't be able to
                            re-activate or edit it afterwards.
                        </p>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Complete Story" color="success" icon="i-lucide-check-circle"
                        :disabled="!canConfirm" @click="confirm" />
                </div>
            </div>
        </template>
    </UModal>
</template>

<style scoped>
.estimate-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
}

.estimate-card {
    min-width: 2.6rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.03);
    color: #d4d4d8;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.estimate-card:hover { border-color: rgba(96, 165, 250, 0.5); color: #fafafa; }

/* The selected state is only a border colour, which is not a reliable focus
   cue, so keyboard focus gets its own outline. */
.estimate-card:focus-visible {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
    color: #fafafa;
}

.estimate-card.selected {
    border-color: #60a5fa;
    background: rgba(37, 99, 235, 0.18);
    color: #fafafa;
}
</style>
