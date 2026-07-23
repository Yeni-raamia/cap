"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogIn, ShieldCheck } from "lucide-react";
import { APP_BASELINE, APP_MOTTO, APP_NAME } from "@/lib/config";

type Mode = "signin" | "signup";

export function LoginForm({ firstRun }: { firstRun: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(firstRun ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaiting2fa, setAwaiting2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirection selon l'état : attente d'approbation, renouvellement imposé, ou accueil.
  const routeAfterAuth = (data: { user?: { role?: string }; pending?: boolean; mustChangePassword?: boolean }) => {
    const home = data.user?.role === "dsi" ? "/global" : "/cockpit";
    router.push(data.pending ? "/pending" : data.mustChangePassword ? "/change-password" : home);
    router.refresh();
  };

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
      // Double authentification : passage à l'étape de saisie du code.
      if (data.twofaRequired) {
        setAwaiting2fa(true);
        setPassword("");
        return;
      }
      routeAfterAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const verify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Jeton pré-auth expiré : on repart de la saisie e-mail / mot de passe.
        if (data.expired) {
          setAwaiting2fa(false);
          setCode("");
        }
        throw new Error(data.error || "Code incorrect.");
      }
      routeAfterAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-4">
      <div className="w-full max-w-sm animate-page">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-slate-900 shadow-lg shadow-emerald-500/25">
            <Compass size={20} />
          </div>
          <div>
            <div className="text-slate-900 font-semibold leading-none text-lg">{APP_NAME}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{APP_BASELINE.replace(/\.$/, "")}</div>
          </div>
        </div>

        {awaiting2fa ? (
          <form onSubmit={verify2fa} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              <ShieldCheck size={17} className="text-emerald-600" />
              Vérification en deux étapes
            </div>
            <p className="text-[12px] text-slate-500">
              Saisissez le code à 6 chiffres de votre application d&apos;authentification, ou un
              code de secours.
            </p>
            <div>
              <label className="text-[12px] font-medium text-slate-600" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full mt-1 text-center tracking-[0.3em] text-[15px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="123456"
              />
            </div>
            {error && <div className="text-[12px] text-rose-600">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              <ShieldCheck size={15} />
              {loading ? "…" : "Vérifier"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAwaiting2fa(false);
                setCode("");
                setError(null);
              }}
              className="w-full text-[12px] text-slate-500 hover:text-slate-700"
            >
              Revenir à la connexion
            </button>
          </form>
        ) : (
        <form onSubmit={submit} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xl shadow-slate-200/50">
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
        )}

        <p className="text-[11px] text-slate-400 mt-4 text-center">{APP_MOTTO}</p>
      </div>
    </main>
  );
}
