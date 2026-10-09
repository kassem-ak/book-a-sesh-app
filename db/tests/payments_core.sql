-- Payment tables and member rules. Passes when it raises 'ALL PAYMENTS CORE CHECKS PASSED'.
do $$
declare
  v_auth uuid := gen_random_uuid(); v_auth2 uuid := gen_random_uuid();
  v_me uuid; v_other uuid; v_m1 uuid; v_m2 uuid; v_m3 uuid; v_err text; v_n int;
begin
  insert into auth.users (id) values (v_auth), (v_auth2);
  set local role service_role;
  select id into v_me from users where auth_id = v_auth;
  select id into v_other from users where auth_id = v_auth2;

  insert into payment_methods (user_id, kind, provider, token, display, can_pay, can_receive, default_pay, default_receive)
  values (v_me, 'card', 'test', 'tok_a', 'Visa ·· 4242', true, false, true, false) returning id into v_m1;
  insert into payment_methods (user_id, kind, provider, token, display, can_pay, can_receive)
  values (v_me, 'whish', 'test', 'tok_b', 'Whish ·· 1234', true, true) returning id into v_m2;
  insert into payment_methods (user_id, kind, provider, token, display, can_pay, can_receive)
  values (v_other, 'card', 'test', 'tok_c', 'Visa ·· 4242', true, false) returning id into v_m3;

  -- section 1: tables and RLS
  -- 1. Settings exist with everything off.
  if (select cardinality(enabled_kinds) from payment_settings) <> 0 then
    raise exception 'FAIL 1: payments must start switched off';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_auth::text, 'role', 'authenticated')::text, true);

  -- 2. I see my two methods and not the other person's.
  select count(*) into v_n from payment_methods;
  if v_n <> 2 then raise exception 'FAIL 2: saw % methods, expected 2', v_n; end if;

  -- 3. The token column is not readable.
  begin
    perform token from payment_methods limit 1;
    raise exception 'FAIL 3: token readable';
  exception when insufficient_privilege then null;
  end;

  -- 4. Members cannot write payments directly.
  begin
    insert into payments (kind, subject_id, payer_id, payee_id, price_cents, fee_cents, rate_bps, provider, expires_at)
    values ('session', gen_random_uuid(), v_me, v_other, 100, 0, 1200, 'test', now());
    raise exception 'FAIL 4: member inserted a payment';
  exception when insufficient_privilege then null;
  end;

  -- section 2: member RPCs
  -- 5. Setting a default receive method needs a method that can receive.
  begin
    perform set_default_payment_method(v_m1, 'receive');
    raise exception 'FAIL 5: card set as receive default';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
  end;
  perform set_default_payment_method(v_m2, 'pay');
  set local role service_role;
  if (select default_pay from payment_methods where id = v_m1) then raise exception 'FAIL 6: old default kept'; end if;
  if not (select default_pay from payment_methods where id = v_m2) then raise exception 'FAIL 6b: new default not set'; end if;
  set local role authenticated;

  -- 7. I cannot remove someone else's method; I can remove mine.
  begin
    perform remove_payment_method(v_m3);
    raise exception 'FAIL 7: removed another person''s method';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
  end;
  perform remove_payment_method(v_m1);
  select count(*) into v_n from payment_methods;
  if v_n <> 1 then raise exception 'FAIL 7b: removed method still listed'; end if;

  -- section 3: payment state (no subject triggers yet: kinds stay disabled, subjects are fake ids)
  set local role service_role;
  declare
    v_pay uuid; v_rel uuid; v_disp uuid; v_cash bigint; v_held bigint; v_payee bigint; v_sid uuid := gen_random_uuid();
  begin
    update payment_settings set fee_bps = 300, fee_flat_cents = 0, dispute_window_hours = 48;

    -- 8. Opening: fee and rate snapshot.
    v_pay := private.open_payment('session', v_sid, v_me, v_other, 10000);
    if (select fee_cents from payments where id = v_pay) <> 300 then raise exception 'FAIL 8: fee'; end if;

    -- 9. A payment being charged is never expired.
    perform payments_begin_charge(v_pay);
    update payments set expires_at = now() - interval '1 minute' where id = v_pay;
    perform private.fail_payment(v_pay, 'expired');
    if (select status from payments where id = v_pay) <> 'charging' then raise exception 'FAIL 9: charging payment expired'; end if;

    -- 10. Held: cash in = price + fee, held = price.
    perform payments_mark_held(v_pay, 'zz_ref_1', 0, null);
    select balance_cents into v_cash from ledger_balances where code = 'company_cash';
    if not exists (select 1 from ledger_entries where idempotency_key = 'checkout:' || v_pay) then
      raise exception 'FAIL 10: no checkout entry';
    end if;

    -- 11. Release after the window: payee gets price − commission, commission recorded.
    perform private.add_release(v_pay, v_sid);
    select id into v_rel from payment_releases where payment_id = v_pay;
    if private.release_due() <> 0 then raise exception 'FAIL 11: released inside the complaint period'; end if;
    update payment_releases set release_at = now() - interval '1 second' where id = v_rel;
    perform private.release_due();
    select balance_cents into v_payee from ledger_balances where code = 'payee:' || v_other;
    -- rate is the 'session' margin; payee share = 10000 − commission
    if v_payee <> 10000 - (select commission_cents from payment_releases where id = v_rel) then
      raise exception 'FAIL 11b: payee balance %', v_payee;
    end if;
    if (select status from payments where id = v_pay) <> 'closed' then raise exception 'FAIL 11c: not closed'; end if;
    if not exists (select 1 from payee_payouts where release_id = v_rel and status = 'waiting_method') then
      raise exception 'FAIL 11d: payout should wait for a receiving method';
    end if;

    -- 12. Dispute: refused after the window, accepted inside it, partial refund resolves.
    v_pay := private.open_payment('session', gen_random_uuid(), v_me, v_other, 5000);
    perform payments_begin_charge(v_pay);
    perform payments_mark_held(v_pay, 'zz_ref_2', 0, null);
    perform private.add_release(v_pay, (select subject_id from payments where id = v_pay));
    select id into v_rel from payment_releases where payment_id = v_pay;
    set local role authenticated;
    v_disp := raise_dispute(v_rel, 'Coach did not show up');
    set local role service_role;
    perform resolve_dispute(v_disp, 2000, v_other);
    if (select amount_cents from payment_releases where id = v_rel) <> 3000 then raise exception 'FAIL 12: release not reduced'; end if;
    if (select amount_cents from refunds where release_id = v_rel) <> 2000 then raise exception 'FAIL 12b: refund missing'; end if;
    if private.payment_unallocated(v_pay) <> 0 then raise exception 'FAIL 12c: unallocated %', private.payment_unallocated(v_pay); end if;

    v_pay := private.open_payment('session', gen_random_uuid(), v_me, v_other, 5000);
    perform payments_begin_charge(v_pay);
    perform payments_mark_held(v_pay, 'zz_ref_3', 0, null);
    perform private.add_release(v_pay, (select subject_id from payments where id = v_pay));
    select id into v_rel from payment_releases where payment_id = v_pay;
    update payment_releases set release_at = now() - interval '1 second' where id = v_rel;
    set local role authenticated;
    begin
      perform raise_dispute(v_rel, 'Too late now');
      raise exception 'FAIL 13: dispute after the window accepted';
    exception when others then
      get stacked diagnostics v_err = message_text;
      if v_err like 'FAIL%' then raise; end if;
      if v_err <> 'The complaint period for this payment has ended.' then raise exception 'FAIL 13b: %', v_err; end if;
    end;
    set local role service_role;

    -- 14. Refund can never exceed what is still held.
    v_pay := private.open_payment('session', gen_random_uuid(), v_me, v_other, 4000);
    perform payments_begin_charge(v_pay);
    perform payments_mark_held(v_pay, 'zz_ref_4', 0, null);
    perform private.refund_payment(v_pay, 999999, 'test');
    if (select sum(amount_cents) from refunds where payment_id = v_pay) <> 4000 then raise exception 'FAIL 14: refund not capped'; end if;

    -- 15. Soft split: cash = held + payees + member refunds + income − expense (nothing else posted yet).
    select balance_cents into v_cash from ledger_balances where code = 'company_cash';
    if v_cash <> (select sum(balance_cents) from ledger_balances where kind in ('liability','equity','income'))
               - (select coalesce(sum(balance_cents),0) from ledger_balances where kind = 'expense') then
      raise exception 'FAIL 15: company_cash does not equal what it is split into';
    end if;
  end;

  raise exception 'ALL PAYMENTS CORE CHECKS PASSED';
end $$;
