-- 020_referral_users.sql
--
-- Drill-down for the admin Referrals panel: the actual people a creator brought
-- in (email, when they joined, whether they paid). Reads auth.users for the
-- email, so it's SECURITY DEFINER and locked to service_role like the other
-- admin_* functions.

create or replace function admin_referral_users(ref_code text)
returns table (
  email               text,
  referred_at         timestamptz,
  created_at          timestamptz,
  has_paid            boolean,
  subscription_status text
)
language sql
security definer
set search_path = public, auth
as $$
  select u.email::text,
         p.referred_at,
         u.created_at,
         p.has_paid,
         p.subscription_status::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.referred_by = ref_code
  order by p.has_paid desc, p.referred_at desc nulls last, u.created_at desc
$$;

revoke all on function admin_referral_users(text) from public, anon, authenticated;
grant execute on function admin_referral_users(text) to service_role;
