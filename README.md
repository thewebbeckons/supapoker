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
NUXT_PUBLIC_SITE_URL=http://localhost:3000
EMAIL_FROM=SupaPoker <noreply@your-domain.com>
```

## Development

```bash
pnpm run dev
```

NuxtHub applies D1 migrations during dev/build. Generate migrations after schema changes:

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

## CI/CD

Pushes to `main` run the GitHub Actions production deploy workflow. The workflow installs with pnpm, typechecks, runs D1 migrations, builds the Nuxt app, and deploys the generated Cloudflare Worker output.

Configure these GitHub Actions secrets in the `production` environment or repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

The workflow maps the Cloudflare secrets to NuxtHub's `NUXT_HUB_CLOUDFLARE_*` variables for D1 migrations.

Optional GitHub Actions variables:

- `NUXT_PUBLIC_SITE_URL` defaults to `https://supapoker.dev`
- `EMAIL_FROM` defaults to `SupaPoker <noreply@supapoker.dev>`
- `NUXT_HUB_CLOUDFLARE_DATABASE_ID` defaults to the D1 database ID in `nuxt.config.ts`
