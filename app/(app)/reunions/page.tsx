"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Filter, Link2, Plus, Users2, X } from "lucide-react";
import { fmt, MEETING_STATUTS, type Meeting, type MeetingStatus } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";

export const meetingStatusBadge: Record<string, string> = {
  planifiée: "bg-sky-100 text-sky-700",
  tenue: "bg-emerald-100 text-emerald-700",
  annulée: "bg-slate-100 text-slate-500",
};

const dt = (d: Date | null) =>
  d ? d.toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Date à définir";

export default function ReunionsPage() {
  const { meetings, createMeeting, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("Tous");
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<MeetingStatus>("planifiée");
  const [agenda, setAgenda] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return meetings.filter((m) => {
      if (fStatut !== "Tous" && m.status !== fStatut) return false;
      if (q && !`${m.title} ${m.location} ${m.agenda}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [meetings, search, fStatut]);

  const create = async () => {
    if (!title.trim()) return setErr("Titre requis.");
    setErr(null);
    const e = await createMeeting({ title: title.trim(), date: date || null, location: location.trim(), status, agenda: agenda.trim() });
    if (e) return setErr(e);
    setShowNew(false);
    setTitle(""); setDate(""); setLocation(""); setStatus("planifiée"); setAgenda("");
  };

  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Coordination"
        icon={CalendarDays}
        title="Réunions"
        subtitle="Planifiez et gardez trace des réunions — reliez-les aux sujets concernés (suivis, projets, tâches, négligences, non-conformités, objectifs) et aux participants. Ces liens alimentent le graphe de relations."
        right={
          readOnly ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Lecture seule</span>
          ) : (
            <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
              <Plus size={16} /> Nouvelle réunion
            </button>
          )
        }
      />

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {showNew && !readOnly && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouvelle réunion</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[12px] text-slate-500">Titre *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objet de la réunion" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Date & heure</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Lieu / lien visio</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle, ou https://…" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {MEETING_STATUTS.map((s) => (<option key={s}>{s}</option>))}
              </select>
            </div>
          </div>
          <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={2} placeholder="Ordre du jour…" className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} /> Annuler</button>
            <button onClick={create} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700">Créer — puis relier</button>
          </div>
          <p className="text-[11px] text-slate-400">Après création, ouvrez la réunion pour ajouter les participants, relier les sujets, et saisir le compte-rendu.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-semibold text-slate-800">{meetings.length}</div><div className="text-[12px] text-slate-500">Réunions</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-sky-600">{meetings.filter((m) => m.status === "planifiée").length}</div><div className="text-[12px] text-slate-500">Planifiées</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-emerald-600">{meetings.filter((m) => m.status === "tenue").length}</div><div className="text-[12px] text-slate-500">Tenues</div></Card>
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (titre, lieu, ordre du jour)…" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} className={selectCls}>
            <option value="Tous">Tous statuts</option>
            {MEETING_STATUTS.map((s) => (<option key={s}>{s}</option>))}
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          {meetings.length === 0 ? "Aucune réunion. Créez-en une pour commencer." : "Aucune réunion ne correspond à ces filtres."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m: Meeting) => (
            <Link key={m.id} href={`/reunions/${m.id}`} className="block">
              <Card className="p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><CalendarDays size={17} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-800 truncate">{m.title}</div>
                  <div className="text-[11.5px] text-slate-500">{dt(m.date)}{m.location ? ` · ${m.location}` : ""}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1" title="Participants"><Users2 size={13} /> {m.participants.length}</span>
                  <span className="inline-flex items-center gap-1" title="Sujets reliés"><Link2 size={13} /> {m.links.length}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meetingStatusBadge[m.status] ?? ""}`}>{m.status}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
