"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  reminderState,
  type AppSettings,
  type BlocageActionKind,
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
type CatalogueAction =
  | { op: "add" | "update"; kind: "metier"; code: string; label: string; tone: string }
  | { op: "add" | "update"; kind: "type"; code: string; label: string; slaRelance: string; slaEscalade: string; urgent: boolean }
  | { op: "delete"; kind: "metier" | "type"; code: string };

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
  create: (parsed: ParsedSubject, prio: Priorite, dest: string, points: string) => void;
  setRelanceDate: (item: Item, date: string | null) => void;
  addBlocageAction: (item: Item, kind: BlocageActionKind, concerne: string, note: string) => void;
  setAppreciation: (item: Item, appreciation: string | null) => void;
  updateRole: (userId: string, role: Role) => Promise<string | null>;
  catalogueAction: (action: CatalogueAction) => Promise<string | null>;
  notifications: Notif[];
  markNotificationsRead: () => void;
  alerts: number;
  signOut: () => void;
  // Module Projet
  projects: Project[];
  projectById: (id: string) => Project | null;
  createProject: (name: string, description: string, deadline: string | null) => Promise<string | null>;
  updateProject: (id: string, fields: ProjectFields) => Promise<string | null>;
  projectTask: (action: "add" | "update" | "delete", payload: TaskPayload) => Promise<string | null>;
  projectMember: (action: "add" | "remove", projectId: string, profileId: string) => Promise<string | null>;
  projectNote: (projectId: string, body: string) => Promise<string | null>;
  attachItemToProject: (itemId: string, projectId: string | null) => Promise<string | null>;
}

const EPOCH = new Date(0);
const FALLBACK_PROFILE: Profile = { id: "", nom: "…", poste: "", role: "agent", init: "?", extraPages: [] };
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
});
const reviveProjects = (arr: Project[]): Project[] => arr.map(reviveProject);

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
  const [projects, setProjects] = useState<Project[]>(
    demo ? seedProjects() : reviveProjects(initialProjects ?? [])
  );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const create = (parsed: ParsedSubject, prio: Priorite, dest: string, points: string) => {
    setShowNew(false);
    if (demo) {
      setItems((prev) => mockCreate(prev, parsed, prio, dest, points, meId));
      return;
    }
    fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, prio, dest, points }),
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

  const addBlocageAction = (item: Item, kind: BlocageActionKind, concerne: string, note: string) => {
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
      })
      .catch((e) => console.error("Appréciation échouée :", e));
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

  const createProject = async (name: string, description: string, deadline: string | null) =>
    demo ? DEMO_MSG : postProjects("/api/projects", { name, description, deadline });
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
    notifications,
    markNotificationsRead,
    alerts,
    signOut,
    projects,
    projectById,
    createProject,
    updateProject,
    projectTask,
    projectMember,
    projectNote,
    attachItemToProject,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
