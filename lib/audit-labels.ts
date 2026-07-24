/* ==================================================================
 *  lib/audit-labels.ts — Libellés lisibles des événements du journal
 *  d'audit et regroupement des événements « sécurité ».
 *  Partagé entre l'UI d'administration et l'API d'audit.
 * ================================================================== */

export const ACTION_LABEL: Record<string, string> = {
  item_create: "Suivi de mail créé",
  item_relance: "Relance",
  item_reponse: "Réponse reçue",
  item_bloque: "Blocage",
  item_cloture: "Clôture",
  member_create: "Membre créé",
  member_role: "Rôle modifié",
  member_active: "Statut de compte",
  member_poste: "Poste modifié",
  member_password: "Mot de passe réinitialisé",
  member_pages: "Vues accessibles",
  member_readonly: "Privilège lecture/écriture",
  member_approve: "Approbation de compte",
  member_force_password: "Renouvellement mot de passe imposé",
  security_settings: "Paramètres de sécurité",
  blocage_demarche: "Démarche de déblocage",
  blocage_appreciation: "Appréciation du motif",
  reflist_add: "Liste — ajout",
  reflist_delete: "Liste — suppression",
  negligence_open: "Négligence ouverte",
  negligence_update: "Négligence — évaluation",
  negligence_status: "Négligence — statut",
  negligence_decision: "Négligence — décision DG",
  catalogue_add: "Catalogue — ajout",
  catalogue_update: "Catalogue — édition",
  catalogue_delete: "Catalogue — suppression",
  settings_update: "Paramètres modifiés",
  reminders_run: "Moteur de relance exécuté",
  member_delete: "Compte supprimé",
  account_update: "Profil mis à jour",
  login: "Connexion",
  login_2fa: "Connexion (2FA validée)",
  login_backup_code: "Connexion (code de secours)",
  login_failed: "Échec de connexion",
  "2fa_enabled": "Double authentification activée",
  "2fa_disabled": "Double authentification désactivée",
  member_2fa_reset: "2FA réinitialisée (admin)",
  session_revoke: "Session révoquée",
  session_revoke_others: "Autres sessions déconnectées",
  template_create: "Modèle — ajout",
  template_update: "Modèle — édition",
  template_delete: "Modèle — suppression",
  attachment_add: "Pièce jointe — ajout",
  attachment_delete: "Pièce jointe — suppression",
};

/** Libellé lisible d'une action (repli sur le code brut si inconnu). */
export const actionLabel = (action: string): string => ACTION_LABEL[action] ?? action;

/**
 * Événements liés à la sécurité et au contrôle d'accès (connexions, 2FA,
 * gestion des comptes et privilèges). Sert au filtre « Sécurité uniquement ».
 */
export const SECURITY_ACTIONS: string[] = [
  "login",
  "login_2fa",
  "login_backup_code",
  "login_failed",
  "2fa_enabled",
  "2fa_disabled",
  "member_2fa_reset",
  "session_revoke",
  "session_revoke_others",
  "member_create",
  "member_delete",
  "member_role",
  "member_active",
  "member_readonly",
  "member_pages",
  "member_approve",
  "member_password",
  "member_force_password",
  "security_settings",
];
