select tgname
from pg_trigger
where tgrelid in ('public.stories'::regclass, 'public.story_votes'::regclass)
  and tgname in (
    'touch_room_updated_at_on_story_activity',
    'touch_room_updated_at_on_vote_activity'
  )
  and not tgisinternal;
