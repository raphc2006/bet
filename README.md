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

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Copie `.env.example` vers `.env.local` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (Settings > API dans Supabase).
3. Installe les dépendances et lance le serveur de dev :

```bash
npm install
npm run dev
```

L'app est disponible sur `http://localhost:5173`. Sans session active, elle redirige automatiquement vers `/login`.

## État d'avancement

- [x] Étape 1 — Setup du projet, thème sportsbook, authentification (inscription/connexion/déconnexion)
- [ ] Étape 2 — Modèle de données (paris, parlays, bankroll, amis) + Row Level Security
- [ ] Étape 3 — Dashboard personnel connecté à Supabase
- [ ] Étape 4 — Système d'amis
- [ ] Étape 5 — Déploiement
