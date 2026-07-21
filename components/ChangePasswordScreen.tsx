"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";

export function ChangePasswordScreen({ name }: { name: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next !== confirm) return setErr("La confirmation ne correspond pas.");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erreur.");
      router.replace("/espace");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const firstName = name.split(/\s+/)[0] || name;

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-4 text-amber-700">
          <ShieldAlert size={20} />
          <span className="text-[13px] font-medium">Renouvellement du mot de passe requis</span>
        </div>
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <div className="text-[15px] font-semibold text-slate-800">Bonjour {firstName}</div>
          <p className="text-[12px] text-slate-500">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant d&apos;accéder à l&apos;application.
          </p>

          <Field label="Mot de passe actuel" value={current} onChange={setCurrent} />
          <Field label="Nouveau mot de passe" value={next} onChange={setNext} />
          <Field label="Confirmer le nouveau mot de passe" value={confirm} onChange={setConfirm} />

          {err && <div className="text-[12px] text-rose-600">{err}</div>}

          <button
            type="submit"
            disabled={loading || !current || !next}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            <KeyRound size={15} /> {loading ? "…" : "Mettre à jour"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-slate-600">{label}</label>
      <input
        type="password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
        placeholder="••••••••"
      />
    </div>
  );
}
