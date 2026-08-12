"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyAction as mockApply,
  createItem as mockCreate,
  setRelanceDate as mockSetRelanceDate,
  addBlocageAction as mockAddBlocageAction,
  setAppreciation as mockSetAppreciation,
  seedProjects,
  seedObjectives,
  seedAssets,
  seedRisks,
  seedPolicies,
  seedFieldControls,
  seedCapa,
  seedPlan,
  seedDirections,
  seedTraining,
  seedMissions,
  seedSuppliers,
  seedContinuity,
  seedIncidents,
  seedProcessing,
  seedReviews,
  seedAuditGrids,
  seedAudits,
  seedAuditPlan,
  seedAuditors,
  seedRunbooks,
  seedSocProcedures,
  seedIntel,
  seedOnCall,
  DEFAULT_USER_ID,
  listNotifications,
  PROFILES,
  seedItems,
} from "@/lib/data";
import {
  computeGame,
  computeScores,
  DEFAULT_CATALOGUE,
  DEFAULT_REF_LISTS,
  DEFAULT_TEMPLATES,
  isReadOnly,
  LEVELS,
  reminderState,
  weeklyChallenges,
  weekStart,
  type AppSettings,
  type Contact,
  type ConversationSummary,
  type EmailTemplate,
  type Meeting,
  type MeetingLink,
  type MeetingParticipant,
  type Message,
  type Asset,
  type CapaAction,
  type ContinuityPlan,
  type ControlAssessment,
  type Direction,
  type DirectionReview,
  type FieldControl,
  type GrcPlanItem,
  type Incident,
  type Mission,
  type Negligence,
  type NonConformite,
  type Objective,
  type Policy,
  type ProcessingActivity,
  type RefLists,
  type Catalogue,
  type Item,
  type Notif,
  type ParsedSubject,
  type Person,
  type Priorite,
  type Profile,
  type Project,
  type ProjectStatus,
  type ReminderState,
  type Risk,
  type RiskControlRef,
  type RiskLink,
  type Role,
  type Score,
  type Audit,
  type AuditGrid,
  type AuditPlanItem,
  type Auditor,
  type Runbook,
  type SocProcedure,
  type AttackCoverage,
  type IntelItem,
  type OnCallShift,
  type Supplier,
  type Report,
  type ReportRefType,
  type Task,
  type TaskRecurrence,
  type TaskPriority,
  type TaskStatus,
  type TrainingCourse,
  type TrainingDone,
  type TrainingProgressEntry,
} from "@/lib/domain";
import { ORG_NAME } from "@/lib/config";
import { fireConfetti } from "@/lib/confetti";

type Action = "relance" | "reponse" | "bloque" | "cloture";
interface TaskPayload {
  projectId?: string;
  taskId?: string;
  title?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string;
  priority?: TaskPriority;
}
interface ProjectFields {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string | null;
  deadline?: string | null;
}
export interface TaskInput {
  id?: string;
  title?: string;
  description?: string;
  assigneeId?: string | null;
  projectId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
}
export interface SubtaskInput {
  taskId?: string;
  subtaskId?: string;
  title?: string;
  done?: boolean;
}
export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  /** Bulle « push » (notification entrante) : icône cloche + cliquable. */
  push?: boolean;
  /** Cible de navigation au clic (route interne). */
  href?: string | null;
}
type CatalogueAction =
  | { op: "add" | "update"; kind: "metier"; code: string; label: string; tone: string }
  | { op: "add" | "update"; kind: "type"; code: string; label: string; slaRelance: string; slaEscalade: string; urgent: boolean }
  | { op: "delete"; kind: "metier" | "type"; code: string };
interface MsgTarget {
  convId?: string;
  refType?: string;
  refId?: string;
}
interface NegligenceForm {
  itemId?: string | null;
  objet?: string;
  service?: string;
  concerne?: string;
  gravite?: string;
  risque?: string;
  impact?: string;
  description?: string;
}
type NonConformiteForm = NegligenceForm & { policy?: string };
export interface RiskInput {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  probability?: number;
  impact?: number;
  residualProbability?: number;
  residualImpact?: number;
  assetId?: string | null;
  threat?: string;
  vulnerability?: string;
  treatment?: string;
  treatmentPlan?: string;
  status?: string;
  ownerId?: string;
  reviewDate?: string | null;
  links?: RiskLink[];
  controls?: RiskControlRef[];
}
export interface PolicyInput {
  id?: string;
  title?: string;
  reference?: string;
  domain?: string;
  version?: string;
  status?: string;
  summary?: string;
  url?: string;
  ownerId?: string;
  publishedAt?: string | null;
  reviewDate?: string | null;
}
export interface AssetInput {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  ownerId?: string;
  service?: string;
  confidentiality?: number;
  integrity?: number;
  availability?: number;
  status?: string;
  reviewDate?: string | null;
}
export interface ControlInput {
  applicable?: boolean;
  justification?: string;
  status?: string;
  maturity?: number;
  responsibleId?: string;
  evidence?: string;
  note?: string;
  lastAssessedAt?: string | null;
  nextReviewAt?: string | null;
}
export interface CheckItemInput { label: string; result?: string; note?: string; frameworkId?: string; controlCode?: string }
export interface FieldControlInput {
  id?: string;
  title?: string;
  type?: string;
  service?: string;
  location?: string;
  date?: string | null;
  inspectorId?: string;
  status?: string;
  summary?: string;
  items?: CheckItemInput[];
}
export interface CapaInput {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  sourceType?: string;
  sourceId?: string | null;
  ownerId?: string;
  dueDate?: string | null;
  status?: string;
  verification?: string;
}
export interface PlanInput {
  id?: string;
  title?: string;
  category?: string;
  year?: number;
  quarter?: string;
  ownerId?: string;
  priority?: string;
  status?: string;
  progress?: number;
  dueDate?: string | null;
  description?: string;
}
export interface DirectionInput {
  id?: string;
  name?: string;
  code?: string;
  headId?: string;
  description?: string;
  services?: { name: string; headId?: string }[];
}
export interface MissionInput {
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  description?: string;
  ownerId?: string;
  status?: string;
  assetIds?: string[];
  peopleIds?: string[];
  dependencies?: import("@/lib/domain").MissionDependency[];
}
export interface SupplierInput {
  id?: string;
  name?: string;
  type?: string;
  criticality?: string;
  service?: string;
  dataAccess?: string;
  ownerId?: string;
  status?: string;
  contractEnd?: string | null;
  reviewDate?: string | null;
  assetIds?: string[];
  notes?: string;
}
export interface AuditGridInput {
  id?: string;
  name?: string;
  category?: string;
  source?: string;
  description?: string;
  questions?: import("@/lib/domain").AuditQuestion[];
}
export interface AuditInput {
  id?: string;
  title?: string;
  gridId?: string;
  // Questionnaire manuel (ad hoc) — si aucune grille n'est fournie :
  questions?: import("@/lib/domain").AuditQuestion[];
  gridName?: string;
  category?: string;
  saveAsGrid?: boolean;
  targetAssetId?: string | null;
  targetLabel?: string;
  auditorId?: string;
  date?: string | null;
  status?: string;
  responses?: import("@/lib/domain").AuditResponse[];
  summary?: string;
}
export interface OnCallInput {
  id?: string;
  personId?: string;
  role?: string;
  start?: string;
  end?: string;
  contact?: string;
  notes?: string;
}
export interface IntelInput {
  id?: string;
  kind?: string;
  title?: string;
  iocType?: string;
  value?: string;
  tlp?: string;
  severity?: string;
  source?: string;
  status?: string;
  description?: string;
  action?: string;
  attackTechniques?: string[];
  expiresAt?: string | null;
  ownerId?: string;
}
export interface SocProcedureInput {
  id?: string;
  title?: string;
  type?: string;
  frequency?: string;
  objective?: string;
  content?: string;
  items?: import("@/lib/domain").SocChecklistItem[];
  references?: string;
  status?: string;
  ownerId?: string;
}
export interface RunbookInput {
  id?: string;
  title?: string;
  category?: string;
  severity?: string;
  trigger?: string;
  objective?: string;
  attackTechniques?: string[];
  steps?: import("@/lib/domain").RunbookStep[];
  escalation?: string;
  references?: string;
  status?: string;
  ownerId?: string;
}
export interface AuditorInput {
  id?: string;
  profileId?: string;
  name?: string;
  role?: string;
  competencies?: string[];
  certifications?: string;
  independence?: string;
  status?: string;
  notes?: string;
}
export interface AuditPlanInput {
  id?: string;
  title?: string;
  category?: string;
  riskLevel?: string;
  year?: number;
  quarter?: string;
  ownerId?: string;
  targetAssetId?: string | null;
  targetLabel?: string;
  gridId?: string;
  auditId?: string;
  plannedDate?: string | null;
  status?: string;
  objective?: string;
}
export interface ReviewInput {
  id?: string;
  title?: string;
  date?: string | null;
  period?: string;
  participantIds?: string[];
  contextChanges?: string;
  riskReview?: string;
  complianceReview?: string;
  incidentsReview?: string;
  objectivesReview?: string;
  feedback?: string;
  decisions?: string;
  actions?: string;
  kpiSnapshot?: Record<string, number>;
  nextReviewDate?: string | null;
  status?: string;
}
export interface ProcessingInput {
  id?: string;
  name?: string;
  purpose?: string;
  legalBasis?: string;
  dataCategories?: string[];
  sensitiveData?: boolean;
  dataSubjects?: string;
  recipients?: string;
  retention?: string;
  transfersOutsideEU?: boolean;
  transferDetails?: string;
  ownerId?: string;
  service?: string;
  securityMeasures?: string;
  assetIds?: string[];
  piaRequired?: boolean;
  piaStatus?: string;
  piaRisk?: string;
  piaNotes?: string;
  status?: string;
  reviewDate?: string | null;
}
export interface IncidentInput {
  id?: string;
  title?: string;
  type?: string;
  severity?: string;
  status?: string;
  dataBreach?: boolean;
  detectedAt?: string | null;
  declaredBy?: string;
  ownerId?: string;
  missionId?: string;
  assetIds?: string[];
  description?: string;
  impact?: string;
  actionsTaken?: string;
  resolvedAt?: string | null;
  rootCause?: string;
  lessons?: string;
}
export interface ContinuityInput {
  id?: string;
  activity?: string;
  missionId?: string;
  ownerId?: string;
  criticality?: string;
  mtpd?: string;
  rto?: string;
  rpo?: string;
  impacts?: string[];
  strategy?: string;
  resources?: string;
  procedure?: string;
  assetIds?: string[];
  lastTestDate?: string | null;
  reviewDate?: string | null;
  status?: string;
}
type RefListKey = "appreciation" | "cause" | "action" | "decision" | "service" | "policy";
type RefListActionPayload =
  | { op: "add"; listKey: RefListKey; label: string; icon?: string }
  | { op: "delete"; listKey: RefListKey; value: string };

interface AppCtx {
  demo: boolean;
  ready: boolean;
  items: Item[];
  now: Date;
  me: Profile;
  meId: string;
  setMeId: (id: string) => void;
  profiles: Profile[];
  profileById: (id: string) => Profile;
  setProfileGrc: (id: string, grcMember: boolean) => void;
  updateAccount: (fields: { fullName?: string; poste?: string; avatar?: string }) => Promise<boolean>;
  catalogue: Catalogue;
  rs: (item: Item) => ReminderState;
  scores: Score[];
  orgName: string;
  orgLogo: string;
  emailEnabled: boolean;
  digestHour: string;
  applySettings: (s: AppSettings) => void;
  open: Item | null;
  openItem: (i: Item) => void;
  closeItem: () => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  showImport: boolean;
  setShowImport: (v: boolean) => void;
  importEmailResponse: (itemId: string, file: File) => Promise<boolean>;
  createItemFromEmail: (file: File, opts: { metier: string; type: string; prio: string; objet: string; dest: string }) => Promise<boolean>;
  correctDestinataire: (oldName: string, newName: string) => Promise<string | null>;
  meetings: Meeting[];
  meetingById: (id: string) => Meeting | undefined;
  createMeeting: (input: MeetingInput) => Promise<string | null>;
  updateMeeting: (id: string, fields: MeetingInput) => Promise<string | null>;
  deleteMeeting: (id: string) => Promise<string | null>;
  contacts: Contact[];
  createContact: (c: Omit<Contact, "id">) => Promise<string | null>;
  updateContact: (id: string, f: Partial<Omit<Contact, "id">>) => Promise<string | null>;
  deleteContact: (id: string) => Promise<string | null>;
  act: (item: Item, action: Action, cause?: string) => void;
  bulkAct: (ids: string[], action: Action) => Promise<{ applied: number; skipped: number } | null>;
  setItemLate: (item: Item, late: boolean) => Promise<boolean>;
  sendRelanceEmail: (item: Item, templateId: string) => Promise<boolean>;
  create: (parsed: ParsedSubject, prio: Priorite, dest: string, destService: string, points: string, nonConformite?: boolean, dueDurationDays?: number | null, destEmail?: string, published?: boolean) => void;
  setRelanceDate: (item: Item, date: string | null) => void;
  /** Publier (irréversible) un suivi / projet / tâche : le rend visible par l'équipe. */
  publishItem: (id: string) => Promise<boolean>;
  publishProject: (id: string) => Promise<boolean>;
  publishTask: (id: string) => Promise<boolean>;
  updateItem: (
    item: Item,
    fields: { objet?: string; priorite?: Priorite; pointsCles?: string[]; personnes?: Person[]; dueDurationDays?: number | null }
  ) => Promise<boolean>;
  addBlocageAction: (item: Item, kind: string, concerne: string, note: string) => void;
  setAppreciation: (item: Item, appreciation: string | null) => void;
  updateRole: (userId: string, role: Role) => Promise<string | null>;
  catalogueAction: (action: CatalogueAction) => Promise<string | null>;
  refLists: RefLists;
  refListAction: (action: RefListActionPayload) => Promise<string | null>;
  templates: EmailTemplate[];
  templateAction: (op: "create" | "update" | "delete", input: Record<string, unknown>) => Promise<string | null>;
  negligences: Negligence[];
  negligenceById: (id: string) => Negligence | null;
  negligenceByItem: (itemId: string) => Negligence | null;
  createNegligence: (form: NegligenceForm) => Promise<string | null>;
  updateNegligence: (id: string, fields: Partial<NegligenceForm>) => Promise<string | null>;
  setNegligenceStatus: (id: string, status: string) => Promise<string | null>;
  setNegligenceDecisions: (id: string, decisions: string[]) => Promise<string | null>;
  nonConformites: NonConformite[];
  nonConformiteById: (id: string) => NonConformite | null;
  nonConformiteByItem: (itemId: string) => NonConformite | null;
  createNonConformite: (form: NonConformiteForm) => Promise<string | null>;
  updateNonConformite: (id: string, fields: Partial<NonConformiteForm>) => Promise<string | null>;
  setNonConformiteStatus: (id: string, status: string) => Promise<string | null>;
  setNonConformiteDecisions: (id: string, decisions: string[]) => Promise<string | null>;
  notifications: Notif[];
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  alerts: number;
  signOut: () => void;
  // Messagerie
  conversations: ConversationSummary[];
  messagesUnread: number;
  loadMessages: (t: MsgTarget) => Promise<{ conversationId: string | null; messages: Message[]; muted: boolean }>;
  muteConversation: (t: MsgTarget, muted: boolean) => Promise<boolean>;
  sendMessage: (t: MsgTarget, body: string, replyTo?: string | null) => Promise<Message[]>;
  sendMessageFile: (t: MsgTarget, file: File, body?: string, replyTo?: string | null) => Promise<{ messages: Message[]; error: string | null }>;
  onlineIds: string[];
  isOnline: (profileId: string) => boolean;
  pingPresence: (convId?: string | null, typing?: boolean) => Promise<{ onlineIds: string[]; memberIds: string[]; typing: string[]; reads: Record<string, string> }>;
  reactToMessage: (messageId: string, emoji: string) => Promise<Message[] | null>;
  createGroup: (title: string, memberIds: string[]) => Promise<string | null>;
  startDirect: (profileId: string) => Promise<string | null>;
  deleteMessage: (messageId: string) => Promise<Message[] | null>;
  deleteGroup: (convId: string) => Promise<string | null>;
  markConversationRead: (convId: string) => void;
  // Module Projet
  projects: Project[];
  projectById: (id: string) => Project | null;
  createProject: (
    name: string,
    description: string,
    deadline: string | null,
    memberIds?: string[],
    startDate?: string | null
  ) => Promise<string | null>;
  updateProject: (id: string, fields: ProjectFields) => Promise<string | null>;
  projectTask: (action: "add" | "update" | "delete", payload: TaskPayload) => Promise<string | null>;
  projectMember: (action: "add" | "remove", projectId: string, profileId: string) => Promise<string | null>;
  projectNote: (projectId: string, body: string) => Promise<string | null>;
  proposeProjectTask: (projectId: string, payload: { title: string; description?: string; dueDate?: string | null }) => Promise<string | null>;
  decideProjectProposal: (proposalId: string, approve: boolean, note?: string) => Promise<string | null>;
  attachItemToProject: (itemId: string, projectId: string | null) => Promise<string | null>;
  requestProjectStatus: (id: string, status: string) => Promise<string | null>;
  decideProjectStatus: (id: string, approve: boolean) => Promise<string | null>;
  requestProjectClosure: (id: string, summary: string, deliverables: string[]) => Promise<string | null>;
  decideProjectClosure: (id: string, approve: boolean, note?: string) => Promise<string | null>;
  archiveProject: (id: string, archived: boolean) => Promise<string | null>;
  requestProjectDeletion: (id: string, reason: string) => Promise<string | null>;
  decideProjectDeletion: (id: string, approve: boolean, note?: string) => Promise<string | null>;
  /** Suppression directe, réservée au directeur et à l'administrateur. */
  deleteProjectNow: (id: string) => Promise<string | null>;
  // Tâches (productivité)
  tasks: Task[];
  taskAction: (op: "create" | "update" | "delete", input: TaskInput) => Promise<string | null>;
  // Comptes rendus (points d'avancement et bilans de clôture)
  reports: Report[];
  /** Comptes rendus d'un objet, du plus récent au plus ancien. */
  reportsFor: (refType: ReportRefType, refId: string) => Report[];
  reportAction: (op: "create" | "update" | "delete", input: Record<string, unknown>) => Promise<string | null>;
  // Tâches récurrentes (gabarits qui engendrent les occurrences)
  recurrences: TaskRecurrence[];
  /** Occurrences engendrées par gabarit : total et restant à faire. */
  recurrenceCounts: Record<string, { total: number; open: number }>;
  recurrenceAction: (
    op: "create" | "update" | "toggle" | "delete" | "run",
    input: Record<string, unknown>
  ) => Promise<string | null>;
  // Plan de l'année (objectifs)
  objectives: Objective[];
  objectiveAction: (op: "create" | "update" | "downgrade" | "achieve" | "delete", input: Record<string, unknown>) => Promise<string | null>;
  // GRC : registre des risques
  risks: Risk[];
  riskById: (id: string) => Risk | null;
  createRisk: (input: RiskInput) => Promise<string | null>;
  updateRisk: (id: string, fields: RiskInput) => Promise<string | null>;
  setRiskStatus: (id: string, status: string) => Promise<string | null>;
  deleteRisk: (id: string) => Promise<string | null>;
  acceptRisk: (id: string, acceptUntil: string | null, justification: string) => Promise<string | null>;
  reviewRisk: (id: string, note: string) => Promise<string | null>;
  // GRC : politiques de sécurité
  policies: Policy[];
  policyById: (id: string) => Policy | null;
  createPolicy: (input: PolicyInput) => Promise<string | null>;
  updatePolicy: (id: string, fields: PolicyInput) => Promise<string | null>;
  deletePolicy: (id: string) => Promise<string | null>;
  setPolicyDiffusion: (id: string, service: string, stage: string, note?: string) => Promise<string | null>;
  removePolicyDiffusion: (id: string, service: string) => Promise<string | null>;
  // GRC : registre des actifs
  assets: Asset[];
  assetById: (id: string) => Asset | null;
  createAsset: (input: AssetInput) => Promise<string | null>;
  updateAsset: (id: string, fields: AssetInput) => Promise<string | null>;
  deleteAsset: (id: string) => Promise<string | null>;
  // GRC : conformité (évaluation des mesures)
  controlAssessments: ControlAssessment[];
  assessControl: (frameworkId: string, controlCode: string, fields: ControlInput) => Promise<string | null>;
  resetControl: (frameworkId: string, controlCode: string) => Promise<string | null>;
  // GRC : contrôles terrain
  fieldControls: FieldControl[];
  fieldControlById: (id: string) => FieldControl | null;
  createFieldControl: (input: FieldControlInput) => Promise<string | null>;
  updateFieldControl: (id: string, fields: FieldControlInput) => Promise<string | null>;
  deleteFieldControl: (id: string) => Promise<string | null>;
  addControlEvent: (id: string, label: string) => Promise<string | null>;
  // GRC : plan d'actions (CAPA)
  capaActions: CapaAction[];
  capaById: (id: string) => CapaAction | null;
  createCapa: (input: CapaInput) => Promise<string | null>;
  updateCapa: (id: string, fields: CapaInput) => Promise<string | null>;
  setCapaStatus: (id: string, status: string) => Promise<string | null>;
  deleteCapa: (id: string) => Promise<string | null>;
  // GRC : plan de travail (chantiers)
  planItems: GrcPlanItem[];
  planItemById: (id: string) => GrcPlanItem | null;
  createPlanItem: (input: PlanInput) => Promise<string | null>;
  updatePlanItem: (id: string, fields: PlanInput) => Promise<string | null>;
  setPlanStatus: (id: string, status: string) => Promise<string | null>;
  deletePlanItem: (id: string) => Promise<string | null>;
  // GRC : organigramme (directions → services)
  directions: Direction[];
  directionById: (id: string) => Direction | null;
  createDirection: (input: DirectionInput) => Promise<string | null>;
  updateDirection: (id: string, fields: DirectionInput) => Promise<string | null>;
  deleteDirection: (id: string) => Promise<string | null>;
  // GRC : Académie (entraînement)
  trainingCourses: TrainingCourse[];
  trainingDone: TrainingDone[];
  trainingProgressAll: TrainingProgressEntry[];
  completeLesson: (lessonId: string, score: number) => Promise<string | null>;
  trainingEdit: (op: string, input: Record<string, unknown>) => Promise<string | null>;
  // GRC : missions & dépendances
  missions: Mission[];
  missionById: (id: string) => Mission | null;
  createMission: (input: MissionInput) => Promise<string | null>;
  updateMission: (id: string, fields: MissionInput) => Promise<string | null>;
  deleteMission: (id: string) => Promise<string | null>;
  // GRC : fournisseurs & prestataires
  suppliers: Supplier[];
  supplierById: (id: string) => Supplier | null;
  createSupplier: (input: SupplierInput) => Promise<string | null>;
  updateSupplier: (id: string, fields: SupplierInput) => Promise<string | null>;
  deleteSupplier: (id: string) => Promise<string | null>;
  auditGrids: AuditGrid[];
  auditGridById: (id: string) => AuditGrid | null;
  createAuditGrid: (input: AuditGridInput) => Promise<string | null>;
  updateAuditGrid: (id: string, fields: AuditGridInput) => Promise<string | null>;
  deleteAuditGrid: (id: string) => Promise<string | null>;
  audits: Audit[];
  auditById: (id: string) => Audit | null;
  createAudit: (input: AuditInput) => Promise<string | null>;
  updateAudit: (id: string, fields: AuditInput) => Promise<string | null>;
  deleteAudit: (id: string) => Promise<string | null>;
  auditPlanItems: AuditPlanItem[];
  createAuditPlanItem: (input: AuditPlanInput) => Promise<string | null>;
  updateAuditPlanItem: (id: string, fields: AuditPlanInput) => Promise<string | null>;
  deleteAuditPlanItem: (id: string) => Promise<string | null>;
  auditors: Auditor[];
  createAuditor: (input: AuditorInput) => Promise<string | null>;
  updateAuditor: (id: string, fields: AuditorInput) => Promise<string | null>;
  deleteAuditor: (id: string) => Promise<string | null>;
  runbooks: Runbook[];
  runbookById: (id: string) => Runbook | null;
  createRunbook: (input: RunbookInput) => Promise<string | null>;
  updateRunbook: (id: string, fields: RunbookInput) => Promise<string | null>;
  deleteRunbook: (id: string) => Promise<string | null>;
  socProcedures: SocProcedure[];
  createSocProcedure: (input: SocProcedureInput) => Promise<string | null>;
  updateSocProcedure: (id: string, fields: SocProcedureInput) => Promise<string | null>;
  deleteSocProcedure: (id: string) => Promise<string | null>;
  attackCoverage: AttackCoverage[];
  assessAttack: (techniqueId: string, fields: { status?: string; detectionNote?: string }) => Promise<string | null>;
  resetAttack: (techniqueId: string) => Promise<string | null>;
  intel: IntelItem[];
  createIntel: (input: IntelInput) => Promise<string | null>;
  updateIntel: (id: string, fields: IntelInput) => Promise<string | null>;
  deleteIntel: (id: string) => Promise<string | null>;
  onCall: OnCallShift[];
  createOnCall: (input: OnCallInput) => Promise<string | null>;
  updateOnCall: (id: string, fields: OnCallInput) => Promise<string | null>;
  deleteOnCall: (id: string) => Promise<string | null>;
  // GRC : continuité d'activité (BIA/PCA)
  continuityPlans: ContinuityPlan[];
  continuityById: (id: string) => ContinuityPlan | null;
  createContinuity: (input: ContinuityInput) => Promise<string | null>;
  updateContinuity: (id: string, fields: ContinuityInput) => Promise<string | null>;
  deleteContinuity: (id: string) => Promise<string | null>;
  // GRC : gestion des incidents
  incidents: Incident[];
  incidentById: (id: string) => Incident | null;
  createIncident: (input: IncidentInput) => Promise<string | null>;
  updateIncident: (id: string, fields: IncidentInput) => Promise<string | null>;
  setIncidentStatus: (id: string, status: string) => Promise<string | null>;
  deleteIncident: (id: string) => Promise<string | null>;
  // GRC : RGPD (registre des traitements + AIPD)
  processing: ProcessingActivity[];
  processingById: (id: string) => ProcessingActivity | null;
  createProcessing: (input: ProcessingInput) => Promise<string | null>;
  updateProcessing: (id: string, fields: ProcessingInput) => Promise<string | null>;
  deleteProcessing: (id: string) => Promise<string | null>;
  // GRC : revue de direction
  reviews: DirectionReview[];
  reviewById: (id: string) => DirectionReview | null;
  createReview: (input: ReviewInput) => Promise<string | null>;
  updateReview: (id: string, fields: ReviewInput) => Promise<string | null>;
  deleteReview: (id: string) => Promise<string | null>;
  subtaskAction: (op: "add" | "toggle" | "rename" | "delete", input: SubtaskInput) => Promise<string | null>;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  // Son des notifications
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  pushEnabled: boolean;
  setPushEnabled: (v: boolean) => void;
  // Compte en lecture seule (DSI ou marqué par l'admin)
  readOnly: boolean;
  // Thème clair / sombre
  theme: "light" | "dark";
  toggleTheme: () => void;
  // Notifications éphémères (toasts)
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

const EPOCH = new Date(0);
const FALLBACK_PROFILE: Profile = { id: "", nom: "…", poste: "", role: "agent", init: "?", extraPages: [], deniedPages: [], readonly: false, approved: true, grcMember: false, mustChangePassword: false, totpEnabled: false };
// Auteur dont le compte a été supprimé par l'admin (données conservées).
const DELETED_PROFILE: Profile = { ...FALLBACK_PROFILE, nom: "Compte supprimé", init: "—" };
const Ctx = createContext<AppCtx | null>(null);

/** Reconvertit les dates (ISO string) d'une réponse JSON en objets Date. */
function reviveItem(r: Item): Item {
  return {
    ...r,
    dateCreation: new Date(r.dateCreation),
    dateMaj: new Date(r.dateMaj),
    dateRelancePrevue: r.dateRelancePrevue ? new Date(r.dateRelancePrevue) : null,
    blocageActions: (r.blocageActions ?? []).map((a) => ({ ...a, createdAt: new Date(a.createdAt) })),
    timeline: r.timeline.map((e) => ({ ...e, date: new Date(e.date) })),
  };
}
const reviveItems = (arr: Item[]): Item[] => arr.map(reviveItem);
const reviveNotifs = (arr: Notif[]): Notif[] =>
  arr.map((n) => ({ ...n, createdAt: new Date(n.createdAt) }));
const reviveProject = (p: Project): Project => ({
  ...p,
  deadline: p.deadline ? new Date(p.deadline) : null,
  createdAt: new Date(p.createdAt),
  tasks: p.tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
    createdAt: new Date(t.createdAt),
    completedAt: t.completedAt ? new Date(t.completedAt) : null,
  })),
  notes: p.notes.map((nt) => ({ ...nt, createdAt: new Date(nt.createdAt) })),
  closure: p.closure
    ? {
        ...p.closure,
        createdAt: new Date(p.closure.createdAt),
        decidedAt: p.closure.decidedAt ? new Date(p.closure.decidedAt) : null,
      }
    : null,
  deletionRequest: p.deletionRequest
    ? { ...p.deletionRequest, requestedAt: new Date(p.deletionRequest.requestedAt) }
    : null,
  proposals: (p.proposals ?? []).map((pr) => ({
    ...pr,
    dueDate: pr.dueDate ? new Date(pr.dueDate) : null,
    createdAt: new Date(pr.createdAt),
    decidedAt: pr.decidedAt ? new Date(pr.decidedAt) : null,
  })),
});
const reviveProjects = (arr: Project[]): Project[] => arr.map(reviveProject);
const reviveMeeting = (m: Meeting): Meeting => ({
  ...m,
  date: m.date ? new Date(m.date) : null,
  createdAt: new Date(m.createdAt),
  updatedAt: new Date(m.updatedAt),
});
const reviveMeetings = (arr: Meeting[]): Meeting[] => arr.map(reviveMeeting);

/** Champs modifiables d'une réunion (création / édition). */
export interface MeetingInput {
  title?: string;
  agenda?: string;
  date?: string | null;
  location?: string;
  visioUrl?: string;
  status?: string;
  /** Durée en minutes (bloc du planning). */
  durationMinutes?: number;
  notes?: string;
  decisions?: string[];
  participants?: MeetingParticipant[];
  links?: MeetingLink[];
}
const reviveNeg = (n: Negligence): Negligence => ({
  ...n,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
  decidedAt: n.decidedAt ? new Date(n.decidedAt) : null,
});
const reviveNegs = (arr: Negligence[]): Negligence[] => arr.map(reviveNeg);
const reviveNc = (n: NonConformite): NonConformite => ({
  ...n,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
  decidedAt: n.decidedAt ? new Date(n.decidedAt) : null,
});
const reviveNcs = (arr: NonConformite[]): NonConformite[] => arr.map(reviveNc);
const reviveConvs = (arr: ConversationSummary[]): ConversationSummary[] =>
  arr.map((c) => ({ ...c, lastAt: c.lastAt ? new Date(c.lastAt) : null }));
const reviveMsgs = (arr: Message[]): Message[] =>
  arr.map((m) => ({
    ...m,
    createdAt: new Date(m.createdAt),
    attachments: (m.attachments ?? []).map((a) => ({ ...a, createdAt: new Date(a.createdAt) })),
  }));
const reviveTask = (t: Task): Task => ({
  ...t,
  startDate: t.startDate ? new Date(t.startDate) : null,
  dueDate: t.dueDate ? new Date(t.dueDate) : null,
  completedAt: t.completedAt ? new Date(t.completedAt) : null,
  createdAt: new Date(t.createdAt),
  subtasks: t.subtasks ?? [],
});
const reviveTasks = (arr: Task[]): Task[] => arr.map(reviveTask);
const reviveRecurrence = (r: TaskRecurrence): TaskRecurrence => ({
  ...r,
  startDate: new Date(r.startDate),
  endDate: r.endDate ? new Date(r.endDate) : null,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});
const reviveRecurrences = (arr: TaskRecurrence[]): TaskRecurrence[] => arr.map(reviveRecurrence);
const reviveReport = (r: Report): Report => ({
  ...r,
  periodStart: r.periodStart ? new Date(r.periodStart) : null,
  periodEnd: r.periodEnd ? new Date(r.periodEnd) : null,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});
const reviveReports = (arr: Report[]): Report[] => arr.map(reviveReport);
const reviveObjective = (o: Objective): Objective => ({
  ...o,
  startDate: new Date(o.startDate),
  endDate: new Date(o.endDate),
  downgradedAt: o.downgradedAt ? new Date(o.downgradedAt) : null,
  createdAt: new Date(o.createdAt),
  milestones: (o.milestones ?? []).map((m) => ({ ...m, date: new Date(m.date) })),
});
const reviveObjectives = (arr: Objective[]): Objective[] => arr.map(reviveObjective);
const reviveRisk = (r: Risk): Risk => ({
  ...r,
  reviewDate: r.reviewDate ? new Date(r.reviewDate) : null,
  acceptedAt: r.acceptedAt ? new Date(r.acceptedAt) : null,
  acceptUntil: r.acceptUntil ? new Date(r.acceptUntil) : null,
  reviews: (r.reviews ?? []).map((v) => ({ ...v, reviewedAt: new Date(v.reviewedAt) })),
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});
const reviveRisks = (arr: Risk[]): Risk[] => arr.map(reviveRisk);
const revivePolicy = (p: Policy): Policy => ({
  ...p,
  publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
  reviewDate: p.reviewDate ? new Date(p.reviewDate) : null,
  createdAt: new Date(p.createdAt),
  updatedAt: new Date(p.updatedAt),
  diffusions: (p.diffusions ?? []).map((d) => ({ ...d, updatedAt: new Date(d.updatedAt) })),
});
const revivePolicies = (arr: Policy[]): Policy[] => arr.map(revivePolicy);
const reviveAsset = (a: Asset): Asset => ({
  ...a,
  reviewDate: a.reviewDate ? new Date(a.reviewDate) : null,
  createdAt: new Date(a.createdAt),
  updatedAt: new Date(a.updatedAt),
});
const reviveAssets = (arr: Asset[]): Asset[] => arr.map(reviveAsset);
const reviveAssessment = (a: ControlAssessment): ControlAssessment => ({
  ...a,
  lastAssessedAt: a.lastAssessedAt ? new Date(a.lastAssessedAt) : null,
  nextReviewAt: a.nextReviewAt ? new Date(a.nextReviewAt) : null,
  updatedAt: new Date(a.updatedAt),
});
const reviveAssessments = (arr: ControlAssessment[]): ControlAssessment[] => arr.map(reviveAssessment);
const reviveFieldControl = (c: FieldControl): FieldControl => ({
  ...c,
  date: c.date ? new Date(c.date) : null,
  events: (c.events ?? []).map((e) => ({ ...e, at: new Date(e.at) })),
  createdAt: new Date(c.createdAt),
  updatedAt: new Date(c.updatedAt),
});
const reviveFieldControls = (arr: FieldControl[]): FieldControl[] => arr.map(reviveFieldControl);
const reviveCapa = (a: CapaAction): CapaAction => ({
  ...a,
  dueDate: a.dueDate ? new Date(a.dueDate) : null,
  closedAt: a.closedAt ? new Date(a.closedAt) : null,
  createdAt: new Date(a.createdAt),
  updatedAt: new Date(a.updatedAt),
});
const reviveCapas = (arr: CapaAction[]): CapaAction[] => arr.map(reviveCapa);
const revivePlan = (p: GrcPlanItem): GrcPlanItem => ({
  ...p,
  dueDate: p.dueDate ? new Date(p.dueDate) : null,
  createdAt: new Date(p.createdAt),
  updatedAt: new Date(p.updatedAt),
});
const revivePlans = (arr: GrcPlanItem[]): GrcPlanItem[] => arr.map(revivePlan);
const reviveDirection = (d: Direction): Direction => ({
  ...d,
  createdAt: new Date(d.createdAt),
  updatedAt: new Date(d.updatedAt),
});
const reviveDirections = (arr: Direction[]): Direction[] => arr.map(reviveDirection);
const reviveCourse = (c: TrainingCourse): TrainingCourse => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) });
const reviveCourses = (arr: TrainingCourse[]): TrainingCourse[] => arr.map(reviveCourse);
const reviveDone = (arr: TrainingDone[]): TrainingDone[] => arr.map((d) => ({ ...d, completedAt: new Date(d.completedAt) }));
const reviveMission = (m: Mission): Mission => ({ ...m, createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt) });
const reviveMissions = (arr: Mission[]): Mission[] => arr.map(reviveMission);
const reviveSupplier = (s: Supplier): Supplier => ({ ...s, contractEnd: s.contractEnd ? new Date(s.contractEnd) : null, reviewDate: s.reviewDate ? new Date(s.reviewDate) : null, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) });
const reviveSuppliers = (arr: Supplier[]): Supplier[] => arr.map(reviveSupplier);
const reviveAuditGrid = (g: AuditGrid): AuditGrid => ({ ...g, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt) });
const reviveAuditGrids = (arr: AuditGrid[]): AuditGrid[] => arr.map(reviveAuditGrid);
const reviveAudit = (a: Audit): Audit => ({ ...a, date: a.date ? new Date(a.date) : null, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) });
const reviveAudits = (arr: Audit[]): Audit[] => arr.map(reviveAudit);
const reviveAuditPlan = (p: AuditPlanItem): AuditPlanItem => ({ ...p, plannedDate: p.plannedDate ? new Date(p.plannedDate) : null, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) });
const reviveAuditPlanItems = (arr: AuditPlanItem[]): AuditPlanItem[] => arr.map(reviveAuditPlan);
const reviveAuditor = (a: Auditor): Auditor => ({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) });
const reviveAuditors = (arr: Auditor[]): Auditor[] => arr.map(reviveAuditor);
const reviveRunbook = (r: Runbook): Runbook => ({ ...r, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) });
const reviveRunbooks = (arr: Runbook[]): Runbook[] => arr.map(reviveRunbook);
const reviveSocProcedure = (p: SocProcedure): SocProcedure => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) });
const reviveSocProcedures = (arr: SocProcedure[]): SocProcedure[] => arr.map(reviveSocProcedure);
const reviveAttackCoverage = (arr: AttackCoverage[]): AttackCoverage[] => arr.map((a) => ({ ...a, updatedAt: new Date(a.updatedAt) }));
const reviveIntel = (arr: IntelItem[]): IntelItem[] => arr.map((i) => ({ ...i, expiresAt: i.expiresAt ? new Date(i.expiresAt) : null, createdAt: new Date(i.createdAt), updatedAt: new Date(i.updatedAt) }));
const reviveOnCall = (arr: OnCallShift[]): OnCallShift[] => arr.map((s) => ({ ...s, start: new Date(s.start), end: new Date(s.end), createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) }));
const revivePlan2 = (p: ContinuityPlan): ContinuityPlan => ({ ...p, lastTestDate: p.lastTestDate ? new Date(p.lastTestDate) : null, reviewDate: p.reviewDate ? new Date(p.reviewDate) : null, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) });
const reviveContinuity = (arr: ContinuityPlan[]): ContinuityPlan[] => arr.map(revivePlan2);
const reviveIncident = (i: Incident): Incident => ({ ...i, detectedAt: i.detectedAt ? new Date(i.detectedAt) : null, resolvedAt: i.resolvedAt ? new Date(i.resolvedAt) : null, createdAt: new Date(i.createdAt), updatedAt: new Date(i.updatedAt) });
const reviveIncidents = (arr: Incident[]): Incident[] => arr.map(reviveIncident);
const reviveProcessing1 = (p: ProcessingActivity): ProcessingActivity => ({ ...p, reviewDate: p.reviewDate ? new Date(p.reviewDate) : null, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) });
const reviveProcessing = (arr: ProcessingActivity[]): ProcessingActivity[] => arr.map(reviveProcessing1);
const reviveReview = (r: DirectionReview): DirectionReview => ({ ...r, date: r.date ? new Date(r.date) : null, nextReviewDate: r.nextReviewDate ? new Date(r.nextReviewDate) : null, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) });
const reviveReviews = (arr: DirectionReview[]): DirectionReview[] => arr.map(reviveReview);

/* Sons via Web Audio (aucun fichier requis, marche hors-ligne).
 * Deux timbres distincts : un ping doux pour les messages, un motif à trois
 * notes plus captivant pour les autres notifications. */
function playChime(kind: "message" | "other" = "other") {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t0 = ctx.currentTime;
    const note = (freq: number, start: number, dur: number, peak = 0.22, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    };
    if (kind === "message") {
      // Ping doux à deux notes montantes (E5 → B5).
      note(659, 0, 0.16);
      note(988, 0.11, 0.2);
    } else {
      // Arpège à trois notes, plus vif et captivant (G5 → C6 → E6), timbre triangle.
      note(784, 0, 0.14, 0.2, "triangle");
      note(1047, 0.11, 0.14, 0.2, "triangle");
      note(1319, 0.22, 0.3, 0.26, "triangle");
    }
    setTimeout(() => ctx.close().catch(() => {}), kind === "message" ? 500 : 700);
  } catch {
    /* audio indisponible : silencieux */
  }
}

export function AppProvider({
  children,
  demo,
  initialUser,
  initialItems,
  initialProfiles,
  initialNotifications,
  initialCatalogue,
  initialProjects,
  initialSettings,
  initialRefLists,
  initialNegligences,
  initialNonConformites,
  initialConversations,
  initialTasks,
  initialObjectives,
  initialTemplates,
  initialContacts,
  initialMeetings,
  initialRisks,
  initialPolicies,
  initialAssets,
  initialControlAssessments,
  initialFieldControls,
  initialCapaActions,
  initialPlanItems,
  initialDirections,
  initialTrainingCourses,
  initialTrainingDone,
  initialTrainingProgressAll,
  initialMissions,
  initialSuppliers,
  initialAuditGrids,
  initialAudits,
  initialAuditPlanItems,
  initialAuditors,
  initialRunbooks,
  initialSocProcedures,
  initialAttackCoverage,
  initialIntel,
  initialOnCall,
  initialContinuityPlans,
  initialIncidents,
  initialProcessing,
  initialReviews,
}: {
  children: ReactNode;
  demo: boolean;
  initialUser?: Profile;
  initialItems?: Item[];
  initialProfiles?: Profile[];
  initialNotifications?: Notif[];
  initialCatalogue?: Catalogue;
  initialProjects?: Project[];
  initialSettings?: AppSettings;
  initialRefLists?: RefLists;
  initialNegligences?: Negligence[];
  initialNonConformites?: NonConformite[];
  initialConversations?: ConversationSummary[];
  initialTasks?: Task[];
  initialObjectives?: Objective[];
  initialTemplates?: EmailTemplate[];
  initialContacts?: Contact[];
  initialMeetings?: Meeting[];
  initialRisks?: Risk[];
  initialPolicies?: Policy[];
  initialAssets?: Asset[];
  initialControlAssessments?: ControlAssessment[];
  initialFieldControls?: FieldControl[];
  initialCapaActions?: CapaAction[];
  initialPlanItems?: GrcPlanItem[];
  initialDirections?: Direction[];
  initialTrainingCourses?: TrainingCourse[];
  initialTrainingDone?: TrainingDone[];
  initialTrainingProgressAll?: TrainingProgressEntry[];
  initialMissions?: Mission[];
  initialSuppliers?: Supplier[];
  initialAuditGrids?: AuditGrid[];
  initialAudits?: Audit[];
  initialAuditPlanItems?: AuditPlanItem[];
  initialAuditors?: Auditor[];
  initialRunbooks?: Runbook[];
  initialSocProcedures?: SocProcedure[];
  initialAttackCoverage?: AttackCoverage[];
  initialIntel?: IntelItem[];
  initialOnCall?: OnCallShift[];
  initialContinuityPlans?: ContinuityPlan[];
  initialIncidents?: Incident[];
  initialProcessing?: ProcessingActivity[];
  initialReviews?: DirectionReview[];
}) {
  const [items, setItems] = useState<Item[]>(
    demo ? [] : reviveItems(initialItems ?? [])
  );
  const [profiles, setProfiles] = useState<Profile[]>(
    demo ? PROFILES : initialProfiles ?? []
  );
  const [notifications, setNotifications] = useState<Notif[]>(
    demo ? [] : reviveNotifs(initialNotifications ?? [])
  );
  const [catalogue, setCatalogue] = useState<Catalogue>(
    demo || !initialCatalogue ? DEFAULT_CATALOGUE : initialCatalogue
  );
  const [templates, setTemplates] = useState<EmailTemplate[]>(
    demo ? DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: `tpl-${i}` })) : initialTemplates ?? []
  );
  const [refLists, setRefLists] = useState<RefLists>(
    demo || !initialRefLists ? DEFAULT_REF_LISTS : initialRefLists
  );
  const [contacts, setContacts] = useState<Contact[]>(demo ? [] : initialContacts ?? []);
  const [meetings, setMeetings] = useState<Meeting[]>(demo ? [] : reviveMeetings(initialMeetings ?? []));
  const [nonConformites, setNonConformites] = useState<NonConformite[]>(
    demo ? [] : reviveNcs(initialNonConformites ?? [])
  );
  const [negligences, setNegligences] = useState<Negligence[]>(
    demo ? [] : reviveNegs(initialNegligences ?? [])
  );
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    demo ? [] : reviveConvs(initialConversations ?? [])
  );
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>(
    demo ? seedProjects() : reviveProjects(initialProjects ?? [])
  );
  const [tasks, setTasks] = useState<Task[]>(demo ? [] : reviveTasks(initialTasks ?? []));
  // Les gabarits récurrents sont peu nombreux : chargés à la volée au montage,
  // sans passer par le rendu serveur.
  const [recurrences, setRecurrences] = useState<TaskRecurrence[]>([]);
  const [recurrenceCounts, setRecurrenceCounts] = useState<Record<string, { total: number; open: number }>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>(demo ? seedObjectives() : reviveObjectives(initialObjectives ?? []));
  const [risks, setRisks] = useState<Risk[]>(demo ? seedRisks() : reviveRisks(initialRisks ?? []));
  const [policies, setPolicies] = useState<Policy[]>(demo ? seedPolicies() : revivePolicies(initialPolicies ?? []));
  const [assets, setAssets] = useState<Asset[]>(demo ? seedAssets() : reviveAssets(initialAssets ?? []));
  const [controlAssessments, setControlAssessments] = useState<ControlAssessment[]>(demo ? [] : reviveAssessments(initialControlAssessments ?? []));
  const [fieldControls, setFieldControls] = useState<FieldControl[]>(demo ? seedFieldControls() : reviveFieldControls(initialFieldControls ?? []));
  const [capaActions, setCapaActions] = useState<CapaAction[]>(demo ? seedCapa() : reviveCapas(initialCapaActions ?? []));
  const [planItems, setPlanItems] = useState<GrcPlanItem[]>(demo ? seedPlan() : revivePlans(initialPlanItems ?? []));
  const [directions, setDirections] = useState<Direction[]>(demo ? seedDirections() : reviveDirections(initialDirections ?? []));
  const [trainingCourses, setTrainingCourses] = useState<TrainingCourse[]>(demo ? seedTraining() : reviveCourses(initialTrainingCourses ?? []));
  const [trainingDone, setTrainingDone] = useState<TrainingDone[]>(demo ? [] : reviveDone(initialTrainingDone ?? []));
  const trainingProgressAll: TrainingProgressEntry[] = useMemo(
    () => (initialTrainingProgressAll ?? []).map((p) => ({ ...p, completedAt: new Date(p.completedAt) })),
    [initialTrainingProgressAll]
  );
  const [missions, setMissions] = useState<Mission[]>(demo ? seedMissions() : reviveMissions(initialMissions ?? []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(demo ? seedSuppliers() : reviveSuppliers(initialSuppliers ?? []));
  const [auditGrids, setAuditGrids] = useState<AuditGrid[]>(demo ? seedAuditGrids() : reviveAuditGrids(initialAuditGrids ?? []));
  const [audits, setAudits] = useState<Audit[]>(demo ? seedAudits() : reviveAudits(initialAudits ?? []));
  const [auditPlanItems, setAuditPlanItems] = useState<AuditPlanItem[]>(demo ? seedAuditPlan() : reviveAuditPlanItems(initialAuditPlanItems ?? []));
  const [auditors, setAuditors] = useState<Auditor[]>(demo ? seedAuditors() : reviveAuditors(initialAuditors ?? []));
  const [runbooks, setRunbooks] = useState<Runbook[]>(demo ? seedRunbooks() : reviveRunbooks(initialRunbooks ?? []));
  const [socProcedures, setSocProcedures] = useState<SocProcedure[]>(demo ? seedSocProcedures() : reviveSocProcedures(initialSocProcedures ?? []));
  const [attackCoverage, setAttackCoverage] = useState<AttackCoverage[]>(demo ? [] : reviveAttackCoverage(initialAttackCoverage ?? []));
  const [intel, setIntel] = useState<IntelItem[]>(demo ? seedIntel() : reviveIntel(initialIntel ?? []));
  const [onCall, setOnCall] = useState<OnCallShift[]>(demo ? seedOnCall() : reviveOnCall(initialOnCall ?? []));
  const [continuityPlans, setContinuityPlans] = useState<ContinuityPlan[]>(demo ? seedContinuity() : reviveContinuity(initialContinuityPlans ?? []));
  const [incidents, setIncidents] = useState<Incident[]>(demo ? seedIncidents() : reviveIncidents(initialIncidents ?? []));
  const [processing, setProcessing] = useState<ProcessingActivity[]>(demo ? seedProcessing() : reviveProcessing(initialProcessing ?? []));
  const [reviews, setReviews] = useState<DirectionReview[]>(demo ? seedReviews() : reviveReviews(initialReviews ?? []));
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [pushEnabled, setPushEnabledState] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID); // sélecteur démo
  const [orgName, setOrgName] = useState(initialSettings?.orgName ?? ORG_NAME);
  const [orgLogo, setOrgLogo] = useState(initialSettings?.orgLogo ?? "");
  const [emailEnabled, setEmailEnabled] = useState(initialSettings?.emailEnabled ?? true);
  const [digestHour, setDigestHour] = useState(initialSettings?.digestHour ?? "08:00");
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const applySettings = (s: AppSettings) => {
    setOrgName(s.orgName);
    setOrgLogo(s.orgLogo ?? "");
    setEmailEnabled(s.emailEnabled);
    setDigestHour(s.digestHour);
  };

  // Horloge posée côté client uniquement (évite tout écart d'hydratation).
  useEffect(() => {
    setNowState(new Date());
    if (demo) {
      setItems(seedItems());
      setProfiles(PROFILES);
    }
    // Préférences de notification (son + bulles push), persistées localement.
    try {
      setSoundEnabledState(localStorage.getItem("cap_sound") !== "0");
      setPushEnabledState(localStorage.getItem("cap_push") !== "0");
    } catch {
      /* localStorage indisponible */
    }
    // Thème (clair/sombre) : override ?theme=, puis préférence enregistrée, puis système.
    try {
      const override = new URLSearchParams(window.location.search).get("theme");
      const saved = localStorage.getItem("cap_theme");
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      const t =
        override === "dark" || override === "light"
          ? override
          : saved === "dark" || saved === "light"
          ? saved
          : prefersDark
          ? "dark"
          : "light";
      setThemeState(t as "light" | "dark");
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    try {
      localStorage.setItem("cap_theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {
      /* ignore */
    }
  };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const toast = (message: string, kind: ToastKind = "info") => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    setTimeout(() => dismissToast(id), kind === "error" ? 5000 : 3500);
  };
  // Bulle « push » pour une notification entrante (cloche + clic → sujet).
  const pushToast = (message: string, href?: string | null) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind: "info", push: true, href: href ?? null }]);
    setTimeout(() => dismissToast(id), 6000);
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    try {
      localStorage.setItem("cap_sound", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (v) playChime("other"); // retour immédiat à l'activation
  };
  const setPushEnabled = (v: boolean) => {
    setPushEnabledState(v);
    try {
      localStorage.setItem("cap_push", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // Nouvelles notifications → son distinct (message vs autre) + bulles push.
  // On repère les notifications réellement nouvelles par leur id (pas juste le
  // compteur), pour ignorer les changements de statut « lu ».
  const seenNotifRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (demo) return;
    const ids = new Set(notifications.map((n) => n.id));
    if (seenNotifRef.current === null) {
      seenNotifRef.current = ids; // premier chargement : aucune alerte
      return;
    }
    const fresh = notifications.filter((n) => !n.read && !seenNotifRef.current!.has(n.id));
    seenNotifRef.current = ids;
    if (fresh.length === 0) return;
    const hasMessage = fresh.some((n) => n.kind === "message");
    if (soundEnabled) playChime(hasMessage ? "message" : "other");
    if (pushEnabled) {
      fresh.slice(0, 3).forEach((n) => pushToast(n.message, n.link));
      if (fresh.length > 3) toast(`+ ${fresh.length - 3} autres notifications`, "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, soundEnabled, pushEnabled, demo]);

  const now = nowState ?? EPOCH;
  const me: Profile = demo
    ? profiles.find((p) => p.id === meId) ?? PROFILES[0]
    : initialUser ?? FALLBACK_PROFILE;
  const ready = nowState !== null && (demo || Boolean(initialUser));

  const profileById = (id: string): Profile => {
    const found = profiles.find((p) => p.id === id);
    if (found) return found;
    // Profils chargés mais id absent → compte supprimé (données orphelines).
    if (id && profiles.length > 0) return DELETED_PROFILE;
    return FALLBACK_PROFILE;
  };
  // Synchronise localement l'appartenance GRC d'un membre après une bascule en
  // administration, pour que les distinctions se mettent à jour sans recharger la page.
  const setProfileGrc = (id: string, grcMember: boolean) =>
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, grcMember } : p)));

  // État de relance calculé avec les SLA du catalogue courant (types ajoutés inclus).
  const rs = (item: Item): ReminderState => reminderState(item, now, catalogue.types);

  // Célébration de montée de niveau (gamification).
  const myLevelIdx = useMemo(() => computeGame(me.id, items, tasks, projects, objectives).level, [me.id, items, tasks, projects, objectives]);
  useEffect(() => {
    if (demo || !me.id) return;
    let stored: number | null = null;
    try {
      const v = localStorage.getItem("cap_level");
      stored = v === null || v === "" ? null : Number(v);
    } catch {
      /* ignore */
    }
    if (stored !== null && myLevelIdx > stored) {
      fireConfetti();
      toast(`Niveau supérieur : ${LEVELS[myLevelIdx].icon} ${LEVELS[myLevelIdx].name} !`, "success");
    }
    try {
      localStorage.setItem("cap_level", String(myLevelIdx));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLevelIdx, demo]);

  // Notification de défi hebdomadaire relevé.
  const myChallenges = useMemo(() => weeklyChallenges(me.id, items, tasks, now), [me.id, items, tasks, now]);
  useEffect(() => {
    if (demo || !me.id) return;
    const weekKey = weekStart(now).toISOString().slice(0, 10);
    const storeKey = `cap_defis_${weekKey}`;
    const doneNow = myChallenges.filter((c) => c.done);
    let prev: string[] | null = null;
    try {
      const v = localStorage.getItem(storeKey);
      prev = v === null ? null : (JSON.parse(v) as string[]);
    } catch {
      prev = null;
    }
    // À la première visite de la semaine on initialise sans notifier (évite de fêter un défi déjà relevé).
    if (prev !== null) {
      const fresh = doneNow.filter((c) => !prev!.includes(c.id));
      if (fresh.length > 0) {
        fireConfetti();
        fresh.forEach((c) => toast(`Défi relevé : ${c.icon} ${c.label} 🔥`, "success"));
      }
    }
    try {
      localStorage.setItem(storeKey, JSON.stringify(doneNow.map((c) => c.id)));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myChallenges, demo]);

  /* ---------- Mutations ---------- */
  const actFeedback = (action: Action) => {
    if (action === "cloture") {
      fireConfetti();
      toast("Suivi de mail clôturé 🎉", "success");
    } else if (action === "relance") toast("Relance enregistrée.", "success");
    else if (action === "reponse") toast("Réponse enregistrée.", "success");
    else if (action === "bloque") toast("Suivi marqué comme bloqué.", "info");
  };
  const act = (item: Item, action: Action, cause?: string) => {
    setOpen(null);
    if (demo) {
      setItems((prev) => mockApply(prev, item, action, cause, meId));
      actFeedback(action);
      return;
    }
    fetch("/api/items/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, action, cause }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
        actFeedback(action);
      })
      .catch((e) => {
        console.error("Action échouée :", e);
        toast("Action échouée.", "error");
      });
  };

  const createItemFromEmail = async (
    file: File,
    opts: { metier: string; type: string; prio: string; objet: string; dest: string }
  ): Promise<boolean> => {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("metier", opts.metier);
      form.append("type", opts.type);
      form.append("prio", opts.prio);
      form.append("objet", opts.objet);
      form.append("dest", opts.dest);
      const r = await fetch("/api/email/create", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.error || "Création impossible.", "error");
        return false;
      }
      if (d.items) setItems(reviveItems(d.items));
      toast("Suivi créé depuis l'e-mail.", "success");
      return true;
    } catch {
      toast("Création impossible.", "error");
      return false;
    }
  };

  const postContact = async (payload: Record<string, unknown>): Promise<string | null> => {
    try {
      const r = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return d.error ?? "Erreur.";
      if (d.contacts) setContacts(d.contacts as Contact[]);
      return null;
    } catch {
      return "Opération impossible.";
    }
  };
  const createContact = async (c: Omit<Contact, "id">): Promise<string | null> => {
    if (demo) {
      setContacts((prev) => [...prev, { ...c, id: `c-${prev.length + 1}` }]);
      return null;
    }
    return postContact({ op: "create", ...c });
  };
  const updateContact = async (id: string, f: Partial<Omit<Contact, "id">>): Promise<string | null> => {
    if (demo) {
      setContacts((prev) => prev.map((x) => (x.id === id ? { ...x, ...f } : x)));
      return null;
    }
    return postContact({ op: "update", id, ...f });
  };
  const deleteContact = async (id: string): Promise<string | null> => {
    if (demo) {
      setContacts((prev) => prev.filter((x) => x.id !== id));
      return null;
    }
    return postContact({ op: "delete", id });
  };

  // Correction/fusion d'un destinataire (outil d'administration, hors stats).
  // Module Réunion (annuaire de rencontres reliées aux sujets/personnes).
  const postMeeting = async (payload: Record<string, unknown>): Promise<string | null> => {
    if (demo) return DEMO_MSG;
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.error ?? "Erreur.", "error");
        return d.error ?? "Erreur.";
      }
      if (d.meetings) setMeetings(reviveMeetings(d.meetings));
      return null;
    } catch {
      toast("Opération impossible.", "error");
      return "Opération impossible.";
    }
  };
  const createMeeting = async (input: MeetingInput) => postMeeting({ op: "create", ...input });
  const updateMeeting = async (id: string, fields: MeetingInput) => postMeeting({ op: "update", id, ...fields });
  const deleteMeeting = async (id: string) => postMeeting({ op: "delete", id });
  const meetingById = (id: string): Meeting | undefined => meetings.find((m) => m.id === id);

  const correctDestinataire = async (oldName: string, newName: string): Promise<string | null> => {
    if (demo) return "Correction indisponible en mode démo.";
    try {
      const r = await fetch("/api/admin/rename-destinataire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return d.error ?? "Correction impossible.";
      if (d.items) setItems(reviveItems(d.items));
      toast(`Destinataire corrigé sur ${d.updated ?? 0} suivi(s).`, "success");
      return null;
    } catch {
      return "Correction impossible.";
    }
  };

  const importEmailResponse = async (itemId: string, file: File): Promise<boolean> => {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("itemId", itemId);
      const r = await fetch("/api/email/import", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.error || "Import impossible.", "error");
        return false;
      }
      if (d.items) setItems(reviveItems(d.items));
      toast("Réponse importée et enregistrée sur le suivi.", "success");
      return true;
    } catch {
      toast("Import impossible.", "error");
      return false;
    }
  };

  const bulkAct = async (ids: string[], action: Action): Promise<{ applied: number; skipped: number } | null> => {
    if (ids.length === 0) return { applied: 0, skipped: 0 };
    if (demo) {
      setItems((prev) => {
        let next = prev;
        for (const id of ids) {
          const it = next.find((x) => x.id === id);
          if (it) next = mockApply(next, it, action, undefined, meId);
        }
        return next;
      });
      return { applied: ids.length, skipped: 0 };
    }
    try {
      const res = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error ?? "Action groupée échouée.", "error");
        return null;
      }
      if (d.items) setItems(reviveItems(d.items));
      return { applied: d.applied ?? 0, skipped: d.skipped ?? 0 };
    } catch (e) {
      console.error("Action groupée échouée :", e);
      toast("Action groupée échouée.", "error");
      return null;
    }
  };

  const setItemLate = async (item: Item, late: boolean): Promise<boolean> => {
    if (demo) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, markedLate: late } : i)));
      return true;
    }
    try {
      const res = await fetch("/api/items/late", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, late }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error ?? "Action échouée.", "error");
        return false;
      }
      if (d.items) setItems(reviveItems(d.items));
      return true;
    } catch (e) {
      console.error("Marquage en retard échoué :", e);
      return false;
    }
  };

  // Publication (irréversible) : rend un élément privé visible par toute l'équipe.
  const publishItem = async (id: string): Promise<boolean> => {
    if (demo) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, published: true } : i)));
      return true;
    }
    try {
      const res = await fetch("/api/items/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Publication échouée.", "error"); return false; }
      if (d.items) setItems(reviveItems(d.items));
      toast("Publié : visible par l'équipe.", "success");
      return true;
    } catch (e) {
      console.error("Publication échouée :", e);
      toast("Publication échouée.", "error");
      return false;
    }
  };

  const publishProject = async (id: string): Promise<boolean> => {
    if (demo) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published: true } : p)));
      return true;
    }
    try {
      const res = await fetch("/api/projects/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Publication échouée.", "error"); return false; }
      if (d.projects) setProjects(reviveProjects(d.projects));
      toast("Projet publié : visible par l'équipe.", "success");
      return true;
    } catch (e) {
      console.error("Publication échouée :", e);
      toast("Publication échouée.", "error");
      return false;
    }
  };

  const publishTask = async (id: string): Promise<boolean> => {
    if (demo) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, published: true } : t)));
      return true;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "publish", id }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Publication échouée.", "error"); return false; }
      if (d.tasks) setTasks(reviveTasks(d.tasks));
      toast("Tâche publiée : visible par l'équipe.", "success");
      return true;
    } catch (e) {
      console.error("Publication échouée :", e);
      toast("Publication échouée.", "error");
      return false;
    }
  };

  /** Envoi réel d'une relance au destinataire par e-mail (modèle appliqué). */
  const sendRelanceEmail = async (item: Item, templateId: string): Promise<boolean> => {
    if (demo) {
      toast("Envoi d'e-mail indisponible en mode démo.", "info");
      return false;
    }
    try {
      const res = await fetch("/api/items/relance-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, templateId }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error ?? "Envoi échoué.", "error");
        return false;
      }
      if (d.items) setItems(reviveItems(d.items));
      toast(`Relance envoyée à ${d.to}.`, "success");
      return true;
    } catch (e) {
      console.error("Envoi de relance échoué :", e);
      toast("Envoi échoué.", "error");
      return false;
    }
  };

  const create = (parsed: ParsedSubject, prio: Priorite, dest: string, destService: string, points: string, nonConformite = false, dueDurationDays: number | null = null, destEmail = "", published = false) => {
    setShowNew(false);
    if (demo) {
      setItems((prev) => mockCreate(prev, parsed, prio, dest, destService, points, meId));
      return;
    }
    fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, prio, dest, destService, points, nonConformite, dueDurationDays, destEmail, published }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
        if (d.projects) setProjects(reviveProjects(d.projects)); // suivi PRJ → projet visible aussitôt
        if (d.nonconformites) setNonConformites(reviveNcs(d.nonconformites));
      })
      .catch((e) => console.error("Création échouée :", e));
  };

  const setRelanceDate = (item: Item, date: string | null) => {
    if (demo) {
      setItems((prev) => mockSetRelanceDate(prev, item.id, date));
      return;
    }
    fetch("/api/items/relance-date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, date }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
      })
      .catch((e) => console.error("Planification échouée :", e));
  };

  const updateItem = async (
    item: Item,
    fields: { objet?: string; priorite?: Priorite; pointsCles?: string[]; personnes?: Person[]; dueDurationDays?: number | null }
  ): Promise<boolean> => {
    if (demo) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id) return it;
          const next = { ...it };
          if (fields.objet !== undefined) next.objet = fields.objet.trim() || it.objet;
          if (fields.priorite !== undefined) next.priorite = fields.priorite;
          if (fields.pointsCles !== undefined) {
            const pts = fields.pointsCles.map((p) => p.trim()).filter(Boolean);
            next.pointsCles = pts.length ? pts : ["—"];
          }
          if (fields.personnes !== undefined) next.personnes = fields.personnes.filter((p) => p.name.trim());
          return next;
        })
      );
      return true;
    }
    try {
      const res = await fetch("/api/items/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, ...fields }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error ?? "Modification échouée.", "error");
        return false;
      }
      if (d.items) setItems(reviveItems(d.items));
      return true;
    } catch (e) {
      console.error("Modification échouée :", e);
      toast("Modification échouée.", "error");
      return false;
    }
  };

  const catalogueAction = async (action: CatalogueAction): Promise<string | null> => {
    if (demo) return "Édition du catalogue indisponible en mode démo.";
    const res = await fetch("/api/admin/catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.catalogue) setCatalogue(d.catalogue);
    return null;
  };

  const addBlocageAction = (item: Item, kind: string, concerne: string, note: string) => {
    if (demo) {
      setItems((prev) => mockAddBlocageAction(prev, item.id, kind, concerne, note, meId));
      return;
    }
    fetch("/api/items/blocage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "demarche", itemId: item.id, kind, concerne, note }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
      })
      .catch((e) => console.error("Démarche échouée :", e));
  };

  const setAppreciation = (item: Item, appreciation: string | null) => {
    if (demo) {
      setItems((prev) => mockSetAppreciation(prev, item.id, appreciation));
      // Démo : appréciation « Négligence » → crée une fiche en mémoire.
      if (appreciation === "Négligence" && !negligences.some((n) => n.itemId === item.id)) {
        const now = new Date();
        const dest = item.personnes.find((p) => p.kind === "destinataire");
        setNegligences((prev) => [
          {
            id: `neg-${item.id}`,
            itemId: item.id,
            objet: item.objet,
            service: dest?.service ?? "",
            concerne: dest?.name ?? "",
            gravite: "Modérée",
            risque: "Moyen",
            impact: "",
            description: "",
            status: "Ouverte",
            decisions: [],
            createdBy: me.id,
            decidedBy: null,
            createdAt: now,
            updatedAt: now,
            decidedAt: null,
          },
          ...prev,
        ]);
      }
      return;
    }
    fetch("/api/items/blocage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "appreciation", itemId: item.id, appreciation }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
        if (d.negligences) setNegligences(reviveNegs(d.negligences));
      })
      .catch((e) => console.error("Appréciation échouée :", e));
  };

  /* ---------- Négligences ---------- */
  const negligenceById = (id: string): Negligence | null => negligences.find((n) => n.id === id) ?? null;
  const negligenceByItem = (itemId: string): Negligence | null =>
    negligences.find((n) => n.itemId === itemId) ?? null;

  const patchNeg = (id: string, patch: Partial<Negligence>) =>
    setNegligences((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date() } : n)));

  const postNeg = async (body: Record<string, unknown>): Promise<string | null> => {
    const res = await fetch("/api/negligences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.negligences) setNegligences(reviveNegs(d.negligences));
    if (d.items) setItems(reviveItems(d.items));
    return null;
  };

  const createNegligence = async (form: NegligenceForm): Promise<string | null> => {
    if (demo) {
      if (form.itemId) {
        const it = items.find((i) => i.id === form.itemId);
        if (it) setAppreciation(it, "Négligence");
      } else {
        const now = new Date();
        setNegligences((prev) => [
          {
            id: `neg-${now.getTime()}`,
            itemId: null,
            objet: form.objet ?? "",
            service: form.service ?? "",
            concerne: form.concerne ?? "",
            gravite: form.gravite ?? "Modérée",
            risque: form.risque ?? "Moyen",
            impact: form.impact ?? "",
            description: form.description ?? "",
            status: "Ouverte",
            decisions: [],
            createdBy: me.id,
            decidedBy: null,
            createdAt: now,
            updatedAt: now,
            decidedAt: null,
          },
          ...prev,
        ]);
      }
      return null;
    }
    return postNeg({ op: "create", ...form });
  };

  const updateNegligence = async (id: string, fields: Partial<NegligenceForm>) => {
    if (demo) {
      patchNeg(id, fields);
      return null;
    }
    return postNeg({ op: "update", id, ...fields });
  };
  const setNegligenceStatus = async (id: string, status: string) => {
    if (demo) {
      patchNeg(id, { status });
      return null;
    }
    return postNeg({ op: "status", id, status });
  };
  const setNegligenceDecisions = async (id: string, decisions: string[]) => {
    if (demo) {
      patchNeg(id, { decisions, decidedBy: me.id, decidedAt: new Date(), status: decisions.length ? "Décision rendue" : "Transmise au DG" });
      return null;
    }
    return postNeg({ op: "decisions", id, decisions });
  };

  /* ---------- Non-conformités (même logique que les négligences) ---------- */
  const nonConformiteById = (id: string): NonConformite | null => nonConformites.find((n) => n.id === id) ?? null;
  const nonConformiteByItem = (itemId: string): NonConformite | null =>
    nonConformites.find((n) => n.itemId === itemId) ?? null;
  const patchNc = (id: string, patch: Partial<NonConformite>) =>
    setNonConformites((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date() } : n)));
  const postNc = async (body: Record<string, unknown>): Promise<string | null> => {
    const res = await fetch("/api/nonconformites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.nonconformites) setNonConformites(reviveNcs(d.nonconformites));
    if (d.items) setItems(reviveItems(d.items));
    return null;
  };
  const createNonConformite = async (form: NonConformiteForm): Promise<string | null> => {
    if (demo) {
      const now = new Date();
      setNonConformites((prev) => [
        {
          id: `nc-${now.getTime()}`,
          itemId: form.itemId ?? null,
          objet: form.objet ?? "",
          service: form.service ?? "",
          concerne: form.concerne ?? "",
          policy: form.policy ?? "",
          gravite: form.gravite ?? "Modérée",
          risque: form.risque ?? "Moyen",
          impact: form.impact ?? "",
          description: form.description ?? "",
          status: "Ouverte",
          decisions: [],
          createdBy: me.id,
          decidedBy: null,
          createdAt: now,
          updatedAt: now,
          decidedAt: null,
        },
        ...prev,
      ]);
      return null;
    }
    return postNc({ op: "create", ...form });
  };
  const updateNonConformite = async (id: string, fields: Partial<NonConformiteForm>) => {
    if (demo) {
      patchNc(id, fields);
      return null;
    }
    return postNc({ op: "update", id, ...fields });
  };
  const setNonConformiteStatus = async (id: string, status: string) => {
    if (demo) {
      patchNc(id, { status });
      return null;
    }
    return postNc({ op: "status", id, status });
  };
  const setNonConformiteDecisions = async (id: string, decisions: string[]) => {
    if (demo) {
      patchNc(id, { decisions, decidedBy: me.id, decidedAt: new Date(), status: decisions.length ? "Décision rendue" : "Transmise au DG" });
      return null;
    }
    return postNc({ op: "decisions", id, decisions });
  };

  const refListAction = async (action: RefListActionPayload): Promise<string | null> => {
    if (demo) return "Édition des listes indisponible en mode démo.";
    const res = await fetch("/api/admin/reflists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.refLists) setRefLists(d.refLists);
    return null;
  };

  const updateRole = async (userId: string, role: Role): Promise<string | null> => {
    const res = await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.profiles) setProfiles(d.profiles);
    return null;
  };

  // Espace membre : mise à jour de son propre profil (nom, poste, avatar).
  const updateAccount = async (fields: { fullName?: string; poste?: string; avatar?: string }): Promise<boolean> => {
    if (demo) {
      toast("Modification indisponible en mode démo.", "info");
      return false;
    }
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(d.error ?? "Échec de la mise à jour.", "error");
      return false;
    }
    if (d.profiles) setProfiles(d.profiles);
    toast("Profil mis à jour.", "success");
    return true;
  };

  // Modèles de relance (CRUD admin).
  const templateAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Indisponible en mode démo.";
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: op, ...input }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.templates) setTemplates(d.templates);
    return null;
  };

  const markNotificationsRead = () => {
    if (demo) {
      setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
      return;
    }
    if (!notifications.some((n) => !n.read)) return;
    fetch("/api/notifications/read", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) setNotifications(reviveNotifs(d.notifications));
      })
      .catch((e) => console.error("Lecture des notifications échouée :", e));
  };

  /** Marque une notification précise comme lue (archivée). */
  const markNotificationRead = (id: string) => {
    if (demo) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return;
    }
    // Optimiste : on masque immédiatement, puis on synchronise avec le serveur.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) setNotifications(reviveNotifs(d.notifications));
      })
      .catch((e) => console.error("Archivage de la notification échoué :", e));
  };

  const signOut = () => {
    if (demo) return;
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/login";
    });
  };

  /* ---------- Projets ---------- */
  const projectById = (id: string): Project | null => projects.find((p) => p.id === id) ?? null;

  const DEMO_MSG = "Édition des projets indisponible en mode démo.";
  const postProjects = async (url: string, body: unknown): Promise<string | null> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) {
      const msg = d.error ?? "Erreur.";
      toast(msg, "error");
      return msg;
    }
    if (d.projects) setProjects(reviveProjects(d.projects));
    if (d.items) setItems(reviveItems(d.items));
    return null;
  };

  const createProject = async (
    name: string,
    description: string,
    deadline: string | null,
    memberIds: string[] = [],
    startDate: string | null = null
  ) => (demo ? DEMO_MSG : postProjects("/api/projects", { name, description, deadline, memberIds, startDate }));
  const updateProject = async (id: string, fields: ProjectFields) =>
    demo ? DEMO_MSG : postProjects("/api/projects/update", { id, ...fields });
  const projectTask = async (action: "add" | "update" | "delete", payload: TaskPayload) =>
    demo ? DEMO_MSG : postProjects("/api/projects/tasks", { action, ...payload });
  const projectMember = async (action: "add" | "remove", projectId: string, profileId: string) =>
    demo ? DEMO_MSG : postProjects("/api/projects/members", { action, projectId, profileId });
  const projectNote = async (projectId: string, body: string) =>
    demo ? DEMO_MSG : postProjects("/api/projects/notes", { projectId, body });
  // Propositions de tâches (Lot 3) : proposer (non-membre) puis décider (propriétaire).
  const proposeProjectTask = async (
    projectId: string,
    payload: { title: string; description?: string; dueDate?: string | null }
  ) => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/proposals", { op: "create", projectId, ...payload });
    if (!e) toast("Proposition envoyée au propriétaire.", "success");
    return e;
  };
  const decideProjectProposal = async (proposalId: string, approve: boolean, note?: string) => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/proposals", { op: "decide", proposalId, approve, note });
    if (!e) toast(approve ? "Proposition intégrée au projet." : "Proposition refusée.", "success");
    return e;
  };
  const attachItemToProject = async (itemId: string, projectId: string | null) =>
    demo ? DEMO_MSG : postProjects("/api/projects/attach", { itemId, projectId });
  // Workflow de statut : proposer (manager/responsable) puis valider (directeur).
  const requestProjectStatus = async (id: string, status: string) =>
    demo ? DEMO_MSG : postProjects("/api/projects/status", { op: "request", id, status });
  const decideProjectStatus = async (id: string, approve: boolean) =>
    demo ? DEMO_MSG : postProjects("/api/projects/status", { op: "decide", id, approve });
  // Demande de clôture d'un projet (agent) + décision (manager/directeur).
  const requestProjectClosure = async (id: string, summary: string, deliverables: string[]) => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/closure", { op: "request", id, summary, deliverables });
    if (!e) toast("Demande de clôture envoyée.", "success");
    return e;
  };
  // Archivage & suppression d'un projet (demande + approbation manager/admin).
  const archiveProject = async (id: string, archived: boolean) =>
    demo ? DEMO_MSG : postProjects("/api/projects/lifecycle", { op: "archive", id, archived });
  const requestProjectDeletion = async (id: string, reason: string) => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/lifecycle", { op: "request_delete", id, reason });
    if (!e) toast("Demande de suppression envoyée.", "success");
    return e;
  };
  const decideProjectDeletion = async (id: string, approve: boolean, note = "") => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/lifecycle", { op: approve ? "approve_delete" : "reject_delete", id, note });
    if (!e) toast(approve ? "Projet supprimé." : "Demande de suppression refusée.", approve ? "success" : "info");
    return e;
  };
  /** Suppression directe (directeur/admin), sans passer par une demande. */
  const deleteProjectNow = async (id: string) => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/lifecycle", { op: "delete_now", id });
    if (!e) toast("Projet supprimé.", "success");
    return e;
  };
  const decideProjectClosure = async (id: string, approve: boolean, note = "") => {
    if (demo) return DEMO_MSG;
    const e = await postProjects("/api/projects/closure", { op: "decide", id, approve, note });
    if (!e) {
      if (approve) {
        fireConfetti();
        toast("Projet clôturé 🎉", "success");
      } else toast("Demande de clôture refusée.", "info");
    }
    return e;
  };

  /* ---------- Tâches (productivité) ---------- */
  const refreshTasks = async () => {
    if (demo) return;
    try {
      const r = await fetch("/api/tasks", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (d.tasks) setTasks(reviveTasks(d.tasks));
    } catch {
      /* réseau : réessai au prochain sondage */
    }
  };
  const taskAction = async (op: "create" | "update" | "delete", input: TaskInput): Promise<string | null> => {
    if (demo) return "Tâches indisponibles en mode démo.";
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.tasks) setTasks(reviveTasks(d.tasks));
    return null;
  };
  /* ---------- Tâches récurrentes ---------- */
  const applyRecurrencePayload = (d: {
    recurrences?: TaskRecurrence[];
    counts?: Record<string, { total: number; open: number }>;
    tasks?: Task[];
  }) => {
    if (d.recurrences) setRecurrences(reviveRecurrences(d.recurrences));
    if (d.counts) setRecurrenceCounts(d.counts);
    if (d.tasks) setTasks(reviveTasks(d.tasks));
  };
  const refreshRecurrences = async () => {
    if (demo) return;
    try {
      const r = await fetch("/api/tasks/recurrences", { cache: "no-store" });
      if (!r.ok) return;
      applyRecurrencePayload(await r.json());
    } catch {
      /* réseau : réessai au prochain chargement */
    }
  };
  const recurrenceAction = async (
    op: "create" | "update" | "toggle" | "delete" | "run",
    input: Record<string, unknown>
  ): Promise<string | null> => {
    if (demo) return "Tâches indisponibles en mode démo.";
    const res = await fetch("/api/tasks/recurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    applyRecurrencePayload(d);
    return null;
  };

  /* ---------- Comptes rendus ---------- */
  const refreshReports = async () => {
    if (demo) return;
    try {
      const r = await fetch("/api/reports", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (d.reports) setReports(reviveReports(d.reports));
    } catch {
      /* réseau : réessai au prochain chargement */
    }
  };
  const reportsFor = (refType: ReportRefType, refId: string): Report[] =>
    reports.filter((r) => r.refType === refType && r.refId === refId);
  const reportAction = async (
    op: "create" | "update" | "delete",
    input: Record<string, unknown>
  ): Promise<string | null> => {
    if (demo) return "Comptes rendus indisponibles en mode démo.";
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.reports) setReports(reviveReports(d.reports));
    return null;
  };

  const subtaskAction = async (op: "add" | "toggle" | "rename" | "delete", input: SubtaskInput): Promise<string | null> => {
    if (demo) return "Tâches indisponibles en mode démo.";
    const res = await fetch("/api/tasks/subtasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Erreur.";
    if (d.tasks) setTasks(reviveTasks(d.tasks));
    return null;
  };

  /* ---------- Plan de l'année (objectifs) ---------- */
  const objectiveAction = async (op: "create" | "update" | "downgrade" | "achieve" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Plan de l'année indisponible en mode démo.";
    const res = await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast(d.error ?? "Erreur.", "error");
      return d.error ?? "Erreur.";
    }
    if (d.objectives) setObjectives(reviveObjectives(d.objectives));
    if (op === "achieve") {
      fireConfetti();
      toast("Objectif atteint 🎯", "success");
    } else if (op === "create") toast("Objectif ajouté au plan de l'année.", "success");
    return null;
  };

  /* ---------- GRC : Registre des risques ---------- */
  const riskById = (id: string): Risk | null => risks.find((r) => r.id === id) ?? null;
  const riskAction = async (op: "create" | "update" | "status" | "delete" | "accept" | "review", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Registre des risques indisponible en mode démo.";
    const res = await fetch("/api/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast(d.error ?? "Erreur.", "error");
      return d.error ?? "Erreur.";
    }
    if (d.risks) setRisks(reviveRisks(d.risks));
    if (op === "create") toast("Risque ajouté au registre.", "success");
    else if (op === "delete") toast("Risque supprimé.", "success");
    return null;
  };
  const createRisk = (input: RiskInput) => riskAction("create", input as Record<string, unknown>);
  const updateRisk = (id: string, fields: RiskInput) => riskAction("update", { id, ...fields });
  const setRiskStatus = (id: string, status: string) => riskAction("status", { id, status });
  const deleteRisk = (id: string) => riskAction("delete", { id });
  const acceptRisk = (id: string, acceptUntil: string | null, justification: string) => riskAction("accept", { id, acceptUntil, justification });
  const reviewRisk = (id: string, note: string) => riskAction("review", { id, note });

  /* ---------- GRC : Politiques de sécurité ---------- */
  const policyById = (id: string): Policy | null => policies.find((p) => p.id === id) ?? null;
  const policyAction = async (op: "create" | "update" | "delete" | "diffuse" | "undiffuse", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Gestion des politiques indisponible en mode démo.";
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast(d.error ?? "Erreur.", "error");
      return d.error ?? "Erreur.";
    }
    if (d.policies) setPolicies(revivePolicies(d.policies));
    if (op === "create") toast("Politique ajoutée.", "success");
    else if (op === "delete") toast("Politique supprimée.", "success");
    return null;
  };
  const createPolicy = (input: PolicyInput) => policyAction("create", input as Record<string, unknown>);
  const updatePolicy = (id: string, fields: PolicyInput) => policyAction("update", { id, ...fields });
  const deletePolicy = (id: string) => policyAction("delete", { id });
  const setPolicyDiffusion = (id: string, service: string, stage: string, note?: string) => policyAction("diffuse", { id, service, stage, note: note ?? "" });
  const removePolicyDiffusion = (id: string, service: string) => policyAction("undiffuse", { id, service });

  /* ---------- GRC : Registre des actifs ---------- */
  const assetById = (id: string): Asset | null => assets.find((a) => a.id === id) ?? null;
  const assetAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Registre des actifs indisponible en mode démo.";
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast(d.error ?? "Erreur.", "error");
      return d.error ?? "Erreur.";
    }
    if (d.assets) setAssets(reviveAssets(d.assets));
    if (op === "create") toast("Actif ajouté au registre.", "success");
    else if (op === "delete") toast("Actif supprimé.", "success");
    return null;
  };
  const createAsset = (input: AssetInput) => assetAction("create", input as Record<string, unknown>);
  const updateAsset = (id: string, fields: AssetInput) => assetAction("update", { id, ...fields });
  const deleteAsset = (id: string) => assetAction("delete", { id });

  /* ---------- GRC : Conformité (évaluation des mesures) ---------- */
  const controlAction = async (op: "assess" | "reset", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Conformité indisponible en mode démo.";
    const res = await fetch("/api/controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...input }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast(d.error ?? "Erreur.", "error");
      return d.error ?? "Erreur.";
    }
    if (d.controlAssessments) setControlAssessments(reviveAssessments(d.controlAssessments));
    return null;
  };
  const assessControl = (frameworkId: string, controlCode: string, fields: ControlInput) => controlAction("assess", { frameworkId, controlCode, ...fields });
  const resetControl = (frameworkId: string, controlCode: string) => controlAction("reset", { frameworkId, controlCode });

  /* ---------- GRC : Contrôles terrain ---------- */
  const fieldControlById = (id: string): FieldControl | null => fieldControls.find((c) => c.id === id) ?? null;
  const fcAction = async (op: "create" | "update" | "delete" | "event", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Contrôles terrain indisponibles en mode démo.";
    const res = await fetch("/api/field-controls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.fieldControls) setFieldControls(reviveFieldControls(d.fieldControls));
    if (op === "create") toast("Contrôle terrain créé.", "success");
    else if (op === "delete") toast("Contrôle supprimé.", "success");
    else if (op === "event") toast("Action de suivi ajoutée.", "success");
    return null;
  };
  const createFieldControl = (input: FieldControlInput) => fcAction("create", input as Record<string, unknown>);
  const updateFieldControl = (id: string, fields: FieldControlInput) => fcAction("update", { id, ...fields });
  const deleteFieldControl = (id: string) => fcAction("delete", { id });
  const addControlEvent = (id: string, label: string) => fcAction("event", { id, label });

  /* ---------- GRC : Plan d'actions (CAPA) ---------- */
  const capaById = (id: string): CapaAction | null => capaActions.find((a) => a.id === id) ?? null;
  const capaAction = async (op: "create" | "update" | "status" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Plan d'actions indisponible en mode démo.";
    const res = await fetch("/api/capa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.capaActions) setCapaActions(reviveCapas(d.capaActions));
    if (op === "create") toast("Action ajoutée au plan.", "success");
    else if (op === "delete") toast("Action supprimée.", "success");
    return null;
  };
  const createCapa = (input: CapaInput) => capaAction("create", input as Record<string, unknown>);
  const updateCapa = (id: string, fields: CapaInput) => capaAction("update", { id, ...fields });
  const setCapaStatus = (id: string, status: string) => capaAction("status", { id, status });
  const deleteCapa = (id: string) => capaAction("delete", { id });

  /* ---------- GRC : Plan de travail (chantiers) ---------- */
  const planItemById = (id: string): GrcPlanItem | null => planItems.find((p) => p.id === id) ?? null;
  const planAction = async (op: "create" | "update" | "status" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Plan de travail indisponible en mode démo.";
    const res = await fetch("/api/grc-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.planItems) setPlanItems(revivePlans(d.planItems));
    if (op === "create") toast("Chantier ajouté au plan.", "success");
    else if (op === "delete") toast("Chantier supprimé.", "success");
    return null;
  };
  const createPlanItem = (input: PlanInput) => planAction("create", input as Record<string, unknown>);
  const updatePlanItem = (id: string, fields: PlanInput) => planAction("update", { id, ...fields });
  const setPlanStatus = (id: string, status: string) => planAction("status", { id, status });
  const deletePlanItem = (id: string) => planAction("delete", { id });

  /* ---------- GRC : Organigramme (directions → services) ---------- */
  const directionById = (id: string): Direction | null => directions.find((d) => d.id === id) ?? null;
  const dirAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Organigramme indisponible en mode démo.";
    const res = await fetch("/api/directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.directions) setDirections(reviveDirections(d.directions));
    if (op === "create") toast("Direction ajoutée.", "success");
    else if (op === "delete") toast("Direction supprimée.", "success");
    return null;
  };
  const createDirection = (input: DirectionInput) => dirAction("create", input as Record<string, unknown>);
  const updateDirection = (id: string, fields: DirectionInput) => dirAction("update", { id, ...fields });
  const deleteDirection = (id: string) => dirAction("delete", { id });

  /* ---------- GRC : Académie (entraînement) ---------- */
  const completeLesson = async (lessonId: string, score: number): Promise<string | null> => {
    // En démo : progression conservée en mémoire (pas de persistance serveur).
    if (demo) {
      setTrainingDone((prev) => {
        const s = Math.max(0, Math.min(100, Math.round(score)));
        const ex = prev.find((d) => d.lessonId === lessonId);
        if (ex) return prev.map((d) => (d.lessonId === lessonId ? { ...d, score: Math.max(d.score, s), completedAt: new Date() } : d));
        return [...prev, { lessonId, score: s, completedAt: new Date() }];
      });
      return null;
    }
    const res = await fetch("/api/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "complete", lessonId, score }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.progress) setTrainingDone(reviveDone(d.progress));
    return null;
  };
  const trainingEdit = async (op: string, input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Édition de l'Académie indisponible en mode démo.";
    const res = await fetch("/api/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.courses) setTrainingCourses(reviveCourses(d.courses));
    if (op.endsWith(".delete")) toast("Supprimé.", "success");
    else toast("Enregistré.", "success");
    return null;
  };

  /* ---------- GRC : Missions & dépendances ---------- */
  const missionById = (id: string): Mission | null => missions.find((m) => m.id === id) ?? null;
  const missionAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Missions indisponibles en mode démo.";
    const res = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.missions) setMissions(reviveMissions(d.missions));
    if (op === "create") toast("Mission ajoutée.", "success");
    else if (op === "delete") toast("Mission supprimée.", "success");
    return null;
  };
  const createMission = (input: MissionInput) => missionAction("create", input as Record<string, unknown>);
  const updateMission = (id: string, fields: MissionInput) => missionAction("update", { id, ...fields });
  const deleteMission = (id: string) => missionAction("delete", { id });

  /* ---------- GRC : Fournisseurs & prestataires ---------- */
  const supplierById = (id: string): Supplier | null => suppliers.find((s) => s.id === id) ?? null;
  const supplierAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Fournisseurs indisponibles en mode démo.";
    const res = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.suppliers) setSuppliers(reviveSuppliers(d.suppliers));
    if (op === "create") toast("Fournisseur ajouté.", "success");
    else if (op === "delete") toast("Fournisseur supprimé.", "success");
    return null;
  };
  const createSupplier = (input: SupplierInput) => supplierAction("create", input as Record<string, unknown>);
  const updateSupplier = (id: string, fields: SupplierInput) => supplierAction("update", { id, ...fields });
  const deleteSupplier = (id: string) => supplierAction("delete", { id });

  /* ---------- Audit : grilles d'audit technique ---------- */
  const auditGridById = (id: string): AuditGrid | null => auditGrids.find((g) => g.id === id) ?? null;
  const auditGridAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Grilles d'audit indisponibles en mode démo.";
    const res = await fetch("/api/audit-grids", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.auditGrids) setAuditGrids(reviveAuditGrids(d.auditGrids));
    if (op === "create") toast("Grille créée.", "success");
    else if (op === "delete") toast("Grille supprimée.", "success");
    return null;
  };
  const createAuditGrid = (input: AuditGridInput) => auditGridAction("create", input as Record<string, unknown>);
  const updateAuditGrid = (id: string, fields: AuditGridInput) => auditGridAction("update", { id, ...fields });
  const deleteAuditGrid = (id: string) => auditGridAction("delete", { id });

  /* ---------- Audit : audits réalisés ---------- */
  const auditById = (id: string): Audit | null => audits.find((a) => a.id === id) ?? null;
  const auditAction = async (op: "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Audits indisponibles en mode démo.";
    const res = await fetch("/api/audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.audits) setAudits(reviveAudits(d.audits));
    if (op === "delete") toast("Audit supprimé.", "success");
    return null;
  };
  // createAudit renvoie l'id du nouvel audit (ou null en cas d'échec) pour ouvrir le questionnaire aussitôt.
  const createAudit = async (input: AuditInput): Promise<string | null> => {
    if (demo) { toast("Audits indisponibles en mode démo.", "error"); return null; }
    const res = await fetch("/api/audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "create", ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return null; }
    if (d.audits) setAudits(reviveAudits(d.audits));
    toast("Audit créé.", "success");
    return d.audit?.id ?? null;
  };
  const updateAudit = (id: string, fields: AuditInput) => auditAction("update", { id, ...fields });
  const deleteAudit = (id: string) => auditAction("delete", { id });

  /* ---------- Audit : programme d'audit annuel ---------- */
  const auditPlanAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Programme d'audit indisponible en mode démo.";
    const res = await fetch("/api/audit-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.auditPlanItems) setAuditPlanItems(reviveAuditPlanItems(d.auditPlanItems));
    if (op === "create") toast("Item ajouté au programme.", "success");
    else if (op === "delete") toast("Item supprimé.", "success");
    return null;
  };
  const createAuditPlanItem = (input: AuditPlanInput) => auditPlanAction("create", input as Record<string, unknown>);
  const updateAuditPlanItem = (id: string, fields: AuditPlanInput) => auditPlanAction("update", { id, ...fields });
  const deleteAuditPlanItem = (id: string) => auditPlanAction("delete", { id });

  /* ---------- Audit : registre des auditeurs ---------- */
  const auditorAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Registre des auditeurs indisponible en mode démo.";
    const res = await fetch("/api/auditors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.auditors) setAuditors(reviveAuditors(d.auditors));
    if (op === "create") toast("Auditeur ajouté.", "success");
    else if (op === "delete") toast("Auditeur supprimé.", "success");
    return null;
  };
  const createAuditor = (input: AuditorInput) => auditorAction("create", input as Record<string, unknown>);
  const updateAuditor = (id: string, fields: AuditorInput) => auditorAction("update", { id, ...fields });
  const deleteAuditor = (id: string) => auditorAction("delete", { id });

  /* ---------- SOC : runbooks de réponse ---------- */
  const runbookById = (id: string): Runbook | null => runbooks.find((r) => r.id === id) ?? null;
  const runbookAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Runbooks indisponibles en mode démo.";
    const res = await fetch("/api/runbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.runbooks) setRunbooks(reviveRunbooks(d.runbooks));
    if (op === "create") toast("Runbook créé.", "success");
    else if (op === "delete") toast("Runbook supprimé.", "success");
    return null;
  };
  const createRunbook = (input: RunbookInput) => runbookAction("create", input as Record<string, unknown>);
  const updateRunbook = (id: string, fields: RunbookInput) => runbookAction("update", { id, ...fields });
  const deleteRunbook = (id: string) => runbookAction("delete", { id });

  /* ---------- SOC : procédures & checklists de routine ---------- */
  const socProcedureAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Procédures indisponibles en mode démo.";
    const res = await fetch("/api/soc-procedures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.socProcedures) setSocProcedures(reviveSocProcedures(d.socProcedures));
    if (op === "create") toast("Procédure créée.", "success");
    else if (op === "delete") toast("Procédure supprimée.", "success");
    return null;
  };
  const createSocProcedure = (input: SocProcedureInput) => socProcedureAction("create", input as Record<string, unknown>);
  const updateSocProcedure = (id: string, fields: SocProcedureInput) => socProcedureAction("update", { id, ...fields });
  const deleteSocProcedure = (id: string) => socProcedureAction("delete", { id });

  /* ---------- SOC : couverture MITRE ATT&CK ---------- */
  const attackAction = async (op: "assess" | "reset", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Couverture ATT&CK indisponible en mode démo.";
    const res = await fetch("/api/attack-coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.attackCoverage) setAttackCoverage(reviveAttackCoverage(d.attackCoverage));
    return null;
  };
  const assessAttack = (techniqueId: string, fields: { status?: string; detectionNote?: string }) => attackAction("assess", { techniqueId, ...fields });
  const resetAttack = (techniqueId: string) => attackAction("reset", { techniqueId });

  /* ---------- SOC : veille & threat intel ---------- */
  const intelAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Veille indisponible en mode démo.";
    const res = await fetch("/api/intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.intel) setIntel(reviveIntel(d.intel));
    if (op === "create") toast("Élément de veille ajouté.", "success");
    else if (op === "delete") toast("Élément supprimé.", "success");
    return null;
  };
  const createIntel = (input: IntelInput) => intelAction("create", input as Record<string, unknown>);
  const updateIntel = (id: string, fields: IntelInput) => intelAction("update", { id, ...fields });
  const deleteIntel = (id: string) => intelAction("delete", { id });

  /* ---------- SOC : astreinte / planning ---------- */
  const onCallAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Astreinte indisponible en mode démo.";
    const res = await fetch("/api/oncall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.onCall) setOnCall(reviveOnCall(d.onCall));
    if (op === "create") toast("Garde ajoutée.", "success");
    else if (op === "delete") toast("Garde supprimée.", "success");
    return null;
  };
  const createOnCall = (input: OnCallInput) => onCallAction("create", input as Record<string, unknown>);
  const updateOnCall = (id: string, fields: OnCallInput) => onCallAction("update", { id, ...fields });
  const deleteOnCall = (id: string) => onCallAction("delete", { id });

  /* ---------- GRC : Continuité d'activité (BIA/PCA) ---------- */
  const continuityById = (id: string): ContinuityPlan | null => continuityPlans.find((p) => p.id === id) ?? null;
  const continuityAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Continuité indisponible en mode démo.";
    const res = await fetch("/api/continuity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.continuityPlans) setContinuityPlans(reviveContinuity(d.continuityPlans));
    if (op === "create") toast("Plan de continuité ajouté.", "success");
    else if (op === "delete") toast("Plan supprimé.", "success");
    return null;
  };
  const createContinuity = (input: ContinuityInput) => continuityAction("create", input as Record<string, unknown>);
  const updateContinuity = (id: string, fields: ContinuityInput) => continuityAction("update", { id, ...fields });
  const deleteContinuity = (id: string) => continuityAction("delete", { id });

  /* ---------- GRC : Gestion des incidents ---------- */
  const incidentById = (id: string): Incident | null => incidents.find((i) => i.id === id) ?? null;
  const incidentAction = async (op: "create" | "update" | "status" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Incidents indisponibles en mode démo.";
    const res = await fetch("/api/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.incidents) setIncidents(reviveIncidents(d.incidents));
    if (op === "create") toast("Incident déclaré.", "success");
    else if (op === "delete") toast("Incident supprimé.", "success");
    return null;
  };
  const createIncident = (input: IncidentInput) => incidentAction("create", input as Record<string, unknown>);
  const updateIncident = (id: string, fields: IncidentInput) => incidentAction("update", { id, ...fields });
  const setIncidentStatus = (id: string, status: string) => incidentAction("status", { id, status });
  const deleteIncident = (id: string) => incidentAction("delete", { id });

  /* ---------- GRC : RGPD (registre des traitements + AIPD) ---------- */
  const processingById = (id: string): ProcessingActivity | null => processing.find((p) => p.id === id) ?? null;
  const rgpdAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "RGPD indisponible en mode démo.";
    const res = await fetch("/api/rgpd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.processing) setProcessing(reviveProcessing(d.processing));
    if (op === "create") toast("Traitement ajouté au registre.", "success");
    else if (op === "delete") toast("Traitement supprimé.", "success");
    return null;
  };
  const createProcessing = (input: ProcessingInput) => rgpdAction("create", input as Record<string, unknown>);
  const updateProcessing = (id: string, fields: ProcessingInput) => rgpdAction("update", { id, ...fields });
  const deleteProcessing = (id: string) => rgpdAction("delete", { id });

  /* ---------- GRC : Revue de direction ---------- */
  const reviewById = (id: string): DirectionReview | null => reviews.find((r) => r.id === id) ?? null;
  const reviewAction = async (op: "create" | "update" | "delete", input: Record<string, unknown>): Promise<string | null> => {
    if (demo) return "Revue de direction indisponible en mode démo.";
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...input }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Erreur.", "error"); return d.error ?? "Erreur."; }
    if (d.reviews) setReviews(reviveReviews(d.reviews));
    if (op === "create") toast("Revue de direction créée.", "success");
    else if (op === "delete") toast("Revue supprimée.", "success");
    return null;
  };
  const createReview = (input: ReviewInput) => reviewAction("create", input as Record<string, unknown>);
  const updateReview = (id: string, fields: ReviewInput) => reviewAction("update", { id, ...fields });
  const deleteReview = (id: string) => reviewAction("delete", { id });

  /* ---------- Messagerie ---------- */
  const messagesUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const refreshConversations = async () => {
    if (demo) return;
    try {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (d.conversations) setConversations(reviveConvs(d.conversations));
      if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    } catch {
      /* réseau : on réessaiera au prochain sondage */
    }
  };

  const loadMessages = async (t: MsgTarget): Promise<{ conversationId: string | null; messages: Message[]; muted: boolean }> => {
    if (demo) return { conversationId: null, messages: [], muted: false };
    const q = t.convId ? `convId=${t.convId}` : `refType=${t.refType}&refId=${t.refId}`;
    const r = await fetch(`/api/messages?${q}`, { cache: "no-store" });
    const d = await r.json();
    if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    refreshConversations();
    return { conversationId: d.conversationId ?? null, messages: d.messages ? reviveMsgs(d.messages) : [], muted: Boolean(d.muted) };
  };

  // Couper / réactiver les notifications d'un fil (préférence personnelle).
  const muteConversation = async (t: MsgTarget, muted: boolean): Promise<boolean> => {
    if (demo) return false;
    try {
      const r = await fetch("/api/messages/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convId: t.convId, refType: t.refType, refId: t.refId, muted }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d.error ?? "Action échouée.", "error"); return false; }
      if (d.conversations) setConversations(reviveConvs(d.conversations));
      if (d.notifications) setNotifications(reviveNotifs(d.notifications));
      toast(muted ? "Fil mis en sourdine." : "Notifications du fil réactivées.", "success");
      return true;
    } catch {
      toast("Action échouée.", "error");
      return false;
    }
  };

  const sendMessage = async (t: MsgTarget, body: string, replyTo?: string | null): Promise<Message[]> => {
    if (demo) return [];
    const r = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, body, replyTo: replyTo ?? null }),
    });
    const d = await r.json();
    if (!r.ok) return [];
    if (d.conversations) setConversations(reviveConvs(d.conversations));
    if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    return d.messages ? reviveMsgs(d.messages) : [];
  };

  /** Envoie un fichier (avec légende optionnelle) dans une conversation. Renvoie {messages, error}. */
  const sendMessageFile = async (t: MsgTarget, file: File, body?: string, replyTo?: string | null): Promise<{ messages: Message[]; error: string | null }> => {
    if (demo) return { messages: [], error: "Indisponible en mode démo." };
    const fd = new FormData();
    fd.append("file", file);
    if (t.convId) fd.append("convId", t.convId);
    if (t.refType) fd.append("refType", t.refType);
    if (t.refId) fd.append("refId", t.refId);
    if (body) fd.append("body", body);
    if (replyTo) fd.append("replyTo", replyTo);
    const r = await fetch("/api/message-files", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { messages: [], error: d?.error || "Envoi du fichier échoué." };
    if (d.conversations) setConversations(reviveConvs(d.conversations));
    if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    return { messages: d.messages ? reviveMsgs(d.messages) : [], error: null };
  };

  /** Battement de cœur + saisie ; renvoie l'état de présence du fil (ou global). */
  const pingPresence = async (
    convId?: string | null,
    typing = false
  ): Promise<{ onlineIds: string[]; memberIds: string[]; typing: string[]; reads: Record<string, string> }> => {
    const empty = { onlineIds: [] as string[], memberIds: [] as string[], typing: [] as string[], reads: {} as Record<string, string> };
    if (demo) return empty;
    const r = await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convId: convId ?? null, typing }),
    }).catch(() => null);
    if (!r || !r.ok) return empty;
    const d = await r.json().catch(() => empty);
    if (Array.isArray(d.onlineIds)) setOnlineIds(d.onlineIds);
    return { onlineIds: d.onlineIds ?? [], memberIds: d.memberIds ?? [], typing: d.typing ?? [], reads: d.reads ?? {} };
  };

  const reactToMessage = async (messageId: string, emoji: string): Promise<Message[] | null> => {
    if (demo) return null;
    const r = await fetch("/api/messages/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    const d = await r.json();
    if (!r.ok) return null;
    return d.messages ? reviveMsgs(d.messages) : [];
  };

  const createGroup = async (title: string, memberIds: string[]): Promise<string | null> => {
    if (demo) return "Messagerie indisponible en mode démo.";
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, memberIds }),
    });
    const d = await r.json();
    if (!r.ok) return d.error ?? "Erreur.";
    if (d.conversations) setConversations(reviveConvs(d.conversations));
    return null;
  };

  // Ouvre (ou crée) une conversation privée et renvoie son id.
  const startDirect = async (profileId: string): Promise<string | null> => {
    if (demo) return null;
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directWith: profileId }),
    });
    const d = await r.json();
    if (!r.ok) return null;
    if (d.conversations) setConversations(reviveConvs(d.conversations));
    return d.conversationId ?? null;
  };

  // Supprime un message envoyé ; renvoie les messages à jour du fil.
  const deleteMessage = async (messageId: string): Promise<Message[] | null> => {
    if (demo) return null;
    const r = await fetch("/api/messages/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const d = await r.json();
    if (!r.ok) return null;
    return d.messages ? reviveMsgs(d.messages) : [];
  };

  // Supprime un groupe (créateur/admin).
  const deleteGroup = async (convId: string): Promise<string | null> => {
    if (demo) return "Indisponible en mode démo.";
    const r = await fetch("/api/conversations/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convId }),
    });
    const d = await r.json();
    if (!r.ok) return d.error ?? "Erreur.";
    if (d.conversations) setConversations(reviveConvs(d.conversations));
    if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    return null;
  };

  const markConversationRead = (convId: string) => {
    if (demo) return;
    fetch("/api/conversations/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.conversations) setConversations(reviveConvs(d.conversations));
        if (d.notifications) setNotifications(reviveNotifs(d.notifications));
      })
      .catch(() => {});
  };

  // Chargement initial des gabarits récurrents (la lecture engendre aussi les
  // occurrences du jour, côté serveur).
  useEffect(() => {
    refreshRecurrences();
    refreshReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Sondage périodique (pas de WebSocket sur le serveur local).
  useEffect(() => {
    if (demo) return;
    pingPresence(); // battement immédiat pour apparaître « en ligne »
    const iv = setInterval(() => {
      refreshConversations();
      refreshTasks();
      pingPresence(); // maintient la présence + rafraîchit qui est en ligne
    }, 20000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const scores = useMemo(
    () => computeScores(items, profiles, now, catalogue.types),
    [items, profiles, now, catalogue]
  );
  // Cloche : en démo, dérivée des objets ; en local, nombre de notifications non lues.
  const alerts = demo
    ? listNotifications(items, now, me)
    : notifications.filter((n) => !n.read).length;

  const value: AppCtx = {
    demo,
    ready,
    items,
    now,
    me,
    meId,
    setMeId,
    profiles,
    profileById,
    setProfileGrc,
    updateAccount,
    catalogue,
    rs,
    scores,
    orgName,
    orgLogo,
    emailEnabled,
    digestHour,
    applySettings,
    open,
    openItem: (i) => setOpen(i),
    closeItem: () => setOpen(null),
    showNew,
    setShowNew,
    showImport,
    setShowImport,
    importEmailResponse,
    createItemFromEmail,
    correctDestinataire,
    meetings,
    meetingById,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    contacts,
    createContact,
    updateContact,
    deleteContact,
    act,
    create,
    setRelanceDate,
    publishItem,
    publishProject,
    publishTask,
    updateItem,
    bulkAct,
    setItemLate,
    sendRelanceEmail,
    addBlocageAction,
    setAppreciation,
    updateRole,
    catalogueAction,
    refLists,
    refListAction,
    templates,
    templateAction,
    negligences,
    negligenceById,
    negligenceByItem,
    createNegligence,
    updateNegligence,
    setNegligenceStatus,
    setNegligenceDecisions,
    nonConformites,
    nonConformiteById,
    nonConformiteByItem,
    createNonConformite,
    updateNonConformite,
    setNonConformiteStatus,
    setNonConformiteDecisions,
    notifications,
    markNotificationsRead,
    markNotificationRead,
    alerts,
    signOut,
    conversations,
    messagesUnread,
    loadMessages,
    muteConversation,
    sendMessage,
    sendMessageFile,
    onlineIds,
    isOnline: (profileId: string) => onlineIds.includes(profileId),
    pingPresence,
    reactToMessage,
    createGroup,
    startDirect,
    deleteMessage,
    deleteGroup,
    markConversationRead,
    projects,
    projectById,
    createProject,
    updateProject,
    projectTask,
    projectMember,
    projectNote,
    proposeProjectTask,
    decideProjectProposal,
    attachItemToProject,
    requestProjectStatus,
    decideProjectStatus,
    requestProjectClosure,
    decideProjectClosure,
    archiveProject,
    requestProjectDeletion,
    decideProjectDeletion,
    deleteProjectNow,
    tasks,
    taskAction,
    reports,
    reportsFor,
    reportAction,
    recurrences,
    recurrenceCounts,
    recurrenceAction,
    subtaskAction,
    objectives,
    objectiveAction,
    risks,
    riskById,
    createRisk,
    updateRisk,
    setRiskStatus,
    deleteRisk,
    acceptRisk,
    reviewRisk,
    policies,
    policyById,
    createPolicy,
    updatePolicy,
    deletePolicy,
    setPolicyDiffusion,
    removePolicyDiffusion,
    assets,
    assetById,
    createAsset,
    updateAsset,
    deleteAsset,
    controlAssessments,
    assessControl,
    resetControl,
    fieldControls,
    fieldControlById,
    createFieldControl,
    updateFieldControl,
    deleteFieldControl,
    addControlEvent,
    capaActions,
    capaById,
    createCapa,
    updateCapa,
    setCapaStatus,
    deleteCapa,
    planItems,
    planItemById,
    createPlanItem,
    updatePlanItem,
    setPlanStatus,
    deletePlanItem,
    directions,
    directionById,
    createDirection,
    updateDirection,
    deleteDirection,
    trainingCourses,
    trainingDone,
    trainingProgressAll,
    completeLesson,
    trainingEdit,
    missions,
    missionById,
    createMission,
    updateMission,
    deleteMission,
    suppliers,
    supplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    auditGrids,
    auditGridById,
    createAuditGrid,
    updateAuditGrid,
    deleteAuditGrid,
    audits,
    auditById,
    createAudit,
    updateAudit,
    deleteAudit,
    auditPlanItems,
    createAuditPlanItem,
    updateAuditPlanItem,
    deleteAuditPlanItem,
    auditors,
    createAuditor,
    updateAuditor,
    deleteAuditor,
    runbooks,
    runbookById,
    createRunbook,
    updateRunbook,
    deleteRunbook,
    socProcedures,
    createSocProcedure,
    updateSocProcedure,
    deleteSocProcedure,
    attackCoverage,
    assessAttack,
    resetAttack,
    intel,
    createIntel,
    updateIntel,
    deleteIntel,
    onCall,
    createOnCall,
    updateOnCall,
    deleteOnCall,
    continuityPlans,
    continuityById,
    createContinuity,
    updateContinuity,
    deleteContinuity,
    incidents,
    incidentById,
    createIncident,
    updateIncident,
    setIncidentStatus,
    deleteIncident,
    processing,
    processingById,
    createProcessing,
    updateProcessing,
    deleteProcessing,
    reviews,
    reviewById,
    createReview,
    updateReview,
    deleteReview,
    openTaskId,
    setOpenTaskId,
    soundEnabled,
    setSoundEnabled,
    pushEnabled,
    setPushEnabled,
    readOnly: isReadOnly(me),
    theme,
    toggleTheme,
    toasts,
    toast,
    dismissToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
