-- Harden room ownership, realtime authorization, and voting transitions.

do $$
begin
  if exists (
    select 1
    from public.rooms
    where created_by is null
  ) then
    raise exception 'Cannot enforce NOT NULL on public.rooms.created_by while rows with null owners exist.';
  end if;
end;
$$;

alter table public.rooms
alter column created_by set not null;

alter policy "Users can create rooms" on public.rooms
with check (
  ((select auth.role()) = 'authenticated'::text)
  and public.is_non_anonymous_user((select auth.uid()))
  and created_by = (select auth.uid())
);

create or replace function public.try_parse_uuid(value text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then value::uuid
    else null
  end;
$$;

create or replace function public.realtime_topic_room_id(topic text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when topic like 'room:%'
      then public.try_parse_uuid(split_part(topic, ':', 2))
    when topic like 'room-meta:%'
      then public.try_parse_uuid(split_part(topic, ':', 2))
    when topic like 'room-stories:%'
      then public.try_parse_uuid(split_part(topic, ':', 2))
    when topic like 'room-votes:%'
      then public.try_parse_uuid(split_part(topic, ':', 2))
    else null
  end;
$$;

create or replace function public.realtime_topic_user_id(topic text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when topic like 'rooms-list:%'
      then public.try_parse_uuid(split_part(topic, ':', 2))
    else null
  end;
$$;

create or replace function public.can_access_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = target_room_id
      and (
        r.created_by = (select auth.uid())
        or exists (
          select 1
          from public.room_participants rp
          where rp.room_id = r.id
            and rp.user_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function public.can_access_room(uuid) from public;
grant execute on function public.can_access_room(uuid) to authenticated;
grant execute on function public.can_access_room(uuid) to service_role;

drop policy if exists "Authenticated users can receive room realtime messages" on realtime.messages;
create policy "Authenticated users can receive room realtime messages"
on realtime.messages
for select
to authenticated
using (
  public.realtime_topic_user_id(realtime.topic()) = (select auth.uid())
  or (
    public.realtime_topic_room_id(realtime.topic()) is not null
    and public.can_access_room(public.realtime_topic_room_id(realtime.topic()))
  )
);

drop policy if exists "Authenticated users can send room realtime messages" on realtime.messages;
create policy "Authenticated users can send room realtime messages"
on realtime.messages
for insert
to authenticated
with check (
  extension in ('broadcast', 'presence')
  and (
    public.realtime_topic_user_id(realtime.topic()) = (select auth.uid())
    or (
      public.realtime_topic_room_id(realtime.topic()) is not null
      and public.can_access_room(public.realtime_topic_room_id(realtime.topic()))
    )
  )
);

create or replace function public.start_story_vote(p_room_id uuid, p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requesting_user_id uuid := (select auth.uid());
  story_room_id uuid;
begin
  if requesting_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.rooms
    where id = p_room_id
      and created_by = requesting_user_id
  ) then
    raise exception 'Only the room admin can start voting'
      using errcode = '42501';
  end if;

  select room_id
  into story_room_id
  from public.stories
  where id = p_story_id
  for update;

  if not found then
    raise exception 'Story not found'
      using errcode = 'P0002';
  end if;

  if story_room_id <> p_room_id then
    raise exception 'Story does not belong to this room'
      using errcode = '23514';
  end if;

  delete from public.story_votes
  where story_id = p_story_id;

  update public.stories
  set status = 'voting',
      updated_at = now()
  where id = p_story_id;
end;
$$;

revoke all on function public.start_story_vote(uuid, uuid) from public;
grant execute on function public.start_story_vote(uuid, uuid) to authenticated;
grant execute on function public.start_story_vote(uuid, uuid) to service_role;
