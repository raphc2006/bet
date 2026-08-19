-- Objectif de bankroll (optionnel), affiché avec une barre de progression.
alter table public.bankrolls
  add column goal_amount numeric(12, 2) check (goal_amount > 0);
