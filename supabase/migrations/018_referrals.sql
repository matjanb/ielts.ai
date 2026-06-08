-- 018_referrals.sql
--
-- Referral attribution for UGC creators. Each creator gets a short readable code
-- (e.g. ?ref=anna). When a visitor arrives with ?ref=<code>, middleware stores it
-- in a cookie; on their first authenticated callback we stamp profiles.referred_by
-- (first-touch, never overwritten). The admin panel reads aggregate stats.

create table if not exists referrers (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,           -- lowercase handle used in ?ref=
  name       text,                           -- display name of the creator
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Who referred this user, captured once at signup. Plain text code (not an FK) so
-- attribution survives even if a referrer row is later renamed or removed.
alter table profiles add column if not exists referred_by  text;
alter table profiles add column if not exists referred_at  timestamptz;
create index if not exists profiles_referred_by_idx on profiles (referred_by);

-- referrers is managed only by the admin API (service role). Lock out anon/auth.
alter table referrers enable row level security;
revoke all on referrers from anon, authenticated;

-- Per-creator funnel: signups + how many became paying. service_role only, same
-- lockdown as the other admin_* functions.
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
         (select count(*) from public.profiles p
            where p.referred_by = r.code
              and (p.lifetime_access = true
                   or (p.subscription_expires_at is not null and p.subscription_expires_at > now())))
  from public.referrers r
  order by r.created_at desc
$$;

revoke all on function admin_referral_stats() from public, anon, authenticated;
grant execute on function admin_referral_stats() to service_role;
