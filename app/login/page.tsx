"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_BASELINE, APP_MOTTO, APP_NAME, HAS_SUPABASE } from "@/lib/config";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split("@")[0] } },
        });
        if (error) throw error;
        // Si la confirmation e-mail est désactivée, une session est déjà ouverte.
        if (data.session) {
          router.push("/espace");
          router.refresh();
        } else {
          setInfo("Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/espace");
        router.refresh();
      }
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

        {!HAS_SUPABASE ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
            <p className="text-[13px] text-slate-600">
              L&apos;app tourne en <span className="font-medium">mode démo</span> (Supabase non
              configuré). L&apos;authentification n&apos;est pas requise.
            </p>
            <button
              onClick={() => router.push("/espace")}
              className="mt-4 w-full text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700"
            >
              Entrer dans l&apos;app
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="text-[15px] font-semibold text-slate-800">
              {mode === "signin" ? "Connexion" : "Créer un compte"}
            </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-[12px] text-rose-600">{error}</div>}
            {info && <div className="text-[12px] text-emerald-700">{info}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              <LogIn size={15} />
              {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer le compte"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setInfo(null);
              }}
              className="w-full text-[12px] text-slate-500 hover:text-slate-700"
            >
              {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </form>
        )}

        <p className="text-[11px] text-slate-400 mt-4 text-center">{APP_MOTTO}</p>
      </div>
    </main>
  );
}
