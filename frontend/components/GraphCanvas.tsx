"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ForceGraphMethods } from "react-force-graph-2d";
import type { KnowledgeGraph, RelationType } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// Edge color keyed to relation_type — mirrors the bottom-left legend
// (Primary Nexus / Cross-Field Synthesis / Same-Board Link).
export const RELATION_COLOR: Record<RelationType, string> = {
  supports: "#EF9F27", // ochre — Primary Nexus
  extends: "#9B87C4", // purple — Cross-Field Synthesis
  contradicts: "#37BBF8", // blue — Same-Board Link
};

interface GraphNodeDatum {
  id: string;
  label: string;
  connections: number;
}

interface GraphLinkDatum {
  source: string;
  target: string;
  relation_type: RelationType;
}

function truncate(label: string, max: number) {
  return label.length > max ? label.slice(0, max) + "…" : label;
}

export default function GraphCanvas({ graph }: { graph: KnowledgeGraph }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<ForceGraphMethods<any, any> | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const maxConnections = Math.max(1, ...graph.nodes.map((n) => n.connections));

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let settleTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      const fg = fgRef.current;
      if (cancelled) return;
      if (!fg) return;
      clearInterval(interval);
      fg.d3Force("charge")?.strength(-220);
      fg.d3Force("link")?.distance(150);
      settleTimeout = setTimeout(() => {
        if (!cancelled) fgRef.current?.zoomToFit(400, 80);
      }, 1000);
    }, 50);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (settleTimeout) clearTimeout(settleTimeout);
    };
  }, [graph]);

  const data = {
    nodes: graph.nodes.map((n) => ({ id: n.id, label: n.label, connections: n.connections })),
    links: graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation_type: e.relation_type,
    })),
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        backgroundColor="#0D0D0F"
        nodeId="id"
        nodeLabel={(n) => (n as GraphNodeDatum).label}
        nodeRelSize={5}
        linkColor={(l) => RELATION_COLOR[(l as GraphLinkDatum).relation_type] ?? "#80756A"}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkLabel={(l) => (l as GraphLinkDatum).relation_type}
        onNodeClick={(n) => router.push(`/items/${(n as GraphNodeDatum).id}`)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNodeDatum & { x: number; y: number };
          // Size + color reflect connection count: primary/well-connected
          // nodes render larger and in ochre, everything else muted.
          const isPrimary = n.connections >= Math.max(2, maxConnections * 0.6);
          const radius = 4 + (n.connections / maxConnections) * 4;

          ctx.beginPath();
          ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = isPrimary ? "#EF9F27" : "#80756A";
          ctx.fill();
          if (isPrimary) {
            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeStyle = "#EF9F27";
            ctx.beginPath();
            ctx.arc(n.x, n.y, radius + 3, 0, 2 * Math.PI, false);
            ctx.stroke();
          }

          const fontSize = 11 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(242, 236, 224, 0.75)";
          ctx.fillText(truncate(n.label, 26), n.x, n.y + radius + 3);
        }}
      />
    </div>
  );
}
