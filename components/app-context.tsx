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
  DEFAULT_USER_ID,
  listNotifications,
  PROFILES,
  seedItems,
} from "@/lib/data";
import {
  computeScores,
  DEFAULT_CATALOGUE,
  DEFAULT_REF_LISTS,
  isReadOnly,
  reminderState,
  type AppSettings,
  type ConversationSummary,
  type Message,
  type Negligence,
  type RefLists,
  type Catalogue,
  type Item,
  type Notif,
  type ParsedSubject,
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
type RefListKey = "appreciation" | "cause" | "action" | "decision" | "service";
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
  act: (item: Item, action: Action, cause?: string) => void;
  create: (parsed: ParsedSubject, prio: Priorite, dest: string, destService: string, points: string) => void;
  setRelanceDate: (item: Item, date: string | null) => void;
  addBlocageAction: (item: Item, kind: string, concerne: string, note: string) => void;
  setAppreciation: (item: Item, appreciation: string | null) => void;
  updateRole: (userId: string, role: Role) => Promise<string | null>;
  catalogueAction: (action: CatalogueAction) => Promise<string | null>;
  refLists: RefLists;
  refListAction: (action: RefListActionPayload) => Promise<string | null>;
  negligences: Negligence[];
  negligenceById: (id: string) => Negligence | null;
  negligenceByItem: (itemId: string) => Negligence | null;
  createNegligence: (form: NegligenceForm) => Promise<string | null>;
  updateNegligence: (id: string, fields: Partial<NegligenceForm>) => Promise<string | null>;
  setNegligenceStatus: (id: string, status: string) => Promise<string | null>;
  setNegligenceDecisions: (id: string, decisions: string[]) => Promise<string | null>;
  notifications: Notif[];
  markNotificationsRead: () => void;
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
  // Tâches (productivité)
  tasks: Task[];
  taskAction: (op: "create" | "update" | "delete", input: TaskInput) => Promise<string | null>;
  subtaskAction: (op: "add" | "toggle" | "rename" | "delete", input: SubtaskInput) => Promise<string | null>;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  // Son des notifications
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  // Compte en lecture seule (DSI ou marqué par l'admin)
  readOnly: boolean;
}

const EPOCH = new Date(0);
const FALLBACK_PROFILE: Profile = { id: "", nom: "…", poste: "", role: "agent", init: "?", extraPages: [], deniedPages: [], readonly: false, approved: true, mustChangePassword: false };
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
});
const reviveProjects = (arr: Project[]): Project[] => arr.map(reviveProject);
const reviveNeg = (n: Negligence): Negligence => ({
  ...n,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
  decidedAt: n.decidedAt ? new Date(n.decidedAt) : null,
});
const reviveNegs = (arr: Negligence[]): Negligence[] => arr.map(reviveNeg);
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
  initialConversations,
  initialTasks,
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
  initialConversations?: ConversationSummary[];
  initialTasks?: Task[];
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
  const [refLists, setRefLists] = useState<RefLists>(
    demo || !initialRefLists ? DEFAULT_REF_LISTS : initialRefLists
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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID); // sélecteur démo
  const [orgName, setOrgName] = useState(initialSettings?.orgName ?? ORG_NAME);
  const [emailEnabled, setEmailEnabled] = useState(initialSettings?.emailEnabled ?? true);
  const [digestHour, setDigestHour] = useState(initialSettings?.digestHour ?? "08:00");
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const profileById = (id: string): Profile =>
    profiles.find((p) => p.id === id) ?? FALLBACK_PROFILE;

  // État de relance calculé avec les SLA du catalogue courant (types ajoutés inclus).
  const rs = (item: Item): ReminderState => reminderState(item, now, catalogue.types);

  /* ---------- Mutations ---------- */
  const act = (item: Item, action: Action, cause?: string) => {
    setOpen(null);
    if (demo) {
      setItems((prev) => mockApply(prev, item, action, cause, meId));
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
      })
      .catch((e) => console.error("Action échouée :", e));
  };

  const create = (parsed: ParsedSubject, prio: Priorite, dest: string, destService: string, points: string) => {
    setShowNew(false);
    if (demo) {
      setItems((prev) => mockCreate(prev, parsed, prio, dest, destService, points, meId));
      return;
    }
    fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, prio, dest, destService, points }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setItems(reviveItems(d.items));
        if (d.projects) setProjects(reviveProjects(d.projects)); // suivi PRJ → projet visible aussitôt
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

  const markNotificationsRead = () => {
    if (demo) return;
    if (!notifications.some((n) => !n.read)) return;
    fetch("/api/notifications/read", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) setNotifications(reviveNotifs(d.notifications));
      })
      .catch((e) => console.error("Lecture des notifications échouée :", e));
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
    if (!res.ok) return d.error ?? "Erreur.";
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
  const requestProjectClosure = async (id: string, summary: string, deliverables: string[]) =>
    demo ? DEMO_MSG : postProjects("/api/projects/closure", { op: "request", id, summary, deliverables });
  const decideProjectClosure = async (id: string, approve: boolean, note = "") =>
    demo ? DEMO_MSG : postProjects("/api/projects/closure", { op: "decide", id, approve, note });

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
    act,
    create,
    setRelanceDate,
    addBlocageAction,
    setAppreciation,
    updateRole,
    catalogueAction,
    refLists,
    refListAction,
    negligences,
    negligenceById,
    negligenceByItem,
    createNegligence,
    updateNegligence,
    setNegligenceStatus,
    setNegligenceDecisions,
    notifications,
    markNotificationsRead,
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
    tasks,
    taskAction,
    subtaskAction,
    openTaskId,
    setOpenTaskId,
    soundEnabled,
    setSoundEnabled,
    readOnly: isReadOnly(me),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
