-- Quand activé, les amis voient toujours les stats/calendrier/graphique
-- mais pas le détail (description, marché, notes) du journal de paris.
alter table public.profiles
  add column private_journal boolean not null default false;
