/* ==================================================================
 *  lib/data/socProcedures.ts — Procédures & checklists de départ (SOC).
 *  Données pures (sans DB) : amorçage de la base + jeu de démonstration.
 *  Bonnes pratiques d'exploitation d'un SOC (NIST 800-61, ANSSI, SANS).
 * ================================================================== */
import type { SocChecklistItem } from "@/lib/domain";

export interface StarterProcedure {
  key: string;
  title: string;
  type: string;
  frequency: string;
  objective: string;
  content: string;
  references: string;
  items: Omit<SocChecklistItem, "id">[];
}

const I = (label: string, guidance = ""): Omit<SocChecklistItem, "id"> => ({ label, guidance });

export const STARTER_PROCEDURES: StarterProcedure[] = [
  {
    key: "priseposte",
    title: "Check-list de prise de poste",
    type: "Prise de poste",
    frequency: "Par quart",
    objective: "Prendre le relais en connaissance de cause et vérifier que la surveillance est opérationnelle dès le début du quart.",
    content: "À dérouler au début de chaque quart, avant toute autre activité.",
    references: "Bonnes pratiques d'exploitation SOC (SANS, ANSSI)",
    items: [
      I("Lire la passation du quart précédent", "Consigner les points en cours, les incidents ouverts, les consignes."),
      I("Vérifier la disponibilité du SIEM (Wazuh)", "Interface accessible, indexation en cours, pas d'alerte système."),
      I("Vérifier la remontée des sources critiques", "Contrôleurs de domaine, pare-feu, EDR, serveurs sensibles : logs récents ?"),
      I("Contrôler l'état des agents/collecteurs", "Agents Wazuh actifs ; aucun collecteur muet depuis > X minutes."),
      I("Passer en revue la file d'alertes en attente", "Prioriser les alertes non traitées par criticité."),
      I("Vérifier les tickets/incidents ouverts", "Statut, échéances, actions attendues côté SOC."),
      I("Confirmer les moyens de contact/astreinte", "Numéros d'escalade et référents joignables."),
    ],
  },
  {
    key: "healthdaily",
    title: "Vérifications quotidiennes de santé du SOC",
    type: "Vérification quotidienne",
    frequency: "Quotidien",
    objective: "S'assurer chaque jour que la chaîne de détection est saine (pas d'angle mort).",
    content: "Idéalement en début de journée. Toute anomalie ouvre un ticket interne.",
    references: "ANSSI — journalisation · bonnes pratiques SOC",
    items: [
      I("Complétude de la collecte", "Toutes les sources attendues remontent-elles ? Repérer les sources muettes."),
      I("Volumétrie des logs", "Écart anormal (chute = perte de source ; pic = incident ou boucle) ?"),
      I("Santé des agents EDR/Wazuh", "Taux d'agents actifs ; agents déconnectés à relancer."),
      I("Mises à jour des règles / signatures", "Règles de détection et signatures à jour ?"),
      I("Fraîcheur des flux de threat intel", "Feeds IOC mis à jour et intégrés ?"),
      I("Sauvegardes des outils du SOC", "Sauvegarde du SIEM/config OK ?"),
      I("Tickets/alertes en retard", "Aucune alerte critique non traitée depuis > SLA."),
    ],
  },
  {
    key: "triage",
    title: "Critères de triage & de classification",
    type: "Triage / classification",
    frequency: "Ponctuel",
    objective: "Qualifier une alerte de façon homogène : vrai/faux positif, gravité, suite à donner.",
    content:
      "Pour chaque alerte, répondre dans l'ordre :\n" +
      "1. Est-ce un vrai positif ? (corroborer par une 2e source : logs, EDR, contexte métier)\n" +
      "2. Quelle gravité ? (Mineur → Critique) selon l'actif touché, la sensibilité des données et la propagation possible.\n" +
      "3. Quelle suite ? Clôturer (faux positif, documenté) · Traiter selon le runbook · Escalader en incident (registre GRC).\n\n" +
      "Toujours documenter la décision (preuve + justification) — même un faux positif (utile pour affiner la détection).",
    references: "NIST SP 800-61 r2 (détection & analyse)",
    items: [
      I("Corroborer l'alerte par une seconde source", "Ne jamais conclure sur une seule alerte."),
      I("Déterminer l'actif et la sensibilité concernés", "Le contexte métier change la gravité."),
      I("Coter la gravité", "Mineur / Modéré / Majeur / Critique."),
      I("Décider : clôturer / traiter / escalader", "Si doute → escalader."),
      I("Documenter la décision", "Preuve + justification, y compris pour les faux positifs."),
    ],
  },
  {
    key: "escalade",
    title: "Matrice d'escalade",
    type: "Matrice d'escalade",
    frequency: "Ponctuel",
    objective: "Savoir qui prévenir, quand et comment, sans hésitation.",
    content:
      "QUAND escalader :\n" +
      "• Incident confirmé de gravité Majeur/Critique → ouvrir un incident (registre GRC) et prévenir le RSSI.\n" +
      "• Violation de données personnelles suspectée → prévenir le DPO (délai RGPD 72 h).\n" +
      "• Rançongiciel / compromission étendue → RSSI + direction ; envisager la cellule de crise.\n" +
      "• Doute sur la conduite à tenir → escalader au niveau N2/référent.\n\n" +
      "COMMENT : par le canal défini (téléphone en priorité pour le critique, puis écrit pour la traçabilité). Toujours horodater et consigner.\n\n" +
      "Adapter les noms/numéros à votre organisation.",
    references: "ISO 27035 · plan de gestion de crise interne",
    items: [
      I("N1 → N2 : doute technique ou alerte non résolue", "Référent SOC / analyste senior."),
      I("N2 → RSSI : incident Majeur/Critique confirmé", "Ouverture d'incident + information direction."),
      I("→ DPO : suspicion de violation de données", "Délai RGPD de notification (72 h)."),
      I("→ Cellule de crise : impact étendu / continuité menacée", "Selon le plan de crise."),
    ],
  },
  {
    key: "commincident",
    title: "Modèle de communication d'incident",
    type: "Communication",
    frequency: "Ponctuel",
    objective: "Communiquer un point d'incident clair, factuel et actionnable aux parties prenantes.",
    content:
      "Trame de point de situation (à adapter) :\n\n" +
      "• Objet : [référence incident] — [titre court]\n" +
      "• Heure du point : [horodatage]\n" +
      "• Statut : [En cours / Contenu / Résolu]\n" +
      "• Ce que l'on sait (faits) : [systèmes/données concernés, périmètre]\n" +
      "• Ce que l'on fait (actions en cours) : [confinement, investigations]\n" +
      "• Impact estimé : [métier, données, disponibilité]\n" +
      "• Prochaines étapes & prochain point : [heure]\n\n" +
      "Règles : rester factuel (pas de spéculation), ne pas nommer de personnes, diffuser uniquement aux destinataires autorisés.",
    references: "Bonnes pratiques de communication de crise (ANSSI)",
    items: [
      I("Rester factuel", "Distinguer les faits confirmés des hypothèses."),
      I("Adapter au destinataire", "Direction = synthèse/impact ; technique = détail."),
      I("Maîtriser la diffusion", "Confidentialité : uniquement les destinataires autorisés."),
      I("Annoncer le prochain point", "Donner un rythme de communication."),
    ],
  },
];

/** Développe une procédure de départ en items avec ids stables (`<key>-iN`). */
export const starterProcedureItems = (p: StarterProcedure): SocChecklistItem[] =>
  p.items.map((it, i) => ({ ...it, id: `${p.key}-i${i + 1}` }));
