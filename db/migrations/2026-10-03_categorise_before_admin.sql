-- A new sport request is categorised before an admin ever sees it.
--
-- Until now a request that the AI engine could not place fell back to Other and
-- went straight into the admin queue -- so whenever the engine was down (as it
-- is while the Anthropic key is rejected) admins got uncategorised requests, the
-- opposite of what the queue is for.
--
-- Now a pending request with no category is held back from the queue. The gwin
-- function retries it whenever it next runs, and the moment it is categorised it
-- appears. Decided requests keep showing regardless, so history does not change.
--
-- categorise_attempts counts the times the engine ANSWERED but named no category
-- on the list. It is not spent while the engine is unreachable: a broken key
-- must not burn through the attempts and dump everything into Other. After five
-- real answers with no usable category, the function files it under Other so a
-- request cannot wait for ever.

alter table public.sport_requests
  add column if not exists categorise_attempts int not null default 0;

create or replace view public.admin_sport_requests as
 SELECT r.id,
    r.name,
    r.kind::text AS kind,
    r.votes,
    r.status::text AS status,
    r.created_at,
    COALESCE(u.name, 'Deleted account'::text) AS requested_by_name,
    COALESCE(d.name, ''::text) AS reviewed_by_name,
    COALESCE(c.name, ''::text) AS category
   FROM sport_requests r
     LEFT JOIN users u ON u.id = r.requested_by
     LEFT JOIN users d ON d.id = r.reviewed_by
     LEFT JOIN sport_categories c ON c.id = r.category_id
  WHERE NOT (r.status = 'pending'::request_status AND r.category_id IS NULL);

-- The 15:23 Rafting request reached the queue under the Other fallback while the
-- engine was refusing every call. Rafting is a water sport.
update public.sport_requests
   set category_id = (select id from public.sport_categories where kind = 'sport' and name = 'Water sports')
 where name = 'Rafting';
