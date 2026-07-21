# Changelog

Toutes les évolutions notables de Cap sont consignées ici.
Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un versionnage sémantique.

## [Non publié] · Unreleased

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
