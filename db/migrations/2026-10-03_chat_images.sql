-- Images in chats -- direct messages and community threads -- screened the
-- same way as text.
--
-- PRIVATE bucket. Every other bucket in this project is public, which suits a
-- profile photo and does not suit a picture somebody sent one other person. A
-- chat image is reachable only through a signed URL, and only a participant of
-- that conversation, or a member of that community, can get one.
--
-- The path carries the room: dm/<conversation>/<file> or
-- community/<community>/<file>. The storage rules read the room from the path,
-- and a check constraint on each message row ties its image to its own room, so
-- a message cannot point at a file from a conversation its author is not in.

alter table public.messages           add column if not exists image_path text;
alter table public.community_messages add column if not exists image_path text;

alter table public.messages drop constraint if exists messages_image_in_room;
alter table public.messages add constraint messages_image_in_room
  check (image_path is null or image_path like 'dm/' || conversation_id::text || '/%');

alter table public.community_messages drop constraint if exists community_messages_image_in_room;
alter table public.community_messages add constraint community_messages_image_in_room
  check (image_path is null or image_path like 'community/' || community_id::text || '/%');

-- A picture can be the whole message. Text stays capped at 2000 either way.
alter table public.community_messages drop constraint if exists community_messages_body_len;
alter table public.community_messages add constraint community_messages_body_len
  check (
    char_length(btrim(body)) <= 2000
    and (char_length(btrim(body)) >= 1 or image_path is not null)
  );

-- 2 MiB and still images only, matching what the picker already enforces by
-- reading the file's own bytes. Enforced here too, because a client can skip
-- the picker.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Seeing an image: a participant of the conversation, or a member of the
-- community. Same people who can read the messages themselves.
drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects for select to authenticated using (
  bucket_id = 'chat-media' and (
    ((storage.foldername(name))[1] = 'dm'
      and private.is_conversation_participant(((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[1] = 'community'
      and private.is_community_member(private.current_app_user(), ((storage.foldername(name))[2])::uuid))
  )
);

-- Sending one: the same people who may send a message there. In a community
-- that is can_post_to_community, so an announcements-only thread does not take
-- pictures from members any more than it takes text.
drop policy if exists chat_media_write on storage.objects;
create policy chat_media_write on storage.objects for insert to authenticated with check (
  bucket_id = 'chat-media' and (
    ((storage.foldername(name))[1] = 'dm'
      and private.is_conversation_participant(((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[1] = 'community'
      and private.can_post_to_community(private.current_app_user(), ((storage.foldername(name))[2])::uuid))
  )
);

-- Taking one back: whoever uploaded it.
drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'chat-media' and owner = auth.uid()
);

-- Community threads had no keyword screening at all. Direct messages have had
-- trg_flag_message since the moderation migration; community_messages was
-- added later and never got one, so community text reached the room unchecked.
-- Same function, same shape as every other surface.
drop trigger if exists trg_flag_community_message on public.community_messages;
-- Labelled 'community_message', singular, like every other surface the queue
-- already shows ('message', 'user', 'coach_profile', ...). After insert only,
-- like messages: a community post is not edited in place.
create trigger trg_flag_community_message
  after insert on public.community_messages
  for each row execute function flag_if_explicit('community_message', 'author_id', 'body');
