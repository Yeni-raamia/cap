"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, Clock, LogOut, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/config";

/** Écran d'attente moderne pour un compte en cours de validation. */
export function PendingScreen({ name }: { name: string }) {
  const router = useRouter();
  const [approved, setApproved] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sondage régulier de l'état d'approbation ; bascule automatique dès validation.
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("/api/auth/status", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!d.authenticated) {
          router.replace("/login");
          return;
        }
        if (d.approved) {
          setApproved(true);
          if (timer.current) clearInterval(timer.current);
          setTimeout(() => {
            router.replace("/cockpit");
            router.refresh();
          }, 1400);
        }
      } catch {
        /* réseau : nouvel essai au prochain tick */
      }
    };
    check();
    timer.current = setInterval(check, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [router]);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const firstName = name.split(/\s+/)[0] || name;

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-4 text-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
          {approved ? (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 grid place-items-center mb-5">
                <BadgeCheck size={34} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold">Compte approuvé 🎉</h1>
              <p className="text-[13px] text-slate-300 mt-2">
                Bienvenue, {firstName}. Redirection vers votre espace…
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 grid place-items-center mb-5 relative">
                <Clock size={32} className="text-amber-300" />
                <span className="absolute inset-0 rounded-2xl border border-amber-400/30 animate-ping" />
              </div>
              <h1 className="text-xl font-semibold">Bonjour {firstName} 👋</h1>
              <p className="text-[13px] text-slate-300 mt-2 leading-relaxed">
                Votre demande d&apos;accès à <span className="font-medium text-white">{APP_NAME}</span> a bien
                été enregistrée et attend l&apos;<span className="font-medium text-white">approbation d&apos;un administrateur</span>.
              </p>

              <div className="mt-6 space-y-2.5 text-left">
                <Step icon={ShieldCheck} tone="text-emerald-400" title="Demande reçue" desc="Votre inscription a été transmise en toute sécurité." done />
                <Step icon={Clock} tone="text-amber-300" title="En attente de validation" desc="Un administrateur examine votre demande." pulse />
                <Step icon={Bell} tone="text-slate-400" title="Notification à l'approbation" desc="Vous serez averti et redirigé automatiquement." />
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Vérification automatique en cours…
              </div>
            </>
          )}

          <button
            onClick={signOut}
            className="mt-7 inline-flex items-center gap-1.5 text-[12px] text-slate-300 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 hover:bg-white/5"
          >
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-400/70 mt-4">
          Accès réservé aux personnes autorisées.
        </p>
      </div>
    </main>
  );
}

function Step({
  icon: Icon,
  tone,
  title,
  desc,
  done,
  pulse,
}: {
  icon: typeof Clock;
  tone: string;
  title: string;
  desc: string;
  done?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
      <div className={`mt-0.5 ${tone} ${pulse ? "animate-pulse" : ""}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white flex items-center gap-1.5">
          {title}
          {done && <BadgeCheck size={13} className="text-emerald-400" />}
        </div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
    </div>
  );
}
