"use client";

import { useMemo, useState } from "react";
import { BookUser, Loader2, Mail, Pencil, Phone, Plus, Save, Search, Trash2, X } from "lucide-react";
import { contactDisplayName, type Contact } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";

const EMPTY = { prenom: "", nom: "", email: "", telephone: "", service: "", fonction: "" };

export default function ContactsPage() {
  const { contacts, createContact, updateContact, deleteContact, refLists, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${contactDisplayName(c)} ${c.email} ${c.telephone} ${c.service} ${c.fonction}`.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
    setErr(null);
  };
  const openEdit = (c: Contact) => {
    setForm({ prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone, service: c.service, fonction: c.fonction });
    setEditingId(c.id);
    setShowForm(true);
    setErr(null);
  };
  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.prenom.trim() && !form.nom.trim()) {
      setErr("Renseigne au moins un prénom ou un nom.");
      return;
    }
    setSaving(true);
    const e = editingId ? await updateContact(editingId, form) : await createContact(form);
    setSaving(false);
    if (e) {
      setErr(e);
      return;
    }
    cancel();
  };

  const remove = async (c: Contact) => {
    if (!confirm(`Supprimer le contact « ${contactDisplayName(c) || c.email} » ?`)) return;
    await deleteContact(c.id);
  };

  const inputCls = "w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-400";

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Annuaire"
        icon={BookUser}
        title="Contacts"
        subtitle="Annuaire partagé et éditable par toute l'équipe. Renseigné en amont, il pré-remplit automatiquement les destinataires des suivis — et garantit la cohérence des statistiques."
        right={
          readOnly ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Lecture seule</span>
          ) : (
            <button onClick={openNew} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
              <Plus size={16} /> Nouveau contact
            </button>
          )
        }
      />

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {showForm && !readOnly && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">{editingId ? "Modifier le contact" : "Nouveau contact"}</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-slate-500">Prénom</label>
              <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Nom</label>
              <input value={form.nom} onChange={(e) => set("nom", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="prenom.nom@exemple.fr" className={inputCls} />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Téléphone</label>
              <input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Service</label>
              <input value={form.service} onChange={(e) => set("service", e.target.value)} list="cap-contact-services" className={inputCls} />
              <datalist id="cap-contact-services">
                {refLists.services.map((s) => (<option key={s} value={s} />))}
              </datalist>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Fonction</label>
              <input value={form.fonction} onChange={(e) => set("fonction", e.target.value)} placeholder="Ex. Responsable réseau" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={cancel} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} /> Annuler</button>
            <button onClick={save} disabled={saving} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 inline-flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editingId ? "Enregistrer" : "Créer le contact"}
            </button>
          </div>
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Search size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, e-mail, service, fonction)…" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1" />
          <span className="text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          {contacts.length === 0 ? "Aucun contact. Ajoute le premier pour alimenter l'autocomplétion des destinataires." : "Aucun contact ne correspond à la recherche."}
        </Card>
      ) : (
        <Card>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span className="flex-1">Nom</span>
            <span className="w-32 shrink-0">Service</span>
            <span className="w-40 shrink-0">Fonction</span>
            <span className="w-52 shrink-0">Contact</span>
            <span className="w-16 text-right shrink-0">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate">{contactDisplayName(c) || <span className="text-slate-400">(sans nom)</span>}</span>
                <span className="w-32 shrink-0 text-[12px] text-slate-600 truncate hidden md:block">{c.service || "—"}</span>
                <span className="w-40 shrink-0 text-[12px] text-slate-500 truncate hidden md:block">{c.fonction || "—"}</span>
                <span className="w-52 shrink-0 text-[12px] text-slate-500 truncate hidden md:block">
                  {c.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {c.email}</span>}
                  {c.email && c.telephone ? " · " : ""}
                  {c.telephone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {c.telephone}</span>}
                  {!c.email && !c.telephone && "—"}
                </span>
                <div className="w-16 shrink-0 flex items-center justify-end gap-1">
                  {!readOnly && (
                    <>
                      <button onClick={() => openEdit(c)} aria-label="Modifier" title="Modifier" className="text-slate-400 hover:text-emerald-600"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} aria-label="Supprimer" title="Supprimer" className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
