/* ==================================================================
 *  lib/grc/scoring.ts — Score de conformité (posture vs référentiel).
 * ================================================================== */
import type { ControlAssessment } from "@/lib/domain";
import type { Framework, RefControl } from "./frameworks";

export interface ComplianceScore {
  applicable: number; // mesures dans le périmètre (SoA)
  excluded: number; // mesures exclues du périmètre
  assessed: number; // mesures évaluées (statut ≠ « Non évalué »)
  implemented: number; // mesures « Implémenté »
  conformity: number; // % = somme(maturité) / (applicable × 5)
  coverage: number; // % de mesures applicables évaluées
}

/** Une mesure est applicable sauf si son évaluation la marque hors périmètre. */
const isApplicable = (a?: ControlAssessment) => !a || a.applicable !== false;

function score(controls: RefControl[], byCode: Map<string, ControlAssessment>): ComplianceScore {
  let applicable = 0;
  let excluded = 0;
  let assessed = 0;
  let implemented = 0;
  let maturitySum = 0;
  for (const c of controls) {
    const a = byCode.get(c.code);
    if (!isApplicable(a)) {
      excluded++;
      continue;
    }
    applicable++;
    maturitySum += a?.maturity ?? 0;
    if (a && a.status !== "Non évalué") assessed++;
    if (a?.status === "Implémenté") implemented++;
  }
  return {
    applicable,
    excluded,
    assessed,
    implemented,
    conformity: applicable ? Math.round((maturitySum / (applicable * 5)) * 100) : 0,
    coverage: applicable ? Math.round((assessed / applicable) * 100) : 0,
  };
}

export function scoreFramework(fw: Framework, byCode: Map<string, ControlAssessment>): ComplianceScore {
  return score(fw.controls, byCode);
}
export function scoreGroup(fw: Framework, group: string, byCode: Map<string, ControlAssessment>): ComplianceScore {
  return score(fw.controls.filter((c) => c.group === group), byCode);
}
