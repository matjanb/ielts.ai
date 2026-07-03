-- 037_promo_cap_enforced.sql
--
-- max_redemptions was only checked at /api/promo/validate time, so everyone
-- who validated before the cap filled could still complete checkout after it —
-- the cap was advisory. The discount itself is Paddle's to apply (money already
-- moved by webhook time), so the enforceable moment is: when a redemption hits
-- the cap, atomically deactivate the code so validate rejects everyone after.

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
    update public.promo_codes
       set redemption_count = redemption_count + 1,
           is_active = case
             when max_redemptions is not null and redemption_count + 1 >= max_redemptions
               then false
             else is_active
           end
     where code = v_code;
  end if;
end;
$$;

revoke all on function record_promo_redemption(text, uuid) from public, anon, authenticated;
grant execute on function record_promo_redemption(text, uuid) to service_role;
