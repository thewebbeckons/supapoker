import type { VotesMap } from "~/types/room";

/**
 * Mirrors RESERVED_CARD_VALUES in `~/utils/card-decks`, duplicated because this
 * module is exercised directly by `node --test`, which cannot resolve the `~`
 * alias for runtime imports. `tests/async-voting.test.ts` pins the two together.
 */
const RESERVED_CARD_VALUES = ["__voted__"] as const;

/**
 * Cards that express "I am not estimating this" rather than a size. They are
 * counted in `voteCount` but never establish consensus and never contribute to
 * the numeric average.
 */
export const ABSTAIN_CARDS = ["?", "☕"] as const;

export interface VoteSummary {
  average: number | null;
  voteCount: number;
}

export interface VoteProgressSummary {
  voted: number;
  expected: number;
  missing: string[];
}

export interface ResolvedFinalEstimate {
  label: string | null;
  numeric: number | null;
}

export function isAbstainCard(value: string): boolean {
  return ABSTAIN_CARDS.includes(value as typeof ABSTAIN_CARDS[number]);
}

function isCountableCard(value: string): boolean {
  return !isAbstainCard(value)
    && !RESERVED_CARD_VALUES.includes(value as typeof RESERVED_CARD_VALUES[number]);
}

function numericVote(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Mean of the numeric-parseable votes, rounded to two decimals. `voteCount`
 * deliberately counts every ballot including abstains, which is the behaviour
 * the room UI has always shown.
 */
export function summarizeVotes(votes: VotesMap): VoteSummary {
  const voteCount = Object.keys(votes).length;
  const numericValues = Object.values(votes)
    .map(numericVote)
    .filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return {
      average: null,
      voteCount,
    };
  }

  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return {
    average: Number((total / numericValues.length).toFixed(2)),
    voteCount,
  };
}

/**
 * The single card every non-abstaining voter picked, or null when the team did
 * not agree. Async rooms only auto-complete a story when this returns a card,
 * so the machine never invents an estimate the team did not actually reach.
 */
export function consensusValue(votes: VotesMap): string | null {
  const values = Object.values(votes).filter(isCountableCard);
  if (values.length === 0) return null;

  const first = values[0]!;
  return values.every(value => value === first) ? first : null;
}

/**
 * Splits a chosen card into the raw face we persist for display and the numeric
 * value we persist for aggregation. Non-numeric decks resolve to a label with a
 * null numeric, which is why the label column exists at all.
 */
export function resolveFinalEstimate(label: string | null | undefined): ResolvedFinalEstimate {
  if (!label) return { label: null, numeric: null };
  return { label, numeric: numericVote(label) };
}

/**
 * The deck card closest to an average, used to pre-select the facilitator's
 * default when they resolve a split vote. Returns null for decks with no
 * numeric cards (t-shirt, effort), where no such default exists.
 */
export function nearestDeckCard(average: number | null, cardValues: readonly string[]): string | null {
  if (average === null || !Number.isFinite(average)) return null;

  let nearest: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const value of cardValues) {
    if (!isCountableCard(value)) continue;
    const numeric = numericVote(value);
    if (numeric === null) continue;

    const distance = Math.abs(numeric - average);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = value;
    }
  }

  return nearest;
}

/**
 * Progress is scoped to the expected roster: a late joiner's vote is recorded
 * and displayed, but never counts toward closing the story, so the denominator
 * cannot move once voting has opened.
 */
export function voteProgress(
  expectedIds: readonly string[],
  voterIds: readonly string[],
): VoteProgressSummary {
  const voters = new Set(voterIds);
  const expected = new Set(expectedIds);
  const missing = [...expected].filter(id => !voters.has(id));

  return {
    voted: expected.size - missing.length,
    expected: expected.size,
    missing,
  };
}
