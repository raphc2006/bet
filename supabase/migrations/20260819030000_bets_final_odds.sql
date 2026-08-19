-- Permet de surcharger la cote combinée calculée d'un parlay (ex: cote boostée par le book).
alter table public.bets
  add column final_odds_decimal numeric(10, 3) check (final_odds_decimal > 1);
