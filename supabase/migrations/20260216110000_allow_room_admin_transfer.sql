-- Allow current room admins to transfer admin rights to a joined participant.
-- This keeps a single-admin model using rooms.created_by.

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
  )
);
