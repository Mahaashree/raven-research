export interface Suggestion {
  arxivId: string;
  title: string;
  blurb: string;
}

const ARXIV_ID_RE = /\b\d{4}\.\d{4,5}(?:v\d+)?\b/;
const BOLD_RE = /\*\*(.+?)\*\*/;

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[|\-*]\s*/, "")
    .replace(/\|/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The gap-finder agent returns markdown prose/tables, not structured paper
 * objects — pull out a best-effort {title, blurb} per arXiv id mentioned,
 * for rendering as suggestion cards. */
export function parseSuggestions(markdown: string, max = 4): Suggestion[] {
  const lines = markdown.split("\n");
  const seen = new Set<string>();
  const results: Suggestion[] = [];

  for (const line of lines) {
    const idMatch = line.match(ARXIV_ID_RE);
    if (!idMatch) continue;
    const id = idMatch[0];
    if (seen.has(id)) continue;
    seen.add(id);

    const boldMatch = line.match(BOLD_RE);
    const title = boldMatch ? boldMatch[1].replace(/["""]/g, "").trim() : `arXiv:${id}`;
    const blurb = cleanLine(line.replace(BOLD_RE, "").replace(id, ""));

    results.push({ arxivId: id, title, blurb: blurb.slice(0, 140) });
    if (results.length >= max) break;
  }

  return results;
}
