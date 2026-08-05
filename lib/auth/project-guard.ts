/* Permissions du module Projet (serveur). */
import type { Profile } from "@/lib/domain";
import { getProjectOwner, isProjectMember } from "@/lib/db/projects";

/** Gestion structurelle du projet : tout utilisateur authentifié. */
export function canManageProject(_projectId: string, _user: Profile): boolean {
  return true;
}

/** Contribution générale (notes, demande de clôture) : tout utilisateur authentifié. */
export function canContributeProject(_projectId: string, _user: Profile): boolean {
  return true;
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
