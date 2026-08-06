/* Fabriques d'objets de domaine pour les tests (valeurs par défaut complètes,
 * surchargées champ par champ). Ce fichier n'est pas un test (hors motif
 * `*.test.ts`) : il est seulement importé par les suites. */
import type {
  Item,
  Task,
  Subtask,
  Profile,
  Project,
  ProjectTask,
  Objective,
} from "@/lib/domain";

export function mkItem(over: Partial<Item> = {}): Item {
  const base: Item = {
    id: "i1",
    ref: "SOC-2026-0001",
    metier: "SOC",
    type: "INFO", // sans SLA par défaut : pas d'escalade parasite
    objet: "Test",
    ownerId: "u1",
    statut: "Envoyé",
    priorite: "Moyenne",
    personnes: [],
    pointsCles: [],
    blocageCause: null,
    relancesCount: 0,
    dateCreation: new Date("2026-07-01T00:00:00Z"),
    dateMaj: new Date("2026-07-01T00:00:00Z"),
    dateRelancePrevue: null,
    projectId: null,
    appreciation: null,
    blocageActions: [],
    timeline: [],
  };
  return { ...base, ...over };
}

export function mkSubtask(over: Partial<Subtask> = {}): Subtask {
  return { id: "s1", taskId: "t1", title: "Sous-tâche", done: false, ordre: 0, ...over };
}

export function mkTask(over: Partial<Task> = {}): Task {
  const base: Task = {
    id: "t1",
    title: "Tâche",
    description: "",
    assigneeId: "u1",
    createdBy: "u1",
    projectId: null,
    status: "à faire",
    priority: "Normale",
    startDate: null,
    dueDate: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    completedAt: null,
    subtasks: [],
  };
  return { ...base, ...over };
}

export function mkProfile(over: Partial<Profile> = {}): Profile {
  const base: Profile = {
    id: "u1",
    nom: "Agent Un",
    poste: "Analyste",
    role: "agent",
    init: "A1",
    extraPages: [],
    deniedPages: [],
    readonly: false,
    approved: true,
    grcMember: false,
    mustChangePassword: false,
    totpEnabled: false,
  };
  return { ...base, ...over };
}

export function mkProjectTask(over: Partial<ProjectTask> = {}): ProjectTask {
  const base: ProjectTask = {
    id: "pt1",
    projectId: "p1",
    title: "Tâche projet",
    description: "",
    assigneeId: null,
    status: "à faire",
    priority: "Normale",
    dueDate: null,
    completedAt: null,
    ordre: 0,
    createdAt: new Date("2026-07-01T00:00:00Z"),
  };
  return { ...base, ...over };
}

export function mkProject(over: Partial<Project> = {}): Project {
  const base: Project = {
    id: "p1",
    name: "Projet",
    description: "",
    ownerId: "u1",
    status: "En cours",
    deadline: null,
    sourceItemId: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    tasks: [],
    memberIds: [],
    notes: [],
    pendingStatus: null,
    pendingBy: null,
    closure: null,
    archived: false,
    deletionRequest: null,
    proposals: [],
  };
  return { ...base, ...over };
}

export function mkObjective(over: Partial<Objective> = {}): Objective {
  const base: Objective = {
    id: "o1",
    title: "Objectif",
    subtitle: "",
    criticality: "Moyenne",
    description: "",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2026-12-31T00:00:00Z"),
    ownerId: "u1",
    color: "#10b981",
    status: "en_cours",
    projectIds: [],
    taskIds: [],
    memberIds: [],
    milestones: [],
    downgradeReason: "",
    downgradedBy: null,
    downgradedAt: null,
    createdBy: "u1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  return { ...base, ...over };
}
