import type { ClaimVerdict, RelationType } from "@/lib/types";
import { Badge } from "./ui";

// Mirrors the status-badge language: filled ochre for the positive read,
// filled warm (muted) for the negative one, quiet outline for the
// in-between case — rather than inventing a separate color system.
const VERDICT_CONFIG: Record<ClaimVerdict, { label: string; tone: "filled-ochre" | "filled-warm" | "neutral" }> = {
  supported: { label: "Supported", tone: "filled-ochre" },
  partially_supported: { label: "Partially supported", tone: "neutral" },
  unsupported: { label: "Unsupported", tone: "filled-warm" },
};

export function VerdictBadge({ verdict }: { verdict: ClaimVerdict }) {
  const config = VERDICT_CONFIG[verdict];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const RELATION_CONFIG: Record<RelationType, { label: string; tone: "filled-ochre" | "filled-warm" | "neutral" }> = {
  supports: { label: "Supports", tone: "filled-ochre" },
  contradicts: { label: "Contradicts", tone: "filled-warm" },
  extends: { label: "Extends", tone: "neutral" },
};

export function RelationBadge({ type }: { type: RelationType }) {
  const config = RELATION_CONFIG[type];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
