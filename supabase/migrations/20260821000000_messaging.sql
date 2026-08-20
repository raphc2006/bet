-- ============================================================
-- MESSAGERIE : messages directs et groupes entre amis
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm', 'group')),
  name text, -- nom du groupe (null pour les messages directs, obligatoire pour les groupes)
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint group_has_name check (type = 'dm' or (name is not null and length(trim(name)) > 0))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0 and length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Fonction centrale : l'utilisateur courant est-il membre de cette conversation ?
-- SECURITY DEFINER pour éviter la récursion RLS sur conversation_members elle-même.
create function public.is_conversation_member(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conversation and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;
revoke execute on function public.is_conversation_member(uuid) from anon;

-- Nombre de messages non lus (tous membres, tous fils confondus) pour le badge de navigation.
create function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id and cm.user_id = (select auth.uid())
  where m.created_at > cm.last_read_at
    and m.sender_id <> (select auth.uid());
$$;

revoke all on function public.unread_message_count() from public;
grant execute on function public.unread_message_count() to authenticated;
revoke execute on function public.unread_message_count() from anon;

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create policy "conversations_select_member"
  on public.conversations for select
  to authenticated
  using ((select public.is_conversation_member(id)));

create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "conversations_update_creator"
  on public.conversations for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ============================================================
-- CONVERSATION_MEMBERS
-- ============================================================
create policy "conversation_members_select_member"
  on public.conversation_members for select
  to authenticated
  using ((select public.is_conversation_member(conversation_id)));

-- On peut s'ajouter soi-même (le créateur s'ajoute après avoir créé la conversation),
-- ou le créateur d'une conversation peut y ajouter des amis (jamais un inconnu).
create policy "conversation_members_insert"
  on public.conversation_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or (
      (select public.are_friends(user_id))
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.created_by = (select auth.uid())
      )
    )
  );

create policy "conversation_members_update_own"
  on public.conversation_members for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "conversation_members_delete_own"
  on public.conversation_members for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- MESSAGES
-- ============================================================
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using ((select public.is_conversation_member(conversation_id)));

create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_conversation_member(conversation_id))
  );
