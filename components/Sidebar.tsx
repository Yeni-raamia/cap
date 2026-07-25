"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarRange,
  Compass,
  FileWarning,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { APP_BASELINE, APP_MOTTO, APP_NAME } from "@/lib/config";
import { navForUser } from "@/lib/nav";
import { useApp } from "./app-context";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  LayoutDashboard,
  Users,
  FolderKanban,
  Activity,
  CalendarRange,
  AlertTriangle,
  AlertOctagon,
  FileWarning,
  BarChart3,
  Trophy,
  Bell,
  MessageSquare,
  Settings,
};

export function Sidebar() {
  const { me, alerts, messagesUnread } = useApp();
  const pathname = usePathname();
  const nav = navForUser(me);

  return (
    <aside className="w-60 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800/60">
      <div className="p-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-slate-900 shadow-lg shadow-emerald-500/20">
            <Compass size={18} />
          </div>
          <div>
            <div className="text-white font-semibold leading-none">{APP_NAME}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{APP_BASELINE.replace(/\.$/, "")}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map((n) => {
          const Icon = ICONS[n.icon] ?? LayoutDashboard;
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                active
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-0.5"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-400 transition-all duration-200 ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
              />
              <Icon size={16} className={active ? "text-emerald-400" : "transition-colors"} />
              {n.label}
              {n.id === "rappels" && alerts > 0 && (
                <span className="ml-auto text-[10px] bg-amber-500 text-slate-900 font-bold px-1.5 rounded-full animate-fade">
                  {alerts}
                </span>
              )}
              {n.id === "messagerie" && messagesUnread > 0 && (
                <span className="ml-auto text-[10px] bg-emerald-500 text-slate-900 font-bold px-1.5 rounded-full animate-fade">
                  {messagesUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800/60 text-[10px] text-slate-500">{APP_MOTTO}</div>
    </aside>
  );
}
