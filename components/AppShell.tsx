"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess } from "@/lib/nav";
import type { AppSettings, Catalogue, Item, Negligence, Notif, Profile, Project, RefLists } from "@/lib/domain";
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
    if (ready && !canAccess(pathname, me)) router.replace("/espace");
  }, [pathname, me, ready, router]);

  return (
    <div className="app-shell flex h-screen bg-slate-50 text-slate-900">
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
  initialCatalogue,
  initialProjects,
  initialSettings,
  initialRefLists,
  initialNegligences,
}: {
  children: ReactNode;
  demo?: boolean;
  initialUser?: Profile;
  initialItems?: Item[];
  initialProfiles?: Profile[];
  initialNotifications?: Notif[];
  initialCatalogue?: Catalogue;
  initialProjects?: Project[];
  initialSettings?: AppSettings;
  initialRefLists?: RefLists;
  initialNegligences?: Negligence[];
}) {
  return (
    <AppProvider
      demo={demo}
      initialUser={initialUser}
      initialItems={initialItems}
      initialProfiles={initialProfiles}
      initialNotifications={initialNotifications}
      initialCatalogue={initialCatalogue}
      initialProjects={initialProjects}
      initialSettings={initialSettings}
      initialRefLists={initialRefLists}
      initialNegligences={initialNegligences}
    >
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
