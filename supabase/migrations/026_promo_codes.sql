-- 026_promo_codes.sql
--
-- Promo codes for checkout discounts. A code is a friendly handle (e.g. SUMMER50)
-- that maps to a Paddle discount id (dsc_xxx). The visitor types the code on the
-- subscription page; we validate it server-side and pass the Paddle discount id
-- to the overlay checkout, where Paddle enforces the actual price reduction.
--
-- We never compute the discount ourselves — Paddle is the source of truth for
-- money. Our table only owns the friendly code → discount mapping plus our own
-- gating (active flag, expiry, redemption cap) and redemption stats.

create table if not exists promo_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,         -- stored UPPERCASE, shown to users
  paddle_discount_id text not null,                -- dsc_xxx from the Paddle dashboard
  description        text,                          -- internal note / campaign name
  percent_off        int,                           -- display only (the real % lives in Paddle)
  is_active          boolean not null default true,
  expires_at         timestamptz,                   -- optional: code stops working after this
  max_redemptions    int,                           -- optional: cap on distinct redeemers
  redemption_count   int not null default 0,        -- distinct users who completed a purchase
  created_at         timestamptz not null default now()
);

-- Who actually redeemed which code (one row per distinct user). Plain-text code
-- so the log survives a code rename/removal. user_id nulls out if the user is
-- deleted, keeping the historical count intact.
create table if not exists promo_redemptions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- One redemption per (code, user) so renewals on the same discount don't inflate
-- the count and ON CONFLICT can dedupe.
create unique index if not exists promo_redemptions_code_user_idx
  on promo_redemptions (code, user_id);

-- Both tables are managed only by the admin API and the Paddle webhook (service
-- role). The public validate endpoint also runs server-side with the service
-- role, so no anon/authenticated access is needed. Lock them down like the other
-- admin tables.
alter table promo_codes enable row level security;
revoke all on promo_codes from anon, authenticated;
alter table promo_redemptions enable row level security;
revoke all on promo_redemptions from anon, authenticated;

-- Atomically record a redemption: log the user once and bump the counter only
-- when a new row was actually inserted (so the count = distinct redeemers, never
-- inflated by webhook retries or subscription renewals on the same discount).
-- security definer + service_role-only execute, same lockdown as the admin_* fns.
create or replace function record_promo_redemption(p_discount_id text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_code text;
  v_rows int;
begin
  select code into v_code from public.promo_codes where paddle_discount_id = p_discount_id;
  if v_code is null then return; end if;

  insert into public.promo_redemptions (code, user_id)
  values (v_code, p_user_id)
  on conflict (code, user_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.promo_codes set redemption_count = redemption_count + 1 where code = v_code;
  end if;
end;
$$;

revoke all on function record_promo_redemption(text, uuid) from public, anon, authenticated;
grant execute on function record_promo_redemption(text, uuid) to service_role;
