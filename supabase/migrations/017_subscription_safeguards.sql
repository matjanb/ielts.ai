-- 017_subscription_safeguards.sql
--
-- Make access "secure by default": a paid subscription is always time-bounded by
-- subscription_expires_at, and ONLY an explicit lifetime_access flag grants
-- forever. Previously `subscription_status = 'pro'` granted access unconditionally,
-- so a one-time/misconfigured Paddle charge or a missed cancellation webhook could
-- hand out permanent access. With this change, access lapses automatically when
-- the paid period ends unless lifetime_access is set on purpose (admin "forever").
--
-- Also records which plan was bought (1mo/3mo/12mo/admin) and where it came from
-- (paddle/admin), for support and reporting.

alter table profiles add column if not exists lifetime_access   boolean not null default false;
alter table profiles add column if not exists subscription_plan   text;
alter table profiles add column if not exists subscription_source text;

-- Grandfather everyone who currently HAS access via the old status='pro' shortcut
-- but has no future expiry (i.e. permanent today): convert them to explicit
-- lifetime so nobody loses access the moment this deploys. New purchases after
-- this migration are always time-bounded by the webhook.
update profiles
   set lifetime_access = true
 where subscription_status = 'pro'
   and (subscription_expires_at is null or subscription_expires_at <= now());

-- Expose the new fields to the admin panel lookup. The return signature changes,
-- so drop and recreate (create-or-replace can't change OUT columns). Same lockdown
-- as before: service_role only.
drop function if exists admin_list_users(text, int);
create function admin_list_users(search text default null, lim int default 100)
returns table (
  id uuid,
  email text,
  subscription_status text,
  subscription_expires_at timestamptz,
  lifetime_access boolean,
  subscription_plan text,
  subscription_source text,
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
         p.lifetime_access,
         p.subscription_plan,
         p.subscription_source,
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

-- Count lifetime holders as active subscribers in the dashboard stats too.
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
       where lifetime_access = true
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
