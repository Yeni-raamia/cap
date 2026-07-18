# Mise en place de Supabase (Phase 2)

L'app tourne en **mode démo** sans configuration. Pour activer la persistance,
l'authentification et le RBAC réel, suis ces étapes.

## 1. Créer le projet Supabase

1. Va sur https://supabase.com → **New project** (plan gratuit suffisant).
2. Note le mot de passe de la base (tu peux le régénérer plus tard).
3. Quand le projet est prêt : **Project Settings → API**, récupère :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Renseigner `.env.local`

Copie l'exemple puis colle tes valeurs :

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> `.env.local` est git-ignoré : ces secrets ne sont jamais commités.

## 3. Appliquer les migrations + le catalogue

Deux méthodes, au choix.

### Option A — Éditeur SQL du dashboard (le plus simple)

Dans le dashboard : **SQL Editor → New query**, puis exécute **dans cet ordre**
le contenu de chaque fichier :

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_views.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_auth_bootstrap.sql`
5. `supabase/seed_config.sql`  ← insère les 9 métiers + 11 types

### Option B — CLI Supabase

```bash
npm i -g supabase           # ou : npx supabase ...
supabase login
supabase link --project-ref <ref-du-projet>   # ref visible dans l'URL du dashboard
supabase db push                               # applique supabase/migrations/*
# puis charge le catalogue :
supabase db execute --file supabase/seed_config.sql
```

## 4. Créer le premier utilisateur et le promouvoir directeur

1. Relance l'app : `npm run dev` → tu es redirigée vers **/login**.
2. **Créer un compte** (e-mail + mot de passe).
   - Astuce : dans **Authentication → Providers → Email**, tu peux
     *désactiver « Confirm email »* pour te connecter sans étape de confirmation
     pendant les tests.
3. Un profil est créé automatiquement (rôle **agent** par défaut).
4. Promeus-toi **directeur** (ou **admin**) via **SQL Editor** :

```sql
update profiles set role = 'directeur'
where id = (select id from auth.users where email = 'ton.email@exemple.fr');
```

Reconnecte-toi : tu as maintenant accès à *Ce qui ne bouge pas*, *Statistiques*
et *Administration*.

## 5. Vérifier le RBAC (RLS)

- Crée un second compte (rôle agent).
- Avec ce compte, tu ne dois **pas** pouvoir éditer un objet dont tu n'es pas
  propriétaire : les politiques RLS (`0003_rls.sql`) le bloquent au niveau base.
- La navigation masque déjà les vues réservées au directeur/admin.

## Bascule automatique démo ↔ Supabase

Le sélecteur d'adaptateur (`lib/data/index.ts`) choisit Supabase dès que
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont présents.
Retire-les de `.env.local` pour repasser en mode démo.
