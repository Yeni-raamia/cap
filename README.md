# Cap — « Rien ne dérive. »

> Suivi et réconciliation des mails de service. **Aucun mail sans trace.**

Cap transforme chaque mail de service (alerte, demande, validation…) en un
**objet de suivi** qui ne peut plus tomber dans l'oubli : le système relance à la
place de la responsable, escalade automatiquement, et met en lumière « ce qui ne
bouge pas et pourquoi ». Chaque agent a son espace, une vue globale montre le
travail de tous, et un classement valorise ceux qui font avancer les choses —
dans une logique de **culture juste** (on valorise déclarer, relancer, clôturer —
jamais le volume brut, jamais le *name-and-shame*).

L'application fonctionne **entièrement en local**, sans cloud : les données
vivent dans un fichier **SQLite** sur le serveur, partagé par toute l'équipe sur
le réseau (LAN). Accès par **comptes** (e-mail + mot de passe) avec des rôles
réellement appliqués.

---

## Fonctionnalités

- **Le Fil** : chaque objet progresse le long d'une frise *Créé → Envoyé →
  Relance → Réponse → Traitement → Clôturé* (point rouge si bloqué).
- **Saisie quasi nulle** : on choisit métier + type dans des listes et on écrit
  l'objet ; la référence (`SOC-2026-0043`) est générée automatiquement. Un mode
  « coller un objet existant » reconnaît aussi les objets déjà normalisés.
- **7 vues** : Mon espace, Vue globale, Ce qui ne bouge pas, Statistiques,
  Classement, Rappels, Administration.
- **Moteur de relance** : rappels aux agents, escalade aux directeurs, digest
  quotidien — in-app, et par e-mail si configuré.
- **Rôles (RBAC)** : *agent*, *directeur*, *admin*, appliqués **côté serveur**.
- **Classement « culture juste »** avec badges (Relanceur, Closeur, Réactif,
  Zéro oubli).

---

## Prérequis

- **Node.js 18, 20, 22 ou 24** (Node 20 LTS recommandé sur un serveur).
- Rien d'autre : la base SQLite (`better-sqlite3`) s'installe avec un binaire
  précompilé — pas de cloud, pas de Docker.

## Installation

```bash
npm install
```

(Optionnel) Copier le modèle d'environnement pour personnaliser :

```bash
cp .env.local.example .env.local
```

Toutes les variables sont **optionnelles** — voir `.env.local.example`.

## Lancer en local

```bash
npm run dev
```

→ http://localhost:3000. Au **premier lancement**, la page de connexion propose
de **créer un compte** ; ce **premier compte devient administrateur**. Les
comptes suivants sont *agent* ; l'admin change les rôles dans *Administration*.

### Mode démo (sans compte ni base)

Pour découvrir l'app avec des données d'exemple (en mémoire, non partagées,
remises à zéro à chaque redémarrage) :

```bash
# dans .env.local
NEXT_PUBLIC_DEMO=1
```

Un **sélecteur d'utilisateur** permet alors d'essayer les différents rôles.

## Comptes & rôles

- **agent** : *Mon espace*, *Vue globale* (lecture), *Classement*, *Rappels* ;
  crée/édite **ses** objets uniquement.
- **directeur** : tout, dont *Ce qui ne bouge pas*, *Statistiques* ; reçoit les
  escalades et le digest.
- **admin** : comme directeur + gère les membres, les rôles et le catalogue.

Un agent ne peut pas éditer l'objet d'un autre : le contrôle est appliqué **côté
serveur** (routes API), pas seulement dans l'interface.

## Moteur de relance

```bash
npm run reminders      # le serveur doit tourner
```

- crée les rappels (agents), escalades (directeurs) et le digest quotidien ;
- **idempotent** (pas de doublon non lu le même jour) ;
- **e-mail** en plus de l'in-app si `RESEND_API_KEY` est défini, sinon in-app
  seulement ;
- route protégée par `CRON_SECRET` (à définir en LAN/prod).

À planifier chaque matin (Planificateur de tâches Windows / cron) — détails dans
[`docs/HEBERGEMENT_LAN.md`](docs/HEBERGEMENT_LAN.md).

## Héberger sur un serveur d'entreprise (LAN)

```bash
npm install
npm run build
npm run start:lan      # écoute sur 0.0.0.0:3000
```

Les postes accèdent via `http://IP-DU-SERVEUR:3000`. Voir
[`docs/HEBERGEMENT_LAN.md`](docs/HEBERGEMENT_LAN.md) pour le pare-feu, le maintien
en service (PM2 / service Windows), l'emplacement de la base et sa **sauvegarde**.

## Sauvegarde des données

Tout est dans un seul fichier : `data/cap.sqlite` (par défaut ;
personnalisable via `DATABASE_PATH`). Pour sauvegarder : copier ce fichier. Il
est **git-ignoré** et ne doit jamais être publié.

## Sécurité & confidentialité

- **Aucun secret commité** : tout dans `.env.local` (git-ignoré). Modèle fourni
  dans `.env.local.example`.
- **Anonymat** : le nom de l'organisation/équipe est configurable
  (`NEXT_PUBLIC_ORG_NAME`, défaut neutre « Équipe sécurité ») dans
  `lib/config.ts`. Aucun nom d'institution ou de personne réelle dans le code
  versionné. Les données réelles restent **en local** (fichier SQLite git-ignoré).
- **Mots de passe** hachés (scrypt) ; sessions par cookie httpOnly.
- **En HTTP sur le LAN**, laisser `COOKIE_SECURE` non défini ; en HTTPS, mettre
  `COOKIE_SECURE=1`.

## Publier sur GitHub (via GitHub Desktop)

Le dossier est déjà un dépôt local (`Documents\GitHub\cap`). Quand tu es
satisfaite : onglet **Changes** pour vérifier, **Commit to main**, puis
**Publish repository** (première fois) ou **Push origin**. Décoche « Keep this
code private » seulement pour un dépôt public. **Vérifie une dernière fois
qu'aucun `.env.local`, fichier `.sqlite` ni le dossier `reference/` n'est suivi.**

## Structure

```
app/            # routes (App Router) : pages (app)/* + routes API /api/*
components/     # UI : Fil, ItemCard, Drawer, NewSuiviModal, Sidebar, Topbar…
lib/
  domain.ts     # cœur métier : catalogue, SLA, statuts, scoring, parse, relances
  config.ts     # nom d'app/org, mode démo
  data/         # adaptateur « mode démo » (mémoire)
  db/           # base SQLite (schéma + dépôt d'accès) — serveur
  auth/         # mots de passe (scrypt), sessions, cookies
  reminders/    # moteur de relance + e-mail (Resend, optionnel)
docs/           # hébergement LAN
```

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · better-sqlite3 ·
Recharts · lucide-react.

---

*Devise : « Aucun mail sans trace. »*
