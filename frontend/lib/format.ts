import type { ItemType } from "./types";

const TYPE_EYEBROW: Record<ItemType, string> = {
  paper: "Paper",
  article: "Journal Article",
  blog: "Blog Post",
};

export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return url.toUpperCase();
  }
}

export function sourceEyebrow(url: string, type: ItemType): string {
  return `${sourceDomain(url)} / ${TYPE_EYEBROW[type].toUpperCase()}`;
}

export function firstSentences(text: string, count = 2): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, count).join(" ").trim();
}
