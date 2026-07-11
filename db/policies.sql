-- ============================================================================
-- Spotter — Row-Level Security policies (Supabase)
-- Run LAST: schema.sql → auth.sql → seed.sql → policies.sql
-- Model: public read for discovery/marketplace/community browsing; writes gated
-- by ownership / community role / shop role / platform admin. Anything without
-- a policy is denied once RLS is enabled.
-- ============================================================================

-- helper: is the current user an owner/manager of this shop?
create or replace function is_shop_manager(p_shop uuid) returns boolean
language sql stable as $$
  select exists (select 1 from shops s where s.id = p_shop and s.owner_id = current_app_user())
      or exists (select 1 from shop_members m where m.shop_id = p_shop and m.user_id = current_app_user());
$$;

-- enable RLS everywhere
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' and tablename <> 'spatial_ref_sys' loop
    execute format('alter table %I enable row level security', r.tablename);
  end loop;
end $$;

-- ---- USERS / self ----------------------------------------------------------
create policy users_read   on users for select using (true);            -- profiles are public
create policy users_update on users for update using (auth_id = auth.uid());
create policy prefs_self   on notification_prefs for all
  using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy goals_self   on user_goals for all
  using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy cal_self     on calendar_integrations for all
  using (user_id = current_app_user()) with check (user_id = current_app_user());

-- ---- DISCOVERY (public read; self/owner write) -----------------------------
create policy sports_read     on sports for select using (true);
create policy coach_read      on coach_profiles for select using (true);
create policy coach_self      on coach_profiles for all using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy partner_read    on partner_profiles for select using (true);
create policy partner_self    on partner_profiles for all using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy tags_read       on profile_tags for select using (true);
create policy tags_self       on profile_tags for all using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy certs_read      on certifications for select using (true);
create policy certs_self      on certifications for all using (coach_id = current_app_user()) with check (coach_id = current_app_user());
create policy reviews_read    on reviews for select using (true);
create policy reviews_author  on reviews for all using (author_id = current_app_user()) with check (author_id = current_app_user());

-- coach tools (owned by the coach)
create policy pkgs_read   on packages for select using (true);
create policy pkgs_self   on packages for all using (coach_id = current_app_user()) with check (coach_id = current_app_user());
create policy avail_read  on coach_availability for select using (true);
create policy avail_self  on coach_availability for all using (coach_id = current_app_user()) with check (coach_id = current_app_user());
create policy cpromo_self on coach_promos for all using (coach_id = current_app_user()) with check (coach_id = current_app_user());
create policy appt_party  on appointment_requests for all
  using (coach_id = current_app_user() or client_id = current_app_user())
  with check (client_id = current_app_user());
create policy sportreq_ins on sport_requests for insert with check (requested_by = current_app_user());
create policy sportreq_adm on sport_requests for all using (is_platform_admin());

-- ---- BOOKINGS (client or coach) --------------------------------------------
create policy book_party on bookings for all
  using (client_id = current_app_user() or coach_id = current_app_user())
  with check (client_id = current_app_user());
create policy bal_party  on client_package_balances for select
  using (client_id = current_app_user() or coach_id = current_app_user());

-- ---- COMMUNITIES -----------------------------------------------------------
create policy comm_read      on communities for select using (true);
create policy comm_create    on communities for insert with check (created_by = current_app_user());
create policy comm_manage    on communities for update using (can_manage_community(current_app_user(), id));
create policy member_read    on community_members for select using (true);
-- join yourself; managers can assign/remove others
create policy member_join    on community_members for insert
  with check (user_id = current_app_user() or can_manage_community(current_app_user(), community_id));
create policy member_manage  on community_members for update using (can_manage_community(current_app_user(), community_id));
create policy member_leave   on community_members for delete
  using (user_id = current_app_user() or can_manage_community(current_app_user(), community_id));
create policy sub_read       on subgroups for select using (true);
create policy sub_manage     on subgroups for all using (can_manage_community(current_app_user(), community_id));
create policy submem_self    on subgroup_members for all using (user_id = current_app_user()) with check (user_id = current_app_user());

create policy event_read     on events for select using (true);
create policy event_manage   on events for all
  using (can_manage_community(current_app_user(), community_id))
  with check (can_manage_community(current_app_user(), community_id));
create policy attend_self    on event_attendees for all using (user_id = current_app_user()) with check (user_id = current_app_user());

-- members suggest; managers review (handled via approve_event_suggestion RPC)
create policy sugg_read      on event_suggestions for select
  using (proposed_by = current_app_user() or can_manage_community(current_app_user(), community_id));
create policy sugg_member    on event_suggestions for insert
  with check (exists (select 1 from community_members m
                      where m.community_id = event_suggestions.community_id and m.user_id = current_app_user()));
create policy sugg_manage    on event_suggestions for update using (can_manage_community(current_app_user(), community_id));

-- ---- SHOP MARKETPLACE ------------------------------------------------------
create policy shop_read     on shops for select using (true);
create policy shop_owner    on shops for update using (is_shop_manager(id));
create policy shopmem_owner on shop_members for all
  using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = current_app_user()));
create policy shopreg_ins   on shop_registration_requests for insert with check (submitted_by = current_app_user());
create policy shopreg_adm   on shop_registration_requests for select using (is_platform_admin() or submitted_by = current_app_user());
create policy prod_read     on products for select using (true);
create policy prod_manage   on products for all using (is_shop_manager(shop_id)) with check (is_shop_manager(shop_id));
create policy sale_read     on shop_sales for select using (true);
create policy sale_manage   on shop_sales for all using (is_shop_manager(shop_id)) with check (is_shop_manager(shop_id));
create policy coupon_read   on shop_coupons for select using (true);
create policy coupon_manage on shop_coupons for all using (is_shop_manager(shop_id)) with check (is_shop_manager(shop_id));
create policy shoprev_read  on shop_reviews for select using (true);
create policy shoprev_self  on shop_reviews for all using (author_id = current_app_user()) with check (author_id = current_app_user());
create policy order_self     on orders for all using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy orderitem_self on order_items for all
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = current_app_user()));

-- ---- CHAT (participants only) ----------------------------------------------
create policy conv_part on conversations for select
  using (exists (select 1 from conversation_participants p where p.conversation_id = id and p.user_id = current_app_user()));
create policy convpart_self on conversation_participants for all
  using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy msg_read on messages for select
  using (exists (select 1 from conversation_participants p where p.conversation_id = messages.conversation_id and p.user_id = current_app_user()));
create policy msg_send on messages for insert
  with check (sender_id = current_app_user()
    and exists (select 1 from conversation_participants p where p.conversation_id = messages.conversation_id and p.user_id = current_app_user()));

-- ---- NOTIFICATIONS / ADS / LOYALTY -----------------------------------------
create policy notif_self  on notifications for all using (user_id = current_app_user()) with check (user_id = current_app_user());
create policy ads_read    on ads for select using (active);
create policy promo_read  on platform_promos for select using (active);
create policy promo_adm   on platform_promos for all using (is_platform_admin());
create policy reward_read on loyalty_rewards for select using (true);
create policy reward_adm  on loyalty_rewards for all using (is_platform_admin());
create policy loyacc_self on loyalty_accounts for select using (user_id = current_app_user());
create policy loyled_self on loyalty_ledger for select using (user_id = current_app_user());

-- ---- ACCOUNTING / MODERATION (admins only) ---------------------------------
create policy margins_read on platform_margins for select using (true); -- fees are public
create policy margins_adm  on platform_margins for all using (is_platform_admin());
create policy shares_adm   on admin_shares for all using (is_platform_admin());
create policy exp_adm      on expenses for all using (is_platform_admin());
create policy prop_adm     on accounting_proposals for all using (is_platform_admin());
create policy appr_adm     on proposal_approvals for all using (is_platform_admin()) with check (admin_id = current_app_user());
create policy hist_adm     on accounting_history for select using (is_platform_admin());
create policy payout_adm   on payouts for select using (is_platform_admin());
create policy report_ins   on reports for insert with check (reporter_id = current_app_user());
create policy report_adm   on reports for all using (is_platform_admin());
create policy evidence_adm on report_evidence for all using (is_platform_admin());
create policy flag_adm     on safety_flags for all using (is_platform_admin());
create policy official_ins on community_official_requests for insert with check (can_manage_community(current_app_user(), community_id));
create policy official_adm on community_official_requests for all using (is_platform_admin());
