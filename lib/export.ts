/* ==================================================================
 *  lib/export.ts — Export CSV côté client (compatible Excel FR).
 *  Séparateur « ; » et BOM UTF-8 pour un rendu correct dans Excel.
 * ================================================================== */

/** Échappe une cellule CSV (guillemets, séparateur, retours ligne). */
export function csvEscape(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Construit le contenu CSV (séparateur « ; »). */
export function buildCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => csvEscape(String(c ?? ""))).join(";")).join("\r\n");
}

/** Déclenche le téléchargement d'un CSV (avec BOM pour Excel). */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const content = "﻿" + buildCsv(rows); // BOM UTF-8
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
