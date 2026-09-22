-- What the pack cost, alongside what is left of it.
--
-- A refund is argued over as "the unused share of what was paid", and the
-- client's screen could not compute that: package_progress reported the counts
-- but not the price, so the client's opening figure was hardcoded to 0 while
-- the coach's came from their own catalogue. Two sides of one negotiation
-- starting from different numbers, one of them always zero.
--
-- The view already joins packages, so this is a column it was not selecting
-- rather than a new lookup.
create or replace view public.package_progress
with (security_invoker = true) as
select b.client_id,
       b.coach_id,
       b.package_id,
       p.sessions as total,
       p.price_cents,
       count(*) filter (where b.status = 'pending')::int as pending,
       count(*) filter (where b.status = 'confirmed' and b.scheduled_for >= now())::int as booked,
       count(*) filter (where b.status = 'completed'
                           or (b.status = 'confirmed' and b.scheduled_for < now()))::int as taken,
       greatest(
         p.sessions - count(*) filter (
           where b.status in ('pending', 'confirmed', 'completed')
         )::int,
         0
       )::int as remaining
  from bookings b
  join packages p on p.id = b.package_id
 where b.package_id is not null
 group by b.client_id, b.coach_id, b.package_id, p.sessions, p.price_cents;

grant select on public.package_progress to authenticated;
