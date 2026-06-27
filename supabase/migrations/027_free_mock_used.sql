-- 027_free_mock_used.sql
--
-- Authoritative "the one free mock is gone" flag. Free (non-subscribed) users
-- may take exactly ONE full mock test, ever; this boolean — not derived
-- ai_usage counts — is the source of truth, flipped atomically by
-- POST /api/mock/start with a conditional UPDATE so two tabs can't both win.
-- Additive and scoped to `profiles` only; touches no other table or data.

alter table profiles
  add column if not exists free_mock_used boolean not null default false;

alter table profiles
  add column if not exists free_mock_started_at timestamptz;
