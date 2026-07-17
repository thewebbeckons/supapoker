<script setup lang="ts">
import type { CardDeckId } from "~/utils/card-decks";
import {
  CARD_DECK_PRESETS,
  cardValuesValidationError,
  displayCardValue,
  getCardDeckPreset,
  parseCustomCardValues,
} from "~/utils/card-decks";

const deckId = defineModel<CardDeckId>("deckId", { required: true });
const customValues = defineModel<string>("customValues", { required: true });

const customCards = computed(() => parseCustomCardValues(customValues.value));
const customError = computed(() => cardValuesValidationError(customCards.value));
const previewCards = computed(() => {
  if (deckId.value === "custom") return customCards.value;
  return [...(getCardDeckPreset(deckId.value)?.values ?? [])];
});

const choices = [
  ...CARD_DECK_PRESETS,
  {
    id: "custom" as const,
    name: "Custom",
    description: "Build a deck that matches your team's own language.",
    values: [] as readonly string[],
  },
];
</script>

<template>
  <div class="deck-picker">
    <div class="deck-options" role="radiogroup" aria-label="Card deck">
      <button
        v-for="choice in choices"
        :key="choice.id"
        type="button"
        class="deck-option"
        :class="{ selected: deckId === choice.id }"
        role="radio"
        :aria-checked="deckId === choice.id"
        @click="deckId = choice.id"
      >
        <span class="deck-option-heading">
          <UIcon :name="choice.id === 'custom' ? 'i-lucide-sliders-horizontal' : 'i-lucide-layers-3'" />
          <strong>{{ choice.name }}</strong>
          <UIcon v-if="deckId === choice.id" name="i-lucide-circle-check" class="selected-icon" />
        </span>
        <span>{{ choice.description }}</span>
        <span v-if="choice.values.length" class="deck-sample">
          {{ choice.values.slice(0, 5).map(displayCardValue).join(' · ') }}{{ choice.values.length > 5 ? ' · …' : '' }}
        </span>
      </button>
    </div>

    <UFormField
      v-if="deckId === 'custom'"
      label="Custom card values"
      description="Separate values with commas or new lines. Values appear in this order."
      :error="customError ?? undefined"
      required
    >
      <UTextarea
        v-model="customValues"
        class="w-full"
        :rows="2"
        autoresize
        placeholder="XS, S, M, L, XL"
      />
    </UFormField>

    <div class="deck-preview" aria-live="polite">
      <div class="preview-heading">
        <span>TABLE PREVIEW</span>
        <small>{{ previewCards.length }} cards</small>
      </div>
      <div v-if="previewCards.length" class="preview-cards">
        <span
          v-for="value in previewCards"
          :key="value"
          class="preview-card"
          :class="{ wide: displayCardValue(value).length > 3 }"
          :aria-label="value === '☕' ? 'Break' : undefined"
        >
          <UIcon v-if="value === '☕'" name="i-lucide-coffee" />
          <template v-else>{{ displayCardValue(value) }}</template>
        </span>
      </div>
      <p v-else>Add values to preview your custom deck.</p>
    </div>
  </div>
</template>

<style scoped>
.deck-picker { display: grid; gap: 1rem; }
.deck-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
.deck-option { display: grid; min-width: 0; gap: 0.35rem; padding: 0.8rem; color: #a1a1aa; border: 1px solid #303038; border-radius: 0.45rem; background: #101014; text-align: left; transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease; }
.deck-option:hover { border-color: #52525b; transform: translateY(-1px); }
.deck-option:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
.deck-option.selected { color: #d4d4d8; border-color: #3b82f6; background: #0d1930; box-shadow: inset 0 0 0 1px rgb(59 130 246 / 14%); }
.deck-option-heading { display: flex; align-items: center; gap: 0.45rem; color: #e4e4e7; font-size: 0.82rem; }
.deck-option-heading :deep(svg) { width: 0.85rem; height: 0.85rem; color: #60a5fa; }
.deck-option-heading .selected-icon { margin-left: auto; color: #60a5fa; }
.deck-option > span:nth-child(2) { font-size: 0.69rem; line-height: 1.35; }
.deck-sample { overflow: hidden; color: #71717a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
.deck-preview { min-width: 0; padding: 0.8rem; border: 1px solid #27272a; border-radius: 0.45rem; background: radial-gradient(circle at 50% 120%, rgb(37 99 235 / 14%), transparent 55%), #09090b; }
.preview-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem; color: #71717a; font-size: 0.62rem; letter-spacing: 0.12em; }
.preview-heading small { letter-spacing: normal; text-transform: none; }
.preview-cards { display: flex; min-height: 3.3rem; gap: 0.35rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.35rem; }
.preview-card { display: grid; width: 2.25rem; min-width: 2.25rem; height: 3rem; place-items: center; color: #c4c4cc; border: 1px solid #3f3f46; background: #121217; box-shadow: 0 7px 12px rgb(0 0 0 / 24%); font-size: 0.75rem; }
.preview-card.wide { width: 3.8rem; min-width: 3.8rem; padding-inline: 0.25rem; font-size: 0.62rem; }
.preview-card :deep(svg) { width: 0.85rem; height: 0.85rem; }
.deck-preview > p { color: #71717a; font-size: 0.72rem; }

@media (max-width: 640px) {
  .deck-options { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .deck-option { transition: none; }
}
</style>
