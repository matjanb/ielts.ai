-- 024_streak_freezes.sql
--
-- Streak upgrades: a small store on the profile for streak freezes (earned, then
-- auto-spent to bridge a single missed day) and a record of which days a freeze
-- has already covered (so the streak recomputes consistently). streak_last_award
-- tracks the streak length we last granted a freeze for, so each new 7-day mark
-- grants exactly once.

alter table profiles add column if not exists streak_freezes     int   not null default 0;
alter table profiles add column if not exists streak_frozen_days  jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists streak_last_award   int   not null default 0;
