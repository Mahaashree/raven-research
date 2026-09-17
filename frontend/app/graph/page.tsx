"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { KnowledgeGraph } from "@/lib/types";
import GraphCanvas, { RELATION_COLOR } from "@/components/GraphCanvas";
import Mascot from "@/components/Mascot";
import { Input } from "@/components/ui";
import { SearchIcon } from "@/components/icons";

const LEGEND: { label: string; type: keyof typeof RELATION_COLOR }[] = [
  { label: "Primary Nexus", type: "supports" },
  { label: "Cross-Field Synthesis", type: "extends" },
  { label: "Same-Board Link", type: "contradicts" },
];

export default function GraphPage() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);

  useEffect(() => {
    api.knowledgeGraph().then(setGraph);
  }, []);

  const isEmpty = graph !== null && graph.edges.length === 0;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl">Constellation View</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-blue/40 text-blue">
            <span className="w-1.5 h-1.5 rounded-full bg-blue" />
            Live synthesis active
          </span>
        </div>
        <div className="relative w-72">
          <SearchIcon className="w-4 h-4 text-warm absolute left-3 top-1/2 -translate-y-1/2" />
          <Input placeholder="Search knowledge..." className="pl-9 w-full" />
        </div>
      </div>

      <div className="relative flex-1 min-h-0 border border-warm/25 rounded-md overflow-hidden">
        {graph === null ? (
          <p className="text-sm text-warm p-6">Loading…</p>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Mascot pose="empty" size="lg" />
            <p className="text-sm text-warm mt-4 max-w-xs">
              No relations yet. Save a few items and run &ldquo;Find relations&rdquo; from an
              item page.
            </p>
          </div>
        ) : (
          <>
            <GraphCanvas graph={graph} />

            <div className="absolute top-4 right-4 flex flex-col gap-3 pointer-events-none">
              <div className="bg-surface/90 border border-warm/25 rounded-md px-4 py-3 backdrop-blur-sm">
                <div className="font-display text-2xl text-ochre">{graph.stats.total_nodes}</div>
                <div className="text-[10px] tracking-wider uppercase text-warm mt-0.5">
                  Total nodes
                </div>
              </div>
              <div className="bg-surface/90 border border-warm/25 rounded-md px-4 py-3 backdrop-blur-sm">
                <div className="font-display text-2xl text-blue">{graph.stats.rabbit_holes}</div>
                <div className="text-[10px] tracking-wider uppercase text-warm mt-0.5">
                  Rabbit holes
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-surface/90 border border-warm/25 rounded-md px-4 py-3 backdrop-blur-sm">
              <div className="text-[10px] tracking-wider uppercase text-warm mb-2">Map legend</div>
              <div className="flex flex-col gap-1.5">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-2 text-xs text-cream/80">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RELATION_COLOR[l.type] }}
                    />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/90 border border-warm/25 rounded-md px-5 py-2.5 backdrop-blur-sm flex items-center gap-6 text-xs">
              <span className="text-cream/80">
                <span className="text-ochre font-medium">{graph.stats.rabbit_holes}</span> rabbit holes
              </span>
              <span className="text-cream/80">
                <span className="text-blue font-medium">{graph.edges.length}</span> active synthesis
              </span>
              <span className="text-cream/80">
                <span className="text-warm font-medium">{graph.stats.archived}</span> archived
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
