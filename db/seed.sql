-- ============================================================================
-- Spotter — dummy seed data (mirrors the app's in-memory sampleData)
-- Self-linking: FKs resolve via natural keys (email / slug / name) so no
-- hardcoded UUIDs. Idempotent where unique keys exist (on conflict do nothing).
-- Run after schema.sql:  psql "$DATABASE_URL" -f db/schema.sql -f db/seed.sql
-- ============================================================================
begin;

-- ---- helper shorthands (psql \set-free: use inline subselects) ------------
-- user id  : (select id from users where email = '<email>')
-- sport id : (select id from sports where name = '<name>')
-- comm id  : (select id from communities where slug = '<slug>')
-- shop id  : (select id from shops where slug = '<slug>')

-- ============================================================================
-- SPORTS
-- ============================================================================
insert into sports (name, kind, approved) values
  ('Strength & Conditioning','sport',true),
  ('Boxing','sport',true),
  ('Calisthenics','sport',true),
  ('Yoga & Mobility','sport',true),
  ('Running & Endurance','sport',true),
  ('Climbing','sport',true),
  ('Music & Guitar','hobby',true),
  ('Chess','hobby',true),
  ('Running','sport',true),
  ('Strength','sport',true)
on conflict (name) do nothing;

-- pending hobby/sport requests → admin Approvals queue
insert into sports (name, kind, approved) values ('Padel','sport',false),('Salsa','hobby',false)
on conflict (name) do nothing;
insert into sport_requests (name, kind, votes, status) values
  ('Padel','sport',214,'pending'),
  ('Salsa','hobby',89,'pending');

-- ============================================================================
-- USERS  (admins, coaches, partners, community members, shop owners)
-- ============================================================================
insert into users (email, name, city, platform_role, is_admin) values
  -- current user + the 3 hardcoded admins
  ('alex@spotter.app',  'Alex Morgan', 'Beirut','admin', true),
  ('rima@spotter.app',  'Rima Haddad', 'Beirut','admin', true),
  ('karim@spotter.app', 'Karim Saleh', 'Beirut','admin', true),
  -- coaches
  ('marcus@spotter.app','Marcus Reyes','Beirut','coach', false),
  ('aicha@spotter.app', 'Aïcha Bennani','Beirut','coach', false),
  ('diego@spotter.app', 'Diego Santos','Beirut','coach', false),
  ('lena@spotter.app',  'Lena Hoffmann','Beirut','coach', false),
  ('tariq@spotter.app', 'Tariq Aziz','Beirut','coach', false),
  ('sofia@spotter.app', 'Sofia Marino','Beirut','coach', false),
  ('karimh@spotter.app','Karim Haddad','Beirut','coach', false),
  ('nour@spotter.app',  'Nour Fakhoury','Beirut','coach', false),
  -- training partners
  ('jordan@spotter.app','Jordan K.','Beirut','user', false),
  ('mei@spotter.app',   'Mei Lin','Beirut','user', false),
  ('sam@spotter.app',   'Sam Okoro','Beirut','user', false),
  ('elena@spotter.app', 'Elena V.','Beirut','user', false),
  ('yuki@spotter.app',  'Yuki T.','Beirut','user', false),
  ('rami@spotter.app',  'Rami S.','Beirut','user', false),
  ('lara@spotter.app',  'Lara M.','Beirut','user', false),
  -- shop owners
  ('paceline@shops.app','PaceLine Owner','Beirut','user', false),
  ('ironworks@shops.app','IronWorks Owner','Beirut','user', false),
  ('cornerring@shops.app','Corner Ring Owner','Beirut','user', false)
on conflict (email) do nothing;

-- current user's prefs + goals
insert into notification_prefs (user_id, push_enabled, daily_plan_enabled, calendar_sync, cal_provider)
values ((select id from users where email='alex@spotter.app'), true, true, false, 'google')
on conflict (user_id) do nothing;

insert into user_goals (user_id, goal)
select id, g from users, unnest(array['Run a marathon','Build endurance','Stay consistent']) g
where email='alex@spotter.app' on conflict do nothing;

-- ============================================================================
-- COACH PROFILES  (price in cents)
-- ============================================================================
insert into coach_profiles (user_id, headline, bio, sport_id, level, price_cents, reply_time, sessions_count, rating_avg, reviews_count, boosted, verified)
values
 ((select id from users where email='marcus@spotter.app'),'Elite coach','Ex-national powerlifter. Durable strength, flawless technique.',(select id from sports where name='Strength & Conditioning'),'Elite coach',4500,'~1h',640,4.9,213,true,true),
 ((select id from users where email='aicha@spotter.app'),'Pro boxing','Former amateur champion. Footwork, defense and conditioning.',(select id from sports where name='Boxing'),'Pro boxing',5000,'~30m',520,4.9,178,true,true),
 ((select id from users where email='diego@spotter.app'),'Movement','Bodyweight specialist — first pull-up to muscle-ups.',(select id from sports where name='Calisthenics'),'Movement',3800,'~2h',410,4.8,142,false,true),
 ((select id from users where email='lena@spotter.app'),'Vinyasa','Vinyasa and mobility coach. Flexibility, breath, recovery.',(select id from sports where name='Yoga & Mobility'),'Vinyasa',3500,'~1h',300,4.8,96,false,true),
 ((select id from users where email='tariq@spotter.app'),'Endurance','Marathon coach and pacer. 5k to full marathon.',(select id from sports where name='Running & Endurance'),'Endurance',3000,'~3h',180,4.7,64,false,true),
 ((select id from users where email='sofia@spotter.app'),'Bouldering','Bouldering and lead coach. Technique and finger strength.',(select id from sports where name='Climbing'),'Bouldering',4200,'~2h',150,4.6,51,false,true),
 ((select id from users where email='karimh@spotter.app'),'Musician','Session guitarist and teacher for 12 years.',(select id from sports where name='Music & Guitar'),'Musician',2500,'~1h',270,4.9,88,false,true),
 ((select id from users where email='nour@spotter.app'),'FIDE 2100','FIDE-rated player. Openings, endgames, middlegame plans.',(select id from sports where name='Chess'),'FIDE 2100',2000,'~2h',190,4.8,57,false,true)
on conflict (user_id) do nothing;

update coach_profiles set subscription_status='active';

-- Marcus packages
insert into packages (coach_id, sessions, price_cents) values
 ((select id from users where email='marcus@spotter.app'),1,4500),
 ((select id from users where email='marcus@spotter.app'),5,20300),
 ((select id from users where email='marcus@spotter.app'),12,42100);

-- one verified cert for Alex (acts as coach-in-training in the demo)
insert into certifications (coach_id, name, issuer, year, status)
values ((select id from users where email='alex@spotter.app'),'First Aid & CPR','Red Cross Lebanon','2025','verified');

-- ============================================================================
-- PARTNER PROFILES
-- ============================================================================
insert into partner_profiles (user_id, sport_id, level, goal, bio) values
 ((select id from users where email='jordan@spotter.app'),(select id from sports where name='Running'),'Intermediate','5k under 22min','Tempo + long Sunday runs, pace 4:45-5:15/km.'),
 ((select id from users where email='mei@spotter.app'),(select id from sports where name='Climbing'),'Advanced','Project a 6b','Need a regular belay + spotting partner, evenings.'),
 ((select id from users where email='sam@spotter.app'),(select id from sports where name='Calisthenics'),'Beginner','First muscle-up','Supportive partner for park bars, accountability.'),
 ((select id from users where email='elena@spotter.app'),(select id from sports where name='Boxing'),'Intermediate','Spar weekly','Controlled sparring partner, once a week.'),
 ((select id from users where email='yuki@spotter.app'),(select id from sports where name='Strength'),'Advanced','200kg deadlift','Reliable spotter for heavy compound days.')
on conflict (user_id) do nothing;

-- a few reviews about Marcus
insert into reviews (subject_id, author_id, stars, body) values
 ((select id from users where email='marcus@spotter.app'),(select id from users where email='sam@spotter.app'),5,'Pushed me harder than I push myself. Form cues spot-on.'),
 ((select id from users where email='marcus@spotter.app'),(select id from users where email='rami@spotter.app'),5,'Booking effortless, session flew by. Already rebooked.'),
 ((select id from users where email='marcus@spotter.app'),(select id from users where email='lara@spotter.app'),4,'Great energy and clearly knows the craft.')
on conflict do nothing;

-- ============================================================================
-- BOOKINGS
-- ============================================================================
insert into bookings (client_id, coach_id, scheduled_for, slot_label, status, total_cents, commission_cents)
values ((select id from users where email='alex@spotter.app'),(select id from users where email='marcus@spotter.app'),
        timestamptz '2026-07-09 18:30', 'Thu 09 · 6:30 PM','confirmed',20300,2436);

insert into client_package_balances (client_id, coach_id, label, used, total, expires_on) values
 ((select id from users where email='alex@spotter.app'),(select id from users where email='marcus@spotter.app'),'5-session pack',3,5,'2026-08-29'),
 ((select id from users where email='alex@spotter.app'),(select id from users where email='tariq@spotter.app'),'Monthly plan',5,12,'2026-07-28');

-- coach appointment requests (Marcus inbox)
insert into appointment_requests (coach_id, client_id, kind, requested, note) values
 ((select id from users where email='marcus@spotter.app'),(select id from users where email='alex@spotter.app'),'new_booking','Single session · Thu 09 · 6:30 PM','Iron Yard Gym, Hamra'),
 ((select id from users where email='marcus@spotter.app'),(select id from users where email='rami@spotter.app'),'change_request','Move to Sat 11 · 8:00 AM','was Fri 10 · 6:30 PM');

-- ============================================================================
-- COMMUNITIES + roles + events + suggestions
-- ============================================================================
insert into communities (slug, name, code, tint, about, official, created_by, members_count) values
 ('running','Running','RN','#1F3A36','Runners of every pace — group runs, pacing crews, race meetups.',true,(select id from users where email='alex@spotter.app'),3200),
 ('strength','Strength','ST','#22324A','Barbell, powerlifting and hypertrophy. Spotters, PR attempts.',true,(select id from users where email='marcus@spotter.app'),2800),
 ('boxing','Boxing','BX','#3A2330','Footwork, pad work and controlled sparring nights.',true,(select id from users where email='aicha@spotter.app'),1600),
 ('climbing','Climbing','CL','#244046','Bouldering and lead. Belay partners, projecting, outdoor trips.',true,(select id from users where email='mei@spotter.app'),1100),
 ('yoga','Yoga','YG','#3A2E4D','Vinyasa, mobility and breathwork.',true,(select id from users where email='lena@spotter.app'),2100),
 ('calisthenics','Calisthenics','CA','#3A2A22','Bodyweight skills — pull-ups to muscle-ups.',true,(select id from users where email='diego@spotter.app'),1400),
 ('music','Music','MU','#4A2338','Guitar, oud, vocals. Jam circles and open mics.',true,(select id from users where email='karimh@spotter.app'),900),
 ('chess','Chess','CH','#2F3A2A','Café blitz to rated tournaments. Weekly club nights.',false,(select id from users where email='nour@spotter.app'),640)
on conflict (slug) do nothing;

-- role assignments: Alex owns Running; is a plain member of Strength (suggestion path).
insert into community_members (community_id, user_id, role) values
 ((select id from communities where slug='running'),(select id from users where email='alex@spotter.app'),'owner'),
 ((select id from communities where slug='running'),(select id from users where email='rima@spotter.app'),'admin'),
 ((select id from communities where slug='running'),(select id from users where email='jordan@spotter.app'),'moderator'),
 ((select id from communities where slug='running'),(select id from users where email='tariq@spotter.app'),'member'),
 ((select id from communities where slug='strength'),(select id from users where email='marcus@spotter.app'),'owner'),
 ((select id from communities where slug='strength'),(select id from users where email='yuki@spotter.app'),'moderator'),
 ((select id from communities where slug='strength'),(select id from users where email='alex@spotter.app'),'member')
on conflict do nothing;

insert into subgroups (community_id, name, area, members_count) values
 ((select id from communities where slug='running'),'Corniche Runners','Ain El Mreisseh',420),
 ((select id from communities where slug='running'),'Horsh Beirut Pacers','Horsh Beirut',310),
 ((select id from communities where slug='strength'),'Hamra Lifters','Hamra',260);

insert into events (community_id, type, title, when_label, location, host_id, created_by, attendees_count) values
 ((select id from communities where slug='running'),'meetup','Saturday Long Run','Sat 05 · 7:00 AM','Corniche, Ain El Mreisseh',(select id from users where email='jordan@spotter.app'),(select id from users where email='alex@spotter.app'),18),
 ((select id from communities where slug='running'),'event','Horsh Beirut 10k Time Trial','Sun 06 · 8:30 AM','Horsh Beirut track',(select id from users where email='tariq@spotter.app'),(select id from users where email='alex@spotter.app'),42),
 ((select id from communities where slug='strength'),'meetup','Heavy Squat Session','Wed 02 · 6:30 PM','Iron Yard Gym, Hamra',(select id from users where email='marcus@spotter.app'),(select id from users where email='marcus@spotter.app'),9);

-- Alex (a member of Strength) can only suggest — pending suggestion:
insert into event_suggestions (community_id, title, when_label, proposed_by, status) values
 ((select id from communities where slug='strength'),'Deadlift Technique Clinic','Sat 05 · 10:00 AM',(select id from users where email='alex@spotter.app'),'pending');

-- chess community applying for official status
insert into community_official_requests (community_id, status)
values ((select id from communities where slug='chess'),'pending');

-- ============================================================================
-- SHOPS  (owner-managed: products, featured, sales, coupons)
-- ============================================================================
insert into shops (owner_id, slug, name, initials, tint, category, deal_text, rating_avg, reviews_count, is_partner, status) values
 ((select id from users where email='paceline@shops.app'),'paceline','PaceLine Runners','PL','#2A3A2E','Running gear','10% off in-app',4.8,95,true,'approved'),
 ((select id from users where email='ironworks@shops.app'),'ironworks','IronWorks Supply','IW','#3A2E2A','Strength & gym','Free delivery',4.7,61,true,'approved'),
 ((select id from users where email='cornerring@shops.app'),'cornerring','Corner Ring','CR','#3A2A33','Boxing & MMA','15% first order',4.9,142,true,'approved')
on conflict (slug) do nothing;

-- PaceLine catalog (first two featured)
insert into products (shop_id, name, price_cents, is_featured, position) values
 ((select id from shops where slug='paceline'),'Tempo Racer 2',12900,true,0),
 ((select id from shops where slug='paceline'),'Featherlight run cap',1800,true,1),
 ((select id from shops where slug='paceline'),'Energy gels · 12 pack',2200,false,2),
 ((select id from shops where slug='paceline'),'Reflective shell jacket',7400,false,3),
 ((select id from shops where slug='ironworks'),'Cast dumbbell pair · 10 kg',5800,true,0),
 ((select id from shops where slug='ironworks'),'Leather lifting belt',4200,true,1),
 ((select id from shops where slug='cornerring'),'Sparring gloves · 14 oz',8900,true,0),
 ((select id from shops where slug='cornerring'),'Hand wraps · 4.5 m',1200,false,1);

-- a storewide sale + a coupon on PaceLine
insert into shop_sales (shop_id, product_id, discount_pct, ends_at) values
 ((select id from shops where slug='paceline'),(select id from products where name='Reflective shell jacket'),20,'2026-07-31');

insert into shop_coupons (shop_id, code, kind, value, min_order_cents, audience, max_uses, ends_at) values
 ((select id from shops where slug='paceline'),'PACE10','percent',10,0,'all',500,'2026-08-15'),
 ((select id from shops where slug='cornerring'),'RING15','percent',15,5000,'new',null,'2026-09-01');

-- pending "Be a Shop" registration → admin Approvals
insert into shop_registration_requests (shop_name, category, phone, email, contact_pref, best_time, status) values
 ('Summit Outdoors','Climbing','+961 3 111 222','summit@shops.app','WhatsApp','Weekday mornings','pending');

-- a sample paid order (feeds shop-sale commission)
insert into orders (user_id, shop_id, status, subtotal_cents, discount_cents, total_cents, commission_cents)
values ((select id from users where email='alex@spotter.app'),(select id from shops where slug='paceline'),'paid',14700,1470,13230,1058);

-- ============================================================================
-- CHAT
-- ============================================================================
with c as (insert into conversations default values returning id)
insert into conversation_participants (conversation_id, user_id)
select c.id, u.id from c, users u where u.email in ('alex@spotter.app','marcus@spotter.app');

insert into messages (conversation_id, sender_id, body)
select (select id from conversations order by created_at desc limit 1), s.id, m.body
from (values
  ('marcus@spotter.app','Hey! Ready for the strength block this week?'),
  ('alex@spotter.app','Born ready 💪 Same 6:30 slot works?'),
  ('marcus@spotter.app','Locked in. We''ll start with heavy squats, then accessories.'),
  ('alex@spotter.app','Perfect. See you at Iron Yard.'),
  ('marcus@spotter.app','Bring your A-game. 🔥')
) as m(email, body)
join users s on s.email = m.email;

-- ============================================================================
-- ADS + NOTIFICATIONS
-- ============================================================================
insert into ads (placement, brand, logo, tint, headline, body, cta, targeting) values
 ('discover','StrideLab','SL','#2A3A2E','Marathon-ready running shoes, tested on Beirut roads','Free gait analysis with every first pair.','Shop now','{"hobbies":["Running"],"goal":"Run a marathon"}'),
 ('community','FuelUp Nutrition','FN','#3A322A','20% off recovery packs for training crews','Group orders for communities — delivered across Lebanon.','Get offer','{"communities":["Running","Strength"]}');

insert into notifications (user_id, type, title, body) values
 ((select id from users where email='alex@spotter.app'),'daily_plan','Daily plan briefing','Strength session at 6:30 PM, plus two community events near you.'),
 ((select id from users where email='alex@spotter.app'),'booking','Booking confirmed','Marcus confirmed your 5-session pack for July.'),
 ((select id from users where email='alex@spotter.app'),'partner_nearby','New partner nearby','Jordan K. is looking for a tempo run partner within 400 m.');

-- ============================================================================
-- PROMOTIONS + LOYALTY
-- ============================================================================
insert into platform_promos (code, pct, audience, created_by) values
 ('SUMMER15',15,'all',(select id from users where email='alex@spotter.app'));

insert into loyalty_rewards (label, point_cost) values
 ('Free session with any coach',500),
 ('20% off a 5-session pack',900),
 ('Free month of coach subscription',1500);

insert into loyalty_accounts (user_id, balance)
values ((select id from users where email='alex@spotter.app'),1240) on conflict do nothing;

-- ============================================================================
-- ACCOUNTING
-- ============================================================================
insert into platform_margins (key, pct) values ('session',12),('shop',8),('boost',15)
on conflict (key) do nothing;

insert into admin_shares (admin_id, pct) values
 ((select id from users where email='alex@spotter.app'),40),
 ((select id from users where email='rima@spotter.app'),30),
 ((select id from users where email='karim@spotter.app'),30)
on conflict (admin_id) do nothing;

insert into expenses (label, amount_cents, recurrence, created_by) values
 ('Servers & infrastructure',124000,'monthly',(select id from users where email='rima@spotter.app')),
 ('Payment processing',61000,'monthly',(select id from users where email='rima@spotter.app')),
 ('Marketing & ads',98000,'monthly',(select id from users where email='rima@spotter.app')),
 ('Support & moderation',45000,'monthly',(select id from users where email='rima@spotter.app'));

insert into accounting_history (title, detail, meta, actor_id) values
 ('Expense updated','Marketing & ads: $860 → $980 (Monthly)','By Rima Haddad',(select id from users where email='rima@spotter.app')),
 ('Margins updated','Coach session commission: 15% → 12%','Approved by 3 admins · affected coaches notified',(select id from users where email='alex@spotter.app')),
 ('Payout distributed','May net profit $8,540 split 40 / 30 / 30','Automatic',null);

-- ============================================================================
-- MODERATION
-- ============================================================================
insert into reports (reporter_id, subject_id, reason, summary, status) values
 ((select id from users where email='alex@spotter.app'),(select id from users where email='sam@spotter.app'),'No-show & abusive messages','12 chat messages · 1 booking · 1 shared event','open'),
 ((select id from users where email='elena@spotter.app'),(select id from users where email='yuki@spotter.app'),'Harassment in chat','8 chat messages · 1 booking · 1 shared event','open');

insert into safety_flags (subject_type, subject_id, source, content, auto) values
 ('user',(select id from users where email='rami@spotter.app'),'Community name','After Dark Hookups',true);

commit;

-- sanity check
-- select 'users' t, count(*) from users union all select 'communities', count(*) from communities
--   union all select 'shops', count(*) from shops union all select 'products', count(*) from products;
