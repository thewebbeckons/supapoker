import assert from "node:assert/strict";
import test from "node:test";
import {
  consensusValue,
  isAbstainCard,
  nearestDeckCard,
  resolveFinalEstimate,
  summarizeVotes,
  voteProgress,
} from "../app/utils/async-voting.ts";
import { RESERVED_CARD_VALUES } from "../app/utils/card-decks.ts";

const fibonacciDeck = ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"];
const tshirtDeck = ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"];

test("abstain cards are recognised", () => {
  assert.equal(isAbstainCard("?"), true);
  assert.equal(isAbstainCard("☕"), true);
  assert.equal(isAbstainCard("5"), false);
  assert.equal(isAbstainCard("XL"), false);
});

test("vote summaries average only numeric cards but count every ballot", () => {
  assert.deepEqual(summarizeVotes({ a: "5", b: "8" }), { average: 6.5, voteCount: 2 });

  // Abstains inflate voteCount without touching the average — long-standing
  // behaviour the room UI depends on.
  assert.deepEqual(summarizeVotes({ a: "5", b: "8", c: "?" }), { average: 6.5, voteCount: 3 });

  // Rounds to two decimals: 5 + 8 + 8 = 21 / 3 = 6.999…
  assert.deepEqual(summarizeVotes({ a: "5", b: "8", c: "8" }), { average: 7, voteCount: 3 });
  assert.deepEqual(summarizeVotes({ a: "1", b: "2", c: "5" }), { average: 2.67, voteCount: 3 });

  // Non-numeric decks have no average at all — the reason final_estimate_label exists.
  assert.deepEqual(summarizeVotes({ a: "M", b: "L" }), { average: null, voteCount: 2 });
  assert.deepEqual(summarizeVotes({}), { average: null, voteCount: 0 });
});

test("consensus requires unanimity among non-abstaining voters", () => {
  assert.equal(consensusValue({ a: "5", b: "5", c: "5" }), "5");
  assert.equal(consensusValue({ a: "5", b: "8" }), null);

  // Abstains never block a consensus the estimating voters reached.
  assert.equal(consensusValue({ a: "5", b: "5", c: "?" }), "5");
  assert.equal(consensusValue({ a: "XL", b: "XL", c: "☕" }), "XL");

  // A lone voter is trivially unanimous.
  assert.equal(consensusValue({ a: "13" }), "13");

  // Nobody estimated, so there is nothing to ratify.
  assert.equal(consensusValue({ a: "?", b: "☕" }), null);
  assert.equal(consensusValue({}), null);

  // A viewer-masked map must never look like consensus on the sentinel.
  assert.equal(consensusValue({ a: "__voted__", b: "__voted__" }), null);
});

test("the sentinel async-voting guards against matches the canonical deck list", () => {
  // async-voting.ts redeclares this because node --test cannot resolve the `~`
  // alias at runtime. If card-decks ever gains a reserved value, this fails.
  assert.deepEqual([...RESERVED_CARD_VALUES], ["__voted__"]);
});

test("final estimates keep the raw card and derive a numeric only when possible", () => {
  assert.deepEqual(resolveFinalEstimate("8"), { label: "8", numeric: 8 });
  assert.deepEqual(resolveFinalEstimate("0.5"), { label: "0.5", numeric: 0.5 });
  assert.deepEqual(resolveFinalEstimate("XL"), { label: "XL", numeric: null });
  assert.deepEqual(resolveFinalEstimate(null), { label: null, numeric: null });
  assert.deepEqual(resolveFinalEstimate(undefined), { label: null, numeric: null });
});

test("the nearest deck card snaps an average onto a real card", () => {
  assert.equal(nearestDeckCard(6.33, fibonacciDeck), "5");
  assert.equal(nearestDeckCard(7, fibonacciDeck), "8");
  assert.equal(nearestDeckCard(0.4, fibonacciDeck), "0.5");
  assert.equal(nearestDeckCard(1000, fibonacciDeck), "100");

  // Decks with no numeric cards have no sensible default.
  assert.equal(nearestDeckCard(3, tshirtDeck), null);
  assert.equal(nearestDeckCard(null, fibonacciDeck), null);
});

test("vote progress is scoped to the expected roster", () => {
  assert.deepEqual(voteProgress(["a", "b", "c"], ["a", "b"]), {
    voted: 2,
    expected: 3,
    missing: ["c"],
  });

  // A late joiner votes, but cannot move either side of the fraction.
  assert.deepEqual(voteProgress(["a", "b"], ["a", "b", "late"]), {
    voted: 2,
    expected: 2,
    missing: [],
  });

  assert.deepEqual(voteProgress([], ["a"]), { voted: 0, expected: 0, missing: [] });
});
