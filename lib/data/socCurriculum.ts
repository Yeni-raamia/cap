/* ==================================================================
 *  lib/data/socCurriculum.ts — Curriculum de l'Académie SOC.
 *  Accent sur la MÉTHODE d'un SOC : triage, gestion d'incident (NIST
 *  SP 800-61), lecture MITRE ATT&CK, hygiène opérationnelle.
 *  Même structure que les curricula GRC/Audit (CourseSeed), filière "soc".
 * ================================================================== */
import type { CourseSeed } from "./trainingCurriculum";
import type { QuizQuestion } from "../domain";

const q = (id: string, prompt: string, options: string[], correct: number, explanation: string): QuizQuestion => ({ id, prompt, options, correct, explanation });

export const SOC_CURRICULUM: CourseSeed[] = [
  {
    title: "Fondamentaux du SOC",
    description: "Rôle du SOC, chaîne de détection, niveaux et routine quotidienne.",
    category: "Méthode SOC",
    icon: "📡",
    badge: "Bases du SOC acquises",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Qu'est-ce qu'un SOC ?",
        content:
          "Un **SOC** (Security Operations Center) est l'équipe et l'organisation chargées de **surveiller, détecter, analyser et répondre** aux menaces de sécurité, en continu.\n\n" +
          "Il s'appuie sur une **chaîne de détection** : les journaux et événements des systèmes (postes, serveurs, réseau, cloud) sont collectés et corrélés par un **SIEM** (ici **Wazuh**), qui lève des **alertes**. Le SOC les **trie**, les **qualifie** et **réagit**.\n\n" +
          "Le SOC ne remplace pas la prévention (durcissement, correctifs) : il détecte ce qui est passé au travers et **limite l'impact**. Sa valeur tient autant aux outils qu'à la **méthode** et à la **rigueur** de l'équipe.",
      },
      {
        type: "lesson", xp: 20, title: "Niveaux, rôles et escalade",
        content:
          "On structure souvent le SOC en niveaux :\n\n" +
          "• **N1 (analyste)** — surveillance, triage initial, qualification des alertes, clôture des faux positifs, escalade des cas confirmés.\n" +
          "• **N2 (analyste confirmé)** — investigation approfondie, réponse à incident, corrélation multi-sources.\n" +
          "• **N3 / experts** — chasse aux menaces (threat hunting), détection engineering (création de règles), forensic.\n\n" +
          "La règle d'or : **en cas de doute, on escalade**. Un N1 n'a pas à tout résoudre seul ; savoir passer la main au bon moment fait partie du métier. L'escalade suit une **matrice** définie (cf. les procédures du SOC).",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Bases du SOC",
        content: "Vérifiez vos repères.",
        questions: [
          q("s1q1", "Le rôle premier du SOC est de…", ["Remplacer les correctifs", "Surveiller, détecter et répondre aux menaces", "Gérer la paie"], 1, "Le SOC détecte et répond ; il complète (ne remplace pas) la prévention."),
          q("s1q2", "Quel outil corrèle les journaux et lève des alertes ?", ["Le SIEM (ex. Wazuh)", "Le pare-feu seul", "Le tableur"], 0, "Le SIEM centralise, corrèle et alerte."),
          q("s1q3", "Un analyste N1 face à un cas confirmé et complexe doit…", ["Tout résoudre seul", "Escalader au N2 selon la matrice", "Ignorer"], 1, "En cas de doute ou de complexité, on escalade."),
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Une journée au SOC",
        content: "Vous prenez votre poste. Par quoi commencez-vous, avant même de traiter les alertes ?",
        steps: [
          {
            id: "s1s1", prompt: "Première action de prise de poste ?",
            options: [
              { label: "Traiter tout de suite la première alerte venue", feedback: "Non : sans contexte ni vérification de la chaîne, on risque de passer à côté de l'essentiel.", score: 20 },
              { label: "Lire la passation et vérifier que la collecte/le SIEM fonctionnent", feedback: "Exactement : la check-list de prise de poste garantit qu'on ne surveille pas dans le vide.", score: 100 },
            ],
          },
          {
            id: "s1s2", prompt: "Une source critique ne remonte plus depuis 2 h. Que faites-vous ?",
            options: [
              { label: "Rien, ça reviendra", feedback: "Non : une source muette = un angle mort de détection.", score: 0 },
              { label: "J'ouvre un ticket, j'investigue la cause et je préviens si besoin", feedback: "Correct : une perte de visibilité se traite comme un problème à part entière.", score: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Triage & qualification des alertes",
    description: "Distinguer le vrai du faux positif et décider de la suite, avec méthode.",
    category: "Pratique SOC",
    icon: "🧯",
    badge: "Triage maîtrisé",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Vrai ou faux positif ?",
        content:
          "Une alerte n'est **pas** un incident. C'est un signal qui doit être **qualifié**.\n\n" +
          "Règle de base : **corroborer par une seconde source** avant de conclure. Une alerte EDR se recoupe avec les journaux, le contexte métier, l'historique du poste/compte.\n\n" +
          "• **Faux positif** — comportement légitime mal interprété (un admin qui fait une action normale). On **clôture en documentant** (utile pour affiner la règle).\n" +
          "• **Vrai positif** — activité malveillante avérée. On **traite** (runbook) ou on **escalade** en incident.\n\n" +
          "Ne jamais conclure sur une seule alerte, et **toujours documenter** la décision — même un faux positif.",
      },
      {
        type: "lesson", xp: 20, title: "Coter la gravité & décider",
        content:
          "Après confirmation, on **cote** : Mineur → Modéré → Majeur → Critique, selon **l'actif touché**, la **sensibilité des données** et la **propagation possible**.\n\n" +
          "Puis on **décide** :\n" +
          "• **Clôturer** (faux positif documenté) ;\n" +
          "• **Traiter** selon le runbook adapté ;\n" +
          "• **Escalader** en incident (registre GRC) et prévenir selon la matrice.\n\n" +
          "La gravité dépend du **contexte** : la même alerte sur un poste de test ou sur un contrôleur de domaine n'a pas le même poids.",
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Alerte d'hameçonnage",
        content: "Un utilisateur signale un e-mail suspect ; l'alerte de la passerelle le confirme. Comment procédez-vous ?",
        steps: [
          {
            id: "s2s1", prompt: "Première étape de qualification ?",
            options: [
              { label: "Supprimer l'e-mail et clore", feedback: "Trop tôt : il faut d'abord analyser et mesurer l'exposition.", score: 20 },
              { label: "Analyser le message (expéditeur, URL, pièces jointes) et le recouper", feedback: "Oui : on qualifie sur des preuves avant d'agir.", score: 100 },
            ],
          },
          {
            id: "s2s2", prompt: "Un utilisateur a saisi ses identifiants sur le faux site. Quelle suite ?",
            options: [
              { label: "Observation mineure", feedback: "Sous-évalué : des identifiants compromis, c'est un risque majeur.", score: 20 },
              { label: "Escalader en incident, réinitialiser le compte et suivre le runbook", feedback: "Correct : compromission d'identifiants → réponse immédiate + escalade.", score: 100 },
            ],
          },
        ],
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Triage",
        content: "Le bon réflexe.",
        questions: [
          q("s2q1", "Avant de conclure sur une alerte, il faut…", ["La corroborer par une 2e source", "Se fier à l'intuition", "La fermer vite"], 0, "On ne conclut jamais sur une seule alerte."),
          q("s2q2", "Un faux positif se traite en…", ["L'ignorant sans trace", "Le documentant (utile pour la détection)", "Le supprimant du SIEM"], 1, "On documente : c'est utile pour affiner les règles."),
          q("s2q3", "La gravité d'une alerte dépend surtout…", ["De l'heure", "Du contexte (actif, données, propagation)", "De l'analyste"], 1, "Le contexte fait la gravité."),
        ],
      },
    ],
  },
  {
    title: "Gestion d'incident (NIST SP 800-61)",
    description: "Les phases de la réponse à incident et les bons réflexes de confinement.",
    category: "Méthode SOC",
    icon: "🚒",
    badge: "Répondant à incident",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Les phases de la réponse",
        content:
          "Le cycle de vie d'un incident (NIST SP 800-61) :\n\n" +
          "1. **Préparation** — outils, procédures, runbooks, formation (tout ce qu'on fait AVANT).\n" +
          "2. **Détection & analyse** — qualifier, coter, comprendre le périmètre.\n" +
          "3. **Confinement, éradication & rétablissement** — limiter la casse, supprimer la menace, remettre en service.\n" +
          "4. **Activité post-incident (REX)** — cause racine, leçons, amélioration.\n\n" +
          "Un incident confirmé se consigne dans le **registre GRC** (source unique, ISO 27035). Le SOC exécute la réponse ; le GRC en gouverne le suivi.",
      },
      {
        type: "lesson", xp: 20, title: "Confiner sans détruire les preuves",
        content:
          "Le **confinement** limite la propagation. Deux réflexes essentiels :\n\n" +
          "• **Isoler sans éteindre** quand c'est possible (déconnexion réseau/quarantaine EDR) : éteindre détruit la mémoire vive et des preuves précieuses.\n" +
          "• **Préserver les preuves** (journaux, images) avant toute remédiation — utile en cas de plainte ou d'analyse.\n\n" +
          "Pour un rançongiciel : isoler vite, **protéger les sauvegardes**, ne pas payer par réflexe, et suivre le runbook dédié. L'éradication passe souvent par une **réinstallation propre** plutôt qu'une simple désinfection.",
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Rançongiciel détecté",
        content: "Un serveur montre des fichiers chiffrés et une note de rançon. Réaction immédiate ?",
        steps: [
          {
            id: "s3s1", prompt: "Que faites-vous du serveur touché ?",
            options: [
              { label: "Je l'éteins tout de suite", feedback: "Non : éteindre détruit des preuves (mémoire). On isole sans éteindre.", score: 10 },
              { label: "Je l'isole du réseau sans l'éteindre", feedback: "Correct : on stoppe la propagation en préservant les preuves.", score: 100 },
            ],
          },
          {
            id: "s3s2", prompt: "Priorité suivante ?",
            options: [
              { label: "Vérifier et protéger les sauvegardes, ouvrir un incident critique", feedback: "Exactement : les sauvegardes saines sont la clé de la reprise ; escalade immédiate.", score: 100 },
              { label: "Payer la rançon", feedback: "Non : jamais par réflexe ; c'est une décision de direction, déconseillée.", score: 0 },
            ],
          },
        ],
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Réponse à incident",
        content: "Les réflexes qui comptent.",
        questions: [
          q("s3q1", "Pour préserver les preuves d'un poste compromis, on…", ["L'éteint", "L'isole sans l'éteindre", "Le réinstalle direct"], 1, "Éteindre détruit la mémoire vive : on isole sans éteindre."),
          q("s3q2", "Face à un rançongiciel, une priorité est de…", ["Payer vite", "Protéger les sauvegardes", "Attendre"], 1, "Des sauvegardes saines permettent la reprise."),
          q("s3q3", "Un incident confirmé est consigné…", ["Dans un fichier perso", "Dans le registre GRC (source unique)", "Nulle part"], 1, "Registre GRC = source unique (ISO 27035)."),
        ],
      },
    ],
  },
  {
    title: "Lire & utiliser MITRE ATT&CK",
    description: "Se repérer dans les tactiques/techniques pour mieux détecter et répondre.",
    category: "Méthode SOC",
    icon: "🎯",
    badge: "Lecteur ATT&CK",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Tactiques & techniques",
        content:
          "**MITRE ATT&CK** est une base de connaissances des comportements adverses, structurée en :\n\n" +
          "• **Tactiques** — le *pourquoi* d'une action (ex. Accès initial, Persistance, Exfiltration).\n" +
          "• **Techniques** — le *comment* (ex. T1566 Hameçonnage, T1486 Chiffrement des données).\n\n" +
          "ATT&CK donne un **langage commun** : au lieu de dire « l'attaquant a envoyé un mail piégé », on dit « T1566 », et tout le monde comprend — y compris les règles de détection et les runbooks.",
      },
      {
        type: "lesson", xp: 20, title: "Du savoir à l'action",
        content:
          "ATT&CK relie **menace → détection → réponse** :\n\n" +
          "• **Détection** : pour une technique, quelle donnée l'observe (Event ID, journal) et quelle **règle Wazuh** la lève ?\n" +
          "• **Réponse** : quel **runbook** appliquer si cette technique est confirmée ?\n\n" +
          "Dans Cap, l'onglet **ATT&CK** matérialise ce lien : chaque technique affiche les **runbooks reliés** et une **piste de détection**. On peut ainsi repérer les **angles morts** (techniques sans détection ni runbook) et prioriser.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — ATT&CK",
        content: "Le langage commun.",
        questions: [
          q("s4q1", "Une tactique ATT&CK décrit…", ["Le pourquoi d'une action", "La marque de l'antivirus", "Un numéro de ticket"], 0, "Tactique = objectif (le pourquoi) ; technique = le comment."),
          q("s4q2", "« T1566 » désigne…", ["Un pare-feu", "La technique d'hameçonnage", "Une version de Windows"], 1, "T1566 = Phishing (hameçonnage)."),
          q("s4q3", "L'intérêt d'ATT&CK pour le SOC est…", ["Décorer les rapports", "Un langage commun reliant détection et réponse", "Remplacer le SIEM"], 1, "Un référentiel partagé qui relie détection et réponse."),
        ],
      },
      {
        type: "challenge", xp: 30, title: "Défi — Explore la cartographie ATT&CK",
        content: "Ouvre l'onglet ATT&CK du SOC, choisis une technique (ex. T1566) et repère ses runbooks reliés ; note une piste de détection Wazuh.",
        challengeHref: "/soc?tab=attack",
      },
    ],
  },
  {
    title: "Chasse aux menaces (threat hunting)",
    description: "Chercher activement ce que les alertes ne montrent pas : hypothèses, pyramide de la douleur, méthode.",
    category: "Pratique SOC",
    icon: "🏹",
    badge: "Chasseur de menaces",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Détecter vs chasser",
        content:
          "La **détection** est réactive : une règle lève une alerte, on la traite. La **chasse (threat hunting)** est **proactive** : on part de l'hypothèse qu'un attaquant est **déjà présent** mais **passé sous les radars**, et on va le chercher.\n\n" +
          "Une chasse commence par une **hypothèse** (« un attaquant pourrait utiliser PowerShell pour persister ») fondée sur ATT&CK, la veille ou le contexte. On la **teste** dans les journaux, on **confirme ou infirme**, et — surtout — si on trouve un angle mort, on crée une **nouvelle règle de détection** : la chasse **nourrit** la détection.\n\n" +
          "Le hunting suppose une bonne **visibilité** (journaux riches) et de la **curiosité méthodique**, pas seulement des outils.",
      },
      {
        type: "lesson", xp: 20, title: "La pyramide de la douleur",
        content:
          "La **pyramide de la douleur** (David Bianco) classe les indicateurs selon la **difficulté pour l'attaquant** de les changer :\n\n" +
          "• **Bas** : hachés de fichiers, adresses IP — **triviaux** à changer (peu de valeur durable).\n" +
          "• **Milieu** : noms de domaine, artefacts réseau/hôte.\n" +
          "• **Haut** : **outils** et surtout **TTP** (tactiques, techniques, procédures) — **très coûteux** à modifier.\n\n" +
          "Leçon : bloquer une IP gêne peu l'attaquant ; détecter un **comportement** (TTP) lui fait vraiment « mal ». La chasse vise donc en priorité les **comportements**, pas seulement les IOC atomiques.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Hunting", content: "Proactif et malin.",
        questions: [
          q("sh1q1", "La chasse aux menaces est…", ["Réactive (attendre l'alerte)", "Proactive (chercher l'intrus caché)", "Un scan antivirus"], 1, "Le hunting part d'une hypothèse et va chercher activement."),
          q("sh1q2", "Selon la pyramide de la douleur, ce qui gêne le plus l'attaquant, c'est de détecter…", ["Une IP", "Un haché", "Ses TTP (comportements)"], 2, "Changer ses comportements est le plus coûteux pour l'attaquant."),
          q("sh1q3", "Une chasse fructueuse devrait…", ["Rester secrète", "Déboucher sur une nouvelle règle de détection", "S'arrêter là"], 1, "La chasse nourrit la détection (on comble l'angle mort)."),
        ],
      },
      {
        type: "challenge", xp: 30, title: "Défi — Formule une hypothèse de chasse",
        content: "Ouvre l'onglet ATT&CK, choisis une technique non couverte (angle mort) et écris une hypothèse de chasse : quelle donnée l'observerait ? Note une piste de règle.",
        challengeHref: "/soc?tab=attack",
      },
    ],
  },
  {
    title: "Analyse des journaux & requêtes",
    description: "Lire un log, isoler le signal du bruit et construire une requête d'investigation efficace.",
    category: "Pratique SOC",
    icon: "🔎",
    badge: "Analyste de journaux",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Anatomie d'un journal",
        content:
          "Un journal (log) est une **suite d'événements horodatés**. Pour l'exploiter, on identifie les **champs** clés : **quand** (timestamp), **qui** (utilisateur/compte), **quoi** (action, Event ID), **où** (hôte, IP source/destination), **résultat** (succès/échec).\n\n" +
          "Quelques repères Windows utiles : **4624** (ouverture de session réussie), **4625** (échec), **4672** (privilèges spéciaux), **4688** (création de processus), **1102** (effacement du journal de sécurité — souvent suspect).\n\n" +
          "La **fiabilité de l'horodatage** (NTP synchronisé) est cruciale : sans temps commun, impossible de corréler des événements entre plusieurs sources.",
      },
      {
        type: "lesson", xp: 20, title: "Du bruit au signal",
        content:
          "Un SIEM comme **Wazuh** génère beaucoup de bruit. La méthode d'investigation :\n" +
          "1. **Partir d'un pivot** (un compte, une IP, un hôte, un horaire).\n" +
          "2. **Filtrer** progressivement (réduire la fenêtre de temps, exclure le légitime connu).\n" +
          "3. **Corréler** plusieurs sources (auth + processus + réseau) pour reconstituer une **chronologie**.\n\n" +
          "Attention aux pièges : un pic d'échecs 4625 peut être un **bruteforce**… ou un simple mot de passe expiré. Le **contexte** tranche. On documente la requête utilisée pour rendre l'analyse **reproductible**.",
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Pic de connexions échouées",
        content: "Vous voyez 500 événements 4625 sur un compte en 10 minutes, puis un 4624 réussi. Comment lisez-vous ça ?",
        steps: [
          {
            id: "sl1s1", prompt: "Votre première hypothèse ?",
            options: [
              { label: "Un simple oubli de mot de passe", feedback: "Possible, mais 500 échecs puis un succès évoque fortement un bruteforce réussi.", score: 30 },
              { label: "Une attaque par force brute potentiellement réussie", feedback: "Oui : le motif (nombreux échecs → succès) est caractéristique ; à confirmer.", score: 100 },
            ],
          },
          {
            id: "sl1s2", prompt: "Quelle corrélation confirmerait la compromission ?",
            options: [
              { label: "Rien, le 4624 suffit à clore", feedback: "Non : il faut vérifier ce que le compte a fait ensuite.", score: 20 },
              { label: "L'IP source, la géolocalisation, et l'activité du compte après le succès", feedback: "Correct : on corrèle pour qualifier l'impact et décider d'escalader.", score: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Threat intelligence & IOCs",
    description: "Exploiter la veille : IOC, TLP, cycle du renseignement et bon usage des indicateurs.",
    category: "Méthode SOC",
    icon: "🧠",
    badge: "Analyste renseignement",
    lessons: [
      {
        type: "lesson", xp: 20, title: "IOC, IOA et cycle du renseignement",
        content:
          "Un **IOC** (Indicator of Compromise) est une **trace** d'une attaque : haché de fichier, IP/domaine malveillant, clé de registre, URL. Un **IOA** (Indicator of Attack) décrit plutôt un **comportement** en cours.\n\n" +
          "La **threat intelligence** suit un **cycle** : orientation (de quoi ai-je besoin ?) → collecte → traitement → **analyse** → diffusion → retour. Le but n'est pas d'**accumuler** des indicateurs, mais de produire du renseignement **actionnable** et **contextualisé** pour SA propre organisation.\n\n" +
          "Attention à la **péremption** : un IOC atomique (IP) vieillit vite. On **date**, on fixe une **expiration**, et on privilégie les indicateurs à forte valeur (comportements, TTP).",
      },
      {
        type: "lesson", xp: 20, title: "Le protocole TLP",
        content:
          "Le **TLP** (Traffic Light Protocol) encadre le **partage** de l'information sensible :\n\n" +
          "• **TLP:RED** — pour les seuls destinataires nommés, ne pas rediffuser.\n" +
          "• **TLP:AMBER** — diffusion limitée à l'organisation / au besoin d'en connaître.\n" +
          "• **TLP:GREEN** — partage au sein de la communauté, pas public.\n" +
          "• **TLP:CLEAR** (ex-WHITE) — diffusion libre.\n\n" +
          "Respecter le TLP est une question de **confiance** : mal rediffuser une information TLP:RED, c'est se couper de ses sources. Dans Cap, chaque élément de veille porte son niveau TLP et un statut (actif, en traitement, traité).",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Threat intel", content: "Renseigner, pas collectionner.",
        questions: [
          q("si1q1", "Un IOC de type adresse IP est…", ["Éternel", "Périssable (à dater et expirer)", "Toujours fiable"], 1, "Les IOC atomiques vieillissent vite : on les date et on les périme."),
          q("si1q2", "TLP:RED signifie…", ["Diffusion libre", "Réservé aux destinataires nommés", "Public"], 1, "TLP:RED = ne pas rediffuser au-delà des personnes désignées."),
          q("si1q3", "Le but de la threat intel est de produire du renseignement…", ["Volumineux", "Actionnable et contextualisé", "Secret pour le secret"], 1, "L'objectif : actionnable pour votre organisation."),
        ],
      },
      {
        type: "challenge", xp: 30, title: "Défi — Qualifie un élément de veille",
        content: "Ouvre l'onglet Veille du SOC. Repère un IOC, vérifie son TLP, sa date d'expiration et l'action associée. Identifie un indicateur périmé à mettre à jour.",
        challengeHref: "/soc?tab=veille",
      },
    ],
  },
  {
    title: "Analyser un e-mail malveillant",
    description: "Décortiquer un phishing : en-têtes, URL, pièces jointes — sans se faire piéger.",
    category: "Pratique SOC",
    icon: "📧",
    badge: "Analyste phishing",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Lire les en-têtes & l'authentification",
        content:
          "Face à un e-mail suspect, on ne se fie **pas** au nom affiché. On lit les **en-têtes** : l'adresse d'expédition **réelle**, le chemin (`Received`), et surtout les résultats **SPF / DKIM / DMARC** :\n\n" +
          "• **SPF** — l'IP émettrice est-elle autorisée pour ce domaine ?\n" +
          "• **DKIM** — la signature du message est-elle valide ?\n" +
          "• **DMARC** — l'alignement est-il respecté ?\n\n" +
          "Un **échec** de ces contrôles, une adresse de réponse **différente** de l'expéditeur, un domaine **ressemblant** (typosquatting) sont des signaux forts. Le **ton d'urgence** et la demande d'action (lien, virement, identifiants) confirment le doute.",
      },
      {
        type: "lesson", xp: 20, title: "Analyser liens & pièces jointes… en sécurité",
        content:
          "On analyse les éléments **sans les déclencher** : ne **jamais** ouvrir une pièce jointe ou cliquer un lien sur son poste de production. On travaille en environnement **isolé** (sandbox), on **survole** les URL pour voir la vraie destination, on **détonne** les pièces jointes dans un bac à sable.\n\n" +
          "Éléments à extraire (les **IOC**) : domaines et URL, adresses IP, hachés des pièces jointes, adresse d'expéditeur. On les recoupe avec la **threat intel**.\n\n" +
          "Si des utilisateurs ont **reçu** (ou pire, **cliqué**), on mesure l'exposition : recherche du message dans la messagerie, réinitialisation des comptes concernés, blocage des IOC, et **runbook hameçonnage**.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Phishing", content: "Le bon geste d'analyse.",
        questions: [
          q("se1q1", "Pour vérifier l'authenticité d'un e-mail, on regarde…", ["Le nom affiché", "Les en-têtes et SPF/DKIM/DMARC", "La signature graphique"], 1, "Le nom affiché se falsifie ; les en-têtes et l'authentification font foi."),
          q("se1q2", "Une pièce jointe suspecte s'ouvre…", ["Sur son poste, pour voir", "Dans un environnement isolé (sandbox)", "Jamais analysée"], 1, "On détonne en sandbox, jamais sur le poste de production."),
          q("se1q3", "Après analyse, les URL et hachés extraits sont…", ["Inutiles", "Des IOC à recouper et bloquer", "À publier partout"], 1, "Ce sont des IOC : on les recoupe et on les bloque."),
        ],
      },
    ],
  },
  {
    title: "Écrire de bonnes règles de détection",
    description: "Concevoir des détections utiles : fidélité, faux positifs, enrichissement et cycle de vie.",
    category: "Méthode SOC",
    icon: "⚙️",
    badge: "Ingénieur détection",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Une bonne détection : fidèle et actionnable",
        content:
          "Une règle de détection utile est **fidèle** (elle lève une alerte quand — et seulement quand — le comportement visé se produit) et **actionnable** (l'analyste sait quoi faire). Deux ennemis :\n\n" +
          "• Le **faux positif** — trop d'alertes inutiles → **fatigue d'alerte**, on finit par ignorer.\n" +
          "• Le **faux négatif** — la menace passe inaperçue.\n\n" +
          "On vise le bon **équilibre**, et on préfère détecter un **comportement (TTP)** plutôt qu'un indicateur atomique facile à contourner. Chaque règle devrait citer la **technique ATT&CK** visée et être **documentée** (intention, source de données, réponse attendue).",
      },
      {
        type: "lesson", xp: 20, title: "Tester, enrichir, faire vivre",
        content:
          "Une règle se **teste** avant la production (données réelles ou simulation type atomic test) et se **mesure** ensuite : combien d'alertes ? quel taux de vrais positifs ?\n\n" +
          "L'**enrichissement** rend l'alerte exploitable : ajouter le contexte (criticité de l'actif, propriétaire du compte, géolocalisation) pour que l'analyste décide vite. Une alerte nue, sans contexte, coûte cher à traiter.\n\n" +
          "Enfin, une règle a un **cycle de vie** : on la **révise** (l'environnement change), on **désactive** les règles trop bruyantes ou obsolètes, on **documente** les exceptions légitimes. La détection est un **produit vivant**, pas un réglage figé.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Détection", content: "Concevoir juste.",
        questions: [
          q("sd1q1", "Trop de faux positifs provoque…", ["Une meilleure sécurité", "La fatigue d'alerte (on finit par ignorer)", "Rien"], 1, "La fatigue d'alerte fait manquer les vraies menaces."),
          q("sd1q2", "Mieux vaut détecter en priorité…", ["Une IP unique", "Un comportement (TTP)", "Un nom de fichier"], 1, "Les comportements sont plus durables et coûteux à contourner."),
          q("sd1q3", "Une règle de détection…", ["Est figée une fois écrite", "A un cycle de vie (test, mesure, révision)", "Ne se teste jamais"], 1, "On teste, mesure, enrichit et révise en continu."),
        ],
      },
    ],
  },
];
