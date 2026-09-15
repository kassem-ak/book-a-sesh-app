-- Read-only inventory; no account details or content are returned.
-- supabase db query --linked --file db/release_inventory.sql -o json
select table_name,
  (xpath('/row/c/text()', query_to_xml(
    format('select count(*) c from public.%I', table_name), false, true, ''
  )))[1]::text::bigint as row_count
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
  and table_name <> 'spatial_ref_sys'
order by table_name;
