"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";

/**
 * Section « Double authentification (2FA / TOTP) » de l'espace membre.
 * Sans dépendance : la clé est saisie manuellement dans l'application
 * d'authentification (aucun QR n'est généré côté serveur).
 */
export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [forced, setForced] = useState(false);

  // Politique « 2FA obligatoire » : verrouille la désactivation.
  useEffect(() => {
    fetch("/api/account/2fa")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setForced(Boolean(d.forced)))
      .catch(() => {});
  }, []);
  const [phase, setPhase] = useState<"idle" | "setup" | "disabling">("idle");
  const [setupData, setSetupData] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputCls =
    "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/40";

  const startSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/2fa/setup", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSetupData({ secret: d.secret, qr: d.qr });
      setPhase("setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la configuration.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setBackupCodes(d.backupCodes);
      setPhase("idle");
      setSetupData(null);
      setCode("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPhase("idle");
      setPassword("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la désactivation.");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});
  // Clé groupée par 4 pour une saisie manuelle plus lisible.
  const groupedSecret = setupData ? setupData.secret.replace(/(.{4})/g, "$1 ").trim() : "";

  return (
    <section className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
      <div className="flex items-center gap-2 mb-1">
        {enabled ? (
          <ShieldCheck size={16} className="text-emerald-500" />
        ) : (
          <ShieldQuestion size={16} className="text-slate-400" />
        )}
        <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Double authentification</h2>
        {enabled && (
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-full px-2 py-0.5">
            Active
          </span>
        )}
      </div>
      <p className="text-[12px] text-slate-500 mb-4">
        Ajoute un code à usage unique (application d&apos;authentification) à la connexion, en plus
        du mot de passe.
      </p>

      {/* Codes de secours affichés une seule fois après activation */}
      {backupCodes && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
              Codes de secours — notez-les, ils ne seront plus affichés
            </span>
            <button
              onClick={() => copy(backupCodes.join("\n"))}
              className="inline-flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300 hover:underline"
            >
              <Copy size={12} /> Copier
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[13px] text-slate-800 dark:text-slate-100">
            {backupCodes.map((c) => (
              <span key={c} className="bg-white dark:bg-slate-900 rounded px-2 py-1 text-center border border-amber-200/70 dark:border-amber-500/20">
                {c}
              </span>
            ))}
          </div>
          <button onClick={() => setBackupCodes(null)} className="mt-3 text-[12px] text-amber-800 dark:text-amber-300 hover:underline">
            J&apos;ai noté mes codes
          </button>
        </div>
      )}

      {error && <div className="mb-3 text-[12px] text-rose-500">{error}</div>}

      {/* --- Compte SANS 2FA --- */}
      {!enabled && phase !== "setup" && (
        <button
          onClick={startSetup}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Activer la double
          authentification
        </button>
      )}

      {/* --- Étape de configuration --- */}
      {!enabled && phase === "setup" && setupData && (
        <div className="space-y-3">
          <div>
            <div className="text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-2">
              1. Scannez ce QR code avec votre application d&apos;authentification
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setupData.qr}
              alt="QR code d'enrôlement 2FA"
              width={176}
              height={176}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-2"
            />
          </div>
          <div>
            <div className="text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              …ou saisissez la clé manuellement
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-[13px] tracking-wide bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 break-all">
                {groupedSecret}
              </code>
              <button
                onClick={() => copy(setupData.secret)}
                className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Copier la clé"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="totp-code" className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
              2. Saisissez le code à 6 chiffres généré
            </label>
            <input
              id="totp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className={`${inputCls} mt-1 font-mono tracking-[0.3em] max-w-[10rem]`}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmEnable}
              disabled={busy || code.trim().length < 6}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-40"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Confirmer et activer
            </button>
            <button
              onClick={() => {
                setPhase("idle");
                setSetupData(null);
                setCode("");
                setError(null);
              }}
              className="text-[12px] text-slate-500 hover:text-slate-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* --- Compte AVEC 2FA --- */}
      {enabled && phase !== "disabling" && (
        <button
          onClick={() => setPhase("disabling")}
          disabled={forced}
          title={forced ? "La double authentification est imposée par l'administrateur." : undefined}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShieldOff size={14} /> Désactiver
        </button>
      )}
      {enabled && forced && phase !== "disabling" && (
        <p className="mt-2 text-[11px] text-slate-400">
          Obligatoire selon la politique de sécurité de l&apos;organisation.
        </p>
      )}

      {enabled && phase === "disabling" && (
        <div className="space-y-3 max-w-sm">
          <div>
            <label htmlFor="disable-pwd" className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Confirmez votre mot de passe pour désactiver
            </label>
            <input
              id="disable-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputCls} mt-1 font-mono`}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={disable}
              disabled={busy || !password}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-rose-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-40"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Désactiver la 2FA
            </button>
            <button
              onClick={() => {
                setPhase("idle");
                setPassword("");
                setError(null);
              }}
              className="text-[12px] text-slate-500 hover:text-slate-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
