-- Ajoute la ligue (MLB/NBA/NFL/NHL) sur chaque leg de pari.
alter table public.bet_legs
  add column league text check (league in ('MLB', 'NBA', 'NFL', 'NHL'));
