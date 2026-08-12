"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Download, ExternalLink, FileText, Gavel, Link2, Loader2, MessageSquare, Paperclip, Plus, Send, Share2, Trash2, Users2, Video, X } from "lucide-react";
import {
  contactDisplayName,
  formatBytes,
  formatDuration,
  MEETING_DURATIONS,
  MEETING_LINK_TYPES,
  MEETING_PRESENCES,
  MEETING_STATUTS,
  type MeetingLink,
  type MeetingLinkType,
  type MeetingParticipant,
  type MeetingPresence,
  type MeetingStatus,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, Token } from "@/components/atoms";
import { Discussion } from "@/components/Discussion";
import { MeetingPrint } from "@/components/MeetingPrint";
import { meetingStatusBadge } from "../page";

interface AttMeta { id: string; filename: string; mime: string; size: number }
const presenceBadge: Record<string, string> = {
  invité: "text-slate-500",
  présent: "text-emerald-600",
  absent: "text-rose-600",
  excusé: "text-amber-600",
};

export default function ReunionDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const {
    meetingById, updateMeeting, deleteMeeting, readOnly, toast,
    profiles, profileById, contacts, items, projects, tasks, negligences, nonConformites, objectives, openItem,
  } = useApp();

  const meeting = meetingById(id);
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [visioUrl, setVisioUrl] = useState(meeting?.visioUrl ?? "");
  const [newDecision, setNewDecision] = useState("");
  const [pMember, setPMember] = useState("");
  const [pContact, setPContact] = useState("");
  const [linkType, setLinkType] = useState<MeetingLinkType>("item");
  const [linkId, setLinkId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [printOn, setPrintOn] = useState(false);

  useEffect(() => {
    fetch(`/api/meetings/attachments?meetingId=${id}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.attachments)) setAttachments(d.attachments); })
      .catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!printOn) return;
    const t = setTimeout(() => { window.print(); setPrintOn(false); }, 150);
    return () => clearTimeout(t);
  }, [printOn]);

  if (!meeting) {
    return (
      <div className="space-y-4">
        <Link href="/reunions" className="inline-flex items-center gap-1 text-[13px] text-emerald-700"><ArrowLeft size={15} /> Réunions</Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">Réunion introuvable.</Card>
      </div>
    );
  }
  const canEdit = !readOnly;
  const run = async (p: Promise<string | null>) => { setErr(null); const e = await p; if (e) setErr(e); };

  // Options d'entités reliables selon le type choisi.
  const linkOptions: { id: string; label: string }[] =
    linkType === "item" ? items.map((i) => ({ id: i.id, label: `${i.ref} — ${i.objet}` }))
    : linkType === "project" ? projects.map((p) => ({ id: p.id, label: p.name }))
    : linkType === "task" ? tasks.map((t) => ({ id: t.id, label: t.title }))
    : linkType === "negligence" ? negligences.map((n) => ({ id: n.id, label: n.objet || "Négligence" }))
    : linkType === "nonconformite" ? nonConformites.map((n) => ({ id: n.id, label: n.objet || "Non-conformité" }))
    : objectives.map((o) => ({ id: o.id, label: o.title }));

  const linkInfo = (l: MeetingLink): { label: string; kind: string; onOpen?: () => void; href?: string } => {
    const kind = MEETING_LINK_TYPES.find((t) => t.type === l.type)?.label ?? l.type;
    if (l.type === "item") { const it = items.find((i) => i.id === l.id); return { kind, label: it ? `${it.ref} — ${it.objet}` : "Suivi supprimé", onOpen: it ? () => openItem(it) : undefined }; }
    if (l.type === "project") { const p = projects.find((x) => x.id === l.id); return { kind, label: p?.name ?? "Projet supprimé", href: p ? `/projets/${p.id}` : undefined }; }
    if (l.type === "task") { const t = tasks.find((x) => x.id === l.id); return { kind, label: t?.title ?? "Tâche supprimée", href: "/productivite" }; }
    if (l.type === "negligence") { const n = negligences.find((x) => x.id === l.id); return { kind, label: n?.objet || "Négligence", href: `/negligences/${l.id}` }; }
    if (l.type === "nonconformite") { const n = nonConformites.find((x) => x.id === l.id); return { kind, label: n?.objet || "Non-conformité", href: `/non-conformites/${l.id}` }; }
    const o = objectives.find((x) => x.id === l.id); return { kind, label: o?.title ?? "Objectif", href: "/plan" };
  };
  const partLabel = (p: MeetingParticipant): string =>
    p.kind === "member" ? profileById(p.id).nom : contactDisplayName(contacts.find((c) => c.id === p.id) ?? {}) || "Contact supprimé";

  const addParticipant = (kind: "member" | "contact", pid: string) => {
    if (!pid || meeting.participants.some((x) => x.kind === kind && x.id === pid)) return;
    run(updateMeeting(id, { participants: [...meeting.participants, { kind, id: pid, presence: "invité" }] }));
  };
  const removeParticipant = (p: MeetingParticipant) =>
    run(updateMeeting(id, { participants: meeting.participants.filter((x) => !(x.kind === p.kind && x.id === p.id)) }));
  const setPresence = (p: MeetingParticipant, presence: MeetingPresence) =>
    run(updateMeeting(id, { participants: meeting.participants.map((x) => (x.kind === p.kind && x.id === p.id ? { ...x, presence } : x)) }));
  const invite = async () => {
    setInviting(true);
    const r = await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "invite", id }) });
    const d = await r.json().catch(() => ({}));
    setInviting(false);
    if (!r.ok) { setErr(d.error || "Envoi impossible."); return; }
    toast(`Invitations envoyées (${d.notified ?? 0} membre·s notifié·s).`, "success");
  };
  const upload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("meetingId", id);
    form.append("file", file);
    const r = await fetch("/api/meetings/attachments", { method: "POST", body: form });
    const d = await r.json().catch(() => ({}));
    setUploading(false);
    if (!r.ok) { setErr(d.error || "Envoi impossible."); return; }
    if (Array.isArray(d.attachments)) setAttachments(d.attachments);
  };
  const removeAtt = async (attId: string) => {
    const r = await fetch(`/api/meetings/attachments?id=${attId}&meetingId=${id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (Array.isArray(d.attachments)) setAttachments(d.attachments);
  };
  const addLink = () => {
    if (!linkId || meeting.links.some((x) => x.type === linkType && x.id === linkId)) return;
    run(updateMeeting(id, { links: [...meeting.links, { type: linkType, id: linkId }] }));
    setLinkId("");
  };
  const removeLink = (l: MeetingLink) =>
    run(updateMeeting(id, { links: meeting.links.filter((x) => !(x.type === l.type && x.id === l.id)) }));
  const addDecision = () => { if (!newDecision.trim()) return; run(updateMeeting(id, { decisions: [...meeting.decisions, newDecision.trim()] })); setNewDecision(""); };
  const removeDecision = (i: number) => run(updateMeeting(id, { decisions: meeting.decisions.filter((_, idx) => idx !== i) }));

  const inputCls = "w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400";
  const memberOpts = profiles.filter((u) => !meeting.participants.some((p) => p.kind === "member" && p.id === u.id));
  const contactOpts = contacts.filter((c) => !meeting.participants.some((p) => p.kind === "contact" && p.id === c.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/reunions" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline"><ArrowLeft size={15} /> Réunions</Link>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button onClick={invite} disabled={inviting || meeting.participants.length === 0} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
              {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Inviter
            </button>
          )}
          <button onClick={() => setPrintOn(true)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5">
            <FileText size={14} /> Compte-rendu (PDF)
          </button>
          <Link href={`/relations?node=meeting:${meeting.id}`} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5">
            <Share2 size={14} /> Relations
          </Link>
          {canEdit && (
          <button
            onClick={async () => { if (!confirm(`Supprimer la réunion « ${meeting.title} » ?`)) return; const e = await deleteMeeting(id); if (!e) router.push("/reunions"); }}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-3 py-1.5"
          >
            <Trash2 size={14} /> Supprimer
          </button>
          )}
        </div>
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {/* En-tête / métadonnées */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center"><CalendarDays size={17} /></div>
          {canEdit ? (
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== meeting.title && run(updateMeeting(id, { title: title.trim() }))} className="flex-1 text-[15px] font-semibold border border-transparent hover:border-slate-200 focus:border-emerald-400 rounded-lg px-2 py-1 outline-none" />
          ) : (
            <h1 className="flex-1 text-[15px] font-semibold text-slate-800">{meeting.title}</h1>
          )}
          {canEdit ? (
            <select value={meeting.status} onChange={(e) => run(updateMeeting(id, { status: e.target.value as MeetingStatus }))} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white">
              {MEETING_STATUTS.map((s) => (<option key={s}>{s}</option>))}
            </select>
          ) : (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${meetingStatusBadge[meeting.status] ?? ""}`}>{meeting.status}</span>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Date & heure</div>
            {canEdit ? (
              <input type="datetime-local" value={meeting.date ? new Date(meeting.date.getTime() - meeting.date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => run(updateMeeting(id, { date: e.target.value || null }))} className={inputCls} />
            ) : <div className="text-[13px] text-slate-700">{meeting.date ? meeting.date.toLocaleString("fr-FR") : "—"}</div>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Durée</div>
            {canEdit ? (
              <select
                value={meeting.durationMinutes}
                onChange={(e) => run(updateMeeting(id, { durationMinutes: Number(e.target.value) }))}
                className={`${inputCls} bg-white dark:bg-slate-900`}
              >
                {MEETING_DURATIONS.map((m) => <option key={m} value={m}>{formatDuration(m)}</option>)}
              </select>
            ) : <div className="text-[13px] text-slate-700">{formatDuration(meeting.durationMinutes)}</div>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Lieu (salle)</div>
            {canEdit ? (
              <input value={location} onChange={(e) => setLocation(e.target.value)} onBlur={() => location !== meeting.location && run(updateMeeting(id, { location }))} placeholder="Salle de réunion" className={inputCls} />
            ) : <div className="text-[13px] text-slate-700">{meeting.location || "—"}</div>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Lien de visioconférence</div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <input value={visioUrl} onChange={(e) => setVisioUrl(e.target.value)} onBlur={() => visioUrl !== meeting.visioUrl && run(updateMeeting(id, { visioUrl }))} placeholder="https://… (Teams, Zoom, Jitsi)" className={inputCls} />
            ) : <div className="flex-1 text-[13px] text-slate-700 truncate">{meeting.visioUrl || "—"}</div>}
            {meeting.visioUrl && (
              <a href={meeting.visioUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5">
                <Video size={14} /> Rejoindre
              </a>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Ordre du jour</div>
          {canEdit ? (
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} onBlur={() => agenda !== meeting.agenda && run(updateMeeting(id, { agenda }))} rows={3} placeholder="Points à aborder…" className={`${inputCls} resize-y`} />
          ) : <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{meeting.agenda || "—"}</div>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Participants */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Users2 size={15} className="text-slate-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Participants ({meeting.participants.length})</h2></div>
          <div className="space-y-1.5 mb-3">
            {meeting.participants.length === 0 && <span className="text-[12px] text-slate-400">Aucun participant.</span>}
            {meeting.participants.map((p) => (
              <div key={`${p.kind}-${p.id}`} className="flex items-center gap-2 text-[12px]">
                {p.kind === "member" ? <Avatar init={profileById(p.id).init} size="h-5 w-5" /> : <span className="h-5 w-5 rounded-full bg-sky-100 text-sky-600 grid place-items-center text-[9px]">ext</span>}
                <span className="flex-1 truncate text-slate-700">{partLabel(p)}</span>
                {canEdit ? (
                  <select value={p.presence} onChange={(e) => setPresence(p, e.target.value as MeetingPresence)} className={`text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white ${presenceBadge[p.presence] ?? ""}`}>
                    {MEETING_PRESENCES.map((pr) => (<option key={pr} value={pr}>{pr}</option>))}
                  </select>
                ) : <span className={`text-[11px] ${presenceBadge[p.presence] ?? ""}`}>{p.presence}</span>}
                {canEdit && <button onClick={() => removeParticipant(p)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select value={pMember} onChange={(e) => { setPMember(e.target.value); if (e.target.value) { addParticipant("member", e.target.value); setPMember(""); } }} className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="">+ Ajouter un membre…</option>
                  {memberOpts.map((u) => (<option key={u.id} value={u.id}>{u.nom}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select value={pContact} onChange={(e) => { setPContact(e.target.value); if (e.target.value) { addParticipant("contact", e.target.value); setPContact(""); } }} className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="">+ Ajouter un contact…</option>
                  {contactOpts.map((c) => (<option key={c.id} value={c.id}>{contactDisplayName(c) || c.email}</option>))}
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Sujets reliés */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Link2 size={15} className="text-slate-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Sujets reliés ({meeting.links.length})</h2></div>
          <div className="space-y-1.5 mb-3">
            {meeting.links.length === 0 && <span className="text-[12px] text-slate-400">Aucun sujet relié.</span>}
            {meeting.links.map((l) => {
              const info = linkInfo(l);
              return (
                <div key={`${l.type}-${l.id}`} className="flex items-center gap-2 text-[12px]">
                  <Token>{info.kind}</Token>
                  {info.onOpen ? (
                    <button onClick={info.onOpen} className="flex-1 text-left text-slate-700 hover:text-emerald-700 truncate inline-flex items-center gap-1"><ExternalLink size={11} /> {info.label}</button>
                  ) : info.href ? (
                    <Link href={info.href} className="flex-1 text-slate-700 hover:text-emerald-700 truncate inline-flex items-center gap-1"><ExternalLink size={11} /> {info.label}</Link>
                  ) : (
                    <span className="flex-1 text-slate-500 truncate">{info.label}</span>
                  )}
                  {canEdit && <button onClick={() => removeLink(l)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
                </div>
              );
            })}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select value={linkType} onChange={(e) => { setLinkType(e.target.value as MeetingLinkType); setLinkId(""); }} className="text-[12px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white">
                {MEETING_LINK_TYPES.map((t) => (<option key={t.type} value={t.type}>{t.label}</option>))}
              </select>
              <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="flex-1 min-w-[8rem] text-[12px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white">
                <option value="">Choisir…</option>
                {linkOptions.map((o) => (<option key={o.id} value={o.id}>{o.label.slice(0, 60)}</option>))}
              </select>
              <button onClick={addLink} disabled={!linkId} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 disabled:opacity-40"><Plus size={13} /> Relier</button>
            </div>
          )}
        </Card>
      </div>

      {/* Compte-rendu & décisions */}
      <Card className="p-4 space-y-3">
        <div className="text-[13px] font-semibold text-slate-700">Compte-rendu</div>
        {canEdit ? (
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== meeting.notes && run(updateMeeting(id, { notes }))} rows={4} placeholder="Notes de la réunion…" className={`${inputCls} resize-y`} />
        ) : <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{meeting.notes || "—"}</div>}

        <div className="flex items-center gap-2"><Gavel size={14} className="text-slate-500" /><div className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Décisions</div></div>
        {meeting.decisions.length === 0 ? (
          <div className="text-[12px] text-slate-400">Aucune décision consignée.</div>
        ) : (
          <ul className="space-y-1">
            {meeting.decisions.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-slate-700">
                <Check size={14} className="text-emerald-500 shrink-0" />
                <span className="flex-1">{d}</span>
                {canEdit && <button onClick={() => removeDecision(i)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="flex items-center gap-2">
            <input value={newDecision} onChange={(e) => setNewDecision(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDecision()} placeholder="Ajouter une décision…" className={inputCls} />
            <button onClick={addDecision} disabled={!newDecision.trim()} className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40">Ajouter</button>
          </div>
        )}
      </Card>

      {/* Pièces jointes */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2"><Paperclip size={15} className="text-slate-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Documents ({attachments.length})</h2></div>
        <div className="space-y-1.5 mb-3">
          {attachments.length === 0 && <span className="text-[12px] text-slate-400">Aucun document.</span>}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[12px]">
              <Paperclip size={13} className="text-slate-300 shrink-0" />
              <span className="flex-1 truncate text-slate-700">{a.filename}</span>
              <span className="text-slate-400">{formatBytes(a.size)}</span>
              <a href={`/api/meetings/attachments?id=${a.id}`} className="text-slate-400 hover:text-emerald-600" title="Télécharger"><Download size={14} /></a>
              {canEdit && <button onClick={() => removeAtt(a.id)} className="text-slate-300 hover:text-rose-600" title="Supprimer"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
        {canEdit && (
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter un document
            <input type="file" className="hidden" onChange={(e) => { upload(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
        )}
      </Card>

      {/* Discussion de la réunion */}
      <div>
        <div className="flex items-center gap-2 mb-2"><MessageSquare size={15} className="text-slate-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Discussion</h2></div>
        <Card className="p-3"><Discussion target={{ refType: "meeting", refId: meeting.id }} height="h-64" /></Card>
      </div>

      {printOn && <MeetingPrint meeting={meeting} />}
    </div>
  );
}
