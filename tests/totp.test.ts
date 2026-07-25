import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  verifyTotp,
  otpauthUrl,
  generateBackupCodes,
  hashBackupCodes,
  consumeBackupCode,
} from "@/lib/auth/totp";

/** Réimplémentation locale de HOTP pour fabriquer un code valide dans le test. */
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
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

describe("base32", () => {
  it("fait un aller-retour exact sur des tailles alignées", () => {
    const buf = Buffer.from([1, 2, 3, 4, 5]); // 40 bits → 8 caractères, sans perte
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
  it("décode en tolérant minuscules et espaces", () => {
    const enc = base32Encode(Buffer.from([255, 0, 128, 64, 32]));
    const spaced = enc.toLowerCase().replace(/(.{4})/g, "$1 ").trim();
    expect(base32Decode(spaced).equals(base32Decode(enc))).toBe(true);
  });
});

describe("generateTotpSecret", () => {
  it("produit un secret base32 de 32 caractères (160 bits)", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });
});

describe("verifyTotp", () => {
  it("accepte le code courant calculé pour le secret", () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 30000);
    const code = hotp(base32Decode(secret), counter);
    expect(verifyTotp(secret, code)).toBe(true);
  });
  it("accepte un code décalé d'un pas (tolérance d'horloge)", () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 30000);
    expect(verifyTotp(secret, hotp(base32Decode(secret), counter - 1))).toBe(true);
  });
  it("rejette un code hors fenêtre", () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 30000);
    expect(verifyTotp(secret, hotp(base32Decode(secret), counter + 100))).toBe(false);
  });
  it("rejette un format invalide (longueur ou non numérique)", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
    expect(verifyTotp(secret, "")).toBe(false);
  });
});

describe("otpauthUrl", () => {
  it("construit une URL otpauth conforme", () => {
    const url = otpauthUrl("JBSWY3DPEHPK3PXP", "yeni@dssi.local");
    expect(url).toMatch(/^otpauth:\/\/totp\/Cap%3Ayeni%40dssi\.local\?/);
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("issuer=Cap");
    expect(url).toContain("period=30");
  });
});

describe("codes de secours", () => {
  it("génère n codes au format XXXX-XXXX", () => {
    const codes = generateBackupCodes(4);
    expect(codes).toHaveLength(4);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
  });

  it("consomme un code valide une seule fois et le retire du lot", () => {
    const codes = generateBackupCodes(3);
    const stored = hashBackupCodes(codes);

    const after = consumeBackupCode(stored, codes[0]);
    expect(after).not.toBeNull();
    expect(JSON.parse(after as string)).toHaveLength(2);

    // Le même code ne peut plus être réutilisé sur le lot mis à jour.
    expect(consumeBackupCode(after, codes[0])).toBeNull();
  });

  it("normalise la saisie (minuscules, sans tiret)", () => {
    const codes = generateBackupCodes(2);
    const stored = hashBackupCodes(codes);
    const messy = codes[0].toLowerCase().replace("-", "");
    expect(consumeBackupCode(stored, messy)).not.toBeNull();
  });

  it("rejette un code inconnu ou un lot absent", () => {
    const stored = hashBackupCodes(generateBackupCodes(2));
    expect(consumeBackupCode(stored, "ZZZZ-ZZZZ")).toBeNull();
    expect(consumeBackupCode(null, "ABCD-EFGH")).toBeNull();
  });
});
