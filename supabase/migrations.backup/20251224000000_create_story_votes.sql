-- Create story_votes table
create table public.story_votes (
  id uuid not null primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_value numeric not null,
  unique(story_id, user_id) -- One vote per user per story
);

-- Enable RLS
alter table public.story_votes enable row level security;

-- Policies

-- Select: Room participants can view votes
create policy "Room participants can view story votes" 
  on public.story_votes for select 
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = story_votes.room_id
      and (
        rooms.created_by = auth.uid()
        or exists (
          select 1 from public.room_participants
          where room_id = rooms.id and user_id = auth.uid()
        )
      )
    )
  );

-- Insert: Room participants can insert their own vote
create policy "Room participants can insert own vote" 
  on public.story_votes for insert 
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.rooms
      where rooms.id = story_votes.room_id
      and (
        rooms.created_by = auth.uid()
        or exists (
          select 1 from public.room_participants
          where room_id = rooms.id and user_id = auth.uid()
        )
      )
    )
  );

-- Update: Room participants can update their own vote
create policy "Room participants can update own vote" 
  on public.story_votes for update 
  using (
    auth.uid() = user_id
  );

-- Delete: Room participants can delete their own vote (if needed)
create policy "Room participants can delete own vote" 
  on public.story_votes for delete 
  using (
    auth.uid() = user_id
  );
