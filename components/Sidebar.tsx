"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { APP_BASELINE, APP_MOTTO, APP_NAME } from "@/lib/config";
import { navForUser } from "@/lib/nav";
import { useApp } from "./app-context";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FolderKanban,
  AlertTriangle,
  AlertOctagon,
  BarChart3,
  Trophy,
  Bell,
  Settings,
};

export function Sidebar() {
  const { me, alerts } = useApp();
  const pathname = usePathname();
  const nav = navForUser(me);

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 grid place-items-center text-slate-900">
            <Compass size={18} />
          </div>
          <div>
            <div className="text-white font-semibold leading-none">{APP_NAME}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{APP_BASELINE.replace(/\.$/, "")}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map((n) => {
          const Icon = ICONS[n.icon] ?? LayoutDashboard;
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                active ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"
              }`}
            >
              <Icon size={16} />
              {n.label}
              {n.id === "rappels" && alerts > 0 && (
                <span className="ml-auto text-[10px] bg-amber-500 text-slate-900 font-bold px-1.5 rounded-full">
                  {alerts}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500">{APP_MOTTO}</div>
    </aside>
  );
}
