import { Fragment } from "react";
import { FIL, filStage, type Item } from "@/lib/domain";

/* Le Fil — élément signature : frise de points reliés qui se remplit
   selon l'étape ; point rouge si l'objet est bloqué. */
export function Fil({ item, compact = false }: { item: Item; compact?: boolean }) {
  const stage = filStage(item);
  const blocked = item.statut === "Bloqué";
  return (
    <div className={compact ? "" : "px-1"}>
      <div className="flex items-center">
        {FIL.map((label, i) => {
          const done = i <= stage;
          const isBlockPoint = blocked && i === stage;
          const dot = isBlockPoint ? "bg-rose-500" : done ? "bg-emerald-500" : "bg-slate-200";
          return (
            <Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`rounded-full ${compact ? "h-2 w-2" : "h-2.5 w-2.5"} ${dot}`} />
                {!compact && (
                  <span className={`text-[9px] ${done ? "text-slate-600" : "text-slate-300"}`}>
                    {label}
                  </span>
                )}
              </div>
              {i < FIL.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < stage ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
