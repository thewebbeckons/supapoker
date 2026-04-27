-- Restrict avatar uploads to signed-up users and user-scoped object paths.

drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Signed-up users can upload scoped avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and public.is_non_anonymous_user((select auth.uid()))
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) like 'avatar.%'
    and split_part(name, '/', 3) = ''
  );

create policy "Signed-up users can update scoped avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and public.is_non_anonymous_user((select auth.uid()))
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) like 'avatar.%'
    and split_part(name, '/', 3) = ''
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and public.is_non_anonymous_user((select auth.uid()))
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) like 'avatar.%'
    and split_part(name, '/', 3) = ''
  );

create policy "Signed-up users can delete scoped avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and public.is_non_anonymous_user((select auth.uid()))
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) like 'avatar.%'
    and split_part(name, '/', 3) = ''
  );
