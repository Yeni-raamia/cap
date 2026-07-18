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
  DEFAULT_USER_ID,
  isDemoMode,
  listNotifications,
  PROFILES,
  seedItems,
} from "@/lib/data";
import {
  currentUser as sbCurrentUser,
  loadItems as sbLoadItems,
  loadProfiles as sbLoadProfiles,
  persistAction as sbPersistAction,
  persistCreate as sbPersistCreate,
} from "@/lib/data/supabase";
import { createClient } from "@/lib/supabase/client";
import {
  computeScores,
  type Item,
  type ParsedSubject,
  type Priorite,
  type Profile,
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
  alerts: number;
  signOut: () => void;
}

const EPOCH = new Date(0);
const FALLBACK_PROFILE: Profile = {
  id: "",
  nom: "…",
  poste: "",
  role: "agent",
  init: "?",
};
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = isDemoMode;
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSb = () => {
    if (!sbRef.current) sbRef.current = createClient();
    return sbRef.current;
  };

  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(demo ? PROFILES : []);
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID); // sélecteur démo
  const [authMe, setAuthMe] = useState<Profile | null>(null); // profil connecté (Supabase)
  const [emailOn, setEmailOn] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Chargement initial — uniquement côté client (pas d'écart d'hydratation).
  useEffect(() => {
    setNowState(new Date());
    if (demo) {
      setItems(seedItems());
      setProfiles(PROFILES);
      return;
    }
    (async () => {
      const sb = getSb();
      const [profs, its, meProfile] = await Promise.all([
        sbLoadProfiles(sb),
        sbLoadItems(sb),
        sbCurrentUser(sb),
      ]);
      setProfiles(profs);
      setItems(its);
      setAuthMe(meProfile);
    })().catch((err) => console.error("Chargement Supabase échoué :", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = nowState ?? EPOCH;
  const ready = nowState !== null && (demo || authMe !== null);

  const me: Profile = demo
    ? profiles.find((p) => p.id === meId) ?? PROFILES[0]
    : authMe ?? FALLBACK_PROFILE;

  const profileById = (id: string): Profile =>
    profiles.find((p) => p.id === id) ?? FALLBACK_PROFILE;

  const refreshItems = async () => {
    const its = await sbLoadItems(getSb());
    setItems(its);
  };

  const act = (item: Item, action: Action, cause?: string) => {
    setOpen(null);
    if (demo) {
      setItems((prev) => mockApply(prev, item, action, cause, meId));
      return;
    }
    sbPersistAction(getSb(), item, action, cause, me.id)
      .then(refreshItems)
      .catch((err) => console.error("Action Supabase échouée :", err));
  };

  const create = (parsed: ParsedSubject, prio: Priorite, dest: string, points: string) => {
    setShowNew(false);
    if (demo) {
      setItems((prev) => mockCreate(prev, parsed, prio, dest, points, meId));
      return;
    }
    sbPersistCreate(getSb(), parsed, prio, dest, points, me.id)
      .then(refreshItems)
      .catch((err) => console.error("Création Supabase échouée :", err));
  };

  const signOut = () => {
    if (demo) return;
    getSb()
      .auth.signOut()
      .then(() => {
        window.location.href = "/login";
      });
  };

  const scores = useMemo(
    () => computeScores(items, profiles, now),
    [items, profiles, now]
  );
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
