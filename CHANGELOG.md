# Changelog

Toutes les évolutions notables de Cap sont consignées ici.
Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un versionnage sémantique.

## [Non publié] · Unreleased

_Rien pour l'instant._

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
