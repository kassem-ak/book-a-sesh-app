-- The admin sees where a requested sport would go.
--
-- Every request now carries a category from the moment it is filed: the AI
-- engine assigns it when it is on, the member picks one when it is off, and
-- otherwise it is that kind's Other. This puts it on the view the console's
-- Sports page reads, beside the kind it already shows.
--
-- Appended as the last column: CREATE OR REPLACE VIEW may add columns at the
-- end and keeps the existing grants, so the console's reader is untouched.

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
     LEFT JOIN sport_categories c ON c.id = r.category_id;
