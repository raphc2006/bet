-- Préférences utilisateur (page Paramètres) + stockage des photos de profil.

alter table public.profiles
  add column avatar_url text,
  add column odds_format text not null default 'decimal' check (odds_format in ('decimal', 'american')),
  add column locale text not null default 'fr' check (locale in ('fr', 'en'));

-- ============================================================
-- STORAGE : bucket "avatars"
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Convention de chemin : {user_id}/{fichier}. On extrait le premier segment
-- du chemin pour vérifier qu'il correspond à l'utilisateur courant.
create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Bucket public : n'importe qui (y compris non connecté) peut afficher un avatar.
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
