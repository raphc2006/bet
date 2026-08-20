-- Juste après la création d'une conversation, le créateur n'est pas encore membre
-- (la ligne conversation_members est ajoutée dans un second appel), ce qui bloquait
-- le retour de la ligne insérée (INSERT ... RETURNING vérifie aussi la policy SELECT).
alter policy "conversations_select_member" on public.conversations
  using (
    created_by = (select auth.uid())
    or (select public.is_conversation_member(id))
  );
