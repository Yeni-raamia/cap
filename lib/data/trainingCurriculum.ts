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
      {
        type: "lesson", xp: 25, title: "Le processus ISO 27005 de bout en bout",
        content:
          "L'analyse de risque n'est pas un acte isolé : c'est un cycle qui tourne en continu.\n\n" +
          "1. Établir le contexte — que protège-t-on ? Quels critères (échelles P et I, seuil d'acceptabilité) ?\n" +
          "2. Identifier — repérer les risques (actifs → menaces → vulnérabilités → scénarios).\n" +
          "3. Analyser — estimer la probabilité et l'impact (risque inhérent).\n" +
          "4. Évaluer — comparer au seuil : ce risque est-il acceptable en l'état ?\n" +
          "5. Traiter — Réduire / Accepter / Transférer / Éviter → risque résiduel.\n" +
          "6. Accepter — valider formellement le risque résiduel qui subsiste.\n" +
          "7. Communiquer & surveiller — informer les parties prenantes, puis réviser régulièrement (les menaces évoluent).\n\n" +
          "Retenez l'esprit : on n'élimine pas tous les risques (impossible et ruineux), on les ramène à un niveau acceptable, en connaissance de cause et de façon tracée.",
      },
      {
        type: "lesson", xp: 25, title: "Bâtir un scénario de risque : menace × vulnérabilité × actif",
        content:
          "Un risque n'est pas une peur vague (« et si on se faisait pirater ? »). C'est un SCÉNARIO concret, qui combine trois éléments :\n\n" +
          "• Un actif — ce qui a de la valeur (une base de données, un service, un savoir-faire).\n" +
          "• Une menace — une source qui pourrait lui nuire (attaquant, panne, erreur humaine, catastrophe).\n" +
          "• Une vulnérabilité — une faiblesse que la menace peut exploiter (mot de passe faible, absence de sauvegarde, porte non verrouillée).\n\n" +
          "La formule mentale : « [Menace] exploite [Vulnérabilité] sur [Actif], ce qui entraîne [Impact] ».\n\n" +
          "Exemple : « Un rançongiciel (menace) exploite l'absence de sauvegardes testées (vulnérabilité) sur le SI de paie (actif), ce qui entraîne l'impossibilité de payer les agents (impact) ». Un bon scénario est précis : il rend le risque évaluable et traitable.",
      },
      {
        type: "lesson", xp: 20, title: "Définir ses échelles de probabilité et d'impact",
        content:
          "Noter « Probabilité 3 » ou « Impact 4 » n'a de sens que si tout le monde met la même chose derrière. D'où l'importance de définir des échelles claires AVANT d'évaluer.\n\n" +
          "Exemple d'échelle de Probabilité (1→5) :\n" +
          "1 Rare (peu probable sur plusieurs années) · 2 Peu probable · 3 Possible (peut arriver dans l'année) · 4 Probable · 5 Quasi certain (déjà observé / fréquent).\n\n" +
          "Exemple d'échelle d'Impact (1→5) :\n" +
          "1 Négligeable · 2 Mineur · 3 Modéré (perturbation notable) · 4 Majeur (atteinte sérieuse à l'activité) · 5 Catastrophique (survie de l'organisation en jeu).\n\n" +
          "L'impact peut être financier, opérationnel, juridique/RGPD ou réputationnel — on retient le plus élevé. Des échelles écrites rendent les évaluations comparables et défendables devant la direction.",
      },
      {
        type: "lesson", xp: 25, title: "Choisir la bonne stratégie de traitement",
        content:
          "Quatre stratégies, à choisir selon le couple probabilité/impact et le coût :\n\n" +
          "• Réduire (le plus courant) — mettre des mesures qui baissent la probabilité et/ou l'impact (sauvegardes, MFA, sensibilisation). Pour les risques élevés/critiques.\n" +
          "• Transférer — faire porter le risque par un tiers : assurance cyber, sous-traitance avec engagement contractuel. Utile quand l'impact est fort mais qu'on ne peut pas tout réduire soi-même.\n" +
          "• Éviter — supprimer la source du risque (arrêter un service trop dangereux, ne pas collecter une donnée sensible). Quand le jeu n'en vaut pas la chandelle.\n" +
          "• Accepter — vivre avec, sans mesure supplémentaire. Réservé aux risques faibles, OU aux risques résiduels jugés tolérables après traitement (avec acceptation formelle).\n\n" +
          "Piège classique : « accepter » par défaut, faute d'agir. L'acceptation doit être un CHOIX conscient et justifié, pas une négligence.",
      },
      {
        type: "lesson", xp: 20, title: "Appétit du risque & acceptation formelle",
        content:
          "L'appétit (ou tolérance) au risque, c'est le niveau de risque que l'organisation accepte de courir pour atteindre ses objectifs. Il est fixé par la direction : c'est elle qui arbitre, pas l'équipe GRC seule.\n\n" +
          "Concrètement, on définit un SEUIL : par exemple « tout risque résiduel Élevé ou Critique doit être traité ; Faible et Moyen peuvent être acceptés ».\n\n" +
          "Quand un risque résiduel dépasse ce que l'on peut/veut réduire, on procède à une ACCEPTATION FORMELLE : un responsable (souvent la direction) signe, on note la justification et une date de revue. Cela transforme un risque « subi » en risque « assumé en connaissance de cause » — et protège l'équipe GRC : la décision est tracée et endossée au bon niveau. Dans Cap, chaque risque peut être accepté formellement (signataire, échéance, justification).",
      },
      {
        type: "case", xp: 40, title: "Étude de cas — Construire un risque de A à Z",
        content: "La direction s'inquiète de la messagerie, très utilisée et cible d'hameçonnage. On vous demande d'en faire une analyse de risque complète. Suivez la démarche.",
        steps: [
          {
            id: "r2s1", prompt: "Étape 1 — Formuler le scénario. Lequel est le mieux construit ?",
            options: [
              { label: "« La messagerie n'est pas sûre »", feedback: "Trop vague : ni menace, ni vulnérabilité, ni impact identifiés — inévaluable.", score: 20 },
              { label: "« Un attaquant (menace) exploite la crédulité/absence de MFA (vulnérabilité) sur la messagerie (actif) → compromission de comptes et fuite d'e-mails (impact) »", feedback: "Excellent : actif, menace, vulnérabilité et impact sont explicites → le risque devient évaluable.", score: 100 },
              { label: "« Il faut acheter un nouvel antivirus »", feedback: "C'est une solution, pas un risque : on n'a pas encore décrit ni évalué le risque.", score: 10 },
            ],
          },
          {
            id: "r2s2", prompt: "Étape 2 — Évaluer l'inhérent. L'hameçonnage est fréquent et la MFA n'est pas déployée ; une compromission aurait un impact sérieux. Quel niveau inhérent ?",
            options: [
              { label: "Probabilité élevée × Impact majeur → Élevé/Critique", feedback: "Cohérent : menace fréquente + vulnérabilité présente + impact sérieux = risque inhérent élevé.", score: 100 },
              { label: "Faible, on n'a jamais eu de problème", feedback: "L'absence d'incident passé ne garantit rien, surtout avec une vulnérabilité connue (pas de MFA).", score: 20 },
            ],
          },
          {
            id: "r2s3", prompt: "Étape 3 — Traiter puis conclure.",
            options: [
              { label: "Réduire : déployer la MFA + sensibiliser, réévaluer le résiduel, et accepter formellement ce qui reste", feedback: "Parfait : on réduit d'abord (MFA + sensibilisation), on recalcule le résiduel, et on fait acter formellement le risque restant.", score: 100 },
              { label: "Accepter le risque tel quel pour aller vite", feedback: "Accepter un risque élevé sans le réduire ni le justifier formellement, c'est exposer l'organisation.", score: 10 },
            ],
          },
        ],
      },
      {
        type: "quiz", xp: 30, title: "Quiz — ISO 27005 approfondi",
        content: "Validez votre montée en compétence.",
        questions: [
          q("r2q1", "Un bon scénario de risque combine…", ["Un budget et une échéance", "Un actif, une menace, une vulnérabilité et un impact", "Un coupable et une sanction"], 1, "Actif + menace + vulnérabilité + impact = un risque évaluable."),
          q("r2q2", "À quoi sert de définir des échelles de probabilité/impact ?", ["À faire joli sur le rapport", "À rendre les évaluations comparables et défendables", "À remplacer la matrice"], 1, "Des échelles écrites garantissent que chacun évalue de la même façon."),
          q("r2q3", "Qui fixe l'appétit au risque de l'organisation ?", ["L'équipe GRC seule", "La direction", "Le prestataire informatique"], 1, "L'appétit au risque est un arbitrage de la direction."),
          q("r2q4", "« Transférer » un risque est pertinent quand…", ["Le risque est nul", "L'impact est fort et qu'on ne peut pas tout réduire soi-même (ex. assurance)", "On veut l'oublier"], 1, "Le transfert (assurance, sous-traitance) fait porter le risque par un tiers."),
          q("r2q5", "L'acceptation formelle d'un risque résiduel sert surtout à…", ["Gagner du temps", "Décider en connaissance de cause et tracer/endosser la décision au bon niveau", "Éviter de traiter le risque"], 1, "Elle transforme un risque subi en risque assumé, tracé et endossé."),
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
  {
    title: "Conformité & politiques",
    description: "Les référentiels, et comment faire vivre une politique de sécurité.",
    category: "Conformité & politiques",
    icon: "📋",
    badge: "Référent conformité",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Les grands référentiels, sans jargon",
        content:
          "Un référentiel, c'est un catalogue de bonnes pratiques reconnu. Les principaux :\n\n" +
          "• ISO/IEC 27001 — la norme internationale de management de la sécurité (le « permis de conduire » de la sécurité).\n" +
          "• RGPD — la loi européenne sur les données personnelles (consentement, droits des personnes, sécurité des données).\n" +
          "• NIS2 — la directive européenne qui impose un socle de cybersécurité aux entités essentielles/importantes.\n" +
          "• CIS Controls — une liste très concrète de 18 mesures prioritaires, idéale pour démarrer.\n\n" +
          "On ne les apprend pas par cœur : on s'en sert comme d'une check-list pour vérifier qu'on ne rate rien. Dans Cap, l'onglet Conformité mesure votre posture face à chacun.",
      },
      {
        type: "lesson", xp: 20, title: "Le cycle de vie d'une politique",
        content:
          "Une politique de sécurité (mots de passe, usage du poste, télétravail…) suit un cycle :\n\n" +
          "1. Rédaction — un document clair, court, applicable.\n" +
          "2. Validation — par la direction (elle porte l'autorité).\n" +
          "3. Diffusion — à chaque direction/service concerné.\n" +
          "4. Suivi de l'application — Diffusée → Consultée → Comprise → Appliquée.\n" +
          "5. Revue — on la met à jour régulièrement.\n\n" +
          "Le piège du débutant : croire qu'une politique diffusée est une politique appliquée. Non ! Votre travail commence à la diffusion : vérifier qu'elle est comprise et réellement mise en œuvre.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Conformité & politiques",
        content: "Testez vos repères.",
        questions: [
          q("c1q1", "À quoi sert le RGPD ?", ["Chiffrer les disques durs", "Protéger les données personnelles et les droits des personnes", "Faire des sauvegardes"], 1, "Le RGPD encadre le traitement des données personnelles et les droits des personnes."),
          q("c1q2", "Une politique « diffusée » est-elle forcément appliquée ?", ["Oui, la diffusion suffit", "Non, il faut vérifier la compréhension et l'application", "Seulement si elle est signée"], 1, "La diffusion n'est que le début : on suit ensuite la compréhension et l'application."),
          q("c1q3", "ISO 27001, c'est…", ["Un antivirus", "Une norme de management de la sécurité de l'information", "Un mot de passe standard"], 1, "C'est la norme internationale de management de la sécurité (SMSI)."),
        ],
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Une politique reste lettre morte",
        content: "Trois mois après avoir diffusé la politique de télétravail, vous constatez que la moitié des services ne l'appliquent pas : VPN non utilisé, postes personnels employés pour le travail. Comment redressez-vous la situation ?",
        steps: [
          {
            id: "c1s1", prompt: "Par quoi commencez-vous ?",
            options: [
              { label: "Comprendre pourquoi : interroger les services sur leurs blocages", feedback: "Bon réflexe : on diagnostique la cause (manque d'outils ? d'info ? de temps ?) avant d'agir.", score: 100 },
              { label: "Envoyer un rappel menaçant à tout le monde", feedback: "Prématuré : sans comprendre les blocages, la menace braque et ne règle rien.", score: 20 },
              { label: "Abandonner la politique, elle est trop ambitieuse", feedback: "Non : renoncer laisse un risque ouvert et décrédibilise la démarche.", score: 0 },
            ],
          },
          {
            id: "c1s2", prompt: "Le diagnostic montre un manque d'accompagnement. Que faites-vous ?",
            options: [
              { label: "Une action de sensibilisation + un guide simple, et suivre l'application par service", feedback: "Excellent : on lève le blocage (pédagogie + outillage) et on mesure les progrès dans Cap.", score: 100 },
              { label: "Rien, ils finiront bien par s'y mettre", feedback: "L'attentisme laisse le risque s'installer et le comportement se normaliser.", score: 10 },
            ],
          },
        ],
      },
      {
        type: "challenge", xp: 25, title: "Défi — Explorez la conformité",
        content: "Ouvrez l'onglet Conformité : parcourez les référentiels (ISO 27001, NIST, CIS, RGPD/NIS2) et observez comment on évalue une mesure (applicabilité, statut, maturité). Puis, dans l'onglet Politiques, ouvrez le « Suivi » d'une politique pour voir son avancement par service. Validez ensuite le défi.",
        challengeHref: "/grc?tab=conformite",
      },
    ],
  },
  {
    title: "Contrôles terrain & audit",
    description: "Aller voir sur le terrain, relever les écarts, faire corriger.",
    category: "Contrôles & audit",
    icon: "🔍",
    badge: "Auditeur terrain",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Pourquoi aller sur le terrain ?",
        content:
          "La sécurité sur le papier ne suffit pas : il faut vérifier la réalité. C'est le rôle des contrôles terrain :\n\n" +
          "• Ronde de sécurité — un tour des locaux (portes, badges, postes verrouillés, documents sensibles).\n" +
          "• Inspection physique — un point précis (salle serveurs, armoires, extincteurs).\n" +
          "• Audit interne — une revue plus formelle d'un processus (gestion des accès, sauvegardes).\n" +
          "• Entretien / test — sensibilisation, exercice (faux phishing, tailgating).\n\n" +
          "Chaque contrôle produit des constats : Conforme, Non applicable, ou Écart. Un écart, c'est un point bloquant à corriger.",
      },
      {
        type: "lesson", xp: 20, title: "Ce qui fait une bonne check-list",
        content:
          "Une check-list utile est :\n\n" +
          "• Concrète — chaque point est observable (« l'extincteur est-il en cours de validité ? »), pas vague.\n" +
          "• Courte — on privilégie l'essentiel, sinon personne ne la remplit.\n" +
          "• Traçable — on note le constat et, si écart, une preuve (photo, note).\n\n" +
          "Dans Cap, chaque point de check-list porte un résultat, et le contrôle affiche une barre d'avancement + un taux de conformité. Les écarts deviennent des « points bloquants » qui alimentent le plan d'actions.",
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Un écart en ronde",
        content: "Lors d'une ronde, vous trouvez la porte de la salle serveurs ouverte et non surveillée, alors qu'elle doit rester verrouillée. Que faites-vous ?",
        steps: [
          {
            id: "a1s1", prompt: "Sur le moment ?",
            options: [
              { label: "Refermer/sécuriser immédiatement et noter le constat comme « Écart »", feedback: "Oui : on traite l'urgence physique puis on trace l'écart pour le suivi.", score: 100 },
              { label: "Passer son chemin, ce n'est pas votre service", feedback: "Non : un accès non contrôlé à la salle serveurs est un risque majeur, on agit.", score: 0 },
              { label: "Prendre une photo pour se moquer en réunion", feedback: "Non : on documente pour corriger, pas pour blâmer. La posture GRC est constructive.", score: 10 },
            ],
          },
          {
            id: "a1s2", prompt: "Pour la suite ?",
            options: [
              { label: "Générer une action corrective (CAPA) avec responsable et échéance, et prévoir une contre-visite", feedback: "Parfait : l'écart devient une action tracée, et la contre-visite vérifie l'efficacité.", score: 100 },
              { label: "Se contenter d'en parler oralement au responsable", feedback: "Sans action tracée ni échéance, rien ne garantit la correction durable.", score: 30 },
            ],
          },
        ],
      },
      {
        type: "challenge", xp: 25, title: "Défi — Faites vivre un contrôle",
        content: "Dans l'onglet Contrôles terrain, ouvrez un contrôle existant (ou créez-en un). Faites avancer son état avec le bouton d'action rapide, ajoutez une « action de suivi » dans son fil de vie, et observez la barre de progression. Puis validez le défi.",
        challengeHref: "/grc?tab=controles",
      },
    ],
  },
  {
    title: "Incidents & non-conformités",
    description: "Réagir vite et bien à un incident, traiter un écart aux règles.",
    category: "Incidents & non-conformités",
    icon: "🚨",
    badge: "Gestion des incidents",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Événement, incident : de quoi parle-t-on ?",
        content:
          "Il faut distinguer trois niveaux :\n\n" +
          "• Événement — un fait observable (une tentative de connexion échouée). La plupart sont sans gravité.\n" +
          "• Incident de sécurité — un événement (ou une série) qui porte atteinte à la confidentialité, l'intégrité ou la disponibilité (un poste chiffré par un rançongiciel, une fuite de données).\n" +
          "• Crise — un incident majeur qui dépasse le fonctionnement normal et mobilise la direction.\n\n" +
          "Votre rôle GRC n'est pas de « réparer » techniquement, mais d'organiser la réaction : qualifier, coordonner, tracer, et surtout tirer les leçons. Un incident bien géré renforce l'organisation ; un incident caché l'affaiblit.",
      },
      {
        type: "lesson", xp: 25, title: "Les 5 réflexes face à un incident",
        content:
          "Un cycle de gestion d'incident simple (inspiré d'ISO 27035) :\n\n" +
          "1. Détecter & signaler — repérer le fait et le remonter vite (mieux vaut une fausse alerte qu'un silence).\n" +
          "2. Qualifier — est-ce vraiment un incident ? Quelle gravité, quel périmètre ?\n" +
          "3. Confiner — limiter la propagation (isoler le poste, couper un accès) AVANT d'enquêter.\n" +
          "4. Éradiquer & rétablir — supprimer la cause, restaurer depuis des sauvegardes saines, revenir à la normale.\n" +
          "5. Capitaliser — retour d'expérience (REX) : que corriger pour que ça ne se reproduise pas ? → un plan d'actions.\n\n" +
          "Règle d'or du débutant : on confine d'abord, on enquête ensuite. Chercher « qui a fait ça » pendant qu'un rançongiciel se propage, c'est perdre un temps précieux.",
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Un rançongiciel se propage",
        content: "Un agent signale que son écran affiche une demande de rançon et que des fichiers partagés deviennent illisibles. D'autres postes semblent touchés. Vous êtes la première personne GRC informée. Quelle est votre priorité ?",
        steps: [
          {
            id: "i1s1", prompt: "Premier geste ?",
            options: [
              { label: "Faire isoler du réseau les postes concernés (débrancher / couper le Wi-Fi)", feedback: "Oui : on confine pour stopper la propagation avant tout le reste.", score: 100 },
              { label: "Lancer une enquête pour trouver le coupable", feedback: "Non : pendant l'enquête, le rançongiciel continue de chiffrer. On confine d'abord.", score: 10 },
              { label: "Payer la rançon pour tout débloquer vite", feedback: "Non : payer ne garantit rien, finance les attaquants, et n'empêche pas la récidive.", score: 0 },
            ],
          },
          {
            id: "i1s2", prompt: "Ensuite, côté GRC ?",
            options: [
              { label: "Ouvrir une fiche incident, alerter les bonnes personnes, tracer les actions et préparer le REX", feedback: "Parfait : coordination, traçabilité, puis retour d'expérience pour ne pas revivre ça.", score: 100 },
              { label: "Attendre que la technique règle tout et ne rien documenter", feedback: "Sans traçabilité ni REX, on perd la mémoire de l'incident et on ne progresse pas.", score: 20 },
            ],
          },
        ],
      },
      {
        type: "lesson", xp: 20, title: "Incident ou non-conformité ?",
        content:
          "Deux notions proches mais différentes :\n\n" +
          "• Un incident est un ÉVÉNEMENT qui a causé (ou failli causer) un dommage.\n" +
          "• Une non-conformité est un ÉCART à une règle : une politique, une procédure, un référentiel qui n'est pas respecté (ex. des comptes partagés alors que c'est interdit).\n\n" +
          "Une non-conformité peut exister sans incident (le risque est latent) — et c'est justement l'intérêt de la détecter tôt, avant qu'elle ne provoque un incident. On la traite en la traçant, en décidant d'une correction (plan d'actions), et en vérifiant qu'elle est levée. Dans Cap, les non-conformités ont leur propre suivi.",
      },
      {
        type: "case", xp: 35, title: "Étude de cas — Une non-conformité qui revient",
        content: "Pour la troisième fois en six mois, un audit relève que des comptes à privilèges sont partagés entre plusieurs administrateurs, contrairement à la politique. Le correctif est appliqué à chaque fois… puis l'écart réapparaît. Que faites-vous ?",
        steps: [
          {
            id: "i2s1", prompt: "Votre analyse ?",
            options: [
              { label: "Chercher la cause racine : pourquoi l'écart revient-il ? (outil manquant, habitude, manque de comptes nominatifs)", feedback: "Oui : une non-conformité récurrente cache une cause profonde ; la corriger en surface ne suffit pas.", score: 100 },
              { label: "Re-corriger une fois de plus, comme d'habitude", feedback: "Corriger le symptôme sans la cause garantit que l'écart reviendra.", score: 20 },
              { label: "Sanctionner immédiatement les administrateurs", feedback: "La sanction seule, sans traiter la cause (ex. absence de comptes nominatifs), ne règle rien durablement.", score: 30 },
            ],
          },
          {
            id: "i2s2", prompt: "La bonne réponse ?",
            options: [
              { label: "Une action corrective ciblant la cause racine (créer des comptes nominatifs + traçabilité) et un contrôle de suivi", feedback: "Excellent : on traite la cause et on vérifie dans la durée que l'écart ne revient plus.", score: 100 },
              { label: "Fermer la non-conformité en espérant que ça tienne", feedback: "Sans action sur la cause ni suivi, la récurrence est quasi certaine.", score: 20 },
            ],
          },
        ],
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Incidents & non-conformités",
        content: "Consolidez vos réflexes.",
        questions: [
          q("i1q1", "Face à un rançongiciel qui se propage, quel est le premier geste ?", ["Enquêter sur le coupable", "Confiner : isoler les postes du réseau", "Payer la rançon"], 1, "On confine d'abord pour stopper la propagation, on enquête ensuite."),
          q("i1q2", "Une non-conformité, c'est…", ["Un incident avec dommage", "Un écart à une règle/politique/référentiel", "Une panne matérielle"], 1, "C'est un écart à une règle — il peut exister sans incident."),
          q("i1q3", "Une non-conformité revient sans cesse malgré les correctifs. Que faut-il traiter ?", ["Le symptôme, encore une fois", "La cause racine", "Rien, c'est inévitable"], 1, "La récurrence signale une cause racine non traitée."),
          q("i1q4", "À quoi sert le retour d'expérience (REX) après un incident ?", ["À désigner un coupable", "À corriger durablement pour éviter la récidive", "À clore le dossier au plus vite"], 1, "Le REX transforme l'incident en amélioration : on tire les leçons et on agit."),
        ],
      },
      {
        type: "challenge", xp: 25, title: "Défi — Le suivi des non-conformités",
        content: "Ouvrez le module Non-conformités. Observez comment une non-conformité est décrite (service concerné, gravité, politique/règle violée, statut) et comment on trace la décision. Repérez le lien vers un éventuel plan d'action. Puis revenez valider le défi.",
        challengeHref: "/non-conformites",
      },
    ],
  },
];
