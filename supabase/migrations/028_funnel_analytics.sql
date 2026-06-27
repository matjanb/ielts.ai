-- 028_funnel_analytics.sql
--
-- Funnel analytics: capture where users come from (UTM, first-touch) and log the
-- key steps from landing → paywall → purchase so drop-off is visible per channel.
-- Additive and self-contained — new tables + one view only; touches nothing else.

-- First-touch attribution per signed-up user (one row per user).
create table if not exists user_attribution (
  user_id       uuid primary key references profiles(id) on delete cascade,
  anon_id       text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,
  landing_path  text,
  created_at    timestamptz not null default now()
);

-- Raw funnel events. user_id is null before signup; anon_id stitches the
-- anonymous → signed-up journey together.
create table if not exists funnel_events (
  id           uuid primary key default gen_random_uuid(),
  event        text not null,
  user_id      uuid references profiles(id) on delete set null,
  anon_id      text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  path         text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists funnel_events_event_created_idx on funnel_events (event, created_at);
create index if not exists funnel_events_anon_idx on funnel_events (anon_id);
create index if not exists funnel_events_user_idx on funnel_events (user_id);

-- Written only by the server (service_role / admin client); lock out anon/auth.
alter table user_attribution enable row level security;
alter table funnel_events    enable row level security;
revoke all on user_attribution from anon, authenticated;
revoke all on funnel_events    from anon, authenticated;

-- Per-channel funnel: one row per utm_source per day with each step's distinct
-- visitors (by anon_id, falling back to user_id) and the headline conversions.
create or replace view funnel_by_source as
with ev as (
  select
    date_trunc('day', created_at)::date as day,
    coalesce(nullif(utm_source, ''), 'direct') as source,
    event,
    coalesce(anon_id, user_id::text) as actor
  from funnel_events
)
select
  day,
  source,
  count(distinct actor) filter (where event = 'landing_viewed')     as landing,
  count(distinct actor) filter (where event = 'signup_completed')   as signups,
  count(distinct actor) filter (where event = 'mock_test_started')  as mock_started,
  count(distinct actor) filter (where event = 'paywall_viewed')     as paywall,
  count(distinct actor) filter (where event = 'checkout_started')   as checkout,
  count(distinct actor) filter (where event = 'purchase_completed') as purchases,
  round(100.0 * count(distinct actor) filter (where event = 'signup_completed')
        / nullif(count(distinct actor) filter (where event = 'landing_viewed'), 0), 1) as landing_to_signup_pct,
  round(100.0 * count(distinct actor) filter (where event = 'paywall_viewed')
        / nullif(count(distinct actor) filter (where event = 'signup_completed'), 0), 1) as signup_to_paywall_pct,
  round(100.0 * count(distinct actor) filter (where event = 'purchase_completed')
        / nullif(count(distinct actor) filter (where event = 'paywall_viewed'), 0), 1) as paywall_to_purchase_pct
from ev
group by day, source
order by day desc, signups desc;
