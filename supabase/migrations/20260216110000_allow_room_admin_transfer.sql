-- Allow current room admins to transfer admin rights to a joined participant.
-- This keeps a single-admin model using rooms.created_by.

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
