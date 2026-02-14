-- Allow authenticated users to create their own profile row if missing.

drop policy if exists "Users can insert own profile" on public.profile;

create policy "Users can insert own profile"
on public.profile
for insert
to authenticated
with check ((select auth.uid()) = user_id);
