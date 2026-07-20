"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Filter,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  Link2,
  ListChecks,
  Plus,
  Rows3,
  Table2,
  Users2,
} from "lucide-react";
import {
  fmt,
  projectMetrics,
  PROJECT_STATUTS,
  type Profile,
  type Project,
  type ProjectStatus,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";

const statusBadge: Record<ProjectStatus, string> = {
  "En cours": "bg-emerald-100 text-emerald-700",
  "En pause": "bg-amber-100 text-amber-700",
  Terminé: "bg-slate-100 text-slate-600",
  Annulé: "bg-rose-100 text-rose-700",
};

type ViewMode = "cartes" | "liste" | "kanban" | "groupe";

export default function ProjetsPage() {
  const { demo, projects, items, now, profileById, profiles, createProject } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>("cartes");
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("Tous");
  const [fResp, setFResp] = useState("Tous");
  const [fRetard, setFRetard] = useState(false);

  const linkedCount = (p: Project) => items.filter((i) => i.projectId === p.id).length;
  const isLate = (p: Project) =>
    p.status !== "Terminé" && p.status !== "Annulé" && !!p.deadline && p.deadline.getTime() < now.getTime();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (fStatut !== "Tous" && p.status !== fStatut) return false;
      if (fResp !== "Tous" && p.ownerId !== fResp) return false;
      if (fRetard && !isLate(p)) return false;
      if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, search, fStatut, fResp, fRetard, now]);

  const submit = async () => {
    setErr(null);
    const error = await createProject(name.trim(), desc.trim(), deadline || null);
    if (error) return setErr(error);
    setName("");
    setDesc("");
    setDeadline("");
    setShowNew(false);
  };

  const owners = [...new Set(projects.map((p) => p.ownerId))];
  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";
  const VIEWS: { id: ViewMode; label: string; icon: typeof Table2 }[] = [
    { id: "cartes", label: "Cartes", icon: LayoutGrid },
    { id: "liste", label: "Liste", icon: Table2 },
    { id: "kanban", label: "Kanban", icon: LayoutList },
    { id: "groupe", label: "Par responsable", icon: Rows3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Projets</h1>
          <p className="text-[13px] text-slate-500">
            Tâches, avancement, équipe. Un suivi de métier <span className="font-mono">PRJ</span> crée son projet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md font-medium transition ${view === v.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                <v.icon size={14} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          {!demo && (
            <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700">
              <Plus size={16} />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          )}
        </div>
      </div>

      {showNew && !demo && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouveau projet</div>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du projet" className="text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Échéance" className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-700" />
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Description (optionnel)" className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
          {err && <div className="text-[12px] text-rose-600">{err}</div>}
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={!name.trim()} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40">Créer le projet</button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} aria-label="Statut" className={selectCls}>
            <option value="Tous">Tous statuts</option>
            {PROJECT_STATUTS.map((s) => (<option key={s}>{s}</option>))}
          </select>
          <select value={fResp} onChange={(e) => setFResp(e.target.value)} aria-label="Responsable" className={selectCls}>
            <option value="Tous">Tous responsables</option>
            {owners.map((id) => (<option key={id} value={id}>{profileById(id).nom}</option>))}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer">
            <input type="checkbox" checked={fRetard} onChange={(e) => setFRetard(e.target.checked)} className="h-3.5 w-3.5 accent-rose-600" />
            En retard
          </label>
          <span className="ml-auto text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          {projects.length === 0 ? (
            <>Aucun projet. Crée un suivi de métier <span className="font-mono">PRJ</span> — son projet apparaîtra ici.</>
          ) : (
            "Aucun projet ne correspond à ces filtres."
          )}
        </Card>
      ) : view === "cartes" ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((p) => (<ProjectCard key={p.id} p={p} now={now} owner={profileById(p.ownerId)} linked={linkedCount(p)} late={isLate(p)} />))}
        </div>
      ) : view === "liste" ? (
        <ProjectList rows={filtered} now={now} profileById={profileById} isLate={isLate} />
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PROJECT_STATUTS.map((s) => {
            const col = filtered.filter((p) => p.status === s);
            return (
              <div key={s} className="w-72 shrink-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[12px] font-semibold text-slate-700">{s}</span>
                  <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.length === 0 ? (
                    <div className="text-[12px] text-slate-300 text-center py-6 border border-dashed border-slate-200 rounded-xl">—</div>
                  ) : (
                    col.map((p) => (<ProjectCard key={p.id} p={p} now={now} owner={profileById(p.ownerId)} linked={linkedCount(p)} late={isLate(p)} compact />))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <GroupeParResponsable projects={filtered} now={now} profileById={profileById} profiles={profiles} linkedCount={linkedCount} isLate={isLate} />
      )}
    </div>
  );
}

function ProjectCard({ p, now, owner, linked, late, compact }: { p: Project; now: Date; owner: Profile; linked: number; late: boolean; compact?: boolean }) {
  const m = projectMetrics(p, now);
  return (
    <Link href={`/projets/${p.id}`}>
      <Card className={`p-4 hover:shadow-sm transition h-full ${late ? "border-l-[3px] border-l-rose-400" : ""}`}>
        <div className="flex items-start gap-2 mb-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-emerald-400 grid place-items-center shrink-0"><FolderKanban size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-slate-800 truncate">{p.name}</div>
            {!compact && <div className="text-[11px] text-slate-400 truncate">{p.description || "—"}</div>}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status]}`}>{p.status}</span>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Avancement</span>
            <span className="font-mono">{m.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${m.progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1"><ListChecks size={13} />{m.done}/{m.total}</span>
          {m.late > 0 && <span className="text-rose-600 font-medium">{m.late} en retard</span>}
          {!compact && <span className="inline-flex items-center gap-1"><Link2 size={13} />{linked}</span>}
          {!compact && <span className="inline-flex items-center gap-1"><Users2 size={13} />{p.memberIds.length}</span>}
          {p.deadline && <span className={`inline-flex items-center gap-1 ml-auto ${late ? "text-rose-600 font-medium" : ""}`}><CalendarClock size={13} />{fmt(p.deadline)}</span>}
        </div>
        {!compact && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <Avatar init={owner.init} size="h-6 w-6" />
            <span className="text-[12px] text-slate-600">{owner.nom}</span>
            <span className="ml-auto text-[11px] text-emerald-700 font-medium">Ouvrir →</span>
          </div>
        )}
      </Card>
    </Link>
  );
}

function ProjectList({ rows, now, profileById, isLate }: { rows: Project[]; now: Date; profileById: ReturnType<typeof useApp>["profileById"]; isLate: (p: Project) => boolean }) {
  return (
    <Card>
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="flex-1">Projet</span>
        <span className="w-28 shrink-0">Responsable</span>
        <span className="w-24 shrink-0">Statut</span>
        <span className="w-28 shrink-0">Avancement</span>
        <span className="w-16 text-center shrink-0">Tâches</span>
        <span className="w-20 text-right shrink-0">Échéance</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((p) => {
          const m = projectMetrics(p, now);
          const owner = profileById(p.ownerId);
          const late = isLate(p);
          return (
            <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-slate-800 truncate">{p.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{p.description || "—"}</div>
              </div>
              <div className="w-28 shrink-0 flex items-center gap-1.5">
                <Avatar init={owner.init} size="h-6 w-6" />
                <span className="text-[12px] text-slate-600 truncate hidden md:block">{owner.nom}</span>
              </div>
              <span className="w-24 shrink-0"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status]}`}>{p.status}</span></span>
              <div className="w-28 shrink-0 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${m.progress}%` }} />
                </div>
                <span className="text-[11px] text-slate-500 font-mono w-8 text-right">{m.progress}%</span>
              </div>
              <span className={`w-16 text-center shrink-0 text-[12px] ${m.late ? "text-rose-600 font-medium" : "text-slate-600"}`}>{m.done}/{m.total}</span>
              <span className={`w-20 text-right shrink-0 text-[12px] ${late ? "text-rose-600 font-medium" : "text-slate-500"}`}>{p.deadline ? fmt(p.deadline) : "—"}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function GroupeParResponsable({ projects, now, profileById, linkedCount, isLate }: { projects: Project[]; now: Date; profileById: ReturnType<typeof useApp>["profileById"]; profiles: ReturnType<typeof useApp>["profiles"]; linkedCount: (p: Project) => number; isLate: (p: Project) => boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((p) => map.set(p.ownerId, [...(map.get(p.ownerId) ?? []), p]));
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [projects]);
  return (
    <div className="space-y-5">
      {groups.map(([ownerId, list]) => {
        const owner = profileById(ownerId);
        return (
          <div key={ownerId}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar init={owner.init} size="h-6 w-6" />
              <h2 className="text-[13px] font-semibold text-slate-700">{owner.nom}</h2>
              <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{list.length}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {list.map((p) => (<ProjectCard key={p.id} p={p} now={now} owner={owner} linked={linkedCount(p)} late={isLate(p)} />))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
