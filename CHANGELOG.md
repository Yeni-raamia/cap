# Changelog

Toutes les évolutions notables de Cap sont consignées ici.
Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un versionnage sémantique.

## [Non publié] · Unreleased

_Rien pour l'instant._

## [1.22.0] - 2026-08-04

### Ajouté
- **Module Réunion enrichi (« pro »)** — sans infrastructure temps réel :
  - **Invitations** : bouton « Inviter » notifiant les participants (in-app + e-mail si configuré ; e-mail pour les contacts).
  - **Présences** : statut par participant (invité / présent / absent / excusé).
  - **Visioconférence** : champ « lien de réunion » + bouton « Rejoindre » (Teams, Zoom, Jitsi…).
  - **Partage de fichiers** : pièces jointes sur la réunion (dépôt, téléchargement, suppression).
  - **Fil de discussion** dédié à chaque réunion (messagerie interne).
  - **Compte-rendu téléchargeable** en PDF (ordre du jour, participants et présences, décisions, sujets reliés).
  - **Rappels** : le moteur notifie les participants des réunions planifiées à venir (~36 h) — visibles dans Rappels (catégorie « réunion »).
- **Graphe de relations** : glisser-déposer des bulles (repositionnement épinglé, bouton « Réorganiser ») et couverture élargie aux personnes (destinataires, personnes concernées).

## [1.21.0] - 2026-08-04

### Ajouté
- **Module Réunion** (menu Réunions). Créer une réunion autonome ou **reliée à un ou plusieurs sujets existants** (suivi de mail, projet, tâche, négligence, non-conformité, objectif annuel), avec **participants** (membres de l'équipe et/ou contacts de l'annuaire), ordre du jour, compte-rendu et **décisions**. Statut planifiée / tenue / annulée. Ces liens alimentent le graphe de relations.
- **Graphe de relations** (menu Relations) — graphe de connaissance façon Obsidian qui relie tout ce qui est rattaché à un sujet ou à une personne : suivis, projets, tâches, négligences, non-conformités, objectifs, réunions, membres et contacts. **Vue égocentrée explorable** (on clique une bulle pour recentrer), disposition en bulles (force-directed) sans dépendance, réglage de la profondeur (1/2), légende et recherche du nœud de départ. Bouton **« Voir les relations »** sur les fiches (projet, réunion) pour ouvrir le graphe centré dessus.

## [1.20.0] - 2026-08-04

### Ajouté
- **Module Contacts partagé** (annuaire éditable par toute l'équipe : prénom, nom, e-mail, téléphone, service, fonction). Le champ destinataire des suivis devient une **autocomplétion** depuis cet annuaire : en tapant quelques lettres, on choisit un contact et le **nom, le service et l'e-mail sont pré-remplis** — source unique côté serveur, visible de tous.
- **Archivage et suppression de projet**. Un projet peut être **archivé** (masqué des vues actives, conservé) puis désarchivé. La **suppression** passe par une **demande motivée** approuvée par un manager, directeur ou admin : à l'approbation, le projet et ses tâches/membres/notes sont supprimés et les suivis liés détachés ; un rejet notifie le demandeur.
- **Correction contrôlée des destinataires** (Administration → Destinataires). Liste les destinataires et leurs occurrences, et **fusionne les orthographes divergentes** d'un même destinataire sur tous les suivis — pour nettoyer les erreurs de saisie qui faussaient les statistiques.

### Modifié
- **Page Statistiques en lecture seule** : plus aucune correction/manipulation de données depuis les statistiques (elles ne font qu'afficher).
- **« Éditer le suivi »** : les personnes (destinataires) ne sont plus modifiables par suivi (affichées en lecture seule). Elles se définissent à la création du suivi et une correction éventuelle passe par l'outil d'administration — pour éviter les saisies divergentes.

## [1.19.0] - 2026-07-25

### Ajouté — Suivis de mail
- **Création d'un suivi depuis un e-mail `.eml` non rattaché**. La modale d'import propose désormais deux modes : « réponse sur un suivi » (existant) et « nouveau suivi ». Pour un e-mail sans référence reconnue, un suivi est créé, pré-rempli depuis l'e-mail (objet, destinataire et adresse, points clés issus du corps ; métier/type auto-détectés si l'objet est déjà normalisé, sinon au choix ; priorité au choix), avec référence attribuée automatiquement côté serveur et l'e-mail original attaché comme preuve. Métier CASE exclu (numéro TheHive requis), refus en lecture seule.

## [1.18.1] - 2026-07-25

### Ajouté — Statistiques
- **Bloc « Politiques violées »** dans le tableau de bord Statistiques : classement des non-conformités par politique / article / contrôle violé (barres décroissantes, top 10 + compteur des fiches renseignées). Réorganisable, redimensionnable et masquable comme les autres blocs. À ajouter via « Personnaliser la disposition → + Ajouter un bloc » sur un tableau de bord déjà personnalisé.

## [1.18.0] - 2026-07-25

### Ajouté — Conformité
- **Politique / article / contrôle violé sur les non-conformités**. Nouveau champ sur les fiches, alimenté par une liste déroulante pré-remplie à partir d'**ISO/IEC 27001:2022** (Annexe A), des **CIS Controls v8** et du **NIST CSF 2.0** (avec les numéros d'article/contrôle). La liste est **éditable** : les agents peuvent ajouter un article/contrôle depuis le formulaire (ajout autorisé hors lecture seule ; suppression réservée aux administrateurs), et elle est gérable depuis Administration → Listes. La page de résumé et le rapport PDF affichent une **colonne « Politique violée »**, et le rapport inclut une **répartition par politique la plus fréquemment enfreinte**. Migration additive + seed.

### Modifié
- **Documentation** : README mis à jour au périmètre actuel (2FA, journal d'audit, sessions & alerte de connexion, non-conformités, modèles & envoi réel des relances, import d'e-mail `.eml`, durée de traitement, plan de l'année, gamification, tableau de bord réorganisable, sauvegarde/restauration & planifiée, tests Vitest). Ajout d'une section Tests et Sauvegarde, lien vers le guide d'hébergement LAN.
- **CI** : la chaîne d'intégration exécute désormais les tests (`npm test`) en plus du lint et du build.

## [1.17.0] - 2026-07-25

### Ajouté — Suivis de mail
- **Import d'e-mail (.eml) comme réponse sur un suivi**. Depuis le cockpit (ou ⌘K), déposer un e-mail exporté au format `.eml` : Cap l'analyse (aperçu de l'expéditeur, date, objet, points clés, pièces jointes), détecte automatiquement le suivi concerné via la référence contenue dans l'objet (ou laisse choisir manuellement), puis l'enregistre comme réponse — le suivi repasse « En traitement », un événement est ajouté au fil, et l'e-mail original est attaché comme preuve. S'appuie sur un parseur RFC822/MIME sans dépendance (en-têtes dépliés + mots encodés RFC 2047, multipart, base64/quoted-printable, pièces jointes, repli HTML→texte). RBAC (propriétaire, directeur ou admin), format `.msg` non pris en charge (message explicite), événement d'audit dédié (`email_import`).

## [1.16.0] - 2026-07-25

### Ajouté — Sécurité
- **Alerte de connexion depuis un appareil inconnu**. À l'ouverture d'une session (mot de passe ou double authentification), Cap compare l'appareil (navigateur + système) aux autres sessions actives du compte ; s'il est inconnu — hors toute première session — l'utilisateur est prévenu par une notification in-app (nouvelle catégorie « sécurité ») et par e-mail si l'envoi est configuré, et l'événement est tracé au journal d'audit (`login_new_device`). Anti-bruit : le déclencheur est le changement d'appareil, pas le simple changement d'adresse IP (l'IP est rappelée dans le message). Best effort, jamais bloquant pour la connexion.

## [1.15.0] - 2026-07-25

### Ajouté — Administration
- **Sauvegarde planifiée automatique** (onglet Administration › Sauvegarde). Cap crée périodiquement une sauvegarde sur le serveur (dossier `data/backups`) selon une fréquence configurable (quotidienne ou hebdomadaire), déclenchée en tâche de fond à l'usage de l'application — aucune tâche planifiée externe requise. Rétention paramétrable (les plus anciennes sont purgées), bouton « sauvegarder maintenant sur le serveur », et liste des sauvegardes serveur avec téléchargement / restauration / suppression. Garde anti-parcours de répertoire, noms anti-collision, et événements d'audit dédiés (`backup_auto` / `backup_settings` / `backup_delete`).

## [1.14.0] - 2026-07-25

### Ajouté — Administration
- **Sauvegarde & restauration de la base** (onglet Administration › Sauvegarde, réservé aux administrateurs). Télécharge un instantané SQLite cohérent de toute l'application (membres, suivis, projets, tâches, négligences, non-conformités, messages, pièces jointes, journal…) dans un seul fichier, via l'API de sauvegarde en ligne de SQLite (le contenu du WAL est inclus). Restauration depuis un fichier téléversé, protégée par : validation du fichier (en-tête + tables requises), instantané de sécurité automatique de la base courante (`.bak`), sortie propre du mode WAL avant remplacement, puis réouverture avec migrations (une sauvegarde d'un schéma antérieur est mise à niveau). Événements d'audit dédiés (`backup_download` / `backup_restore`).

## [1.13.1] - 2026-07-25

### Ajouté — Qualité / tests
- **Couverture étendue** (86 tests) : ajout des tests pour le Fil d'avancement (`filStage`), les sous-tâches (`subtaskProgress`), les objectifs annuels (`objectiveProgress`, `objectiveTimePct`, `objectiveHealth`), le membre du mois (`memberOfMonth`), les défis de la semaine (`weeklyChallenges`) et les helpers de rôle/projet. Verrouille la logique dérivée des pages classement / membre / plan / productivité.

## [1.13.0] - 2026-07-25

### Ajouté — Qualité / tests
- **Harnais de tests automatisés (Vitest)** : premier runner de tests du projet, `npm test` / `npm run test:watch`. 65 tests sur la logique métier pure (sans base ni navigateur) — horloge SLA et état de relance, échéances de traitement, référence anti-collision, parse d'objet/e-mail, modèles ; double authentification TOTP (RFC 6238) et codes de secours ; description de user-agent ; libellés d'audit ; agrégats (classement « culture juste », métriques projet, productivité, gamification). Fabriques de domaine partagées pour les tests.



### Ajouté — Suivis de mail
- **Envoi réel des relances par e-mail** : la relance ne se limite plus au copier-coller, elle part vraiment au destinataire avec le modèle choisi. Un e-mail de destinataire se renseigne à la création et en édition du suivi ; l'encart « Modèles de relance » propose un bouton **« Envoyer la relance »**. Le message part d'une adresse Cap avec **réponse dirigée vers l'agent responsable** (reply-to), et l'envoi compte comme une relance (statut Relancé, +1, tracé en timeline). Événement d'audit dédié.

  Prérequis pour l'envoi effectif : `RESEND_API_KEY` configuré côté serveur et « e-mail activé » en administration — sinon un message d'erreur explicite invite à la configuration.

## [1.11.1] - 2026-07-25

### Amélioré — Tableau de bord des statistiques
- **Deux blocs par ligne (au choix)** : chaque bloc peut passer en demi-largeur pour en aligner deux côte à côte, tout en gardant un bloc par ligne par défaut.
- **Glisser-déposer plus clair** : le bloc déplacé suit nettement le curseur (aperçu flottant) et se saisit n'importe où sur la carte ; plus de déformation pendant le glissé.
- **Bouton « Personnaliser la disposition » bien plus visible** (accent vert, libellé explicite).

## [1.11.0] - 2026-07-25

### Ajouté — Statistiques
- **Tableau de bord personnalisable** : la page Statistiques devient composable. En mode « Personnaliser », chaque bloc peut être **déplacé** par glisser-déposer (n'importe où sur le bloc), **redimensionné** en pleine ou demi-largeur (deux blocs par ligne), **retiré**, ou **(r)ajouté** depuis un menu. La disposition est enregistrée par utilisateur dans le navigateur (localStorage) et se réinitialise en un clic.

## [1.10.1] - 2026-07-25

### Corrigé
- **Graphes des statistiques** : les libellés de l'axe vertical à deux chiffres étaient tronqués (« 24 » affiché « 4 ») sur les nouveaux graphes d'activité et de conformité. Largeur d'axe corrigée.

## [1.10.0] - 2026-07-25

### Ajouté — Conformité
- **Module Non-conformité à la politique de sécurité** : nouveau registre calqué sur les négligences (page dédiée, évaluation gravité/risque/impact, transmission et décisions). Une case dans le formulaire de nouveau suivi ouvre automatiquement une fiche, pré-remplie depuis le destinataire.
- **Rapports imprimables (PDF)** des non-conformités : rapport consolidé « toutes » et fiche individuelle.
- **Statistiques enrichies** : nouvelle section Conformité (négligences & non-conformités par gravité).

### Ajouté — Suivis de mail
- **Durée de traitement acceptable (jours)** sur un suivi, en plus du SLA du type. Au dépassement : notification au responsable, mise en surbrillance, et actions (relancer, basculer en négligence ou en non-conformité, marquer « en retard »). Prise en compte dans les statistiques.

### Ajouté — Statistiques
- **Graphes enrichis** : nouveau graphe d'activité (créés vs clôturés sur 6 mois) et conformité par gravité ; palette harmonisée et accessible (colorblind-safe, clair/sombre).

### Ajouté — Notifications
- **Notifications archivées à la lecture** : une notification lue quitte la liste active et reste consultable dans un onglet « Archivées ». La page Rappels passe à deux onglets ; une notification cliquée ouvre le suivi lié et s'archive.

### Corrigé
- **Bouton « copier » en réseau (HTTP/LAN)** : la copie (objet de suivi, modèles, clé 2FA, lien de suivi) fonctionne désormais hors contexte sécurisé grâce à un repli universel.

## [1.9.0] - 2026-07-25

### Ajouté — Suivis de mail
- **Actions groupées** : dans la vue liste de l'explorateur, sélection multiple (case par ligne + tout sélectionner) et barre d'actions pour **relancer**, **marquer « réponse reçue »** ou **clôturer** un lot en une fois, et **exporter la sélection** en CSV. Le contrôle des droits se fait suivi par suivi ; les suivis non éditables sont ignorés et comptés.

### Fiabilité
- **Référence de suivi anti-collision** : la référence est désormais attribuée côté serveur au moment de la création. Deux créations simultanées ne peuvent plus produire la même référence (le calcul côté client n'est plus qu'un aperçu). Les suivis CASE conservent le numéro TheHive saisi.
- **Filet de sécurité du moteur de relance** : s'il n'a pas tourné depuis plus de 3 h (cron externe ou automatique), un accès à l'application le déclenche en tâche de fond — throttlé et sans bloquer l'affichage. Un oubli de cron ne gèle donc plus relances, escalades et digests. Le moteur restant idempotent par jour, aucune notification n'est dupliquée.

## [1.8.0] - 2026-07-24

### Ajouté — Suivis de mail
- **Édition d'un suivi après création** : depuis le panneau de détail (ou la page du suivi), on peut corriger l'objet, la priorité, les points clés et les personnes (destinataire/copie/impliqué + service). La modification est tracée dans la timeline.
- **Page de suivi partageable** (`/items/[id]`) : chaque suivi devient une page à part entière — lien favori/partageable, ouvrable depuis une notification — en complément du panneau latéral. Bouton « Copier le lien » et « Ouvrir en page » depuis le panneau.
- **Recherche élargie** : la recherche de l'explorateur couvre désormais les destinataires et leurs services, les points clés et la cause de blocage, en plus de l'objet et de la référence.
- **Nouveaux filtres** : « A une réponse / Sans réponse » et « Avec / Sans pièce jointe » (repérer les suivis sans preuve).

### Corrigé
- **Horloge SLA** : l'échéance de relance/escalade est désormais mesurée depuis la **dernière action sortante** (envoi initial ou dernière relance) et non depuis la dernière modification. Une note, un changement de statut ou une correction ne repousse donc plus l'échéance ; une réponse reçue suspend la relance. Des suivis qui paraissaient « à jour » à tort peuvent remonter en relance/escalade.

### Technique
- Extraction du corps du détail d'un suivi dans un composant partagé entre le panneau et la page (sans duplication).
- Nouveau champ `Item.attachmentsCount` (comptage serveur) alimentant le filtre pièces jointes.

## [1.7.0] - 2026-07-24

### Ajouté — Sécurité des comptes
- **Sessions actives** : chaque membre voit, depuis « Mon compte », la liste de ses appareils connectés (navigateur, système, IP, dernière activité) et peut **révoquer une session à distance** ou **déconnecter tous les autres appareils** — utile en cas de vol, de perte ou de connexion sur un poste public.
- **Réinitialisation de la 2FA par l'administrateur** : action de déblocage pour un membre ayant perdu son téléphone **et** ses codes de secours ; désactive la double authentification et notifie le membre. Un badge « 2FA » signale, dans la liste des membres, les comptes protégés.

### Ajouté — Journal d'audit
- **Journal d'audit enrichi** : filtrage par type d'événement, par membre et par recherche texte, périmètre **« Sécurité uniquement »**, et **export CSV** (compatible Excel FR). Les échecs de connexion sont mis en évidence.
- Nouveaux événements tracés : révocation de session, déconnexion des autres appareils, réinitialisation de 2FA par l'admin.

### Technique
- Migration additive de la table `sessions` : métadonnées d'appareil (`user_agent`, `ip`, `last_seen_at`) et identifiant public de révocation (aucune réinitialisation de données).
- Détection d'appareil (User-Agent) sans dépendance ; filtrage du journal d'audit côté serveur.

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
