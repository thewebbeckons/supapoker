-- Create stories table
create table public.stories (
  id uuid not null primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  status text not null default 'pending', -- pending, active, completed
  created_by uuid references auth.users(id) on delete set null
);

-- Enable RLS
alter table public.stories enable row level security;

-- Policies

-- Select: Room participants (creator or joined) can view stories
create policy "Room participants can view stories" 
  on public.stories for select 
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = stories.room_id
      and (
        rooms.created_by = auth.uid()
        or exists (
          select 1 from public.room_participants
          where room_id = rooms.id and user_id = auth.uid()
        )
      )
    )
  );

-- Insert: Room creators can create stories (or anyone who can edit the room)
-- Assuming checking room ownership for now as per "creator can add stories"
create policy "Room creators can insert stories" 
  on public.stories for insert 
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = stories.room_id
      and rooms.created_by = auth.uid()
    )
  );

-- Update: Room creators can update stories
create policy "Room creators can update stories" 
  on public.stories for update 
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = stories.room_id
      and rooms.created_by = auth.uid()
    )
  );

-- Delete: Room creators can delete stories
create policy "Room creators can delete stories" 
  on public.stories for delete 
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = stories.room_id
      and rooms.created_by = auth.uid()
    )
  );

-- Trigger for updated_at
create trigger handle_updated_at before update on public.stories
  for each row execute procedure extensions.moddatetime (updated_at);
