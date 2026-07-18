/* ------------------------------------------------------------------ */
/*  Configuration — noms neutres, aucun secret, publiable en open-source */
/*  Toute valeur sensible/spécifique se surcharge via .env.local        */
/* ------------------------------------------------------------------ */

export const APP_NAME = "Cap";
export const APP_BASELINE = "Rien ne dérive.";
export const APP_MOTTO = "Aucun mail sans trace.";

// Nom de l'organisation/équipe — neutre par défaut, surchargeable sans toucher au code.
export const ORG_NAME =
  process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Équipe sécurité";

// Mode démo : données en mémoire, non partagées, sans compte (pour essai/écran).
// Par défaut l'app utilise la base locale SQLite (persistante, partagée, avec comptes).
// Activer le mode démo : NEXT_PUBLIC_DEMO=1 dans .env.local.
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO === "1" || process.env.NEXT_PUBLIC_DEMO === "true";
