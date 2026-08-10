/* ==================================================================
 *  lib/data/grcDemo.ts — Jeu de démonstration du module GRC (mémoire).
 *  Données neutres, cohérentes entre onglets, détenues par l'équipe GRC
 *  de démonstration (u1 RSSI, u3 Gouvernance/Conformité, u6 Audit) afin
 *  d'illustrer les distinctions, les joyaux et le suivi des politiques.
 * ================================================================== */
import type {
  Asset,
  Audit,
  AuditGrid,
  AuditPlanItem,
  Auditor,
  AuditResponse,
  CapaAction,
  CheckItem,
  ContinuityPlan,
  Direction,
  DirectionReview,
  Incident,
  FieldControl,
  FieldControlEvent,
  GrcPlanItem,
  Mission,
  OrgService,
  ProcessingActivity,
  Supplier,
  Policy,
  PolicyDiffusion,
  Risk,
  Runbook,
  SocProcedure,
  TrainingCourse,
  TrainingLesson,
} from "../domain";
import { CURRICULUM, type CourseSeed } from "./trainingCurriculum";
import { AUDIT_CURRICULUM } from "./auditCurriculum";
import { SOC_CURRICULUM } from "./socCurriculum";
import { STARTER_AUDIT_GRIDS, starterQuestions } from "./auditGrids";
import { STARTER_RUNBOOKS, starterRunbookSteps } from "./runbooks";
import { STARTER_PROCEDURES, starterProcedureItems } from "./socProcedures";

const NOW = () => new Date();
const day = (offset: number) => new Date(NOW().getTime() + offset * 864e5);
const Y = () => NOW().getFullYear();

/* ---------- Académie (curriculum de démonstration) ---------- */
export function seedTraining(): TrainingCourse[] {
  const year = Y();
  const mapCurriculum = (list: CourseSeed[], track: string, prefix: string, offset: number): TrainingCourse[] =>
    list.map((c, ci): TrainingCourse => {
      const cid = `${prefix}${ci + 1}`;
      const lessons: TrainingLesson[] = c.lessons.map((l, li) => ({
        id: `${cid}-l${li + 1}`, courseId: cid, order: li, type: l.type, title: l.title, content: l.content, xp: l.xp,
        questions: l.questions ?? [], steps: l.steps ?? [], challengeHref: l.challengeHref ?? "",
      }));
      return {
        id: cid, ref: `ACAD-${year}-${String(offset + ci + 1).padStart(3, "0")}`,
        title: c.title, description: c.description, category: c.category, icon: c.icon, badge: c.badge,
        track, order: ci, published: true, lessons, createdBy: "u1", createdAt: day(-120), updatedAt: day(-30),
      };
    });
  return [
    ...mapCurriculum(CURRICULUM, "grc", "tc", 0),
    ...mapCurriculum(AUDIT_CURRICULUM, "audit", "tac", CURRICULUM.length),
    ...mapCurriculum(SOC_CURRICULUM, "soc", "tsc", CURRICULUM.length + AUDIT_CURRICULUM.length),
  ];
}

/* ---------- Revue de direction ---------- */
export function seedReviews(): DirectionReview[] {
  return [
    {
      id: "drev1", ref: "REV-2026-001", title: "Revue de direction — 1er semestre", date: day(-30), period: "S1 " + Y(),
      participantIds: ["u1", "u3", "u6"],
      contextChanges: "Nouvelle directive NIS2 en préparation ; renforcement de l'équipe GRC.",
      riskReview: "6 risques ouverts, dont 2 critiques en cours de traitement (annuaire, hameçonnage).",
      complianceReview: "Score de conformité en progression ; audit à blanc ISO 27001 planifié.",
      incidentsReview: "3 incidents dont 1 violation de données (résolue, DPO notifié).",
      objectivesReview: "Certification ISO 27001 en cours ; campagne de sensibilisation lancée.",
      feedback: "Les directions demandent plus d'accompagnement sur les politiques.",
      decisions: "Prioriser le déploiement du MFA ; valider le budget sensibilisation.",
      actions: "Plan d'actions correctives à jour ; nommer un référent par direction.",
      kpiSnapshot: { conformite: 62, risquesCritiques: 2, incidentsOuverts: 1, capaEnRetard: 1 },
      nextReviewDate: day(150), status: "Clôturée", createdBy: "u1", createdAt: day(-32), updatedAt: day(-30),
    },
  ];
}

/* ---------- RGPD : registre des traitements ---------- */
export function seedProcessing(): ProcessingActivity[] {
  const base = (o: Partial<ProcessingActivity> & { id: string; ref: string; name: string }): ProcessingActivity => ({
    purpose: "", legalBasis: "Obligation légale", dataCategories: [], sensitiveData: false, dataSubjects: "", recipients: "",
    retention: "", transfersOutsideEU: false, transferDetails: "", ownerId: "u3", service: "RH", securityMeasures: "", assetIds: [],
    piaRequired: false, piaStatus: "Non requise", piaRisk: "Faible", piaNotes: "", status: "Actif", reviewDate: day(180),
    createdBy: "u3", createdAt: day(-120), updatedAt: day(-20), ...o,
  });
  return [
    base({ id: "dtrt1", ref: "TRT-2026-001", name: "Gestion de la paie", purpose: "Calcul et versement des rémunérations, déclarations sociales.", legalBasis: "Obligation légale", dataCategories: ["Identité", "Coordonnées", "Vie professionnelle", "Données financières", "Numéro de sécurité sociale"], sensitiveData: false, dataSubjects: "Agents de l'organisation", recipients: "Service RH, comptabilité, organismes sociaux, éditeur de paie (sous-traitant)", retention: "5 ans après le départ de l'agent", ownerId: "u3", service: "RH", securityMeasures: "Chiffrement, habilitations, journalisation.", assetIds: ["da2", "da3"] }),
    base({ id: "dtrt2", ref: "TRT-2026-002", name: "Gestion des accès et journalisation", purpose: "Contrôler les accès au SI et tracer les connexions.", legalBasis: "Intérêt légitime", dataCategories: ["Identité", "Données de connexion"], dataSubjects: "Agents et prestataires", recipients: "DSI", retention: "12 mois pour les logs", ownerId: "u1", service: "DSI", securityMeasures: "Annuaire sécurisé, MFA.", assetIds: ["da1"] }),
    // Traitement à risque : données de santé → AIPD requise, en cours.
    base({ id: "dtrt3", ref: "TRT-2026-003", name: "Suivi médecine du travail", purpose: "Suivi des visites et aptitudes.", legalBasis: "Obligation légale", dataCategories: ["Identité", "Données de santé"], sensitiveData: true, dataSubjects: "Agents", recipients: "Service de santé au travail", retention: "Durée réglementaire", ownerId: "u3", service: "RH", securityMeasures: "Accès restreint au personnel médical, cloisonnement.", piaRequired: true, piaStatus: "En cours", piaRisk: "Élevé", piaNotes: "Données sensibles (santé) → AIPD obligatoire ; mesures de cloisonnement à finaliser.", reviewDate: day(-10) }),
    base({ id: "dtrt4", ref: "TRT-2026-004", name: "Gestion des usagers du site public", purpose: "Traiter les demandes en ligne des usagers.", legalBasis: "Mission d'intérêt public", dataCategories: ["Identité", "Coordonnées"], dataSubjects: "Usagers / citoyens", recipients: "Service concerné", retention: "3 ans", ownerId: "u6", service: "Direction générale", securityMeasures: "HTTPS, minimisation.", assetIds: ["da5"] }),
  ];
}

/* ---------- Gestion des incidents ---------- */
export function seedIncidents(): Incident[] {
  const base = (o: Partial<Incident> & { id: string; ref: string; title: string; severity: string; status: string }): Incident => ({
    type: "Autre", dataBreach: false, detectedAt: day(-5), declaredBy: "u2", ownerId: "u1", missionId: "", assetIds: [],
    description: "", impact: "", actionsTaken: "", resolvedAt: null, rootCause: "", lessons: "",
    createdBy: "u2", createdAt: day(-5), updatedAt: day(-2), ...o,
  });
  return [
    base({ id: "di1", ref: "INC-2026-001", title: "Tentative de rançongiciel sur un poste RH", type: "Cyberattaque", severity: "Majeur", status: "En traitement", detectedAt: day(-3), declaredBy: "u4", ownerId: "u1", missionId: "dm1", assetIds: ["da6"], description: "Un poste a affiché une demande de rançon ; propagation suspectée.", impact: "1 poste chiffré, partage réseau à vérifier.", actionsTaken: "Poste isolé du réseau, analyse en cours, sauvegardes vérifiées." }),
    base({ id: "di2", ref: "INC-2026-002", title: "Envoi d'un fichier RH au mauvais destinataire", type: "Fuite / violation de données", severity: "Modéré", status: "Résolu", dataBreach: true, detectedAt: day(-12), resolvedAt: day(-11), declaredBy: "u3", ownerId: "u3", missionId: "dm1", assetIds: ["da3"], description: "Un tableau de paie envoyé par erreur à un mauvais interlocuteur interne.", impact: "Données personnelles exposées à une personne non habilitée.", actionsTaken: "Rappel du mail, demande de suppression confirmée, notification au DPO.", rootCause: "Autocomplétion de l'adresse e-mail.", lessons: "Activer la confirmation avant envoi externe + sensibilisation." }),
    base({ id: "di3", ref: "INC-2026-003", title: "Indisponibilité de la messagerie (2h)", type: "Indisponibilité / panne", severity: "Mineur", status: "Clôturé", detectedAt: day(-20), resolvedAt: day(-20), declaredBy: "u2", ownerId: "u1", missionId: "dm2", assetIds: ["da4"], description: "Coupure de la messagerie pendant 2 heures.", impact: "Gêne opérationnelle, aucune perte de données.", actionsTaken: "Bascule vers le site de secours du fournisseur.", rootCause: "Incident chez l'hébergeur.", lessons: "Vérifier le SLA et le délai de bascule au prochain test PCA." }),
  ];
}

/* ---------- Continuité d'activité (BIA/PCA) ---------- */
export function seedContinuity(): ContinuityPlan[] {
  const base = (o: Partial<ContinuityPlan> & { id: string; ref: string; activity: string; criticality: string }): ContinuityPlan => ({
    missionId: "", ownerId: "u1", mtpd: "< 24h", rto: "< 24h", rpo: "< 24h", impacts: [], strategy: "", resources: "", procedure: "",
    assetIds: [], lastTestDate: null, reviewDate: day(120), status: "Validé", createdBy: "u1", createdAt: day(-120), updatedAt: day(-20), ...o,
  });
  return [
    base({ id: "dcp_pca1", ref: "PCA-2026-001", activity: "Verser les rémunérations", missionId: "dm1", ownerId: "u3", criticality: "Vitale", mtpd: "< 72h", rto: "< 24h", rpo: "< 4h", impacts: ["Financier", "Juridique / RGPD", "Humain / sécurité"], strategy: "Sauvegardes quotidiennes testées + procédure de paie dégradée (virements manuels d'acompte).", resources: "Sauvegardes, accès banque de secours, éditeur en astreinte.", procedure: "1) Restaurer depuis la dernière sauvegarde saine. 2) Vérifier l'intégrité. 3) Si indisponible >48h, lancer les acomptes manuels.", assetIds: ["da2", "da3"], lastTestDate: day(-40) }),
    base({ id: "dcp_pca2", ref: "PCA-2026-002", activity: "Messagerie", missionId: "dm2", ownerId: "u1", criticality: "Essentielle", mtpd: "< 8h", rto: "< 4h", rpo: "< 1h", impacts: ["Opérationnel", "Réputation"], strategy: "Bascule vers l'hébergement de secours du fournisseur cloud.", resources: "Contrat cloud avec SLA, DNS de secours.", procedure: "Basculer les MX vers le site de secours, informer les utilisateurs.", assetIds: ["da4"], lastTestDate: day(-400) }),
    // Écart : RTO plus long que la DMIA (incohérent) + jamais testé.
    base({ id: "dcp_pca3", ref: "PCA-2026-003", activity: "Gérer les identités et les accès", missionId: "dm3", ownerId: "u1", criticality: "Vitale", mtpd: "< 4h", rto: "< 24h", rpo: "< 4h", impacts: ["Opérationnel", "Financier"], strategy: "Annuaire répliqué sur deux sites.", resources: "Réplica AD, procédure de bascule.", procedure: "Promouvoir le contrôleur de secours.", assetIds: ["da1"], lastTestDate: null, status: "À réviser" }),
  ];
}

/* ---------- Fournisseurs & prestataires ---------- */
export function seedSuppliers(): Supplier[] {
  const base = (o: Partial<Supplier> & { id: string; ref: string; name: string }): Supplier => ({
    type: "Autre", criticality: "Standard", service: "", dataAccess: "Aucune donnée", ownerId: "u1", status: "Actif",
    contractEnd: day(200), reviewDate: day(60), assetIds: [], notes: "",
    createdBy: "u1", createdAt: day(-140), updatedAt: day(-20), ...o,
  });
  return [
    base({ id: "sup1", ref: "FRN-2026-001", name: "Éditeur du logiciel de paie", type: "Éditeur / Logiciel", criticality: "Critique", service: "Maintenance & mises à jour du SI de paie", dataAccess: "Données personnelles", ownerId: "u3", assetIds: ["da2"], reviewDate: day(-10) }),
    base({ id: "sup2", ref: "FRN-2026-002", name: "Hébergeur cloud (messagerie)", type: "Hébergeur / Cloud", criticality: "Critique", service: "Hébergement de la messagerie", dataAccess: "Données internes", ownerId: "u1", assetIds: ["da4"] }),
    base({ id: "sup3", ref: "FRN-2026-003", name: "Infogérant du parc", type: "Infogérance / TMA", criticality: "Important", service: "Support et maintenance des postes", dataAccess: "Données internes", ownerId: "u6", assetIds: ["da6"] }),
    base({ id: "sup4", ref: "FRN-2026-004", name: "Agence web", type: "Conseil / Audit", criticality: "Standard", service: "Maintenance du site public", dataAccess: "Aucune donnée", ownerId: "u6", assetIds: ["da5"], contractEnd: day(90) }),
    base({ id: "sup5", ref: "FRN-2026-005", name: "Cabinet d'audit sécurité", type: "Conseil / Audit", criticality: "Important", service: "Audits et tests d'intrusion annuels", dataAccess: "Données sensibles", ownerId: "u1", status: "En évaluation" }),
  ];
}

/* ---------- Missions & dépendances ---------- */
export function seedMissions(): Mission[] {
  const base = (o: Partial<Mission> & { id: string; ref: string; name: string; value: string }): Mission => ({
    type: "Métier",
    description: "",
    ownerId: "u1",
    status: "Active",
    assetIds: [],
    peopleIds: [],
    dependencies: [],
    createdBy: "u1",
    createdAt: day(-150),
    updatedAt: day(-20),
    ...o,
  });
  return [
    base({ id: "dm1", ref: "MIS-2026-001", name: "Verser les rémunérations", type: "Régalienne", value: "Vitale", ownerId: "u3", description: "Payer les agents dans les délais légaux.", assetIds: ["da2", "da3", "da1"], peopleIds: ["u3"], dependencies: [
      { id: "dm1d1", direction: "amont", kind: "Prestataire", name: "Éditeur du logiciel de paie", description: "Maintenance et mises à jour.", criticality: "Essentielle" },
      { id: "dm1d2", direction: "amont", kind: "Entité externe", name: "Banque (virements)", description: "Exécution des virements SEPA.", criticality: "Vitale" },
      { id: "dm1d3", direction: "aval", kind: "Autre organisation", name: "Agents & organismes sociaux", description: "Bénéficiaires des versements et déclarations.", criticality: "Vitale" },
    ] }),
    base({ id: "dm2", ref: "MIS-2026-002", name: "Assurer la communication interne", type: "Support", value: "Essentielle", ownerId: "u1", description: "Messagerie et collaboration.", assetIds: ["da4", "da1"], peopleIds: ["u1", "u2"], dependencies: [
      { id: "dm2d1", direction: "amont", kind: "Prestataire", name: "Hébergeur / fournisseur cloud", description: "Disponibilité de la messagerie.", criticality: "Essentielle" },
      { id: "dm2d2", direction: "aval", kind: "Service interne", name: "Toutes les directions", description: "Dépendent de la messagerie au quotidien.", criticality: "Importante" },
    ] }),
    base({ id: "dm3", ref: "MIS-2026-003", name: "Gérer les identités et les accès", type: "Régalienne", value: "Vitale", ownerId: "u1", description: "Contrôler qui accède à quoi.", assetIds: ["da1"], peopleIds: ["u1"], dependencies: [
      { id: "dm3d1", direction: "aval", kind: "Service interne", name: "Applications métier", description: "S'authentifient via l'annuaire.", criticality: "Vitale" },
    ] }),
    base({ id: "dm4", ref: "MIS-2026-004", name: "Informer le public", type: "Métier", value: "Importante", ownerId: "u6", description: "Site institutionnel et publications.", assetIds: ["da5"], peopleIds: ["u6"], dependencies: [
      { id: "dm4d1", direction: "amont", kind: "Prestataire", name: "Agence web / hébergeur", description: "Maintenance du site public.", criticality: "Importante" },
      { id: "dm4d2", direction: "aval", kind: "Autre organisation", name: "Usagers / citoyens", description: "Consultent l'information publique.", criticality: "Importante" },
    ] }),
  ];
}

/* ---------- Organigramme (Directions → Services) ---------- */
export function seedDirections(): Direction[] {
  const svc = (name: string, headId = ""): OrgService => ({ id: `ds-${name.toLowerCase().replace(/\s+/g, "-")}`, name, headId });
  const base = (o: Partial<Direction> & { id: string; ref: string; name: string; services: OrgService[] }): Direction => ({
    code: "",
    headId: "u1",
    description: "",
    createdBy: "u1",
    createdAt: day(-150),
    updatedAt: day(-20),
    ...o,
  });
  return [
    base({ id: "dd1", ref: "DIR-2026-001", name: "Direction des systèmes d'information", code: "DSI", headId: "u1", services: [svc("Réseau & Télécom"), svc("Systèmes & Cloud"), svc("Applications"), svc("Support utilisateurs")] }),
    base({ id: "dd2", ref: "DIR-2026-002", name: "Ressources humaines", code: "RH", headId: "u3", services: [svc("Paie"), svc("Recrutement"), svc("Formation")] }),
    base({ id: "dd3", ref: "DIR-2026-003", name: "Finance", code: "FIN", headId: "u3", services: [svc("Comptabilité"), svc("Contrôle de gestion")] }),
    base({ id: "dd4", ref: "DIR-2026-004", name: "Juridique", code: "JUR", headId: "u6", services: [svc("Contrats"), svc("Conformité & RGPD")] }),
    base({ id: "dd5", ref: "DIR-2026-005", name: "Direction générale", code: "DG", headId: "u1", services: [svc("Cabinet"), svc("Communication")] }),
  ];
}

/* ---------- Actifs (registre C/I/D) ---------- */
export function seedAssets(): Asset[] {
  const base = (o: Partial<Asset> & { id: string; ref: string; name: string; confidentiality: number; integrity: number; availability: number }): Asset => ({
    type: "Service / Processus",
    description: "",
    ownerId: "u1",
    service: "DSI",
    status: "Actif",
    reviewDate: day(120),
    createdBy: "u1",
    createdAt: day(-200),
    updatedAt: day(-20),
    ...o,
  });
  return [
    base({ id: "da1", ref: "ACT-2026-001", name: "Annuaire Active Directory", type: "Logiciel / Applicatif", service: "DSI", ownerId: "u1", confidentiality: 4, integrity: 4, availability: 4, description: "Cœur des identités et des accès." }),
    base({ id: "da2", ref: "ACT-2026-002", name: "SI de paie", type: "Logiciel / Applicatif", service: "RH", ownerId: "u3", confidentiality: 4, integrity: 3, availability: 2, description: "Traitement des rémunérations." }),
    base({ id: "da3", ref: "ACT-2026-003", name: "Base RH (données personnelles)", type: "Information / Données", service: "RH", ownerId: "u3", confidentiality: 4, integrity: 3, availability: 2, description: "Données à caractère personnel des agents." }),
    base({ id: "da4", ref: "ACT-2026-004", name: "Messagerie", type: "Service / Processus", service: "DSI", ownerId: "u1", confidentiality: 3, integrity: 3, availability: 3, description: "Courrier électronique de l'organisation." }),
    base({ id: "da5", ref: "ACT-2026-005", name: "Site web institutionnel", type: "Service / Processus", service: "DSI", ownerId: "u6", confidentiality: 1, integrity: 3, availability: 3, description: "Portail public." }),
    base({ id: "da6", ref: "ACT-2026-006", name: "Postes de travail", type: "Matériel / Infrastructure", service: "DSI", ownerId: "u1", confidentiality: 2, integrity: 2, availability: 2, description: "Parc bureautique." }),
  ];
}

/* ---------- Registre des risques (ISO 27005) ---------- */
export function seedRisks(): Risk[] {
  const base = (o: Partial<Risk> & { id: string; ref: string; title: string; probability: number; impact: number; residualProbability: number; residualImpact: number }): Risk => ({
    description: "",
    category: "Cyber",
    assetId: null,
    threat: "",
    vulnerability: "",
    treatment: "Réduire",
    treatmentPlan: "",
    controls: [],
    status: "En traitement",
    ownerId: "u1",
    reviewDate: day(90),
    acceptedBy: null,
    acceptedAt: null,
    acceptUntil: null,
    acceptanceJustification: "",
    reviews: [],
    links: [],
    createdBy: "u1",
    createdAt: day(-160),
    updatedAt: day(-15),
    ...o,
  });
  return [
    base({ id: "dr1", ref: "RSK-2026-001", title: "Compromission de l'annuaire (élévation de privilèges)", assetId: "da1", ownerId: "u1", category: "Cyber", threat: "Attaquant interne/externe", vulnerability: "Comptes à privilèges non cloisonnés", probability: 4, impact: 5, residualProbability: 2, residualImpact: 4, status: "En traitement", controls: [{ frameworkId: "iso27001", controlCode: "A.8.2" }, { frameworkId: "iso27001", controlCode: "A.5.15" }, { frameworkId: "cisv8", controlCode: "6" }] }),
    // « Dompteur » de u1 : inhérent critique → résiduel faible.
    base({ id: "dr2", ref: "RSK-2026-002", title: "Fuite de données RH", assetId: "da3", ownerId: "u1", category: "Conformité", threat: "Exfiltration / négligence", vulnerability: "Chiffrement partiel", probability: 4, impact: 5, residualProbability: 1, residualImpact: 2, status: "Réduit", controls: [{ frameworkId: "iso27001", controlCode: "A.8.24" }, { frameworkId: "rgpdnis2", controlCode: "RGPD.32" }] }),
    base({ id: "dr3", ref: "RSK-2026-003", title: "Indisponibilité du SI de paie", assetId: "da2", ownerId: "u3", category: "Continuité", threat: "Panne / rançongiciel", vulnerability: "PRA non testé", probability: 3, impact: 4, residualProbability: 2, residualImpact: 3, status: "En traitement", controls: [{ frameworkId: "iso27001", controlCode: "A.5.30" }] }),
    base({ id: "dr4", ref: "RSK-2026-004", title: "Hameçonnage ciblé (messagerie)", assetId: "da4", ownerId: "u6", category: "Cyber", threat: "Phishing", vulnerability: "Sensibilisation hétérogène", probability: 4, impact: 3, residualProbability: 3, residualImpact: 3, status: "En traitement", controls: [{ frameworkId: "iso27001", controlCode: "A.6.3" }] }),
    // Risque accepté formellement.
    base({ id: "dr5", ref: "RSK-2026-005", title: "Défiguration du site public", assetId: "da5", ownerId: "u6", category: "Cyber", threat: "Défacement", vulnerability: "CMS non maintenu", probability: 2, impact: 2, residualProbability: 2, residualImpact: 2, status: "Accepté", treatment: "Accepter", acceptedBy: "u1", acceptedAt: day(-30), acceptUntil: day(180), acceptanceJustification: "Impact limité (site vitrine, sauvegardes quotidiennes)." }),
    base({ id: "dr6", ref: "RSK-2026-006", title: "Poste compromis (rançongiciel)", assetId: "da6", ownerId: "u1", category: "Cyber", threat: "Rançongiciel", vulnerability: "EDR incomplet", probability: 3, impact: 4, residualProbability: 2, residualImpact: 3, status: "En traitement", reviews: [{ id: "rv1", reviewedBy: "u1", reviewedAt: day(-30), inherentP: 3, inherentI: 4, residualP: 2, residualI: 3, note: "Déploiement EDR en cours." }] }),
  ];
}

/* ---------- Politiques (diffusion par service) ---------- */
export function seedPolicies(): Policy[] {
  const diff = (policyId: string, service: string, stage: string, note = ""): PolicyDiffusion => ({
    id: `${policyId}-${service}`,
    policyId,
    service,
    stage,
    note,
    updatedAt: day(-10),
  });
  const base = (o: Partial<Policy> & { id: string; ref: string; title: string; diffusions: PolicyDiffusion[] }): Policy => ({
    reference: "ISO 27001",
    domain: "Gouvernance",
    version: "1.0",
    status: "En vigueur",
    summary: "",
    url: "",
    ownerId: "u3",
    publishedAt: day(-90),
    reviewDate: day(180),
    createdBy: "u3",
    createdAt: day(-120),
    updatedAt: day(-10),
    ...o,
  });
  return [
    // PSSI — largement appliquée (célébration proche).
    base({ id: "dp1", ref: "POL-2026-001", title: "Politique de sécurité (PSSI)", reference: "ISO 27001 A.5.1", domain: "Gouvernance", status: "En vigueur", ownerId: "u3", diffusions: [
      diff("dp1", "DSI", "Applicable"), diff("dp1", "RH", "Applicable"), diff("dp1", "Finance", "Applicable"), diff("dp1", "Juridique", "Comprise"), diff("dp1", "Direction générale", "Applicable"),
    ] }),
    // Mot de passe — en cours de diffusion (le « colis » avance).
    base({ id: "dp2", ref: "POL-2026-002", title: "Politique de mots de passe & MFA", reference: "ISO 27001 A.5.17", domain: "Contrôle d'accès", status: "En vigueur", ownerId: "u3", diffusions: [
      diff("dp2", "DSI", "Applicable"), diff("dp2", "RH", "Comprise"), diff("dp2", "Finance", "Consultée"), diff("dp2", "Juridique", "Diffusée"), diff("dp2", "Direction générale", "Consultée"),
    ] }),
    // Protection des données — mixte.
    base({ id: "dp3", ref: "POL-2026-003", title: "Protection des données personnelles (RGPD)", reference: "RGPD art. 32", domain: "Protection des données", status: "En vigueur", ownerId: "u3", diffusions: [
      diff("dp3", "RH", "Applicable"), diff("dp3", "Juridique", "Applicable"), diff("dp3", "DSI", "Comprise"), diff("dp3", "Finance", "Consultée"), diff("dp3", "Direction générale", "Non applicable"),
    ] }),
    // Charte utilisateur — brouillon, diffusion à peine amorcée.
    base({ id: "dp4", ref: "POL-2026-004", title: "Charte de l'utilisateur", reference: "Interne", domain: "RH / Sensibilisation", status: "Brouillon", ownerId: "u6", publishedAt: null, diffusions: [
      diff("dp4", "DSI", "Diffusée"), diff("dp4", "RH", "Diffusée"),
    ] }),
  ];
}

/* ---------- Contrôles terrain (rondes / inspections) ---------- */
export function seedFieldControls(): FieldControl[] {
  const item = (id: string, label: string, result: string, note = ""): CheckItem => ({ id, label, result, note, frameworkId: "", controlCode: "" });
  const ev = (id: string, kind: FieldControlEvent["kind"], label: string, at: Date, fromStatus = "", toStatus = "", authorId = "u6"): FieldControlEvent => ({ id, kind, label, fromStatus, toStatus, authorId, at });
  const base = (o: Partial<FieldControl> & { id: string; ref: string; title: string; items: CheckItem[]; events: FieldControlEvent[] }): FieldControl => ({
    type: "Ronde de sécurité",
    service: "DSI",
    location: "",
    date: day(-15),
    inspectorId: "u6",
    status: "Réalisé",
    summary: "",
    createdBy: "u6",
    createdAt: day(-18),
    updatedAt: day(-14),
    ...o,
  });
  return [
    base({ id: "dc1", ref: "CTRL-2026-001", title: "Ronde bureaux — étage 2", type: "Ronde de sécurité", service: "RH", location: "Bât. A · étage 2", inspectorId: "u6", status: "Clôturé",
      items: [item("dc1i1", "Postes verrouillés en l'absence", "Écart", "2 postes déverrouillés"), item("dc1i2", "Documents sensibles rangés", "Écart", "Dossiers RH sur bureau"), item("dc1i3", "Badge d'accès porté", "Conforme")],
      events: [ev("dc1e1", "creation", "Contrôle créé (Planifié)", day(-18), "", "Planifié"), ev("dc1e2", "statut", "Statut : Planifié → Réalisé", day(-15), "Planifié", "Réalisé"), ev("dc1e3", "action", "Rappel de la clean-desk policy au service RH", day(-14)), ev("dc1e4", "statut", "Statut : Réalisé → Clôturé", day(-12), "Réalisé", "Clôturé")] }),
    base({ id: "dc2", ref: "CTRL-2026-002", title: "Inspection salle serveurs", type: "Inspection physique", service: "DSI", location: "Local technique", inspectorId: "u6", status: "Réalisé",
      items: [item("dc2i1", "Accès physique restreint", "Conforme"), item("dc2i2", "Extincteur en état", "Écart", "Vérification périmée"), item("dc2i3", "Climatisation fonctionnelle", "Conforme"), item("dc2i4", "Câblage étiqueté", "Écart", "Baie B non étiquetée")],
      events: [ev("dc2e1", "creation", "Contrôle créé (Planifié)", day(-20), "", "Planifié"), ev("dc2e2", "statut", "Statut : Planifié → Réalisé", day(-16), "Planifié", "Réalisé")] }),
    base({ id: "dc3", ref: "CTRL-2026-003", title: "Audit interne — gestion des accès", type: "Audit interne", service: "DSI", inspectorId: "u6", status: "Réalisé",
      items: [item("dc3i1", "Revue des comptes à privilèges", "Écart", "3 comptes orphelins"), item("dc3i2", "MFA activé sur les accès admin", "Conforme"), item("dc3i3", "Journalisation des accès", "Conforme"), item("dc3i4", "Recertification des habilitations", "Écart", "Campagne non tracée")],
      events: [ev("dc3e1", "creation", "Contrôle créé (Réalisé)", day(-25), "", "Réalisé"), ev("dc3e2", "action", "Ouverture d'une action corrective (comptes orphelins)", day(-24))] }),
    base({ id: "dc4", ref: "CTRL-2026-004", title: "Entretien sensibilisation — service Finance", type: "Entretien", service: "Finance", inspectorId: "u6", status: "Réalisé",
      items: [item("dc4i1", "Connaissance de la procédure de signalement", "Conforme"), item("dc4i2", "Réflexe face à un e-mail suspect", "Écart", "Hésitation constatée"), item("dc4i3", "Verrouillage de session", "Écart", "Non systématique")],
      events: [ev("dc4e1", "creation", "Contrôle créé (Réalisé)", day(-10), "", "Réalisé")] }),
    base({ id: "dc5", ref: "CTRL-2026-005", title: "Test d'intrusion physique (tailgating)", type: "Test / exercice", service: "DSI", inspectorId: "u6", status: "Réalisé",
      items: [item("dc5i1", "Contrôle du sas d'entrée", "Écart", "Tailgating réussi 2 fois"), item("dc5i2", "Réaction du personnel", "Écart", "Aucun signalement")],
      events: [ev("dc5e1", "creation", "Contrôle créé (Réalisé)", day(-8), "", "Réalisé"), ev("dc5e2", "action", "Débrief avec l'accueil", day(-7))] }),
    // Contrôle planifié (en cours) mené par le RSSI.
    base({ id: "dc6", ref: "CTRL-2026-006", title: "Revue documentaire — PRA", type: "Revue documentaire", service: "DSI", inspectorId: "u1", status: "En cours", date: null, createdBy: "u1",
      items: [item("dc6i1", "PRA à jour", "À vérifier"), item("dc6i2", "Dernier test de bascule", "À vérifier")],
      events: [ev("dc6e1", "creation", "Contrôle créé (Planifié)", day(-5), "", "Planifié", "u1"), ev("dc6e2", "statut", "Statut : Planifié → En cours", day(-3), "Planifié", "En cours", "u1")] }),
  ];
}

/* ---------- Plan d'actions (CAPA) ---------- */
export function seedCapa(): CapaAction[] {
  const base = (o: Partial<CapaAction> & { id: string; ref: string; title: string }): CapaAction => ({
    description: "",
    type: "Corrective",
    priority: "Normale",
    sourceType: "controle",
    sourceId: null,
    ownerId: "u6",
    dueDate: day(20),
    status: "Ouverte",
    verification: "",
    closedAt: null,
    createdBy: "u6",
    createdAt: day(-12),
    updatedAt: day(-6),
    ...o,
  });
  return [
    base({ id: "dcp1", ref: "CAPA-2026-001", title: "Corriger : Postes déverrouillés (RH)", sourceType: "controle", sourceId: "dc1i1", ownerId: "u6", priority: "Haute", status: "Clôturée", closedAt: day(-8), verification: "Nouvelle ronde : conforme." }),
    base({ id: "dcp2", ref: "CAPA-2026-002", title: "Vérification périodique des extincteurs", sourceType: "controle", sourceId: "dc2i2", ownerId: "u6", priority: "Normale", status: "Réalisée" }),
    base({ id: "dcp3", ref: "CAPA-2026-003", title: "Supprimer les comptes orphelins", sourceType: "controle", sourceId: "dc3i1", ownerId: "u3", priority: "Haute", status: "Clôturée", closedAt: day(-5), verification: "Comptes désactivés et tracés." }),
    // En retard (échéance passée, non clôturée) → illustre la détection.
    base({ id: "dcp4", ref: "CAPA-2026-004", title: "Renforcer le contrôle du sas (anti-tailgating)", sourceType: "controle", sourceId: "dc5i1", ownerId: "u6", priority: "Critique", status: "En cours", dueDate: day(-4) }),
    base({ id: "dcp5", ref: "CAPA-2026-005", title: "Campagne de sensibilisation anti-hameçonnage", sourceType: "risque", sourceId: "dr4", ownerId: "u3", type: "Préventive", priority: "Haute", status: "En cours", dueDate: day(35) }),
  ];
}

/* ---------- Plan de travail (chantiers) ---------- */
export function seedPlan(): GrcPlanItem[] {
  const base = (o: Partial<GrcPlanItem> & { id: string; ref: string; title: string }): GrcPlanItem => ({
    category: "Conformité",
    year: Y(),
    quarter: "T1",
    ownerId: "u3",
    priority: "Normale",
    status: "En cours",
    progress: 40,
    dueDate: day(60),
    description: "",
    createdBy: "u1",
    createdAt: day(-60),
    updatedAt: day(-5),
    ...o,
  });
  return [
    base({ id: "dpl1", ref: "PLAN-2026-001", title: "Préparer la certification ISO 27001", category: "Conformité", quarter: "T1", ownerId: "u3", priority: "Haute", status: "En cours", progress: 55 }),
    base({ id: "dpl2", ref: "PLAN-2026-002", title: "Campagne de sensibilisation (4 vagues)", category: "Sensibilisation", quarter: "T2", ownerId: "u6", priority: "Normale", status: "En cours", progress: 30 }),
    base({ id: "dpl3", ref: "PLAN-2026-003", title: "Revue des accès à privilèges", category: "Audit / Contrôle", quarter: "T1", ownerId: "u6", priority: "Haute", status: "Terminé", progress: 100 }),
    base({ id: "dpl4", ref: "PLAN-2026-004", title: "Cartographie des risques (mise à jour annuelle)", category: "Gestion des risques", quarter: "T2", ownerId: "u1", priority: "Haute", status: "En cours", progress: 45 }),
    base({ id: "dpl5", ref: "PLAN-2026-005", title: "Refonte du corpus documentaire (politiques)", category: "Politiques", quarter: "T3", ownerId: "u3", priority: "Normale", status: "À planifier", progress: 0 }),
  ];
}

/* ---------- Audit : grilles de départ + audits de démonstration ---------- */
export function seedAuditGrids(): AuditGrid[] {
  return STARTER_AUDIT_GRIDS.map((g, i) => ({
    id: `gid${i + 1}`,
    ref: `GRID-${Y()}-${String(i + 1).padStart(3, "0")}`,
    name: g.name,
    category: g.category,
    source: g.source,
    description: g.description,
    questions: starterQuestions(g),
    createdBy: "u6",
    createdAt: day(-120),
    updatedAt: day(-30),
  }));
}

export function seedAudits(): Audit[] {
  const grids = seedAuditGrids();
  const byKey = (k: string) => grids.find((g) => g.questions[0]?.id.startsWith(k + "-"))!;
  const resp = (ans: Record<string, string>): AuditResponse[] =>
    Object.entries(ans).map(([questionId, answer]) => ({ questionId, answer, note: "", evidence: "", severity: "", recommendation: "", mgmtResponse: "" }));

  const backup = byKey("backup");
  const ad = byKey("ad");
  return [
    {
      id: "aud1", ref: `AUD-${Y()}-001`, title: "Audit sauvegardes — SRV-BACKUP-01",
      gridId: backup.id, gridName: backup.name, category: backup.category, questions: backup.questions,
      targetAssetId: null, targetLabel: "SRV-BACKUP-01", auditorId: "u6", date: day(-14), status: "Terminé",
      responses: resp({ "backup-q1": "Oui", "backup-q2": "Partiel", "backup-q3": "Oui", "backup-q4": "Oui", "backup-q5": "Partiel", "backup-q6": "Oui", "backup-q7": "Non" }),
      summary: "Bon niveau global ; renforcer l'immuabilité et la supervision des échecs.",
      createdBy: "u6", createdAt: day(-14), updatedAt: day(-13),
    },
    {
      id: "aud2", ref: `AUD-${Y()}-002`, title: "Durcissement AD — Contrôleurs de domaine",
      gridId: ad.id, gridName: ad.name, category: ad.category, questions: ad.questions,
      targetAssetId: null, targetLabel: "AD — Forêt principale", auditorId: "u6", date: day(-3), status: "En cours",
      responses: resp({ "ad-q1": "Partiel", "ad-q2": "Non", "ad-q3": "Oui", "ad-q4": "Partiel", "ad-q6": "Oui" }),
      summary: "",
      createdBy: "u6", createdAt: day(-3), updatedAt: day(-1),
    },
  ];
}

/* ---------- Programme d'audit annuel ---------- */
export function seedAuditPlan(): AuditPlanItem[] {
  const y = Y();
  const base = (o: Partial<AuditPlanItem> & { id: string; ref: string; title: string }): AuditPlanItem => ({
    category: "Autre", riskLevel: "Moyen", year: y, quarter: "T1", ownerId: "u6",
    targetAssetId: null, targetLabel: "", gridId: "", auditId: "", plannedDate: day(30), status: "Planifié", objective: "",
    createdBy: "u6", createdAt: day(-60), updatedAt: day(-10), ...o,
  });
  return [
    base({ id: "apl1", ref: `PROG-${y}-001`, title: "Audit des sauvegardes", category: "Sauvegardes / Restauration", riskLevel: "Élevé", quarter: "T1", targetLabel: "SRV-BACKUP-01", gridId: "gid1", auditId: "aud1", status: "Réalisé", plannedDate: day(-14), objective: "Vérifier la résilience anti-rançongiciel des sauvegardes." }),
    base({ id: "apl2", ref: `PROG-${y}-002`, title: "Durcissement Active Directory", category: "Active Directory / GPO", riskLevel: "Élevé", quarter: "T1", targetLabel: "AD — Forêt principale", gridId: "gid2", auditId: "aud2", status: "En cours", plannedDate: day(-3), objective: "Réduire la surface d'attaque de l'annuaire." }),
    base({ id: "apl3", ref: `PROG-${y}-003`, title: "Revue de la journalisation & du SIEM", category: "Journalisation / SIEM", riskLevel: "Moyen", quarter: "T2", gridId: "gid3", status: "Planifié", plannedDate: day(60), objective: "S'assurer de la couverture des événements de sécurité clés." }),
    base({ id: "apl4", ref: `PROG-${y}-004`, title: "Durcissement des serveurs Windows exposés", category: "Durcissement serveur", riskLevel: "Élevé", quarter: "T3", gridId: "gid4", status: "Planifié", plannedDate: day(140), objective: "Contrôler la conformité des serveurs au socle de durcissement." }),
    base({ id: "apl5", ref: `PROG-${y}-005`, title: "Audit de la configuration cloud (SaaS)", category: "Cloud / SaaS", riskLevel: "Moyen", quarter: "T4", status: "Planifié", plannedDate: day(220), objective: "Évaluer la sécurité des services SaaS critiques." }),
  ];
}

/* ---------- Auditeurs & compétences ---------- */
export function seedAuditors(): Auditor[] {
  const base = (o: Partial<Auditor> & { id: string; ref: string; name: string }): Auditor => ({
    profileId: "", role: "Auditeur", competencies: [], certifications: "", independence: "Aucun conflit d'intérêt déclaré.", status: "Actif", notes: "",
    createdBy: "u6", createdAt: day(-90), updatedAt: day(-15), ...o,
  });
  return [
    base({ id: "audr1", ref: `AUDR-${Y()}-001`, name: "Responsable Audit", profileId: "u6", role: "Auditeur principal", competencies: ["Active Directory / GPO", "Durcissement serveur", "Journalisation / SIEM"], certifications: "ISO 27001 Lead Auditor, CISA" }),
    base({ id: "audr2", ref: `AUDR-${Y()}-002`, name: "Auditeur Système & Réseau", profileId: "u1", role: "Auditeur", competencies: ["Réseau / Pare-feu", "Système Linux", "Télétravail / VPN"], certifications: "PASSI, CEH" }),
    base({ id: "audr3", ref: `AUDR-${Y()}-003`, name: "Expert Applications", role: "Expert technique", competencies: ["Applications Web / API", "Développement sécurisé", "Bases de données"], certifications: "OSCP" }),
  ];
}

/* ---------- SOC : runbooks de départ (démonstration) ---------- */
export function seedRunbooks(): Runbook[] {
  return STARTER_RUNBOOKS.map((g, i) => ({
    id: `rb${i + 1}`,
    ref: `RB-${Y()}-${String(i + 1).padStart(3, "0")}`,
    title: g.title,
    category: g.category,
    severity: g.severity,
    trigger: g.trigger,
    objective: g.objective,
    attackTechniques: g.attackTechniques,
    steps: starterRunbookSteps(g),
    escalation: g.escalation,
    references: g.references,
    status: "Validé",
    ownerId: "u1",
    createdBy: "u1",
    createdAt: day(-100),
    updatedAt: day(-20),
  }));
}

/* ---------- SOC : procédures & checklists de départ (démonstration) ---------- */
export function seedSocProcedures(): SocProcedure[] {
  return STARTER_PROCEDURES.map((p, i) => ({
    id: `proc${i + 1}`,
    ref: `PROC-${Y()}-${String(i + 1).padStart(3, "0")}`,
    title: p.title, type: p.type, frequency: p.frequency, objective: p.objective, content: p.content,
    items: starterProcedureItems(p), references: p.references, status: "Validé", ownerId: "u1",
    createdBy: "u1", createdAt: day(-100), updatedAt: day(-20),
  }));
}
