/* ==================================================================
 *  lib/grc/frameworks.ts — Bibliothèques de mesures (référentiels).
 *  Données de référence (catalogue) versionnées en code ; seule la
 *  POSTURE de l'organisation (évaluation) est stockée en base.
 *  Référentiels : ISO/IEC 27001:2022 Annexe A, NIST CSF 2.0,
 *  CIS Controls v8, RGPD & NIS2.
 * ================================================================== */

export interface RefControl {
  code: string;
  title: string;
  group: string; // thème (ISO), fonction (NIST) ou domaine (RGPD/NIS2)
}
export interface Framework {
  id: string;
  name: string;
  short: string;
  version: string;
  groups: string[]; // ordre d'affichage des thèmes/fonctions
  controls: RefControl[];
}

/* ---------- ISO/IEC 27001:2022 — Annexe A (93 mesures) ---------- */
const ISO_ORG = "Organisationnel";
const ISO_PPL = "Humain";
const ISO_PHY = "Physique";
const ISO_TEC = "Technologique";
const ISO_CONTROLS: RefControl[] = [
  ["A.5.1", "Politiques de sécurité de l'information", ISO_ORG],
  ["A.5.2", "Fonctions et responsabilités liées à la sécurité de l'information", ISO_ORG],
  ["A.5.3", "Séparation des tâches", ISO_ORG],
  ["A.5.4", "Responsabilités de la direction", ISO_ORG],
  ["A.5.5", "Relations avec les autorités", ISO_ORG],
  ["A.5.6", "Relations avec des groupes de travail spécialisés", ISO_ORG],
  ["A.5.7", "Renseignement sur les menaces (threat intelligence)", ISO_ORG],
  ["A.5.8", "Sécurité de l'information dans la gestion de projet", ISO_ORG],
  ["A.5.9", "Inventaire des informations et autres actifs associés", ISO_ORG],
  ["A.5.10", "Utilisation correcte des informations et autres actifs associés", ISO_ORG],
  ["A.5.11", "Restitution des actifs", ISO_ORG],
  ["A.5.12", "Classification des informations", ISO_ORG],
  ["A.5.13", "Marquage des informations", ISO_ORG],
  ["A.5.14", "Transfert des informations", ISO_ORG],
  ["A.5.15", "Contrôle d'accès", ISO_ORG],
  ["A.5.16", "Gestion des identités", ISO_ORG],
  ["A.5.17", "Informations d'authentification", ISO_ORG],
  ["A.5.18", "Droits d'accès", ISO_ORG],
  ["A.5.19", "Sécurité de l'information dans les relations avec les fournisseurs", ISO_ORG],
  ["A.5.20", "Sécurité de l'information dans les accords conclus avec les fournisseurs", ISO_ORG],
  ["A.5.21", "Gestion de la sécurité de l'information dans la chaîne d'approvisionnement TIC", ISO_ORG],
  ["A.5.22", "Surveillance, revue et gestion des changements des services fournisseurs", ISO_ORG],
  ["A.5.23", "Sécurité de l'information pour l'utilisation de services en nuage (cloud)", ISO_ORG],
  ["A.5.24", "Planification et préparation de la gestion des incidents", ISO_ORG],
  ["A.5.25", "Évaluation et décision concernant les événements de sécurité", ISO_ORG],
  ["A.5.26", "Réponse aux incidents de sécurité de l'information", ISO_ORG],
  ["A.5.27", "Tirer des enseignements des incidents de sécurité", ISO_ORG],
  ["A.5.28", "Collecte de preuves", ISO_ORG],
  ["A.5.29", "Sécurité de l'information durant une perturbation", ISO_ORG],
  ["A.5.30", "Préparation des TIC pour la continuité d'activité", ISO_ORG],
  ["A.5.31", "Exigences légales, statutaires, réglementaires et contractuelles", ISO_ORG],
  ["A.5.32", "Droits de propriété intellectuelle", ISO_ORG],
  ["A.5.33", "Protection des enregistrements", ISO_ORG],
  ["A.5.34", "Protection de la vie privée et des données à caractère personnel", ISO_ORG],
  ["A.5.35", "Revue indépendante de la sécurité de l'information", ISO_ORG],
  ["A.5.36", "Conformité aux politiques, règles et normes de sécurité", ISO_ORG],
  ["A.5.37", "Procédures d'exploitation documentées", ISO_ORG],
  ["A.6.1", "Sélection des candidats (screening)", ISO_PPL],
  ["A.6.2", "Conditions d'embauche", ISO_PPL],
  ["A.6.3", "Sensibilisation, apprentissage et formation à la sécurité", ISO_PPL],
  ["A.6.4", "Processus disciplinaire", ISO_PPL],
  ["A.6.5", "Responsabilités après la fin ou le changement d'un emploi", ISO_PPL],
  ["A.6.6", "Engagements de confidentialité ou de non-divulgation", ISO_PPL],
  ["A.6.7", "Travail à distance", ISO_PPL],
  ["A.6.8", "Signalement des événements de sécurité de l'information", ISO_PPL],
  ["A.7.1", "Périmètres de sécurité physique", ISO_PHY],
  ["A.7.2", "Les entrées physiques", ISO_PHY],
  ["A.7.3", "Sécurisation des bureaux, des salles et des équipements", ISO_PHY],
  ["A.7.4", "Surveillance de la sécurité physique", ISO_PHY],
  ["A.7.5", "Protection contre les menaces physiques et environnementales", ISO_PHY],
  ["A.7.6", "Travail dans les zones sécurisées", ISO_PHY],
  ["A.7.7", "Bureau propre et écran verrouillé", ISO_PHY],
  ["A.7.8", "Emplacement et protection du matériel", ISO_PHY],
  ["A.7.9", "Sécurité des actifs hors des locaux", ISO_PHY],
  ["A.7.10", "Supports de stockage", ISO_PHY],
  ["A.7.11", "Services supports (électricité, climatisation…)", ISO_PHY],
  ["A.7.12", "Sécurité du câblage", ISO_PHY],
  ["A.7.13", "Maintenance du matériel", ISO_PHY],
  ["A.7.14", "Mise au rebut ou réutilisation sécurisée du matériel", ISO_PHY],
  ["A.8.1", "Terminaux finaux des utilisateurs", ISO_TEC],
  ["A.8.2", "Droits d'accès à privilèges", ISO_TEC],
  ["A.8.3", "Restriction d'accès à l'information", ISO_TEC],
  ["A.8.4", "Accès au code source", ISO_TEC],
  ["A.8.5", "Authentification sécurisée", ISO_TEC],
  ["A.8.6", "Dimensionnement (gestion des capacités)", ISO_TEC],
  ["A.8.7", "Protection contre les programmes malveillants", ISO_TEC],
  ["A.8.8", "Gestion des vulnérabilités techniques", ISO_TEC],
  ["A.8.9", "Gestion des configurations", ISO_TEC],
  ["A.8.10", "Suppression des informations", ISO_TEC],
  ["A.8.11", "Masquage des données", ISO_TEC],
  ["A.8.12", "Prévention de la fuite de données", ISO_TEC],
  ["A.8.13", "Sauvegarde des informations", ISO_TEC],
  ["A.8.14", "Redondance des moyens de traitement de l'information", ISO_TEC],
  ["A.8.15", "Journalisation (logs)", ISO_TEC],
  ["A.8.16", "Activités de surveillance", ISO_TEC],
  ["A.8.17", "Synchronisation des horloges", ISO_TEC],
  ["A.8.18", "Utilisation de programmes utilitaires à privilèges", ISO_TEC],
  ["A.8.19", "Installation de logiciels sur des systèmes en exploitation", ISO_TEC],
  ["A.8.20", "Sécurité des réseaux", ISO_TEC],
  ["A.8.21", "Sécurité des services réseau", ISO_TEC],
  ["A.8.22", "Cloisonnement des réseaux", ISO_TEC],
  ["A.8.23", "Filtrage web", ISO_TEC],
  ["A.8.24", "Utilisation de la cryptographie", ISO_TEC],
  ["A.8.25", "Cycle de vie de développement sécurisé", ISO_TEC],
  ["A.8.26", "Exigences de sécurité des applications", ISO_TEC],
  ["A.8.27", "Principes d'ingénierie et d'architecture sécurisées", ISO_TEC],
  ["A.8.28", "Codage sécurisé", ISO_TEC],
  ["A.8.29", "Tests de sécurité dans le développement et l'acceptation", ISO_TEC],
  ["A.8.30", "Développement externalisé", ISO_TEC],
  ["A.8.31", "Séparation des environnements de dev, test et production", ISO_TEC],
  ["A.8.32", "Gestion des changements", ISO_TEC],
  ["A.8.33", "Informations de test", ISO_TEC],
  ["A.8.34", "Protection des systèmes d'information pendant les tests d'audit", ISO_TEC],
].map(([code, title, group]) => ({ code, title, group }));

/* ---------- NIST CSF 2.0 (22 catégories) ---------- */
const NIST_CONTROLS: RefControl[] = [
  ["GV.OC", "Contexte organisationnel", "Gouverner (GV)"],
  ["GV.RM", "Stratégie de gestion des risques", "Gouverner (GV)"],
  ["GV.RR", "Rôles, responsabilités et autorités", "Gouverner (GV)"],
  ["GV.PO", "Politique", "Gouverner (GV)"],
  ["GV.OV", "Supervision", "Gouverner (GV)"],
  ["GV.SC", "Gestion des risques de la chaîne d'approvisionnement", "Gouverner (GV)"],
  ["ID.AM", "Gestion des actifs", "Identifier (ID)"],
  ["ID.RA", "Appréciation des risques", "Identifier (ID)"],
  ["ID.IM", "Amélioration", "Identifier (ID)"],
  ["PR.AA", "Gestion des identités, authentification et accès", "Protéger (PR)"],
  ["PR.AT", "Sensibilisation et formation", "Protéger (PR)"],
  ["PR.DS", "Sécurité des données", "Protéger (PR)"],
  ["PR.PS", "Sécurité des plateformes", "Protéger (PR)"],
  ["PR.IR", "Résilience de l'infrastructure technologique", "Protéger (PR)"],
  ["DE.CM", "Surveillance continue", "Détecter (DE)"],
  ["DE.AE", "Analyse des événements indésirables", "Détecter (DE)"],
  ["RS.MA", "Gestion des incidents", "Répondre (RS)"],
  ["RS.AN", "Analyse des incidents", "Répondre (RS)"],
  ["RS.CO", "Communication et signalement de la réponse", "Répondre (RS)"],
  ["RS.MI", "Atténuation des incidents", "Répondre (RS)"],
  ["RC.RP", "Exécution du plan de rétablissement", "Rétablir (RC)"],
  ["RC.CO", "Communication du rétablissement", "Rétablir (RC)"],
].map(([code, title, group]) => ({ code, title, group }));

/* ---------- CIS Controls v8 (18 contrôles) ---------- */
const CIS_CONTROLS: RefControl[] = [
  ["CIS 1", "Inventaire et contrôle des actifs de l'entreprise", "Contrôles CIS"],
  ["CIS 2", "Inventaire et contrôle des actifs logiciels", "Contrôles CIS"],
  ["CIS 3", "Protection des données", "Contrôles CIS"],
  ["CIS 4", "Configuration sécurisée des actifs et logiciels", "Contrôles CIS"],
  ["CIS 5", "Gestion des comptes", "Contrôles CIS"],
  ["CIS 6", "Gestion du contrôle d'accès", "Contrôles CIS"],
  ["CIS 7", "Gestion continue des vulnérabilités", "Contrôles CIS"],
  ["CIS 8", "Gestion des journaux d'audit", "Contrôles CIS"],
  ["CIS 9", "Protections de la messagerie et des navigateurs web", "Contrôles CIS"],
  ["CIS 10", "Défenses contre les logiciels malveillants", "Contrôles CIS"],
  ["CIS 11", "Récupération des données", "Contrôles CIS"],
  ["CIS 12", "Gestion de l'infrastructure réseau", "Contrôles CIS"],
  ["CIS 13", "Surveillance et défense du réseau", "Contrôles CIS"],
  ["CIS 14", "Sensibilisation à la sécurité et compétences", "Contrôles CIS"],
  ["CIS 15", "Gestion des fournisseurs de services", "Contrôles CIS"],
  ["CIS 16", "Sécurité des logiciels applicatifs", "Contrôles CIS"],
  ["CIS 17", "Gestion de la réponse aux incidents", "Contrôles CIS"],
  ["CIS 18", "Tests d'intrusion", "Contrôles CIS"],
].map(([code, title, group]) => ({ code, title, group }));

/* ---------- RGPD & NIS2 (obligations clés) ---------- */
const RGPD_NIS2_CONTROLS: RefControl[] = [
  ["RGPD-1", "Registre des activités de traitement (art. 30)", "RGPD"],
  ["RGPD-2", "Bases légales du traitement (art. 6)", "RGPD"],
  ["RGPD-3", "Information des personnes concernées (art. 12-14)", "RGPD"],
  ["RGPD-4", "Exercice des droits des personnes (art. 15-22)", "RGPD"],
  ["RGPD-5", "Analyse d'impact — AIPD/DPIA (art. 35)", "RGPD"],
  ["RGPD-6", "Sécurité du traitement (art. 32)", "RGPD"],
  ["RGPD-7", "Notification des violations à la CNIL sous 72 h (art. 33)", "RGPD"],
  ["RGPD-8", "Communication des violations aux personnes (art. 34)", "RGPD"],
  ["RGPD-9", "Délégué à la protection des données — DPO (art. 37-39)", "RGPD"],
  ["RGPD-10", "Encadrement des sous-traitants (art. 28)", "RGPD"],
  ["RGPD-11", "Transferts hors UE (art. 44-49)", "RGPD"],
  ["RGPD-12", "Protection des données dès la conception et par défaut (art. 25)", "RGPD"],
  ["NIS2-1", "Analyse des risques et politiques de sécurité des SI", "NIS2"],
  ["NIS2-2", "Gestion des incidents", "NIS2"],
  ["NIS2-3", "Continuité d'activité et gestion de crise", "NIS2"],
  ["NIS2-4", "Sécurité de la chaîne d'approvisionnement", "NIS2"],
  ["NIS2-5", "Sécurité de l'acquisition, du développement et de la maintenance", "NIS2"],
  ["NIS2-6", "Évaluation de l'efficacité des mesures", "NIS2"],
  ["NIS2-7", "Hygiène de base et formation à la cybersécurité", "NIS2"],
  ["NIS2-8", "Cryptographie et chiffrement", "NIS2"],
  ["NIS2-9", "Sécurité RH, contrôle d'accès et gestion des actifs", "NIS2"],
  ["NIS2-10", "Authentification multifacteur et communications sécurisées", "NIS2"],
  ["NIS2-11", "Notification des incidents à l'autorité (délais NIS2)", "NIS2"],
  ["NIS2-12", "Responsabilité et engagement des organes de direction", "NIS2"],
].map(([code, title, group]) => ({ code, title, group }));

export const FRAMEWORKS: Framework[] = [
  { id: "iso27001", name: "ISO/IEC 27001:2022 — Annexe A", short: "ISO 27001", version: "2022", groups: [ISO_ORG, ISO_PPL, ISO_PHY, ISO_TEC], controls: ISO_CONTROLS },
  { id: "nistcsf", name: "NIST Cybersecurity Framework 2.0", short: "NIST CSF", version: "2.0", groups: ["Gouverner (GV)", "Identifier (ID)", "Protéger (PR)", "Détecter (DE)", "Répondre (RS)", "Rétablir (RC)"], controls: NIST_CONTROLS },
  { id: "cisv8", name: "CIS Controls v8", short: "CIS v8", version: "8", groups: ["Contrôles CIS"], controls: CIS_CONTROLS },
  { id: "rgpdnis2", name: "RGPD & NIS2", short: "RGPD / NIS2", version: "—", groups: ["RGPD", "NIS2"], controls: RGPD_NIS2_CONTROLS },
];

export const frameworkById = (id: string): Framework | undefined => FRAMEWORKS.find((f) => f.id === id);
export const controlCodesOf = (frameworkId: string): Set<string> => new Set((frameworkById(frameworkId)?.controls ?? []).map((c) => c.code));
