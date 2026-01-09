-- Create a security definer function to get the current user's rooms
-- This helps avoid infinite recursion in RLS policies
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

-- Update Policies for room_participants

-- Drop the old restrictive policy (was "Users can view their own participation")
drop policy if exists "Users can view their own participation" on public.room_participants;

-- Create new policy: Users can view all participants in rooms they belong to
create policy "Users can view room participants" 
  on public.room_participants for select 
  using (
    -- User sees the row if the room_id is in the list of rooms they have joined
    room_id in (select public.get_user_room_ids())
  );
