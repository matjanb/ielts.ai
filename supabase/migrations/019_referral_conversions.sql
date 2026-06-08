-- 019_referral_conversions.sql
--
-- Track whether an account has EVER paid (a real Paddle payment), so referral
-- stats count total conversions, not just currently-active subscribers. Set true
-- on payment by the Paddle webhook and never cleared, even after cancellation.

alter table profiles add column if not exists has_paid boolean not null default false;

-- Backfill: anyone who currently holds (or held) a paid period counts as having
-- paid — EXCEPT admin comps (subscription_source = 'admin'), which aren't revenue.
update profiles
   set has_paid = true
 where coalesce(subscription_source, '') <> 'admin'
   and (lifetime_access = true or subscription_expires_at is not null);

-- Redefine the referral funnel so `paid` = ever-paid conversions (has_paid),
-- not just active subscriptions. Same service_role-only lockdown.
create or replace function admin_referral_stats()
returns table (
  code       text,
  name       text,
  is_active  boolean,
  created_at timestamptz,
  signups    bigint,
  paid       bigint
)
language sql
security definer
set search_path = public, auth
as $$
  select r.code,
         r.name,
         r.is_active,
         r.created_at,
         (select count(*) from public.profiles p where p.referred_by = r.code),
         (select count(*) from public.profiles p where p.referred_by = r.code and p.has_paid = true)
  from public.referrers r
  order by r.created_at desc
$$;

revoke all on function admin_referral_stats() from public, anon, authenticated;
grant execute on function admin_referral_stats() to service_role;
