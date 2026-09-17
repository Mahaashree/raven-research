export type TagColorKey = "ochre" | "purple" | "blue" | "warm";

export const TAG_COLOR_CLASSES: Record<TagColorKey, { bg: string; text: string; border: string }> = {
  ochre: { bg: "bg-ochre/15", text: "text-ochre", border: "border-ochre/30" },
  purple: { bg: "bg-purple/15", text: "text-purple", border: "border-purple/30" },
  blue: { bg: "bg-blue/15", text: "text-blue", border: "border-blue/30" },
  warm: { bg: "bg-warm/15", text: "text-warm", border: "border-warm/30" },
};

// Hand-mapped keyword -> category, not a hash. Order matters: first match
// wins, so put more specific/higher-priority keywords first.
const KEYWORD_MAP: [TagColorKey, string[]][] = [
  [
    "ochre",
    [
      "sota",
      "state-of-the-art",
      "high-priority",
      "high priority",
      "priority",
      "breakthrough",
      "active",
    ],
  ],
  [
    "purple",
    [
      "cross-field",
      "cross field",
      "philosophy",
      "abstract-theory",
      "abstract theory",
      "theory",
      "ethics",
      "interdisciplinary",
      "epistemology",
    ],
  ],
  [
    "blue",
    ["neuro", "neuroscience", "biology", "bio", "brain", "cognitive", "cognition"],
  ],
];

export function tagCategory(tag: string): TagColorKey {
  const lower = tag.toLowerCase();
  for (const [category, keywords] of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "warm";
}

export function tagColorClasses(tag: string) {
  return TAG_COLOR_CLASSES[tagCategory(tag)];
}
