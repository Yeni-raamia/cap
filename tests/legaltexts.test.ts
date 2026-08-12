/* Registre des textes légaux : conversion en référentiel évaluable, et
 * persistance sur une base SQLite jetable. */
import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isLegalAssessable, legalFrameworkId, isLegalFrameworkId, legalTextIdOf, type LegalText } from "@/lib/domain";
import { allFrameworks, FRAMEWORKS, legalTextToFramework } from "@/lib/grc/frameworks";

process.env.DATABASE_PATH = join(tmpdir(), `cap-lex-${randomUUID()}.sqlite`);

let repo: typeof import("@/lib/db/legaltexts");
beforeAll(async () => {
  repo = await import("@/lib/db/legaltexts");
});

const NOW = new Date(2026, 2, 11);
const mk = (o: Partial<LegalText> = {}): LegalText => ({
  id: "l1", ref: "LEX-2026-001", name: "Protection des données", kind: "Loi",
  authority: "Parlement", reference: "2024-123", publishedAt: NOW, effectiveAt: NOW,
  url: "", description: "", scope: "", status: "En vigueur", applicable: true,
  articles: [
    { code: "Art. 5", title: "Licéité", requirement: "Traiter licitement", group: "Principes" },
    { code: "Art. 32", title: "Sécurité", requirement: "Mesures appropriées", group: "Obligations" },
  ],
  ownerId: "u1", reviewDate: null, createdBy: "u1", createdAt: NOW, updatedAt: NOW, ...o,
});

describe("identifiants de référentiel", () => {
  it("préfixe pour ne jamais heurter un référentiel du code", () => {
    const id = legalFrameworkId("abc");
    expect(id).toBe("loi:abc");
    expect(isLegalFrameworkId(id)).toBe(true);
    expect(legalTextIdOf(id)).toBe("abc");
    expect(FRAMEWORKS.some((f) => f.id === id)).toBe(false);
  });
  it("ne prend pas un référentiel du code pour une loi", () => {
    expect(isLegalFrameworkId("iso27001")).toBe(false);
  });
});

describe("isLegalAssessable", () => {
  it("évalue un texte applicable, en vigueur et doté d'articles", () => {
    expect(isLegalAssessable(mk())).toBe(true);
  });
  it("écarte un texte hors périmètre, abrogé, ou sans article", () => {
    expect(isLegalAssessable(mk({ applicable: false }))).toBe(false);
    expect(isLegalAssessable(mk({ status: "Abrogé" }))).toBe(false);
    expect(isLegalAssessable(mk({ articles: [] }))).toBe(false);
  });
});

describe("legalTextToFramework", () => {
  it("transforme les articles en mesures et les chapitres en thèmes", () => {
    const f = legalTextToFramework(mk());
    expect(f.controls.map((c) => c.code)).toEqual(["Art. 5", "Art. 32"]);
    expect(f.groups).toEqual(["Principes", "Obligations"]);
    expect(f.name).toContain("Loi");
  });
  it("garde l'ordre de saisie des chapitres, sans doublon", () => {
    const f = legalTextToFramework(
      mk({
        articles: [
          { code: "a", title: "", requirement: "", group: "B" },
          { code: "b", title: "", requirement: "", group: "A" },
          { code: "c", title: "", requirement: "", group: "B" },
        ],
      })
    );
    expect(f.groups).toEqual(["B", "A"]);
  });
  it("se replie sur le repère quand l'article n'a pas d'intitulé", () => {
    const f = legalTextToFramework(mk({ articles: [{ code: "Art. 1", title: "", requirement: "", group: "G" }] }));
    expect(f.controls[0].title).toBe("Art. 1");
  });
});

describe("allFrameworks", () => {
  it("ajoute les textes évaluables après les référentiels du code", () => {
    const all = allFrameworks([mk()]);
    expect(all.length).toBe(FRAMEWORKS.length + 1);
    expect(all.at(-1)!.id).toBe("loi:l1");
  });
  it("n'ajoute pas les textes non évaluables", () => {
    expect(allFrameworks([mk({ articles: [] })]).length).toBe(FRAMEWORKS.length);
  });
});

describe("persistance", () => {
  it("enregistre un texte et ses articles", () => {
    const id = repo.createLegalText({
      name: "Loi cybersécurité",
      kind: "Loi",
      reference: "2025-7",
      articles: [{ code: "Art. 3", title: "Notification", requirement: "Notifier sous 72 h", group: "Incidents" }],
      createdBy: "u1",
    });
    const t = repo.getLegalText(id)!;
    expect(t.name).toBe("Loi cybersécurité");
    expect(t.ref).toMatch(/^LEX-\d{4}-\d{3}$/);
    expect(t.articles.length).toBe(1);
    expect(t.articles[0].code).toBe("Art. 3");
  });

  it("écarte les articles sans repère et les repères en double", () => {
    // Le repère sert de clé d'évaluation : sans lui, l'article est inexploitable,
    // et deux fois le même ferait collision dans le tableau de conformité.
    const id = repo.createLegalText({
      name: "Texte bancal",
      articles: [
        { code: "Art. 1", title: "A", requirement: "", group: "G" },
        { code: "  ", title: "Sans repère", requirement: "", group: "G" },
        { code: "Art. 1", title: "Doublon", requirement: "", group: "G" },
      ],
      createdBy: "u1",
    });
    const t = repo.getLegalText(id)!;
    expect(t.articles.length).toBe(1);
    expect(t.articles[0].title).toBe("A");
  });

  it("se replie sur une nature et un statut connus", () => {
    const id = repo.createLegalText({ name: "X", kind: "n'importe quoi", status: "inventé", createdBy: "u1" });
    const t = repo.getLegalText(id)!;
    expect(t.kind).toBe("Loi");
    expect(t.status).toBe("En vigueur");
  });

  it("donne un chapitre par défaut à un article qui n'en a pas", () => {
    const id = repo.createLegalText({
      name: "Y",
      articles: [{ code: "Art. 9", title: "", requirement: "", group: "" }],
      createdBy: "u1",
    });
    expect(repo.getLegalText(id)!.articles[0].group).toBe("Dispositions générales");
  });

  it("ne modifie que les champs fournis", () => {
    const id = repo.createLegalText({ name: "Z", authority: "Ministère", createdBy: "u1" });
    repo.updateLegalText(id, { status: "Abrogé" });
    const t = repo.getLegalText(id)!;
    expect(t.status).toBe("Abrogé");
    expect(t.authority).toBe("Ministère");
  });

  it("supprime le texte et ne le retrouve plus", () => {
    const id = repo.createLegalText({ name: "À supprimer", createdBy: "u1" });
    repo.deleteLegalText(id);
    expect(repo.getLegalText(id)).toBeNull();
  });
});
