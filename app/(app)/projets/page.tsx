"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, FolderKanban, Link2, ListChecks, Plus, Users2 } from "lucide-react";
import { fmt, projectMetrics, type Project, type ProjectStatus } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";

const statusBadge: Record<ProjectStatus, string> = {
  "En cours": "bg-emerald-100 text-emerald-700",
  "En pause": "bg-amber-100 text-amber-700",
  Terminé: "bg-slate-100 text-slate-600",
  Annulé: "bg-rose-100 text-rose-700",
};

export default function ProjetsPage() {
  const { demo, projects, items, now, profileById, createProject } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const error = await createProject(name.trim(), desc.trim(), deadline || null);
    if (error) return setErr(error);
    setName("");
    setDesc("");
    setDeadline("");
    setShowNew(false);
  };

  const linkedCount = (p: Project) => items.filter((i) => i.projectId === p.id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Projets</h1>
          <p className="text-[13px] text-slate-500">
            Le suivi des projets — tâches, avancement, équipe. Un suivi de métier{" "}
            <span className="font-mono">PRJ</span> crée automatiquement son projet.
          </p>
        </div>
        {!demo && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700"
          >
            <Plus size={16} />
            Nouveau projet
          </button>
        )}
      </div>

      {showNew && !demo && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouveau projet</div>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet"
              className="text-[13px] border border-slate-200 rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label="Échéance"
              className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="Description (optionnel)"
            className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2"
          />
          {err && <div className="text-[12px] text-rose-600">{err}</div>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowNew(false)}
              className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
            >
              Créer le projet
            </button>
          </div>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          Aucun projet pour l&apos;instant. Crée un suivi de métier{" "}
          <span className="font-mono">PRJ</span> — son projet apparaîtra ici.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const m = projectMetrics(p, now);
            const owner = profileById(p.ownerId);
            return (
              <Link key={p.id} href={`/projets/${p.id}`}>
                <Card className="p-4 hover:shadow-sm transition h-full">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-9 w-9 rounded-lg bg-slate-900 text-emerald-400 grid place-items-center shrink-0">
                      <FolderKanban size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.description || "—"}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status]}`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Avancement */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Avancement</span>
                      <span className="font-mono">{m.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${m.progress}%` }} />
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks size={13} />
                      {m.done}/{m.total} tâches
                    </span>
                    {m.late > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        {m.late} en retard
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={13} />
                      {linkedCount(p)} suivis
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users2 size={13} />
                      {p.memberIds.length}
                    </span>
                    {p.deadline && (
                      <span className="inline-flex items-center gap-1 ml-auto">
                        <CalendarClock size={13} />
                        {fmt(p.deadline)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Avatar init={owner.init} size="h-6 w-6" />
                    <span className="text-[12px] text-slate-600">{owner.nom}</span>
                    <span className="ml-auto text-[11px] text-emerald-700 font-medium">Ouvrir →</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
