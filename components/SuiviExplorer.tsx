"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
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
import { fmt, STATUTS, type Item, type ReminderLevel, type Statut } from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar, Card, KPI, MetierChip, Priority, Token, TypeTag } from "./atoms";
import { ItemCard } from "./ItemCard";

type ViewMode = "liste" | "cartes" | "kanban" | "groupe" | "chrono";
type GroupBy = "agent" | "metier" | "priorite" | "statut";
type SortKey = "maj" | "responsable" | "metier" | "type" | "objet" | "statut" | "jours";
type Periode = "tout" | "7" | "30" | "90" | "annee" | "perso";

const PRIORITES = ["Critique", "Élevé", "Moyenne"];
const STATUT_ORDER = Object.keys(STATUTS) as Statut[];
const PERIODES: { value: Periode; label: string }[] = [
  { value: "tout", label: "Toute période" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
  { value: "annee", label: "Cette année" },
  { value: "perso", label: "Période personnalisée" },
];
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

/**
 * Explorateur de suivis réutilisable : barre de filtres + 4 vues
 * (liste triable, cartes, kanban par statut, regroupée).
 * Utilisé par « Vue globale » et « Mon espace ».
 */
export function SuiviExplorer({
  items,
  showResponsable = true,
  showKpis = false,
  defaultView = "liste",
}: {
  items: Item[];
  showResponsable?: boolean;
  showKpis?: boolean;
  defaultView?: ViewMode;
}) {
  const { openItem, profiles, profileById, catalogue, rs } = useApp();

  const [view, setView] = useState<ViewMode>(defaultView);
  const [groupBy, setGroupBy] = useState<GroupBy>(showResponsable ? "agent" : "metier");

  const [fMetier, setFMetier] = useState("Tous");
  const [fType, setFType] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");
  const [fPriorite, setFPriorite] = useState("Tous");
  const [fAgent, setFAgent] = useState("Tous");
  const [fEtat, setFEtat] = useState<ReminderLevel | "Tous">("Tous");
  const [fProjet, setFProjet] = useState<"Tous" | "avec" | "sans">("Tous");
  const [fReponse, setFReponse] = useState<"Tous" | "avec" | "sans">("Tous");
  const [fAttach, setFAttach] = useState<"Tous" | "avec" | "sans">("Tous");
  const [fPeriode, setFPeriode] = useState<Periode>("tout");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

  const periodRange = useMemo((): [number, number] | null => {
    if (fPeriode === "tout") return null;
    const end = Date.now() + 864e5; // inclut aujourd'hui
    if (fPeriode === "perso") {
      const from = fFrom ? new Date(`${fFrom}T00:00:00`).getTime() : 0;
      const to = fTo ? new Date(`${fTo}T23:59:59`).getTime() : end;
      return [from, to];
    }
    if (fPeriode === "annee") return [new Date(new Date().getFullYear(), 0, 1).getTime(), end];
    return [Date.now() - Number(fPeriode) * 864e5, end];
  }, [fPeriode, fFrom, fTo]);

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
      if (showResponsable && fAgent !== "Tous" && i.ownerId !== fAgent) return false;
      if (fEtat !== "Tous" && rs(i).level !== fEtat) return false;
      if (fProjet === "avec" && !i.projectId) return false;
      if (fProjet === "sans" && i.projectId) return false;
      const aRepondu = i.timeline.some((e) => e.kind === "reponse");
      if (fReponse === "avec" && !aRepondu) return false;
      if (fReponse === "sans" && aRepondu) return false;
      const aPieces = (i.attachmentsCount ?? 0) > 0;
      if (fAttach === "avec" && !aPieces) return false;
      if (fAttach === "sans" && aPieces) return false;
      if (periodRange) {
        const t = i.dateCreation.getTime();
        if (t < periodRange[0] || t > periodRange[1]) return false;
      }
      if (q) {
        // Recherche élargie : objet, réf, destinataires + services, points clés, cause de blocage.
        const hay = [
          i.objet,
          i.ref,
          ...i.personnes.map((p) => `${p.name} ${p.service ?? ""}`),
          ...i.pointsCles,
          i.blocageCause ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, includeClosed, fMetier, fType, fStatut, fPriorite, fAgent, fEtat, fProjet, fReponse, fAttach, periodRange, search, showResponsable, rs]);

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
    setFProjet("Tous");
    setFReponse("Tous");
    setFAttach("Tous");
    setFPeriode("tout");
    setFFrom("");
    setFTo("");
    setSearch("");
    setIncludeClosed(false);
  };

  const activeFilters =
    (fMetier !== "Tous" ? 1 : 0) +
    (fType !== "Tous" ? 1 : 0) +
    (fStatut !== "Tous" ? 1 : 0) +
    (fPriorite !== "Tous" ? 1 : 0) +
    (showResponsable && fAgent !== "Tous" ? 1 : 0) +
    (fEtat !== "Tous" ? 1 : 0) +
    (fProjet !== "Tous" ? 1 : 0) +
    (fReponse !== "Tous" ? 1 : 0) +
    (fAttach !== "Tous" ? 1 : 0) +
    (fPeriode !== "tout" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (includeClosed ? 1 : 0);

  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const VIEWS: { id: ViewMode; label: string; icon: typeof LayoutList }[] = [
    { id: "liste", label: "Liste", icon: Table2 },
    { id: "cartes", label: "Cartes", icon: LayoutGrid },
    { id: "kanban", label: "Kanban", icon: LayoutList },
    { id: "groupe", label: "Regroupée", icon: Rows3 },
    { id: "chrono", label: "Chronologie", icon: CalendarRange },
  ];

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(k === "objet" || k === "responsable");
    }
  };

  return (
    <div className="space-y-4">
      {/* Sélecteur de vue */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <span className="text-[12px] text-slate-400">{filtered.length} suivis de mail</span>
      </div>

      {showKpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={Inbox} label="Suivis de mail affichés" value={filtered.length} tone="sky" />
          <KPI icon={ArrowUp} label="En retard" value={enRetard} tone="rose" />
          <KPI icon={ShieldAlert} label="Bloqués" value={bloques} tone="amber" />
          <KPI icon={TrendingUp} label="Taux de réponse" value={taux + "%"} tone="emerald" />
        </div>
      )}

      {/* Barre de filtres */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (objet, réf, destinataire, points clés…)"
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
          {showResponsable && (
            <select value={fAgent} onChange={(e) => setFAgent(e.target.value)} aria-label="Filtrer par responsable" className={selectCls}>
              <option value="Tous">Tous responsables</option>
              {profiles.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nom}
                </option>
              ))}
            </select>
          )}
          <select
            value={fProjet}
            onChange={(e) => setFProjet(e.target.value as "Tous" | "avec" | "sans")}
            aria-label="Filtrer par projet"
            className={selectCls}
          >
            <option value="Tous">Projet : tous</option>
            <option value="avec">Rattachés à un projet</option>
            <option value="sans">Sans projet</option>
          </select>
          <select
            value={fReponse}
            onChange={(e) => setFReponse(e.target.value as "Tous" | "avec" | "sans")}
            aria-label="Filtrer par réponse reçue"
            className={selectCls}
          >
            <option value="Tous">Réponse : toutes</option>
            <option value="avec">A une réponse</option>
            <option value="sans">Sans réponse</option>
          </select>
          <select
            value={fAttach}
            onChange={(e) => setFAttach(e.target.value as "Tous" | "avec" | "sans")}
            aria-label="Filtrer par pièces jointes"
            className={selectCls}
          >
            <option value="Tous">Pièces jointes : toutes</option>
            <option value="avec">Avec pièce jointe</option>
            <option value="sans">Sans pièce jointe</option>
          </select>
          <select
            value={fPeriode}
            onChange={(e) => setFPeriode(e.target.value as Periode)}
            aria-label="Filtrer par période de création"
            className={selectCls}
          >
            {PERIODES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {fPeriode === "perso" && (
            <>
              <input
                type="date"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                aria-label="Du"
                className={selectCls}
              />
              <input
                type="date"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                aria-label="Au"
                className={selectCls}
              />
            </>
          )}
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
              {showResponsable && <option value="agent">Grouper par responsable</option>}
              <option value="metier">Grouper par métier</option>
              <option value="priorite">Grouper par priorité</option>
              <option value="statut">Grouper par statut</option>
            </select>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          Aucun suivi de mail ne correspond à ces filtres.
        </Card>
      ) : view === "liste" ? (
        <ListeView
          rows={sorted}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={onSort}
          onOpen={openItem}
          profileById={profileById}
          rs={rs}
          showResponsable={showResponsable}
        />
      ) : view === "cartes" ? (
        <div className="grid md:grid-cols-2 gap-3">
          {sorted.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanView items={filtered} includeClosed={includeClosed} />
      ) : view === "chrono" ? (
        <ChronoView items={filtered} rs={rs} profileById={profileById} onOpen={openItem} />
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
  showResponsable,
}: {
  rows: Item[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  onOpen: (i: Item) => void;
  profileById: ReturnType<typeof useApp>["profileById"];
  rs: ReturnType<typeof useApp>["rs"];
  showResponsable: boolean;
}) {
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
    >
      {label}
      {sortKey === k && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
  return (
    <Card>
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        {showResponsable && (
          <div className="w-36 shrink-0">
            <Th k="responsable" label="Responsable" />
          </div>
        )}
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
              {showResponsable && (
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Avatar init={owner.init} size="h-7 w-7" />
                  <span className="text-[12px] text-slate-600 truncate">{owner.nom}</span>
                </div>
              )}
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

/* ---------- Vue Regroupée ---------- */
const PRIORITE_ORDER: Record<string, number> = { Critique: 0, Élevé: 1, Moyenne: 2 };

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
  const keyOf = (i: Item) =>
    groupBy === "agent"
      ? i.ownerId
      : groupBy === "metier"
        ? i.metier
        : groupBy === "priorite"
          ? i.priorite
          : i.statut;

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of items) {
      const k = keyOf(i);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    const entries = [...map.entries()];
    if (groupBy === "priorite")
      return entries.sort((a, b) => (PRIORITE_ORDER[a[0]] ?? 9) - (PRIORITE_ORDER[b[0]] ?? 9));
    if (groupBy === "statut")
      return entries.sort(
        (a, b) => STATUT_ORDER.indexOf(a[0] as Statut) - STATUT_ORDER.indexOf(b[0] as Statut)
      );
    return entries.sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, groupBy]);

  return (
    <div className="space-y-5">
      {groups.map(([key, list]) => (
        <div key={key}>
          <div className="flex items-center gap-2 mb-2">
            {groupBy === "agent" && <Avatar init={profileById(key).init} size="h-6 w-6" />}
            {groupBy === "metier" && <MetierChip code={key} />}
            {groupBy === "priorite" && <Priority p={key as "Critique" | "Élevé" | "Moyenne"} />}
            <h2 className="text-[13px] font-semibold text-slate-700">
              {groupBy === "agent"
                ? profileById(key).nom
                : groupBy === "metier"
                  ? `${key} — ${catalogue.metiers[key]?.label ?? key}`
                  : key}
            </h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{list.length}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {list.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Vue Chronologie (par jour de dernière mise à jour) ---------- */
function ChronoView({
  items,
  rs,
  profileById,
  onOpen,
}: {
  items: Item[];
  rs: ReturnType<typeof useApp>["rs"];
  profileById: ReturnType<typeof useApp>["profileById"];
  onOpen: (i: Item) => void;
}) {
  const days = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.dateMaj.getTime() - a.dateMaj.getTime());
    const map = new Map<string, Item[]>();
    for (const i of sorted) {
      const k = i.dateMaj.toISOString().slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-5">
      {days.map(([day, list]) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-semibold text-slate-600">{fmt(new Date(day))}</span>
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{list.length}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <Card>
            <div className="divide-y divide-slate-100">
              {list.map((i) => {
                const state = rs(i);
                const owner = profileById(i.ownerId);
                return (
                  <button
                    key={i.id}
                    onClick={() => onOpen(i)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                  >
                    <MetierChip code={i.metier} />
                    <TypeTag t={i.type} />
                    <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate">{i.objet}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:block">{owner.nom}</span>
                    <span className="text-[12px] text-slate-500 w-20 text-right hidden md:block">{i.statut}</span>
                    <div className="w-24 text-right">{etatBadge(state.level, state.days)}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
