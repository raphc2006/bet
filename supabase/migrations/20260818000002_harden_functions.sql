-- Fixe le search_path (recommandation du linter Supabase)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user est un trigger interne (déclenché par Supabase Auth lors de l'inscription),
-- il n'a pas besoin d'être appelable directement via l'API REST.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- are_friends est utilisée en interne par les policies RLS (le rôle "authenticated" doit
-- garder EXECUTE pour que les policies fonctionnent), mais un utilisateur non connecté
-- n'a aucune raison de pouvoir l'appeler directement en RPC.
revoke execute on function public.are_friends(uuid) from anon;
