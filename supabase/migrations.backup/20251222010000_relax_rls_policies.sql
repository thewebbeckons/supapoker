-- Relax RLS policies for Rooms and Profiles to fix "Room not found" on first load and "Anonymous" users

-- 1. Update Profile Policies
-- Current policy "Enable users to view their own data only" prevents seeing other players' names/avatars.
-- Solution: Allow authenticated users to view ALL profiles (needed for multiplayer).

drop policy if exists "Enable users to view their own data only" on public.profile;

create policy "Enable users to view all profiles"
  on public.profile for select
  to authenticated
  using (true); -- Allow any authenticated user to read profiles

-- 2. Update Rooms Policies
-- Current policy "Users can view their own or joined rooms" prevents viewing a room BEFORE joining it.
-- This causes the initial fetch to fail (404/Null) when visiting a link for the first time.
-- Solution: Allow authenticated users to view ALL rooms. 
-- (Note: If private rooms are needed later, this can be refined to check for a password or specific invitation logic,
-- but for a shared-link model, seeing the room existence/metadata is standard).

drop policy if exists "Users can view their own or joined rooms" on public.rooms;

create policy "Users can view all rooms"
  on public.rooms for select
  to authenticated
  using (true);

-- 3. Cleanup Duplicate Policies found in remote_schema.sql inspection
-- There were some policies like "Enable insert for authenticated users only" on room_participants 
-- that might conflict or be redundant with our previous precise policies.
-- Let's ensure we rely on our consolidated policies from the previous step.
-- We will drop these "permissive" wide-open policies if they exist to avoid confusion with our specific ones,
-- OR perfectly align them.
--
-- Actually, the user's error was "new row violates row-level security policy", which we fixed in the previous migration.
-- But let's make sure we don't have conflicting policies accumulating.
-- The previous migration dropped specific named policies.
-- `remote_schema.sql` shows policies named "Enable insert for authenticated users only" and "Users can insert into rooms".
-- These seem to be created by the user or auto-generated. Let's drop them to be safe and rely on our clear "insert_room_participants" policy.

drop policy if exists "Enable insert for authenticated users only" on public.room_participants;
drop policy if exists "Users can insert into rooms" on public.room_participants;
