# JulienLab V7 — migration complète V5/V6 + laboratoire 3D

Cette version est la fondation complète de JulienLab V7. Elle conserve la base Neon et les concepts de V5/V6, puis remplace le laboratoire monolithique par React + TypeScript + Babylon.js.

## Ce qui est intégré

- comptes élève, enseignant et administrateur ;
- sessions V5/V6 compatibles (`jl_sessions.role = user/admin`) ;
- rôle applicatif moderne dans `jl_users.role = student/teacher/admin` ;
- Premium mensuel/annuel et clés liées à l'adresse email ;
- règle V5/V6 : les 3 premières expériences de chaque classe sont gratuites ;
- classes enseignant, code d'adhésion, membres et devoirs ;
- progression par expérience et progression globale ;
- tableau de bord enseignant avec résultats par devoir ;
- import d'élèves depuis Excel et export Excel multi-feuilles ;
- administration des rôles, abonnements, comptes et clés ;
- catalogue V5/V6 synchronisé automatiquement depuis le dépôt GitHub ;
- moteur 3D universel : une définition d'expérience pilote la scène, les contrôles, le protocole, l'évaluation et le quiz ;
- interactions tactiles 1er toucher = fiche / 2e toucher = reconnaissance ;
- PWA et cache du catalogue ;
- file d'attente de progression hors connexion pour synchronisation au retour du réseau.

## Synchronisation des expériences

La V7 ne recopie pas manuellement les expériences de V5/V6. `scripts/sync-v6-catalog.mjs` lit la version V5/V6 figée, extrait en sécurité avec JSON5 :

- `gradeInfo` ;
- `equipment` ;
- `experiments`.

Le résultat est écrit dans `src/experiments/generatedCatalog.json` avant chaque build. Une API `/api/v7/catalog` fournit la même synchronisation en secours. Ainsi, les identifiants historiques utilisés par les devoirs et la progression restent inchangés.

## Moteur d'expérience V7

Chaque expérience fournit notamment :

`id`, `grade`, `module`, `unit`, `title`, `kind`, `tools`, `reagents`, `controls`, `target`, `protocol`, `equation`, `success`, `failure`, `question`.

Le moteur V7 :

1. construit la scène Babylon.js à partir de `tools` ;
2. construit automatiquement les réglages à partir de `controls` ;
3. compare les choix à `target` ;
4. affiche le résultat scientifique V5/V6 ;
5. vérifie la question finale ;
6. calcule le score ;
7. enregistre `jl_experiment_progress` puis agrège `jl_progress`.

Les modèles GLB spécifiques peuvent remplacer progressivement les formes procédurales sans changer la logique des expériences.

## Base Neon

La production V5/V6 reste sur la branche `production`. Une branche de travail séparée `v7-dev` a été créée à partir de la production pour tester la V7 sans toucher aux données utilisées par la V6.

Au moment de la préparation, les deux branches contenaient le même état de départ (6 utilisateurs, 8 clés d'activation, aucune classe/devoir/progression encore enregistrés).

Aucune migration destructive n'est nécessaire pour cette fondation : les tables V5/V6 actuelles couvrent les comptes, sessions, clés, classes, membres, devoirs, progression et sécurité.

## Développement

```bash
npm install
npm run dev
```

`npm run dev` synchronise d'abord le catalogue V5/V6 puis démarre Vite.

## Build Vercel

```bash
npm install
npm run build
```

Variables privées Vercel requises :

- `DATABASE_URL` — utiliser la branche `v7-dev` pour les previews ;
- `ADMIN_EMAIL` ;
- `ADMIN_PASSWORD` ;
- éventuellement `JULIENLAB_V6_REVISION`.

Le projet utilise `vercel.json` avec Vite et les fonctions serverless du dossier `/api`.

## Passage en production

Ne pas remplacer V6 directement. Ordre recommandé :

1. déployer V7 en Preview avec `DATABASE_URL` de `v7-dev` ;
2. tester élève / enseignant / admin / Excel / Premium / catalogue / mobile ;
3. vérifier les expériences ;
4. connecter ensuite la V7 à la branche Neon `production` ;
5. basculer le domaine principal seulement après validation.
