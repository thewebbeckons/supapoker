-- Optimize RLS policy expressions by wrapping auth helpers in SELECT.
-- This prevents per-row re-evaluation in policy predicates.

ALTER POLICY "Detailed update policy for room creators" ON "public"."rooms"
USING (((SELECT auth.uid()) = "created_by"));

ALTER POLICY "Room creators can delete stories" ON "public"."stories"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "stories"."room_id")
      AND ("rooms"."created_by" = (SELECT auth.uid()))
  )
);

ALTER POLICY "Room creators can insert stories" ON "public"."stories"
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "stories"."room_id")
      AND ("rooms"."created_by" = (SELECT auth.uid()))
  )
);

ALTER POLICY "Room creators can update stories" ON "public"."stories"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "stories"."room_id")
      AND ("rooms"."created_by" = (SELECT auth.uid()))
  )
);

ALTER POLICY "Room participants can delete own vote" ON "public"."story_votes"
USING (((SELECT auth.uid()) = "user_id"));

ALTER POLICY "Room participants can insert own vote" ON "public"."story_votes"
WITH CHECK (
  ((SELECT auth.uid()) = "user_id")
  AND EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "story_votes"."room_id")
      AND (
        ("rooms"."created_by" = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM "public"."room_participants"
          WHERE ("room_participants"."room_id" = "rooms"."id")
            AND ("room_participants"."user_id" = (SELECT auth.uid()))
        )
      )
  )
);

ALTER POLICY "Room participants can update own vote" ON "public"."story_votes"
USING (((SELECT auth.uid()) = "user_id"));

ALTER POLICY "Room participants can view stories" ON "public"."stories"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "stories"."room_id")
      AND (
        ("rooms"."created_by" = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM "public"."room_participants"
          WHERE ("room_participants"."room_id" = "rooms"."id")
            AND ("room_participants"."user_id" = (SELECT auth.uid()))
        )
      )
  )
);

ALTER POLICY "Room participants can view story votes" ON "public"."story_votes"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."rooms"
    WHERE ("rooms"."id" = "story_votes"."room_id")
      AND (
        ("rooms"."created_by" = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM "public"."room_participants"
          WHERE ("room_participants"."room_id" = "rooms"."id")
            AND ("room_participants"."user_id" = (SELECT auth.uid()))
        )
      )
  )
);

ALTER POLICY "Users can create rooms" ON "public"."rooms"
WITH CHECK (((SELECT auth.role()) = 'authenticated'::text));

ALTER POLICY "Users can view their own or joined rooms" ON "public"."rooms"
USING (
  ((SELECT auth.uid()) = "created_by")
  OR EXISTS (
    SELECT 1
    FROM "public"."room_participants"
    WHERE ("room_participants"."room_id" = "rooms"."id")
      AND ("room_participants"."user_id" = (SELECT auth.uid()))
  )
);

ALTER POLICY "delete_room_participants" ON "public"."room_participants"
USING (((SELECT auth.uid()) = "user_id"));

ALTER POLICY "insert_room_participants" ON "public"."room_participants"
WITH CHECK (((SELECT auth.uid()) = "user_id"));

ALTER POLICY "select_room_participants" ON "public"."room_participants"
USING (
  ("room_id" IN (SELECT "public"."get_user_room_ids"() AS "get_user_room_ids"))
  OR ("user_id" = (SELECT auth.uid()))
);

ALTER POLICY "update_room_participants" ON "public"."room_participants"
USING (((SELECT auth.uid()) = "user_id"));
