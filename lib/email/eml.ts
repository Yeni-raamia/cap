/* ==================================================================
 *  lib/email/eml.ts — Analyse d'un e-mail au format .eml (RFC 822 / MIME).
 *  Sans dépendance : en-têtes (dépliage + mots encodés RFC 2047), corps
 *  multipart, encodages de transfert (base64 / quoted-printable), pièces
 *  jointes. Renvoie une structure exploitable pour un import de suivi.
 * ================================================================== */

export interface EmlAttachment {
  filename: string;
  mime: string;
  content: Buffer;
}

export interface ParsedEml {
  subject: string;
  from: string; // nom affiché si présent, sinon adresse
  fromEmail: string; // adresse seule
  to: string;
  date: Date | null;
  text: string; // corps en texte brut décodé
  attachments: EmlAttachment[];
}

/** Décode un charset connu vers une chaîne (repli latin1 pour les jeux 8 bits). */
function decodeBuffer(buf: Buffer, charset: string): string {
  const cs = charset.toLowerCase();
  if (cs === "utf-8" || cs === "utf8" || cs === "us-ascii" || cs === "ascii") return buf.toString("utf8");
  // iso-8859-*, windows-125x et inconnus : latin1 conserve chaque octet.
  return buf.toString("latin1");
}

/** Décode le quoted-printable (RFC 2045) en octets bruts. */
function decodeQuotedPrintable(input: string): Buffer {
  const s = input.replace(/=\r?\n/g, ""); // sauts de ligne « souples »
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "=" && i + 2 < s.length && /[0-9A-Fa-f]{2}/.test(s.slice(i + 1, i + 3))) {
      out.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(c.charCodeAt(0) & 0xff);
    }
  }
  return Buffer.from(out);
}

/** Décode les « mots encodés » RFC 2047 (=?charset?B/Q?texte?=) d'un en-tête. */
export function decodeEncodedWords(input: string): string {
  // Concatène les mots encodés adjacents séparés par des blancs (RFC 2047 §6.2).
  const collapsed = input.replace(/\?=\s+=\?/g, "?==?");
  return collapsed.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset: string, enc: string, text: string) => {
    try {
      if (enc.toUpperCase() === "B") {
        return decodeBuffer(Buffer.from(text, "base64"), charset);
      }
      // Q : « _ » = espace, « =XX » = octet.
      const buf = decodeQuotedPrintable(text.replace(/_/g, " "));
      return decodeBuffer(buf, charset);
    } catch {
      return text;
    }
  });
}

/** Sépare le bloc d'en-têtes du corps (première ligne vide). */
function splitHeadersBody(raw: string): { head: string; body: string } {
  const m = raw.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return { head: raw, body: "" };
  return { head: raw.slice(0, m.index), body: raw.slice(m.index + m[0].length) };
}

/** Déplie et indexe les en-têtes (clés en minuscules ; 1re occurrence conservée). */
function parseHeaders(head: string): Map<string, string> {
  const map = new Map<string, string>();
  const unfolded = head.replace(/\r?\n[ \t]+/g, " "); // dépliage des lignes continuées
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (!map.has(key)) map.set(key, val);
  }
  return map;
}

/** Extrait un paramètre d'un en-tête structuré (ex. boundary, charset, name). */
function param(headerValue: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"|${name}\\s*=\\s*([^;\\s]+)`, "i");
  const m = headerValue.match(re);
  return m ? (m[1] ?? m[2] ?? "").trim() : null;
}

/** Adresse d'un en-tête From/To : renvoie { name, email }. */
function parseAddress(raw: string): { name: string; email: string } {
  const decoded = decodeEncodedWords(raw).trim();
  const first = decoded.split(/[,;]/)[0].trim();
  const m = first.match(/^(.*?)<([^>]+)>/);
  if (m) {
    const name = m[1].trim().replace(/^["']|["']$/g, "");
    const email = m[2].trim();
    return { name: name || email, email };
  }
  const bare = first.replace(/[<>]/g, "").trim();
  return { name: bare, email: bare };
}

/** Convertit du HTML en texte lisible (pour les e-mails sans partie texte). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Collected {
  text: string | null; // 1re partie text/plain
  html: string | null; // repli text/html
  attachments: EmlAttachment[];
}

/** Décode le corps d'une partie selon son Content-Transfer-Encoding. */
function decodeBody(body: string, encoding: string): Buffer {
  const enc = encoding.toLowerCase();
  if (enc === "base64") return Buffer.from(body.replace(/\s+/g, ""), "base64");
  if (enc === "quoted-printable") return decodeQuotedPrintable(body);
  return Buffer.from(body, "latin1"); // 7bit / 8bit / binary : octets bruts
}

/** Parcourt récursivement une partie MIME et collecte texte / HTML / pièces jointes. */
function walkPart(block: string, acc: Collected): void {
  const { head, body } = splitHeadersBody(block);
  const headers = parseHeaders(head);
  const ctype = headers.get("content-type") || "text/plain";
  const mime = ctype.split(";")[0].trim().toLowerCase();
  const disposition = headers.get("content-disposition") || "";
  const encoding = headers.get("content-transfer-encoding") || "";
  const filename = param(disposition, "filename") || param(ctype, "name");

  if (mime.startsWith("multipart/")) {
    const boundary = param(ctype, "boundary");
    if (!boundary) return;
    const marker = `--${boundary}`;
    const segments = body.split(marker);
    // Ignore le préambule (avant la 1re frontière) et l'épilogue (« --boundary-- »).
    for (const seg of segments.slice(1)) {
      if (seg.startsWith("--")) break; // frontière de clôture
      const part = seg.replace(/^\r?\n/, "");
      walkPart(part, acc);
    }
    return;
  }

  const isAttachment = /attachment/i.test(disposition) || (Boolean(filename) && !mime.startsWith("text/"));
  if (isAttachment && filename) {
    acc.attachments.push({ filename: decodeEncodedWords(filename), mime, content: decodeBody(body, encoding) });
    return;
  }

  const charset = param(ctype, "charset") || "utf-8";
  const decoded = decodeBuffer(decodeBody(body, encoding), charset);
  if (mime === "text/html") {
    if (acc.html === null) acc.html = decoded;
  } else if (acc.text === null) {
    acc.text = decoded;
  }
}

/** Analyse un e-mail .eml complet (Buffer ou chaîne) en structure exploitable. */
export function parseEml(raw: Buffer | string): ParsedEml {
  const text = typeof raw === "string" ? raw : raw.toString("latin1");
  const { head } = splitHeadersBody(text);
  const headers = parseHeaders(head);

  const acc: Collected = { text: null, html: null, attachments: [] };
  walkPart(text, acc);

  const from = parseAddress(headers.get("from") || "");
  const toAddr = parseAddress(headers.get("to") || "");
  const dateRaw = headers.get("date");
  let date: Date | null = null;
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (!Number.isNaN(d.getTime())) date = d;
  }

  const bodyText = (acc.text ?? (acc.html ? htmlToText(acc.html) : "")).replace(/\r\n/g, "\n").trim();

  return {
    subject: decodeEncodedWords(headers.get("subject") || "").trim(),
    from: from.name,
    fromEmail: from.email,
    to: toAddr.email || toAddr.name,
    date,
    text: bodyText,
    attachments: acc.attachments,
  };
}

/** Réf normalisée entre crochets dans un objet (ex. « [SOC-2026-0001] »), ou null. */
export function extractRefToken(subject: string): string | null {
  const m = subject.match(/\[([A-Za-z]{2,6}-(?:\d{4}-)?[0-9#]+)\]/);
  return m ? m[1].toUpperCase() : null;
}

/** Points clés dérivés du corps (lignes utiles, hors citations), au plus 6. */
export function bodyToPoints(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const t = raw.replace(/^\s*[-•*·▸>]+\s*/, "").trim();
    if (t.length > 3 && !/^>/.test(raw) && !/^--\s*$/.test(t)) out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}
