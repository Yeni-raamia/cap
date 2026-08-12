"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Filter, Gavel, Plus, Printer, Wrench, X } from "lucide-react";
import { NEGLIGENCE_GRAVITES, NEGLIGENCE_RISQUES, NEGLIGENCE_STATUTS, type NonConformite } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token } from "@/components/atoms";
import { NonConformitePrint } from "@/components/NonConformitePrint";
import { NonConformitesReport } from "@/components/NonConformitesReport";
import { CapaModal } from "@/components/CapaModal";

export const ncGraviteBadge: Record<string, string> = {
  Faible: "bg-slate-100 text-slate-600",
  Modérée: "bg-amber-100 text-amber-700",
  Grave: "bg-orange-100 text-orange-700",
  Critique: "bg-orange-600 text-white",
};
export const ncStatusBadge: Record<string, string> = {
  Ouverte: "bg-slate-100 text-slate-600",
  "Transmise au DG": "bg-amber-100 text-amber-700",
  "Décision rendue": "bg-emerald-100 text-emerald-700",
  Classée: "bg-slate-100 text-slate-500",
};

export function NonConformitesPanel() {
  const { nonConformites, items, me, refLists, capaActions, profileById, createNonConformite, setNonConformiteDecisions, refListAction, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fGravite, setFGravite] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printNc, setPrintNc] = useState<NonConformite | null>(null);
  const [reportOn, setReportOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Non-conformité pour laquelle on ouvre la fiche d'action corrective.
  const [capaFor, setCapaFor] = useState<NonConformite | null>(null);

  useEffect(() => {
    if (!printNc) return;
    const t = setTimeout(() => { window.print(); setPrintNc(null); }, 150);
    return () => clearTimeout(t);
  }, [printNc]);
  useEffect(() => {
    if (!reportOn) return;
    const t = setTimeout(() => { window.print(); setReportOn(false); }, 200);
    return () => clearTimeout(t);
  }, [reportOn]);

  const [showNew, setShowNew] = useState(false);
  const [fItem, setFItem] = useState("");
  const [objet, setObjet] = useState("");
  const [service, setService] = useState("");
  const [concerne, setConcerne] = useState("");
  const [policy, setPolicy] = useState("");
  const [newPolicy, setNewPolicy] = useState("");
  const [addingPolicy, setAddingPolicy] = useState(false);
  const [gravite, setGravite] = useState("Modérée");
  const [risque, setRisque] = useState("Moyen");
  const [impact, setImpact] = useState("");
  const [description, setDescription] = useState("");

  const isDG = me.role === "directeur" || me.role === "admin";
  const canDecide = isDG && !readOnly;
  const itemOf = (n: NonConformite) => (n.itemId ? items.find((i) => i.id === n.itemId) : null);
  const ncItemIds = new Set(nonConformites.map((n) => n.itemId).filter(Boolean));
  const attachables = items.filter((i) => !ncItemIds.has(i.id));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nonConformites.filter((n) => {
      if (fGravite !== "Tous" && n.gravite !== fGravite) return false;
      if (fStatut !== "Tous" && n.status !== fStatut) return false;
      if (q) {
        const it = n.itemId ? items.find((i) => i.id === n.itemId) : null;
        if (!`${n.objet} ${n.service} ${n.concerne} ${it?.ref ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [nonConformites, search, fGravite, fStatut, items]);

  const aTraiter = nonConformites.filter((n) => n.status !== "Décision rendue" && n.status !== "Classée").length;
  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const onPickItem = (id: string) => {
    setFItem(id);
    const it = items.find((i) => i.id === id);
    if (it) {
      setObjet(it.objet);
      const dest = it.personnes.find((p) => p.kind === "destinataire");
      setService(dest?.service ?? "");
      setConcerne(dest?.name ?? "");
    }
  };

  const create = async () => {
    setErr(null);
    if (!objet.trim() && !fItem) return setErr("Renseigne au moins l'objet de la non-conformité.");
    const e = await createNonConformite({ itemId: fItem || null, objet: objet.trim(), service, concerne: concerne.trim(), policy, gravite, risque, impact: impact.trim(), description: description.trim() });
    if (e) return setErr(e);
    setShowNew(false);
    setFItem(""); setObjet(""); setService(""); setConcerne(""); setPolicy(""); setGravite("Modérée"); setRisque("Moyen"); setImpact(""); setDescription("");
  };
  const addPolicy = async () => {
    const v = newPolicy.trim();
    if (!v) return;
    setErr(null);
    const e = await refListAction({ op: "add", listKey: "policy", label: v });
    if (e) return setErr(e);
    setPolicy(v);
    setNewPolicy("");
    setAddingPolicy(false);
  };
  const toggle = (n: NonConformite, d: string) => {
    const next = n.decisions.includes(d) ? n.decisions.filter((x) => x !== d) : [...n.decisions, d];
    setNonConformiteDecisions(n.id, next);
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions du registre */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button onClick={() => setReportOn(true)} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
          <FileText size={15} /> Rapport (toutes) PDF
        </button>
        {readOnly ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Lecture seule</span>
        ) : (
          <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-orange-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={16} /> Nouvelle non-conformité
          </button>
        )}
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {showNew && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouvelle fiche de non-conformité</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-slate-500">Suivi de mail lié (facultatif)</label>
              <select value={fItem} onChange={(e) => onPickItem(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">Aucun (non-conformité autonome)</option>
                {attachables.map((i) => (<option key={i.id} value={i.id}>{i.ref} — {i.objet.slice(0, 50)}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Objet *</label>
              <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Quel écart à la politique de sécurité" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Service concerné</label>
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">— service —</option>
                {refLists.services.map((s) => (<option key={s}>{s}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Personne / entité concernée</label>
              <input value={concerne} onChange={(e) => setConcerne(e.target.value)} placeholder="Nom" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] text-slate-500">Politique / article / contrôle violé</label>
                {!readOnly && (
                  <button type="button" onClick={() => setAddingPolicy((v) => !v)} className="text-[11px] text-orange-700 hover:underline inline-flex items-center gap-0.5">
                    <Plus size={11} /> Ajouter un article
                  </button>
                )}
              </div>
              <select value={policy} onChange={(e) => setPolicy(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">— aucune / non précisée —</option>
                {refLists.policies.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
              {addingPolicy && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    value={newPolicy}
                    onChange={(e) => setNewPolicy(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPolicy(); } }}
                    placeholder="Ex. ISO 27001 A.5.30 — Continuité TIC, ou CIS 8.2…"
                    className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2 py-1.5"
                  />
                  <button type="button" onClick={addPolicy} className="text-[12px] font-medium text-white bg-orange-600 rounded-lg px-2.5 py-1.5 hover:bg-orange-700">Ajouter</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Gravité</label>
              <select value={gravite} onChange={(e) => setGravite(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Risque pour l&apos;institution</label>
              <select value={risque} onChange={(e) => setRisque(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_RISQUES.map((r) => (<option key={r}>{r}</option>))}
              </select>
            </div>
          </div>
          <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} placeholder="Impact (conséquences concrètes)" className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description / circonstances" className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} />Annuler</button>
            <button onClick={create} className="text-[13px] font-medium text-white bg-orange-600 rounded-lg px-3 py-1.5 hover:bg-orange-700">Créer la fiche</button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-semibold text-slate-800">{nonConformites.length}</div><div className="text-[12px] text-slate-500">Fiches</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-amber-600">{aTraiter}</div><div className="text-[12px] text-slate-500">En attente de décision</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-orange-600">{nonConformites.filter((n) => n.gravite === "Critique" || n.gravite === "Grave").length}</div><div className="text-[12px] text-slate-500">Graves / critiques</div></Card>
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (objet, service, personne)…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
          <select value={fGravite} onChange={(e) => setFGravite(e.target.value)} aria-label="Gravité" className={selectCls}>
            <option value="Tous">Toutes gravités</option>
            {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
          </select>
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} aria-label="Statut" className={selectCls}>
            <option value="Tous">Tous statuts</option>
            {NEGLIGENCE_STATUTS.map((s) => (<option key={s}>{s}</option>))}
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          {nonConformites.length === 0 ? "Aucune non-conformité signalée." : "Aucune fiche ne correspond à ces filtres."}
        </Card>
      ) : (
        <Card>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span className="w-28 shrink-0">Ouvert par</span>
            <span className="flex-1">Objet</span>
            <span className="w-40 shrink-0">Service / personne</span>
            <span className="w-44 shrink-0 hidden lg:block">Politique violée</span>
            <span className="w-16 shrink-0">Gravité</span>
            <span className="w-24 shrink-0">Statut</span>
            <span className="w-20 text-right shrink-0">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const it = itemOf(n);
              const owner = it ? profileById(it.ownerId) : profileById(n.createdBy);
              return (
                <div key={n.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-28 shrink-0 flex items-center gap-2">
                      <Avatar init={owner.init} size="h-7 w-7" />
                      <span className="text-[12px] text-slate-600 truncate hidden md:block">{owner.nom}</span>
                    </div>
                    <Link href={`/non-conformites/${n.id}`} className="flex-1 min-w-0 hover:underline">
                      <div className="flex items-center gap-1.5">
                        {it && <MetierChip code={it.metier} />}
                        <span className="text-[13px] text-slate-800 truncate">{n.objet || it?.objet || "—"}</span>
                      </div>
                      {it ? <Token>{it.ref}</Token> : <span className="text-[10px] text-slate-400">fiche autonome</span>}
                    </Link>
                    <span className="w-40 shrink-0 text-[12px] text-slate-600 truncate hidden md:block">
                      {n.service || "—"}{n.concerne ? ` · ${n.concerne}` : ""}
                    </span>
                    <span className="w-44 shrink-0 hidden lg:block" title={n.policy || undefined}>
                      {n.policy ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 truncate inline-block max-w-full align-bottom">{n.policy}</span> : <span className="text-[11px] text-slate-300">—</span>}
                    </span>
                    <span className="w-16 shrink-0"><span className={`text-[10px] px-1.5 py-0.5 rounded ${ncGraviteBadge[n.gravite] ?? ""}`}>{n.gravite}</span></span>
                    <span className="w-24 shrink-0"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ncStatusBadge[n.status] ?? "bg-slate-100 text-slate-600"}`}>{n.status}</span></span>
                    <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                      {canDecide && (
                        <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} title="Décisions" className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-1 border ${n.decisions.length ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"}`}>
                          <Gavel size={13} />{n.decisions.length || ""}
                        </button>
                      )}
                      {(() => {
                        // Traçabilité ISO 27001 §10.1 : une non-conformité doit
                        // déboucher sur une action corrective, et l'on doit
                        // pouvoir remonter de l'action à l'écart d'origine.
                        const liees = capaActions.filter((a) => a.sourceType === "nonconformite" && a.sourceId === n.id);
                        return liees.length > 0 ? (
                          <span
                            title={`${liees.length} action(s) corrective(s) : ${liees.map((a) => a.ref).join(", ")}`}
                            className="inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50"
                          >
                            <Wrench size={13} />{liees.length}
                          </span>
                        ) : readOnly ? null : (
                          <button
                            onClick={() => setCapaFor(n)}
                            title="Créer l'action corrective liée à cette non-conformité"
                            className="text-slate-400 hover:text-emerald-700 border border-slate-200 rounded px-1.5 py-1"
                          >
                            <Wrench size={13} />
                          </button>
                        );
                      })()}
                      <button onClick={() => setPrintNc(n)} title="Imprimer cette fiche" className="text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-1.5 py-1"><Printer size={13} /></button>
                    </div>
                  </div>
                  {canDecide && expanded === n.id && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1"><Gavel size={12} /> Décisions retenues</div>
                      <div className="grid md:grid-cols-2 gap-1.5">
                        {refLists.decisions.map((d) => {
                          const checked = n.decisions.includes(d);
                          return (
                            <label key={d} className={`flex items-center gap-2 text-[12px] border rounded-lg px-2.5 py-1.5 cursor-pointer ${checked ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggle(n, d)} className="h-3.5 w-3.5 accent-emerald-600" />
                              {d}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {capaFor && (
        <CapaModal
          capa={null}
          creating
          origin={{
            sourceType: "nonconformite",
            sourceId: capaFor.id,
            title: `Traiter la non-conformité : ${capaFor.objet}`,
            description: [
              capaFor.policy && `Politique / contrôle : ${capaFor.policy}`,
              capaFor.impact && `Impact : ${capaFor.impact}`,
              capaFor.description,
            ]
              .filter(Boolean)
              .join("\n"),
            label: capaFor.objet,
          }}
          onClose={() => setCapaFor(null)}
        />
      )}
      {printNc && <NonConformitePrint nc={printNc} />}
      {reportOn && <NonConformitesReport ncs={filtered} />}
    </div>
  );
}
