import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DEMO_MODE } from "@/lib/config";
import { getAuthUser } from "@/lib/auth/session";
import { getCatalogue, listItems, listNotificationsFor, listProfiles } from "@/lib/db/repo";
import { listProjects } from "@/lib/db/projects";
import { listTasks } from "@/lib/db/tasks";
import { listObjectives } from "@/lib/db/objectives";
import { listNegligences } from "@/lib/db/negligences";
import { listConversationsFor } from "@/lib/db/messaging";
import { getRefLists, getSettings } from "@/lib/db/admin";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  // Mode démo : pas d'authentification, l'app s'amorce côté client.
  if (DEMO_MODE) {
    return <AppShell demo>{children}</AppShell>;
  }

  // Mode local (SQLite + comptes) : garde d'authentification côté serveur.
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!user.approved) redirect("/pending"); // compte en attente d'approbation admin
  if (user.mustChangePassword) redirect("/change-password"); // renouvellement du mot de passe imposé

  const items = listItems();
  const profiles = listProfiles();
  const notifications = listNotificationsFor(user.id);
  const catalogue = getCatalogue();
  const projects = listProjects();
  const settings = getSettings();
  const refLists = getRefLists();
  const negligences = listNegligences();
  const conversations = listConversationsFor(user.id);
  const tasks = listTasks();
  const objectives = listObjectives();

  return (
    <AppShell
      initialUser={user}
      initialItems={items}
      initialProfiles={profiles}
      initialNotifications={notifications}
      initialCatalogue={catalogue}
      initialProjects={projects}
      initialSettings={settings}
      initialRefLists={refLists}
      initialNegligences={negligences}
      initialConversations={conversations}
      initialTasks={tasks}
      initialObjectives={objectives}
    >
      {children}
    </AppShell>
  );
}
