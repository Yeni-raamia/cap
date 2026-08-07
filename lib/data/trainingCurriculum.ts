/* ==================================================================
 *  lib/data/trainingCurriculum.ts — Curriculum expert de départ pour
 *  l'Académie GRC. Structure neutre réutilisée par le seed base réelle
 *  (training.ts) et le mode démo (grcDemo.ts). Contenu éditable ensuite.
 * ================================================================== */
import type { LessonType, QuizQuestion, CaseStep } from "../domain";

export interface LessonSeed {
  type: LessonType;
  title: string;
  content: string;
  xp: number;
  questions?: QuizQuestion[];
  steps?: CaseStep[];
  challengeHref?: string;
}
export interface CourseSeed {
  title: string;
  description: string;
  category: string;
  icon: string;
  badge: string;
  lessons: LessonSeed[];
}

const q = (id: string, prompt: string, options: string[], correct: number, explanation: string): QuizQuestion => ({ id, prompt, options, correct, explanation });

export const CURRICULUM: CourseSeed[] = [
  {
    title: "Fondamentaux de la cybersécurité",
    description: "Le vocabulaire et les réflexes de base — sans prérequis technique.",
    category: "Fondamentaux cyber",
    icon: "🛡️",
    badge: "Bases cyber acquises",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Les 3 piliers : Confidentialité, Intégrité, Disponibilité",
        content:
          "La sécurité de l'information protège trois propriétés, résumées par le sigle CID :\n\n" +
          "• Confidentialité — l'information n'est accessible qu'aux personnes autorisées (ex. un bulletin de paie).\n" +
          "• Intégrité — l'information n'est pas altérée sans autorisation (ex. un montant de virement).\n" +
          "• Disponibilité — l'information est accessible quand on en a besoin (ex. la messagerie qui doit fonctionner).\n\n" +
          "Tout l'objectif de la GRC est de préserver ces trois propriétés sur les actifs importants de l'organisation. Quand on classe un actif « C/I/D », on note de 1 à 4 le besoin de protection sur chacun de ces axes.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Bases de la sécurité", content: "Vérifiez vos réflexes.",
        questions: [
          q("f1q1", "Un pirate modifie discrètement le RIB sur une facture. Quelle propriété est atteinte ?", ["Confidentialité", "Intégrité", "Disponibilité"], 1, "Modifier une donnée sans autorisation, c'est atteindre son intégrité."),
          q("f1q2", "Un rançongiciel chiffre tous les fichiers et rend le SI inutilisable. Quelle propriété est d'abord touchée ?", ["Disponibilité", "Confidentialité", "Aucune"], 0, "Le SI devient indisponible : c'est la disponibilité qui est visée en premier."),
          q("f1q3", "Que signifie « classer un actif en C4 » ?", ["Il coûte 4 000 €", "Besoin de confidentialité maximal", "Il a 4 propriétaires"], 1, "C4 = niveau de confidentialité le plus élevé (donnée secrète)."),
        ],
      },
      {
        type: "lesson", xp: 20, title: "Les menaces les plus courantes",
        content:
          "On n'a pas besoin d'être technique pour reconnaître les grandes familles de menaces :\n\n" +
          "• Hameçonnage (phishing) — un e-mail piégé qui pousse à cliquer ou à donner un mot de passe.\n" +
          "• Rançongiciel — un logiciel qui chiffre les données et réclame une rançon.\n" +
          "• Ingénierie sociale — la manipulation humaine (un faux « technicien » au téléphone).\n" +
          "• Négligence — une erreur interne (poste non verrouillé, pièce jointe ouverte sans réfléchir).\n\n" +
          "En GRC, votre rôle n'est pas d'arrêter techniquement l'attaque, mais d'anticiper ces scénarios (analyse de risque), de sensibiliser les équipes et de vérifier que les bonnes pratiques sont appliquées.",
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Un e-mail suspect",
        content: "Une collègue de la comptabilité vous transfère un e-mail : « URGENT — le DG demande un virement de 12 000 € aujourd'hui, voici le RIB ». L'adresse de l'expéditeur ressemble à celle du DG mais avec une lettre en trop. Que faites-vous ?",
        steps: [
          {
            id: "f1s1", prompt: "Première réaction ?",
            options: [
              { label: "Elle exécute le virement, c'est le DG", feedback: "Non — c'est exactement le piège de la « fraude au président ». On ne se fie jamais à la seule adresse e-mail.", score: 0 },
              { label: "Vérifier par un autre canal (appeler le DG) avant toute action", feedback: "Excellent réflexe : la vérification hors-bande (téléphone) déjoue la fraude au président.", score: 100 },
              { label: "Ignorer l'e-mail sans rien dire", feedback: "Mieux que payer, mais insuffisant : il faut signaler pour protéger les autres.", score: 50 },
            ],
          },
          {
            id: "f1s2", prompt: "Ensuite, côté GRC ?",
            options: [
              { label: "Signaler l'e-mail et enregistrer l'incident / la tentative", feedback: "Oui : tracer la tentative alimente le suivi et la sensibilisation.", score: 100 },
              { label: "Ne rien tracer, l'attaque a échoué", feedback: "Une tentative reste un signal utile : on la trace pour détecter les campagnes.", score: 30 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Le métier GRC au quotidien",
    description: "Ce que fait une équipe GRC, et avec quels outils dans Cap.",
    category: "Fondamentaux GRC",
    icon: "🧭",
    badge: "GRC : premiers pas",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Gouvernance, Risque, Conformité : de quoi parle-t-on ?",
        content:
          "GRC = trois métiers complémentaires :\n\n" +
          "• Gouvernance — fixer le cap : politiques, rôles, plan de travail, pilotage.\n" +
          "• Risque — identifier ce qui peut mal tourner, l'évaluer et le traiter (méthode ISO 27005).\n" +
          "• Conformité — s'assurer qu'on respecte les référentiels (ISO 27001, RGPD, NIS2…) et ses propres règles.\n\n" +
          "Au quotidien, une équipe GRC anime : le registre des risques, les politiques et leur diffusion, les contrôles terrain (rondes, audits), le plan d'actions correctives (CAPA), et la sensibilisation. Tout cela se pilote depuis le module GRC de Cap.",
      },
      {
        type: "lesson", xp: 15, title: "Vos outils dans Cap",
        content:
          "Chaque mission a son onglet dans le module GRC :\n\n" +
          "• Actifs — l'inventaire de ce qu'on protège (avec classification C/I/D).\n" +
          "• Risques — le registre ISO 27005 (inhérent → résiduel).\n" +
          "• Conformité — la posture face aux référentiels.\n" +
          "• Politiques — la diffusion et le suivi de leur application par direction.\n" +
          "• Contrôles terrain — rondes, inspections, audits avec check-lists.\n" +
          "• Plan d'actions — les actions correctives et préventives (CAPA).\n" +
          "• Joyaux — les actifs les plus critiques pour la mission.\n\n" +
          "Astuce : tout est relié. Un écart trouvé en ronde crée une action ; un risque pointe vers un actif ; une politique se suit par direction.",
      },
      {
        type: "challenge", xp: 25, title: "Défi — Explorez le registre des risques",
        content: "Ouvrez l'onglet Risques du module GRC. Repérez un risque, observez son niveau « inhérent → résiduel », et regardez la matrice Probabilité × Impact. Revenez ici et validez le défi.",
        challengeHref: "/grc?tab=risques",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Le métier GRC",
        content: "Quelques repères.",
        questions: [
          q("g1q1", "À quoi sert le registre des risques ?", ["Lister les incidents passés", "Identifier, évaluer et traiter ce qui peut mal tourner", "Stocker les mots de passe"], 1, "Le registre sert à anticiper et traiter les risques, pas seulement à constater."),
          q("g1q2", "Qui est concerné par la diffusion d'une politique ?", ["Uniquement la DSI", "Les directions et services destinataires", "Personne, c'est un document interne"], 1, "Une politique se diffuse aux directions/services et on suit son application."),
          q("g1q3", "Un « contrôle terrain » c'est…", ["Un test informatique", "Une ronde/inspection avec check-list", "Une réunion budgétaire"], 1, "Rondes, inspections, audits sur le terrain, avec une check-list."),
        ],
      },
    ],
  },
  {
    title: "Analyse de risque — méthode ISO 27005",
    description: "Évaluer et traiter un risque, du risque inhérent au risque résiduel.",
    category: "Gestion des risques",
    icon: "⚠️",
    badge: "Analyste de risque certifié",
    lessons: [
      {
        type: "lesson", xp: 25, title: "Inhérent → Traitement → Résiduel",
        content:
          "Un risque s'évalue deux fois :\n\n" +
          "1. Risque inhérent — le niveau AVANT toute mesure (« si on ne fait rien »).\n" +
          "2. On décide d'un traitement — Réduire, Accepter, Transférer (assurance/sous-traitance) ou Éviter.\n" +
          "3. Risque résiduel — le niveau APRÈS les mesures. C'est lui qui pilote la décision.\n\n" +
          "Objectif : ramener le risque résiduel à un niveau acceptable. S'il reste élevé, il faut soit renforcer les mesures, soit l'accepter formellement (avec signature et justification).",
      },
      {
        type: "lesson", xp: 20, title: "La matrice Probabilité × Impact",
        content:
          "On note la Probabilité (1 à 5) et l'Impact (1 à 5). Le niveau = Probabilité × Impact, situé sur une matrice de couleurs :\n\n" +
          "• Faible (vert) — sous surveillance.\n" +
          "• Moyen (jaune) — à traiter dans le plan.\n" +
          "• Élevé (orange) — à traiter en priorité.\n" +
          "• Critique (rouge) — action immédiate.\n\n" +
          "Exemple : un rançongiciel très probable (4) avec un impact majeur (5) donne 20 → Critique. Après sauvegardes testées et EDR, la probabilité d'impact tombe à (2×3)=6 → Moyen.",
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Le SI de paie est vulnérable",
        content: "Un audit révèle que le logiciel de paie n'a pas de plan de reprise testé et que ses sauvegardes n'ont jamais été restaurées pour vérification. Le SI de paie est critique (les agents doivent être payés). Comment traitez-vous ce risque ?",
        steps: [
          {
            id: "r1s1", prompt: "Quelle stratégie de traitement privilégier ?",
            options: [
              { label: "Accepter le risque, ça n'est jamais arrivé", feedback: "Risqué : un actif critique sans PRA testé ne s'accepte pas sans mesures ni justification formelle.", score: 10 },
              { label: "Réduire : exiger des sauvegardes testées + un PRA éprouvé", feedback: "Bonne décision : on réduit d'abord le risque sur un actif critique.", score: 100 },
              { label: "Éviter : arrêter la paie informatisée", feedback: "Irréaliste — éviter un processus vital n'est pas une option ici.", score: 0 },
            ],
          },
          {
            id: "r1s2", prompt: "Comment assurer le suivi ?",
            options: [
              { label: "Créer une action corrective (CAPA) avec responsable et échéance", feedback: "Oui : une action tracée, avec porteur et date, et une vérification d'efficacité.", score: 100 },
              { label: "Envoyer un e-mail et espérer que ce soit fait", feedback: "Insuffisant : sans action tracée ni échéance, rien ne garantit le traitement.", score: 20 },
            ],
          },
        ],
      },
      {
        type: "challenge", xp: 30, title: "Défi — Créez votre premier risque",
        content: "Dans l'onglet Risques, créez un risque : donnez-lui un intitulé, reliez-le à un actif, évaluez l'inhérent (P×I), choisissez une stratégie de traitement et évaluez le résiduel. Puis validez le défi.",
        challengeHref: "/grc?tab=risques",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — ISO 27005",
        content: "Consolidez.",
        questions: [
          q("r1q1", "Le risque qui pilote la décision est le risque…", ["Inhérent", "Résiduel", "Maximal"], 1, "C'est le résiduel (après traitement) qui dit si le niveau est acceptable."),
          q("r1q2", "« Transférer » un risque, c'est…", ["L'ignorer", "Le confier à un tiers (assurance, sous-traitant)", "Le supprimer"], 1, "Transférer = faire porter tout ou partie du risque par un tiers."),
          q("r1q3", "Un risque résiduel reste Critique. Que faire ?", ["Le classer sans suite", "Renforcer les mesures ou l'accepter formellement", "Le supprimer du registre"], 1, "On renforce, ou on l'accepte formellement (signature + justification)."),
        ],
      },
    ],
  },
  {
    title: "Décider & prioriser",
    description: "Le cœur du métier : faire les bons choix, au bon moment.",
    category: "Décision & pilotage",
    icon: "🧠",
    badge: "Décideur GRC",
    lessons: [
      {
        type: "case", xp: 35, title: "Étude de cas — Une direction refuse d'appliquer une politique",
        content: "Vous avez diffusé la politique de mots de passe (MFA obligatoire). La direction financière répond qu'elle « n'a pas le temps » et refuse de l'appliquer. Comment réagissez-vous ?",
        steps: [
          {
            id: "d1s1", prompt: "Votre posture ?",
            options: [
              { label: "Laisser tomber, on ne peut pas forcer une direction", feedback: "Non : renoncer laisse un trou de sécurité et crée un précédent.", score: 0 },
              { label: "Comprendre le blocage, rappeler l'enjeu/risque et proposer un accompagnement", feedback: "Excellent : on traite l'humain d'abord — écoute, pédagogie, aide concrète.", score: 100 },
              { label: "Menacer immédiatement de sanctions", feedback: "Trop brutal en premier recours : on commence par convaincre et accompagner.", score: 30 },
            ],
          },
          {
            id: "d1s2", prompt: "Si le refus persiste malgré l'accompagnement ?",
            options: [
              { label: "Enregistrer une non-conformité et escalader à la direction générale", feedback: "Oui : on trace l'écart (non-conformité) et on escalade au bon niveau.", score: 100 },
              { label: "Continuer à négocier indéfiniment", feedback: "À un moment, l'écart doit être formalisé et arbitré plus haut.", score: 30 },
            ],
          },
        ],
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Trois urgences en même temps",
        content: "Lundi matin : (A) un poste peut-être infecté par un rançongiciel, (B) une revue de politique en retard, (C) un agent qui a laissé son poste déverrouillé. Par quoi commencez-vous ?",
        steps: [
          {
            id: "d2s1", prompt: "Votre priorité n°1 ?",
            options: [
              { label: "A — le rançongiciel possible", feedback: "Oui : priorité au risque de plus fort impact et le plus urgent (confiner le poste).", score: 100 },
              { label: "B — la revue de politique", feedback: "Important mais pas urgent : ça ne s'aggrave pas dans l'heure.", score: 20 },
              { label: "C — le poste déverrouillé", feedback: "À corriger, mais l'impact immédiat est faible comparé à un rançongiciel.", score: 40 },
            ],
          },
          {
            id: "d2s2", prompt: "Le principe de priorisation ?",
            options: [
              { label: "Impact × urgence : d'abord ce qui fait le plus de dégâts, le plus vite", feedback: "C'est la règle : on priorise par gravité et cinétique, pas par ordre d'arrivée.", score: 100 },
              { label: "Premier arrivé, premier traité", feedback: "Non : l'ordre d'arrivée n'a rien à voir avec la criticité.", score: 10 },
            ],
          },
        ],
      },
      {
        type: "lesson", xp: 20, title: "Construire un plan d'action (CAPA)",
        content:
          "Une bonne action corrective/préventive (CAPA) tient en 5 ingrédients :\n\n" +
          "1. Un intitulé clair (quoi corriger).\n" +
          "2. Un responsable unique (qui).\n" +
          "3. Une échéance réaliste (quand).\n" +
          "4. Une priorité (basse → critique).\n" +
          "5. Une vérification d'efficacité (comment on sait que c'est réglé).\n\n" +
          "Sans responsable ni échéance, une action n'est qu'un vœu. Dans Cap, chaque écart de contrôle terrain peut générer une CAPA en un clic, et le plan d'actions détecte les retards.",
      },
      {
        type: "challenge", xp: 30, title: "Défi — Planifiez un contrôle terrain",
        content: "Dans l'onglet Contrôles terrain, créez un contrôle (ronde ou inspection), ajoutez 2-3 points de check-list, et enregistrez-le. Bonus : marquez un point en « Écart » et générez une action corrective. Puis validez le défi.",
        challengeHref: "/grc?tab=controles",
      },
    ],
  },
];
