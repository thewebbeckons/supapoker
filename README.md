# Supapoker

A real-time Planning Poker application built with Nuxt 4, Supabase, and Nuxt UI.

## Features

- **User Authentication**: Secure sign-up and login via Supabase Auth.
- **Room Management**: Create and join rooms for planning sessions.
- **Real-time Interaction**: (In Progress) Vote on stories and see results in real-time.
- **Modern UI**: Clean and responsive data-driven interface using Nuxt UI.
- **Dark Mode**: Fully supported out of the box.

## Tech Stack

- [Nuxt 4](https://nuxt.com)
- [Supabase](https://supabase.com)
- [Nuxt UI](https://ui.nuxt.com)
- [VueUse](https://vueuse.org)

## Setup

### Prerequisites

- Node.js (Latest LTS recommended)
- A Supabase project

### Environment Variables

Create a `.env` file in the root directory:

```bash
NUXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NUXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

### Installation

```bash
pnpm install
```

## Supabase (Local Development)

The project uses [Supabase CLI](https://supabase.com/docs/guides/local-development) for local development.

```bash
# Start local Supabase (DB, Auth, Storage, Realtime)
supabase start

# Reset database (runs all migrations + seeds)
supabase db reset

# Stop local Supabase
supabase stop
```

On start/reset, the following are automatically provisioned:

- **Database schema** — all tables, RLS policies, triggers via migrations in `supabase/migrations/`
- **Avatars storage bucket** — public bucket for user profile images (configured in `config.toml` and via migration)
- **Realtime publications** — for rooms, stories, and votes

Useful local URLs:
| Service | URL |
|---|---|
| Supabase Studio | http://localhost:54323 |
| API | http://localhost:54321 |
| Inbucket (email) | http://localhost:54324 |

### Seed Users

```bash
# Create a test user (requires SEED_USER_EMAIL and SEED_USER_PASSWORD in .env)
pnpm db:seed
```

## Development

Start the development server on `http://localhost:3000`:

```bash
pnpm run dev
```

## Production

Build the application for production:

```bash
pnpm run build
```

## Cloudflare / NuxtHub Hosting

NuxtHub is installed as the Cloudflare hosting layer only. Supabase remains the backend for auth, Postgres, realtime, and avatar storage. The NuxtHub storage features are disabled in `nuxt.config.ts`, so no D1, KV, R2, or cache resources are required yet.

Cloudflare Workers needs these variables set for production and preview environments:

```bash
NUXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NUXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

For local Workers preview, copy `.dev.vars.example` to `.dev.vars` and fill in the same values. Keep `.dev.vars` uncommitted.

Useful commands:

```bash
pnpm run cf:preview
pnpm run cf:deploy
```

When the production URL is known, add it to Supabase Auth redirect URLs so `/confirm` redirects are accepted.
