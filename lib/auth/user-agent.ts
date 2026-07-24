/* Description lisible d'un User-Agent (navigateur + système), sans dépendance.
 * Approximatif mais suffisant pour identifier une session dans une liste. */

function browser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Navigateur";
}

function os(ua: string): string {
  if (/Windows NT 10/.test(ua)) return "Windows";
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "";
}

/** Ex. « Chrome sur Windows ». Renvoie « Appareil inconnu » si l'UA est vide. */
export function describeUserAgent(ua: string | null | undefined): string {
  const s = (ua || "").trim();
  if (!s) return "Appareil inconnu";
  const o = os(s);
  return o ? `${browser(s)} sur ${o}` : browser(s);
}
