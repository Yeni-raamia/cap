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

// Indique si un backend Supabase est configuré (sinon : mode démo en mémoire).
export const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
