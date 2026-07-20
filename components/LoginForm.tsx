"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogIn } from "lucide-react";
import { APP_BASELINE, APP_MOTTO, APP_NAME } from "@/lib/config";

type Mode = "signin" | "signup";

export function LoginForm({ firstRun }: { firstRun: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(firstRun ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
      // Compte en attente d'approbation → page tampon dédiée.
      router.push(data.pending ? "/pending" : "/espace");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-9 w-9 rounded-lg bg-emerald-500 grid place-items-center text-slate-900">
            <Compass size={20} />
          </div>
          <div>
            <div className="text-slate-900 font-semibold leading-none text-lg">{APP_NAME}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{APP_BASELINE.replace(/\.$/, "")}</div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <div className="text-[15px] font-semibold text-slate-800">
            {mode === "signin" ? "Connexion" : "Créer un compte"}
          </div>
          {firstRun && mode === "signup" && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
              Premier compte : il sera <span className="font-medium">administrateur</span> et pourra
              gérer les rôles de l&apos;équipe.
            </div>
          )}
          {!firstRun && mode === "signup" && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              Votre demande sera <span className="font-medium">soumise à l&apos;administrateur</span> ;
              vous serez notifié dès son approbation.
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="text-[12px] font-medium text-slate-600" htmlFor="fullname">
                Nom complet
              </label>
              <input
                id="fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="Prénom Nom"
              />
            </div>
          )}

          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
              placeholder="prenom@exemple.fr"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-[12px] text-rose-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            <LogIn size={15} />
            {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>

          {!firstRun && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="w-full text-[12px] text-slate-500 hover:text-slate-700"
            >
              {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          )}
        </form>

        <p className="text-[11px] text-slate-400 mt-4 text-center">{APP_MOTTO}</p>
      </div>
    </main>
  );
}
