-- 029_anon_checker_usage.sql
--
-- Per-IP daily rate limit for the public (no-login) essay checker, so anonymous
-- visitors can't burn AI credits. Keyed by a salted hash of the IP (never the raw
-- IP) + day. Additive and self-contained; server-only writes.

create table if not exists anon_checker_usage (
  ip_hash    text not null,
  day        date not null,
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip_hash, day)
);

alter table anon_checker_usage enable row level security;
revoke all on anon_checker_usage from anon, authenticated;
