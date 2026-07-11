# Spotter database

Postgres 15+ schema in [`schema.sql`](schema.sql). ~45 tables, money in integer cents, `uuid` PKs, PostGIS for distances. Supabase-ready (enable RLS + policies).

## Domains

| Domain | Core tables |
|---|---|
| Identity | `users`, `user_goals`, `notification_prefs`, `calendar_integrations` |
| Sports | `sports`, `sport_requests` |
| Coaches / partners | `coach_profiles`, `partner_profiles`, `profile_tags`, `certifications`, `reviews`, `boosts` |
| Coach tools | `packages`, `coach_availability`, `coach_promos`, `appointment_requests` |
| Bookings | `bookings`, `client_package_balances` |
| Communities | `communities`, `community_members` (roles), `subgroups`, `events`, `event_attendees`, `event_suggestions`, `community_official_requests` |
| Shop marketplace | `shops`, `shop_members`, `shop_registration_requests`, `products`, `shop_sales`, `shop_coupons`, `shop_reviews`, `orders`, `order_items` |
| Chat | `conversations`, `conversation_participants`, `messages` |
| Notifications / ads | `notifications`, `ads` |
| Promotions / loyalty | `platform_promos`, `loyalty_rewards`, `loyalty_accounts`, `loyalty_ledger` |
| Accounting (admin) | `platform_margins`, `admin_shares`, `expenses`, `accounting_proposals`, `proposal_approvals`, `accounting_history`, `payouts` |
| Moderation | `reports`, `report_evidence`, `safety_flags` |

## The two role features you asked for

**Community roles** — `community_members.role` ∈ `owner | admin | moderator | member`.
- Creator (`communities.created_by`) is seeded as `owner`.
- Owners/admins assign others (`assigned_by`).
- Managers (owner/admin/moderator) edit community content + create `events`.
- Members can only insert `event_suggestions`; managers approve → `events`.
- Gate: `can_manage_community(user, community)` helper (used by RLS write policies).

**Shop ownership** — `shops.owner_id` (+ `shop_members` for extra managers).
- Owner edits shop info, uploads/reorders `products` (`is_featured`, `position`, `link_url`), sets `shop_sales` price drops, manages `shop_coupons` (percent/amount codes with audience + limits).
- RLS: `products` / `shop_sales` / `shop_coupons` writable only by `shops.owner_id` or a `shop_members` manager.

## Enforced invariants
- 3-admin approval: `proposal_approvals` PK `(proposal_id, admin_id)` = distinct approvers; 3rd row triggers apply + history + notification fan-out.
- Admin shares total 100% (app + check on apply).
- One review per author/subject (`unique`).
