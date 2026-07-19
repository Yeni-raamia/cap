import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DEMO_MODE } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getCatalogue, listItems, listNotificationsFor, listProfiles } from "@/lib/db/repo";
import { listProjects } from "@/lib/db/projects";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  // Mode démo : pas d'authentification, l'app s'amorce côté client.
  if (DEMO_MODE) {
    return <AppShell demo>{children}</AppShell>;
  }

  // Mode local (SQLite + comptes) : garde d'authentification côté serveur.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = listItems();
  const profiles = listProfiles();
  const notifications = listNotificationsFor(user.id);
  const catalogue = getCatalogue();
  const projects = listProjects();

  return (
    <AppShell
      initialUser={user}
      initialItems={items}
      initialProfiles={profiles}
      initialNotifications={notifications}
      initialCatalogue={catalogue}
      initialProjects={projects}
    >
      {children}
    </AppShell>
  );
}
