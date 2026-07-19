"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Filter,
  Inbox,
  LayoutGrid,
  LayoutList,
  Rows3,
  ShieldAlert,
  Table2,
  TrendingUp,
  X,
} from "lucide-react";
import { STATUTS, type Item, type ReminderLevel, type Statut } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, KPI, MetierChip, Token, TypeTag } from "@/components/atoms";
import { ItemCard } from "@/components/ItemCard";

type ViewMode = "liste" | "cartes" | "kanban" | "groupe";
type GroupBy = "agent" | "metier";
type SortKey = "maj" | "responsable" | "metier" | "type" | "objet" | "statut" | "jours";

const PRIORITES = ["Critique", "Élevé", "Moyenne"];
const STATUT_ORDER = Object.keys(STATUTS) as Statut[];
const ETATS: { value: ReminderLevel | "Tous"; label: string }[] = [
  { value: "Tous", label: "Tous les états" },
  { value: "ok", label: "À jour" },
  { value: "relance", label: "Relance due" },
  { value: "escalade", label: "En retard" },
  { value: "bloque", label: "Bloqué" },
];

const etatBadge = (level: ReminderLevel, days: number) => {
  if (level === "escalade")
    return <span className="text-[11px] text-rose-600 font-medium">En retard J+{days}</span>;
  if (level === "relance")
    return <span className="text-[11px] text-amber-600 font-medium">Relance due</span>;
  if (level === "bloque")
    return <span className="text-[11px] text-rose-600 font-medium">Bloqué</span>;
  if (level === "ok") return <span className="text-[11px] text-slate-400">à jour</span>;
  return <span className="text-[11px] text-slate-300">—</span>;
};

export default function VueGlobalePage() {
  const { items, openItem, profiles, profileById, catalogue, rs } = useApp();

  const [view, setView] = useState<ViewMode>("liste");
  const [groupBy, setGroupBy] = useState<GroupBy>("agent");

  const [fMetier, setFMetier] = useState("Tous");
  const [fType, setFType] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");
  const [fPriorite, setFPriorite] = useState("Tous");
  const [fAgent, setFAgent] = useState("Tous");
  const [fEtat, setFEtat] = useState<ReminderLevel | "Tous">("Tous");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("maj");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (!includeClosed && i.statut === "Clôturé") return false;
      if (fMetier !== "Tous" && i.metier !== fMetier) return false;
      if (fType !== "Tous" && i.type !== fType) return false;
      if (fStatut !== "Tous" && i.statut !== fStatut) return false;
      if (fPriorite !== "Tous" && i.priorite !== fPriorite) return false;
      if (fAgent !== "Tous" && i.ownerId !== fAgent) return false;
      if (fEtat !== "Tous" && rs(i).level !== fEtat) return false;
      if (q && !`${i.objet} ${i.ref}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, includeClosed, fMetier, fType, fStatut, fPriorite, fAgent, fEtat, search, rs]);

  const enRetard = filtered.filter((i) => rs(i).level === "escalade").length;
  const bloques = filtered.filter((i) => i.statut === "Bloqué").length;
  const repondus = filtered.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
  const taux = filtered.length ? Math.round((repondus / filtered.length) * 100) : 0;

  const sorted = useMemo(() => {
    const val = (i: Item): string | number => {
      switch (sortKey) {
        case "responsable":
          return profileById(i.ownerId).nom.toLowerCase();
        case "metier":
          return i.metier;
        case "type":
          return i.type;
        case "objet":
          return i.objet.toLowerCase();
        case "statut":
          return STATUTS[i.statut].pct;
        case "jours":
          return rs(i).days;
        default:
          return i.dateMaj.getTime();
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc, profileById, rs]);

  const resetFilters = () => {
    setFMetier("Tous");
    setFType("Tous");
    setFStatut("Tous");
    setFPriorite("Tous");
    setFAgent("Tous");
    setFEtat("Tous");
    setSearch("");
    setIncludeClosed(false);
  };

  const activeFilters =
    (fMetier !== "Tous" ? 1 : 0) +
    (fType !== "Tous" ? 1 : 0) +
    (fStatut !== "Tous" ? 1 : 0) +
    (fPriorite !== "Tous" ? 1 : 0) +
    (fAgent !== "Tous" ? 1 : 0) +
    (fEtat !== "Tous" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (includeClosed ? 1 : 0);

  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const VIEWS: { id: ViewMode; label: string; icon: typeof LayoutList }[] = [
    { id: "liste", label: "Liste", icon: Table2 },
    { id: "cartes", label: "Cartes", icon: LayoutGrid },
    { id: "kanban", label: "Kanban", icon: LayoutList },
    { id: "groupe", label: "Regroupée", icon: Rows3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Vue globale</h1>
          <p className="text-[13px] text-slate-500">
            Le travail de toute l&apos;équipe, en un coup d&apos;œil.
          </p>
        </div>
        {/* Sélecteur de vue */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition ${
                view === v.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <v.icon size={14} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Inbox} label="Suivis affichés" value={filtered.length} tone="sky" />
        <KPI icon={ArrowUp} label="En retard" value={enRetard} tone="rose" />
        <KPI icon={ShieldAlert} label="Bloqués" value={bloques} tone="amber" />
        <KPI icon={TrendingUp} label="Taux de réponse" value={taux + "%"} tone="emerald" />
      </div>

      {/* Barre de filtres */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (objet, référence)…"
            aria-label="Rechercher"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 min-w-[12rem] flex-1"
          />
          <select value={fMetier} onChange={(e) => setFMetier(e.target.value)} aria-label="Filtrer par métier" className={selectCls}>
            <option value="Tous">Tous métiers</option>
            {Object.keys(catalogue.metiers).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Filtrer par type" className={selectCls}>
            <option value="Tous">Tous types</option>
            {Object.keys(catalogue.types).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} aria-label="Filtrer par statut" className={selectCls}>
            <option value="Tous">Tous statuts</option>
            {STATUT_ORDER.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={fPriorite} onChange={(e) => setFPriorite(e.target.value)} aria-label="Filtrer par priorité" className={selectCls}>
            <option value="Tous">Toutes priorités</option>
            {PRIORITES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            value={fEtat}
            onChange={(e) => setFEtat(e.target.value as ReminderLevel | "Tous")}
            aria-label="Filtrer par état de relance"
            className={selectCls}
          >
            {ETATS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          <select value={fAgent} onChange={(e) => setFAgent(e.target.value)} aria-label="Filtrer par responsable" className={selectCls}>
            <option value="Tous">Tous responsables</option>
            {profiles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            Clôturés
          </label>
          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-rose-600"
            >
              <X size={13} />
              Réinitialiser ({activeFilters})
            </button>
          )}
          {view === "groupe" && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              aria-label="Regrouper par"
              className={`${selectCls} ml-auto`}
            >
              <option value="agent">Grouper par responsable</option>
              <option value="metier">Grouper par métier</option>
            </select>
          )}
          {view !== "groupe" && (
            <span className="ml-auto text-[12px] text-slate-400">{filtered.length} suivis</span>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          Aucun suivi ne correspond à ces filtres.
        </Card>
      ) : view === "liste" ? (
        <ListeView
          rows={sorted}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={(k) => {
            if (k === sortKey) setSortAsc(!sortAsc);
            else {
              setSortKey(k);
              setSortAsc(k === "objet" || k === "responsable");
            }
          }}
          onOpen={openItem}
          profileById={profileById}
          rs={rs}
        />
      ) : view === "cartes" ? (
        <div className="grid md:grid-cols-2 gap-3">
          {sorted.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanView items={filtered} includeClosed={includeClosed} />
      ) : (
        <GroupeView items={filtered} groupBy={groupBy} profileById={profileById} catalogue={catalogue} />
      )}
    </div>
  );
}

/* ---------- Vue Liste (triable) ---------- */
function ListeView({
  rows,
  sortKey,
  sortAsc,
  onSort,
  onOpen,
  profileById,
  rs,
}: {
  rows: Item[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  onOpen: (i: Item) => void;
  profileById: ReturnType<typeof useApp>["profileById"];
  rs: ReturnType<typeof useApp>["rs"];
}) {
  const Th = ({ k, label, className = "" }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => onSort(k)}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 ${className}`}
    >
      {label}
      {sortKey === k && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
  return (
    <Card>
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        <div className="w-36 shrink-0">
          <Th k="responsable" label="Responsable" />
        </div>
        <div className="w-28 shrink-0">
          <Th k="metier" label="Métier / Type" />
        </div>
        <div className="flex-1">
          <Th k="objet" label="Objet" />
        </div>
        <div className="w-24 text-right justify-end flex">
          <Th k="statut" label="Statut" />
        </div>
        <div className="w-24 text-right justify-end flex">
          <Th k="jours" label="État" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((i) => {
          const state = rs(i);
          const owner = profileById(i.ownerId);
          return (
            <button
              key={i.id}
              onClick={() => onOpen(i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-2 w-36 shrink-0">
                <Avatar init={owner.init} size="h-7 w-7" />
                <span className="text-[12px] text-slate-600 truncate">{owner.nom}</span>
              </div>
              <div className="flex items-center gap-2 w-28 shrink-0">
                <MetierChip code={i.metier} />
                <TypeTag t={i.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-slate-800 truncate">{i.objet}</div>
                <Token>{i.ref}</Token>
              </div>
              <div className="w-24 text-right text-[12px] text-slate-500 hidden md:block">{i.statut}</div>
              <div className="w-24 text-right">{etatBadge(state.level, state.days)}</div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Vue Kanban par statut ---------- */
function KanbanView({ items, includeClosed }: { items: Item[]; includeClosed: boolean }) {
  const cols = STATUT_ORDER.filter((s) => (includeClosed ? true : s !== "Clôturé"));
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cols.map((statut) => {
        const colItems = items.filter((i) => i.statut === statut);
        return (
          <div key={statut} className="w-72 shrink-0">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[12px] font-semibold text-slate-700">{statut}</span>
              <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">
                {colItems.length}
              </span>
            </div>
            <div className="space-y-2">
              {colItems.length === 0 ? (
                <div className="text-[12px] text-slate-300 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  —
                </div>
              ) : (
                colItems.map((i) => <ItemCard key={i.id} item={i} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Vue Regroupée (par responsable ou métier) ---------- */
function GroupeView({
  items,
  groupBy,
  profileById,
  catalogue,
}: {
  items: Item[];
  groupBy: GroupBy;
  profileById: ReturnType<typeof useApp>["profileById"];
  catalogue: ReturnType<typeof useApp>["catalogue"];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of items) {
      const key = groupBy === "agent" ? i.ownerId : i.metier;
      const list = map.get(key) ?? [];
      list.push(i);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [items, groupBy]);

  return (
    <div className="space-y-5">
      {groups.map(([key, list]) => {
        const title =
          groupBy === "agent"
            ? profileById(key).nom
            : `${key} — ${catalogue.metiers[key]?.label ?? key}`;
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              {groupBy === "agent" ? (
                <Avatar init={profileById(key).init} size="h-6 w-6" />
              ) : (
                <MetierChip code={key} />
              )}
              <h2 className="text-[13px] font-semibold text-slate-700">{title}</h2>
              <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">
                {list.length}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {list.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
