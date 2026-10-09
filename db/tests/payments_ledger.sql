-- Ledger invariants. Run with execute_sql; passes when it raises
-- 'ALL PAYMENTS LEDGER CHECKS PASSED' (the raise rolls everything back).
do $$
declare v_entry uuid; v_again uuid; v_err text; v_bal bigint;
begin
  -- 1. A balanced entry posts, and posting the same key again returns the same entry.
  v_entry := private.post_entry('test', 'zz-test-1', null, null,
    '[{"account":"company_cash","amount":500},{"account":"held","amount":-500}]');
  v_again := private.post_entry('test', 'zz-test-1', null, null,
    '[{"account":"company_cash","amount":999},{"account":"held","amount":-999}]');
  if v_entry is distinct from v_again then raise exception 'FAIL 1: same key posted twice'; end if;
  select balance_cents into v_bal from ledger_balances where code = 'held';
  if v_bal < 500 then raise exception 'FAIL 1b: held balance % should include the 500 credit', v_bal; end if;

  -- 2. An unbalanced entry is refused.
  begin
    perform private.post_entry('test', 'zz-test-2', null, null,
      '[{"account":"company_cash","amount":500},{"account":"held","amount":-400}]');
    set constraints all immediate;
    raise exception 'FAIL 2: unbalanced entry accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
    if v_err not like '%does not balance%' then raise exception 'FAIL 2b: wrong error %', v_err; end if;
  end;
  set constraints all deferred;

  -- 3. The ledger cannot be edited or deleted.
  begin
    update ledger_lines set amount_cents = 1 where entry_id = v_entry;
    raise exception 'FAIL 3: line updated';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
  end;
  begin
    delete from ledger_entries where id = v_entry;
    raise exception 'FAIL 3b: entry deleted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
  end;

  -- 4. Members cannot read the ledger.
  if has_table_privilege('authenticated', 'public.ledger_lines', 'select') then
    raise exception 'FAIL 4: authenticated can read ledger_lines';
  end if;

  -- 5. Per-person accounts are created on demand.
  perform private.ensure_account('payee:00000000-0000-0000-0000-000000000000', 'liability', null);
  if not exists (select 1 from ledger_accounts where code = 'payee:00000000-0000-0000-0000-000000000000') then
    raise exception 'FAIL 5: ensure_account did not create the account';
  end if;

  raise exception 'ALL PAYMENTS LEDGER CHECKS PASSED';
end $$;
