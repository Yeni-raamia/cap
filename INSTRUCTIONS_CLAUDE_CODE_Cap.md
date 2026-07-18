# Cap — Suivi DSSI · Instructions de build pour Claude Code

> **Mission :** construire, **de bout en bout et en local sur cette machine**, une application web de suivi et de réconciliation des mails de service, à partir de ce document. Tu travailles dans le dossier **déjà créé** (`...\Documents\GitHub\cap`) : tu y crées tous les fichiers, installes les dépendances, fais des commits **locaux** propres à chaque étape, et vérifies que l'app tourne. **Tu ne pousses rien sur GitHub** — la propriétaire publiera plus tard via GitHub Desktop si elle est satisfaite.

---

## 0. Ce qu'on construit et pourquoi

Une équipe de sécurité (la DSSI) envoie chaque jour des mails de service (alertes, demandes, validations…) vers d'autres services et des prestataires. Aujourd'hui, **tant que la responsable ne relance pas chaque personne, les actions tombent aux oubliettes pendant des semaines**. L'app résout exactement ça :

- **Aucun mail sans trace.** Chaque mail de service devient un *objet de suivi* dans l'app.
- **Le système relance à la place de la responsable :** rappels automatiques aux agents, escalade automatique, digest quotidien des blocages.
- **Le travail invisible devient visible et mesurable :** timeline d'avancement, statistiques, « ce qui ne bouge pas et pourquoi ».
- **Chaque agent a son espace ;** une vue globale montre le travail de tous ; un classement d'équipe valorise ceux qui font avancer les choses.

Nom de l'app : **Cap**. Baseline : **« Rien ne dérive. »**. Devise produit : **« Aucun mail sans trace. »** Ton de l'app : sobre, professionnel, bienveillant — **culture juste** (on valorise déclarer/relancer/clôturer, jamais le volume brut, jamais le name-and-shame).

Une **maquette de référence** existe : le fichier `cap-suivi-dssi.jsx`. Si la propriétaire l'a placé dans un dossier `reference/` du projet, **reprends-en fidèlement l'UX, la palette et les composants** (surtout : le « Fil », les cartes d'objet, le drawer de détail, le classement). Sinon, ce document décrit tout ce qu'il faut.

---

## 1. Règles d'or (à respecter tout au long)

1. **Travaille dans le dossier courant.** Le projet vit dans un dossier **déjà créé** (ex. `...\Documents\GitHub\cap`, l'emplacement des dépôts GitHub Desktop). Tu es lancé **depuis ce dossier** : **n'en crée pas de nouveau**, scaffolde **sur place**. Ne supprime jamais le `.git` déjà présent.
2. **Travaille par phases** (§7). À la fin de **chaque** phase : l'app doit tourner (`npm run dev`), tu fais un **commit git** avec le message indiqué, puis **tu t'arrêtes et tu résumes** ce qui est fait et comment tester, avant de continuer. La propriétaire valide chaque phase.
3. **Environnement Windows probable.** Détecte l'OS. Utilise des commandes **cross-platform** via les scripts npm quand c'est possible. **N'utilise jamais `setx`** (bug de troncature connu sur cette machine). Pour les variables d'environnement, on passe **uniquement** par `.env.local`.
4. **Interface 100 % en français.** Vocabulaire orienté action et clair (« Relancer », « Clôturer », « Réponse reçue »).
5. **Sécurité & publication :** le code versionné doit être **publiable en open-source sans risque**. Donc : **aucun nom d'institution, aucun nom d'agent réel, aucun secret** dans les fichiers commités. Les noms d'organisation et d'équipe sont **configurables** (voir §9). Les secrets vivent dans `.env.local` (git-ignoré).
6. **Git local uniquement.** Le dépôt existe **peut-être déjà** (créé via GitHub Desktop). **Ne réinitialise pas git s'il est présent, ne crée ni ne modifie aucun *remote*, ne pousse rien.** Commits **locaux** uniquement ; la publication se fera via GitHub Desktop.
7. **Demande avant toute action destructive** (écrasement de fichiers existants, suppression). En cas de doute, tu demandes.
8. **Vérifie avant de committer :** `npm run dev` démarre sans erreur et la page cible se charge sur `http://localhost:3000`.

---

## 2. Stack technique

- **Next.js 14+** (App Router, **TypeScript**)
- **Tailwind CSS** (palette via les couleurs du thème + quelques variables CSS)
- **Supabase** (Postgres + Auth + **RLS** pour le RBAC) — projet cloud gratuit, aligné sur l'écosystème existant, déployable
- **Resend** pour l'e-mail des rappels — **optionnel** (si pas de clé, on reste en in-app)
- Cible de déploiement ultérieure : **Vercel** (Cron pour les rappels planifiés)

**Principe clé pour un build local fluide :** l'app fonctionne **dès la Phase 1 sans backend**, en **mode démo** (données de démonstration en mémoire). Supabase est branché en Phase 2 et prend le relais dès que `.env.local` est configuré. Ainsi `npm run dev` montre une app complète immédiatement, et elle devient une vraie app multi-utilisateurs quand la propriétaire le décide.

---

## 3. Prérequis (à vérifier en tout début)

Exécute et rapporte les versions :

```bash
node -v      # attendu : v20.x LTS (ou >= 18.18)
npm -v
git --version
```

- Si **Node** manque ou est trop ancien : indique-le et propose d'installer Node 20 LTS (ne l'installe pas en silence).
- Si **git** (CLI) manque : signale-le. GitHub Desktop embarque git mais pas toujours en CLI ; propose « Git for Windows », ou bien saute les étapes `git` et laisse la propriétaire faire `Add existing repository` dans GitHub Desktop. Ne bloque pas le build pour autant.

---

## 4. Le domaine métier (cœur de la logique — à respecter exactement)

Centralise tout ceci dans `lib/domain.ts`. C'est la source de vérité, réutilisée partout.

### 4.1 Les 9 métiers (préfixes de référence)

| Code | Libellé | Teinte |
|------|---------|--------|
| SOC  | Supervision & détection | rose |
| CASE | Réponse à incident | rose |
| INV  | Investigation numérique | violet |
| AUD  | Audit | sky |
| CTI  | Renseignement menace | violet |
| GRC  | Gouvernance & conformité | emerald |
| PRJ  | Projets & ingénierie | sky |
| ADM  | Coordination interne | slate |
| PRE  | Prestataires & tiers | amber |

### 4.2 Les 11 types + SLA de relance

`sla_relance` = nb de jours sans mouvement avant qu'une relance soit due. `sla_escalade` = nb de jours avant remontée automatique au Directeur. `null` = pas de relance attendue.

| Type | relance (j) | escalade (j) | urgent |
|------|:-----------:|:------------:|:------:|
| INFO | — | — | non |
| SIGNAL | 3 | 6 | non |
| ALERTE | 1 | 2 | **oui** |
| RECO | 4 | 8 | non |
| DEMANDE | 3 | 7 | non |
| RELANCE | 2 | 4 | non |
| VALIDATION | 4 | 8 | non |
| REUNION | 2 | 4 | non |
| CR | — | — | non |
| INTERDIT | 1 | 2 | **oui** |
| CLOTURE | — | — | non |

### 4.3 Statuts et avancement du « Fil »

Étapes du fil : **Créé → Envoyé → Relance → Réponse → Traitement → Clôturé**.

| Statut | % | étape (index) | couleur |
|--------|:-:|:-------------:|---------|
| Brouillon | 5 | 0 | slate |
| Envoyé | 25 | 1 | sky |
| En attente | 40 | 1 | amber |
| Relancé | 55 | 2 | amber |
| En traitement | 75 | 4 | emerald |
| Bloqué | 50 | 3 | rose |
| Clôturé | 100 | 5 | emerald |

Règle d'affichage : si un objet a un événement `reponse` et que son étape < 3, on affiche l'étape 3 (Réponse) atteinte.

### 4.4 Causes de blocage (liste fermée)
`En attente DSI` · `En attente prestataire` · `Arbitrage requis` · `Manque d'information` · `Dépendance technique`

### 4.5 État de relance d'un objet (fonction `reminderState`)
```
si statut = Clôturé            -> "none"
si statut = Bloqué             -> "bloque"
si type sans SLA               -> "none"
jours_depuis_maj >= escalade   -> "escalade"   (remonte au Directeur)
jours_depuis_maj >= relance    -> "relance"    (l'agent doit relancer)
sinon                          -> "ok"
```

### 4.6 Score « culture juste » (par agent)
```
+10 par objet Clôturé
+5  par relance effectuée
+8  par objet ayant reçu une réponse
-4  par objet actuellement escaladé (retard non traité)
score final = max(0, somme)
```
Badges : **Relanceur** (≥3 relances), **Closeur** (≥2 clôtures), **Réactif** (≥3 réponses), **Zéro oubli** (0 escalade).
Classement **visible par toute l'équipe** (choix assumé), présenté positivement (« Ceux qui font avancer les choses »).

### 4.7 Rôles (RBAC)
- **agent** : voit *Mon espace*, *Vue globale* (lecture), *Classement*, *Rappels* ; crée/édite **ses** objets.
- **directeur** : tout, y compris *Ce qui ne bouge pas*, *Statistiques*, *Administration* ; reçoit les escalades et le digest ; édite tous les objets.
- **admin** : comme directeur + gère les membres, les rôles, le catalogue et les seuils SLA.

### 4.8 Parse d'un objet de mail normalisé (saisie quasi nulle)
Depuis un objet collé (`[SOC-2026-0042] ALERTE — …`, tolère les préfixes `Re:`/`Fwd:`), extraire `metier`, `type`, `ref`, `objet`. Regex de référence :
```
/\[([A-Z]{2,6})-(?:2026-)?([0-9#]+)\]\s*(!?[A-Z]+)(?:\s+\d+)?\s*[—–-]\s*(.+)/
```
Rejeter si le métier ou le type n'existe pas dans le catalogue.

---

## 5. Modèle de données (Supabase / Postgres)

Migrations dans `supabase/migrations/`. **Le catalogue (métiers/types) est en base** pour être éditable en admin et **extensible sans refonte** (ajouter un métier/type = insérer une ligne).

### 5.1 `0001_init.sql` — types, config, tables

```sql
create type app_role   as enum ('agent','directeur','admin');
create type item_statut as enum ('Brouillon','Envoyé','En attente','Relancé','En traitement','Bloqué','Clôturé');
create type person_kind as enum ('destinataire','copie','impliqué');
create type event_kind  as enum ('creation','envoi','relance','reponse','statut','note','cloture','escalade');

create table ref_metiers (
  code text primary key, label text not null, tone text not null default 'slate', ordre int not null default 0
);
create table ref_types (
  code text primary key, label text not null,
  sla_relance int, sla_escalade int, urgent boolean not null default false, ordre int not null default 0
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, initials text not null, poste text,
  role app_role not null default 'agent', active boolean not null default true,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  metier_code text not null references ref_metiers(code),
  type_code   text not null references ref_types(code),
  objet text not null,
  priorite text not null default 'Moyenne',           -- Critique | Élevé | Moyenne
  statut item_statut not null default 'Envoyé',
  owner_id uuid not null references profiles(id),
  points_cles text[] not null default '{}',
  blocage_cause text,
  relances_count int not null default 0,
  date_creation timestamptz not null default now(),
  date_maj timestamptz not null default now(),
  closed_at timestamptz
);
create index on items(owner_id);
create index on items(statut);

create table item_people (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  name text not null, kind person_kind not null default 'destinataire'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  kind event_kind not null, label text not null,
  author_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on events(item_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  kind text not null,                                  -- relance | escalade | digest
  message text not null,
  channel text[] not null default '{in-app}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications(user_id, read);
```

### 5.2 `0002_views.sql` — relances & scores

```sql
create or replace view v_item_reminders as
select i.*, t.sla_relance, t.sla_escalade,
  floor(extract(epoch from (now() - i.date_maj))/86400)::int as days_since,
  case
    when i.statut = 'Clôturé' then 'none'
    when i.statut = 'Bloqué'  then 'bloque'
    when t.sla_relance is null then 'none'
    when extract(epoch from (now() - i.date_maj))/86400 >= t.sla_escalade then 'escalade'
    when extract(epoch from (now() - i.date_maj))/86400 >= t.sla_relance  then 'relance'
    else 'ok'
  end as reminder_level
from items i join ref_types t on t.code = i.type_code;

create or replace view v_scores as
select p.id, p.full_name, p.initials,
  count(*) filter (where i.statut='Clôturé')                                                as closures,
  coalesce(sum(i.relances_count),0)                                                          as relances,
  count(*) filter (where exists(select 1 from events e where e.item_id=i.id and e.kind='reponse')) as reponses,
  count(*) filter (where r.reminder_level='escalade')                                        as retard,
  greatest(0,
      count(*) filter (where i.statut='Clôturé')*10
    + coalesce(sum(i.relances_count),0)*5
    + count(*) filter (where exists(select 1 from events e where e.item_id=i.id and e.kind='reponse'))*8
    - count(*) filter (where r.reminder_level='escalade')*4
  ) as score
from profiles p
left join items i           on i.owner_id = p.id
left join v_item_reminders r on r.id = i.id
where p.role = 'agent'
group by p.id, p.full_name, p.initials;
```

### 5.3 `0003_rls.sql` — sécurité au niveau ligne (RBAC)

```sql
create or replace function current_app_role() returns app_role
  language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

alter table profiles      enable row level security;
alter table items         enable row level security;
alter table item_people   enable row level security;
alter table events        enable row level security;
alter table notifications enable row level security;
alter table ref_metiers   enable row level security;
alter table ref_types     enable row level security;

-- Lecture du référentiel : tout utilisateur authentifié
create policy ref_read_m on ref_metiers for select to authenticated using (true);
create policy ref_read_t on ref_types   for select to authenticated using (true);
-- Écriture du référentiel : admin uniquement
create policy ref_write_m on ref_metiers for all to authenticated using (current_app_role()='admin') with check (current_app_role()='admin');
create policy ref_write_t on ref_types   for all to authenticated using (current_app_role()='admin') with check (current_app_role()='admin');

-- Profils : chacun lit tout (annuaire), édite le sien ; admin édite tout
create policy prof_read   on profiles for select to authenticated using (true);
create policy prof_self   on profiles for update to authenticated using (id = auth.uid() or current_app_role()='admin');

-- Items : lecture globale (vue d'équipe) ; écriture = propriétaire, ou directeur/admin
create policy items_read   on items for select to authenticated using (true);
create policy items_ins    on items for insert to authenticated with check (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));
create policy items_upd    on items for update to authenticated using (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));
create policy items_del    on items for delete to authenticated using (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));

-- Tables filles : accès aligné sur l'item parent
create policy ip_all on item_people for all to authenticated
  using (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))))
  with check (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))));
create policy ev_read on events for select to authenticated using (true);
create policy ev_ins  on events for insert to authenticated with check (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))));

-- Notifications : chacun voit/traite les siennes
create policy notif_own on notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### 5.4 `seed_config.sql` — **commité, sans donnée sensible**
Insère les **9 métiers** (§4.1) et les **11 types** (§4.2). C'est tout ce qui est versionné.

### 5.5 `seed_demo.local.sql` — **git-ignoré, local uniquement**
Données de démonstration (profils + objets) avec des **noms neutres** (« Agent A », « Service réseau »…). Sert à visualiser l'app remplie en local. **Jamais commité.** Ce fichier est ajouté au `.gitignore`.

---

## 6. Architecture applicative

Arborescence cible :

```
cap/
├─ app/
│  ├─ layout.tsx  ·  globals.css
│  ├─ login/page.tsx                    # auth (Phase 2)
│  ├─ (app)/layout.tsx                  # shell : Sidebar + Topbar (garde de rôle)
│  ├─ (app)/espace/page.tsx             # Mon espace
│  ├─ (app)/global/page.tsx             # Vue globale
│  ├─ (app)/blocages/page.tsx           # Ce qui ne bouge pas
│  ├─ (app)/stats/page.tsx              # Statistiques (recharts)
│  ├─ (app)/classement/page.tsx         # Gamification
│  ├─ (app)/rappels/page.tsx            # Rappels + digest
│  ├─ (app)/admin/page.tsx              # Membres, rôles, catalogue, SLA
│  └─ api/cron/reminders/route.ts       # moteur de relance (Phase 3)
├─ components/
│  ├─ atoms.tsx (Token, TypeTag, MetierChip, Avatar, Priority, KPI, Card)
│  ├─ Fil.tsx  ·  ItemCard.tsx  ·  Drawer.tsx  ·  NewSuiviModal.tsx
│  ├─ Sidebar.tsx  ·  Topbar.tsx  ·  charts/
├─ lib/
│  ├─ domain.ts                         # §4 : catalogue, SLA, statuts, scoring, parse, reminderState
│  ├─ data/index.ts                     # sélecteur d'adaptateur (mock <-> supabase)
│  ├─ data/mock.ts                      # données en mémoire (Phase 1)
│  ├─ data/supabase.ts                  # accès réel (Phase 2+)
│  ├─ supabase/client.ts · server.ts    # @supabase/ssr
│  └─ config.ts                         # nom d'org/app, options (voir §9)
├─ supabase/migrations/*  ·  seed_config.sql
├─ .env.local.example  ·  .gitignore  ·  vercel.json
├─ package.json  ·  README.md  ·  tsconfig.json  ·  tailwind/next/postcss configs
```

**Couche de données** (`lib/data/index.ts`) : si `NEXT_PUBLIC_SUPABASE_URL` est **absent**, renvoie l'adaptateur **mock** (démo) ; sinon l'adaptateur **supabase**. Les deux exposent la **même interface** : `listItems`, `getItem`, `createItem`, `applyAction(item, action, cause)`, `listScores`, `listReminders`, `listNotifications`, `listProfiles`, `currentUser`. Cela permet à l'app de tourner avant même toute config backend.

**Palette & style** (reprendre la maquette) : chrome sombre `slate-900` (barre latérale), accent `emerald-500/600`, ambre pour « à relancer », rose pour « en retard/bloqué », fond `slate-50`, cartes blanches bord `slate-200`. **Références et types en police mono** (rappel du `//` de la charte documentaire). Élément signature : le **Fil** (frise de points reliés qui se remplit selon l'étape ; point rouge si bloqué). Responsive jusqu'au mobile, focus clavier visible, `prefers-reduced-motion` respecté.

---

## 7. Plan de build par phases

> À la fin de chaque phase : `npm run dev` fonctionne → **commit** → **STOP + résumé + comment tester**.

### Phase 0 — Amorçage
1. Vérifier les prérequis (§3), puis **inspecter le dossier courant** (`dir` / `ls`) : il peut déjà contenir `.git`, `README.md`, `.gitignore`, `LICENSE` (créés par GitHub Desktop). C'est normal — **on ne supprime rien**.
2. Scaffolder **dans le dossier courant** (le point `.`, pas de nouveau sous-dossier) :
   `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`
   Si la commande refuse à cause de fichiers présents : mets temporairement de côté `README.md` / `.gitignore` / `LICENSE`, scaffolde, puis fusionne-les. **Ne touche jamais au dossier `.git`.**
3. Installer les dépendances : `npm i recharts lucide-react @supabase/supabase-js @supabase/ssr`.
4. Nettoyer le boilerplate, poser `globals.css` (fond `slate-50`, police système soignée), et un layout de base.
5. `.gitignore` : **fusionner** avec l'existant et garantir que `.env*`, `node_modules`, `.next`, **`supabase/seed_demo.local.sql`** y figurent.
6. **Git :** si `.git` est absent, `git init` ; sinon, utilise le dépôt existant sans le réinitialiser. **Commit local** : `Phase 0 — amorçage du projet`. Aucun remote, aucun push.
7. `npm run dev` → confirmer `http://localhost:3000`.
> **Acceptation :** le serveur démarre, coquille stylée visible.

### Phase 1 — Interface + mode démo (sans backend)
1. `lib/domain.ts` (§4 en entier) + `lib/config.ts` (§9).
2. Composants : atoms, **Fil**, **ItemCard**, **Drawer** (timeline + actions), **NewSuiviModal** (parse d'objet), **Sidebar** (nav filtrée par rôle), **Topbar** (recherche, cloche, **sélecteur d'utilisateur** de démo).
3. `lib/data/mock.ts` : ~13 objets de démo (noms **neutres**), état en mémoire ; `applyAction` fait progresser le Fil (relance, réponse, bloqué, clôture) ; `createItem` ajoute un objet.
4. Les 7 vues câblées sur le mock : Mon espace, Vue globale, Ce qui ne bouge pas, Statistiques (recharts), Classement, Rappels, Administration.
5. Le **sélecteur d'utilisateur** change de rôle → la nav et les droits changent (démo RBAC).
6. **Commit : `Phase 1 — interface et mode démo`**.
> **Acceptation :** app entièrement cliquable en local, fidèle à la maquette, en français, responsive. **La propriétaire peut déjà être satisfaite ici.**

### Phase 2 — Supabase : persistance, auth, RBAC
1. Guider la création d'un **projet Supabase** (l'utilisatrice le crée ; elle colle `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`).
2. Appliquer les migrations `0001`→`0003` + `seed_config.sql` (via CLI `supabase db push` **ou** l'éditeur SQL du dashboard — documente les deux).
3. `lib/supabase/{client,server}.ts` (@supabase/ssr) + **auth** (e-mail + mot de passe, ou magic link), `app/login/page.tsx`, middleware de protection des routes, bootstrap du `profile` à la première connexion.
4. `lib/data/supabase.ts` implémente l'interface commune. Le sélecteur bascule sur Supabase dès que l'env est présent. Le **RBAC est appliqué par les RLS** + par la nav selon le rôle.
5. **Commit : `Phase 2 — persistance Supabase, auth et RBAC`**.
> **Acceptation :** connexion réelle, données persistées, rôles réellement appliqués (un agent ne peut pas éditer l'objet d'un autre).

### Phase 3 — Moteur de relance
1. Vues `v_item_reminders` / `v_scores` déjà en base (Phase 2).
2. `app/api/cron/reminders/route.ts` (protégée par `CRON_SECRET`) : lit les objets en `relance`/`escalade`, **crée les notifications** (relance → agent ; escalade → directeur), compose le **digest** du directeur, et **envoie les e-mails via Resend** si `RESEND_API_KEY` est présent (sinon in-app seulement).
3. Cloche + page **Rappels** alimentées par la table `notifications`.
4. `vercel.json` : cron quotidien (ex. `0 6 * * *`). En local : script `npm run reminders` qui appelle la route avec le secret.
5. **Commit : `Phase 3 — moteur de relance, escalade et digest`**.
> **Acceptation :** exécuter le job crée les bonnes notifications + le digest ; l'e-mail part si Resend est configuré.

### Phase 4 — Finitions & préparation à la publication
1. `README.md` complet (§10).
2. Passe accessibilité/responsive/`reduced-motion`, états vides soignés (« Rien ne t'attend. Tout est à jour. »).
3. **Vérifier l'anonymat** : aucun nom d'institution/agent réel dans le code commité ; org/équipe configurables (§9).
4. **Commit : `Phase 4 — finitions, documentation et préparation à la publication`**.
> **Acceptation :** un nouvel arrivant peut installer et lancer l'app avec le seul README ; le dépôt est propre et publiable.

---

## 8. Le moteur de relance en détail

- **Source :** la vue `v_item_reminders` calcule l'état (`ok/relance/escalade/bloque/none`) à partir de `date_maj`, du SLA du type et du statut.
- **À chaque exécution du job :** pour chaque objet `relance` → notification à `owner_id` ; pour chaque `escalade` → notification au(x) profil(s) `directeur` ; agréger un **digest** (nb escaladés + nb bloqués) → notification `digest` au directeur.
- **Canaux :** toujours `in-app` ; ajouter `e-mail` (Resend) si configuré. Le digest du matin au directeur est toujours actif.
- **Local :** `npm run reminders`. **Production (Vercel) :** Cron quotidien sur la route. (Alternative Supabase : `pg_cron` + Edge Function — documenter en option, ne pas l'imposer.)
- **Idempotence :** ne pas recréer une notification identique non lue le même jour pour le même objet.

---

## 9. Sécurité, confidentialité & open-source

- **Aucun secret commité.** Tout dans `.env.local` (git-ignoré). Fournir `.env.local.example` avec des placeholders.
- **Anonymisation :** le nom de l'organisation, le nom de l'app et l'équipe sont **configurables** dans `lib/config.ts` (valeurs par défaut **neutres** : `APP_NAME = "Cap"`, `ORG_NAME = "Équipe sécurité"`). **Aucune** mention d'un ministère, d'une direction, d'un pays ou d'une personne réelle dans le code versionné. Les données réelles se saisissent **en local** (ou via un `seed_demo.local.sql` git-ignoré).
- **Gouvernance des données :** l'app stocke des **points clés** (résumés), pas des copies intégrales de mails. Aucune donnée personnelle sensible dans les seeds commités.
- **RLS activées** sur toutes les tables ; tester qu'un agent ne peut pas modifier l'objet d'un autre.

---

## 10. Git & publication (README à générer)

Le README doit contenir, en français :
1. **Présentation** (le problème, la promesse « Aucun mail sans trace », les fonctionnalités).
2. **Prérequis** (Node 20 LTS, npm, un projet Supabase).
3. **Installation** : `npm install`, copier `.env.local.example` → `.env.local`, la remplir.
4. **Lancer en local** : `npm run dev` (préciser que **sans** Supabase l'app démarre en **mode démo**).
5. **Configurer Supabase** : appliquer les migrations + `seed_config.sql` ; créer un premier utilisateur et lui donner le rôle `directeur`.
6. **Moteur de relance** : `npm run reminders` en local ; Vercel Cron en prod.
7. **Publier sur GitHub (via GitHub Desktop)** : le dossier est déjà dans GitHub Desktop (`Documents\GitHub\cap`). Quand tu es satisfaite : onglet *Changes* pour vérifier, *Commit to main*, puis **Publish repository** (la première fois) ou **Push origin**. Décoche « Keep this code private » seulement si tu veux un dépôt public. **Vérifie une dernière fois qu'aucun `.env.local` ni `seed_demo.local.sql` n'est suivi.**
8. **Déployer (plus tard)** : importer le repo sur Vercel, renseigner les variables d'environnement, activer le Cron.

Git côté Claude Code : utilise le dépôt existant (ou `git init` s'il n'y en a pas) + un commit **local** par phase avec les messages ci-dessus. **Ne configure ni ne modifie aucun *remote*, ne pousse rien.**

---

## 11. Vérification finale (checklist)

- [ ] `npm run dev` démarre sans erreur ; les 7 vues s'affichent.
- [ ] Mode démo fonctionnel **sans** `.env.local`.
- [ ] Parse d'objet : `[SOC-2026-0042] ALERTE — …` pré-remplit métier/type/référence.
- [ ] Le Fil progresse quand on relance / marque une réponse / clôture.
- [ ] Rôles : un agent ne voit pas Admin/Stats/Blocages ; RLS empêchent l'édition croisée.
- [ ] Rappels : relances dues + escalades + digest ; e-mail seulement si Resend configuré.
- [ ] Classement visible, positif, badges corrects.
- [ ] `.gitignore` couvre `.env*` et `seed_demo.local.sql` ; **aucun secret ni nom d'institution/agent réel** dans le code suivi par git.
- [ ] Un commit par phase ; **aucun remote configuré**.
- [ ] README permet à un nouvel arrivant de tout lancer.

---

*Travaille phase par phase, commite à chaque étape, et arrête-toi pour un retour après chacune. La maquette `cap-suivi-dssi.jsx` (si présente) est la référence visuelle. Devise : « Aucun mail sans trace. »*
