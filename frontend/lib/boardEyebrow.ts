import type { Item } from "./types";
import { tagCategory } from "./tagColors";

export function boardEyebrow(item: Item): { label: string; colorKey: "ochre" | "purple" | "blue" | "warm" } {
  if (item.status === "pending") return { label: "New Entry", colorKey: "warm" };
  if (item.status === "failed") return { label: "Failed", colorKey: "warm" };

  const hasPriorityTag = (item.tags ?? []).some((t) => tagCategory(t) === "ochre");
  if (hasPriorityTag) return { label: "High Priority", colorKey: "ochre" };

  if (item.reading_status === "active") return { label: "Active Discovery", colorKey: "blue" };
  return { label: "Processed", colorKey: "warm" };
}
