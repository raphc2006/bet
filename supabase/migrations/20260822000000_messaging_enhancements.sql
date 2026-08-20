-- ============================================================
-- MESSAGERIE : réponses, photos, réactions
-- ============================================================

alter table public.messages
  add column reply_to_id uuid references public.messages(id) on delete set null,
  add column image_url text;

-- Un message peut maintenant être une simple image (texte vide autorisé si une image est jointe).
alter table public.messages drop constraint messages_content_check;
alter table public.messages add constraint messages_content_check check (
  length(content) <= 2000
  and (length(trim(content)) > 0 or image_url is not null)
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index message_reactions_message_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

create policy "message_reactions_select_member"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (select public.is_conversation_member(m.conversation_id))
    )
  );

create policy "message_reactions_insert_own"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (select public.is_conversation_member(m.conversation_id))
    )
  );

create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- STORAGE : bucket "chat-images"
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- Convention de chemin : {conversation_id}/{fichier}. Seul un membre de la
-- conversation peut y déposer une image.
create policy "chat_images_insert_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and (select public.is_conversation_member(((storage.foldername(name))[1])::uuid))
  );

-- Bucket public (comme "avatars") : le chemin (UUID conversation + UUID fichier)
-- n'est pas devinable sans y avoir déjà accès via l'app.
create policy "chat_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'chat-images');
