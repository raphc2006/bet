-- Optimisation: auth.uid() / are_friends() enveloppés dans (select ...) pour être
-- évalués une seule fois par requête plutôt qu'à chaque ligne (recommandation Supabase).

alter policy "profiles_insert_own" on public.profiles
  with check (id = (select auth.uid()));

alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "friendships_select_own" on public.friendships
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

alter policy "friendships_insert_own_request" on public.friendships
  with check ((select auth.uid()) = requester_id);

alter policy "friendships_update_participant" on public.friendships
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

alter policy "friendships_delete_participant" on public.friendships
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

alter policy "bankrolls_select_own_or_friend" on public.bankrolls
  using (user_id = (select auth.uid()) or (select public.are_friends(user_id)));

alter policy "bankrolls_insert_own" on public.bankrolls
  with check (user_id = (select auth.uid()));

alter policy "bankrolls_update_own" on public.bankrolls
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "bankrolls_delete_own" on public.bankrolls
  using (user_id = (select auth.uid()));

alter policy "bankroll_adjustments_select_own_or_friend" on public.bankroll_adjustments
  using (user_id = (select auth.uid()) or (select public.are_friends(user_id)));

alter policy "bankroll_adjustments_insert_own" on public.bankroll_adjustments
  with check (user_id = (select auth.uid()));

alter policy "bankroll_adjustments_update_own" on public.bankroll_adjustments
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "bankroll_adjustments_delete_own" on public.bankroll_adjustments
  using (user_id = (select auth.uid()));

alter policy "bets_select_own_or_friend" on public.bets
  using (user_id = (select auth.uid()) or (select public.are_friends(user_id)));

alter policy "bets_insert_own" on public.bets
  with check (user_id = (select auth.uid()));

alter policy "bets_update_own" on public.bets
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "bets_delete_own" on public.bets
  using (user_id = (select auth.uid()));

alter policy "bet_legs_select_own_or_friend" on public.bet_legs
  using (
    exists (
      select 1 from public.bets b
      where b.id = bet_legs.bet_id
        and (b.user_id = (select auth.uid()) or (select public.are_friends(b.user_id)))
    )
  );

alter policy "bet_legs_insert_own" on public.bet_legs
  with check (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = (select auth.uid()))
  );

alter policy "bet_legs_update_own" on public.bet_legs
  using (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = (select auth.uid()))
  );

alter policy "bet_legs_delete_own" on public.bet_legs
  using (
    exists (select 1 from public.bets b where b.id = bet_legs.bet_id and b.user_id = (select auth.uid()))
  );
