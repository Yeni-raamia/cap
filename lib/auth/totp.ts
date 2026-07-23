/* ==================================================================
 *  lib/auth/totp.ts — Double authentification TOTP (RFC 6238) et codes
 *  de secours, sans aucune dépendance (node:crypto uniquement).
 * ================================================================== */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode un buffer en base32 (RFC 4648, sans remplissage). */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Décode une chaîne base32 (tolère espaces et minuscules). */
export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Génère un secret TOTP (base32, 20 octets ≈ 160 bits). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Calcule le code TOTP à 6 chiffres pour un pas de temps donné. */
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // Compteur 64 bits big-endian (le temps tient sur 32 bits bas).
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

/**
 * Vérifie un code TOTP à 6 chiffres, avec une fenêtre de tolérance
 * (±1 pas de 30 s pour absorber les décalages d'horloge).
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const code = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000);
  for (let w = -window; w <= window; w++) {
    const expected = hotp(key, counter + w);
    // Comparaison à temps constant.
    const a = Buffer.from(expected);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** URL otpauth:// pour l'enrôlement (QR ou saisie manuelle). */
export function otpauthUrl(secret: string, email: string, issuer = "Cap"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ---------- Codes de secours (usage unique) ---------- */

/** Génère n codes de secours lisibles (format XXXX-XXXX). */
export function generateBackupCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Hache un lot de codes de secours (stockage). */
export function hashBackupCodes(codes: string[]): string {
  const hashed = codes.map((c) => {
    const salt = randomBytes(8);
    const h = scryptSync(normalizeCode(c), salt, 32);
    return `${salt.toString("hex")}:${h.toString("hex")}`;
  });
  return JSON.stringify(hashed);
}

/**
 * Vérifie un code de secours contre le lot stocké. Renvoie le lot mis à jour
 * (code consommé retiré) si le code est valide, sinon null.
 */
export function consumeBackupCode(stored: string | null, code: string): string | null {
  if (!stored) return null;
  let list: string[];
  try {
    list = JSON.parse(stored) as string[];
  } catch {
    return null;
  }
  const norm = normalizeCode(code);
  const idx = list.findIndex((entry) => {
    const [saltHex, hashHex] = entry.split(":");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(norm, Buffer.from(saltHex, "hex"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (idx < 0) return null;
  list.splice(idx, 1);
  return JSON.stringify(list);
}
