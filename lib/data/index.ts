/* ==================================================================
 *  lib/data/index.ts — Sélecteur d'adaptateur de données.
 *  Si NEXT_PUBLIC_SUPABASE_URL est présent → adaptateur Supabase
 *  (Phase 2). Sinon → adaptateur « mock » (mode démo, Phase 1).
 *  Les deux exposent la même interface (cf. §6).
 * ================================================================== */
import { HAS_SUPABASE } from "../config";
import * as mock from "./mock";

// Phase 2 branchera ici l'adaptateur Supabase. En attendant, on
// reste sur l'adaptateur mock même si l'env est présent.
export const data = mock;

export const isDemoMode = !HAS_SUPABASE;

export * from "./mock";
