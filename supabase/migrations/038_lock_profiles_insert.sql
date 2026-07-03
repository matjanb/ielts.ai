-- 038_lock_profiles_insert.sql
--
-- Follow-up to 035. The "Service can insert profiles" policy is `with check
-- (true)` with no TO clause (applies to every role), and the default INSERT
-- grant covers every column — so an authenticated user whose profile row is
-- missing could self-insert one with is_admin/lifetime_access set. Profiles
-- are only ever created by the signup trigger (SECURITY DEFINER, runs as the
-- table owner) and service-role routes, neither of which needs this grant.

revoke insert on public.profiles from anon, authenticated;
