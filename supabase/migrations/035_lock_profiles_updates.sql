-- 035_lock_profiles_updates.sql
--
-- CRITICAL security fix. The "Users can update own profile" RLS policy limits
-- WHICH ROWS a user can update, but not WHICH COLUMNS. Supabase's default
-- table-level grants give `authenticated` UPDATE on every column, so any
-- logged-in user could PATCH their own row via the REST API and set
-- is_admin=true, lifetime_access=true, subscription_status='pro',
-- free_mock_used=false, etc.
--
-- Fix: replace the blanket UPDATE grant with a column allowlist covering only
-- the fields the app legitimately edits from the client (settings form,
-- onboarding, language switcher). Billing/admin/streak/referral columns are
-- written exclusively by server-side routes using the service role, which
-- bypasses these grants.

revoke update on public.profiles from anon, authenticated;

grant update (
  full_name,
  avatar_url,
  country,
  target_band_score,
  current_level,
  onboarding_completed,
  preferred_language,
  updated_at
) on public.profiles to authenticated;
