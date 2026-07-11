# Supapoker

A real-time Planning Poker application built with Nuxt 4, Cloudflare, NuxtHub, Better Auth, and Nuxt UI.

## Features

- User authentication with Better Auth email/password and GitHub OAuth.
- Room management for planning sessions.
- Real-time room presence and voting powered by Cloudflare Durable Objects.
- D1-backed rooms, profiles, story history, and vote snapshots through NuxtHub.
- Avatar uploads stored in R2 through NuxtHub blob.
- Transactional email through Cloudflare Email Service.

## Setup

```bash
pnpm install
```

Create `.env` from `.env.example`:

```bash
BETTER_AUTH_SECRET=your-secret-at-least-32-characters
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
NUXT_PUBLIC_SITE_URL=http://localhost:8787
EMAIL_FROM=SupaPoker <noreply@your-domain.com>
```

## Development

```bash
pnpm run dev
```

This builds the app, applies pending migrations to the persistent local D1 database, and starts Wrangler on `http://localhost:8787`. Running the built Worker is required for local Durable Object RPC and WebSocket support.

For UI-only work with Nuxt hot module replacement, use:

```bash
pnpm run dev:nuxt
```

The Nuxt-only server uses NuxtHub's local SQLite driver, but it does not run the room Durable Object. Generate migrations after schema changes:

```bash
pnpm run db:generate
pnpm run db:migrate
```

## Cloudflare

The app uses these Cloudflare bindings:

- D1 through NuxtHub `hub.db`
- R2 through NuxtHub `hub.blob`
- `ROOM_SESSION` Durable Object for room realtime state
- `EMAIL` Cloudflare Email Service binding

Useful commands:

```bash
pnpm run build
pnpm run cf:preview
pnpm run cf:deploy
```
