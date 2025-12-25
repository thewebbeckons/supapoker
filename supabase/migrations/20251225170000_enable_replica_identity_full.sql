-- Enable REPLICA IDENTITY FULL for realtime filtering on non-PK columns
-- This is required for postgres_changes subscriptions with filters like `room_id=eq.X`
-- to receive UPDATE events (otherwise the filter can't match the OLD row)

ALTER TABLE public.stories REPLICA IDENTITY FULL;
ALTER TABLE public.story_votes REPLICA IDENTITY FULL;
