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
  data,
  DEFAULT_USER_ID,
  PROFILES,
  profileById as pById,
  seedItems,
} from "@/lib/data";
import type { Item, ParsedSubject, Priorite, Profile } from "@/lib/domain";

type Action = "relance" | "reponse" | "bloque" | "cloture";

interface AppCtx {
  ready: boolean;
  items: Item[];
  now: Date;
  me: Profile;
  meId: string;
  setMeId: (id: string) => void;
  profiles: Profile[];
  profileById: (id: string) => Profile;
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
}

const EPOCH = new Date(0);
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [nowState, setNowState] = useState<Date | null>(null);
  const [meId, setMeId] = useState<string>(DEFAULT_USER_ID);
  const [emailOn, setEmailOn] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Seed en mémoire côté client uniquement (évite tout écart d'hydratation).
  useEffect(() => {
    setItems(seedItems());
    setNowState(new Date());
  }, []);

  const ready = nowState !== null;
  const now = nowState ?? EPOCH;
  const me = pById(meId);

  const act = (item: Item, action: Action, cause?: string) => {
    setItems((prev) => data.applyAction(prev, item, action, cause, meId));
    setOpen(null);
  };

  const create = (parsed: ParsedSubject, prio: Priorite, dest: string, points: string) => {
    setItems((prev) => data.createItem(prev, parsed, prio, dest, points, meId));
    setShowNew(false);
  };

  const alerts = useMemo(() => data.listNotifications(items, now, me), [items, now, me]);

  const value: AppCtx = {
    ready,
    items,
    now,
    me,
    meId,
    setMeId,
    profiles: PROFILES,
    profileById: pById,
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
