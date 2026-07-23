# Changelog

Toutes les évolutions notables de Cap sont consignées ici.
Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un versionnage sémantique.

## [Non publié] · Unreleased

_Rien pour l'instant._

## [1.6.0] - 2026-07-23

### Ajouté — Sécurité
- **Double authentification (2FA / TOTP)** : chaque membre peut activer un second facteur (RFC 6238) depuis « Mon compte ». Enrôlement par **QR code** (ou clé saisie manuellement) compatible avec les applications d'authentification standard (Google Authenticator, etc.).
- **Codes de secours** : 8 codes à usage unique générés à l'activation (affichés une seule fois) pour se connecter en cas de perte du téléphone.
- **Connexion en deux étapes** : après le mot de passe, un code TOTP (ou un code de secours) est demandé ; l'état intermédiaire est porté par un cookie pré-auth signé, sans session ouverte tant que le second facteur n'est pas validé.
- **2FA obligatoire (option admin)** : nouvelle politique de sécurité imposant le second facteur ; les comptes sans 2FA sont dirigés vers un enrôlement forcé avant tout accès. La désactivation individuelle est alors verrouillée.

### Ajouté — Journal d'audit
- **Traçabilité des événements de sécurité** dans le journal d'activité : connexion, connexion via 2FA, connexion par code de secours, échec de connexion, activation et désactivation de la 2FA.

### Technique
- Crypto sans dépendance (`node:crypto`) : TOTP, base32 et codes de secours hachés (scrypt, usage unique) ; QR code généré côté serveur (`qrcode`).
- Migration additive : nouvelles colonnes `profiles.totp_secret / totp_enabled / totp_backup` (aucune réinitialisation de données).

## [1.5.0] - 2026-07-22

### Ajouté — Espace membre
- **Page « Mon compte »** (`/compte`, accessible via l'avatar du bandeau) : chaque membre gère son profil.
- **Photo de profil** : upload d'une image redimensionnée automatiquement (~256 px, JPEG) et affichée dans le bandeau, le profil et le classement ; retrait possible (retour aux initiales).
- **Édition du nom** (initiales recalculées) et du **poste**.
- **Changement de mot de passe** en self-service, conforme à la politique de sécurité.

### Ajouté — Nouvelles fonctionnalités
- **Profil membre** : nouvelle page `/membre/[id]` (activité récente, badges, XP/niveau, objectifs et projets) ; podium et lignes du classement cliquables.
- **Recherche globale ⌘K** : la palette cherche désormais suivis de mail, projets, objectifs et membres par mot-clé, en plus des pages.
- **Import de mail semi-auto** : le mode « Coller un e-mail » accepte un e-mail complet (en-têtes + corps) et pré-remplit destinataire et points clés.
- **Notifications de défi relevé** : confettis + toast quand un défi hebdomadaire se termine.
- **Récap hebdomadaire** : bilan de la semaine par membre actif (in-app + e-mail) envoyé le lundi par le moteur de rappels ; déclencheur manuel `?forceWeekly=1` pour les tests.

### Ajouté — Administration
- **Suppression d'un compte** : action réservée à l'admin (garde-fous : pas soi-même, pas le dernier admin). Les données créées sont conservées et l'auteur orphelin s'affiche « Compte supprimé ».

### Technique
- Migration additive : nouvelle colonne `profiles.avatar` (aucune réinitialisation de données).

## [1.4.0] - 2026-07-22

### Ajouté — Gamification (enrichissements)
- **Montée de niveau célébrée** : confettis + toast dès qu'un palier d'XP est franchi.
- **Défis de la semaine** : 3 objectifs hebdomadaires dérivés de l'activité (clôtures, réponses, tâches) avec progression, sur le Classement.
- **Membre du mois** : mise en avant automatique de la plus forte activité du mois en cours.
- 4 badges supplémentaires : Vétéran, Pilier, Stratège, Couteau suisse.

## [1.3.0] - 2026-07-22

### Ajouté — Plan de l'année (enrichissements)
- **Jalons** : étapes clés (intitulé + date + fait) éditables dans la modale, affichées en losanges sur la timeline.
- **Vue par trimestre** : bascule Année / T1–T4 sur la timeline (zoom 3 mois, curseur « aujourd'hui » recalculé).
- **Export PDF** de la roadmap : Gantt annuel imprimable + tableau détaillé (responsable, période, avancement, statut, motif de déclassement).
- **Notifications d'échéance d'objectif** : rappel au responsable et à l'équipe quand la fin approche (≤ 7 jours) via le moteur de relance.

## [1.2.0] - 2026-07-22

### Ajouté — Plan de l'année
- Nouveau module **Plan de l'année** : objectifs annuels (période début→fin, responsable, couleur, projets/tâches/équipe liés), gérés par managers/directeurs.
- **Timeline « plan de vol »** : mois en colonnes, barres colorées par objectif avec remplissage = avancement, curseur « aujourd'hui », destination (drapeau), sélecteur d'année.
- **Avancement automatique** dérivé des projets et tâches liés ; santé calculée (sur la bonne voie / à risque / en retard).
- **Déclassement** d'un objectif avec motif tracé ; « marquer atteint » (confettis).

### Ajouté — Gamification (honorifique)
- **Profil de jeu** dérivé de l'activité : XP sur clôtures, réponses, relances, tâches, projets menés et objectifs atteints.
- **6 niveaux** (Novice → Légende) et **8 badges** débloquables.
- **Classement refondu** : profil de jeu, podium, classement par XP, grille des badges ; pastille de niveau sur le Cockpit.

## [1.1.0] - 2026-07-22

### Ajouté — Refonte design premium
- **Cockpit** : nouvelle page d'accueil « briefing » (salutation selon l'heure, aurore animée, KPIs animés, heatmap d'activité, colonnes ce qui t'attend / à valider / à justifier, pouls et charge de l'équipe). Devient la page d'accueil par défaut.
- **Palette de commandes ⌘K** : recherche + navigation + actions au clavier, sur tout l'écran.
- **Mode clair / sombre** : bascule persistée, cohérente sur toute l'application (override `?theme=`).
- **Refontes de fond** : Vue globale en centre de supervision, Productivité (podium de rendement, jauges), Projets (cartes riches à jauge circulaire et pile d'avatars).
- **En-tête éditorial (PageHero)** sur toutes les pages, hero premium sur Mon espace.
- **Touches “wow”** : confettis à la clôture, toasts élégants (succès/erreur/info), états vides soignés, animations d'entrée en cascade.
- **Data-viz** sans dépendance : compteurs animés, sparklines, jauges circulaires, heatmap, mini-barres.

## [1.0.0] - 2026-07-21

### Ajouté
- **Suivi de mail** : renommage du terme « suivi » en « suivi de mail » dans l'interface.
- **Documentation dépôt** : README bilingue, LICENSE (MIT), CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, modèles d'issues/PR, intégration continue (GitHub Actions), nouveau favicon.
- **Sécurité configurable** : onglet *Administration → Sécurité* (approbation des inscriptions, longueur min. du mot de passe, rotation, seuils de rate-limit, durée de session, HSTS).
- **Rotation des mots de passe** : « forcer le renouvellement » par utilisateur, politique d'âge, écran dédié `/change-password`.
- **Inscription approuvée par l'admin** + page tampon d'attente `/pending`.
- **Durcissement** : rate-limiting connexion/inscription, en-têtes de sécurité (CSP, HSTS…), sessions à expiration glissante.
- **Messagerie** : messages privés (1:1), suppression de message et de groupe, réactions emoji, réponses ciblées.
- **Productivité** : tâches assignables (sous-tâches, planification, statuts), vue de rendement d'équipe.
- **Projets** : assignation multiple + notification, workflow de statut, demande de clôture (récapitulatif + livrables).
- **Espace personnel enrichi** et **notifications sonores**.
- **Design** : modernisation de l'interface (transitions, animations d'entrée, polish).

### Sécurité
- Blocage complet des comptes non approuvés (layout + toutes les API) ; comptes en lecture seule appliqués côté serveur.

---

> Les premières versions (phases initiales) ont posé le socle : suivi de mail, moteur de relance,
> vues globales/filtres, statistiques, module projet, négligences, et administration.
