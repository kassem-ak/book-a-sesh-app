-- ============================================================================
-- Spotter — Supabase Auth integration + server-side RPCs
-- Run AFTER schema.sql (and before or after seed.sql — order-independent).
-- ============================================================================

-- Link public.users to Supabase auth.users.
alter table users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;

-- id of the current app user (public.users.id) for the signed-in auth user.
create or replace function current_app_user() returns uuid
language sql stable as $$
  select id from users where auth_id = auth.uid();
$$;

-- true if the signed-in user is a platform admin.
create or replace function is_platform_admin() returns boolean
language sql stable as $$
  select coalesce((select is_admin from users where auth_id = auth.uid()), false);
$$;

-- On auth signup, create a matching public.users profile.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (auth_id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (auth_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- RPC: manager approves an event suggestion → creates the event.
-- SECURITY DEFINER so it can write events after the permission check.
-- ============================================================================
create or replace function approve_event_suggestion(p_suggestion uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_comm uuid; v_title text; v_when text; v_event uuid;
begin
  select community_id, title, when_label into v_comm, v_title, v_when
  from event_suggestions where id = p_suggestion and status = 'pending';
  if v_comm is null then raise exception 'suggestion not found or already handled'; end if;
  if not can_manage_community(current_app_user(), v_comm) then
    raise exception 'not authorized to manage this community';
  end if;

  insert into events (community_id, type, title, when_label, created_by, host_id)
  values (v_comm, 'meetup', v_title, v_when, current_app_user(), current_app_user())
  returning id into v_event;

  update event_suggestions
    set status = 'approved', reviewed_by = current_app_user(), event_id = v_event
    where id = p_suggestion;
  return v_event;
end $$;

-- ============================================================================
-- 3-admin accounting apply: when a proposal reaches 3 distinct approvals,
-- copy payload → live margins/shares, log history, notify affected users.
-- ============================================================================
create or replace function apply_proposal_if_ready() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_count int; v_type proposal_type; v_payload jsonb; v_diff jsonb; v_margins_changed boolean;
begin
  select count(*) into v_count from proposal_approvals where proposal_id = new.proposal_id;
  if v_count < 3 then return new; end if;

  select type, payload, diff into v_type, v_payload, v_diff
  from accounting_proposals where id = new.proposal_id and status = 'pending';
  if v_type is null then return new; end if;

  -- apply margins
  if v_type in ('margins','margins_shares') then
    update platform_margins m set pct = (v_payload->'margins'->>m.key::text)::numeric
      where v_payload->'margins' ? m.key::text;
  end if;
  -- apply shares
  if v_type in ('shares','margins_shares') then
    update admin_shares s set pct = (v_payload->'shares'->>s.admin_id::text)::numeric
      where v_payload->'shares' ? s.admin_id::text;
  end if;

  v_margins_changed := v_type in ('margins','margins_shares');
  update accounting_proposals set status='applied', applied_at=now() where id=new.proposal_id;

  insert into accounting_history (title, detail, meta, actor_id)
  values (case when v_margins_changed then 'Margins updated' else 'Profit shares updated' end,
          (select string_agg(d->>'line', ' · ') from jsonb_array_elements(v_diff) d),
          'Approved by 3 admins' || case when v_margins_changed then ' · users notified' else ' · internal' end,
          new.admin_id);

  -- fan out platform-fee notification to all users when margins changed
  if v_margins_changed then
    insert into notifications (user_id, type, title, body)
    select id, 'platform_update', 'Platform fees updated',
           'Platform fees changed. Applies to all new transactions starting now.'
    from users where deleted_at is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_apply_proposal on proposal_approvals;
create trigger trg_apply_proposal
  after insert on proposal_approvals
  for each row execute function apply_proposal_if_ready();
