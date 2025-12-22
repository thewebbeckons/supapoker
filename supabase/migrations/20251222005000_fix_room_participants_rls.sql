-- Consolidate and fix RLS policies for room_participants

-- 1. Ensure the helper function exists and is correct
create or replace function public.get_user_room_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select room_id 
  from public.room_participants 
  where user_id = auth.uid();
$$;

-- 2. Drop all existing policies to start fresh and avoid conflicts
drop policy if exists "Users can view their own participation" on public.room_participants;
drop policy if exists "Users can view room participants" on public.room_participants;
drop policy if exists "Users can join rooms" on public.room_participants;
drop policy if exists "Users can update their own participation" on public.room_participants;
drop policy if exists "Users can leave rooms" on public.room_participants;

-- 3. Create comprehensive policies

-- SELECT: Users can see all participants in rooms they are part of
-- This relies on the security definer function to avoid recursion
create policy "select_room_participants" 
  on public.room_participants for select 
  using (
    room_id in (select public.get_user_room_ids())
    or
    -- Also allow seeing self (needed for initial check or if function latency issues exist)
    user_id = auth.uid()
  );

-- INSERT: Users can insert rows where user_id matches their own ID
-- This is used for "Joining" a room
create policy "insert_room_participants" 
  on public.room_participants for insert 
  with check (auth.uid() = user_id);

-- UPDATE: Users can update their own rows
-- This is used for "Upsert" when the user is already in the room (updating joined_at)
create policy "update_room_participants" 
  on public.room_participants for update 
  using (auth.uid() = user_id);

-- DELETE: Users can delete their own rows
-- This is used for "Leaving" a room
create policy "delete_room_participants" 
  on public.room_participants for delete 
  using (auth.uid() = user_id);
