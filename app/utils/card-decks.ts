export const CARD_DECK_IDS = [
  "modified-fibonacci",
  "fibonacci",
  "t-shirt",
  "effort",
  "powers-of-two",
  "linear",
  "custom",
] as const;

export type CardDeckId = typeof CARD_DECK_IDS[number];

export interface CardDeckPreset {
  id: Exclude<CardDeckId, "custom">;
  name: string;
  description: string;
  values: readonly string[];
}

export const MAX_CARD_VALUE_LENGTH = 12;
export const MAX_CARD_VALUES = 20;
export const MIN_CARD_VALUES = 2;
export const RESERVED_CARD_VALUES = ["__voted__"] as const;

export const CARD_DECK_PRESETS: readonly CardDeckPreset[] = [
  {
    id: "modified-fibonacci",
    name: "Modified Fibonacci",
    description: "Familiar story points with wider jumps for uncertain work.",
    values: ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
  },
  {
    id: "fibonacci",
    name: "Fibonacci",
    description: "The classic sequence for estimates that grow with uncertainty.",
    values: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"],
  },
  {
    id: "t-shirt",
    name: "T-Shirt Sizes",
    description: "A lightweight relative scale for early-stage sizing.",
    values: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  },
  {
    id: "effort",
    name: "Effort",
    description: "Plain-language effort levels for non-technical groups.",
    values: ["None", "Tiny", "Low", "Medium", "High", "Huge", "?", "☕"],
  },
  {
    id: "powers-of-two",
    name: "Powers of Two",
    description: "Strong separation between small, medium, and large work.",
    values: ["0", "1", "2", "4", "8", "16", "32", "64", "?", "☕"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "A straightforward one-to-ten scale with equal steps.",
    values: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "☕"],
  },
] as const;

export const DEFAULT_CARD_DECK_ID: CardDeckId = "modified-fibonacci";
export const DEFAULT_CARD_VALUES = [...CARD_DECK_PRESETS[0]!.values];

export function getCardDeckPreset(id: CardDeckId) {
  return CARD_DECK_PRESETS.find(deck => deck.id === id) ?? null;
}

export function getCardDeckName(id: CardDeckId) {
  return id === "custom" ? "Custom" : getCardDeckPreset(id)?.name ?? "Custom";
}

export function displayCardValue(value: string) {
  return value === "0.5" ? "½" : value;
}

export function parseCustomCardValues(input: string) {
  return input
    .split(/[\n,]/)
    .map(value => value.trim())
    .filter(Boolean);
}

export function cardValuesValidationError(values: readonly string[]): string | null {
  if (values.length < MIN_CARD_VALUES) return `Add at least ${MIN_CARD_VALUES} card values.`;
  if (values.length > MAX_CARD_VALUES) return `Use no more than ${MAX_CARD_VALUES} card values.`;
  if (values.some(value => value.length > MAX_CARD_VALUE_LENGTH)) {
    return `Keep each card value to ${MAX_CARD_VALUE_LENGTH} characters or fewer.`;
  }
  if (values.some(value => RESERVED_CARD_VALUES.includes(value as typeof RESERVED_CARD_VALUES[number]))) {
    return "One of those card values is reserved by the voting system.";
  }
  if (new Set(values).size !== values.length) return "Card values must be unique.";
  return null;
}

export function isCardDeckId(value: unknown): value is CardDeckId {
  return typeof value === "string" && CARD_DECK_IDS.includes(value as CardDeckId);
}

export function isCardDeckVote(value: unknown, cardValues: readonly string[]): value is string {
  return typeof value === "string" && cardValues.includes(value);
}
