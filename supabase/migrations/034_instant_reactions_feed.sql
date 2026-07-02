-- 034_instant_reactions_feed.sql
--
-- Instant post-test reactions now land in agent_messages too, so they show up
-- in the notifications panel and the floating coach card — not only on the
-- results screen. They get their own signal_type so the evening digest's
-- anti-spam ignores them (a constructor reaction must not silence the digest).

alter table agent_messages drop constraint if exists agent_messages_signal_type_check;
alter table agent_messages add constraint agent_messages_signal_type_check
  check (signal_type in ('inactivity', 'plateau', 'repeated_error', 'positive', 'instant_reaction'));
