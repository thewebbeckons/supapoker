-- Add tables to the publication to enable Realtime
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.story_votes;
