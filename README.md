# BetTracker

Application de suivi de paris sportifs multi-utilisateurs, avec bankroll, journal de paris (simples et parlays), statistiques et système d'amis.

## Stack

- **Frontend** : React + Vite + TypeScript + Tailwind CSS
- **Backend / Base de données / Auth** : [Supabase](https://supabase.com) (PostgreSQL + Auth + Row Level Security)
- **Hébergement** : Vercel (frontend) + Supabase Cloud (backend)

## Structure du projet

```
src/
  lib/            Client Supabase, contexte d'authentification (logique centralisée)
  hooks/          Hooks React (useAuth, ...)
  components/     Composants réutilisables (ProtectedRoute, formulaires...)
  pages/          Pages de l'application (Login, Signup, Dashboard...)
  types/          Types TypeScript (dont le schéma Supabase généré)
  features/       Logique métier par domaine (paris, bankroll, amis) — ajoutée aux étapes suivantes
```

## Démarrage local

1. Le projet Supabase "Bankroll bets" existe déjà (voir `supabase/migrations/` pour le schéma appliqué).
2. Copie `.env.example` vers `.env.local` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (Settings > API dans le dashboard Supabase).
3. Installe les dépendances et lance le serveur de dev :

```bash
npm install
npm run dev
```

L'app est disponible sur `http://localhost:5173`. Sans session active, elle redirige automatiquement vers `/login`.

## Base de données (Supabase)

Le schéma complet vit dans `supabase/migrations/` (appliqué directement sur le projet via le MCP Supabase) :

- `profiles` — un profil par utilisateur (pseudo unique), créé automatiquement à l'inscription via un trigger sur `auth.users`.
- `friendships` — demandes d'amis avec statut `pending` / `accepted` / `declined`, une seule relation possible entre deux utilisateurs quel que soit le sens.
- `bankrolls` — configuration de bankroll par utilisateur (montant de départ, unité de mise en %).
- `bankroll_adjustments` — historique des dépôts/retraits manuels.
- `bets` / `bet_legs` — paris (simples ou parlays) et leurs légs (cotes décimales, cote de clôture pour le CLV, statut par leg).

**Sécurité : tout est appliqué au niveau de la base via Row Level Security (RLS), pas seulement côté frontend.** Chaque table de données (`bankrolls`, `bankroll_adjustments`, `bets`, `bet_legs`) a une policy qui n'autorise la lecture que si `user_id = auth.uid()` (c'est toi) OU s'il existe une amitié `accepted` entre toi et cet utilisateur (vérifié par la fonction `are_friends()`). Écriture toujours restreinte au propriétaire. Même en contournant complètement le frontend et en appelant l'API Supabase directement, il est impossible de lire les données de quelqu'un qui n'est pas un ami accepté.

## État d'avancement

- [x] Étape 1 — Setup du projet, thème sportsbook, authentification (inscription/connexion/déconnexion)
- [x] Étape 2 — Modèle de données (paris, parlays, bankroll, amis) + Row Level Security
- [ ] Étape 3 — Dashboard personnel connecté à Supabase
- [ ] Étape 4 — Système d'amis
- [ ] Étape 5 — Déploiement
