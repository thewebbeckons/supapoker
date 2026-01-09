-- Restrict room visibility strictly to creators and participants

-- 1. Drop the permissive policy created in the previous relaxation
drop policy if exists "Users can view all rooms" on public.rooms;

-- 2. Creates the strict policy: 
-- A user can see a room IF:
--   a) They created it
--   OR
--   b) They are in the room_participants table for that room
create policy "Users can view their own or joined rooms" 
  on public.rooms for select 
  to authenticated
  using (
    auth.uid() = created_by 
    or 
    exists (
      select 1 from public.room_participants 
      where room_id = rooms.id and user_id = auth.uid()
    )
  );
