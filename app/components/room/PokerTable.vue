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
    { label: '20', value: '20' },
    { label: '40', value: '40' },
    { label: '100', value: '100' },
    { label: '?', value: '?' },
    { label: '☕', value: '☕', icon: 'i-lucide-coffee' }
]

defineProps<{
    modelValue: string | null
    isVoting: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

function selectCard(value: string) {
    emit('update:modelValue', value)
}
</script>

<template>
    <div class="poker-table" :class="{ disabled: !isVoting }" aria-label="Planning poker cards">
        <div class="card-grid">
            <button
                v-for="card in CARDS"
                :key="card.value"
                type="button"
                class="poker-card"
                :class="{ selected: modelValue === card.value }"
                :aria-pressed="modelValue === card.value"
                :aria-label="`Vote ${card.label}`"
                :disabled="!isVoting"
                @click="selectCard(card.value)"
            >
                <span class="card-center">
                    <UIcon v-if="card.icon" :name="card.icon" />
                    <template v-else>{{ card.label }}</template>
                </span>
                <span class="card-corner card-corner-top">
                    <UIcon v-if="card.icon" :name="card.icon" />
                    <template v-else>{{ card.label }}</template>
                </span>
                <span class="card-corner card-corner-bottom">
                    <UIcon v-if="card.icon" :name="card.icon" />
                    <template v-else>{{ card.label }}</template>
                </span>
            </button>
        </div>

        <p v-if="modelValue" class="selection-note">
            <UIcon name="i-lucide-mouse-pointer-2" />
            You voted <b>{{ CARDS.find(card => card.value === modelValue)?.label }}</b>
        </p>
        <p v-else class="selection-note">
            <UIcon :name="isVoting ? 'i-lucide-mouse-pointer-2' : 'i-lucide-lock-keyhole'" />
            {{ isVoting ? "Choose a card" : "Voting is not open" }}
        </p>
    </div>
</template>

<style scoped>
.poker-table { width: 100%; max-width: 58rem; }
.card-grid { display: grid; grid-template-columns: repeat(13, minmax(42px, 1fr)); gap: clamp(0.35rem, 0.8vw, 0.75rem); }
.poker-card { position: relative; display: flex; min-width: 0; height: 6.75rem; align-items: center; justify-content: center; color: #b4b4bd; border: 1px solid #34343b; background: #101014; box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12); transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease; cursor: pointer; }
.poker-card:hover:not(:disabled) { color: #d4d4d8; border-color: #4b4b55; transform: translateY(-4px); box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28); }
.poker-card:focus-visible { outline: 1px solid #60a5fa; outline-offset: 3px; }
.poker-card:disabled { cursor: not-allowed; opacity: 0.58; }
.poker-card.selected { z-index: 1; color: #93c5fd; border-color: #3b82f6; background: #0d1930; box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.16), 0 16px 30px rgba(0, 0, 0, 0.4); transform: translateY(-6px); }
.card-center { font-size: clamp(1.15rem, 2.1vw, 1.85rem); font-weight: 450; }
.card-center :deep(svg) { width: 1.35rem; height: 1.35rem; }
.card-corner { position: absolute; font-size: 0.56rem; }
.card-corner :deep(svg) { width: 0.55rem; height: 0.55rem; }
.card-corner-top { top: 0.45rem; left: 0.5rem; }
.card-corner-bottom { right: 0.5rem; bottom: 0.45rem; transform: rotate(180deg); }
.selection-note { display: flex; min-height: 1rem; align-items: center; justify-content: center; gap: 0.45rem; margin-top: 1.7rem; color: #a8a8b2; font-size: 0.75rem; }
.selection-note b { color: #93c5fd; }

@media (max-width: 1180px) {
    .card-grid { grid-template-columns: repeat(7, minmax(45px, 1fr)); max-width: 34rem; margin-inline: auto; }
    .poker-card { height: 5.75rem; }
}

@media (max-width: 520px) {
    .card-grid { grid-template-columns: repeat(5, minmax(42px, 1fr)); max-width: 19rem; }
    .poker-card { height: 4.75rem; }
}

@media (prefers-reduced-motion: reduce) {
    .poker-card { transition: none; }
}
</style>
