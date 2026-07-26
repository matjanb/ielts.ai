-- Telegram upsell nudges for free linked users (hard-sell templates, no AI).
-- agent_messages rows with signal_type 'upsell' power the anti-spam cooldown
-- (72h between nudges, lifetime cap) — see lib/agent/upsell.server.ts.
alter table agent_messages drop constraint if exists agent_messages_signal_type_check;
alter table agent_messages add constraint agent_messages_signal_type_check
  check (signal_type in ('inactivity', 'plateau', 'repeated_error', 'positive', 'instant_reaction', 'upsell'));
