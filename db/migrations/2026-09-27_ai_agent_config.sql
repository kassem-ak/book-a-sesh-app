-- Copied verbatim from the console repo (kassem-ak/bookd-admin,
-- database/supabase/2026-09-27_ai_agent_config.sql). This repo owns the
-- Supabase schema, so the history lives here; the console keeps its copy only
-- so the page it powers is readable beside it. Keep the two identical.
--
-- Gwin: the console's AI agent. One row, like geo_policy and plan_policy.
-- Every capability ships OFF. Turning one on is a decision with a date and an
-- author, not a side effect of the row existing.
create table if not exists public.ai_agent_config (
    id                    boolean primary key default true check (id),
    name                  text        not null default 'Gwin',
    model                 text        not null default 'claude-opus-5',
    effort                text        not null default 'high'
                                      check (effort in ('low','medium','high','xhigh','max')),

    -- Admin: answers statistical questions about analytics and finances.
    answers_admin         boolean     not null default false,

    -- App: holds suspected sexual content for review. Never auto-deletes:
    -- it writes a safety_flag, which is the queue an admin already works.
    moderates_content     boolean     not null default false,
    moderation_action     text        not null default 'flag'
                                      check (moderation_action in ('flag','hide_and_flag')),

    -- App: maps free text onto the curated sports list. Anything it cannot
    -- map becomes a sport_request, so the taxonomy keeps one gate.
    suggests_sports       boolean     not null default false,

    -- Null means "use the prompt shipped in the code", so an operator can
    -- override without being forced to author one.
    admin_prompt          text,
    moderation_prompt     text,
    suggestion_prompt     text,

    updated_at            timestamptz not null default now(),
    updated_by            uuid references public.users(id)
);

alter table public.ai_agent_config enable row level security;
-- No policy: service_role bypasses RLS, everyone else gets nothing. The
-- console is the only reader, exactly as for the other admin-owned tables.

insert into public.ai_agent_config (id) values (true) on conflict (id) do nothing;

create or replace view public.admin_ai_agent
with (security_invoker = true) as
select c.name, c.model, c.effort,
       c.answers_admin, c.moderates_content, c.moderation_action, c.suggests_sports,
       c.admin_prompt, c.moderation_prompt, c.suggestion_prompt,
       c.updated_at,
       coalesce(u.name, '') as updated_by_name
from public.ai_agent_config c
left join public.users u on u.id = c.updated_by;

revoke all on public.admin_ai_agent from anon, authenticated;
grant select on public.admin_ai_agent to service_role;

create or replace function public.admin_save_ai_agent(
    p_actor uuid, p_model text, p_effort text,
    p_answers_admin boolean, p_moderates_content boolean,
    p_moderation_action text, p_suggests_sports boolean,
    p_admin_prompt text, p_moderation_prompt text, p_suggestion_prompt text
) returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
    -- The same actor check the other twenty-five admin_* functions make.
    -- Banned is not an admin, here as everywhere else.
    if not exists (
        select 1 from public.users
        where id = p_actor and is_admin and deleted_at is null and account_state <> 'banned'
    ) then
        raise exception 'not an active admin';
    end if;

    update public.ai_agent_config set
        model = p_model, effort = p_effort,
        answers_admin = p_answers_admin,
        moderates_content = p_moderates_content,
        moderation_action = p_moderation_action,
        suggests_sports = p_suggests_sports,
        admin_prompt = nullif(btrim(p_admin_prompt), ''),
        moderation_prompt = nullif(btrim(p_moderation_prompt), ''),
        suggestion_prompt = nullif(btrim(p_suggestion_prompt), ''),
        updated_at = now(), updated_by = p_actor
    where id;
end;
$$;

revoke all on function public.admin_save_ai_agent(uuid,text,text,boolean,boolean,text,boolean,text,text,text) from anon, authenticated;
grant execute on function public.admin_save_ai_agent(uuid,text,text,boolean,boolean,text,boolean,text,text,text) to service_role;
