/* ==================================================================
 *  lib/data/auditCurriculum.ts — Curriculum de l'Académie Audit.
 *  Accent sur la MÉTHODE (ISO 19011), les PRINCIPES et des CAS RÉELS.
 *  Même structure que le curriculum GRC (CourseSeed), filière "audit".
 * ================================================================== */
import type { CourseSeed } from "./trainingCurriculum";
import type { QuizQuestion } from "../domain";

const q = (id: string, prompt: string, options: string[], correct: number, explanation: string): QuizQuestion => ({ id, prompt, options, correct, explanation });

export const AUDIT_CURRICULUM: CourseSeed[] = [
  {
    title: "Fondamentaux de l'audit de sécurité",
    description: "Le vocabulaire, les principes et les types d'audit (ISO 19011).",
    category: "Méthode d'audit",
    icon: "🔎",
    badge: "Principes d'audit acquis",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Qu'est-ce qu'un audit ?",
        content:
          "Un audit est un processus **méthodique, indépendant et documenté** permettant d'obtenir des **preuves** et de les évaluer de manière **objective** pour déterminer dans quelle mesure des **critères** sont satisfaits (ISO 19011).\n\n" +
          "Trois mots-clés à retenir :\n" +
          "• Critères d'audit — le référentiel auquel on compare (politique interne, CIS Benchmark, ANSSI, ISO 27002…).\n" +
          "• Preuves d'audit — les faits vérifiables recueillis (configuration observée, journal, entretien, document).\n" +
          "• Constats d'audit — le résultat de la comparaison preuve ↔ critère : conforme, ou écart (non-conformité).\n\n" +
          "Un audit n'est PAS un contrôle policier ni une chasse aux coupables : c'est une démarche d'amélioration, factuelle et bienveillante.",
      },
      {
        type: "lesson", xp: 20, title: "Les 7 principes de l'audit (ISO 19011)",
        content:
          "La crédibilité d'un audit repose sur 7 principes :\n\n" +
          "1. **Intégrité** — le professionnalisme, l'honnêteté.\n" +
          "2. **Présentation impartiale** — rapporter fidèlement, y compris les désaccords.\n" +
          "3. **Conscience professionnelle** — diligence et jugement.\n" +
          "4. **Confidentialité** — protéger les informations recueillies.\n" +
          "5. **Indépendance** — l'auditeur n'audite pas son propre travail ; il reste impartial.\n" +
          "6. **Approche fondée sur les preuves** — des conclusions vérifiables, jamais des impressions.\n" +
          "7. **Approche par les risques** — concentrer l'effort là où les enjeux sont les plus forts.\n\n" +
          "L'**indépendance** et l'**approche fondée sur les preuves** sont les deux garde-fous les plus importants contre un audit contestable.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Vocabulaire & principes",
        content: "Vérifiez vos bases.",
        questions: [
          q("a1q1", "Le CIS Benchmark utilisé pour évaluer un serveur est un…", ["Constat", "Critère d'audit", "Preuve"], 1, "Le référentiel auquel on compare est un critère d'audit."),
          q("a1q2", "Un auditeur audite le pare-feu qu'il a lui-même configuré. Quel principe est enfreint ?", ["Indépendance", "Confidentialité", "Intégrité"], 0, "On n'audite pas son propre travail : c'est un défaut d'indépendance/impartialité."),
          q("a1q3", "« Je pense que c'est mal configuré » sans l'avoir vérifié, c'est…", ["Une preuve", "Un constat valable", "Une impression, non recevable"], 2, "Sans preuve vérifiable, ce n'est pas un constat d'audit recevable."),
        ],
      },
      {
        type: "lesson", xp: 20, title: "Types d'audit & indépendance",
        content:
          "On distingue :\n" +
          "• **Audit interne (1ʳᵉ partie)** — mené par l'organisation sur elle-même.\n" +
          "• **Audit de seconde partie** — mené sur un fournisseur/prestataire.\n" +
          "• **Audit de tierce partie** — mené par un organisme externe (certification ISO 27001, PASSI…).\n\n" +
          "Côté technique, on parle aussi d'audit de **configuration** (durcissement), d'**architecture**, de **code**, ou de **test d'intrusion** (pentest). L'audit de configuration — au cœur de ce module — compare l'état réel d'un système à un socle de bonnes pratiques.\n\n" +
          "Quel que soit le type, l'auditeur doit rester **indépendant** du périmètre audité pour garantir l'objectivité.",
      },
    ],
  },
  {
    title: "Conduire un audit (ISO 19011)",
    description: "Le déroulement d'un audit, de la préparation au rapport et au suivi.",
    category: "Méthode d'audit",
    icon: "🧭",
    badge: "Conduite d'audit maîtrisée",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Préparer l'audit",
        content:
          "Un bon audit se joue en grande partie AVANT le terrain :\n\n" +
          "• Définir le **périmètre** et les **objectifs** (que veut-on vérifier ?).\n" +
          "• Choisir les **critères** (grille : CIS, ANSSI, politique interne).\n" +
          "• Établir un **plan d'audit** : dates, systèmes cibles, personnes à rencontrer.\n" +
          "• Prévoir l'**échantillonnage** : on ne peut pas tout vérifier, on sélectionne un échantillon représentatif.\n" +
          "• Préparer les **preuves attendues** pour chaque point de contrôle.\n\n" +
          "Dans Cap, la **grille d'audit** matérialise les critères et les preuves attendues ; le **programme d'audit** planifie le périmètre et les priorités par le risque.",
      },
      {
        type: "lesson", xp: 20, title: "Collecter les preuves",
        content:
          "Sur le terrain, l'auditeur recueille des preuves par plusieurs moyens complémentaires :\n\n" +
          "• **Observation directe** — regarder la configuration réelle (ex. l'état d'une GPO, un fichier de conf).\n" +
          "• **Entretien** — interroger un administrateur (à recouper avec une preuve technique).\n" +
          "• **Revue documentaire** — procédures, schémas, journaux, rapports.\n" +
          "• **Test/rejeu** — reproduire un contrôle (ex. tenter une restauration de sauvegarde).\n\n" +
          "Règle d'or : **une déclaration en entretien n'est pas une preuve** tant qu'elle n'est pas corroborée par un fait vérifiable. On note la source de chaque preuve (référence, capture, date).",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Déroulement",
        content: "Le fil de l'audit.",
        questions: [
          q("a2q1", "Pourquoi échantillonne-t-on ?", ["Par manque de sérieux", "Parce qu'on ne peut pas tout vérifier ; on prend un échantillon représentatif", "Pour aller plus vite au détriment de la qualité"], 1, "L'échantillonnage représentatif permet de conclure sans tout examiner."),
          q("a2q2", "Un admin affirme que les sauvegardes sont testées. Que fait l'auditeur ?", ["Il le note comme conforme", "Il demande une preuve (PV de test, journal de restauration)", "Il ignore le point"], 1, "La déclaration doit être corroborée par une preuve vérifiable."),
          q("a2q3", "À quoi sert la réunion de clôture ?", ["À sanctionner", "À présenter les constats et s'assurer qu'ils sont compris et factuels", "À signer le contrat"], 1, "La clôture restitue les constats et vérifie leur bonne compréhension."),
        ],
      },
      {
        type: "lesson", xp: 20, title: "Rapport & suivi des recommandations",
        content:
          "L'audit ne s'arrête pas au constat :\n\n" +
          "• Le **rapport** présente le périmètre, la méthode, les constats (avec preuves) et des **recommandations** priorisées.\n" +
          "• Chaque écart devrait devenir une **action corrective** avec un responsable et une échéance.\n" +
          "• Le **suivi des recommandations** (ISO 19011 / IIA 2500) vérifie qu'elles sont réellement mises en œuvre — c'est là que l'audit crée de la valeur.\n\n" +
          "Dans Cap : le **rapport PDF** de l'audit, la génération d'**actions correctives (CAPA)** depuis un constat, l'onglet **Constats & recommandations** pour le suivi, et la **tendance de ré-audit** pour mesurer le progrès.",
      },
      {
        type: "challenge", xp: 30, title: "Défi — Lance ton premier audit",
        content: "Mets la méthode en pratique : ouvre l'onglet Audits, crée un audit (depuis une grille ou un questionnaire manuel), réponds aux points de contrôle et observe le score par domaine.",
        challengeHref: "/audit?tab=audits",
      },
    ],
  },
  {
    title: "Constats, preuves & cas réels",
    description: "Formuler des constats solides et s'entraîner sur des situations réelles.",
    category: "Pratique de l'audit",
    icon: "🧪",
    badge: "Auditeur terrain confirmé",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Bien formuler un constat",
        content:
          "Un constat d'audit solide tient en trois éléments :\n\n" +
          "1. **Le critère** — ce qui était attendu (ex. « les sauvegardes critiques doivent être immuables »).\n" +
          "2. **La preuve** — ce qui a été observé (ex. « aucune copie immuable/hors-ligne constatée le 12/03 »).\n" +
          "3. **L'écart** — la différence entre les deux, et son impact/risque.\n\n" +
          "On gradue souvent : **non-conformité majeure** (risque fort, contrôle absent), **mineure** (défaut ponctuel), **observation/piste de progrès**. Un bon constat est **factuel, reproductible et actionnable** — il mène naturellement à une recommandation.",
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Audit des sauvegardes",
        content: "Vous auditez le serveur SRV-BACKUP-01. L'administrateur affirme : « tout est sauvegardé tous les soirs, on n'a jamais eu de souci ». Comment menez-vous le contrôle ?",
        steps: [
          {
            id: "ac1s1", prompt: "Que faites-vous de l'affirmation de l'administrateur ?",
            options: [
              { label: "Je la note comme conforme, il connaît son système", feedback: "Non — une déclaration n'est pas une preuve. Il faut vérifier.", score: 0 },
              { label: "Je demande à voir la configuration, les rapports de sauvegarde et un test de restauration", feedback: "Exactement : on corrobore par des preuves vérifiables.", score: 100 },
              { label: "Je fais confiance mais je le marque en observation", feedback: "Insuffisant : sans preuve, on ne peut pas conclure à la conformité.", score: 30 },
            ],
          },
          {
            id: "ac1s2", prompt: "Les sauvegardes existent mais aucune copie n'est immuable ni hors-ligne. Quel constat ?",
            options: [
              { label: "Tout va bien, les sauvegardes tournent", feedback: "Non : face à un rançongiciel, des sauvegardes en ligne peuvent être chiffrées aussi.", score: 0 },
              { label: "Non-conformité majeure : absence de copie immuable/hors-ligne (risque rançongiciel)", feedback: "Correct : c'est un écart critique avec un impact fort, à corriger en priorité.", score: 100 },
              { label: "Observation mineure", feedback: "Sous-évalué : l'absence de sauvegarde résiliente est un risque majeur.", score: 40 },
            ],
          },
          {
            id: "ac1s3", prompt: "Suite du constat ?",
            options: [
              { label: "Je le laisse dans le rapport, ça suffit", feedback: "Incomplet : un constat sans suivi ne corrige rien.", score: 30 },
              { label: "Je génère une action corrective (CAPA) avec responsable et échéance, et je planifierai un ré-audit", feedback: "Parfait : le constat devient une action suivie, puis on mesure le progrès au ré-audit.", score: 100 },
            ],
          },
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Durcissement Active Directory",
        content: "Audit de l'annuaire. Vous constatez que le groupe « Admins du domaine » compte 14 membres, dont plusieurs comptes nominatifs d'exploitation utilisés au quotidien. Que faites-vous ?",
        steps: [
          {
            id: "ac2s1", prompt: "Comment qualifiez-vous la situation ?",
            options: [
              { label: "Normal, il faut bien des administrateurs", feedback: "Non : un nombre élevé d'Admins du domaine élargit fortement la surface d'attaque.", score: 0 },
              { label: "Écart : trop de comptes à privilèges élevés, principe du moindre privilège non respecté", feedback: "Correct : on attend un nombre minimal d'Admins du domaine, séparés des usages quotidiens.", score: 100 },
            ],
          },
          {
            id: "ac2s2", prompt: "Quelle recommandation priorisez-vous ?",
            options: [
              { label: "Réduire le groupe au strict nécessaire, séparer les comptes d'administration (tiering) et activer LAPS", feedback: "Exactement : moindre privilège, tiering et gestion des secrets locaux.", score: 100 },
              { label: "Changer les mots de passe et passer à autre chose", feedback: "Insuffisant : le problème est structurel (trop de privilèges), pas seulement les mots de passe.", score: 30 },
            ],
          },
        ],
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Constats",
        content: "Solidité des constats.",
        questions: [
          q("a3q1", "Un constat solide comporte…", ["Une opinion", "Un critère + une preuve + un écart", "Uniquement une recommandation"], 1, "Critère, preuve et écart : les trois piliers d'un constat recevable."),
          q("a3q2", "Contrôle absent protégeant un actif critique : quelle gravité ?", ["Observation", "Non-conformité mineure", "Non-conformité majeure"], 2, "Absence de contrôle sur un enjeu fort = non-conformité majeure."),
          q("a3q3", "Après un constat, l'étape qui crée de la valeur est…", ["Le classer", "Le suivi de la recommandation jusqu'à sa mise en œuvre", "L'oublier"], 1, "C'est le suivi effectif des recommandations qui améliore la sécurité."),
        ],
      },
    ],
  },
];
