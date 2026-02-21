-- Allow anonymous users to participate, but prevent them from becoming room admins.

CREATE OR REPLACE FUNCTION public.is_non_anonymous_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = target_user_id
      AND u.is_anonymous IS FALSE
      AND COALESCE(u.raw_app_meta_data ->> 'provider', '') <> 'anonymous'
  );
$$;

REVOKE ALL ON FUNCTION public.is_non_anonymous_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_non_anonymous_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_non_anonymous_user(uuid) TO service_role;

ALTER POLICY "Users can create rooms" ON "public"."rooms"
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated'::text)
  AND public.is_non_anonymous_user((SELECT auth.uid()))
);

ALTER POLICY "Detailed update policy for room creators" ON "public"."rooms"
USING (((SELECT auth.uid()) = "created_by"))
WITH CHECK (
  (
    (SELECT auth.uid()) = "created_by"
  )
  OR EXISTS (
    SELECT 1
    FROM "public"."room_participants"
    WHERE ("room_participants"."room_id" = "rooms"."id")
      AND ("room_participants"."user_id" = "rooms"."created_by")
      AND public.is_non_anonymous_user("room_participants"."user_id")
  )
);
