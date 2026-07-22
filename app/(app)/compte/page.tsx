"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";

/** Redimensionne une image (File) en carré ~256 px et renvoie une data URL JPEG. */
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible."));
        // Recadrage centré (cover).
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ComptePage() {
  const { me, demo, updateAccount } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nom, setNom] = useState(me.nom);
  const [poste, setPoste] = useState(me.poste);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [savingInfos, setSavingInfos] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Mot de passe
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const shownAvatar = pendingAvatar ?? (me.avatar || "");
  const infosDirty = nom.trim() !== me.nom || poste.trim() !== me.poste;

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      setPendingAvatar(dataUrl);
    } catch {
      /* image invalide — ignorée silencieusement */
    }
  };

  const saveAvatar = async () => {
    if (pendingAvatar == null) return;
    setSavingAvatar(true);
    const ok = await updateAccount({ avatar: pendingAvatar });
    setSavingAvatar(false);
    if (ok) {
      setPendingAvatar(null);
      router.refresh();
    }
  };

  const removeAvatar = async () => {
    setSavingAvatar(true);
    const ok = await updateAccount({ avatar: "" });
    setSavingAvatar(false);
    if (ok) {
      setPendingAvatar(null);
      router.refresh();
    }
  };

  const saveInfos = async () => {
    setSavingInfos(true);
    const ok = await updateAccount({ fullName: nom, poste });
    setSavingInfos(false);
    if (ok) router.refresh();
  };

  const changePassword = async () => {
    setPwdMsg(null);
    if (next !== confirm) {
      setPwdMsg({ ok: false, text: "La confirmation ne correspond pas." });
      return;
    }
    setSavingPwd(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const d = await res.json().catch(() => ({}));
    setSavingPwd(false);
    if (!res.ok) {
      setPwdMsg({ ok: false, text: d.error ?? "Échec du changement de mot de passe." });
      return;
    }
    setPwdMsg({ ok: true, text: "Mot de passe modifié." });
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const inputCls =
    "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/40";
  const label = "text-[12px] font-medium text-slate-600 dark:text-slate-300";

  return (
    <div className="space-y-6 animate-float max-w-3xl">
      <PageHero
        kicker="Espace membre"
        icon={UserRound}
        title="Mon compte"
        subtitle="Gère ta photo de profil, tes informations et ton mot de passe."
      />

      {demo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-[12.5px] px-4 py-2.5">
          Mode démonstration : les modifications ne sont pas enregistrées.
        </div>
      )}

      {/* Photo + informations */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
        <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mb-4">Profil</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative">
              <Avatar init={me.init} src={shownAvatar || undefined} size="h-24 w-24" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid place-items-center h-8 w-8 rounded-full bg-slate-900 dark:bg-emerald-600 text-white shadow-soft hover:-translate-y-0.5 transition-transform"
                aria-label="Changer la photo"
                title="Changer la photo"
              >
                <Camera size={15} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              {pendingAvatar != null && (
                <button
                  onClick={saveAvatar}
                  disabled={savingAvatar}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                >
                  {savingAvatar && <Loader2 size={13} className="animate-spin" />} Enregistrer
                </button>
              )}
              {(me.avatar || pendingAvatar) && (
                <button
                  onClick={removeAvatar}
                  disabled={savingAvatar}
                  className="inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Retirer
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center max-w-[10rem]">
              JPG, PNG ou WebP. Recadrée automatiquement.
            </p>
          </div>

          {/* Champs */}
          <div className="flex-1 space-y-4">
            <div>
              <label className={label} htmlFor="nom">Nom affiché</label>
              <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={label} htmlFor="poste">Poste / fonction</label>
              <input id="poste" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Analyste SOC" className={`${inputCls} mt-1`} />
            </div>
            <div className="text-[12px] text-slate-500">
              Rôle : <span className="font-medium text-slate-700 dark:text-slate-200">{me.role}</span>
              <span className="text-slate-400"> · défini par l&apos;administrateur</span>
            </div>
            <button
              onClick={saveInfos}
              disabled={!infosDirty || savingInfos || nom.trim().length < 2}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-40 disabled:translate-y-0"
            >
              {savingInfos && <Loader2 size={14} className="animate-spin" />} Enregistrer les informations
            </button>
          </div>
        </div>
      </section>

      {/* Mot de passe */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-slate-400" />
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Mot de passe</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={label} htmlFor="cur">Actuel</label>
            <input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${inputCls} mt-1 font-mono`} autoComplete="current-password" />
          </div>
          <div>
            <label className={label} htmlFor="new">Nouveau</label>
            <input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={`${inputCls} mt-1 font-mono`} autoComplete="new-password" />
          </div>
          <div>
            <label className={label} htmlFor="cfm">Confirmer</label>
            <input id="cfm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputCls} mt-1 font-mono`} autoComplete="new-password" />
          </div>
        </div>
        {pwdMsg && (
          <div className={`mt-3 text-[12px] ${pwdMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>{pwdMsg.text}</div>
        )}
        <button
          onClick={changePassword}
          disabled={savingPwd || !current || !next || !confirm || demo}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-40 disabled:translate-y-0"
        >
          {savingPwd && <Loader2 size={14} className="animate-spin" />} Changer le mot de passe
        </button>
      </section>
    </div>
  );
}
