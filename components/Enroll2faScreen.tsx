"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { copyText } from "@/lib/clipboard";

/**
 * Enrôlement 2FA imposé : affiché en plein écran quand la politique de
 * sécurité exige la double authentification et que le compte ne l'a pas
 * encore activée. Bloque l'accès à l'application tant qu'elle n'est pas active.
 */
export function Enroll2faScreen({ name, secret, qr }: { name: string; secret: string; qr: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const groupedSecret = secret.replace(/(.{4})/g, "$1 ").trim();
  const copy = (t: string) => {
    void copyText(t);
  };

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/account/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Code incorrect.");
      setBackupCodes(d.backupCodes);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const proceed = () => {
    router.replace("/cockpit");
    router.refresh();
  };

  const firstName = name.split(/\s+/)[0] || name;

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4 text-amber-700">
          <ShieldAlert size={20} />
          <span className="text-[13px] font-medium">Double authentification requise</span>
        </div>

        {backupCodes ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              <ShieldCheck size={17} className="text-emerald-600" /> Activée
            </div>
            <p className="text-[12px] text-slate-500">
              Conservez ces codes de secours en lieu sûr : ils permettent de vous connecter si
              vous perdez l&apos;accès à votre application. Ils ne seront plus affichés.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-amber-800">Codes de secours</span>
              <button onClick={() => copy(backupCodes.join("\n"))} className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:underline">
                <Copy size={12} /> Copier
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[13px]">
              {backupCodes.map((c) => (
                <span key={c} className="bg-amber-50 border border-amber-200/70 rounded px-2 py-1 text-center">
                  {c}
                </span>
              ))}
            </div>
            <button
              onClick={proceed}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700"
            >
              J&apos;ai noté mes codes — accéder à l&apos;application
            </button>
          </div>
        ) : (
          <form onSubmit={enable} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="text-[15px] font-semibold text-slate-800">Bonjour {firstName}</div>
            <p className="text-[12px] text-slate-500">
              La politique de sécurité impose la double authentification. Scannez le QR code avec
              votre application d&apos;authentification (Google Authenticator, etc.), puis saisissez
              le code généré.
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR code d'enrôlement 2FA"
                width={176}
                height={176}
                className="rounded-lg border border-slate-200 bg-white p-2"
              />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-600 mb-1">…ou clé manuelle</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[13px] tracking-wide bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">
                  {groupedSecret}
                </code>
                <button type="button" onClick={() => copy(secret)} className="border border-slate-200 rounded-lg px-2.5 py-2 hover:bg-slate-50" title="Copier">
                  <Copy size={13} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="code" className="text-[12px] font-medium text-slate-600">Code à 6 chiffres</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full mt-1 text-[15px] font-mono tracking-[0.3em] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
              />
            </div>
            {err && <div className="text-[12px] text-rose-600">{err}</div>}
            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Activer et continuer
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
