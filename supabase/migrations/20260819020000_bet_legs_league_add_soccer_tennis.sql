-- Ajoute Soccer et Tennis aux ligues autorisées.
alter table public.bet_legs drop constraint bet_legs_league_check;
alter table public.bet_legs
  add constraint bet_legs_league_check check (league in ('MLB', 'NBA', 'NFL', 'NHL', 'Soccer', 'Tennis'));
