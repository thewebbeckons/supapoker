# agents.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Supapoker is a real-time Planning Poker application built with Nuxt 4, Supabase, and Nuxt UI. The application enables distributed teams to conduct planning poker sessions with real-time voting, presence tracking, and story management.

## Development Commands

### Package Manager

This project uses **pnpm** with workspaces. Always use `pnpm` instead of npm or yarn.

### Core Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Prepare Nuxt (runs automatically after install)
pnpm run postinstall
```

### Local Supabase Development

```bash
# Start local Supabase instance
supabase start

# Stop local Supabase
supabase stop

# View Supabase Studio (http://localhost:54323)
# API: http://localhost:54321
# DB: postgresql://postgres:postgres@localhost:54322/postgres

# Generate TypeScript types from database
supabase gen types typescript --local > app/types/database.types.ts

# Create new migration
supabase migration new <migration_name>

# Reset database (runs all migrations and seeds)
supabase db reset
```

## Architecture Overview

### Technology Stack

- **Framework**: Nuxt 4 (Vue 3) with auto-imports and file-based routing
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase Realtime (WebSocket channels)
- **UI**: Nuxt UI (built on Tailwind CSS)
- **Validation**: Zod schemas
- **State Management**: Composition API + useAsyncData (no Pinia)
- **Package Manager**: pnpm

### Application Structure

```
/app
  /pages                    # File-based routes
    /[id].vue              # Room view (complex stateful page)
    /(auth)/               # Public auth routes group
    index.vue              # Landing page
  /components
    /room/                 # Room-specific components
    /account/              # User profile components
    /app/                  # Global components (Header, Footer)
  /composables             # Reusable composition functions
  /layouts                 # auth.vue, default.vue
  /types                   # database.types.ts (auto-generated)
  /utils                   # schemas.ts (Zod validation)
  /assets/css              # Global styles

/supabase
  /migrations              # Database migrations (versioned)
  config.toml              # Local Supabase configuration
```

### Component Guidelines

- **Use Nuxt UI components first**: Always check [Nuxt UI docs](https://ui.nuxt.com) before building custom components
- **Tailwind CSS**: Use utility classes for styling
- **Component hierarchy**: Pages orchestrate state, components are mostly presentational
- **Modal pattern**: Use v-model for two-way binding with `computed({ get, set })`

## Real-Time Architecture

### Channel Types

The room page (`/rooms/[id].vue`) implements three specialized Supabase Realtime channels:

1. **Presence Channel** (`room:{roomId}`):
   - Tracks online users in real-time
   - Uses Supabase presence mechanism with `user.sub` as key
   - Automatically syncs when users join/leave

2. **Stories Channel** (`room-stories:{roomId}`):
   - Listens to postgres_changes on `stories` table
   - Filters by `room_id`
   - Handles INSERT, UPDATE, DELETE events
   - Triggers UI updates when story status changes

3. **Votes Channel** (`room-votes:{roomId}`):
   - Listens to postgres_changes on `story_votes` table
   - Updates player vote display in real-time
   - Clears votes when voting starts

### Real-Time Patterns

**Optimistic Updates**: UI updates immediately before database confirmation

```typescript
// 1. Update UI optimistically
selectedCard.value = cardValue

// 2. Persist to database
await client.from('story_votes').upsert(...)

// 3. Realtime event confirms change
```

**Channel Lifecycle**:

- Initialize in `onMounted()`
- Clean up in `onUnmounted()` with `channel.unsubscribe()`
- Always filter postgres_changes by `room_id` to reduce bandwidth

**Full Replica Identity**: All tables use `REPLICA IDENTITY FULL` to support complete DELETE event payloads

## Database Schema

### Core Tables

**rooms**

- `id` (uuid, primary key)
- `name`, `description` (text)
- `created_by` (uuid, foreign key to auth.users)
- `created_at`, `updated_at` (timestamp)

**stories**

- `id` (uuid, primary key)
- `room_id` (uuid, foreign key to rooms)
- `title` (text)
- `status` (text enum: pending | active | voting | voted | completed)
- `created_at`, `updated_at` (timestamp)

**story_votes**

- `id` (uuid, primary key)
- `story_id` (uuid, foreign key to stories)
- `user_id` (uuid, foreign key to auth.users)
- `room_id` (uuid, foreign key to rooms)
- `vote_value` (text: "0", "0.5", "1", ... "100", "?", "☕")
- Unique constraint: `(story_id, user_id)`

**room_participants**

- `room_id`, `user_id` (composite primary key)
- `joined_at` (timestamp)

**profile**

- `user_id` (uuid, foreign key to auth.users)
- `name` (text)
- `avatar` (text, URL)

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

- Users can only view rooms they created or participate in
- Only room creators can update/delete rooms
- Only room creators can create/update/delete stories
- Users can only vote in rooms they participate in
- Profiles are publicly readable but only updatable by owner

### Storage

**Avatars Bucket** (`avatars`)

- **Public** bucket — images served via `getPublicUrl()`
- File size limit: 1MB
- Allowed MIME types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`
- Provisioned via SQL migration (`20260214163000_create_avatars_storage_bucket.sql`) and `config.toml`

**Storage RLS Policies** (on `storage.objects`):
| Policy | Operation | Rule |
|---|---|---|
| Public read | SELECT | Anyone can read from `avatars` bucket |
| Auth upload | INSERT | Authenticated users can upload |
| Owner update | UPDATE | Users can update files they own (`auth.uid() = owner`) |
| Owner delete | DELETE | Users can delete files they own |

**Avatar URL Flow**: Upload via `AvatarUpload.vue` → stored in `avatars` bucket → public URL saved to `profile.avatar` column

## Story Lifecycle

Stories progress through states:

```
pending → active → voting → voted → completed
```

**State Transitions** (room creator only):

- Set active: `onSetActive(story)` - changes status to 'active'
- Start voting: `onStartVote()` - changes active story to 'voting'
- Stop voting: `onStopVote()` - changes to 'voted', reveals all votes
- Complete: `onCompleteStory(story)` - changes to 'completed'

**Important**: When status changes to 'voting', all previous votes are cleared to start fresh.

## Authentication Flow

### Supabase Auth Configuration

```typescript
// nuxt.config.ts
supabase: {
  redirectOptions: {
    login: "/login",
    callback: "/confirm",
    exclude: ["/signup", "/", "/forgot-password", "/privacy"]
  }
}
```

### Auth Composables (auto-imported)

```typescript
const user = useSupabaseUser(); // Current session user (reactive)
const client = useSupabaseClient<Database>(); // Typed Supabase client
```

### Profile Management

User profiles are separate from auth and stored in the `profile` table. After signup, create a profile entry:

```typescript
await client.from("profile").upsert({
  user_id: user.value.id,
  name: formData.name,
});
```

## State Management

**No Pinia stores** - uses composition API patterns:

### Page-Level State

```typescript
const { data, refresh, status } = await useAsyncData("key", async () => {
  const { data } = await client.from("table").select("*");
  return data;
});
```

### Component-Level State

```typescript
const value = ref<Type>(initialValue)
const computed = computed(() => /* computation */)
```

### Reactive Updates

- `watch()` for side effects
- `computed()` for derived state
- Real-time subscriptions update refs directly

## Common Patterns

### Voting Cards

Fibonacci sequence: 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100
Special cards: `?` (unknown), `☕` (coffee break)

### Room Creator Checks

```typescript
const isRoomCreator = computed(
  () => room.value?.created_by === user.value?.sub,
);
```

### Toast Notifications

```typescript
const toast = useToast();
toast.add({
  title: "Success",
  description: "Action completed",
  color: "success", // or 'error', 'warning', 'info'
});
```

### Password Validation

Use `usePasswordStrength` composable with `passwordSchema` from utils/schemas.ts:

```typescript
const { passwordStrength, strengthScore, strengthColor } =
  usePasswordStrength(password);
```

### Type Safety

All Supabase queries are type-checked via auto-generated `Database` type:

```typescript
const client = useSupabaseClient<Database>();
const { data } = await client.from("rooms").select("*");
// data is typed as Room[] | null
```

## Important Notes

### Room Participation

When a user enters a room page, they are automatically added to `room_participants` via upsert with `onConflict: 'room_id,user_id'`.

### Client-Only Components

Components using browser APIs (like `useTimeAgo`) must be wrapped in `<ClientOnly>` to prevent SSR hydration mismatches.

### Error Handling

- Supabase errors should be caught and displayed as toasts
- Use `try/catch` blocks for async operations
- Form validation errors should be shown inline

### Performance Considerations

- Nuxt auto-code-splits pages
- Modals use lazy loading (not rendered until opened)
- Computed properties are memoized
- Realtime channels use filters to reduce data transfer
- `useAsyncData` provides automatic caching
