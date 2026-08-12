"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, ShieldCheck } from "lucide-react";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";

interface AccountActivity {
  profileId: string;
  lastSeenAt: string | null;
  activeDays: number;
  lastActiveDay: string | null;
  firstHour: number | null;
  lastHour: number | null;
  actions: number;
}
interface Payload {
  days: number;
  retentionDays: number;
  scope: "equipe" | "moi";
  comptes: AccountActivity[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** « il y a 3 j », « aujourd'hui » — ancienneté lisible d'une date ISO. */
function anciennete(iso: string | null, now: Date): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "jamais";
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  const jours = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}

/**
 * Journal de connexion par compte.
 *
 * Ce que l'écran dit : qui se sert de l'outil, et depuis quand on ne l'a plus
 * vu. Ce qu'il ne dit **pas** : combien de temps chacun y passe — un onglet
 * ouvert ne mesure pas du travail, et un total d'heures se lirait comme une
 * note plutôt que comme une information.
 */
export function ComptesActivitePanel() {
  const { profileById, now } = useApp();
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState(30);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/usage/accounts?days=${days}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) return setErr(d.error ?? "Erreur.");
      setErr(null);
      setData(d);
    } catch {
      setErr("Impossible de charger l'activité des comptes.");
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <Card className="p-6 text-center text-[13px] text-rose-600">{err}</Card>;
  if (!data)
    return (
      <Card className="p-8 text-center text-[13px] text-slate-400">
        <Loader2 size={18} className="mx-auto animate-spin mb-2" /> Chargement…
      </Card>
    );

  // Les comptes silencieux d'abord : ce sont eux qu'on cherche.
  const lignes = [...data.comptes].sort((a, b) => a.activeDays - b.activeDays || b.actions - a.actions);
  const inactifs = data.comptes.filter((c) => c.activeDays === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
        <Info size={15} className="text-slate-400 mt-0.5 shrink-0" />
        <span>
          Journal de connexion — <b>sans durée cumulée</b> : on voit qui se sert de l&apos;outil et depuis quand on ne
          l&apos;a plus vu, pas combien de temps chacun y passe. Seule l&apos;activité réelle est prise en compte ; les
          données sont effacées après {data.retentionDays} jours.
          {data.scope === "moi" && <> Vous ne voyez que votre propre ligne.</>}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[12px] bg-white dark:bg-slate-900">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                days === d ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {d} j
            </button>
          ))}
        </div>
        {data.scope === "equipe" && (
          <span className={`text-[12px] ${inactifs ? "text-amber-700" : "text-slate-400"}`}>
            {inactifs === 0
              ? "Tous les comptes ont été actifs sur la période."
              : `${inactifs} compte(s) sans aucune activité sur la période.`}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-slate-400">
          <ShieldCheck size={13} /> {data.scope === "equipe" ? "Vue réservée au directeur et à l'administrateur" : "Vos données"}
        </span>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[44rem]">
          <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Compte</th>
              <th className="px-2 py-2 font-medium text-center">Jours actifs</th>
              <th className="px-2 py-2 font-medium">Dernière activité</th>
              <th className="px-2 py-2 font-medium">Amplitude du dernier jour</th>
              <th className="px-2 py-2 font-medium text-center" title="Actions enregistrées au journal sur la période">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {lignes.map((c) => {
              const p = profileById(c.profileId);
              const jamais = c.activeDays === 0;
              return (
                <tr key={c.profileId} className={jamais ? "bg-amber-50/40 dark:bg-amber-500/5" : ""}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar init={p.init} size="h-7 w-7" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.poste || p.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-2 py-2 text-center font-mono ${jamais ? "text-amber-700 font-semibold" : "text-slate-700 dark:text-slate-200"}`}>
                    {c.activeDays} / {data.days}
                  </td>
                  <td className={`px-2 py-2 ${jamais ? "text-amber-700" : "text-slate-600 dark:text-slate-300"}`}>
                    {anciennete(c.lastSeenAt, now)}
                  </td>
                  <td className="px-2 py-2 text-slate-500 font-mono">
                    {c.firstHour !== null && c.lastHour !== null ? `${pad(c.firstHour)} h → ${pad(c.lastHour)} h` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500">{c.actions || "—"}</td>
                </tr>
              );
            })}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">Aucun compte.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="text-[11px] text-slate-400">
        « Amplitude » indique la première et la dernière heure d&apos;activité du dernier jour actif — ce n&apos;est pas
        une durée de travail : les heures intermédiaires ne sont pas mesurées.
      </div>
    </div>
  );
}
