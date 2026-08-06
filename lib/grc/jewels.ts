/* ==================================================================
 *  lib/grc/jewels.ts — Analyse des Joyaux de la Couronne (Crown Jewels
 *  Analysis, d'après la méthode MITRE CJA).
 *
 *  Objectif : identifier les actifs les plus critiques pour la mission
 *  (« joyaux »), mesurer l'EXPOSITION qui pèse sur eux (risques résiduels)
 *  et la PROTECTION en place (mesures de traitement + contrôles terrain),
 *  puis prioriser via un indice synthétique (JRI). Tout est DÉDUIT des
 *  autres onglets (Actifs, Risques, Contrôles) — aucune saisie dédiée.
 * ================================================================== */
import {
  assetCriticality,
  riskResidualLevel,
  type Asset,
  type FieldControl,
  type Risk,
  type RiskLevel,
} from "@/lib/domain";

const RESIDUAL_SCORE: Record<RiskLevel, number> = { Faible: 1, Moyen: 2, "Élevé": 3, Critique: 4 };
const CRIT_SCORE: Record<string, number> = { Faible: 1, "Modéré": 2, "Élevé": 3, Critique: 4 };
const REALISED = new Set(["Réalisé", "Clôturé"]);

export type JewelBand = "Prioritaire" | "À surveiller" | "Maîtrisé";
export const JEWEL_BAND_TONE: Record<JewelBand, string> = {
  Prioritaire: "bg-rose-100 text-rose-700 border-rose-200",
  "À surveiller": "bg-amber-100 text-amber-700 border-amber-200",
  "Maîtrisé": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export interface JewelAnalysis {
  asset: Asset;
  criticality: string; // AssetCriticality
  critScore: number; // 1–4
  linkedRisks: { risk: Risk; residual: RiskLevel }[];
  maxResidual: RiskLevel | null;
  mitigations: number; // mesures de traitement (uniques) issues des risques liés
  controlCoverage: number; // contrôles terrain réalisés couvrant le service
  protectionScore: number; // 0–3
  jri: number; // Jewel Risk Index 0–100 (priorité de protection)
  band: JewelBand;
  recommendations: string[];
}

const bandOf = (jri: number): JewelBand => (jri >= 70 ? "Prioritaire" : jri >= 45 ? "À surveiller" : "Maîtrisé");

/** Analyse un actif isolé (exporté pour les tests). */
export function analyzeJewel(asset: Asset, risks: Risk[], fieldControls: FieldControl[]): JewelAnalysis {
  const criticality = assetCriticality(asset);
  const critScore = CRIT_SCORE[criticality] ?? 1;

  const linkedRisks = risks
    .filter((r) => r.assetId === asset.id && r.status !== "Clôturé")
    .map((r) => ({ risk: r, residual: riskResidualLevel(r) }))
    .sort((a, b) => RESIDUAL_SCORE[b.residual] - RESIDUAL_SCORE[a.residual]);
  const maxResidual = linkedRisks[0]?.residual ?? null;

  // Mesures de traitement uniques (framework:code) issues des risques liés.
  const measureSet = new Set<string>();
  linkedRisks.forEach(({ risk }) => risk.controls.forEach((c) => measureSet.add(`${c.frameworkId}:${c.controlCode}`)));
  const mitigations = measureSet.size;

  // Couverture opérationnelle : contrôles terrain réalisés sur le service détenteur.
  const controlCoverage = asset.service
    ? fieldControls.filter((c) => c.service === asset.service && REALISED.has(c.status)).length
    : 0;

  // Score de protection 0–3 : présence de mesures + de contrôles.
  let protectionScore = 0;
  if (mitigations >= 1) protectionScore += 1;
  if (mitigations >= 3) protectionScore += 1;
  if (controlCoverage >= 1) protectionScore += 1;

  const critW = critScore / 4; // valeur / impact mission
  const expW = maxResidual ? RESIDUAL_SCORE[maxResidual] / 4 : 0.25; // exposition (menace résiduelle)
  const protW = Math.min(1, protectionScore / 3); // protection en place
  const jri = Math.round(100 * critW * (0.5 + 0.5 * expW) * (1 - 0.5 * protW));
  const band = bandOf(jri);

  const recommendations: string[] = [];
  if (linkedRisks.length === 0) recommendations.push("Aucun risque rattaché : réaliser une analyse de risque (ISO 27005) sur ce joyau.");
  if (maxResidual === "Critique" || maxResidual === "Élevé") recommendations.push(`Exposition ${maxResidual.toLowerCase()} : renforcer le traitement du risque résiduel.`);
  if (mitigations === 0 && linkedRisks.length > 0) recommendations.push("Aucune mesure de traitement rattachée : formaliser des mesures (catalogue de conformité).");
  if (controlCoverage === 0) recommendations.push("Aucun contrôle terrain récent sur le service détenteur : planifier une ronde / inspection.");
  if (recommendations.length === 0) recommendations.push("Protection cohérente avec la criticité : maintenir la vigilance et les revues.");

  return { asset, criticality, critScore, linkedRisks, maxResidual, mitigations, controlCoverage, protectionScore, jri, band, recommendations };
}

/** Un actif est un « joyau » si sa criticité (max C/I/D) est Élevé ou Critique,
 *  ou s'il porte un risque résiduel élevé/critique. */
export function isJewel(a: JewelAnalysis): boolean {
  return a.critScore >= 3 || a.maxResidual === "Critique" || a.maxResidual === "Élevé";
}

/** Analyse complète : classe les joyaux par indice de priorité (JRI) décroissant. */
export function computeJewels(assets: Asset[], risks: Risk[], fieldControls: FieldControl[]): JewelAnalysis[] {
  return assets
    .filter((a) => a.status !== "Retiré")
    .map((a) => analyzeJewel(a, risks, fieldControls))
    .sort((x, y) => y.jri - x.jri || y.critScore - x.critScore);
}
