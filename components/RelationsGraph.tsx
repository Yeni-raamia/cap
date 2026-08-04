"use client";

import { useMemo } from "react";
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

interface Pos {
  x: number;
  y: number;
}

/** Disposition force-directed déterministe (Fruchterman-Reingold simplifié). */
function computeLayout(graph: Graph, centerId: string): Record<string, Pos> {
  const nodes = graph.nodes;
  const n = nodes.length;
  const pos: Record<string, { x: number; y: number }> = {};
  const cx = W / 2;
  const cy = H / 2;
  if (n === 0) return pos;
  // Initialisation déterministe sur un cercle (le centre au milieu).
  const R = Math.min(W, H) * 0.34;
  const others = nodes.filter((nd) => nd.id !== centerId);
  pos[centerId] = { x: cx, y: cy };
  others.forEach((nd, i) => {
    const a = (i / Math.max(1, others.length)) * Math.PI * 2;
    pos[nd.id] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });

  const k = Math.min(W, H) / Math.max(2, Math.sqrt(n)); // distance idéale
  const idsWithoutCenter = others.map((o) => o.id);
  for (let iter = 0; iter < 320; iter++) {
    const disp: Record<string, { x: number; y: number }> = {};
    for (const nd of nodes) disp[nd.id] = { x: 0, y: 0 };
    // Répulsion entre toutes les paires.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i].id;
        const b = nodes[j].id;
        let dx = pos[a].x - pos[b].x;
        let dy = pos[a].y - pos[b].y;
        let dist = Math.hypot(dx, dy) || 0.01;
        if (dist < 0.01) { dx = 0.5; dy = 0.5; dist = 0.71; }
        const rep = (k * k) / dist;
        const ux = (dx / dist) * rep;
        const uy = (dy / dist) * rep;
        disp[a].x += ux; disp[a].y += uy;
        disp[b].x -= ux; disp[b].y -= uy;
      }
    }
    // Attraction le long des liens.
    for (const e of graph.edges) {
      const dx = pos[e.source].x - pos[e.target].x;
      const dy = pos[e.source].y - pos[e.target].y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const att = (dist * dist) / k;
      const ux = (dx / dist) * att;
      const uy = (dy / dist) * att;
      disp[e.source].x -= ux; disp[e.source].y -= uy;
      disp[e.target].x += ux; disp[e.target].y += uy;
    }
    const temp = 30 * (1 - iter / 320) + 2; // refroidissement
    for (const id of idsWithoutCenter) {
      // Légère gravité vers le centre.
      disp[id].x += (cx - pos[id].x) * 0.02;
      disp[id].y += (cy - pos[id].y) * 0.02;
      const d = Math.hypot(disp[id].x, disp[id].y) || 0.01;
      pos[id].x += (disp[id].x / d) * Math.min(d, temp);
      pos[id].y += (disp[id].y / d) * Math.min(d, temp);
      pos[id].x = Math.max(40, Math.min(W - 40, pos[id].x));
      pos[id].y = Math.max(30, Math.min(H - 30, pos[id].y));
    }
    pos[centerId] = { x: cx, y: cy }; // centre épinglé
  }
  return pos;
}

const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function RelationsGraph({ graph, centerId, onSelect }: { graph: Graph; centerId: string; onSelect: (id: string) => void }) {
  const pos = useMemo(() => computeLayout(graph, centerId), [graph, centerId]);
  const deg = useMemo(() => degrees(graph), [graph]);

  if (graph.nodes.length === 0) {
    return <div className="grid place-items-center h-[420px] text-[13px] text-slate-400">Aucune relation à afficher.</div>;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[520px] select-none" role="img" aria-label="Graphe de relations">
      {/* Liens */}
      {graph.edges.map((e, i) => {
        const a = pos[e.source];
        const b = pos[e.target];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth={1} opacity={0.7} />;
      })}
      {/* Nœuds */}
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
