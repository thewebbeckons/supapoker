-- Fix Supabase lint warning: role mutable search_path on SECURITY DEFINER function.
ALTER FUNCTION "public"."create_profile_on_auth_user_insert"()
SET search_path = public;
