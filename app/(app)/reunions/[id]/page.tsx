"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ExternalLink, Gavel, Link2, Plus, Trash2, Users2, X } from "lucide-react";
import {
  contactDisplayName,
  MEETING_LINK_TYPES,
  MEETING_STATUTS,
  type MeetingLink,
  type MeetingLinkType,
  type MeetingParticipant,
  type MeetingStatus,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, Token } from "@/components/atoms";
import { meetingStatusBadge } from "../page";

export default function ReunionDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const {
    meetingById, updateMeeting, deleteMeeting, readOnly,
    profiles, profileById, contacts, items, projects, tasks, negligences, nonConformites, objectives, openItem,
  } = useApp();

  const meeting = meetingById(id);
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [newDecision, setNewDecision] = useState("");
  const [pMember, setPMember] = useState("");
  const [pContact, setPContact] = useState("");
  const [linkType, setLinkType] = useState<MeetingLinkType>("item");
  const [linkId, setLinkId] = useState("");
  const [err, setErr] = useState<string | null>(null);

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
    run(updateMeeting(id, { participants: [...meeting.participants, { kind, id: pid }] }));
  };
  const removeParticipant = (p: MeetingParticipant) =>
    run(updateMeeting(id, { participants: meeting.participants.filter((x) => !(x.kind === p.kind && x.id === p.id)) }));
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
        {canEdit && (
          <button
            onClick={async () => { if (!confirm(`Supprimer la réunion « ${meeting.title} » ?`)) return; const e = await deleteMeeting(id); if (!e) router.push("/reunions"); }}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-3 py-1.5"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        )}
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
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Lieu / lien visio</div>
            {canEdit ? (
              <input value={location} onChange={(e) => setLocation(e.target.value)} onBlur={() => location !== meeting.location && run(updateMeeting(id, { location }))} placeholder="Salle, ou https://…" className={inputCls} />
            ) : <div className="text-[13px] text-slate-700">{meeting.location || "—"}</div>}
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
          <div className="flex flex-wrap gap-1.5 mb-3">
            {meeting.participants.length === 0 && <span className="text-[12px] text-slate-400">Aucun participant.</span>}
            {meeting.participants.map((p) => (
              <span key={`${p.kind}-${p.id}`} className={`inline-flex items-center gap-1 text-[12px] rounded-full px-2 py-1 ${p.kind === "member" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
                {p.kind === "member" && <Avatar init={profileById(p.id).init} size="h-4 w-4" />}
                {partLabel(p)}
                <span className="text-[9px] uppercase opacity-60">{p.kind === "member" ? "membre" : "contact"}</span>
                {canEdit && <button onClick={() => removeParticipant(p)} className="hover:text-rose-600"><X size={12} /></button>}
              </span>
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
    </div>
  );
}
