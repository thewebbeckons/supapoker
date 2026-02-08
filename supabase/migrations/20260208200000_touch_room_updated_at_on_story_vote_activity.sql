-- Keep room "last used" timestamps aligned with story and vote activity.

create or replace function public.touch_room_updated_at_from_story_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.rooms
    set updated_at = now()
    where id = new.room_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.rooms
    set updated_at = now()
    where id = new.room_id
       or id = old.room_id;
    return new;
  end if;

  update public.rooms
  set updated_at = now()
  where id = old.room_id;
  return old;
end;
$$;

create or replace function public.touch_room_updated_at_from_vote_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.rooms
    set updated_at = now()
    where id = new.room_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.rooms
    set updated_at = now()
    where id = new.room_id
       or id = old.room_id;
    return new;
  end if;

  update public.rooms
  set updated_at = now()
  where id = old.room_id;
  return old;
end;
$$;

drop trigger if exists touch_room_updated_at_on_story_activity on public.stories;
create trigger touch_room_updated_at_on_story_activity
after insert or update or delete on public.stories
for each row execute function public.touch_room_updated_at_from_story_activity();

drop trigger if exists touch_room_updated_at_on_vote_activity on public.story_votes;
create trigger touch_room_updated_at_on_vote_activity
after insert or update or delete on public.story_votes
for each row execute function public.touch_room_updated_at_from_vote_activity();

-- One-time backfill so existing rooms show the latest known activity.
-- story_votes has no updated_at, so historical vote edits cannot be reconstructed.
with latest_activity as (
  select activity.room_id, max(activity.activity_at) as activity_at
  from (
    select s.room_id, s.updated_at as activity_at
    from public.stories s
    union all
    select v.room_id, v.created_at as activity_at
    from public.story_votes v
  ) activity
  group by activity.room_id
)
update public.rooms r
set updated_at = greatest(r.updated_at, latest_activity.activity_at)
from latest_activity
where r.id = latest_activity.room_id;
