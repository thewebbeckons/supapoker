-- Allow users to update their own participation
-- This is required for the upsert functionality to work when a user 
-- visits a room they have already joined (updating joined_at)

create policy "Users can update their own participation"
  on public.room_participants for update
  using (auth.uid() = user_id);
