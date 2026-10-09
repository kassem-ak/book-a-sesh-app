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

  raise exception 'ALL PAYMENTS CORE CHECKS PASSED';
end $$;
