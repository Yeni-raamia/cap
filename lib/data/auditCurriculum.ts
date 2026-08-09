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
  {
    title: "Référentiels & bonnes pratiques",
    description: "Choisir le bon cadre pour auditer : ISO, CIS, ANSSI, NIST, OWASP.",
    category: "Méthode d'audit",
    icon: "📚",
    badge: "Référentiels maîtrisés",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Le paysage des référentiels",
        content:
          "Un audit compare l'existant à un **référentiel**. Les grandes familles :\n\n" +
          "• **ISO/IEC 27001 & 27002** — le système de management (SMSI) et le catalogue de mesures de sécurité. Vision organisationnelle.\n" +
          "• **CIS Benchmarks** — des socles de **durcissement technique** très précis, par produit (Windows, Linux, M365, Kubernetes…). Idéal pour l'audit de configuration.\n" +
          "• **Guides ANSSI** — recommandations françaises (hygiène informatique, administration sécurisée, Active Directory…).\n" +
          "• **NIST** (CSF, 800-53, 800-171) — cadres américains, très complets.\n" +
          "• **OWASP** (ASVS, Top 10, API Top 10) — la référence pour la **sécurité applicative**.\n\n" +
          "Aucun n'est « meilleur » dans l'absolu : on choisit selon la **cible** et l'**objectif** de l'audit.",
      },
      {
        type: "lesson", xp: 20, title: "Choisir le bon référentiel",
        content:
          "Quelques réflexes de sélection :\n\n" +
          "• J'audite la **configuration d'un serveur** → un **CIS Benchmark** du produit.\n" +
          "• J'audite une **application web** → **OWASP ASVS / Top 10**.\n" +
          "• J'audite l'**annuaire AD** → guide **ANSSI** + CIS.\n" +
          "• J'évalue la **posture globale** de l'organisation → **ISO 27002** / NIST CSF.\n\n" +
          "On peut **combiner** : un audit technique CIS dont les constats sont ensuite rattachés aux mesures ISO 27002 pour alimenter la conformité. Dans Cap, une **grille** matérialise le référentiel choisi ; on peut en importer/adapter autant que nécessaire.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Référentiels",
        content: "Le bon cadre au bon endroit.",
        questions: [
          q("a4q1", "Pour durcir un serveur Windows précis, je m'appuie surtout sur…", ["ISO 27001", "un CIS Benchmark Windows", "l'OWASP Top 10"], 1, "Les CIS Benchmarks donnent un socle de durcissement précis par produit."),
          q("a4q2", "Pour auditer une application web, le référentiel de choix est…", ["OWASP ASVS / Top 10", "CIS Kubernetes", "ISO 27005"], 0, "OWASP est la référence de la sécurité applicative."),
          q("a4q3", "ISO 27002, c'est avant tout…", ["Un scanner de vulnérabilités", "Un catalogue de mesures de sécurité", "Un pare-feu"], 1, "ISO 27002 est un catalogue de mesures (contrôles) de sécurité."),
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Quel référentiel ?",
        content: "On vous demande d'auditer un portail web exposé sur Internet, hébergé sur un serveur Linux, avec une base de données. Comment cadrez-vous ?",
        steps: [
          {
            id: "a4s1", prompt: "Par quoi commencez-vous ?",
            options: [
              { label: "Un seul référentiel générique pour tout couvrir", feedback: "Insuffisant : la cible a plusieurs couches (appli, OS, base).", score: 20 },
              { label: "Je combine : OWASP pour l'appli, CIS Linux pour l'OS, CIS/bonnes pratiques pour la base", feedback: "Exactement : on couvre chaque couche avec le référentiel adapté.", score: 100 },
            ],
          },
          {
            id: "a4s2", prompt: "Comment exploitez-vous les constats ensuite ?",
            options: [
              { label: "Je les laisse dans le rapport technique", feedback: "On peut aller plus loin : relier au SMSI.", score: 40 },
              { label: "Je génère des actions correctives et je relie les écarts aux mesures ISO pour la conformité", feedback: "Parfait : l'audit technique nourrit le plan d'actions ET la posture de conformité.", score: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Coter les constats & rédiger les recommandations",
    description: "Graduer un écart et formuler une recommandation actionnable.",
    category: "Pratique de l'audit",
    icon: "🎯",
    badge: "Rédaction de constats maîtrisée",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Graduer un constat",
        content:
          "Tous les écarts n'ont pas le même poids. On gradue :\n\n" +
          "• **Non-conformité majeure** — contrôle absent ou défaillant sur un enjeu fort (risque élevé). Correction prioritaire.\n" +
          "• **Non-conformité mineure** — écart ponctuel, contrôle globalement en place.\n" +
          "• **Observation / piste de progrès** — pas un manquement, mais une amélioration possible.\n" +
          "• **Point fort** — une bonne pratique à souligner (oui, on note aussi le positif !).\n\n" +
          "La gradation dépend de l'**impact** et de la **probabilité** (approche par les risques), pas de l'humeur de l'auditeur. Dans Cap, le marqueur **critique** d'une question et la réponse (Non/Partiel) orientent la priorité de l'action générée.",
      },
      {
        type: "lesson", xp: 20, title: "Une recommandation qui sert",
        content:
          "Une bonne recommandation est **SMART** : Spécifique, Mesurable, Atteignable, Réaliste, Temporisée.\n\n" +
          "• Elle vise la **cause**, pas seulement le symptôme.\n" +
          "• Elle est **actionnable** (« activer LAPS sur les serveurs X ») plutôt que vague (« améliorer la sécurité »).\n" +
          "• Elle laisse le **choix des moyens** à l'audité quand c'est pertinent.\n\n" +
          "Enfin, l'audité formule une **réponse managériale** : ce qu'il s'engage à faire, par qui et pour quand. C'est cet engagement, suivi dans le temps, qui referme la boucle (action corrective → vérification → clôture).",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Constats & recommandations",
        content: "Solidité et gravité.",
        questions: [
          q("a5q1", "Absence totale de sauvegarde d'un système vital, c'est…", ["Une observation", "Une non-conformité mineure", "Une non-conformité majeure"], 2, "Contrôle absent sur un enjeu vital = non-conformité majeure."),
          q("a5q2", "« Améliorer la sécurité du serveur » est une recommandation…", ["Excellente", "Trop vague, non actionnable", "Parfaitement SMART"], 1, "Une recommandation doit être spécifique et actionnable."),
          q("a5q3", "La réponse managériale sert à…", ["Contester le constat", "Engager l'audité sur une action, un responsable et une échéance", "Clore sans rien faire"], 1, "Elle matérialise l'engagement de correction, suivi dans le temps."),
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Coter un écart MFA",
        content: "Lors d'un audit M365, vous constatez que le MFA n'est activé que pour les administrateurs, pas pour les utilisateurs standards. Comment cotez-vous et que recommandez-vous ?",
        steps: [
          {
            id: "a5s1", prompt: "Quelle gravité ?",
            options: [
              { label: "Observation mineure, les admins sont protégés", feedback: "Sous-évalué : la majorité des comptes reste exposée à l'hameçonnage.", score: 20 },
              { label: "Non-conformité majeure : MFA non généralisé, surface d'attaque importante", feedback: "Correct : l'absence de MFA généralisé est un risque élevé et courant.", score: 100 },
            ],
          },
          {
            id: "a5s2", prompt: "Quelle recommandation ?",
            options: [
              { label: "« Renforcer la sécurité des comptes »", feedback: "Trop vague : non actionnable.", score: 20 },
              { label: "« Étendre le MFA à tous les utilisateurs via une stratégie d'accès conditionnel, sous 60 jours »", feedback: "Parfait : spécifique, mesurable et temporisé (SMART).", score: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Le rapport d'audit & la restitution",
    description: "Structurer un rapport et restituer sans braquer l'audité.",
    category: "Pratique de l'audit",
    icon: "📝",
    badge: "Communicant d'audit",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Structurer le rapport",
        content:
          "Un rapport d'audit lisible suit une trame :\n\n" +
          "1. **Contexte & périmètre** — quoi, où, quand, quelle cible.\n" +
          "2. **Objectifs & référentiel** — les critères utilisés.\n" +
          "3. **Méthode** — comment les preuves ont été recueillies (échantillon).\n" +
          "4. **Synthèse** — le message clé pour la direction (le score, les 3 points majeurs).\n" +
          "5. **Constats détaillés** — chacun avec critère, preuve, écart, gravité, recommandation.\n" +
          "6. **Plan d'actions & suivi**.\n\n" +
          "Le **rapport PDF** de Cap reprend cette logique (score par domaine, constats, détail, comparaison au ré-audit). Un bon rapport se lit à deux niveaux : la **synthèse** pour les décideurs, le **détail** pour les équipes techniques.",
      },
      {
        type: "lesson", xp: 20, title: "Restituer sans braquer",
        content:
          "La réunion de clôture est un moment délicat. Quelques principes :\n\n" +
          "• Parler **faits**, jamais personnes (« la GPO X n'applique pas… », pas « vous avez mal configuré »).\n" +
          "• **Pas de surprise** : les constats majeurs doivent avoir été évoqués au fil de l'eau.\n" +
          "• Reconnaître aussi les **points forts**.\n" +
          "• Écouter la **réponse de l'audité** : un constat factuel n'est pas négociable, mais la recommandation et l'échéance se co-construisent.\n\n" +
          "L'objectif n'est pas d'avoir raison, mais que l'organisation **progresse**. Un audit bien restitué donne envie de corriger ; un audit humiliant crée de la résistance.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Rapport & restitution",
        content: "Communiquer juste.",
        questions: [
          q("a6q1", "En réunion de clôture, on présente…", ["Des jugements sur les personnes", "Des faits et des constats étayés", "Uniquement les points négatifs"], 1, "On s'en tient aux faits, jamais aux personnes."),
          q("a6q2", "Un constat majeur découvert doit être révélé…", ["En réunion de clôture pour créer l'effet de surprise", "Au fil de l'eau, sans attendre la clôture", "Jamais"], 1, "Pas de surprise : les enjeux majeurs se partagent au plus tôt."),
          q("a6q3", "Face à un audité qui conteste un fait avéré et prouvé…", ["Je retire le constat pour avoir la paix", "Je maintiens le constat factuel, mais je co-construis la recommandation", "J'impose tout sans discussion"], 1, "Le fait prouvé tient ; la recommandation et l'échéance se discutent."),
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Un audité qui conteste",
        content: "En réunion de clôture, l'administrateur système conteste vivement un constat majeur (SMBv1 encore actif), affirmant que « ça n'a jamais posé de problème ». Comment réagissez-vous ?",
        steps: [
          {
            id: "a6s1", prompt: "Votre posture ?",
            options: [
              { label: "Je retire le constat pour éviter le conflit", feedback: "Non : un constat prouvé ne se retire pas sous la pression.", score: 0 },
              { label: "Je rappelle calmement la preuve et le risque (SMBv1 = vecteur connu), sans attaquer la personne", feedback: "Exactement : on s'appuie sur le fait et le risque, factuellement.", score: 100 },
              { label: "Je hausse le ton pour imposer mon autorité", feedback: "Contre-productif : cela crée de la résistance.", score: 10 },
            ],
          },
          {
            id: "a6s2", prompt: "Comment concluez-vous l'échange ?",
            options: [
              { label: "Je co-construis un plan de désactivation de SMBv1 avec une échéance réaliste", feedback: "Parfait : le fait tient, et l'audité s'approprie l'action.", score: 100 },
              { label: "Je laisse l'audité décider seul s'il corrige", feedback: "Insuffisant : sans engagement suivi, le risque persiste.", score: 30 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Indépendance, éthique & déontologie",
    description: "Les garde-fous qui rendent un audit crédible.",
    category: "Méthode d'audit",
    icon: "⚖️",
    badge: "Auditeur intègre",
    lessons: [
      {
        type: "lesson", xp: 20, title: "Indépendance & conflits d'intérêt",
        content:
          "La valeur d'un audit repose sur son **objectivité**. Deux menaces :\n\n" +
          "• **Auto-évaluation** — auditer son propre travail (on ne voit pas ses propres angles morts).\n" +
          "• **Conflit d'intérêt** — un lien (hiérarchique, financier, personnel) avec le périmètre audité.\n\n" +
          "Règles : l'auditeur **n'audite pas** ce qu'il a conçu/exploité ; en cas de lien, il le **déclare** et se retire si nécessaire. Dans Cap, le **registre des auditeurs** trace le rôle, les compétences et la **déclaration d'indépendance** de chacun — à croiser avec la cible avant d'affecter un audit.",
      },
      {
        type: "lesson", xp: 20, title: "Confidentialité & déontologie",
        content:
          "L'auditeur accède à des informations sensibles (failles, configurations, données). Il doit :\n\n" +
          "• **Protéger la confidentialité** des constats et des preuves (diffusion maîtrisée du rapport).\n" +
          "• Agir avec **intégrité** et **conscience professionnelle** (diligence, honnêteté).\n" +
          "• **Présenter les faits fidèlement**, y compris ceux qui dérangent.\n\n" +
          "Ces principes sont formalisés par des codes de déontologie (IIA pour l'audit interne, ISACA pour l'audit SI). Un manquement (dissimuler un constat, divulguer une faille) ruine la confiance et peut avoir des conséquences graves.",
      },
      {
        type: "quiz", xp: 25, title: "Quiz — Éthique",
        content: "Les garde-fous.",
        questions: [
          q("a7q1", "On vous demande d'auditer le pare-feu que vous administrez. Que faites-vous ?", ["J'accepte, je le connais bien", "Je signale le conflit et je laisse un auditeur indépendant le faire", "Je m'auto-évalue rapidement"], 1, "On n'audite pas son propre travail : défaut d'indépendance."),
          q("a7q2", "Vous découvrez une faille critique. Vous…", ["La publiez sur les réseaux sociaux", "La traitez de façon confidentielle via le rapport et les responsables", "L'ignorez"], 1, "La confidentialité est un principe déontologique fondamental."),
          q("a7q3", "Un constat gênant pour un collègue apparaît. Vous…", ["Le retirez par amitié", "Le rapportez fidèlement et factuellement", "L'atténuez fortement"], 1, "Présentation impartiale : on rapporte les faits, sans complaisance."),
        ],
      },
      {
        type: "case", xp: 30, title: "Étude de cas — Un audit à ne pas mener soi-même",
        content: "Votre responsable vous confie l'audit du système de sauvegarde… que vous avez vous-même mis en place l'an dernier. Que faites-vous ?",
        steps: [
          {
            id: "a7s1", prompt: "Première réaction ?",
            options: [
              { label: "J'accepte : personne ne le connaît mieux que moi", feedback: "Non : c'est précisément le problème — auto-évaluation, angles morts.", score: 0 },
              { label: "Je signale le conflit d'indépendance à mon responsable", feedback: "Exactement : la transparence d'abord.", score: 100 },
            ],
          },
          {
            id: "a7s2", prompt: "Quelle solution proposez-vous ?",
            options: [
              { label: "Qu'un autre auditeur mène l'audit ; je peux fournir la documentation en tant qu'audité", feedback: "Parfait : indépendance préservée, et votre connaissance reste utile côté audité.", score: 100 },
              { label: "Je m'auto-audite mais je promets d'être objectif", feedback: "Insuffisant : la bonne volonté ne remplace pas l'indépendance structurelle.", score: 20 },
            ],
          },
        ],
      },
    ],
  },
];
