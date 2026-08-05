/* Permissions du module Projet (serveur). Ces gardes reflètent exactement ce que
   l'UI expose (voir app/(app)/projets/[id]/page.tsx : canManage / canContribute /
   canEditBoard), afin qu'un appel API ne puisse pas contourner l'interface. */
import type { Profile } from "@/lib/domain";
import { getProjectOwner, isProjectMember } from "@/lib/db/projects";

const isStaff = (role: string) => role === "directeur" || role === "admin";

/** Gestion structurelle (renommer, échéance, membres, archivage) : propriétaire, directeur ou admin. */
export function canManageProject(projectId: string, user: Profile): boolean {
  if (isStaff(user.role)) return true;
  return getProjectOwner(projectId) === user.id;
}

/** Contribution (notes, rattachement, demande de clôture/suppression) : propriétaire, membre, directeur ou admin. */
export function canContributeProject(projectId: string, user: Profile): boolean {
  if (isStaff(user.role)) return true;
  if (getProjectOwner(projectId) === user.id) return true;
  return isProjectMember(projectId, user.id);
}

/**
 * Édition directe du tableau des tâches (Lot 3) : réservée au propriétaire, aux
 * membres du projet, et aux manager/directeur/admin. Les autres passent par une
 * proposition (« pull request »).
 */
export function canEditProjectBoard(projectId: string, user: Profile): boolean {
  if (user.role === "manager" || user.role === "directeur" || user.role === "admin") return true;
  if (getProjectOwner(projectId) === user.id) return true;
  return isProjectMember(projectId, user.id);
}
