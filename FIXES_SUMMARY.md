# Fixes Summary

This document summarizes the issues that were corrected and the high-level approach used for each fix.

## 1) Vote reset could delete data before the vote state changed

Problem: Starting a vote deleted existing `story_votes` before confirming the story status update succeeded. If the status update failed, historical votes were already lost.

Fix: The flow now updates story status to `voting` first, then clears votes. If vote clearing fails, the code attempts to roll the story status back to its previous value and refreshes story state if rollback also fails.

Files:
- `app/composables/useRoomStories.ts`

## 2) Profile fallback insert path could not recover missing profiles

Problem: The profile fallback insert did not include `user_id`, and database policy support for authenticated self-insert was missing. Users without an existing profile row could fail to save profile data.

Fix: The profile insert now includes `user_id` from the authenticated user. A new migration adds an RLS policy allowing authenticated users to insert their own profile row (`auth.uid() = user_id`).

Files:
- `app/components/account/Profile.vue`
- `supabase/migrations/20260212110000_add_profile_insert_policy.sql`

## 3) Optimistic vote rollback removed previous user votes

Problem: When vote upsert failed, rollback always removed the local user vote. If the user already had a prior vote, the UI incorrectly erased it.

Fix: The vote composable now snapshots the user’s previous local vote and selected card before optimistic update. On failure, it restores the previous state instead of always clearing.

Files:
- `app/composables/useRoomVotes.ts`

## 4) Seed script contained hardcoded credentials

Problem: The seed script embedded a fixed email and password in source code.

Fix: The script now requires `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` from environment variables, supports optional `SEED_USER_NAME`, and exits with a clear error when required values are missing.

Files:
- `scripts/seed-user.mjs`
