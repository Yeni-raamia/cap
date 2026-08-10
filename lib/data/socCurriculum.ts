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
];
