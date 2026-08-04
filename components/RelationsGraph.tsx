"use client";

import { useEffect, useRef, useState } from "react";
import { degrees, type Graph, type GraphNodeKind } from "@/lib/graph";

/** Couleur de bulle par type de nœud (palette dérivée du thème de l'app). */
export const NODE_COLOR: Record<GraphNodeKind, string> = {
  item: "#0ea5e9",
  project: "#6366f1",
  task: "#8b5cf6",
  negligence: "#f43f5e",
  nonconformite: "#eb6834",
  objective: "#10b981",
  meeting: "#f59e0b",
  member: "#0d9488",
  contact: "#64748b",
};
export const NODE_LABEL: Record<GraphNodeKind, string> = {
  item: "Suivi",
  project: "Projet",
  task: "Tâche",
  negligence: "Négligence",
  nonconformite: "Non-conformité",
  objective: "Objectif",
  meeting: "Réunion",
  member: "Membre",
  contact: "Contact",
};

const W = 900;
const H = 600;
// Constantes de la simulation ressort-électrique.
const REP = 5200; // répulsion
const SPRING = 0.035; // raideur des liens
const LEN = 115; // longueur idéale d'un lien
const GRAVITY = 0.022; // rappel vers le centre
const DAMP = 0.85; // amortissement
const MAXV = 16; // vitesse max / frame
const JITTER = 0.5; // « dandinement » permanent

interface P { x: number; y: number; vx: number; vy: number }
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Un pas de simulation (met à jour `pos` en place). */
function step(graph: Graph, pos: Record<string, P>, centerId: string) {
  const nodes = graph.nodes;
  const cx = W / 2, cy = H / 2;
  const fx: Record<string, number> = {};
  const fy: Record<string, number> = {};
  for (const n of nodes) { fx[n.id] = 0; fy[n.id] = 0; }

  // Répulsion entre toutes les paires.
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = pos[nodes[i].id], b = pos[nodes[j].id];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const d = Math.sqrt(d2);
      const f = REP / d2;
      const ux = (dx / d) * f, uy = (dy / d) * f;
      fx[nodes[i].id] += ux; fy[nodes[i].id] += uy;
      fx[nodes[j].id] -= ux; fy[nodes[j].id] -= uy;
    }
  }
  // Ressorts le long des liens.
  for (const e of graph.edges) {
    const s = pos[e.source], t = pos[e.target];
    if (!s || !t) continue;
    const dx = s.x - t.x, dy = s.y - t.y;
    const d = Math.hypot(dx, dy) || 0.01;
    const f = SPRING * (d - LEN);
    const ux = (dx / d) * f, uy = (dy / d) * f;
    fx[e.source] -= ux; fy[e.source] -= uy;
    fx[e.target] += ux; fy[e.target] += uy;
  }
  // Intégration (le centre reste épinglé au milieu).
  for (const n of nodes) {
    if (n.id === centerId) { pos[n.id] = { x: cx, y: cy, vx: 0, vy: 0 }; continue; }
    const p = pos[n.id];
    const ax = fx[n.id] + (cx - p.x) * GRAVITY + (Math.random() - 0.5) * JITTER;
    const ay = fy[n.id] + (cy - p.y) * GRAVITY + (Math.random() - 0.5) * JITTER;
    p.vx = clamp((p.vx + ax) * DAMP, -MAXV, MAXV);
    p.vy = clamp((p.vy + ay) * DAMP, -MAXV, MAXV);
    p.x = clamp(p.x + p.vx, 40, W - 40);
    p.y = clamp(p.y + p.vy, 28, H - 28);
  }
}

const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function RelationsGraph({ graph, centerId, onSelect }: { graph: Graph; centerId: string; onSelect: (id: string) => void }) {
  const posRef = useRef<Record<string, P>>({});
  const rafRef = useRef(0);
  const [pos, setPos] = useState<Record<string, P>>({});

  // (Ré)initialisation des positions + boucle d'animation quand le graphe change.
  useEffect(() => {
    const cx = W / 2, cy = H / 2;
    const others = graph.nodes.filter((n) => n.id !== centerId);
    const R = Math.min(W, H) * 0.32;
    const p: Record<string, P> = {};
    p[centerId] = { x: cx, y: cy, vx: 0, vy: 0 };
    others.forEach((n, i) => {
      const a = (i / Math.max(1, others.length)) * Math.PI * 2;
      p[n.id] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: 0, vy: 0 };
    });
    posRef.current = p;
    setPos({ ...p });
    cancelAnimationFrame(rafRef.current);
    const loop = () => {
      step(graph, posRef.current, centerId);
      setPos({ ...posRef.current }); // nouvelle référence → rendu (positions animées)
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, centerId]);

  const deg = degrees(graph);

  if (graph.nodes.length === 0) {
    return <div className="grid place-items-center h-[420px] text-[13px] text-slate-400">Aucune relation à afficher.</div>;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[520px] select-none" role="img" aria-label="Graphe de relations">
      {graph.edges.map((e, i) => {
        const a = pos[e.source], b = pos[e.target];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth={1} opacity={0.7} />;
      })}
      {graph.nodes.map((nd) => {
        const p = pos[nd.id];
        if (!p) return null;
        const isCenter = nd.id === centerId;
        const r = isCenter ? 16 : Math.max(7, Math.min(14, 6 + (deg.get(nd.id) ?? 0)));
        const color = NODE_COLOR[nd.kind];
        return (
          <g key={nd.id} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" onClick={() => onSelect(nd.id)}>
            <title>{`${NODE_LABEL[nd.kind]} · ${nd.label}`}</title>
            {isCenter && <circle r={r + 5} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />}
            <circle r={r} fill={color} stroke="#fff" strokeWidth={2} />
            <text
              y={r + 12}
              textAnchor="middle"
              fontSize={isCenter ? 13 : 11}
              fontWeight={isCenter ? 700 : 500}
              fill="#334155"
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
            >
              {short(nd.label, isCenter ? 34 : 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
