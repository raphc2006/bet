-- Semaine ISO (format "2026-W34") de la dernière revue hebdomadaire affichée à l'utilisateur.
alter table public.profiles
  add column last_week_review_shown text;
