const ARXIV_ID_RE = /\b\d{4}\.\d{4,5}(?:v\d+)?\b/g;

/** Pull distinct arXiv ids mentioned in free-text (e.g. an agent's markdown
 * answer) so the UI can offer a direct "save" action per paper, since the
 * agent returns prose/tables rather than structured paper objects. */
export function extractArxivIds(text: string): string[] {
  const matches = text.match(ARXIV_ID_RE) ?? [];
  return [...new Set(matches)];
}
