import { describe, it, expect } from "vitest";
import { parseEml, decodeEncodedWords, extractRefToken, bodyToPoints } from "@/lib/email/eml";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

describe("parseEml — e-mail simple", () => {
  const eml = [
    "From: Jean Dupont <jean@dssi.local>",
    "To: paul@presta.fr",
    "Subject: Incident reseau",
    "Date: Wed, 22 Jul 2026 10:15:00 +0000",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Bonjour,",
    "Voici le point a traiter.",
  ].join("\r\n");

  it("extrait en-têtes, adresses et corps", () => {
    const p = parseEml(eml);
    expect(p.subject).toBe("Incident reseau");
    expect(p.from).toBe("Jean Dupont");
    expect(p.fromEmail).toBe("jean@dssi.local");
    expect(p.to).toBe("paul@presta.fr");
    expect(p.date).toBeInstanceOf(Date);
    expect(p.text).toContain("Voici le point a traiter.");
    expect(p.attachments).toHaveLength(0);
  });
});

describe("décodage des en-têtes (RFC 2047)", () => {
  it("décode un objet encodé en base64 UTF-8", () => {
    const eml = `Subject: =?UTF-8?B?${b64("Réunion sécurité")}?=\r\nContent-Type: text/plain\r\n\r\ncorps`;
    expect(parseEml(eml).subject).toBe("Réunion sécurité");
  });
  it("décode un objet encodé en quoted-printable", () => {
    expect(decodeEncodedWords("=?UTF-8?Q?R=C3=A9union_s=C3=A9curit=C3=A9?=")).toBe("Réunion sécurité");
  });
  it("décode un nom d'expéditeur encodé", () => {
    const eml = `From: =?UTF-8?B?${b64("Amélie Léger")}?= <amelie@dssi.local>\r\n\r\ncorps`;
    const p = parseEml(eml);
    expect(p.from).toBe("Amélie Léger");
    expect(p.fromEmail).toBe("amelie@dssi.local");
  });
});

describe("encodages de transfert", () => {
  it("décode un corps quoted-printable", () => {
    const eml = [
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "Caf=C3=A9 et t=C3=A9l=C3=A9phone",
    ].join("\r\n");
    expect(parseEml(eml).text).toContain("Café et téléphone");
  });
});

describe("MIME multipart", () => {
  it("préfère la partie texte à la partie HTML (alternative)", () => {
    const eml = [
      'Content-Type: multipart/alternative; boundary="B"',
      "",
      "--B",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Version texte brut",
      "--B",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>Version HTML</p>",
      "--B--",
    ].join("\r\n");
    const p = parseEml(eml);
    expect(p.text).toContain("Version texte brut");
    expect(p.text).not.toContain("Version HTML");
  });

  it("extrait une pièce jointe encodée en base64", () => {
    const data = "PDF-CONTENT-PREUVE";
    const eml = [
      'Content-Type: multipart/mixed; boundary="M"',
      "",
      "--M",
      "Content-Type: text/plain",
      "",
      "Corps du message",
      "--M",
      'Content-Type: application/pdf; name="preuve.pdf"',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: attachment; filename="preuve.pdf"',
      "",
      Buffer.from(data, "utf8").toString("base64"),
      "--M--",
    ].join("\r\n");
    const p = parseEml(eml);
    expect(p.text).toContain("Corps du message");
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments[0].filename).toBe("preuve.pdf");
    expect(p.attachments[0].mime).toBe("application/pdf");
    expect(p.attachments[0].content.toString("utf8")).toBe(data);
  });

  it("bascule sur le HTML converti en texte si aucune partie texte", () => {
    const eml = [
      "Content-Type: text/html; charset=utf-8",
      "",
      "<html><body><p>Bonjour</p><p>Merci de votre retour</p></body></html>",
    ].join("\r\n");
    const p = parseEml(eml);
    expect(p.text).toContain("Bonjour");
    expect(p.text).toContain("Merci de votre retour");
    expect(p.text).not.toContain("<p>");
  });
});

describe("extractRefToken", () => {
  it("récupère la référence entre crochets", () => {
    expect(extractRefToken("[SOC-2026-0001] SIGNAL — Incident")).toBe("SOC-2026-0001");
    expect(extractRefToken("Re: [case-42] réponse")).toBe("CASE-42");
  });
  it("renvoie null sans référence", () => {
    expect(extractRefToken("Un objet sans référence")).toBeNull();
  });
});

describe("bodyToPoints", () => {
  it("retient les lignes utiles, retire puces et citations, plafonne à 6", () => {
    const text = ["- Premier point important", "> citation ignorée", "ok", "Deuxième point important"].join("\n");
    const pts = bodyToPoints(text);
    expect(pts).toContain("Premier point important");
    expect(pts).toContain("Deuxième point important");
    expect(pts).not.toContain("citation ignorée");
    expect(pts).not.toContain("ok"); // trop court
  });
});
