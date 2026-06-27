# agents.md

This repository is a Nuxt 4 planning poker app deployed to Cloudflare.

## Commands

- Use `pnpm`.
- `pnpm install`
- `pnpm run dev`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm run db:generate`
- `pnpm run db:migrate`
- `pnpm run cf:preview`
- `pnpm run cf:deploy`

## Stack

- Nuxt 4 and Vue 3
- Nuxt UI
- NuxtHub D1 for durable data
- NuxtHub blob/R2 for avatars
- Better Auth for email/password and GitHub login
- Cloudflare Email Service for transactional email
- Cloudflare Durable Objects for room realtime state

## Notes

- Keep room UI components presentational where practical.
- Server APIs enforce room membership and admin permissions.
- One Durable Object instance coordinates each room.
- Poke notifications are visual-only bird emoji bursts, not audio.
