# Contribuer à Cap · Contributing to Cap

Merci de votre intérêt ! · Thanks for your interest!

---

## 🇫🇷 Français

### Prérequis
- Node.js ≥ 20 et npm.
- Lire [`AGENTS.md`](AGENTS.md) : cette version de Next.js peut différer de vos habitudes ; consultez le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code.

### Mettre en place l'environnement
```bash
npm install
cp .env.local.example .env.local   # optionnel
npm run dev
```

### Règles de base
- **Ne jamais committer de données réelles ni de secret.** `data/`, `*.sqlite` et `.env*` sont git-ignorés.
- **Migrations additives uniquement.** N'effacez ni ne recréez jamais la base : ajoutez des colonnes/tables via `ensureColumns()` dans `lib/db/index.ts` (`ALTER TABLE ... ADD COLUMN` si absent).
- **Le langage de l'interface et des commentaires est le français**, cohérent avec l'application. La documentation dépôt peut être bilingue.
- **`lib/domain.ts` est la source de vérité** des types et de la logique métier.
- Respectez le style existant (mêmes conventions de nommage, densité de commentaires, idiomes Tailwind).

### Avant d'ouvrir une Pull Request
```bash
npm run lint     # doit passer
npm run build    # doit compiler sans erreur TypeScript
```
- Une PR = un sujet clair. Décrivez le **quoi** et le **pourquoi**.
- Ajoutez une entrée dans [`CHANGELOG.md`](CHANGELOG.md) (section « Non publié »).
- Les messages de commit suivent le style [Conventional Commits](https://www.conventionalcommits.org/) de préférence (`feat:`, `fix:`, `docs:`…).

### Signaler un bug / proposer une fonctionnalité
Utilisez les modèles d'issue GitHub (`.github/ISSUE_TEMPLATE`). Pour une faille de sécurité, **n'ouvrez pas d'issue publique** : suivez [`SECURITY.md`](SECURITY.md).

---

## 🇬🇧 English

### Prerequisites
- Node.js ≥ 20 and npm.
- Read [`AGENTS.md`](AGENTS.md): this Next.js version may differ from what you know — check the relevant guide in `node_modules/next/dist/docs/` before writing code.

### Setup
```bash
npm install
cp .env.local.example .env.local   # optional
npm run dev
```

### Ground rules
- **Never commit real data or secrets.** `data/`, `*.sqlite` and `.env*` are git-ignored.
- **Additive migrations only.** Never wipe or recreate the database: add columns/tables through `ensureColumns()` in `lib/db/index.ts`.
- The **UI and code comments are in French**, matching the app. Repo docs may be bilingual.
- **`lib/domain.ts` is the source of truth** for types and business logic.
- Match the existing style and conventions.

### Before opening a Pull Request
```bash
npm run lint
npm run build
```
- One PR, one topic. Explain the **what** and the **why**.
- Add a line to [`CHANGELOG.md`](CHANGELOG.md) under "Unreleased".
- Prefer [Conventional Commits](https://www.conventionalcommits.org/).

### Bugs & feature requests
Use the GitHub issue templates. For security issues, **do not open a public issue** — follow [`SECURITY.md`](SECURITY.md).

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
