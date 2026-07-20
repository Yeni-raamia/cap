/* Permissions du module Projet (serveur). Les projets sont éditables par
   tous les membres de l'équipe (agents inclus). */
import type { Profile } from "@/lib/domain";

/** Gestion structurelle du projet : tout utilisateur authentifié. */
export function canManageProject(_projectId: string, _user: Profile): boolean {
  return true;
}

/** Contribution (tâches, notes) : tout utilisateur authentifié. */
export function canContributeProject(_projectId: string, _user: Profile): boolean {
  return true;
}
