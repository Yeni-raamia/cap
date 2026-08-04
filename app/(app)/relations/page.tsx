"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Search, Share2 } from "lucide-react";
import { buildGraph, egoSubgraph, type GraphNode } from "@/lib/graph";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";
import { NODE_COLOR, NODE_LABEL, RelationsGraph } from "@/components/RelationsGraph";

export default function RelationsPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-slate-400 py-10 text-center">Chargement du graphe…</div>}>
      <RelationsInner />
    </Suspense>
  );
}

function RelationsInner() {
  const { items, projects, tasks, negligences, nonConformites, objectives, meetings, profiles, contacts, openItem } = useApp();
  const searchParams = useSearchParams();

  const graph = useMemo(
    () => buildGraph({ items, projects, tasks, negligences, nonConformites, objectives, meetings, profiles, contacts }),
    [items, projects, tasks, negligences, nonConformites, objectives, meetings, profiles, contacts]
  );
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  const [center, setCenter] = useState<string>("");
  const [depth, setDepth] = useState(1);
  const [q, setQ] = useState("");

  // Nœud de départ : paramètre ?node=kind:id, sinon le mieux connecté.
  useEffect(() => {
    const param = searchParams.get("node");
    if (param && byId.has(param)) {
      setCenter(param);
      return;
    }
    if (!center || !byId.has(center)) {
      const best = [...graph.nodes].sort(
        (a, b) => graph.edges.filter((e) => e.source === b.id || e.target === b.id).length -
          graph.edges.filter((e) => e.source === a.id || e.target === a.id).length
      )[0];
      if (best) setCenter(best.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, graph]);

  const ego = useMemo(() => (center ? egoSubgraph(graph, center, depth) : { nodes: [], edges: [] }), [graph, center, depth]);
  const centerNode = center ? byId.get(center) : undefined;

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? graph.nodes.filter((n) => n.label.toLowerCase().includes(s)) : graph.nodes;
    return list.slice(0, 40);
  }, [graph, q]);

  const openNode = (n: GraphNode) => {
    if (n.kind === "item") {
      const it = items.find((i) => i.id === n.rawId);
      if (it) openItem(it);
      return null;
    }
    return (
      {
        project: `/projets/${n.rawId}`,
        task: "/productivite",
        negligence: `/negligences/${n.rawId}`,
        nonconformite: `/non-conformites/${n.rawId}`,
        objective: "/plan",
        meeting: `/reunions/${n.rawId}`,
        member: `/membre/${n.rawId}`,
        contact: "/contacts",
      } as Record<string, string>
    )[n.kind];
  };

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Connaissance"
        icon={Share2}
        title="Relations"
        subtitle="Le graphe de tout ce qui est relié — réunions, suivis, projets, tâches, négligences, non-conformités, objectifs et personnes. Choisissez un sujet ou une personne au centre, puis cliquez une bulle pour explorer."
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Sélecteur de nœud + légende */}
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Search size={15} className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un nœud de départ…" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1" />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {matches.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setCenter(n.id)}
                  className={`w-full flex items-center gap-2 text-left px-1.5 py-1.5 text-[12px] hover:bg-slate-50 ${n.id === center ? "bg-emerald-50" : ""}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: NODE_COLOR[n.kind] }} />
                  <span className="flex-1 truncate text-slate-700">{n.label}</span>
                </button>
              ))}
              {matches.length === 0 && <div className="text-[12px] text-slate-400 py-2 text-center">Aucun nœud.</div>}
            </div>
          </Card>

          <Card className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Légende</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(NODE_LABEL) as (keyof typeof NODE_LABEL)[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR[k] }} />
                  {NODE_LABEL[k]}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Graphe */}
        <Card className="p-2">
          <div className="flex items-center justify-between gap-2 px-2 pt-1 flex-wrap">
            <div className="text-[12px] text-slate-500">
              {centerNode ? (
                <>Centré sur <b className="text-slate-800">{centerNode.label}</b> · {ego.nodes.length - 1} relation(s)</>
              ) : "Sélectionnez un nœud"}
            </div>
            <div className="flex items-center gap-2">
              {centerNode && (() => {
                const href = openNode(centerNode);
                return href ? (
                  <Link href={href} className="inline-flex items-center gap-1 text-[12px] text-emerald-700 hover:underline"><ExternalLink size={12} /> Ouvrir la fiche</Link>
                ) : centerNode.kind === "item" ? (
                  <button onClick={() => openNode(centerNode)} className="inline-flex items-center gap-1 text-[12px] text-emerald-700 hover:underline"><ExternalLink size={12} /> Ouvrir le suivi</button>
                ) : null;
              })()}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[11px]">
                {[1, 2].map((d) => (
                  <button key={d} onClick={() => setDepth(d)} className={`px-2 py-0.5 rounded-md font-medium ${depth === d ? "bg-emerald-600 text-white" : "text-slate-500"}`}>
                    Profondeur {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {center && <RelationsGraph graph={ego} centerId={center} onSelect={setCenter} />}
        </Card>
      </div>
    </div>
  );
}
