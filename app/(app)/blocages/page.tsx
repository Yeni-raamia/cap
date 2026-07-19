"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  CalendarClock,
  Filter,
  Flag,
  ListChecks,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import {
  APPRECIATIONS,
  BLOCAGE_ACTIONS,
  blocageActionLabel,
  CAUSES,
  fmt,
  type BlocageActionKind,
  type Item,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";

const ACT_ICON: Record<string, typeof Phone> = {
  Phone,
  Mail,
  ArrowUp,
  MessageCircle,
  Users,
  CalendarClock,
  Flag,
};

type ViewMode = "detaillee" | "cause" | "appreciation";

export default function BlocagesPage() {
  const { items, me, rs } = useApp();

  const [view, setView] = useState<ViewMode>("detaillee");
  const [search, setSearch] = useState("");
  const [fMetier, setFMetier] = useState("Tous");
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
      if (fCause !== "Tous" && (i.blocageCause || "—") !== fCause) return false;
      if (fAppr !== "Tous" && (i.appreciation || "—") !== fAppr) return false;
      if (fDem === "avec" && i.blocageActions.length === 0) return false;
      if (fDem === "sans" && i.blocageActions.length > 0) return false;
      if (q && !`${i.objet} ${i.ref}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [risk, search, fMetier, fCause, fAppr, fDem]);

  // Stats d'avancement
  const total = risk.length;
  const avec = risk.filter((i) => i.blocageActions.length > 0).length;
  const sans = total - avec;
  const totalDemarches = risk.reduce((s, i) => s + i.blocageActions.length, 0);
  const pctEngage = total ? Math.round((avec / total) * 100) : 0;

  const metiers = [...new Set(risk.map((i) => i.metier))];
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Ce qui ne bouge pas</h1>
          <p className="text-[13px] text-slate-500">
            Les suivis à risque — et surtout ce que l&apos;équipe fait pour les débloquer.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white">
          {[
            { id: "detaillee" as const, label: "Détaillée" },
            { id: "cause" as const, label: "Par cause" },
            { id: "appreciation" as const, label: "Par appréciation" },
          ].map((v) => (
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
          <select value={fMetier} onChange={(e) => setFMetier(e.target.value)} aria-label="Métier" className={selectCls}>
            <option value="Tous">Tous métiers</option>
            {metiers.map((m) => (<option key={m}>{m}</option>))}
          </select>
          <select value={fCause} onChange={(e) => setFCause(e.target.value)} aria-label="Cause" className={selectCls}>
            <option value="Tous">Toutes causes</option>
            {CAUSES.map((c) => (<option key={c}>{c}</option>))}
          </select>
          <select value={fAppr} onChange={(e) => setFAppr(e.target.value)} aria-label="Appréciation" className={selectCls}>
            <option value="Tous">Toutes appréciations</option>
            {APPRECIATIONS.map((a) => (<option key={a}>{a}</option>))}
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
      ) : groups ? (
        <div className="space-y-5">
          {groups.map(([key, list]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[13px] font-semibold text-slate-700">{key}</h2>
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{list.length}</span>
              </div>
              <div className="space-y-3">
                {list.map((i) => (
                  <BlocageCard key={i.id} item={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <BlocageCard key={i.id} item={i} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center">
        Connecté : {me.nom} — les démarches que tu enregistres sont visibles par le directeur.
      </p>
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

function BlocageCard({ item }: { item: Item }) {
  const { me, rs, openItem, profileById, addBlocageAction, setAppreciation } = useApp();
  const state = rs(item);
  const owner = profileById(item.ownerId);
  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;

  const defaultConcerne = item.personnes.find((p) => p.kind === "destinataire")?.name ?? "";
  const [kind, setKind] = useState<BlocageActionKind>("appel");
  const [concerne, setConcerne] = useState(defaultConcerne);
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <Card className="p-4 border-l-[3px] border-l-rose-500">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <MetierChip code={item.metier} />
        <TypeTag t={item.type} />
        <Token>{item.ref}</Token>
        <span className="ml-auto text-[12px] font-medium text-rose-600">Sans mouvement depuis {state.days}j</span>
      </div>
      <button onClick={() => openItem(item)} className="text-[14px] font-medium text-slate-800 mb-2 text-left hover:underline">
        {item.objet}
      </button>
      <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap mb-3">
        <span className="flex items-center gap-1"><Avatar init={owner.init} size="h-5 w-5" />{owner.nom}</span>
        <span className="flex items-center gap-1 text-rose-600 font-medium"><ShieldAlert size={13} />{item.blocageCause || "Escaladé — sans réponse"}</span>
      </div>

      {/* Appréciation du motif */}
      <div className="flex items-center gap-2 text-[12px] mb-3">
        <span className="text-slate-500">Appréciation du motif :</span>
        {canEdit ? (
          <select
            value={item.appreciation ?? ""}
            onChange={(e) => setAppreciation(item, e.target.value || null)}
            aria-label="Appréciation du motif"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
          >
            <option value="">— à qualifier —</option>
            {APPRECIATIONS.map((a) => (<option key={a}>{a}</option>))}
          </select>
        ) : (
          <span className="font-medium text-slate-700">{item.appreciation ?? "—"}</span>
        )}
      </div>

      {/* Démarches menées */}
      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
          Démarches menées ({item.blocageActions.length})
        </div>
        {item.blocageActions.length === 0 ? (
          <div className="text-[12px] text-slate-400">Aucune démarche enregistrée — dossier à prendre en main.</div>
        ) : (
          <div className="space-y-2">
            {item.blocageActions.map((a) => {
              const meta = BLOCAGE_ACTIONS.find((x) => x.kind === a.kind);
              const Icon = ACT_ICON[meta?.icon ?? "Flag"] ?? Flag;
              return (
                <div key={a.id} className="flex gap-2 text-[12px]">
                  <Icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-700">
                      <span className="font-medium">{blocageActionLabel(a.kind)}</span> — {a.concerne}
                    </div>
                    {a.note && <div className="text-slate-500">{a.note}</div>}
                    <div className="text-[10px] text-slate-400">{profileById(a.authorId).nom} · {fmt(a.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canEdit && (
          <div className="mt-2">
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="text-[12px] text-emerald-700 font-medium hover:underline">
                + Enregistrer une démarche
              </button>
            ) : (
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <div className="grid md:grid-cols-2 gap-2">
                  <select value={kind} onChange={(e) => setKind(e.target.value as BlocageActionKind)} aria-label="Type de démarche" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                    {BLOCAGE_ACTIONS.map((a) => (<option key={a.kind} value={a.kind}>{a.label}</option>))}
                  </select>
                  <input value={concerne} onChange={(e) => setConcerne(e.target.value)} placeholder="Personne concernée (nommée) *" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Compte rendu / message (ex. rapport pour le DG, contenu de la relance…)" className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!concerne.trim()) return;
                      addBlocageAction(item, kind, concerne.trim(), note.trim());
                      setNote("");
                      setShowForm(false);
                    }}
                    disabled={!concerne.trim()}
                    className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    Enregistrer la démarche
                  </button>
                  <button onClick={() => setShowForm(false)} className="text-[12px] text-slate-500 inline-flex items-center gap-1"><X size={13} />Annuler</button>
                </div>
                <p className="text-[10px] text-slate-400">La personne concernée doit toujours être nommée.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
