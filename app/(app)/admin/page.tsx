"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  FolderKanban,
  KeyRound,
  ListTree,
  Settings2,
  Trash2,
  UserPlus,
  Users2,
} from "lucide-react";
import {
  TONES,
  type ActivityEntry,
  type AdminCounts,
  type AdminMember,
  type AppSettings,
  type Role,
  type Tone,
} from "@/lib/domain";
import { GRANTABLE_PAGES, NAV } from "@/lib/nav";
import { useApp } from "@/components/app-context";
import { Avatar, Card, TypeTag } from "@/components/atoms";

const ROLES: Role[] = ["agent", "directeur", "admin"];
const roleHasPage = (role: Role, pageId: string) =>
  Boolean(NAV.find((n) => n.id === pageId)?.roles.includes(role));
const roleBadge = (r: string) =>
  r === "directeur" ? "bg-emerald-100 text-emerald-700" : r === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600";

const ACTION_LABEL: Record<string, string> = {
  item_create: "Suivi créé",
  item_relance: "Relance",
  item_reponse: "Réponse reçue",
  item_bloque: "Blocage",
  item_cloture: "Clôture",
  member_create: "Membre créé",
  member_role: "Rôle modifié",
  member_active: "Statut de compte",
  member_poste: "Poste modifié",
  member_password: "Mot de passe réinitialisé",
  member_pages: "Pages accordées",
  blocage_demarche: "Démarche de déblocage",
  blocage_appreciation: "Appréciation du motif",
  catalogue_add: "Catalogue — ajout",
  catalogue_update: "Catalogue — édition",
  catalogue_delete: "Catalogue — suppression",
  settings_update: "Paramètres modifiés",
  reminders_run: "Moteur de relance exécuté",
};
const dt = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

type Section = "membres" | "catalogue" | "parametres" | "journal";

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
    { id: "parametres", label: "Paramètres", icon: Settings2 },
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
      ) : section === "parametres" ? (
        <ParametresSection settings={over.settings} onSaved={load} setErr={setErr} />
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
                  </div>
                  <div className="text-[11px] text-slate-400">{u.email}{u.poste ? ` · ${u.poste}` : ""}</div>
                </div>
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
              </div>

              {expanded === u.id && (
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

                  {/* Pages accessibles au-delà du rôle */}
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1.5">
                      Pages accessibles (le rôle « {u.role} » donne déjà accès à certaines)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {GRANTABLE_PAGES.map((p) => {
                        const byRole = roleHasPage(u.role, p.id);
                        const granted = byRole || u.extraPages.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`inline-flex items-center gap-1 text-[11px] border rounded-full px-2 py-1 cursor-pointer ${
                              granted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"
                            } ${byRole ? "opacity-70 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              disabled={byRole}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...u.extraPages, p.id]
                                  : u.extraPages.filter((x) => x !== p.id);
                                call({ action: "pages", id: u.id, pages: next });
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
        {stat("Suivis", c.items, Activity)}
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
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Journal d&apos;activité</div>
        {over.journal.length === 0 ? (
          <div className="text-[13px] text-slate-400 text-center py-4">Aucune activité.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {over.journal.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 text-[12px]">
                <span className="text-slate-400 w-28 shrink-0">{dt(a.createdAt)}</span>
                <span className="font-medium text-slate-700 w-44 shrink-0">{ACTION_LABEL[a.action] ?? a.action}</span>
                <span className="text-slate-600 flex-1 min-w-0 truncate">{a.detail}</span>
                <span className="text-slate-400 shrink-0">{a.actorNom}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
