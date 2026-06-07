-- 016_admin_panel.sql
--
-- Admin panel support: an is_admin flag on profiles, and a locked-down lookup
-- function that joins auth.users (for email) with profiles (for subscription).

alter table profiles add column if not exists is_admin boolean not null default false;

-- SECURITY DEFINER so it can read auth.users; execute is granted ONLY to the
-- service_role (used by the admin API after an is_admin check), never to anon or
-- authenticated — so a normal logged-in user can't call it to harvest emails.
create or replace function admin_list_users(search text default null, lim int default 100)
returns table (
  id uuid,
  email text,
  subscription_status text,
  subscription_expires_at timestamptz,
  created_at timestamptz,
  is_admin boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select u.id,
         u.email::text,
         p.subscription_status::text,
         p.subscription_expires_at,
         u.created_at,
         p.is_admin
  from auth.users u
  join public.profiles p on p.id = u.id
  where search is null or search = '' or u.email ilike '%' || search || '%'
  order by u.created_at desc
  limit greatest(1, least(lim, 200))
$$;

revoke all on function admin_list_users(text, int) from public, anon, authenticated;
grant execute on function admin_list_users(text, int) to service_role;

-- Aggregate stats for the admin dashboard. Same lockdown: service_role only.
create or replace function admin_stats()
returns table (
  total_users        bigint,
  active_subscribers bigint,
  new_today          bigint,
  new_7d             bigint,
  ai_today           bigint,
  writing_total      bigint,
  speaking_total     bigint,
  attempts_total     bigint
)
language sql
security definer
set search_path = public, auth
as $$
  select
    (select count(*) from auth.users),
    (select count(*) from public.profiles
       where subscription_status = 'pro'
          or (subscription_expires_at is not null and subscription_expires_at > now())),
    (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    (select count(*) from public.ai_usage where created_at >= date_trunc('day', now())),
    (select count(*) from public.writing_submissions),
    (select count(*) from public.speaking_submissions),
    (select count(*) from public.user_attempts where completed_at is not null)
$$;

revoke all on function admin_stats() from public, anon, authenticated;
grant execute on function admin_stats() to service_role;
