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

Create `.env` from `.env.example` before installing dependencies because Nuxt validates the required values during its prepare step:

```bash
BETTER_AUTH_SECRET=your-secret-at-least-32-characters
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
NUXT_PUBLIC_GITHUB_AUTH_ENABLED=true
NUXT_PUBLIC_SITE_URL=http://localhost:8787
NUXT_HUB_DATABASE_ID=your-cloudflare-d1-database-id
NUXT_HUB_BLOB_BUCKET_NAME=supapoker-avatars
EMAIL_FROM=SupaPoker <noreply@your-domain.com>
```

Install the dependencies:

```bash
pnpm install
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

`pnpm run cf:deploy` builds the application, applies pending migrations to the configured remote D1 database, and deploys the Worker only after the migrations succeed.

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` validates every pull request and push to `main`. Internal pull requests receive an isolated Worker, D1 database, and Durable Object namespace. The workflow removes those resources when the pull request closes. Pull requests from forks run checks without receiving deployment secrets.

Successful pushes to `main` apply production D1 migrations before deploying the production Worker. Keep migrations backward-compatible with the currently deployed Worker because the database changes before the new Worker becomes active. Use a later release to remove old columns or other compatibility paths.

### Cloudflare prerequisites

Create a shared non-production R2 bucket for preview avatars:

```bash
pnpm exec wrangler r2 bucket create supapoker-preview-avatars
```

Create a scoped Cloudflare API token with these account permissions:

- Workers Scripts: Edit
- D1: Edit
- Workers R2 Storage: Edit
- Account Settings: Read

Add Workers Routes: Edit for the `supapoker.dev` zone if Wrangler manages the production custom domain or route.

### GitHub secrets

Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `BETTER_AUTH_SECRET`
- `PREVIEW_BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Use a unique random value of at least 32 characters for `PREVIEW_BETTER_AUTH_SECRET`. GitHub OAuth remains disabled in previews because every pull request has a different callback hostname.

### GitHub variables

Add these repository variables in the same settings area:

- `CLOUDFLARE_WORKERS_SUBDOMAIN`: the account's `workers.dev` subdomain without `.workers.dev`
- `NUXT_HUB_DATABASE_ID`: the production D1 database UUID
- `NUXT_HUB_BLOB_BUCKET_NAME`: `supapoker-avatars`
- `NUXT_HUB_PREVIEW_BLOB_BUCKET_NAME`: `supapoker-preview-avatars`
- `EMAIL_FROM`: `SupaPoker <noreply@supapoker.dev>`

After the workflow runs once, protect `main` and require the **CI/CD / Checks** status check before merging. Do not add a required approval to the `production` GitHub environment if production should deploy automatically.
