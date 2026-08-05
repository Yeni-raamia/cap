import { describe, it, expect } from "vitest";
import { computeRadar, RADAR_DIMENSIONS } from "@/lib/domain";
import { mkItem, mkTask, mkProject, mkProjectTask } from "./factories";

const NOW = new Date("2026-08-01T00:00:00Z");
const IDX = Object.fromEntries(RADAR_DIMENSIONS.map((d, i) => [d.key, i])) as Record<string, number>;

describe("computeRadar", () => {
  it("normalise chaque axe à 0–100, le meilleur de l'équipe = 100", () => {
    const items = [
      // u1 : 2 clôtures + 1 réponse + 3 relances
      mkItem({ id: "a", ownerId: "u1", statut: "Clôturé" }),
      mkItem({ id: "b", ownerId: "u1", statut: "Clôturé", relancesCount: 3, timeline: [{ date: NOW, kind: "reponse", label: "", author: "" }] }),
      // u2 : rien de notable
      mkItem({ id: "c", ownerId: "u2" }),
    ];
    const tasks = [mkTask({ id: "t1", assigneeId: "u1", status: "fait" })];
    const r = computeRadar(["u1", "u2"], items, tasks, [], NOW);

    // u1 est le meilleur sur clôtures/réponses/réactivité/tâches → 100 ; u2 → 0
    expect(r.byMember.u1[IDX.clotures]).toBe(100);
    expect(r.byMember.u1[IDX.reponses]).toBe(100);
    expect(r.byMember.u1[IDX.reactivite]).toBe(100);
    expect(r.byMember.u1[IDX.taches]).toBe(100);
    expect(r.byMember.u2[IDX.clotures]).toBe(0);
    // Toutes les valeurs restent dans [0,100].
    for (const id of ["u1", "u2"]) for (const v of r.byMember[id]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
  });

  it("ponctualité est inversée : le plus d'escalades = 0, aucune = 100", () => {
    // Type ALERTE a un SLA d'escalade court ; date ancienne → escalade.
    const items = [
      mkItem({ id: "e1", ownerId: "u1", type: "ALERTE", statut: "Envoyé", dateMaj: new Date("2026-01-01T00:00:00Z") }),
      mkItem({ id: "e2", ownerId: "u1", type: "ALERTE", statut: "Envoyé", dateMaj: new Date("2026-01-01T00:00:00Z") }),
      mkItem({ id: "ok", ownerId: "u2", type: "INFO", statut: "Envoyé" }),
    ];
    const r = computeRadar(["u1", "u2"], items, [], [], NOW);
    expect(r.byMember.u1[IDX.ponctualite]).toBe(0); // le plus d'escalades
    expect(r.byMember.u2[IDX.ponctualite]).toBe(100); // aucune escalade
  });

  it("agrège l'avancement des projets portés et calcule la moyenne d'équipe", () => {
    const projects = [
      mkProject({
        id: "p1",
        ownerId: "u1",
        memberIds: ["u1"],
        tasks: [mkProjectTask({ id: "pt1", projectId: "p1", status: "fait" }), mkProjectTask({ id: "pt2", projectId: "p1", status: "à faire" })],
      }),
    ];
    const r = computeRadar(["u1", "u2"], [], [], projects, NOW);
    // u1 porte un projet à 50 % → meilleur = 100 ; u2 sans projet → 0.
    expect(r.byMember.u1[IDX.projets]).toBe(100);
    expect(r.byMember.u2[IDX.projets]).toBe(0);
    // Moyenne d'équipe = moyenne des deux membres, dans [0,100].
    expect(r.average[IDX.projets]).toBe(50);
  });
});
