/* Permissions du module Projet (serveur). */
import { getProjectOwner, isProjectMember } from "@/lib/db/projects";
import type { Profile } from "@/lib/domain";

/** Gestion structurelle du projet : propriétaire, ou directeur/admin. */
export function canManageProject(projectId: string, user: Profile): boolean {
  if (user.role === "directeur" || user.role === "admin") return true;
  return getProjectOwner(projectId) === user.id;
}

/** Contribution (tâches, notes) : gestionnaire ou membre du projet. */
export function canContributeProject(projectId: string, user: Profile): boolean {
  return canManageProject(projectId, user) || isProjectMember(projectId, user.id);
}
