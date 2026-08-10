/* ==================================================================
 *  lib/grc/methodesRef.ts — Fiches méthode de référence (documentaire).
 *  Contenu statique décrivant les méthodes d'appréciation du risque
 *  EBIOS RM (ANSSI), IT-Grundschutz (BSI) et FAIR (Open Group).
 *  Volet « documentaire » — l'auto-évaluation se fait via l'onglet
 *  Conformité (référentiels de même id dans lib/grc/frameworks.ts).
 * ================================================================== */

export interface MethodStep {
  title: string;
  detail: string;
}
export interface MethodSheet {
  id: string; // = id du référentiel évaluable (frameworks.ts)
  name: string;
  short: string;
  origin: string;
  icon: string;
  approach: string; // qualitative / quantitative / mixte
  purpose: string;
  whenToUse: string;
  stepsLabel: string; // « Ateliers », « Démarche », « Facteurs »
  steps: MethodStep[];
  outputs: string[];
  strengths: string[];
  limits: string[];
}

export const METHOD_SHEETS: MethodSheet[] = [
  {
    id: "ebiosrm",
    name: "EBIOS Risk Manager",
    short: "EBIOS RM",
    origin: "ANSSI (France), 2018",
    icon: "🎯",
    approach: "Qualitative, orientée scénarios & écosystème",
    purpose:
      "Apprécier et traiter les risques numériques en partant des valeurs métier et des scénarios d'attaque réalistes, plutôt que d'une simple liste de vulnérabilités. Elle combine une approche par conformité (socle) et par scénarios (menaces ciblées).",
    whenToUse:
      "Étude de risque d'un système ou d'un projet sensible, homologation, analyse d'un écosystème avec des parties prenantes nombreuses. Particulièrement adaptée quand la menace est intentionnelle et ciblée (APT).",
    stepsLabel: "Les 5 ateliers",
    steps: [
      { title: "Atelier 1 — Cadrage & socle de sécurité", detail: "Définir le périmètre et les participants, identifier les valeurs métier et biens supports, les événements redoutés et leur gravité, puis établir le socle de sécurité et ses écarts." },
      { title: "Atelier 2 — Sources de risque", detail: "Identifier les sources de risque (SR) et leurs objectifs visés (OV), puis évaluer et retenir les couples SR/OV les plus pertinents." },
      { title: "Atelier 3 — Scénarios stratégiques", detail: "Cartographier la menace numérique de l'écosystème (parties prenantes), bâtir les scénarios stratégiques de haut niveau et définir des mesures de sécurité sur l'écosystème." },
      { title: "Atelier 4 — Scénarios opérationnels", detail: "Détailler techniquement les modes opératoires (chemins d'attaque) et évaluer leur vraisemblance." },
      { title: "Atelier 5 — Traitement du risque", detail: "Synthétiser et évaluer les risques, définir la stratégie et le plan de traitement (PACS), accepter les risques résiduels et organiser le suivi dans la durée." },
    ],
    outputs: ["Cartographie des risques (gravité × vraisemblance)", "Plan d'amélioration continue de la sécurité (PACS)", "Registre des risques résiduels acceptés", "Cartographie de menace de l'écosystème"],
    strengths: ["Centrée sur les scénarios réalistes et les objectifs des attaquants", "Intègre l'écosystème et les parties prenantes", "Reconnue pour l'homologation en France", "Combine socle (conformité) et scénarios"],
    limits: ["Qualitative : ne produit pas de montant financier", "Demande un atelier collectif et de l'animation", "Peut être lourde pour un petit périmètre"],
  },
  {
    id: "grundschutz",
    name: "BSI IT-Grundschutz",
    short: "IT-Grundschutz",
    origin: "BSI (Allemagne), standards 200-1 à 200-4",
    icon: "🧱",
    approach: "Par exigences (catalogue de mesures), compatible ISO 27001",
    purpose:
      "Fournir une méthode complète et un catalogue de mesures (Bausteine) pour sécuriser un système d'information de façon standardisée. Elle permet d'atteindre un niveau de sécurité solide sans repartir d'une analyse de risque exhaustive pour chaque actif.",
    whenToUse:
      "Organisations cherchant une démarche cadrée et outillée, une certification ISO 27001 sur la base de l'IT-Grundschutz, ou un socle de mesures prêtes à l'emploi. Adaptée au secteur public et aux administrations.",
    stepsLabel: "La démarche",
    steps: [
      { title: "Choix de la démarche", detail: "Selon le niveau visé : Basis-Absicherung (protection de base rapide), Standard-Absicherung (complète) ou Kern-Absicherung (sur les actifs les plus critiques)." },
      { title: "Analyse de structure (Strukturanalyse)", detail: "Recenser le périmètre : processus, applications, systèmes, réseaux et locaux, avec leurs dépendances." },
      { title: "Besoins de protection (Schutzbedarfsfeststellung)", detail: "Déterminer le besoin de protection (normal / élevé / très élevé) en confidentialité, intégrité et disponibilité." },
      { title: "Modélisation (Modellierung)", detail: "Associer à chaque élément les Bausteine pertinents du catalogue (ISMS, ORP, CON, OPS, DER, APP, SYS, NET, INF, IND)." },
      { title: "Contrôle de base (IT-Grundschutz-Check)", detail: "Comparer les exigences des Bausteine à la réalité et identifier les écarts." },
      { title: "Analyse de risque complémentaire", detail: "Pour les actifs à besoin élevé/très élevé, mener une analyse de risque selon BSI 200-3, puis consolider et réaliser les mesures." },
    ],
    outputs: ["Modélisation du SI par Bausteine", "État des lieux des écarts (check)", "Plan de réalisation des mesures", "Base pour la certification ISO 27001 sur la base de l'IT-Grundschutz"],
    strengths: ["Catalogue de mesures très concret et exhaustif", "Réduit le besoin d'analyses de risque au cas par cas", "Compatible ISO 27001", "Fortement outillé et documenté"],
    limits: ["Volumineux — courbe d'apprentissage", "Historiquement germanophone (catalogue massif)", "Approche par exigences moins orientée scénarios d'attaque"],
  },
  {
    id: "fair",
    name: "FAIR — Factor Analysis of Information Risk",
    short: "FAIR",
    origin: "Open Group (standard Open FAIR)",
    icon: "📊",
    approach: "Quantitative (probabiliste, en valeur financière)",
    purpose:
      "Quantifier le risque en termes financiers (pertes annualisées) à partir d'une taxonomie rigoureuse. FAIR décompose le risque en facteurs mesurables et exprime le résultat sous forme de distributions, pour éclairer des décisions coût/bénéfice.",
    whenToUse:
      "Prioriser des investissements de sécurité, comparer des scénarios en euros, présenter le risque à une direction en langage financier, ou compléter une approche qualitative par des chiffres.",
    stepsLabel: "La taxonomie & les facteurs",
    steps: [
      { title: "Cadrage du scénario", detail: "Définir précisément l'actif, la menace (community) et l'effet considéré — un scénario mal cadré fausse tout le reste." },
      { title: "Fréquence d'événement de perte (LEF)", detail: "Dériver la LEF depuis la fréquence d'événement de menace (TEF) et la vulnérabilité (capacité de la menace vs résistance des contrôles)." },
      { title: "Ampleur des pertes (LM)", detail: "Estimer les pertes primaires (directes) et secondaires (réactions des parties prenantes : amendes, réputation, réponse)." },
      { title: "Quantification", detail: "Combiner LEF et ampleur par simulation (Monte-Carlo, distributions PERT) pour obtenir une distribution de pertes, exprimée en pertes annualisées (ALE) avec intervalles." },
      { title: "Décision & communication", detail: "Présenter les résultats aux décideurs, prioriser les traitements par retour sur réduction de risque, et documenter la qualité/calibration des données d'entrée." },
    ],
    outputs: ["Risque exprimé en euros (pertes annualisées, distribution)", "Comparaison chiffrée de scénarios et de traitements", "Aide à la décision d'investissement (coût/bénéfice)"],
    strengths: ["Résultat en valeur financière, parlant pour la direction", "Rigueur de la taxonomie (facteurs mesurables)", "Permet la priorisation objective des investissements", "Complète bien une méthode qualitative"],
    limits: ["Dépend de la qualité des données et des estimations d'experts", "Courbe d'apprentissage sur la taxonomie et les probabilités", "N'identifie pas les scénarios à sa place (à coupler avec EBIOS/ATT&CK)"],
  },
];
