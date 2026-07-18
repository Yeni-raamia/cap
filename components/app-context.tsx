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
  DEFAULT_USER_ID,
  listNotifications,
  PROFILES,
  seedItems,
} from "@/lib/data";
import {
  computeScores,
  type Item,
  type ParsedSubject,
  type Priorite,
  type Profile,
  type Role,
  type Score,
} from "@/lib/domain";

type Action = "relance" | "reponse" | "bloque" | "cloture";

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
  scores: Score[];
  emailOn: boolean;
  setEmailOn: (v: boolean) => void;
  open: Item | null;
  openItem: (i: Item) => void;
  closeItem: () => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  act: (item: Item, action: Action, cause?: string) => void;
  create: (parsed: ParsedSubject, prio: Priorite, dest: string, points: string) => void;
  updateRole: (userId: string, role: Role) => Promise<string | null>;
  alerts: number;
  signOut: () => void;
}

const EPOCH = new Date(0);
const FALLBACK_PROFILE: Profile = { id: "", nom: "…", poste: "", role: "agent", init: "?" };
const Ctx = createContext<AppCtx | null>(null);

/** Reconvertit les dates (ISO string) d'une réponse JSON en objets Date. */
function reviveItem(r: Item): Item {
  return {
    ...r,
    dateCreation: new Date(r.dateCreation),
    dateMaj: new Date(r.dateMaj),
    timeline: r.timeline.map((e) => ({ ...e, date: new Date(e.date) })),
  };
}
const reviveItems = (arr: Item[]): Item[] => arr.map(reviveItem);

export function AppProvider({
  children,
  demo,
  initialUser,
  initialItems,
  initialProfiles,
}: {
  children: ReactNode;
  demo: boolean;
  initialUser?: Profile;
  initialItems?: Item[];
  initialProfiles?: Profile[];
}) {
  const [items, setItems] = useState<Item[]>(
    demo ? [] : reviveItems(initialItems ?? [])
  );
  const [profiles, setProfiles] = useState<Profile[]>(
    demo ? PROFILES : initialProfiles ?? []
  );
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID); // sélecteur démo
  const [emailOn, setEmailOn] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);

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
      })
      .catch((e) => console.error("Création échouée :", e));
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

  const signOut = () => {
    if (demo) return;
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/login";
    });
  };

  const scores = useMemo(() => computeScores(items, profiles, now), [items, profiles, now]);
  const alerts = useMemo(() => listNotifications(items, now, me), [items, now, me]);

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
    scores,
    emailOn,
    setEmailOn,
    open,
    openItem: (i) => setOpen(i),
    closeItem: () => setOpen(null),
    showNew,
    setShowNew,
    act,
    create,
    updateRole,
    alerts,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
