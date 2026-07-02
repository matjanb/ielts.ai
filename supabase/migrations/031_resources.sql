-- 031_resources.sql
--
-- Curated resource bank for the AI coach (stage 4). The evening agent never
-- searches the web — it picks from this hand-curated table by (module,
-- problem_tag). problem_tag values deliberately align with the question types
-- the pattern-analysis layer emits as weak areas (question_subtype falling
-- back to question_type: note_completion, map_labelling, true_false, …), plus
-- a few curated tags (general_plateau, accents, skimming, fluency, weak_vocab)
-- the agent can reach for directly. internal_drill rows deep-link into the
-- existing practice flow (/listening/practice?type=…), which already exists.

create table if not exists resources (
  id            uuid primary key default gen_random_uuid(),
  module        text not null check (module in ('listening', 'reading', 'writing', 'speaking', 'vocabulary')),
  problem_tag   text not null,
  resource_type text not null check (resource_type in ('podcast', 'ted', 'article', 'video', 'internal_drill', 'guide')),
  title         text not null,
  url           text not null,
  instruction   text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (module, problem_tag, title)
);

create index if not exists idx_resources_module_tag
  on resources(module, problem_tag) where is_active;

alter table resources enable row level security;

-- Readable by any signed-in user (the agent shows these to users anyway);
-- writes only via service role — curation happens in the admin/SQL editor.
drop policy if exists "Authenticated can read resources" on resources;
create policy "Authenticated can read resources"
  on resources for select
  to authenticated
  using (is_active);
