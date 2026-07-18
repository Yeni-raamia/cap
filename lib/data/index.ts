/* ==================================================================
 *  lib/data/index.ts — Sélecteur de mode de données.
 *  - Mode démo (NEXT_PUBLIC_DEMO=1) : adaptateur « mock » en mémoire.
 *  - Sinon : base locale SQLite côté serveur (voir lib/db + routes API),
 *    les composants clients passent par /api/*.
 * ================================================================== */
import { DEMO_MODE } from "../config";

export const isDemoMode = DEMO_MODE;

// Exporte l'adaptateur mock (utilisé par le mode démo côté client).
export * from "./mock";
