-- 039_lock_funnel_view.sql
--
-- Security fix (Supabase advisor 0010, ERROR). The `funnel_by_source` view was
-- readable by anon/authenticated AND ran with the definer's rights, so it
-- bypassed the RLS on funnel_events — anyone with the public anon key could
-- read the business funnel (landings, signups, checkouts, purchases,
-- conversion %). The admin panel does NOT use this view (app/api/admin/funnel
-- aggregates funnel_events directly with the service role), so locking it down
-- breaks nothing.
--
-- Two-part fix: (1) revoke the public SELECT grant; (2) recreate the view with
-- security_invoker so it enforces the querying user's RLS instead of the
-- creator's — defence in depth if a grant is ever re-added. Service-role
-- queries (SQL editor, server routes) still bypass RLS and see everything.

revoke all on public.funnel_by_source from anon, authenticated;

alter view public.funnel_by_source set (security_invoker = on);
