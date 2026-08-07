import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DEMO_MODE } from "@/lib/config";
import { getAuthUser } from "@/lib/auth/session";
import { getCatalogue, listItems, listNotificationsFor, listProfiles, listTemplates } from "@/lib/db/repo";
import { listProjects } from "@/lib/db/projects";
import { listTasks } from "@/lib/db/tasks";
import { listObjectives } from "@/lib/db/objectives";
import { listNegligences } from "@/lib/db/negligences";
import { listNonConformites } from "@/lib/db/nonconformites";
import { listConversationsFor } from "@/lib/db/messaging";
import { listContacts } from "@/lib/db/contacts";
import { listMeetings } from "@/lib/db/meetings";
import { listRisks } from "@/lib/db/risks";
import { listPolicies } from "@/lib/db/policies";
import { listAssets } from "@/lib/db/assets";
import { listControlAssessments } from "@/lib/db/controls";
import { listFieldControls } from "@/lib/db/fieldcontrols";
import { listCapaActions } from "@/lib/db/capa";
import { listPlanItems } from "@/lib/db/grcplan";
import { listDirections } from "@/lib/db/directions";
import { listCourses, listProgressFor } from "@/lib/db/training";
import { listMissions } from "@/lib/db/missions";
import { listSuppliers } from "@/lib/db/suppliers";
import { getRefLists, getSecuritySettings, getSettings } from "@/lib/db/admin";
import { maybeRunRemindersInBackground } from "@/lib/reminders/auto";
import { maybeRunBackupInBackground } from "@/lib/backup/auto";

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
  // 2FA imposée par la politique : enrôlement obligatoire avant tout accès.
  if (getSecuritySettings().twofaRequired && !user.totpEnabled) redirect("/enroll-2fa");

  // Filet de sécurité : si aucun cron n'a fait tourner le moteur de relance
  // récemment, on le déclenche en tâche de fond (throttlé, sans bloquer le rendu).
  maybeRunRemindersInBackground();
  // Sauvegarde planifiée (si activée en administration) — sans bloquer le rendu.
  maybeRunBackupInBackground();

  // Visibilité (Lot 2) : le privé d'autrui ne quitte jamais le serveur — on ne
  // charge que les éléments publiés ou appartenant au demandeur.
  const items = listItems(user.id);
  const profiles = listProfiles();
  const notifications = listNotificationsFor(user.id);
  const catalogue = getCatalogue();
  const projects = listProjects(user.id);
  const settings = getSettings();
  const refLists = getRefLists();
  const negligences = listNegligences();
  const nonConformites = listNonConformites();
  const conversations = listConversationsFor(user.id);
  const tasks = listTasks(user.id);
  const objectives = listObjectives();
  const templates = listTemplates();
  const contacts = listContacts();
  const meetings = listMeetings();
  const risks = listRisks();
  const policies = listPolicies();
  const assets = listAssets();
  const controlAssessments = listControlAssessments();
  const fieldControls = listFieldControls();
  const capaActions = listCapaActions();
  const planItems = listPlanItems();
  const directions = listDirections();
  const trainingCourses = listCourses();
  const trainingDone = listProgressFor(user.id);
  const missions = listMissions();
  const suppliers = listSuppliers();

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
      initialNonConformites={nonConformites}
      initialConversations={conversations}
      initialTasks={tasks}
      initialObjectives={objectives}
      initialTemplates={templates}
      initialContacts={contacts}
      initialMeetings={meetings}
      initialRisks={risks}
      initialPolicies={policies}
      initialAssets={assets}
      initialControlAssessments={controlAssessments}
      initialFieldControls={fieldControls}
      initialCapaActions={capaActions}
      initialPlanItems={planItems}
      initialDirections={directions}
      initialTrainingCourses={trainingCourses}
      initialTrainingDone={trainingDone}
      initialMissions={missions}
      initialSuppliers={suppliers}
    >
      {children}
    </AppShell>
  );
}
