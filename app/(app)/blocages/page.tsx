"use client";

import { useMemo, useState } from "react";
import { Filter, Flag, ListChecks, Phone, ShieldAlert } from "lucide-react";
import { blocageActionLabel, fmt, type Item } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";

type ViewMode = "detaillee" | "compacte" | "cause" | "appreciation";

export default function BlocagesPage() {
  const { items, rs, openItem, profileById, refLists } = useApp();

  const [view, setView] = useState<ViewMode>("compacte");
  const [search, setSearch] = useState("");
  const [fMetier, setFMetier] = useState("Tous");
  const [fResp, setFResp] = useState("Tous");
  const [fCause, setFCause] = useState("Tous");
  const [fAppr, setFAppr] = useState("Tous");
  const [fDem, setFDem] = useState<"Tous" | "avec" | "sans">("Tous");

  const risk = useMemo(
    () =>
      items
        .filter((i) => ["escalade", "bloque"].includes(rs(i).level))
        .sort((a, b) => rs(b).days - rs(a).days),
    [items, rs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return risk.filter((i) => {
      if (fMetier !== "Tous" && i.metier !== fMetier) return false;
      if (fResp !== "Tous" && i.ownerId !== fResp) return false;
      if (fCause !== "Tous" && (i.blocageCause || "—") !== fCause) return false;
      if (fAppr !== "Tous" && (i.appreciation || "—") !== fAppr) return false;
      if (fDem === "avec" && i.blocageActions.length === 0) return false;
      if (fDem === "sans" && i.blocageActions.length > 0) return false;
      if (q && !`${i.objet} ${i.ref}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [risk, search, fMetier, fResp, fCause, fAppr, fDem]);

  // Stats d'avancement
  const total = risk.length;
  const avec = risk.filter((i) => i.blocageActions.length > 0).length;
  const sans = total - avec;
  const totalDemarches = risk.reduce((s, i) => s + i.blocageActions.length, 0);
  const pctEngage = total ? Math.round((avec / total) * 100) : 0;

  const metiers = [...new Set(risk.map((i) => i.metier))];
  const responsables = [...new Set(risk.map((i) => i.ownerId))];
  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const groupBy = view === "cause" ? "cause" : view === "appreciation" ? "appreciation" : null;
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, Item[]>();
    filtered.forEach((i) => {
      const k = (groupBy === "cause" ? i.blocageCause : i.appreciation) || "Non précisé";
      map.set(k, [...(map.get(k) ?? []), i]);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy]);

  const VIEWS: { id: ViewMode; label: string }[] = [
    { id: "compacte", label: "Compacte" },
    { id: "detaillee", label: "Détaillée" },
    { id: "cause", label: "Par cause" },
    { id: "appreciation", label: "Par appréciation" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Ce qui ne bouge pas</h1>
          <p className="text-[13px] text-slate-500">
            Les suivis à risque. Clique un suivi pour qualifier le motif et enregistrer les démarches.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white flex-wrap">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                view === v.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats d'avancement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ShieldAlert} tone="rose" value={total} label="À risque" />
        <StatCard icon={ListChecks} tone="emerald" value={`${avec}/${total}`} label={`Déblocage engagé (${pctEngage}%)`} />
        <StatCard icon={Flag} tone="amber" value={sans} label="Sans démarche" />
        <StatCard icon={Phone} tone="sky" value={totalDemarches} label="Démarches menées" />
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden -mt-2">
        <div className="h-full bg-emerald-400" style={{ width: `${pctEngage}%` }} />
      </div>

      {/* Filtres */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[9rem]" />
          <select value={fMetier} onChange={(e) => setFMetier(e.target.value)} aria-label="Métier" className={selectCls}>
            <option value="Tous">Tous métiers</option>
            {metiers.map((m) => (<option key={m}>{m}</option>))}
          </select>
          <select value={fResp} onChange={(e) => setFResp(e.target.value)} aria-label="Responsable" className={selectCls}>
            <option value="Tous">Tous responsables</option>
            {responsables.map((id) => (<option key={id} value={id}>{profileById(id).nom}</option>))}
          </select>
          <select value={fCause} onChange={(e) => setFCause(e.target.value)} aria-label="Cause" className={selectCls}>
            <option value="Tous">Toutes causes</option>
            {refLists.causes.map((c) => (<option key={c}>{c}</option>))}
          </select>
          <select value={fAppr} onChange={(e) => setFAppr(e.target.value)} aria-label="Appréciation" className={selectCls}>
            <option value="Tous">Toutes appréciations</option>
            {refLists.appreciations.map((a) => (<option key={a}>{a}</option>))}
            <option value="—">Non précisée</option>
          </select>
          <select value={fDem} onChange={(e) => setFDem(e.target.value as "Tous" | "avec" | "sans")} aria-label="Démarches" className={selectCls}>
            <option value="Tous">Démarche : toutes</option>
            <option value="avec">Avec démarche</option>
            <option value="sans">Sans démarche</option>
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-[13px] text-slate-400">
          {total === 0 ? "Rien de bloqué. Tout avance." : "Aucun suivi ne correspond à ces filtres."}
        </Card>
      ) : view === "compacte" ? (
        <CompacteView rows={filtered} rs={rs} openItem={openItem} profileById={profileById} />
      ) : groups ? (
        <div className="space-y-5">
          {groups.map(([key, list]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[13px] font-semibold text-slate-700">{key}</h2>
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{list.length}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {list.map((i) => (<BlocageSummary key={i.id} item={i} />))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((i) => (<BlocageSummary key={i.id} item={i} />))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, tone, value, label }: { icon: typeof Phone; tone: string; value: string | number; label: string }) {
  const toneCls: Record<string, string> = {
    rose: "bg-rose-100 text-rose-600",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneCls[tone]}`}><Icon size={18} /></div>
      <div>
        <div className="text-2xl font-semibold text-slate-800 leading-none">{value}</div>
        <div className="text-[12px] text-slate-500 mt-1">{label}</div>
      </div>
    </Card>
  );
}

const apprBadge = (a: string | null) =>
  !a ? "bg-slate-100 text-slate-400" : a === "En traitement" ? "bg-sky-100 text-sky-700" : a === "Occupation justifiée" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700";

/* Vue compacte — tableau dense, scalable à beaucoup d'utilisateurs. */
function CompacteView({
  rows,
  rs,
  openItem,
  profileById,
}: {
  rows: Item[];
  rs: ReturnType<typeof useApp>["rs"];
  openItem: (i: Item) => void;
  profileById: ReturnType<typeof useApp>["profileById"];
}) {
  return (
    <Card>
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="w-32 shrink-0">Responsable</span>
        <span className="flex-1">Objet</span>
        <span className="w-40 shrink-0">Cause</span>
        <span className="w-32 shrink-0">Appréciation</span>
        <span className="w-16 text-center shrink-0">Démarches</span>
        <span className="w-16 text-right shrink-0">Depuis</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((i) => {
          const owner = profileById(i.ownerId);
          const nb = i.blocageActions.length;
          return (
            <button key={i.id} onClick={() => openItem(i)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <Avatar init={owner.init} size="h-6 w-6" />
                <span className="text-[12px] text-slate-600 truncate">{owner.nom}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <MetierChip code={i.metier} />
                  <TypeTag t={i.type} />
                  <span className="text-[13px] text-slate-800 truncate">{i.objet}</span>
                </div>
                <Token>{i.ref}</Token>
              </div>
              <span className="w-40 shrink-0 text-[12px] text-slate-500 truncate hidden md:block">{i.blocageCause || "—"}</span>
              <span className={`w-32 shrink-0 hidden md:block`}>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${apprBadge(i.appreciation)}`}>{i.appreciation ?? "à qualifier"}</span>
              </span>
              <span className={`w-16 text-center shrink-0 text-[12px] font-medium ${nb === 0 ? "text-rose-600" : "text-slate-600"}`}>{nb}</span>
              <span className="w-16 text-right shrink-0 text-[12px] text-rose-600 font-medium">{rs(i).days}j</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* Carte-résumé — cliquer ouvre le drawer pour agir. */
function BlocageSummary({ item }: { item: Item }) {
  const { rs, openItem, profileById, refLists } = useApp();
  const owner = profileById(item.ownerId);
  const last = item.blocageActions[0];
  return (
    <Card className="p-4 border-l-[3px] border-l-rose-500 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <MetierChip code={item.metier} />
        <TypeTag t={item.type} />
        <Token>{item.ref}</Token>
        <span className="ml-auto text-[12px] font-medium text-rose-600">{rs(item).days}j</span>
      </div>
      <div className="text-[14px] font-medium text-slate-800 mb-2">{item.objet}</div>
      <div className="flex items-center gap-2 text-[12px] text-slate-500 flex-wrap mb-2">
        <span className="flex items-center gap-1"><Avatar init={owner.init} size="h-5 w-5" />{owner.nom}</span>
        <span className="flex items-center gap-1 text-rose-600"><ShieldAlert size={13} />{item.blocageCause || "Escaladé"}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${apprBadge(item.appreciation)}`}>{item.appreciation ?? "à qualifier"}</span>
      </div>
      <div className="text-[12px] text-slate-500 mb-3">
        {item.blocageActions.length === 0 ? (
          <span className="text-rose-600 font-medium">Aucune démarche — à prendre en main</span>
        ) : (
          <span>
            {item.blocageActions.length} démarche(s) · dernière : {blocageActionLabel(last.kind, refLists.actions)} ({fmt(last.createdAt)})
          </span>
        )}
      </div>
      <button onClick={() => openItem(item)} className="mt-auto text-[12px] text-emerald-700 font-medium hover:underline text-left">
        Ouvrir pour agir →
      </button>
    </Card>
  );
}
