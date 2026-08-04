"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  DatabaseBackup,
  FolderKanban,
  KeyRound,
  FileText,
  ListChecks,
  ListTree,
  Pencil,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
  UserPlus,
  Users2,
  X,
} from "lucide-react";
import {
  ACTION_ICONS,
  DEFAULT_SECURITY,
  TONES,
  type ActivityEntry,
  type AdminCounts,
  type AdminMember,
  type AppSettings,
  type Role,
  type SecuritySettings,
  type Tone,
} from "@/lib/domain";
import { ALL_PAGES, roleHasPage } from "@/lib/nav";
import { useApp } from "@/components/app-context";
import { Avatar, Card, TypeTag } from "@/components/atoms";
import { AuditJournal } from "@/components/AuditJournal";
import { TemplatesAdmin } from "@/components/TemplatesAdmin";
import { BackupSection } from "@/components/BackupSection";

const ROLES: Role[] = ["agent", "manager", "directeur", "admin", "dsi"];
const roleBadge = (r: string) =>
  r === "directeur" ? "bg-emerald-100 text-emerald-700" : r === "admin" ? "bg-violet-100 text-violet-700" : r === "dsi" ? "bg-sky-100 text-sky-700" : r === "manager" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600";

const dt = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

type Section = "membres" | "catalogue" | "listes" | "destinataires" | "modeles" | "parametres" | "securite" | "sauvegarde" | "journal";

interface Overview {
  members: AdminMember[];
  journal: ActivityEntry[];
  counts: AdminCounts;
  settings: AppSettings;
  lastReminder: ActivityEntry | null;
}

export default function AdminPage() {
  const { demo, me, orgName } = useApp();
  const canManage = !demo && me.role === "admin";
  const [section, setSection] = useState<Section>("membres");
  const [over, setOver] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/overview");
    if (r.ok) setOver(await r.json());
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Administration</h1>
        <Card className="p-8 text-center text-[13px] text-slate-400">
          {demo
            ? "L'administration complète est disponible en mode réel (base locale), pas en mode démo."
            : "Réservé aux administrateurs."}
        </Card>
      </div>
    );
  }

  const TABS: { id: Section; label: string; icon: typeof Users2 }[] = [
    { id: "membres", label: "Membres", icon: Users2 },
    { id: "catalogue", label: "Catalogue", icon: ListTree },
    { id: "listes", label: "Listes", icon: ListChecks },
    { id: "destinataires", label: "Destinataires", icon: UserCog },
    { id: "modeles", label: "Modèles", icon: FileText },
    { id: "parametres", label: "Paramètres", icon: Settings2 },
    { id: "securite", label: "Sécurité", icon: ShieldCheck },
    { id: "sauvegarde", label: "Sauvegarde", icon: DatabaseBackup },
    { id: "journal", label: "Journal & stats", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Administration</h1>
        <p className="text-[13px] text-slate-500">{orgName} · gestion complète de l&apos;application.</p>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              section === t.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {!over ? (
        <Card className="p-8 text-center text-[13px] text-slate-400">Chargement…</Card>
      ) : section === "membres" ? (
        <MembresSection over={over} setOver={setOver} setErr={setErr} meId={me.id} />
      ) : section === "catalogue" ? (
        <CatalogueSection onChanged={load} setErr={setErr} />
      ) : section === "listes" ? (
        <ListesSection onChanged={load} setErr={setErr} />
      ) : section === "destinataires" ? (
        <DestinatairesSection />
      ) : section === "modeles" ? (
        <TemplatesAdmin />
      ) : section === "parametres" ? (
        <ParametresSection settings={over.settings} onSaved={load} setErr={setErr} />
      ) : section === "securite" ? (
        <SecuriteSection setErr={setErr} />
      ) : section === "sauvegarde" ? (
        <BackupSection />
      ) : (
        <JournalSection over={over} />
      )}
    </div>
  );
}

/* ================= Membres ================= */
function MembresSection({
  over,
  setOver,
  setErr,
  meId,
}: {
  over: Overview;
  setOver: (o: Overview) => void;
  setErr: (e: string | null) => void;
  meId: string;
}) {
  const [nEmail, setNEmail] = useState("");
  const [nName, setNName] = useState("");
  const [nRole, setNRole] = useState<Role>("agent");
  const [nPwd, setNPwd] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [posteVal, setPosteVal] = useState("");
  const [pwdVal, setPwdVal] = useState("");

  const call = async (payload: Record<string, unknown>) => {
    setErr(null);
    const r = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error ?? "Erreur.");
      return false;
    }
    setOver({ ...over, members: d.members, journal: d.journal, counts: d.counts });
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Créer un compte */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <UserPlus size={15} /> Créer un compte
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Nom complet" className="text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <input value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="E-mail" type="email" className="text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <input value={nPwd} onChange={(e) => setNPwd(e.target.value)} placeholder="Mot de passe provisoire (≥ 6)" className="text-[13px] border border-slate-200 rounded-lg px-2 py-2 font-mono" />
          <div className="flex gap-2">
            <select value={nRole} onChange={(e) => setNRole(e.target.value as Role)} className="text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white flex-1">
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (await call({ action: "create", email: nEmail, fullName: nName, role: nRole, password: nPwd })) {
                  setNEmail("");
                  setNName("");
                  setNPwd("");
                  setNRole("agent");
                }
              }}
              disabled={!nName.trim() || !nEmail.trim() || nPwd.length < 6}
              className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 disabled:opacity-40"
            >
              Créer
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Communique le mot de passe provisoire au membre — il pourra se connecter et tu pourras le
          réinitialiser à tout moment.
        </p>
      </Card>

      {/* Liste des membres */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Membres ({over.members.length})</div>
        <div className="divide-y divide-slate-100">
          {over.members.map((u) => (
            <div key={u.id} className="py-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar init={u.init} size="h-7 w-7" />
                <div className="min-w-0">
                  <div className="text-[13px] text-slate-800">
                    {u.nom}
                    {u.id === meId && <span className="text-[11px] text-emerald-600 ml-1">· toi</span>}
                    {!u.active && <span className="text-[11px] text-rose-600 ml-1">· désactivé</span>}
                    {!u.approved && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5 ml-1.5">En attente</span>}
                    {u.totpEnabled && (
                      <span title="Double authentification active" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5 ml-1.5">
                        <ShieldCheck size={11} /> 2FA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">{u.email}{u.poste ? ` · ${u.poste}` : ""}</div>
                </div>
                {!u.approved ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => call({ action: "approve", id: u.id, approve: true })}
                      className="text-[12px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => { if (confirm(`Refuser et supprimer la demande de ${u.nom} ?`)) call({ action: "approve", id: u.id, approve: false }); }}
                      className="text-[12px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-3 py-1.5"
                    >
                      Refuser
                    </button>
                  </div>
                ) : (
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={u.role}
                    disabled={u.id === meId}
                    onChange={(e) => call({ action: "role", id: u.id, role: e.target.value as Role })}
                    aria-label={`Rôle de ${u.nom}`}
                    className={`text-[11px] border border-slate-200 rounded px-1.5 py-1 ${roleBadge(u.role)}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => call({ action: "active", id: u.id, active: !u.active })}
                    className={`text-[11px] rounded px-2 py-1 border ${u.active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                  >
                    {u.active ? "Désactiver" : "Réactiver"}
                  </button>
                  <button
                    onClick={() => {
                      setExpanded(expanded === u.id ? null : u.id);
                      setPosteVal(u.poste);
                      setPwdVal("");
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-2 py-1"
                  >
                    Gérer
                  </button>
                </div>
                )}
              </div>

              {expanded === u.id && u.approved && (
                <div className="mt-2 pl-10 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <input value={posteVal} onChange={(e) => setPosteVal(e.target.value)} placeholder="Poste" className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
                      <button onClick={() => call({ action: "poste", id: u.id, poste: posteVal })} className="text-[12px] text-white bg-slate-800 rounded-lg px-2.5 py-1.5">
                        Poste
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1 border border-slate-200 rounded-lg px-2">
                        <KeyRound size={13} className="text-slate-400" />
                        <input value={pwdVal} onChange={(e) => setPwdVal(e.target.value)} placeholder="Nouveau mot de passe (≥ 6)" className="flex-1 text-[12px] py-1.5 outline-none font-mono" />
                      </div>
                      <button
                        onClick={async () => {
                          if (await call({ action: "password", id: u.id, password: pwdVal })) setPwdVal("");
                        }}
                        disabled={pwdVal.length < 6}
                        className="text-[12px] text-white bg-slate-800 rounded-lg px-2.5 py-1.5 disabled:opacity-40"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Rotation du mot de passe */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-[12px] font-medium text-slate-700">Mot de passe</div>
                      <div className="text-[11px] text-slate-400">
                        {u.mustChangePassword
                          ? "Renouvellement demandé à la prochaine connexion."
                          : u.passwordAgeDays != null
                          ? `Défini il y a ${u.passwordAgeDays} jour(s).`
                          : "Ancienneté inconnue."}
                      </div>
                    </div>
                    <button
                      onClick={() => call({ action: "force_password", id: u.id })}
                      disabled={u.mustChangePassword}
                      className="inline-flex items-center gap-1 text-[12px] text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                    >
                      <RotateCcw size={13} /> {u.mustChangePassword ? "Renouvellement demandé" : "Forcer le renouvellement"}
                    </button>
                  </div>

                  {/* Double authentification (2FA) */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-[12px] font-medium text-slate-700">Double authentification</div>
                      <div className="text-[11px] text-slate-400">
                        {u.totpEnabled
                          ? "Active. À réinitialiser si le membre a perdu son téléphone et ses codes de secours."
                          : "Non activée pour ce compte."}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm(`Réinitialiser la double authentification de ${u.nom} ? Le compte se connectera ensuite avec le seul mot de passe, jusqu'à réactivation.`)) call({ action: "reset_2fa", id: u.id }); }}
                      disabled={!u.totpEnabled}
                      className="inline-flex items-center gap-1 text-[12px] text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ShieldOff size={13} /> Réinitialiser
                    </button>
                  </div>

                  {/* Privilège lecture / écriture */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-[12px] font-medium text-slate-700">Privilège</div>
                      <div className="text-[11px] text-slate-400">
                        {u.role === "dsi"
                          ? "Le rôle DSI est en lecture seule (non modifiable)."
                          : u.readonly
                          ? "Lecture seule : ce compte ne peut rien modifier."
                          : "Écriture : ce compte peut créer et modifier."}
                      </div>
                    </div>
                    <button
                      onClick={() => call({ action: "readonly", id: u.id, readonly: !u.readonly })}
                      disabled={u.role === "dsi"}
                      className={`text-[12px] rounded-lg px-3 py-1.5 border font-medium ${
                        u.role === "dsi" || u.readonly
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {u.role === "dsi" || u.readonly ? "Lecture seule" : "Écriture"}
                    </button>
                  </div>

                  {/* Vues accessibles — toutes cochables/décochables */}
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1.5">
                      Vues accessibles (cochez/décochez librement ; « rôle » = accordé par défaut par le rôle)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PAGES.map((p) => {
                        const byRole = roleHasPage(u.role, p.id);
                        // Accès effectif = (rôle ou accordé) et non retiré.
                        const granted = (byRole || u.extraPages.includes(p.id)) && !u.deniedPages.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`inline-flex items-center gap-1 text-[11px] border rounded-full px-2 py-1 cursor-pointer ${
                              granted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={(e) => {
                                // Ensemble EXACT des vues voulues après cette bascule.
                                const current = ALL_PAGES.filter(
                                  (q) => (roleHasPage(u.role, q.id) || u.extraPages.includes(q.id)) && !u.deniedPages.includes(q.id)
                                ).map((q) => q.id);
                                const wanted = e.target.checked
                                  ? [...new Set([...current, p.id])]
                                  : current.filter((x) => x !== p.id);
                                call({ action: "pages", id: u.id, pages: wanted });
                              }}
                              className="h-3 w-3 accent-emerald-600"
                            />
                            {p.label}
                            {byRole && " · rôle"}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zone de danger — suppression définitive du compte */}
                  {u.id !== meId && (
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                      <div>
                        <div className="text-[12px] font-medium text-rose-700">Supprimer le compte</div>
                        <div className="text-[11px] text-rose-400">
                          Le compte et ses sessions sont supprimés. Les données créées sont conservées (auteur « Compte supprimé »).
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer définitivement le compte de ${u.nom} ? Cette action est irréversible.`)) {
                            call({ action: "delete", id: u.id });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[12px] text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-2.5 py-1.5"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= Catalogue ================= */
function CatalogueSection({ onChanged, setErr }: { onChanged: () => void; setErr: (e: string | null) => void }) {
  const { catalogue, catalogueAction } = useApp();
  const run = async (p: Parameters<typeof catalogueAction>[0]) => {
    setErr(null);
    const e = await catalogueAction(p);
    if (e) setErr(e);
    else onChanged();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Métiers */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Métiers ({Object.keys(catalogue.metiers).length})</div>
        <div className="space-y-1.5">
          {Object.entries(catalogue.metiers).map(([code, m]) => (
            <MetierRow key={code} code={code} label={m.label} tone={m.tone} onSave={(label, tone) => run({ op: "update", kind: "metier", code, label, tone })} onDelete={() => run({ op: "delete", kind: "metier", code })} />
          ))}
        </div>
        <AddMetierForm onAdd={(code, label, tone) => run({ op: "add", kind: "metier", code, label, tone })} />
      </Card>

      {/* Types */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Types ({Object.keys(catalogue.types).length})</div>
        <div className="space-y-1.5">
          {Object.entries(catalogue.types).map(([code, t]) => (
            <TypeRow
              key={code}
              code={code}
              rel={t.sla?.relance ?? null}
              esc={t.sla?.escalade ?? null}
              urgent={t.urgent}
              onSave={(label, r, e, urg) => run({ op: "update", kind: "type", code, label, slaRelance: r, slaEscalade: e, urgent: urg })}
              onDelete={() => run({ op: "delete", kind: "type", code })}
            />
          ))}
        </div>
        <AddTypeForm onAdd={(code, label, r, e, urg) => run({ op: "add", kind: "type", code, label, slaRelance: r, slaEscalade: e, urgent: urg })} />
      </Card>
    </div>
  );
}

function MetierRow({ code, label, tone, onSave, onDelete }: { code: string; label: string; tone: Tone; onSave: (label: string, tone: Tone) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [l, setL] = useState(label);
  const [t, setT] = useState<Tone>(tone);
  if (edit)
    return (
      <div className="flex items-center gap-1.5 text-[12px]">
        <span className="font-mono w-14">{code}</span>
        <input value={l} onChange={(e) => setL(e.target.value)} className="flex-1 border border-slate-200 rounded px-1.5 py-1" />
        <select value={t} onChange={(e) => setT(e.target.value as Tone)} className="border border-slate-200 rounded px-1 py-1">
          {TONES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button onClick={() => { onSave(l.trim() || label, t); setEdit(false); }} className="text-white bg-emerald-600 rounded px-2 py-1">OK</button>
        <button onClick={() => setEdit(false)} className="text-slate-500 px-1">×</button>
      </div>
    );
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="font-mono w-14">{code}</span>
      <span className="flex-1 text-slate-700 truncate">{label}</span>
      <span className="text-[10px] text-slate-400">{tone}</span>
      <button onClick={() => { setL(label); setT(tone); setEdit(true); }} className="text-slate-500 hover:text-slate-700">Éditer</button>
      <button onClick={onDelete} aria-label="Supprimer" className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
    </div>
  );
}

function TypeRow({ code, rel, esc, urgent, onSave, onDelete }: { code: string; rel: number | null; esc: number | null; urgent: boolean; onSave: (label: string, rel: string, esc: string, urgent: boolean) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [l, setL] = useState(code);
  const [r, setR] = useState(rel?.toString() ?? "");
  const [e, setE] = useState(esc?.toString() ?? "");
  const [u, setU] = useState(urgent);
  if (edit)
    return (
      <div className="flex items-center gap-1.5 text-[12px] flex-wrap">
        <span className="w-16"><TypeTag t={code} /></span>
        <input value={l} onChange={(ev) => setL(ev.target.value)} placeholder="Libellé" className="border border-slate-200 rounded px-1.5 py-1 w-28" />
        <input value={r} onChange={(ev) => setR(ev.target.value.replace(/[^0-9]/g, ""))} placeholder="Rel" className="border border-slate-200 rounded px-1 py-1 w-12" />
        <input value={e} onChange={(ev) => setE(ev.target.value.replace(/[^0-9]/g, ""))} placeholder="Esc" className="border border-slate-200 rounded px-1 py-1 w-12" />
        <label className="flex items-center gap-1"><input type="checkbox" checked={u} onChange={(ev) => setU(ev.target.checked)} className="accent-rose-600" />urg</label>
        <button onClick={() => { onSave(l.trim() || code, r, e, u); setEdit(false); }} className="text-white bg-emerald-600 rounded px-2 py-1">OK</button>
        <button onClick={() => setEdit(false)} className="text-slate-500 px-1">×</button>
      </div>
    );
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-16"><TypeTag t={code} /></span>
      <span className="flex-1 text-slate-500">
        {rel != null ? `Rel J+${rel} · Esc J+${esc}` : "sans relance"}
      </span>
      <button onClick={() => { setL(code); setR(rel?.toString() ?? ""); setE(esc?.toString() ?? ""); setU(urgent); setEdit(true); }} className="text-slate-500 hover:text-slate-700">Éditer</button>
      <button onClick={onDelete} aria-label="Supprimer" className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
    </div>
  );
}

function AddMetierForm({ onAdd }: { onAdd: (code: string, label: string, tone: Tone) => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<Tone>("slate");
  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[12px] flex-wrap">
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6))} placeholder="CODE" className="font-mono w-16 border border-slate-200 rounded px-1.5 py-1" />
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé" className="flex-1 border border-slate-200 rounded px-1.5 py-1" />
      <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="border border-slate-200 rounded px-1 py-1">
        {TONES.map((x) => (<option key={x}>{x}</option>))}
      </select>
      <button onClick={() => { if (code && label.trim()) { onAdd(code, label.trim(), tone); setCode(""); setLabel(""); setTone("slate"); } }} disabled={!code || !label.trim()} className="text-white bg-emerald-600 rounded px-2 py-1 disabled:opacity-40">Ajouter</button>
    </div>
  );
}

function AddTypeForm({ onAdd }: { onAdd: (code: string, label: string, rel: string, esc: string, urgent: boolean) => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [r, setR] = useState("");
  const [e, setE] = useState("");
  const [u, setU] = useState(false);
  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[12px] flex-wrap">
      <input value={code} onChange={(ev) => setCode(ev.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12))} placeholder="CODE" className="font-mono w-20 border border-slate-200 rounded px-1.5 py-1" />
      <input value={label} onChange={(ev) => setLabel(ev.target.value)} placeholder="Libellé" className="flex-1 border border-slate-200 rounded px-1.5 py-1" />
      <input value={r} onChange={(ev) => setR(ev.target.value.replace(/[^0-9]/g, ""))} placeholder="Rel" className="w-12 border border-slate-200 rounded px-1 py-1" />
      <input value={e} onChange={(ev) => setE(ev.target.value.replace(/[^0-9]/g, ""))} placeholder="Esc" className="w-12 border border-slate-200 rounded px-1 py-1" />
      <label className="flex items-center gap-1"><input type="checkbox" checked={u} onChange={(ev) => setU(ev.target.checked)} className="accent-rose-600" />urg</label>
      <button onClick={() => { if (code && label.trim()) { onAdd(code, label.trim(), r, e, u); setCode(""); setLabel(""); setR(""); setE(""); setU(false); } }} disabled={!code || !label.trim()} className="text-white bg-emerald-600 rounded px-2 py-1 disabled:opacity-40">Ajouter</button>
    </div>
  );
}

/* ================= Listes de référence ================= */
function ListesSection({ onChanged, setErr }: { onChanged: () => void; setErr: (e: string | null) => void }) {
  const { refLists, refListAction } = useApp();
  const run = async (p: Parameters<typeof refListAction>[0]) => {
    setErr(null);
    const e = await refListAction(p);
    if (e) setErr(e);
    else onChanged();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <SimpleListCard
        title="Appréciations du motif"
        values={refLists.appreciations}
        onAdd={(v) => run({ op: "add", listKey: "appreciation", label: v })}
        onDelete={(v) => run({ op: "delete", listKey: "appreciation", value: v })}
      />
      <SimpleListCard
        title="Causes de blocage"
        values={refLists.causes}
        onAdd={(v) => run({ op: "add", listKey: "cause", label: v })}
        onDelete={(v) => run({ op: "delete", listKey: "cause", value: v })}
      />
      <ActionsListCard
        actions={refLists.actions}
        onAdd={(label, icon) => run({ op: "add", listKey: "action", label, icon })}
        onDelete={(kind) => run({ op: "delete", listKey: "action", value: kind })}
      />
      <SimpleListCard
        title="Décisions du DG (négligences)"
        values={refLists.decisions}
        onAdd={(v) => run({ op: "add", listKey: "decision", label: v })}
        onDelete={(v) => run({ op: "delete", listKey: "decision", value: v })}
      />
      <SimpleListCard
        title="Services (destinataires)"
        values={refLists.services}
        onAdd={(v) => run({ op: "add", listKey: "service", label: v })}
        onDelete={(v) => run({ op: "delete", listKey: "service", value: v })}
      />
      <SimpleListCard
        title="Politiques / articles (non-conformités)"
        values={refLists.policies}
        onAdd={(v) => run({ op: "add", listKey: "policy", label: v })}
        onDelete={(v) => run({ op: "delete", listKey: "policy", value: v })}
      />
    </div>
  );
}

/* ================= Destinataires (correction / fusion) ================= */
function DestinatairesSection() {
  const { items, correctDestinataire } = useApp();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const names = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items)
      for (const p of it.personnes) {
        if (p.kind === "destinataire" && p.name?.trim()) m.set(p.name, (m.get(p.name) ?? 0) + 1);
      }
    return [...m.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "fr"));
  }, [items]);
  const allNames = names.map((x) => x.name);
  const q = search.trim().toLowerCase();
  const filtered = q ? names.filter((x) => x.name.toLowerCase().includes(q)) : names;

  const doRename = async () => {
    if (!from || !to.trim()) return;
    setBusy(true);
    setErr(null);
    const e = await correctDestinataire(from, to.trim());
    setBusy(false);
    if (e) setErr(e);
    else {
      setFrom(null);
      setTo("");
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-1">Correction des destinataires</div>
        <p className="text-[12px] text-slate-500 mb-3">
          Un même destinataire saisi avec des orthographes différentes apparaît comme plusieurs personnes et fausse les
          statistiques. Corrigez ici pour <b>fusionner</b> une variante vers le bon libellé, sur <b>tous les suivis</b> à la
          fois. La page Statistiques reste en lecture seule ; la correction ne se fait qu&apos;ici.
        </p>
        {err && <div className="text-[12px] text-rose-600 mb-2">{err}</div>}
        <div className="flex items-center gap-2 mb-3">
          <Search size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un destinataire…"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1"
          />
          <span className="text-[12px] text-slate-400">{filtered.length}</span>
        </div>
        <datalist id="cap-admin-dest">
          {allNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {names.length === 0 ? (
          <div className="text-[12px] text-slate-400">Aucun destinataire renseigné pour l&apos;instant.</div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {filtered.map((d) => (
              <div key={d.name} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                {from === d.name ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      list="cap-admin-dest"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") doRename();
                        if (e.key === "Escape") setFrom(null);
                      }}
                      placeholder="Bon libellé (ex. un nom déjà existant)…"
                      className="flex-1 text-[12px] border border-slate-200 rounded px-2 py-1"
                    />
                    <button onClick={doRename} disabled={busy} title="Corriger partout" className="text-emerald-600 hover:text-emerald-700">
                      <Check size={15} />
                    </button>
                    <button onClick={() => { setFrom(null); setTo(""); }} title="Annuler" className="text-slate-400 hover:text-slate-600">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-slate-700 truncate">{d.name}</span>
                    <span className="text-slate-400 tabular-nums">{d.n} suivi(s)</span>
                    <button
                      onClick={() => { setFrom(d.name); setTo(d.name); }}
                      title="Corriger / fusionner ce nom"
                      className="text-slate-300 hover:text-emerald-600"
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SimpleListCard({ title, values, onAdd, onDelete }: { title: string; values: string[]; onAdd: (v: string) => void; onDelete: (v: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <Card className="p-4">
      <div className="text-[13px] font-semibold text-slate-700 mb-3">{title} ({values.length})</div>
      <div className="space-y-1.5">
        {values.map((v) => (
          <div key={v} className="flex items-center gap-2 text-[12px]">
            <span className="flex-1 text-slate-700">{v}</span>
            <button onClick={() => onDelete(v)} aria-label="Supprimer" className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
          </div>
        ))}
        {values.length === 0 && <div className="text-[12px] text-slate-400">Liste vide.</div>}
      </div>
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Nouvelle valeur…" className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }} disabled={!val.trim()} className="text-[12px] text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40">Ajouter</button>
      </div>
    </Card>
  );
}

function ActionsListCard({ actions, onAdd, onDelete }: { actions: { kind: string; label: string; icon: string }[]; onAdd: (label: string, icon: string) => void; onDelete: (kind: string) => void }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Flag");
  return (
    <Card className="p-4">
      <div className="text-[13px] font-semibold text-slate-700 mb-3">Actions de déblocage ({actions.length})</div>
      <div className="space-y-1.5">
        {actions.map((a) => (
          <div key={a.kind} className="flex items-center gap-2 text-[12px]">
            <span className="text-[10px] text-slate-400 w-16 truncate">{a.icon}</span>
            <span className="flex-1 text-slate-700 truncate">{a.label}</span>
            <button onClick={() => onDelete(a.kind)} aria-label="Supprimer" className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
          </div>
        ))}
        {actions.length === 0 && <div className="text-[12px] text-slate-400">Liste vide.</div>}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé de l'action…" className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
        <div className="flex items-center gap-1.5">
          <select value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="Icône" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white flex-1">
            {ACTION_ICONS.map((i) => (<option key={i}>{i}</option>))}
          </select>
          <button onClick={() => { if (label.trim()) { onAdd(label.trim(), icon); setLabel(""); setIcon("Flag"); } }} disabled={!label.trim()} className="text-[12px] text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40">Ajouter</button>
        </div>
      </div>
    </Card>
  );
}

/* ================= Paramètres ================= */
function ParametresSection({ settings, onSaved, setErr }: { settings: AppSettings; onSaved: () => void; setErr: (e: string | null) => void }) {
  const { applySettings } = useApp();
  const [org, setOrg] = useState(settings.orgName);
  const [email, setEmail] = useState(settings.emailEnabled);
  const [hour, setHour] = useState(settings.digestHour);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setMsg(null);
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName: org, emailEnabled: email, digestHour: hour }),
    });
    const d = await r.json();
    if (!r.ok) return setErr(d.error ?? "Erreur.");
    applySettings(d.settings);
    setMsg("Paramètres enregistrés.");
    onSaved();
  };

  return (
    <Card className="p-4 space-y-4 max-w-xl">
      <div>
        <label className="text-[12px] font-medium text-slate-600">Nom de l&apos;organisation / équipe</label>
        <input value={org} onChange={(e) => setOrg(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
        <p className="text-[11px] text-slate-400 mt-1">Affiché dans l&apos;app et sur les rapports PDF.</p>
      </div>

      <div>
        <label className="flex items-center gap-3 text-[13px] text-slate-700 cursor-pointer">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Activer les rappels par e-mail
        </label>
        <p className="text-[11px] text-slate-400 mt-1">
          Effectif uniquement si une clé <span className="font-mono">RESEND_API_KEY</span> est aussi
          configurée côté serveur. Sinon, les rappels restent in-app.
        </p>
      </div>

      <div>
        <label className="text-[12px] font-medium text-slate-600">Heure du digest du matin</label>
        <input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 block text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
        <p className="text-[11px] text-slate-400 mt-1">
          Indicatif : la planification réelle se fait par la tâche <span className="font-mono">npm run reminders</span> (voir la doc d&apos;hébergement).
        </p>
      </div>

      {msg && <div className="text-[12px] text-emerald-700">{msg}</div>}
      <button onClick={save} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700">
        Enregistrer les paramètres
      </button>
    </Card>
  );
}

/* ================= Sécurité ================= */
function SecuriteSection({ setErr }: { setErr: (e: string | null) => void }) {
  const [sec, setSec] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/security", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.security) setSec(d.security); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setErr(null);
    setSaved(false);
    const r = await fetch("/api/admin/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sec),
    });
    const d = await r.json();
    if (!r.ok) return setErr(d.error ?? "Erreur.");
    if (d.security) setSec(d.security);
    setSaved(true);
  };

  const num = (k: keyof SecuritySettings, label: string, hint: string, min: number, max: number) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
      <div>
        <div className="text-[13px] text-slate-700">{label}</div>
        <div className="text-[11px] text-slate-400">{hint}</div>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={sec[k] as number}
        onChange={(e) => setSec({ ...sec, [k]: Number(e.target.value) })}
        className="w-24 text-[13px] border border-slate-200 rounded-lg px-2 py-1.5 text-right"
      />
    </div>
  );
  const toggle = (k: "approvalRequired" | "hstsEnabled" | "twofaRequired", label: string, hint: string) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
      <div>
        <div className="text-[13px] text-slate-700">{label}</div>
        <div className="text-[11px] text-slate-400">{hint}</div>
      </div>
      <button
        onClick={() => setSec({ ...sec, [k]: !sec[k] })}
        className={`text-[12px] rounded-lg px-3 py-1.5 border font-medium ${sec[k] ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
      >
        {sec[k] ? "Activé" : "Désactivé"}
      </button>
    </div>
  );

  if (!loaded) return <Card className="p-8 text-center text-[13px] text-slate-400">Chargement…</Card>;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={16} className="text-emerald-600" />
        <div className="text-[13px] font-semibold text-slate-700">Paramètres de sécurité</div>
      </div>
      <div className="space-y-0.5">
        {toggle("approvalRequired", "Approbation des inscriptions", "Toute nouvelle inscription doit être validée par un administrateur.")}
        {num("passwordMinLength", "Longueur minimale du mot de passe", "Nombre de caractères requis à l'inscription et au renouvellement.", 6, 64)}
        {num("passwordMaxAgeDays", "Rotation du mot de passe (jours)", "Renouvellement imposé au-delà de cet âge. 0 = désactivé.", 0, 3650)}
        {num("loginMaxAttempts", "Tentatives de connexion", "Échecs autorisés avant blocage temporaire (par compte).", 1, 50)}
        {num("loginWindowMin", "Fenêtre de blocage (minutes)", "Durée du blocage après trop de tentatives.", 1, 240)}
        {num("sessionDays", "Durée de session (jours)", "Expiration glissante ; un compte inactif est déconnecté au-delà.", 1, 365)}
        {toggle("twofaRequired", "Double authentification obligatoire", "Chaque membre devra activer la 2FA (TOTP) pour accéder à l'application.")}
        {toggle("hstsEnabled", "HSTS (HTTPS strict)", "À n'activer qu'en HTTPS. Prise en compte au redémarrage du serveur.")}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700">
          Enregistrer
        </button>
        {saved && <span className="text-[12px] text-emerald-600">Enregistré ✓</span>}
      </div>
    </Card>
  );
}

/* ================= Journal & stats ================= */
function JournalSection({ over }: { over: Overview }) {
  const c = over.counts;
  const stat = (label: string, value: number | string, icon: typeof Users2) => {
    const Icon = icon;
    return (
      <Card className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center"><Icon size={17} /></div>
        <div>
          <div className="text-xl font-semibold text-slate-800 leading-none">{value}</div>
          <div className="text-[12px] text-slate-500 mt-1">{label}</div>
        </div>
      </Card>
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat("Comptes actifs", `${c.activeMembers}/${c.members}`, Users2)}
        {stat("Suivis de mail", c.items, Activity)}
        {stat("Projets", c.projects, FolderKanban)}
        {stat("Notifications", c.notifications, Activity)}
      </div>

      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-1">État du moteur de relance</div>
        <div className="text-[12px] text-slate-600">
          {over.lastReminder
            ? `Dernière exécution le ${dt(over.lastReminder.createdAt)} — ${over.lastReminder.detail}`
            : "Jamais exécuté. Lance-le avec « npm run reminders » (à planifier chaque matin)."}
        </div>
      </Card>

      <Card className="p-4">
        <AuditJournal members={over.members} />
      </Card>
    </div>
  );
}
