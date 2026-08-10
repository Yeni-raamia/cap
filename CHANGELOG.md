# Changelog

Toutes les évolutions notables de Cap sont consignées ici.
Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit un versionnage sémantique.

## [Non publié] · Unreleased

## [1.76.0] - 2026-08-10

### Ajouté

- **Module SOC — Cartographie MITRE ATT&CK** (nouvel onglet « ATT&CK ») : un **référentiel** des tactiques et techniques adverses (extrait Enterprise), organisé comme un **organiseur de savoir** — pour chaque technique : sa description, la **réponse** (runbooks reliés automatiquement via les techniques référencées) et la **détection** (auto-évaluation « Couverte / Partielle / Non couverte » + **piste de détection Wazuh**). Vue par tactique, filtres (reliées à un runbook, sans runbook, couvertes) et indicateurs. Ce n'est pas un tableau de couverture temps réel : c'est le lien méthodique entre menaces, détection et réponse.

## [1.75.0] - 2026-08-10

### Ajouté

- **Module SOC — Procédures & checklists de routine** (nouvel onglet « Procédures ») : le « comment on travaille » du SOC, capitalisé en **templates réutilisables** — check-list de **prise de poste**, **vérifications quotidiennes** de santé (sources Wazuh, EDR, feeds…), **critères de triage/classification**, **matrice d'escalade** et **modèle de communication d'incident**. Chaque procédure a un type, une fréquence, un objectif, un contenu libre et des **points à cocher**. Bibliothèque de départ fournie (5 procédures, bonnes pratiques NIST 800-61 / ANSSI / SANS), qui apparaît automatiquement. Tableau de bord enrichi d'un indicateur « Procédures ».

## [1.74.0] - 2026-08-10

### Ajouté

- **Nouveau module SOC** (entrée de menu « SOC », `/soc`) — **méthode & bonnes pratiques**, pas une console d'alertes : Cap complète les outils opérationnels (Wazuh…) en ancrant le *comment faire*. *Lot 1.*
  - **Runbooks de réponse** : des procédures pas-à-pas pour les incidents courants (hameçonnage, rançongiciel, compte compromis, exfiltration, poste infecté…), structurées selon les **phases NIST SP 800-61** (Détection & qualification → Confinement → Éradication → Rétablissement → Post-incident/REX), avec **déclencheur**, **points de décision**, **critères d'escalade** (quand ouvrir un incident dans le registre GRC), **techniques MITRE ATT&CK** rattachées et références (NIST, ANSSI, CERT-FR). Éditeur d'étapes par phase ; **bibliothèque de départ** fournie (5 runbooks) qui apparaît automatiquement.
  - **Tableau de bord** : nombre de runbooks, validés, scénarios couverts, techniques ATT&CK.
  - Les incidents restent gérés dans le **module GRC** (source unique, ISO 27035) ; le SOC dit *comment* réagir et *quand* escalader.

## [1.73.0] - 2026-08-10

### Ajouté

- **Audit → Conformité** : les questions d'une grille d'audit peuvent désormais être **rattachées à une mesure de référentiel** (ISO 27001/27002, NIST CSF, CIS, RGPD/NIS2) directement dans l'éditeur de grille. Une fois l'audit renseigné, un bouton **« Reporter N mesures vers la Conformité »** met à jour la **posture de conformité** du GRC (statut + maturité de chaque mesure), déduite des réponses (Oui = maturité 5 / Implémenté, Partiel = 3 / Partiellement, Non = 1 / Non implémenté ; N-A exclu). La mesure rattachée s'affiche sur chaque point de contrôle, et le rapport PDF récapitule la **contribution à la conformité**. C'est le chaînon qui fait qu'un audit technique **met à jour la maturité ISO/CIS** de l'organisation.

## [1.72.0] - 2026-08-09

### Ajouté

- **Audit — preuves / pièces jointes** : dans la fiche d'un audit, une section **« Preuves & pièces jointes »** permet de **téléverser des fichiers** (captures, exports de configuration, journaux, PDF, bureautique…), chacun **rattachable à un point de contrôle** précis (ou à l'audit en général). Téléchargement et suppression (auteur du dépôt ou responsable). Extensions autorisées et taille limitée à 10 Mo, comme les pièces jointes de projet.

## [1.71.0] - 2026-08-09

### Ajouté

- **Audit — cotation des constats & réponse managériale** (ISO 19011 / IIA) : chaque écart (« Non »/« Partiel ») peut désormais être **gradué** (Majeure / Mineure / Observation — pré-coté selon la criticité), assorti d'une **recommandation** de l'auditeur et de la **réponse managériale** (l'engagement de l'audité). Ces éléments apparaissent dans le questionnaire, dans le registre Constats et dans le rapport PDF.
- **Audit — export CSV/Excel** : boutons « Export CSV » dans l'onglet **Audits** (synthèse : score, couverture, constats…) et dans l'onglet **Constats** (registre détaillé avec cotation, recommandation, réponse managériale et action liée). Séparateur `;` + BOM UTF-8 pour un rendu correct dans Excel.

## [1.70.0] - 2026-08-09

### Ajouté

- **Académie Audit enrichie** : quatre nouveaux parcours (de 3 à 7) sur la pratique professionnelle de l'audit —
  - **Référentiels & bonnes pratiques** (choisir entre ISO, CIS, ANSSI, NIST, OWASP selon la cible) ;
  - **Coter les constats & rédiger les recommandations** (gradation majeure/mineure/observation, recommandations SMART, réponse managériale) ;
  - **Le rapport d'audit & la restitution** (structure du rapport, réunion de clôture, communiquer sans braquer) ;
  - **Indépendance, éthique & déontologie** (conflits d'intérêt, confidentialité, codes IIA/ISACA).
  - Chacun mêle leçons, quiz et études de cas réels ; les nouveaux parcours apparaissent automatiquement.

## [1.69.1] - 2026-08-09

### Modifié

- **Audit — onglet Constats** : le bouton « Créer une action » demande désormais une **confirmation** avant de créer l'action corrective (plus de création par simple clic). Un bouton de **suppression** de l'action liée est ajouté à côté de sa référence (réservé aux manager/directeur/admin) : supprimer l'action fait réapparaître « Créer une action ». Le geste n'a donc rien d'irréversible.

## [1.69.0] - 2026-08-09

### Ajouté

- **Académie Audit** (nouvel onglet « Académie » du module Audit) — un espace de formation dédié à l'audit, **réutilisant l'infrastructure de l'Académie GRC** (leçons, quiz, études de cas, défis, progression et niveau de compétence), mais avec sa **propre filière** et son propre niveau. Curriculum de départ centré sur la **méthode ISO 19011**, les **principes** (indépendance, présentation impartiale, approche fondée sur les preuves et par les risques) et des **cas d'études réels** (audit des sauvegardes, durcissement Active Directory…).
  - Les parcours sont désormais rangés par **filière** (`GRC` / `Audit`) : chaque académie n'affiche que ses parcours et calcule un niveau de compétence distinct. La création/import de parcours hérite de la filière de l'académie où l'on se trouve.
  - Les nouveaux parcours Audit apparaissent automatiquement (complément idempotent, sans doublon) ; les parcours existants restent en filière GRC.

## [1.68.0] - 2026-08-09

### Ajouté

- **Audit — questionnaire manuel à la création** : lors de la création d'un audit, on peut désormais **composer un questionnaire à la volée** (sans grille), avec une option **« Enregistrer aussi comme grille »** pour le réutiliser. Le choix « Depuis une grille / Questionnaire manuel » est proposé dès la fenêtre de création.
- **Audit — grande bibliothèque de grilles** : la bibliothèque de départ passe à **~20 grilles** couvrant un SI complexe (réseau & segmentation, Wi-Fi, VPN/télétravail, durcissement Windows/Linux, correctifs, Active Directory, applications Web & API, développement sécurisé, virtualisation, conteneurs/Kubernetes, Microsoft 365/Entra ID, IAM, PKI/chiffrement, bases de données, messagerie SPF/DKIM/DMARC, OT/ICS…), inspirées **CIS Benchmarks, ANSSI, NIST, OWASP, ISO 27002**. Les nouvelles grilles apparaissent automatiquement (complément idempotent, sans doublon).
- **Audit — nouvel onglet « Auditeurs »** : le **registre des auditeurs** (ISO 19011 §7) — rôle, **domaines de compétence**, certifications et **déclaration d'indépendance/impartialité**, avec le nombre d'audits menés.

### Modifié

- Les catégories d'audit sont enrichies (réseau, système Linux, applications, virtualisation, conteneurs, IAM, PKI, bases de données, OT…) pour couvrir l'ensemble du système d'information.

## [1.67.0] - 2026-08-09

### Ajouté

- **Module Audit — enrichissement (Lot 3)** :
  - **Radar consolidé par catégorie** (Tableau de bord) : on sélectionne jusqu'à **8 audits** et le radar affiche le **score moyen par catégorie** (Sauvegardes, AD/GPO, Journalisation…) — une vue de posture de direction générée à la demande.
  - **Nouvel onglet « Programme »** — le **programme d'audit annuel basé sur les risques** (ISO 19011 §5) : périmètres à auditer, par trimestre, avec priorité de risque, auditeur, grille pressentie, date prévue et lien vers l'audit réalisé. Suivi planifié → réalisé, retards et **taux de couverture** par année.
  - **Nouvel onglet « Constats »** — le **registre transverse des constats & recommandations** (ISO 19011 / IIA) : tous les écarts « Non »/« Partiel » de tous les audits, avec leur **suivi via l'action corrective (CAPA)** liée, filtres par suivi/criticité et création d'action en un clic.

## [1.66.0] - 2026-08-09

### Ajouté

- **Module Audit — Lot 2** : le module d'audit technique se relie au reste de Cap et devient exploitable de bout en bout.
  - **Constats → plan d'actions (CAPA)** : depuis un audit, chaque réponse « Non »/« Partiel » peut générer une **action corrective** du module GRC en un clic (origine « Audit technique », pré-remplie avec l'observation et la criticité). Le constat déjà traité affiche « action créée » (pas de doublon).
  - **Import / export JSON des grilles** : bouton « Importer JSON » (fichier ou copier-coller, un objet grille ou un tableau) et « Exporter JSON » depuis l'éditeur de grille, pour partager et versionner les référentiels.
  - **Rapport d'audit imprimable (PDF)** : score par domaine, constats, détail des réponses et synthèse — avec en-tête (logo, cible, date) et comparaison au ré-audit.
  - **Tendance de ré-audit** : chaque audit se compare automatiquement au précédent audit portant sur la **même grille et la même cible** (delta de points affiché dans la fiche, la liste et le rapport).

## [1.65.0] - 2026-08-09

### Ajouté

- **Nouveau module Audit** (entrée de menu « Audit », `/audit`) — audits techniques par questionnaire. *Lot 1.*
  - **Grilles d'audit** : référentiels réutilisables de questions (par domaine, avec « comment vérifier / preuve attendue », pondération et criticité). **Bibliothèque de départ** fournie (Sauvegardes, Active Directory/GPO, Journalisation, Durcissement serveur — inspirée CIS/ANSSI), entièrement **éditable**.
  - **Audits** : chaque audit applique une grille à une **cible** (un actif du registre ou une cible libre). Réponses **Oui / Partiel / Non / N-A** par question, avec observation et preuve. La grille est **figée** dans l'audit à sa création (score stable même si la grille évolue ensuite).
  - **Scoring & radar** : score par domaine (Oui=100, Partiel=50, Non=0, N-A exclu) → **radar** en direct, score global pondéré, taux de couverture et décompte des **constats** (dont critiques).
  - **Tableau de bord** : nombre d'audits, score moyen, constats à traiter, score moyen par catégorie et audits récents.
  - Accès réservé aux rôles manager/directeur/admin (lecture seule pour la DSI) ; suppression réservée aux manager/directeur/admin ; une grille utilisée par un audit ne peut pas être supprimée.

## [1.64.0] - 2026-08-09

### Ajouté

- **Rapport global du module GRC** (bouton « Rapport global » sur le Tableau de bord) : un document PDF unique qui **consolide tout le module** en une synthèse de direction —
  - **Posture GRC** (indice 0–100) et indicateurs clés agrégés (conformité, risques critiques, actions en retard, incidents, violations de données, AIPD, écarts terrain, applicabilité des politiques, continuité à tester, joyaux prioritaires) ;
  - **Conformité par référentiel**, **risques ouverts par niveau résiduel** + top des risques, **actifs par criticité** + joyaux, **contrôles / actions / incidents** (dont MTTR), **RGPD / continuité / missions / fournisseurs**, **acceptation des politiques par direction**, et la **dernière revue de direction**.
  - Vient compléter les rapports par onglet ajoutés en 1.63.0.

## [1.63.0] - 2026-08-08

### Ajouté

- **Politiques — avancement de l'acceptation par direction** : nouveau graphe (barres empilées) montrant, pour chaque direction de l'organigramme, la répartition des diffusions le long du cycle (Diffusée → Consultée → Comprise → Applicable) et le **taux d'applicabilité**. S'appuie sur le rattachement direction ↔ services de l'onglet Directions.
- **Rapports imprimables (PDF) dans tout le module GRC** : bouton « Rapport PDF » ajouté aux onglets pertinents pour un rapport, chacun avec un en-tête (logo de l'organisation, titre, date), des indicateurs de synthèse et le registre détaillé — fiables à l'impression (couleurs forcées) :
  - **Politiques** (dont l'avancement de l'acceptation par direction), **Conformité** (posture par référentiel + écarts), **Actifs** (registre C/I/D), **Contrôles terrain** (avancement + écarts), **Plan d'actions (CAPA)**, **Incidents** (registre ISO 27035), **Continuité** (BIA/PCA), **RGPD** (registre des traitements ROPA + AIPD), **Missions & dépendances**, **Fournisseurs & prestataires**, **Revue de direction** (posture GRC + document ISO §9.3 des revues).
  - Ces rapports viennent compléter ceux déjà présents (Risques, Joyaux).

### Interne

- Nouvelle brique partagée `components/grc/ReportKit.tsx` (chrome commun, styles de tableau, encadrés KPI, barres imprimables) pour homogénéiser tous les rapports du module.

## [1.62.0] - 2026-08-07

### Ajouté

- **Module GRC — Revue de direction & pilotage** (nouvel onglet « Revue de direction ») : un **tableau de bord synthétique** de la posture GRC et le **registre des revues de direction** (ISO 27001 §9.3).
  - **Indice de posture GRC** (0–100) : conformité moyenne des référentiels **pondérée** par les points d'attention (risques critiques, actions correctives en retard, incidents critiques, AIPD à réaliser, plans de continuité à tester).
  - **Indicateurs de pilotage** agrégés depuis **tous les onglets** : conformité, risques ouverts/critiques/acceptés, écarts terrain, actions en retard, incidents ouverts, violations de données, AIPD à réaliser, applicabilité des politiques, continuité à tester, joyaux prioritaires.
  - **Revues de direction (ISO 27001 §9.3)** : fiche structurée avec **éléments d'entrée** (évolutions du contexte, bilan des risques, conformité & audits, incidents & non-conformités, objectifs & plan d'action, retours des parties intéressées) et **éléments de sortie** (décisions & orientations, actions & moyens décidés).
  - **Participants**, période, dates de tenue et de prochaine revue, statut (Préparée → Tenue → Clôturée).
  - **Capture d'indicateurs** : un bouton fige les KPIs du moment dans la revue (instantané daté), pour un historique de la trajectoire GRC d'une revue à l'autre.
  - Édition réservée hors lecture seule ; suppression réservée aux manager/directeur/admin.

## [1.61.0] - 2026-08-07

### Ajouté

- **Module GRC — RGPD** (nouvel onglet « RGPD ») : le **registre des activités de traitement** (ROPA, art. 30) et les **analyses d'impact** (AIPD/PIA, art. 35).
  - Par traitement : finalité, **base légale**, catégories de données (dont **données sensibles** art. 9), personnes concernées, destinataires/sous-traitants, durée de conservation, **transferts hors UE**, mesures de sécurité, actifs supports, responsable et service.
  - **Section AIPD** : indication si requise, état (à réaliser / en cours / réalisée) et **risque résiduel pour les personnes**.
  - **Croisements** : l'onglet relie automatiquement les **violations de données** (incidents marqués « violation de données ») et les **sous-traitants** (fournisseurs accédant à des données personnelles/sensibles), avec les rappels réglementaires (notification 72 h, contrat art. 28).
  - Indicateurs : traitements, données sensibles, AIPD à réaliser, revues en retard.

### Ajouté

- **Module GRC — Gestion des incidents** (nouvel onglet « Incidents ») : registre des incidents de sécurité suivant le **cycle ISO 27035** — Déclaré → Qualifié → En traitement → Résolu → Clôturé.
  - Type, **gravité** (Mineur → Critique), **détection** & **résolution** (délai moyen de résolution calculé), déclarant et responsable, description, impact, **actifs impactés** et **mission** concernée.
  - **Confinement/traitement**, **cause racine** et **retour d'expérience (REX)**.
  - **Marqueur « violation de données personnelles »** (pertinence RGPD — notification 72 h à évaluer).
  - **Bouton d'avancement rapide** du cycle de vie ; passage en Résolu/Clôturé qui horodate automatiquement la résolution.
  - **Pont vers le plan d'actions** : générer une action corrective (CAPA) à partir d'un incident. Indicateurs : incidents, ouverts, critiques, violations de données.

### Ajouté

- **Module GRC — Continuité d'activité (BIA / PCA-PRA)** (nouvel onglet « Continuité ») : pour chaque **activité critique**, l'analyse d'impact métier (BIA) et le plan de continuité/reprise.
  - **BIA** : criticité, **domaines d'impact** (financier, opérationnel, juridique/RGPD, réputation, humain), et les **objectifs de reprise** — **DMIA** (durée max d'interruption admissible), **RTO** (délai de reprise) et **RPO** (perte de données max).
  - **PCA/PRA** : stratégie de continuité, ressources nécessaires, procédure de reprise, actifs supports, et **suivi des tests** (dernier test / à tester si > 1 an) et des revues.
  - **Rattachement aux missions** (prolonge Missions & dépendances) et **détection d'incohérence** : alerte si le RTO est plus long que la DMIA (reprise trop tardive).
  - Indicateurs : plans, activités vitales, plans à tester, écarts / à réviser.

### Ajouté

- **Distinctions — radar de compétences** : l'onglet Distinctions affiche pour chaque membre GRC un **graphe radar** de sa **maîtrise par domaine** (Fondamentaux, Risques, Conformité, Contrôles, Incidents, Décision — déduite de l'Académie) et de son **suivi du plan d'action** (part des actions CAPA menées sans retard).
- **Académie — import de parcours par JSON** : en mode « Gérer le contenu », un bouton **« Importer (JSON) »** permet de créer un parcours complet (leçons, quiz, études de cas, défis) à partir d'un fichier ou d'un texte JSON, avec un **modèle téléchargeable**. Chaque parcours peut aussi être **exporté en JSON** depuis son éditeur (pour servir de gabarit ou de sauvegarde).

### Ajouté

- **Module GRC — Fournisseurs & prestataires** (nouvel onglet « Fournisseurs ») : recenser les **tiers qui interagissent avec le SI** — type, **criticité**, prestation/périmètre, **niveau de données accédées** (aucune → sensibles), responsable interne, échéance de contrat et **prochaine revue de sécurité**, avec les **actifs du SI concernés**. Indicateurs : fournisseurs, critiques, accès à des données personnelles/sensibles, revues en retard.
- **Alimente la CJA** : sur l'onglet Joyaux, chaque actif critique affiche désormais les **prestataires ayant un accès** — une dépendance externe de plus à surveiller.

### Ajouté

- **Module GRC — Missions & dépendances** (nouvel onglet « Missions ») : cartographier les **missions de l'organisation** (dont les missions régaliennes), leur **valeur** (Vitale → Secondaire), les **actifs** et **personnes** qui les portent, et leurs **dépendances amont** (ce dont la mission dépend) **et aval** (qui dépend de la mission).
  - **Vue arborescente** par mission : Amont → Mission (avec ses actifs et personnes clés) → Aval, chaque dépendance colorée par criticité.
  - **Alimente l'analyse des joyaux (CJA)** : un actif porteur d'une mission vitale/essentielle **hérite de sa valeur métier** — sa protection prime même si sa classification technique C/I/D est modeste. L'onglet Joyaux (et son rapport PDF) affichent désormais les missions portées et intègrent cette valeur dans l'indice JRI.

### Ajouté

- **Académie — parcours « Analyse de risque » approfondi** : 7 nouvelles leçons portent le parcours ISO 27005 à **12 leçons** — le processus ISO 27005 de bout en bout, bâtir un scénario de risque (menace × vulnérabilité × actif), définir ses échelles de probabilité/impact, choisir la bonne stratégie de traitement (Réduire/Transférer/Éviter/Accepter), appétit du risque & acceptation formelle, une étude de cas guidée « construire un risque de A à Z » et un quiz d'approfondissement. Le curriculum atteint **40 leçons**.

### Ajouté

- **Académie — parcours « Incidents & non-conformités »** : réagir à un incident et traiter un écart aux règles. Événement/incident/crise, les 5 réflexes (dont « confiner avant d'enquêter »), étude de cas « un rançongiciel se propage », incident vs non-conformité, étude de cas « une non-conformité qui revient » (cause racine), quiz et défi vers le module Non-conformités. Le curriculum passe à **7 parcours, 33 leçons**.

### Ajouté / Modifié

- **Académie — nouveaux parcours** : ajout de **« Conformité & politiques »** (référentiels ISO/RGPD/NIS2/CIS, cycle de vie d'une politique, quiz, étude de cas « une politique reste lettre morte », défi) et **« Contrôles terrain & audit »** (utilité des rondes, bonne check-list, étude de cas « un écart en ronde », défi). Le curriculum passe à **6 parcours, 26 leçons**.
- **Mise à jour du curriculum sans écrasement** : au démarrage, l'Académie **complète** automatiquement la base avec les parcours et leçons manquants (repérés par titre), sans doublon ni suppression, et sans toucher au contenu créé par un formateur. Les futures additions au curriculum apparaissent donc au redémarrage suivant.

### Ajouté

- **Module GRC — Académie (Entraînement)** : un espace d'apprentissage ludique pour faire monter en compétence une équipe GRC débutante (nouvel onglet « Entraînement »).
  - **4 formats d'apprentissage** : **leçons**, **quiz (QCM)** avec correction et explications, **études de cas décisionnelles** (choix à conséquences + avis d'expert, notés), **défis pratiques** ancrés dans les vrais modules de Cap.
  - **Curriculum expert prêt à l'emploi** semé automatiquement : Fondamentaux cyber · Le métier GRC au quotidien · Analyse de risque (ISO 27005) · Décider & prioriser (4 parcours, 17 leçons).
  - **Niveau de compétence GRC dédié** (Débutant → Junior → Confirmé → Expert) avec XP, barre de progression, et **certifications** décernées à la complétion d'un parcours. Confettis à la réussite.
  - **Éditeur de contenu** pour les formateurs (manager/directeur/admin) : créer/modifier/supprimer des parcours et des leçons, y compris l'écriture de quiz et d'études de cas.

### Ajouté

- **Logo de l'organisation dans les rapports** : l'administration (**Administration → Paramètres**) permet désormais d'ajouter/remplacer/retirer un **logo** (en plus du nom de l'organisation). Le logo est redimensionné automatiquement et apparaît en tête de tous les documents imprimables — rapport d'activité, registre des risques, analyse des joyaux, rapports négligences et non-conformités.

### Ajouté

- **Module GRC — Directions & services** (nouvel onglet « Directions ») : recenser l'**organigramme** de l'organisation, une **direction regroupant plusieurs services** (sigle, directeur/responsable, description, responsable par service).
  - **Relié aux politiques** : les cibles de diffusion des politiques sont suggérées depuis l'organigramme (directions, sigles, services), et chaque direction affiche le **bilan d'assimilation et d'applicabilité** des politiques la concernant (agrégation des diffusions ciblant son nom, son sigle ou l'un de ses services) — taux d'applicabilité + taux d'assimilation (compris + appliqué).
  - Indicateurs : nombre de directions, de services, applicabilité moyenne.

### Ajouté

- **Projets — partage de fichiers** : chaque projet dispose d'une section **« Fichiers partagés »** permettant de déposer, télécharger et supprimer des documents (mêmes types et limite de 10 Mo que les pièces jointes de suivi). Dépôt réservé aux **membres du projet** (ou responsables) ; suppression par l'auteur du dépôt ou un responsable. Chaque fichier indique son auteur et sa date.

### Modifié

- **Classement — l'accomplissement des tâches et projets pèse davantage** : le poids de l'XP est renforcé pour l'**achèvement d'une tâche** (5 → 12 XP), les **sous-tâches** (1 → 2 XP) et surtout les **projets menés à terme** (50 → 120 XP).
- **Détail de l'XP par source** : la fiche « Mon profil de jeu » affiche désormais d'où vient l'XP (mails / tâches / projets / objectifs) avec une barre de répartition et les compteurs ; chaque ligne du classement rappelle le nombre de tâches achevées et de projets menés.

### Ajouté

- **Contrôles terrain — pilotage renforcé** (onglet Contrôles terrain) :
  - **Barre de progression** du dépouillement sur chaque carte de contrôle et dans la fiche (part des points évalués), avec **taux de conformité**.
  - **Points bloquants** mis en avant (les écarts) et **actions à mener** rattachées (nombre d'actions CAPA ouvertes / en retard) directement sur la carte.
  - **Bouton d'action rapide** pour faire avancer l'état d'un contrôle (Planifié → En cours → Réalisé → Clôturé) sans ouvrir la fiche — la transition est tracée dans le fil de vie.
  - Dans la fiche : section **« Actions à mener »** listant les actions correctives rattachées (référence, statut, retard).

### Ajouté

- **Joyaux de la couronne imprimables en PDF** (onglet Joyaux) : bouton « Rapport PDF » générant le document JCA — synthèse (joyaux, prioritaires, exposés, sans analyse), tableau des joyaux (criticité, C/I/D, exposition, protection, JRI, priorité) et recommandations par joyau à traiter.
- **Politiques — graphiques de suivi** : sur l'onglet Politiques, un bloc « Statistiques de suivi » visualise la **répartition des diffusions par état** (Diffusée → Consultée → Comprise → Applicable → Non applicable) et la **répartition des politiques par statut** (histogramme + anneau, thème clair/sombre).

### Corrigé

- **Distinctions GRC — prise en compte immédiate du marqueur « Membre GRC »** : basculer un membre en/hors GRC depuis l'Administration met désormais à jour l'onglet Distinctions **sans avoir à recharger la page** (auparavant le changement n'était visible qu'après un rechargement complet, donnant l'impression que les distinctions restaient vides).

## [1.45.0] - 2026-08-06

### Ajouté

- **Mode démo — jeu de données GRC complet** : le module GRC est désormais pleinement démontrable en mode démonstration (auparavant vide).
  - **Équipe GRC désignée** : le RSSI, la Gouvernance/Conformité et l'Audit sont marqués « Membre GRC » (les distinctions ne concernent qu'eux).
  - **Données cohérentes entre onglets** : 6 actifs (avec joyaux critiques), 6 risques ISO 27005 (dont un accepté et un « dompté »), 4 politiques avec diffusions à des étapes variées (dont une quasi 100 % pour illustrer le suivi « colis »), 6 contrôles terrain avec fils de vie et écarts, 5 actions CAPA (dont une clôturée et une en retard), 5 chantiers de plan de travail.
  - **Distinctions vivantes** : l'Audit ressort champion (Gardien, Œil de lynx, Clé de voûte), la Gouvernance obtient Gardien des politiques, le RSSI obtient Dompteur — avec les autres badges en progression.

### Ajouté

- **Module GRC — Analyse des Joyaux de la Couronne** (onglet « Joyaux », d'après la méthode MITRE *Crown Jewels Analysis*) : identifier les actifs vitaux pour la mission et prioriser leur protection, **entièrement déduit** des onglets Actifs, Risques et Contrôles (aucune saisie dédiée).
  - **Identification des joyaux** : un actif dont la criticité (max C/I/D) est Élevé/Critique, ou qui porte un risque résiduel élevé/critique.
  - **Indice JRI** (Jewel Risk Index, 0–100) croisant **valeur** (criticité), **exposition** (pire risque résiduel rattaché) et **protection** (mesures de traitement + contrôles terrain du service) ; bandes Prioritaire / À surveiller / Maîtrisé.
  - Par joyau : classification C/I/D, exposition (risques résiduels liés), niveau de protection et **recommandations** automatiques (analyse de risque manquante, exposition à réduire, absence de mesures, contrôle terrain à planifier).
  - Synthèse : joyaux identifiés, prioritaires, à exposition élevée, sans analyse de risque.

### Ajouté

- **Politiques — suivi « façon colis » (ludique & animé)** : un bouton **« Suivi »** sur chaque politique ouvre une vue immersive montrant, direction par direction, la progression le long du cycle **Diffusée → Consultée → Comprise → Appliquée**.
  - **Rail de livraison animé** par service : colis/camion 🚚 qui avance, jalons validés, étape courante pulsée, badge **« LIVRÉ »** rebondissant à l'arrivée.
  - **Anneau de progression global** (% appliquée) et **entonnoir de la flotte** (nombre de services ayant atteint chaque étape, barres animées).
  - **Gamification** : services classés du plus avancé au moins avancé (🥇🥈🥉) et **confettis** de célébration quand une politique est appliquée par tous les services concernés.
  - Respecte `prefers-reduced-motion` (animations désactivées si l'utilisateur le demande).

### Ajouté

- **Contrôles terrain — fil de vie & actions de suivi** : chaque contrôle dispose désormais d'une **timeline horodatée** de son évolution.
  - **Historique automatique des états** : la création et chaque **changement de statut** (Planifié → En cours → Réalisé → Clôturé) sont journalisés (état précédent → nouvel état, auteur, date).
  - **Actions de suivi** : possibilité d'ajouter des notes/actions datées (relance d'un service, nouvelle visite…) directement sur la fiche, sans quitter la modale.
  - Affichage en **frise chronologique** sur la fiche du contrôle (états et actions distingués par couleur).

### Ajouté / Modifié

- **Distinctions cyber réservées à l'équipe GRC** : un marqueur **« Membre GRC »** est ajouté à chaque profil, activable par un administrateur (**Administration → Membres → Équipe GRC**). Le classement des distinctions et le détail par membre ne concernent désormais que les profils marqués GRC (le reste du module reste accessible aux rôles habituels). Le tableau de bord GRC ne compte plus que l'équipe GRC pour le champion et le total de badges. Écran d'invitation si aucun membre n'est encore désigné.

### Ajouté

- **Registre des risques imprimable en PDF** (onglet Risques du module GRC) : bouton **« Rapport PDF »** générant un document ISO 27005 prêt à imprimer/exporter —
  synthèse (risques, critiques/élevés ouverts, acceptés, revues en retard), **matrice résiduelle** colorée, répartition par niveau résiduel, **détail complet du registre** (inhérent → résiduel, actif ciblé, traitement, statut, responsable, revue) et **journal des acceptations formelles** (signataire, dates, justification). Impression fidèle des couleurs de niveau.

### Ajouté

- **Module GRC — Plan de travail & Distinctions cyber** (Lot E, dernier lot du module) — deux nouveaux onglets.
  - **Plan de travail** (onglet « Plan de travail ») : piloter les **chantiers de l'équipe GRC**, cadencés par trimestre.
    - Fiche de chantier : **catégorie** (Conformité, Gestion des risques, Politiques, Sensibilisation, Audit/Contrôle, Gouvernance…), responsable, **année + trimestre**, priorité, statut (À planifier → En cours → En pause → Terminé → Abandonné), **avancement 0–100 %** (curseur) et échéance ; un chantier « Terminé » passe automatiquement à 100 %.
    - **Vue par trimestre** (T1→T4) avec barres d'avancement, filtre par catégorie et sélecteur d'année ; indicateurs (chantiers, actifs, terminés, en retard, avancement moyen).
  - **Distinctions cyber** (onglet « Distinctions ») : **gamification** honorifique calculée sur l'activité réelle de l'équipe (rondes, écarts, risques, politiques, actions, non-conformités, chantiers).
    - **10 badges** : 🛡️ Gardien (rondes), 🕵️ Œil de lynx (écarts), 🔒 Rempart (non-conformités traitées), 🎯 Chasseur de risques, 🐉 Dompteur (risque maîtrisé), 📢 Sentinelle (sensibilisation), 📜 Gardien des politiques, 🧯 Pompier (actions clôturées), 🏅 Zéro faille (aucun retard), 🔑 Clé de voûte (polyvalence GRC).
    - **Classement d'équipe** par nombre de distinctions + **détail par membre** (badges obtenus / progression vers les paliers restants). Aucune donnée saisie : tout est dérivé.
  - **Tableau de bord GRC** enrichi : bloc « Plan de travail » (actifs, terminés, en retard, avancement moyen) et bloc « Distinctions cyber » (total décerné + champion), avec accès direct aux onglets.

## [1.38.0] - 2026-08-06

### Ajouté

- **Module GRC — Contrôles terrain & Plan d'actions (CAPA)** — deux nouveaux onglets.
  - **Contrôles terrain** (onglet « Contrôles terrain ») : tracer les **rondes de sécurité, inspections physiques, audits internes, revues documentaires, entretiens et tests/exercices**.
    - Fiche de contrôle : type, direction/service, lieu, contrôleur, date, statut (Planifié → En cours → Réalisé → Clôturé) et conclusion.
    - **Check-list** éditable : chaque point porte un résultat (À vérifier / Conforme / **Écart** / Non applicable) et un constat ; le décompte des écarts est mis en avant.
    - Recherche et filtres par type et par statut ; indicateurs (contrôles, à réaliser, écarts relevés).
  - **Plan d'actions — CAPA** (onglet « Plan d'actions ») : registre des **actions correctives & préventives**.
    - Fiche d'action : nature (Corrective / Préventive), priorité, responsable, échéance, statut (Ouverte → En cours → Réalisée → Vérifiée → Clôturée) et **vérification d'efficacité** ; horodatage de clôture.
    - **Détection des retards** : mise en évidence des actions dont l'échéance est dépassée, filtre « en retard » dédié.
    - **Traçabilité de l'origine** : une action née d'un écart de contrôle terrain conserve le lien vers son contrôle source.
  - **Pont Écart → Action** : depuis un écart d'une check-list, générer en un clic une action corrective pré-remplie et rattachée au contrôle.
  - **Tableau de bord GRC** enrichi : bloc « Contrôles terrain & plan d'actions » (contrôles planifiés, écarts relevés, actions ouvertes, actions en retard) avec accès direct aux onglets.

## [1.37.0] - 2026-08-06

### Ajouté / Modifié
- **Risques — méthode ISO 27005** (refonte du registre, module GRC) :
  - **Risque inhérent → traitement → risque résiduel** : deux évaluations Probabilité × Impact (avant / après traitement), niveaux calculés ; la **matrice bascule entre vue inhérente et résiduelle**, et chaque risque affiche « Inhérent → Résiduel ».
  - **Scénario de risque** : **actif ciblé** (lié au registre des actifs), **source/menace** et **vulnérabilité**.
  - **Mesures de traitement liées à la conformité** : rattacher à un risque des mesures du catalogue (ISO/NIST/CIS/RGPD-NIS2) — le pont entre risques et conformité.
  - **Acceptation formelle** du risque : signataire, date, échéance d'acceptation et justification (traçabilité) ; passe le risque en statut « Accepté ».
  - **Historique de réévaluation** (piste d'audit) : chaque création, acceptation ou revue est horodatée avec un instantané des niveaux inhérent/résiduel ; bouton « Consigner une revue ».
  - Tableau de bord GRC et priorisation basés sur le **risque résiduel**.

## [1.36.0] - 2026-08-06

### Ajouté
- **Module GRC — Conformité** (onglet dédié) : évaluer la posture de l'organisation face aux référentiels.
  - **Bibliothèques de mesures** intégrées : **ISO/IEC 27001:2022 Annexe A (93 mesures)**, **NIST CSF 2.0** (22 catégories), **CIS Controls v8** (18 contrôles), **RGPD & NIS2** (obligations clés) — 157 mesures au total.
  - **Évaluation par mesure** : **applicabilité (déclaration d'applicabilité / SoA)** avec justification, **statut d'implémentation** (Non implémenté / Partiel / Implémenté) et **maturité 0–5** (échelle type CMMI), responsable, preuves, note/plan d'amélioration, dates d'évaluation et de revue.
  - **Score de conformité** calculé par référentiel **et par thème/fonction** (moyenne de maturité sur les mesures applicables), taux de couverture, sélecteur de référentiel, recherche & filtres.
  - **Tableau de bord GRC** enrichi : indice de conformité moyen (4 référentiels) + barre par référentiel.

## [1.35.0] - 2026-08-06

### Modifié
- **Module GRC unifié à onglets** : les entrées séparées « Registre des risques » et « Politiques » de la barre latérale sont regroupées sous **une seule entrée « GRC »** (onglets : **Tableau de bord · Actifs · Risques · Politiques**), pour désencombrer la navigation. Les anciennes URL `/risques` et `/politiques` sont remplacées par `/grc`.

### Ajouté
- **Registre des actifs** (ISO 27005) : cartographier ce que l'on protège, valorisé selon les besoins de sécurité **C/I/D** (Confidentialité / Intégrité / Disponibilité, échelle 1–4) ; la **criticité** de l'actif = la plus haute des trois valeurs. Type, propriétaire, direction/service, statut, date de revue, réf. auto (`ACT-AAAA-NNN`). Recherche & filtres (type, criticité).
- **Tableau de bord GRC** : vue transverse — actifs par criticité, **risques ouverts par niveau**, top 5 des risques, applicabilité moyenne des politiques, **revues en retard** (actifs + risques + politiques), avec accès direct aux onglets.

## [1.34.0] - 2026-08-05

### Ajouté
- **Module GRC — Politiques de sécurité** (lot 2) : bibliothèque de politiques et **suivi de diffusion par direction/service**.
  - Chaque politique : référence de cadre (ISO/CIS/NIST…), domaine, **version**, statut (Brouillon / En vigueur / Révisée / Retirée), responsable, dates (en vigueur / prochaine revue), résumé, lien du document, référence auto (`POL-AAAA-NNN`).
  - **Cycle de diffusion par service** : **Diffusée → Consultée → Comprise → Applicable** (ou « Non applicable »), avec pastilles de progression, note par service (interlocuteur, entretien…) et **taux d'applicabilité** calculé (part des services arrivés à « Applicable », hors « Non applicable »).
  - Cartes avec barre d'applicabilité, recherche & filtres (statut, domaine), KPIs. Accès manager/directeur/admin/dsi ; suppression réservée aux manager/directeur/admin.

## [1.33.0] - 2026-08-05

### Ajouté
- **Module GRC — Registre des risques** (Gouvernance-Risque-Conformité, lot 1) :
  - **Évaluation par matrice Probabilité × Impact** (échelles 1–5) → niveau **Faible / Moyen / Élevé / Critique** calculé et coloré ; **matrice heatmap 5×5** cliquable pour filtrer.
  - Traitement (**Réduire / Accepter / Transférer / Éviter**), plan d'action, statut (Identifié → En traitement → Réduit / Accepté / Transféré / Clôturé), catégorie, responsable, **date de revue**, référence automatique (`RISK-AAAA-NNNN`).
  - **Croisements inter-modules** : un risque se relie aux suivis, projets, non-conformités, négligences et objectifs → apparaît dans le **graphe de relations** (nœud « Risque »).
  - Recherche & filtres (niveau, statut, catégorie). Accès : manager / directeur / admin / dsi (attribuable par l'admin) ; suppression réservée aux manager/directeur/admin.

## [1.32.0] - 2026-08-05

### Ajouté
- **Mettre un fil de discussion en sourdine** : bouton « Notifié / En sourdine » sur chaque fil (suivi, projet, réunion…). En écrivant dans un fil on en devenait « abonné » à vie — on recevait une notification à chaque nouveau message de n'importe qui, sans pouvoir s'en défaire. On peut désormais **couper les notifications d'un fil précis** (préférence personnelle) ; le mute archive aussi les notifications non lues de ce fil.
- **Bulles de notification (push)** : à chaque nouvelle notification, une **bulle** apparaît en bas à droite (icône cloche + clic pour aller directement sur le sujet). **Activées par défaut**, **désactivables** d'un clic dans la barre du haut (icône cloche), indépendamment du son.
- **Sons distincts** : un **ping doux à deux notes** pour les messages, un **motif à trois notes plus vif** pour les autres notifications (au lieu d'un bip unique).

## [1.31.0] - 2026-08-05

### Ajouté
- **Plan de l'année — criticité & sous-titre des objectifs** : à la création (et à l'édition) d'un objectif, on renseigne désormais un **niveau de criticité** (Basse / Moyenne / Haute / Critique) affiché comme un **label de couleur** (pastille + badge), et un **sous-titre** (accroche courte sous le titre). La criticité et le sous-titre apparaissent sur les cartes du plan et dans la fiche de l'objectif.

## [1.30.0] - 2026-08-05

### Ajouté
- **Radar de profil (gamification)** sur la page Productivité — un graphique en **toile d'araignée à 6 axes** (**Réponses** aux mails, **Tâches** accomplies, **Projets** avancés, **Réactivité** / relances, **Clôtures**, **Ponctualité** / zéro escalade) qui **superpose le membre choisi** (soi-même par défaut) et la **moyenne d'équipe**. Échelle **relative à l'équipe** (le meilleur d'un axe = 100), sélecteur pour comparer n'importe quel membre, et un **indice global** individuel vs équipe.

## [1.29.0] - 2026-08-05

### Ajouté
- **Recherche & filtres sur les tâches** : le tableau Productivité gagne une **recherche texte** et un **filtre par priorité** (en plus du filtre par personne) ; la liste des tâches d'un projet gagne une **recherche** et une option **« masquer les terminées »**.
- **Les deux systèmes de tâches sont reliés** : une tâche du module Productivité rattachée à un projet apparaît désormais dans une section **« Tâches Productivité rattachées »** de la fiche projet (clic pour l'ouvrir), et on peut **définir le projet d'une tâche** depuis sa fiche (champ « Projet rattaché »). Ce lien existait en base mais n'était ni affiché ni modifiable.

### Modifié
- **Décision des propositions de tâches** : outre le propriétaire du projet, un **manager / directeur / admin** peut désormais **intégrer ou refuser** une proposition (secours quand le propriétaire est indisponible). La section « Propositions à valider » leur est visible.

## [1.28.0] - 2026-08-05

### Ajouté
- **Tâches de projet éditables** — un clic sur une tâche (ou le crayon) ouvre une **fiche d'édition** : intitulé, **description**, statut, **priorité**, responsable et échéance, plus suppression. Auparavant, seuls le statut et la suppression étaient accessibles (une faute de frappe imposait de recréer la tâche).
- **Parité avec les tâches Productivité** : les tâches de projet ont désormais une **description**, une **priorité** (badge dans la liste) et une **date d'achèvement** (renseignée au passage en « fait »).
- La **description d'une proposition** est désormais **conservée** lorsqu'elle est intégrée (elle était perdue jusqu'ici).

## [1.27.0] - 2026-08-05

### Sécurité
- **Droits sur les projets renforcés** : les vérifications côté serveur pour renommer un projet, gérer ses membres, l'archiver, y poster une note, y rattacher un suivi ou demander sa suppression/clôture étaient **inopérantes** (elles laissaient tout passer). N'importe quel membre de l'équipe pouvait, via l'API, **s'ajouter lui-même à un projet** (et gagner l'accès à son tableau de tâches), **en retirer d'autres**, ou **modifier n'importe quel projet**. Les gardes appliquent désormais exactement les règles de l'interface (propriétaire / membre / directeur / admin). Aucun changement visible pour les utilisations légitimes.

### Ajouté
- **Notifications de fin de tâche** : quand une tâche est marquée « terminée » (ou « bloquée »), le **créateur** (tâche du module Productivité) ou le **propriétaire du projet** (tâche de projet) est désormais prévenu.
- **Retrait de membre notifié** : une personne retirée d'un projet en est informée.
- **Rappels sur les tâches de projet en retard** : le moteur de rappels couvre désormais aussi les tâches de projet (échéance dépassée → rappel à la personne assignée), en plus des tâches Productivité.

### Corrigé
- Les **notifications de tâches** (assignation, retard) mènent désormais au bon écran au clic (elles n'avaient pas de lien de navigation). Le lien de la notification « suppression approuvée » ne pointe plus vers un projet déjà supprimé (404).

## [1.26.0] - 2026-08-05

### Ajouté
- **Notification d'assignation de tâche de projet** : quand le propriétaire (ou un membre) assigne une tâche d'un projet à quelqu'un, la personne assignée est désormais **notifiée** (avec lien direct vers le projet). Cela s'appliquait déjà aux tâches du module Productivité ; c'est désormais aussi le cas pour les tâches de projet.
- **Origine « Proposée par »** : une tâche issue d'une proposition affiche le **nom de la personne qui l'a proposée** directement dans la liste des tâches du projet.

### Amélioré / Corrigé
- **Demande de suppression de projet** : pour un manager/directeur/admin, la demande en attente est désormais **mise en évidence (surbrillance rouge pulsée)** avec la mention « votre décision est requise », et les boutons **Approuver / Refuser** sont bien présents. Combinée aux notifications cliquables (v1.25.0), la décision se prend directement depuis la fiche projet.

## [1.25.0] - 2026-08-05

### Ajouté
- **Notifications cliquables** : un clic sur une notification/rappel **redirige vers le sujet concerné** (ex. la fiche projet d'une proposition) en plus de l'archiver, pour agir immédiatement.

### Amélioré
- **Propositions à valider** (côté propriétaire) : la section est repositionnée **juste sous la barre de progression** et mise **en surbrillance pulsée** (anneau + pastille clignotante) pour ne plus passer inaperçue. Boutons « Intégrer » / « Refuser » plus lisibles, avec l'auteur et l'échéance mis en avant.
- **Proposer une tâche** (côté proposant) : formulaire repensé, plus clair et explicite (champs libellés, explication du circuit) ; chacun voit désormais **le statut de ses propres propositions** (en attente / intégrée / refusée, avec le motif de refus).

## [1.24.0] - 2026-08-05

### Ajouté
- **Propositions de tâches sur les projets (« pull request »)** — Lot 3 :
  - Le **propriétaire et les membres** d'un projet ajoutent des tâches directement (comme avant).
  - Les **autres utilisateurs** ne peuvent plus modifier le tableau directement : ils **proposent une tâche** (titre, précisions, échéance). Le **propriétaire du projet** l'**intègre** (elle devient une tâche du projet, assignée à l'auteur de la proposition) ou la **refuse**.
  - **Notifications** : le propriétaire est prévenu à chaque nouvelle proposition ; l'auteur est prévenu de la décision (intégrée / refusée).
  - Section **« Propositions à valider »** sur la fiche projet (propriétaire), et formulaire **« Proposer une tâche »** pour les non-membres.

### Modifié
- L'ajout et la modification directe des tâches d'un projet sont désormais **réservés au propriétaire, aux membres et aux manager/directeur/admin**. Les notes et le fil de discussion restent ouverts à toute l'équipe.

## [1.23.1] - 2026-08-05

### Modifié
- **Espace privé / publication désactivé** (le temps de décider de son intérêt). L'application se comporte de nouveau **comme avant** : tout élément créé est visible par l'équipe, sans notion de brouillon privé. Tout le code du Lot 2 reste en place mais inerte, réactivable en passant `PRIVATE_SPACE_ENABLED` à `true` dans `lib/domain.ts`. Les quelques éléments passés en privé pendant l'essai ont été republié.

## [1.23.0] - 2026-08-05

### Ajouté
- **Espace privé & publication** (visibilité par élément) sur les **suivis de mail, projets et tâches** :
  - **Privé par défaut** : un nouvel élément n'est visible que de son créateur et reste dans « Mon espace ». Une case « Publier tout de suite » permet de le partager dès la création.
  - **Publier** le rend visible par toute l'équipe (vue globale, statistiques, classement, rappels, graphe de relations). L'action est **définitive**.
  - Le **privé d'autrui ne quitte jamais le serveur** : les listes ne renvoient que les éléments publiés ou appartenant au demandeur. Les projets/tâches privés restent visibles de leurs **membres / de la personne assignée** (collaborateurs explicites).
  - Badge **« Privé »** sur les cartes et les fiches ; bouton **« Publier »** sur la fiche d'un suivi, d'un projet et d'une tâche.
  - Les brouillons privés **ne déclenchent ni relance ni escalade** et **ne comptent pas** dans les statistiques ni le classement tant qu'ils ne sont pas publiés.
  - Les éléments **déjà existants** sont considérés comme **publiés** (aucune rupture d'affichage).

## [1.22.1] - 2026-08-04

### Corrigé
- **Graphe de relations** : le repositionnement des bulles est désormais conservé. Auparavant, la disposition réorganisée à la souris se réinitialisait au bout de quelques secondes (l'animation était relancée à chaque rafraîchissement de la page). Les positions épinglées sont préservées entre les rendus, tant que l'ensemble des nœuds ne change pas.
- **Graphe de relations** : le nœud central est maintenant lui aussi déplaçable (il revient au centre par défaut mais peut être épinglé ailleurs).
- **Réunion — fil de discussion** : l'envoi de messages dans l'onglet discussion d'une réunion fonctionne (le type de conversation « meeting » était rejeté par l'API des messages).

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
