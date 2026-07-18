"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess } from "@/lib/nav";
import type { Item, Notif, Profile } from "@/lib/domain";
import { AppProvider, useApp } from "./app-context";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Drawer } from "./Drawer";
import { NewSuiviModal } from "./NewSuiviModal";

function Shell({ children }: { children: ReactNode }) {
  const { me, ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Garde de rôle applicative : redirige si le rôle courant n'a pas accès.
  useEffect(() => {
    if (ready && !canAccess(pathname, me.role)) router.replace("/espace");
  }, [pathname, me.role, ready, router]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {ready ? (
              children
            ) : (
              <div className="grid place-items-center py-24 text-[13px] text-slate-400">
                Chargement…
              </div>
            )}
          </div>
        </main>
      </div>
      <Drawer />
      <NewSuiviModal />
    </div>
  );
}

export function AppShell({
  children,
  demo = false,
  initialUser,
  initialItems,
  initialProfiles,
  initialNotifications,
}: {
  children: ReactNode;
  demo?: boolean;
  initialUser?: Profile;
  initialItems?: Item[];
  initialProfiles?: Profile[];
  initialNotifications?: Notif[];
}) {
  return (
    <AppProvider
      demo={demo}
      initialUser={initialUser}
      initialItems={initialItems}
      initialProfiles={initialProfiles}
      initialNotifications={initialNotifications}
    >
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
