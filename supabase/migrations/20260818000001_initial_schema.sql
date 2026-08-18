-- Extension nécessaire pour gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

-- Le pseudo doit être visible de tous les utilisateurs connectés pour permettre
-- la recherche d'amis (étape 4). Aucune autre donnée sensible n'est stockée ici.
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Création automatique du profil à l'inscription (le pseudo vient des metadata Supabase Auth)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_friend check (requester_id <> addressee_id)
);

-- Empêche les demandes en double dans un sens comme dans l'autre
create unique index friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "friendships_select_own"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert_own_request"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

-- Seul le destinataire accepte/refuse ; l'un ou l'autre peut annuler (delete) une relation
create policy "friendships_update_participant"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_delete_participant"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Fonction centrale de vérification d'amitié, utilisée par toutes les policies
-- de lecture des données de paris/bankroll. SECURITY DEFINER pour rester stable
-- et performante indépendamment des policies de la table friendships.
create function public.are_friends(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = target)
        or (requester_id = target and addressee_id = auth.uid()))
  );
$$;

revoke all on function public.are_friends(uuid) from public;
grant execute on function public.are_friends(uuid) to authenticated;

-- ============================================================
-- Trigger générique updated_at
-- ============================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- BANKROLLS (config par utilisateur)
-- ============================================================
create table public.bankrolls (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  starting_amount numeric(12, 2) not null default 0 check (starting_amount >= 0),
  unit_percentage numeric(5, 2) not null default 1 check (unit_percentage > 0),
  currency text not null default 'EUR',
  updated_at timestamptz not null default now()
);

alter table public.bankrolls enable row level security;

create trigger bankrolls_set_updated_at
  before update on public.bankrolls
  for each row execute function public.set_updated_at();

create policy "bankrolls_select_own_or_friend"
  on public.bankrolls for select
  to authenticated
  using (user_id = auth.uid() or public.are_friends(user_id));

create policy "bankrolls_insert_own"
  on public.bankrolls for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bankrolls_update_own"
  on public.bankrolls for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "bankrolls_delete_own"
  on public.bankrolls for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- BANKROLL_ADJUSTMENTS (dépôts / retraits manuels)
-- ============================================================
create table public.bankroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount <> 0), -- positif = dépôt, négatif = retrait
  note text,
  created_at timestamptz not null default now()
);

create index bankroll_adjustments_user_idx on public.bankroll_adjustments (user_id);

alter table public.bankroll_adjustments enable row level security;

create policy "bankroll_adjustments_select_own_or_friend"
  on public.bankroll_adjustments for select
  to authenticated
  using (user_id = auth.uid() or public.are_friends(user_id));

create policy "bankroll_adjustments_insert_own"
  on public.bankroll_adjustments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bankroll_adjustments_update_own"
  on public.bankroll_adjustments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "bankroll_adjustments_delete_own"
  on public.bankroll_adjustments for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- BETS (paris simples et parlays)
-- ============================================================
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bet_type text not null default 'single' check (bet_type in ('single', 'parlay')),
  stake numeric(12, 2) not null check (stake > 0),
  status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'push')),
  confidence smallint check (confidence between 1 and 5),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bets_user_idx on public.bets (user_id);
create index bets_user_placed_at_idx on public.bets (user_id, placed_at desc);

alter table public.bets enable row level security;

create trigger bets_set_updated_at
  before update on public.bets
  for each row execute function public.set_updated_at();

create policy "bets_select_own_or_friend"
  on public.bets for select
  to authenticated
  using (user_id = auth.uid() or public.are_friends(user_id));

create policy "bets_insert_own"
  on public.bets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bets_update_own"
  on public.bets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "bets_delete_own"
  on public.bets for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- BET_LEGS (légs d'un pari : 1 pour un simple, plusieurs pour un parlay)
-- ============================================================
create table public.bet_legs (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  sort_order smallint not null default 0,
  event_description text not null,
  market text,
  odds_decimal numeric(8, 3) not null check (odds_decimal > 1),
  closing_odds_decimal numeric(8, 3) check (closing_odds_decimal > 1), -- pour le calcul du CLV
  status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'push')),
  created_at timestamptz not null default now()
);

create index bet_legs_bet_idx on public.bet_legs (bet_id);

alter table public.bet_legs enable row level security;

create policy "bet_legs_select_own_or_friend"
  on public.bet_legs for select
  to authenticated
  using (
    exists (
      select 1 from public.bets b
      where b.id = bet_legs.bet_id
        and (b.user_id = auth.uid() or public.are_friends(b.user_id))
    )
  );

create policy "bet_legs_insert_own"
  on public.bet_legs for insert
  to authenticated
  with check (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = auth.uid())
  );

create policy "bet_legs_update_own"
  on public.bet_legs for update
  to authenticated
  using (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = auth.uid())
  );

create policy "bet_legs_delete_own"
  on public.bet_legs for delete
  to authenticated
  using (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = auth.uid())
  );
