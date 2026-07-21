<div align="center">

# Cap

**Rien ne dérive. — Aucun mail sans trace.**

Plateforme interne de **suivi de mail** et de pilotage d'équipe pour un service sécurité (DSSI) :
aucun mail de service ne reste sans réponse, relances et escalades automatiques, blocages visibles,
projets, productivité, messagerie et négligences — le tout **100 % local (LAN), sans cloud**.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-local-044a64?logo=sqlite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

</div>

> **🇫🇷 Français** ci-dessous · **🇬🇧 [English summary](#-english-summary)** at the bottom.

---

## ✨ Fonctionnalités

- **📥 Suivi de mail** — chaque mail de service est tracé (référence normalisée, objet, priorité, personnes, points clés), avec statut et timeline complète.
- **🔔 Relances & escalades automatiques** — SLA par type ; l'application rappelle, escalade vers la direction et envoie un digest quotidien (in-app, e-mail optionnel via Resend).
- **🧱 Blocages** — vue dédiée « ce qui ne bouge pas » ; l'agent qualifie le motif et consigne les démarches de déblocage.
- **📊 Statistiques & rapports PDF** — par émetteur / destinataire / service / criticité / appréciation / cause ; export d'un rapport imprimable sur période libre.
- **📁 Projets** — tâches, avancement, membres, notes ; workflow de statut (manager propose → directeur valide) et **demande de clôture** par un agent (récapitulatif + livrables) validée par un manager/directeur.
- **✅ Productivité** — vue d'équipe : charge, rendement, tâches assignables avec sous-tâches, planification et statuts.
- **💬 Messagerie interne** — messages privés (1:1), groupes, fils sur un suivi de mail / une négligence / un projet, réactions emoji, réponses ciblées, notifications avec **bip sonore**.
- **⚠️ Négligences** — fiches transmises au DG (décision sur document imprimé) avec service/personne en cause et cadran de décisions.
- **🛡️ Sécurité & administration** — inscription soumise à approbation, rôles (agent / manager / directeur / admin / DSI), accès par vue configurables, comptes en lecture seule, et paramètres de sécurité pilotables depuis l'interface.

## 🧱 Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Next.js 16** (App Router, TypeScript, Turbopack) |
| UI | **React 19**, **Tailwind CSS 4**, icônes **lucide-react** |
| Données | **SQLite** local via **better-sqlite3** (fichier unique, WAL) — aucun serveur externe |
| Auth | Sessions par cookie httpOnly, hachage **scrypt** (`node:crypto`) |
| Graphes | **recharts** |

Aucun cloud, aucun Docker : l'application se déploie sur un serveur de l'entreprise et s'utilise dans le **LAN**.

## 🚀 Démarrage rapide

**Prérequis :** Node.js ≥ 20 (testé sur 24) et npm.

```bash
# 1. Installer les dépendances
npm install

# 2. (Optionnel) copier le modèle d'environnement
cp .env.local.example .env.local

# 3. Lancer en développement
npm run dev
# → http://localhost:3000
```

Au **premier lancement**, la base `data/cap.sqlite` est créée automatiquement.

> **🔑 Premier compte = administrateur.** Le tout premier compte créé via l'écran d'inscription
> devient **administrateur** et est **approuvé d'office**. Toutes les inscriptions suivantes sont
> **en attente d'approbation** par un administrateur (paramétrable dans **Administration → Sécurité**).

### Déploiement LAN (production)

```bash
npm run build
npm run start:lan   # écoute sur 0.0.0.0:3000 — accessible depuis le réseau local
```

En HTTPS, lancer avec `COOKIE_SECURE=1` (et activer HSTS depuis l'administration).

## ⚙️ Configuration

Toutes les variables sont **optionnelles** et documentées dans [`.env.local.example`](.env.local.example) :
`DATABASE_PATH`, `NEXT_PUBLIC_ORG_NAME`, `COOKIE_SECURE`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_DEMO`.

## 🔐 Sécurité

- **Approbation des inscriptions** par un administrateur ; les comptes non approuvés n'accèdent à aucune donnée (blocage côté layout **et** côté API).
- **RBAC** par rôle et **accès par vue** configurables ; comptes en **lecture seule** (le rôle DSI l'est toujours) appliqués côté serveur sur toutes les routes mutantes.
- **Rate-limiting** de la connexion et de l'inscription (seuils configurables).
- **En-têtes de sécurité** posés sur chaque réponse (CSP stricte, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) + **HSTS** activable à chaud.
- **Sessions** : jeton fort, expiration glissante, rotation à la connexion.
- **Rotation des mots de passe** : politique d'âge et « forcer le renouvellement » par utilisateur.

Tout est paramétrable depuis **Administration → Sécurité**. Pour signaler une vulnérabilité, voir [`SECURITY.md`](SECURITY.md).

## 🗂️ Structure du projet

```
app/          Routes (App Router) : (app)/ pages protégées, api/ routes serveur, login, pending, change-password
components/    Composants React (Shell, Drawer, modales, Discussion, atomes…)
lib/
  domain.ts   Types & logique métier (source de vérité)
  db/         Accès SQLite (schéma, migrations additives, dépôts)
  auth/       Sessions, hachage, gardes, rate-limit
  nav.ts      Navigation & contrôle d'accès par vue
proxy.ts      En-têtes de sécurité (runtime Node)
data/         Base SQLite locale (git-ignorée)
```

## 📜 Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` / `start:lan` | Serveur de production (LAN) |
| `npm run reminders` | Déclenche le moteur de relance (à planifier via le planificateur du serveur) |
| `npm run lint` | Analyse ESLint |

## 🤝 Contribuer

Les contributions sont bienvenues — voir [`CONTRIBUTING.md`](CONTRIBUTING.md) et le [code de conduite](CODE_OF_CONDUCT.md).
Le suivi des changements est dans [`CHANGELOG.md`](CHANGELOG.md).

## 📄 Licence

Distribué sous licence **MIT** — voir [`LICENSE`](LICENSE).

---

## 🇬🇧 English summary

**Cap** is a self-hosted, LAN-only platform for **email follow-up** and team operations for a security team.
It ensures no service email goes untracked: automated reminders and escalations, blockers surfacing, projects,
team productivity, internal messaging and a negligence register — all backed by a single local **SQLite** file,
**no cloud, no Docker**.

Built with **Next.js 16 / React 19 / TypeScript / Tailwind CSS 4** and **better-sqlite3**.

**Quickstart:** `npm install` → `npm run dev` → open `http://localhost:3000`.
The **first registered account becomes the administrator** (auto-approved); every later sign-up requires admin
approval (configurable). Security (approval, RBAC, per-view access, read-only accounts, rate-limiting, security
headers, HSTS, password rotation) is fully configurable from **Administration → Security**.

Licensed under **MIT**. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).
