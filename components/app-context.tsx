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
  type Negligence,
  type NonConformite,
  type Objective,
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
  type Role,
  type Score,
  type Task,
  type TaskPriority,
  type TaskStatus,
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
  dueDate?: string | null;
}
interface ProjectFields {
  name?: string;
  description?: string;
  status?: ProjectStatus;
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
  updateAccount: (fields: { fullName?: string; poste?: string; avatar?: string }) => Promise<boolean>;
  catalogue: Catalogue;
  rs: (item: Item) => ReminderState;
  scores: Score[];
  orgName: string;
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
  loadMessages: (t: MsgTarget) => Promise<{ conversationId: string | null; messages: Message[] }>;
  sendMessage: (t: MsgTarget, body: string, replyTo?: string | null) => Promise<Message[]>;
  reactToMessage: (messageId: string, emoji: string) => Promise<Message[] | null>;
  createGroup: (title: string, memberIds: string[]) => Promise<string | null>;
  startDirect: (profileId: string) => Promise<string | null>;
  deleteMessage: (messageId: string) => Promise<Message[] | null>;
  deleteGroup: (convId: string) => Promise<string | null>;
  markConversationRead: (convId: string) => void;
  // Module Projet
  projects: Project[];
  projectById: (id: string) => Project | null;
  createProject: (name: string, description: string, deadline: string | null, memberIds?: string[]) => Promise<string | null>;
  updateProject: (id: string, fields: ProjectFields) => Promise<string | null>;
  projectTask: (action: "add" | "update" | "delete", payload: TaskPayload) => Promise<string | null>;
  projectMember: (action: "add" | "remove", projectId: string, profileId: string) => Promise<string | null>;
  projectNote: (projectId: string, body: string) => Promise<string | null>;
  attachItemToProject: (itemId: string, projectId: string | null) => Promise<string | null>;
  requestProjectStatus: (id: string, status: string) => Promise<string | null>;
  decideProjectStatus: (id: string, approve: boolean) => Promise<string | null>;
  requestProjectClosure: (id: string, summary: string, deliverables: string[]) => Promise<string | null>;
  decideProjectClosure: (id: string, approve: boolean, note?: string) => Promise<string | null>;
  archiveProject: (id: string, archived: boolean) => Promise<string | null>;
  requestProjectDeletion: (id: string, reason: string) => Promise<string | null>;
  decideProjectDeletion: (id: string, approve: boolean, note?: string) => Promise<string | null>;
  // Tâches (productivité)
  tasks: Task[];
  taskAction: (op: "create" | "update" | "delete", input: TaskInput) => Promise<string | null>;
  // Plan de l'année (objectifs)
  objectives: Objective[];
  objectiveAction: (op: "create" | "update" | "downgrade" | "achieve" | "delete", input: Record<string, unknown>) => Promise<string | null>;
  subtaskAction: (op: "add" | "toggle" | "rename" | "delete", input: SubtaskInput) => Promise<string | null>;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  // Son des notifications
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
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
const FALLBACK_PROFILE: Profile = { id: "", nom: "…", poste: "", role: "agent", init: "?", extraPages: [], deniedPages: [], readonly: false, approved: true, mustChangePassword: false, totpEnabled: false };
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
const reviveMsgs = (arr: Message[]): Message[] => arr.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
const reviveTask = (t: Task): Task => ({
  ...t,
  startDate: t.startDate ? new Date(t.startDate) : null,
  dueDate: t.dueDate ? new Date(t.dueDate) : null,
  completedAt: t.completedAt ? new Date(t.completedAt) : null,
  createdAt: new Date(t.createdAt),
  subtasks: t.subtasks ?? [],
});
const reviveTasks = (arr: Task[]): Task[] => arr.map(reviveTask);
const reviveObjective = (o: Objective): Objective => ({
  ...o,
  startDate: new Date(o.startDate),
  endDate: new Date(o.endDate),
  downgradedAt: o.downgradedAt ? new Date(o.downgradedAt) : null,
  createdAt: new Date(o.createdAt),
  milestones: (o.milestones ?? []).map((m) => ({ ...m, date: new Date(m.date) })),
});
const reviveObjectives = (arr: Objective[]): Objective[] => arr.map(reviveObjective);

/* Bip sonore court via Web Audio (aucun fichier requis, marche hors-ligne). */
function playBeep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => ctx.close().catch(() => {});
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
  const [projects, setProjects] = useState<Project[]>(
    demo ? seedProjects() : reviveProjects(initialProjects ?? [])
  );
  const [tasks, setTasks] = useState<Task[]>(demo ? [] : reviveTasks(initialTasks ?? []));
  const [objectives, setObjectives] = useState<Objective[]>(demo ? seedObjectives() : reviveObjectives(initialObjectives ?? []));
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID); // sélecteur démo
  const [orgName, setOrgName] = useState(initialSettings?.orgName ?? ORG_NAME);
  const [emailEnabled, setEmailEnabled] = useState(initialSettings?.emailEnabled ?? true);
  const [digestHour, setDigestHour] = useState(initialSettings?.digestHour ?? "08:00");
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const applySettings = (s: AppSettings) => {
    setOrgName(s.orgName);
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
    // Préférence de son (bip des notifications), persistée localement.
    try {
      setSoundEnabledState(localStorage.getItem("cap_sound") !== "0");
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

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    try {
      localStorage.setItem("cap_sound", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (v) playBeep(); // retour immédiat à l'activation
  };

  // Bip sonore au nouvel arrivage de notification (en local uniquement).
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (demo) return;
    const unread = notifications.filter((n) => !n.read).length;
    const prev = prevUnreadRef.current;
    if (prev !== null && unread > prev && soundEnabled) playBeep();
    prevUnreadRef.current = unread;
  }, [notifications, soundEnabled, demo]);

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

  const createProject = async (name: string, description: string, deadline: string | null, memberIds: string[] = []) =>
    demo ? DEMO_MSG : postProjects("/api/projects", { name, description, deadline, memberIds });
  const updateProject = async (id: string, fields: ProjectFields) =>
    demo ? DEMO_MSG : postProjects("/api/projects/update", { id, ...fields });
  const projectTask = async (action: "add" | "update" | "delete", payload: TaskPayload) =>
    demo ? DEMO_MSG : postProjects("/api/projects/tasks", { action, ...payload });
  const projectMember = async (action: "add" | "remove", projectId: string, profileId: string) =>
    demo ? DEMO_MSG : postProjects("/api/projects/members", { action, projectId, profileId });
  const projectNote = async (projectId: string, body: string) =>
    demo ? DEMO_MSG : postProjects("/api/projects/notes", { projectId, body });
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

  const loadMessages = async (t: MsgTarget): Promise<{ conversationId: string | null; messages: Message[] }> => {
    if (demo) return { conversationId: null, messages: [] };
    const q = t.convId ? `convId=${t.convId}` : `refType=${t.refType}&refId=${t.refId}`;
    const r = await fetch(`/api/messages?${q}`, { cache: "no-store" });
    const d = await r.json();
    if (d.notifications) setNotifications(reviveNotifs(d.notifications));
    refreshConversations();
    return { conversationId: d.conversationId ?? null, messages: d.messages ? reviveMsgs(d.messages) : [] };
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

  // Sondage périodique (pas de WebSocket sur le serveur local).
  useEffect(() => {
    if (demo) return;
    const iv = setInterval(() => {
      refreshConversations();
      refreshTasks();
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
    updateAccount,
    catalogue,
    rs,
    scores,
    orgName,
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
    sendMessage,
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
    attachItemToProject,
    requestProjectStatus,
    decideProjectStatus,
    requestProjectClosure,
    decideProjectClosure,
    archiveProject,
    requestProjectDeletion,
    decideProjectDeletion,
    tasks,
    taskAction,
    subtaskAction,
    objectives,
    objectiveAction,
    openTaskId,
    setOpenTaskId,
    soundEnabled,
    setSoundEnabled,
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
