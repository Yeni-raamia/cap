"use client";

import { Award } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";

const medal = ["🥇", "🥈", "🥉"];

export default function ClassementPage() {
  const { me, scores, profileById } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Ceux qui font avancer les choses
        </h1>
        <p className="text-[13px] text-slate-500">
          Le score récompense relancer, obtenir des réponses et clôturer — pas le volume brut.
        </p>
      </div>
      <div className="space-y-2">
        {scores.map((s, i) => {
          const u = profileById(s.id);
          const mine = s.id === me.id;
          return (
            <Card
              key={s.id}
              className={`p-4 flex items-center gap-3 ${mine ? "ring-2 ring-emerald-300" : ""}`}
            >
              <div className="w-8 text-center text-lg">
                {medal[i] || <span className="text-slate-400 text-sm font-semibold">{i + 1}</span>}
              </div>
              <Avatar init={u.init} />
              <div className="flex-1">
                <div className="text-[14px] font-medium text-slate-800">
                  {u.nom}
                  {mine && <span className="text-[11px] text-emerald-600 ml-1">· toi</span>}
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {s.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full"
                    >
                      <Award size={10} />
                      {b}
                    </span>
                  ))}
                  {s.badges.length === 0 && (
                    <span className="text-[11px] text-slate-400">Pas encore de badge</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-slate-800">{s.score}</div>
                <div className="text-[10px] text-slate-400">
                  {s.closures} clôtures · {s.relances} relances
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
