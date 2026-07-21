"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, navForUser } from "@/lib/nav";
import type { AppSettings, Catalogue, ConversationSummary, Item, Negligence, Notif, Profile, Project, RefLists, Task } from "@/lib/domain";
import { AppProvider, useApp } from "./app-context";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Drawer } from "./Drawer";
import { NewSuiviModal } from "./NewSuiviModal";
import { TaskModal } from "./TaskModal";

function Shell({ children }: { children: ReactNode }) {
  const { me, ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Garde de rôle applicative : redirige si le rôle courant n'a pas accès.
  useEffect(() => {
    if (ready && !canAccess(pathname, me)) {
      // Redirige vers la première page autorisée (utile pour les rôles restreints, ex. DSI).
      router.replace(navForUser(me)[0]?.href ?? "/espace");
    }
  }, [pathname, me, ready, router]);

  return (
    <div className="app-shell flex h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {ready ? (
              <div key={pathname} className="animate-page">
                {children}
              </div>
            ) : (
              <div className="grid place-items-center py-24 text-[13px] text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-emerald-500 animate-spin" />
                  Chargement…
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
      <Drawer />
      <NewSuiviModal />
      <TaskModal />
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
  initialConversations,
  initialTasks,
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
  initialConversations?: ConversationSummary[];
  initialTasks?: Task[];
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
      initialConversations={initialConversations}
      initialTasks={initialTasks}
    >
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
