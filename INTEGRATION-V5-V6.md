# Matrice de migration V5/V6 → V7

| Domaine V5/V6 | Source actuelle | V7 |
|---|---|---|
| Utilisateurs | `jl_users` | Conservé |
| Sessions | `jl_sessions` (`user/admin`) | Conservé + lecture du rôle dans `jl_users.role` |
| Premium | `premium_until`, `last_plan` | Conservé |
| Clés | `jl_activation_keys` | Conservé + administration V7 |
| Classes | `jl_classes` | Conservé |
| Élèves par classe | `jl_class_members` | Conservé |
| Devoirs | `jl_assignments` | Conservé |
| Progression globale | `jl_progress` | Conservé |
| Progression par expérience | `jl_experiment_progress` | Conservé |
| Catalogue pédagogique | `index.html` V5/V6 | Synchronisation JSON5 vers V7 |
| Interface labo | HTML/CSS/JS monolithique | React + Babylon.js |
| Excel | absent/partiel | Import élèves + export élèves/devoirs/résultats/admin |
| Mobile | responsive V5/V6 | mobile-first + panneaux tactiles |
| PWA | partiel | service worker + cache catalogue + queue progression |

## Compatibilité des identifiants

Les `experiment_id` ne sont pas renommés. Un devoir V5/V6 comme `t-oxydation-alcools` reste donc compatible avec V7 et avec `jl_experiment_progress`.

## Sécurité de la migration

- V6 n'est pas modifiée par le projet V7.
- Les essais V7 utilisent la branche Neon `v7-dev`.
- Les secrets restent dans Vercel/`.env` et ne doivent jamais entrer dans GitHub.
- Le catalogue est synchronisé depuis une révision GitHub figée par défaut pour éviter un changement silencieux du programme pendant un build.
