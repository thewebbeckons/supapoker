-- Create rooms table
create table public.rooms (
  id uuid not null primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  current_story_card text, -- Information about the current story being voted on
  created_by uuid references auth.users(id) on delete set null
);

-- Create room_participants table to track join history/access
create table public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;

-- Policies for rooms

-- Select: Users see rooms they created OR rooms they are partial of
create policy "Users can view their own or joined rooms" 
  on public.rooms for select 
  using (
    auth.uid() = created_by 
    or 
    exists (
      select 1 from public.room_participants 
      where room_id = rooms.id and user_id = auth.uid()
    )
  );

create policy "Users can create rooms" 
  on public.rooms for insert 
  with check (auth.role() = 'authenticated');

create policy "Detailed update policy for room creators" 
  on public.rooms for update 
  using (auth.uid() = created_by);

-- Policies for room_participants

create policy "Users can view their own participation" 
  on public.room_participants for select 
  using (auth.uid() = user_id);

create policy "Users can join rooms" 
  on public.room_participants for insert 
  with check (auth.uid() = user_id);

create policy "Users can leave rooms" 
  on public.room_participants for delete 
  using (auth.uid() = user_id);
  
-- Function to handle updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.rooms
  for each row execute procedure extensions.moddatetime (updated_at);
