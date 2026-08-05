"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarClock,
  Check,
  Gavel,
  GitMerge,
  GitPullRequest,
  Globe,
  ListChecks,
  Lock,
  Pencil,
  MessageSquare,
  Plus,
  Share2,
  StickyNote,
  Trash2,
  Users2,
  X,
} from "lucide-react";
import {
  fmt,
  projectMetrics,
  PROJECT_STATUTS,
  TASK_STATUTS,
  type ProjectStatus,
  type TaskStatus,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";
import { Discussion } from "@/components/Discussion";
import { ProjectTaskModal } from "@/components/ProjectTaskModal";

const prioBadge: Record<string, string> = {
  Basse: "bg-slate-100 text-slate-500",
  Normale: "bg-sky-100 text-sky-700",
  Haute: "bg-amber-100 text-amber-700",
  Urgente: "bg-rose-100 text-rose-700",
};

const taskBadge: Record<TaskStatus, string> = {
  "à faire": "bg-slate-100 text-slate-600",
  "en cours": "bg-sky-100 text-sky-700",
  fait: "bg-emerald-100 text-emerald-700",
  bloqué: "bg-rose-100 text-rose-700",
};

export default function ProjetDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const {
    demo,
    me,
    now,
    items,
    profiles,
    projectById,
    profileById,
    openItem,
    updateProject,
    projectTask,
    projectMember,
    projectNote,
    proposeProjectTask,
    decideProjectProposal,
    attachItemToProject,
    requestProjectStatus,
    decideProjectStatus,
    requestProjectClosure,
    decideProjectClosure,
    archiveProject,
    requestProjectDeletion,
    decideProjectDeletion,
    publishProject,
  } = useApp();
  const router = useRouter();

  const project = projectById(id);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  // Proposition de tâche (Lot 3) — pour les non-membres.
  const [propTitle, setPropTitle] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [propDue, setPropDue] = useState("");
  const [note, setNote] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [attachId, setAttachId] = useState("");
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(project?.name ?? "");
  const [descVal, setDescVal] = useState(project?.description ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureSummary, setClosureSummary] = useState("");
  const [closureDeliverables, setClosureDeliverables] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [delRejectNote, setDelRejectNote] = useState("");

  if (!project) {
    return (
      <div className="space-y-4">
        <Link href="/projets" className="inline-flex items-center gap-1 text-[13px] text-emerald-700">
          <ArrowLeft size={15} /> Projets
        </Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">Projet introuvable.</Card>
      </div>
    );
  }

  const m = projectMetrics(project, now);
  const owner = profileById(project.ownerId);
  const canManage = !demo && (me.role === "directeur" || me.role === "admin" || project.ownerId === me.id);
  const canContribute = !demo && (canManage || project.memberIds.includes(me.id));
  // Édition directe du tableau (Lot 3) : propriétaire, membres, manager/dir/admin.
  // Les autres passent par une proposition.
  const canEditBoard =
    !demo && (me.role === "manager" || me.role === "directeur" || me.role === "admin" || project.ownerId === me.id || project.memberIds.includes(me.id));
  const isOwner = !demo && project.ownerId === me.id;
  const pendingProposals = project.proposals.filter((p) => p.status === "en_attente");
  // Propositions de l'utilisateur courant (pour lui montrer leur suivi).
  const myProposals = demo ? [] : project.proposals.filter((p) => p.proposedBy === me.id);
  // Workflow de statut : le directeur/admin valide ; le manager/responsable propose.
  const isDirector = !demo && (me.role === "directeur" || me.role === "admin");
  const canProposeStatus =
    !demo && (isDirector || me.role === "manager" || project.ownerId === me.id);
  const pendingProposer = project.pendingBy ? profileById(project.pendingBy) : null;
  const members = project.memberIds.map(profileById);
  const teamForAssign = project.memberIds.includes(project.ownerId)
    ? members
    : [owner, ...members];
  const linked = items.filter((i) => i.projectId === project.id);
  const attachables = items.filter((i) => !i.projectId);

  const run = async (p: Promise<string | null>) => {
    setErr(null);
    const e = await p;
    if (e) setErr(e);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/projets" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline">
          <ArrowLeft size={15} /> Projets
        </Link>
        <Link href={`/relations?node=project:${project.id}`} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5">
          <Share2 size={14} /> Voir les relations
        </Link>
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {/* En-tête */}
      <Card className="p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            {editName && canManage ? (
              <div className="space-y-2">
                <input
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="w-full text-[15px] font-semibold border border-slate-200 rounded-lg px-2 py-1.5"
                />
                <textarea
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  rows={2}
                  className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await run(updateProject(project.id, { name: nameVal.trim() || project.name, description: descVal }));
                      setEditName(false);
                    }}
                    className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditName(false)}
                    className="text-[12px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
                  {project.published === false && (
                    <span
                      title="Projet privé — visible de vous (et de ses membres) tant qu'il n'est pas publié."
                      className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      <Lock size={11} /> Privé
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-slate-500">{project.description || "—"}</p>
              </>
            )}
          </div>
          {canManage && project.published === false && (
            <button
              onClick={async () => {
                if (typeof window !== "undefined" && !window.confirm(
                  "Publier ce projet le rendra visible par toute l'équipe (listes, statistiques, graphe). Cette action est définitive. Continuer ?"
                )) return;
                await run(publishProject(project.id).then((ok) => (ok ? null : "Publication échouée.")));
              }}
              className="text-[12px] font-medium inline-flex items-center gap-1 text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1"
            >
              <Globe size={13} /> Publier
            </button>
          )}
          {canManage && !editName && (
            <button
              onClick={() => {
                setNameVal(project.name);
                setDescVal(project.description);
                setEditName(true);
              }}
              className="text-[12px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2 py-1"
            >
              Éditer
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Statut</span>
            {isDirector ? (
              <select
                value={project.status}
                onChange={(e) => run(updateProject(project.id, { status: e.target.value as ProjectStatus }))}
                aria-label="Statut du projet"
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
              >
                {PROJECT_STATUTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : canProposeStatus ? (
              <select
                value={project.status}
                onChange={(e) => run(requestProjectStatus(project.id, e.target.value))}
                aria-label="Proposer un statut"
                title="Proposer un changement de statut (validé par le directeur)"
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
              >
                {PROJECT_STATUTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-slate-700">{project.status}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarClock size={13} className="text-slate-400" />
            <span className="text-slate-400">Échéance</span>
            {canManage ? (
              <input
                type="date"
                value={project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : ""}
                onChange={(e) => run(updateProject(project.id, { deadline: e.target.value || null }))}
                aria-label="Échéance du projet"
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              />
            ) : (
              <span className="font-medium text-slate-700">
                {project.deadline ? fmt(project.deadline) : "—"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Avatar init={owner.init} size="h-6 w-6" />
            <span className="text-slate-600">{owner.nom}</span>
          </div>
        </div>

        {/* Proposition de changement de statut en attente de validation */}
        {project.pendingStatus && (
          <div className="mt-4 flex items-center gap-3 flex-wrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px]">
            <Gavel size={15} className="text-amber-600 shrink-0" />
            <span className="text-amber-800">
              Changement proposé : <b>{project.status}</b> → <b>{project.pendingStatus}</b>
              {pendingProposer && <> · par {pendingProposer.nom}</>}
            </span>
            {isDirector ? (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => run(decideProjectStatus(project.id, true))}
                  className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2.5 py-1 font-medium"
                >
                  Valider
                </button>
                <button
                  onClick={() => run(decideProjectStatus(project.id, false))}
                  className="text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-2.5 py-1 font-medium"
                >
                  Refuser
                </button>
              </div>
            ) : (
              <span className="ml-auto text-amber-600 italic">En attente de validation du directeur</span>
            )}
          </div>
        )}

        {/* Avancement */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Avancement · {m.done}/{m.total} tâches{m.late > 0 && ` · ${m.late} en retard`}</span>
            <span className="font-mono">{m.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${m.progress}%` }} />
          </div>
        </div>
      </Card>

      {/* Propositions à valider (Lot 3) — juste sous la barre de progression, en
          surbrillance pulsée pour attirer l'œil du propriétaire. */}
      {isOwner && pendingProposals.length > 0 && (
        <div className="animate-attention rounded-2xl border-2 border-indigo-300 bg-indigo-50/70 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-100/80 border-b border-indigo-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
            </span>
            <GitPullRequest size={16} className="text-indigo-600" />
            <h2 className="text-[13px] font-bold text-indigo-900 uppercase tracking-wide">Propositions à valider</h2>
            <span className="text-[12px] font-bold text-white bg-indigo-600 rounded-full px-2 py-0.5 min-w-[1.4rem] text-center">
              {pendingProposals.length}
            </span>
            <span className="ml-auto text-[11px] text-indigo-700 hidden sm:inline">Action requise du propriétaire</span>
          </div>
          <div className="divide-y divide-indigo-100">
            {pendingProposals.map((p) => (
              <div key={p.id} className="p-4 bg-white/70">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[12rem] space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-slate-800">{p.title}</span>
                      {p.dueDate && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                          <CalendarClock size={11} /> {fmt(p.dueDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Avatar init={profileById(p.proposedBy).init} size="h-5 w-5" />
                      Proposée par {profileById(p.proposedBy).nom} · {fmt(p.createdAt)}
                    </div>
                    {p.description && <p className="text-[12px] text-slate-600 whitespace-pre-wrap pt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => run(decideProjectProposal(p.id, true))}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700 shadow-sm"
                    >
                      <GitMerge size={14} /> Intégrer
                    </button>
                    <button
                      onClick={() => run(decideProjectProposal(p.id, false))}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-600 border border-rose-200 bg-white rounded-lg px-3 py-2 hover:bg-rose-50"
                    >
                      <X size={14} /> Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle de vie : archivage & suppression (avec approbation) */}
      {(() => {
        const isApprover = !demo && (me.role === "manager" || me.role === "directeur" || me.role === "admin");
        const del = project.deletionRequest;
        return (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-slate-500" />
              <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Cycle de vie</h2>
            </div>

            {/* Archivage */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-slate-500">
                {project.archived ? "Projet archivé — masqué des vues actives, conservé." : "Projet actif."}
              </span>
              {canContribute && (
                <button
                  onClick={() => run(archiveProject(project.id, !project.archived))}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-2.5 py-1.5"
                >
                  {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  {project.archived ? "Désarchiver" : "Archiver"}
                </button>
              )}
            </div>

            {/* Suppression : demande + approbation */}
            {del ? (
              <div className={`rounded-lg bg-rose-50 p-3 text-[12px] ${isApprover ? "border-2 border-rose-400 animate-attention-danger" : "border border-rose-200"}`}>
                <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                  {isApprover && (
                    <span className="relative flex h-2.5 w-2.5 mr-0.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                    </span>
                  )}
                  <Trash2 size={14} /> Demande de suppression en attente{isApprover ? " — votre décision est requise" : ""}
                </div>
                <p className="text-slate-500 mt-0.5">Demandée par {profileById(del.requestedBy).nom} · {fmt(del.requestedAt)}</p>
                <p className="text-slate-700 mt-1"><b>Motif :</b> {del.reason}</p>
                {isApprover ? (
                  <div className="mt-2 flex items-center gap-2 flex-wrap border-t border-rose-200 pt-2">
                    <input
                      value={delRejectNote}
                      onChange={(e) => setDelRejectNote(e.target.value)}
                      placeholder="Motif (si refus)…"
                      className="flex-1 min-w-[160px] text-[12px] border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer définitivement le projet « ${project.name} » et ses tâches/notes ? Les suivis liés seront détachés.`)) return;
                        const e = await decideProjectDeletion(project.id, true);
                        if (e) setErr(e);
                        else router.push("/projets");
                      }}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-3 py-1.5"
                    >
                      <Trash2 size={14} /> Approuver et supprimer
                    </button>
                    <button
                      onClick={() => run(decideProjectDeletion(project.id, false, delRejectNote))}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5"
                    >
                      <X size={14} /> Refuser
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-rose-600 italic">En attente d&apos;approbation d&apos;un manager ou admin.</p>
                )}
              </div>
            ) : (
              canContribute &&
              (showDelete ? (
                <div className="space-y-2 rounded-lg border border-rose-200 p-3">
                  <div className="text-[12px] font-semibold text-rose-700">Demander la suppression du projet</div>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={2}
                    placeholder="Motif de la suppression (visible par l'approbateur)…"
                    className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const e = await requestProjectDeletion(project.id, deleteReason.trim());
                        if (e) setErr(e);
                        else {
                          setShowDelete(false);
                          setDeleteReason("");
                        }
                      }}
                      disabled={!deleteReason.trim()}
                      className="text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                    >
                      Envoyer la demande
                    </button>
                    <button onClick={() => setShowDelete(false)} className="text-[13px] text-slate-500 px-3 py-1.5">Annuler</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDelete(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-2.5 py-1.5"
                >
                  <Trash2 size={14} /> Demander la suppression
                </button>
              ))
            )}
          </Card>
        );
      })()}

      {/* Clôture du projet */}
      {(() => {
        const isDecider = !demo && (me.role === "manager" || me.role === "directeur" || me.role === "admin");
        const closure = project.closure;
        const pending = closure && closure.status === "en_attente";
        const doneTasks = project.tasks.filter((t) => t.status === "fait");

        if (project.status === "Terminé") {
          if (!closure || closure.status !== "validee") return null;
          return (
            <Card className="p-4 border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
                <Check size={16} /> Projet clôturé
              </div>
              {closure.summary && <p className="text-[12px] text-slate-600 mt-1 whitespace-pre-wrap">{closure.summary}</p>}
              {closure.deliverables.length > 0 && (
                <ul className="mt-2 text-[12px] text-slate-600 list-disc list-inside">
                  {closure.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </Card>
          );
        }

        if (pending) {
          const requester = profileById(closure!.requestedBy);
          return (
            <Card className="p-4 border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800">
                <Gavel size={16} /> Demande de clôture en attente
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Demandée par {requester.nom} · {fmt(closure!.createdAt)}</p>

              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Récapitulatif</div>
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{closure!.summary}</p>
                  {closure!.deliverables.length > 0 && (
                    <>
                      <div className="text-[11px] font-medium text-slate-500 uppercase mt-3 mb-1">Livrables</div>
                      <ul className="text-[13px] text-slate-700 list-disc list-inside">
                        {closure!.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Phases / tâches achevées ({doneTasks.length})</div>
                  {doneTasks.length === 0 ? (
                    <p className="text-[12px] text-slate-400">Aucune tâche marquée comme faite.</p>
                  ) : (
                    <ul className="space-y-1">
                      {doneTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-1.5 text-[12px] text-slate-600">
                          <Check size={13} className="text-emerald-500 shrink-0" /> {t.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {isDecider && (
                <div className="mt-4 border-t border-amber-200 pt-3 flex items-center gap-2 flex-wrap">
                  <input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Motif (si refus)…"
                    className="flex-1 min-w-[160px] text-[12px] border border-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                  <button
                    onClick={() => run(decideProjectClosure(project.id, true))}
                    className="flex items-center gap-1 text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5"
                  >
                    <Check size={15} /> Valider la clôture
                  </button>
                  <button
                    onClick={() => run(decideProjectClosure(project.id, false, rejectNote))}
                    className="flex items-center gap-1 text-[13px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-3 py-1.5"
                  >
                    <X size={15} /> Refuser
                  </button>
                </div>
              )}
              {!isDecider && <p className="mt-3 text-[12px] text-amber-600 italic">En attente de la décision d&apos;un manager ou du directeur.</p>}
            </Card>
          );
        }

        // Aucune demande en cours : seul un agent (contributeur) initie la demande.
        if (me.role !== "agent" || !canContribute) return null;
        return (
          <Card className="p-4">
            {closure && closure.status === "rejetee" && (
              <p className="text-[12px] text-rose-600 mb-2">
                Dernière demande refusée{closure.decisionNote ? ` : ${closure.decisionNote}` : ""}. Vous pouvez soumettre une nouvelle demande.
              </p>
            )}
            {!showClosure ? (
              <button
                onClick={() => setShowClosure(true)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-2"
              >
                <Gavel size={15} /> Demander la clôture du projet
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[13px] font-semibold text-slate-700">Demande de clôture</div>
                <textarea
                  value={closureSummary}
                  onChange={(e) => setClosureSummary(e.target.value)}
                  placeholder="Récapitulatif des phases et actions achevées…"
                  rows={3}
                  className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2"
                />
                <textarea
                  value={closureDeliverables}
                  onChange={(e) => setClosureDeliverables(e.target.value)}
                  placeholder="Livrables (un par ligne)…"
                  rows={3}
                  className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const deliverables = closureDeliverables.split("\n").map((s) => s.trim()).filter(Boolean);
                      const e = await requestProjectClosure(project.id, closureSummary.trim(), deliverables);
                      if (e) setErr(e);
                      else {
                        setShowClosure(false);
                        setClosureSummary("");
                        setClosureDeliverables("");
                      }
                    }}
                    disabled={!closureSummary.trim()}
                    className="text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                  >
                    Envoyer la demande
                  </button>
                  <button onClick={() => setShowClosure(false)} className="text-[13px] text-slate-500 px-3 py-1.5">Annuler</button>
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Tâches */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ListChecks size={15} className="text-slate-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Tâches</h2>
          <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{m.total}</span>
        </div>
        <Card>
          {project.tasks.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-slate-400">Aucune tâche.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {project.tasks.map((t) => {
                const late = t.status !== "fait" && t.dueDate && t.dueDate.getTime() < now.getTime();
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${taskBadge[t.status]}`}>{t.status}</span>
                    <button onClick={() => setEditTaskId(t.id)} className="flex-1 min-w-0 text-left group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] text-slate-800 truncate group-hover:text-emerald-700">{t.title}</span>
                        {t.priority && t.priority !== "Normale" && (
                          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full ${prioBadge[t.priority] ?? "bg-slate-100 text-slate-500"}`}>{t.priority}</span>
                        )}
                        {t.description && <span className="shrink-0 text-slate-300" title="Contient une description">≡</span>}
                      </div>
                      {t.proposedBy && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 mt-0.5">
                          <GitPullRequest size={10} /> Proposée par {profileById(t.proposedBy).nom}
                        </div>
                      )}
                    </button>
                    {t.dueDate && (
                      <span className={`text-[11px] ${late ? "text-rose-600 font-medium" : "text-slate-400"}`}>
                        {fmt(t.dueDate)}
                      </span>
                    )}
                    {t.assigneeId ? (
                      <Avatar init={profileById(t.assigneeId).init} size="h-6 w-6" />
                    ) : (
                      <span className="text-[10px] text-slate-300 w-6 text-center">—</span>
                    )}
                    {canEditBoard && (
                      <>
                        <select
                          value={t.status}
                          onChange={(e) => run(projectTask("update", { taskId: t.id, status: e.target.value as TaskStatus }))}
                          aria-label="Statut de la tâche"
                          className="text-[11px] border border-slate-200 rounded px-1 py-0.5"
                        >
                          {TASK_STATUTS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditTaskId(t.id)}
                          aria-label="Éditer la tâche"
                          title="Éditer la tâche"
                          className="text-slate-300 hover:text-emerald-600"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canEditBoard && (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 flex-wrap">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Nouvelle tâche…"
                className="flex-1 min-w-[10rem] text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
              />
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                aria-label="Responsable de la tâche"
                className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">Responsable…</option>
                {teamForAssign.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                aria-label="Échéance de la tâche"
                className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
              />
              <button
                onClick={async () => {
                  if (!taskTitle.trim()) return;
                  await run(
                    projectTask("add", {
                      projectId: project.id,
                      title: taskTitle.trim(),
                      assigneeId: taskAssignee || null,
                      dueDate: taskDue || null,
                    })
                  );
                  setTaskTitle("");
                  setTaskAssignee("");
                  setTaskDue("");
                }}
                disabled={!taskTitle.trim()}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          )}
          {/* Proposition de tâche (Lot 3) — pour ceux qui ne sont pas membres du projet. */}
          {!canEditBoard && !demo && (
            <div className="border-t border-slate-100 bg-gradient-to-b from-indigo-50/80 to-white">
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 grid place-items-center shrink-0">
                  <GitPullRequest size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-800">Proposer une tâche</div>
                  <div className="text-[11px] text-slate-500">
                    Vous n&apos;êtes pas membre : votre tâche sera soumise au propriétaire, qui l&apos;intègre ou la refuse.
                  </div>
                </div>
              </div>
              {myProposals.length > 0 && (
                <div className="px-4 pb-1 pt-1 space-y-1">
                  {myProposals.map((p) => {
                    const tone =
                      p.status === "approuvee"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : p.status === "refusee"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-amber-100 text-amber-700 border-amber-200";
                    const label = p.status === "approuvee" ? "Intégrée" : p.status === "refusee" ? "Refusée" : "En attente";
                    return (
                      <div key={p.id} className="flex items-center gap-2 text-[12px] text-slate-600">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>
                        <span className="truncate">{p.title}</span>
                        {p.status === "refusee" && p.decisionNote && (
                          <span className="text-[11px] text-slate-400 truncate">· {p.decisionNote}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-4 pb-4 pt-1 space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Intitulé de la tâche</label>
                  <input
                    value={propTitle}
                    onChange={(e) => setPropTitle(e.target.value)}
                    placeholder="Ex. Vérifier la rotation des sauvegardes…"
                    className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 focus:border-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Précisions <span className="text-slate-400">(facultatif)</span></label>
                  <textarea
                    value={propDesc}
                    onChange={(e) => setPropDesc(e.target.value)}
                    placeholder="Contexte, pourquoi c'est utile…"
                    rows={2}
                    className="w-full text-[12px] border border-slate-200 rounded-lg px-2.5 py-2 focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="flex items-end justify-between gap-2 flex-wrap">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Échéance suggérée <span className="text-slate-400">(facultatif)</span></label>
                    <input
                      type="date"
                      value={propDue}
                      onChange={(e) => setPropDue(e.target.value)}
                      aria-label="Échéance proposée"
                      className="text-[12px] border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!propTitle.trim()) return;
                      const e = await proposeProjectTask(project.id, {
                        title: propTitle.trim(),
                        description: propDesc.trim(),
                        dueDate: propDue || null,
                      });
                      if (!e) { setPropTitle(""); setPropDesc(""); setPropDue(""); }
                    }}
                    disabled={!propTitle.trim()}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg px-4 py-2 hover:bg-indigo-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <GitPullRequest size={15} /> Envoyer la proposition
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Équipe */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users2 size={15} className="text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Équipe</h2>
          </div>
          <Card className="p-3">
            <div className="space-y-2">
              {members.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <Avatar init={u.init} size="h-6 w-6" />
                  <span className="text-[13px] text-slate-700">{u.nom}</span>
                  {u.id === project.ownerId && (
                    <span className="text-[10px] text-emerald-600">· responsable</span>
                  )}
                  {canManage && u.id !== project.ownerId && (
                    <button
                      onClick={() => run(projectMember("remove", project.id, u.id))}
                      aria-label="Retirer du projet"
                      className="ml-auto text-slate-300 hover:text-rose-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <select
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                  aria-label="Ajouter un membre"
                  className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">Ajouter un membre…</option>
                  {profiles
                    .filter((u) => !project.memberIds.includes(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nom}
                      </option>
                    ))}
                </select>
                <button
                  onClick={async () => {
                    if (!addMemberId) return;
                    await run(projectMember("add", project.id, addMemberId));
                    setAddMemberId("");
                  }}
                  disabled={!addMemberId}
                  className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                >
                  Ajouter
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Suivis liés */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListChecks size={15} className="text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Suivis de mail liés</h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2">{linked.length}</span>
          </div>
          <Card className="p-3">
            <div className="space-y-1.5">
              {linked.length === 0 ? (
                <div className="text-[12px] text-slate-400 text-center py-2">Aucun suivi de mail rattaché.</div>
              ) : (
                linked.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => openItem(i)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-1.5 py-1"
                  >
                    <MetierChip code={i.metier} />
                    <TypeTag t={i.type} />
                    <span className="text-[12px] text-slate-700 truncate flex-1">{i.objet}</span>
                    <Token>{i.ref}</Token>
                  </button>
                ))
              )}
            </div>
            {canContribute && attachables.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <select
                  value={attachId}
                  onChange={(e) => setAttachId(e.target.value)}
                  aria-label="Rattacher un suivi de mail"
                  className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">Rattacher un suivi de mail…</option>
                  {attachables.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.ref} — {i.objet.slice(0, 40)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (!attachId) return;
                    await run(attachItemToProject(attachId, project.id));
                    setAttachId("");
                  }}
                  disabled={!attachId}
                  className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                >
                  Rattacher
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StickyNote size={15} className="text-slate-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Notes d&apos;avancement</h2>
        </div>
        <Card className="p-3">
          {canContribute && (
            <div className="flex items-start gap-2 mb-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ajouter une note d'avancement…"
                className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
              />
              <button
                onClick={async () => {
                  if (!note.trim()) return;
                  await run(projectNote(project.id, note.trim()));
                  setNote("");
                }}
                disabled={!note.trim()}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 disabled:opacity-40"
              >
                <Check size={14} /> Publier
              </button>
            </div>
          )}
          {project.notes.length === 0 ? (
            <div className="text-[12px] text-slate-400 text-center py-2">Aucune note.</div>
          ) : (
            <div className="space-y-3">
              {project.notes.map((n) => (
                <div key={n.id} className="flex gap-2">
                  <Avatar init={profileById(n.authorId).init} size="h-6 w-6" />
                  <div className="flex-1">
                    <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{n.body}</div>
                    <div className="text-[10px] text-slate-400">
                      {profileById(n.authorId).nom} · {fmt(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Discussion du projet */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={15} className="text-slate-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Discussion</h2>
        </div>
        <Card className="p-3">
          <Discussion target={{ refType: "project", refId: project.id }} height="h-64" />
        </Card>
      </div>

      {editTaskId && (() => {
        const t = project.tasks.find((x) => x.id === editTaskId);
        if (!t) return null;
        return <ProjectTaskModal task={t} team={teamForAssign} canEdit={canEditBoard} onClose={() => setEditTaskId(null)} />;
      })()}
    </div>
  );
}
