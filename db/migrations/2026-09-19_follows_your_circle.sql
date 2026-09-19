-- Your circle: the people whose activity you want to hear about.
--
-- One table rather than separate follow / favourite / bookmark tables. They
-- would all hold the same pair of ids and the same meaning -- "I care about
-- this person" -- and three tables would need three sets of policies, three
-- counts, and a rule for what it means to bookmark someone you do not follow.
-- If a genuinely different "saved for later, but do not tell me about them"
-- list is wanted, that is an added column here, not another table.
--
-- Following is deliberately NOT symmetric and not approval-based: it is a feed
-- subscription, not a friendship.
create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  subject_id  uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, subject_id),
  -- Following yourself would put your own activity in your own feed.
  constraint follows_not_self check (follower_id <> subject_id)
);

create index if not exists follows_subject_idx on public.follows (subject_id);

alter table public.follows enable row level security;

-- You manage your own follows and can see who you follow. Reading the reverse
-- direction -- who follows YOU -- is allowed so a profile can show its own
-- follower count; it does not let you enumerate anyone else's followers,
-- because the row must involve you either way.
drop policy if exists follows_own on public.follows;
create policy follows_own on public.follows
  for all
  using (follower_id = current_app_user() or subject_id = current_app_user())
  with check (follower_id = current_app_user());

grant select, insert, delete on public.follows to authenticated;

-- A block ends the relationship in both directions, the same way it ends
-- messaging and hides map pins. Leaving a follow in place would keep feeding
-- someone's activity to a person they blocked.
create or replace function public.drop_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from follows
   where (follower_id = new.blocker_id and subject_id = new.blocked_id)
      or (follower_id = new.blocked_id and subject_id = new.blocker_id);
  return new;
end $function$;

drop trigger if exists trg_drop_follows_on_block on public.user_blocks;
create trigger trg_drop_follows_on_block
  after insert on public.user_blocks
  for each row execute function public.drop_follows_on_block();

-- Following someone you have blocked, or who has blocked you, is refused at
-- the source as well -- the trigger above only cleans up an existing pair.
create or replace function public.guard_follow_blocks()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1 from user_blocks b
     where (b.blocker_id = new.follower_id and b.blocked_id = new.subject_id)
        or (b.blocker_id = new.subject_id and b.blocked_id = new.follower_id)
  ) then
    raise exception 'You cannot follow this member.';
  end if;
  return new;
end $function$;

drop trigger if exists trg_guard_follow_blocks on public.follows;
create trigger trg_guard_follow_blocks
  before insert on public.follows
  for each row execute function public.guard_follow_blocks();

-- Applied live 19 September 2026 and verified as a signed-in member in a
-- rolled-back transaction: following works; following yourself is refused;
-- inserting a row for somebody else is refused; blocking removes the follow in
-- both directions (rows went to 0); and following someone across a block is
-- refused with "You cannot follow this member."
