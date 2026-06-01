-- ============================================================
-- Study plan: track start date + per-task completion progress.
-- progress is a flat JSON map of "<week>:<dayIndex>" -> true.
-- ============================================================

alter table study_plans add column if not exists started_at date not null default current_date;
alter table study_plans add column if not exists progress   jsonb not null default '{}';
