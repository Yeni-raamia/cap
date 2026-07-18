# Cap — hébergement local & LAN

L'app fonctionne **entièrement en local**, sans cloud ni Docker. Les données
vivent dans un **fichier SQLite** sur le serveur, lu et écrit par l'application :
elles sont donc **persistées** et **partagées** par tous les utilisateurs du
réseau. L'accès se fait par **comptes** (e-mail + mot de passe), avec des rôles
(agent / directeur / admin) réellement appliqués côté serveur.

## 1. Prérequis

- **Node.js 18, 20, 22 ou 24** (Node 20 LTS recommandé sur un serveur).
- Rien d'autre : `better-sqlite3` s'installe avec un binaire précompilé.

## 2. Installation

```bash
npm install
```

(Optionnel) Copier le modèle d'environnement si tu veux personnaliser :

```bash
cp .env.local.example .env.local
```

## 3. Lancer en développement (sur ta machine)

```bash
npm run dev
```

→ http://localhost:3000. Au **premier lancement**, la page de connexion propose
de **créer un compte** : ce **premier compte devient administrateur**. Les
comptes suivants sont « agent » ; l'admin peut changer les rôles dans
*Administration*.

## 4. Héberger sur un serveur d'entreprise (accès LAN)

Sur le serveur qui hébergera l'app :

```bash
npm install
npm run build
npm run start:lan      # écoute sur 0.0.0.0:3000 (accessible depuis le LAN)
```

Les autres postes y accèdent via **http://IP-DU-SERVEUR:3000**
(ex. `http://192.168.1.20:3000`).

### Points à prévoir sur le serveur

- **Pare-feu** : autoriser le port **3000** en entrée (ou le port choisi).
  - Windows : *Pare-feu Windows Defender → Règles de trafic entrant → Nouvelle
    règle → Port → TCP 3000 → Autoriser*.
- **Cookies en HTTP** : sur un LAN en http, laisser `COOKIE_SECURE` non défini
  (le cookie de session ne serait pas transmis en https-only). Si tu mets l'app
  derrière un reverse-proxy HTTPS, passe `COOKIE_SECURE=1`.
- **Emplacement de la base** : par défaut `./data/cap.sqlite`. Pour la placer sur
  un disque sauvegardé, définis `DATABASE_PATH` dans `.env.local`, ex. :
  `DATABASE_PATH=D:/cap-data/cap.sqlite`.
- **Garder l'app allumée** : lance `npm run start:lan` via un service.
  - Simple : un gestionnaire de processus comme **PM2**
    (`npm i -g pm2 && pm2 start "npm run start:lan" --name cap`).
  - Windows : une tâche planifiée « au démarrage » ou un service (NSSM).

## 5. Sauvegarde des données

Toutes les données sont dans **un seul fichier** (`data/cap.sqlite`, +
`.sqlite-wal`/`.sqlite-shm` temporaires). Pour sauvegarder : **copier ce
fichier** (idéalement app arrêtée, ou via `VACUUM INTO`). Pour restaurer :
remettre le fichier en place.

> Ce fichier contient des données réelles : il est **git-ignoré** et ne doit
> **jamais** être commité ni publié.

## 6. Mode démo (facultatif)

Pour montrer l'app sans compte ni base (données en mémoire, remises à zéro à
chaque redémarrage) :

```bash
# dans .env.local
NEXT_PUBLIC_DEMO=1
```

## 7. Moteur de relance (rappels, escalade, digest)

Le système relance à la place de la responsable. À chaque exécution du job :

- chaque objet **en relance** (SLA dépassé) → notification à son **propriétaire** ;
- chaque objet **escaladé** → notification aux **directeurs** (ou admins à défaut) ;
- un **digest** quotidien (nb escaladés + nb bloqués) → aux directeurs.

Canaux : toujours **in-app** (cloche + page *Rappels*). En plus, **e-mail** si
Resend est configuré (`RESEND_API_KEY`) — sinon in-app uniquement. Le job est
**idempotent** : pas de doublon non lu le même jour pour le même objet.

### Déclencher le job

```bash
npm run reminders      # appelle /api/cron/reminders (le serveur doit tourner)
```

- Protège la route en LAN/prod en définissant `CRON_SECRET` dans `.env.local`
  (le script `npm run reminders` lit ce même secret). Sans secret, la route est
  ouverte (pratique en local).
- **Planifier chaque matin** :
  - Windows : *Planificateur de tâches* → action « Démarrer un programme » →
    `npm` argument `run reminders`, déclencheur quotidien (ex. 08:00), dans le
    dossier de l'app.
  - Linux : une entrée `cron`, ex. `0 6 * * * cd /chemin/cap && npm run reminders`.
  - Alternative : appeler directement l'URL avec le secret
    (`curl -X POST http://localhost:3000/api/cron/reminders -H "Authorization: Bearer <CRON_SECRET>"`).

### Activer l'e-mail (optionnel)

Créer un compte sur https://resend.com, générer une clé API, puis dans
`.env.local` : `RESEND_API_KEY=...` (et éventuellement `RESEND_FROM=...` avec un
domaine vérifié). Sans cela, tout reste in-app.

## 8. Gestion des comptes et rôles

- 1er compte créé = **admin**.
- L'admin va dans **Administration → Membres & rôles** pour promouvoir un membre
  en **directeur** (accès *Blocages*, *Statistiques*, digest) ou **admin**.
- Un **agent** ne voit que *Mon espace*, *Vue globale*, *Classement*, *Rappels*
  et ne peut éditer que **ses** objets (contrôle appliqué côté serveur).
