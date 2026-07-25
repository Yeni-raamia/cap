/* ==================================================================
 *  lib/clipboard.ts — Copie presse-papiers robuste (client).
 *
 *  L'API navigator.clipboard n'existe QUE dans un « contexte sécurisé »
 *  (HTTPS ou localhost). En déploiement LAN sur http://<ip>:3000, elle
 *  est indisponible → la copie échouait. On ajoute un repli universel
 *  (textarea temporaire + execCommand) qui fonctionne aussi en HTTP.
 * ================================================================== */

/** Copie `text` dans le presse-papiers. Renvoie true si réussi. */
export async function copyText(text: string): Promise<boolean> {
  // Chemin moderne : contexte sécurisé uniquement.
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof window !== "undefined" && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* on bascule sur le repli */
    }
  }
  // Repli universel (fonctionne en HTTP/LAN).
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
