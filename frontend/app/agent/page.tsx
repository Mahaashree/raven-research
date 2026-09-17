"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { AgentRun, Item } from "@/lib/types";
import { useMascot } from "@/components/MascotProvider";
import Mascot from "@/components/Mascot";
import { Panel, Badge, Button, Input, TextLink } from "@/components/ui";
import Markdown from "@/components/Markdown";

interface Turn extends AgentRun {
  items: Item[];
}

export default function AgentPage() {
  const mascot = useMascot();
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || running) return;
    const q = query.trim();
    setQuery("");
    setRunning(true);
    mascot.setLoading();
    try {
      const run = await api.agentQuery(q);
      const items = await Promise.all(
        run.item_ids_used.map((id) => api.getItem(id).catch(() => null))
      );
      setTurns((prev) => [
        ...prev,
        { ...run, items: items.filter((i): i is Item => i !== null) },
      ]);
      mascot.flashSuccess();
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          query: q,
          answer: null,
          tools_used: [],
          item_ids_used: [],
          error_message: err instanceof Error ? err.message : "Something went wrong.",
          created_at: new Date().toISOString(),
          items: [],
        },
      ]);
      mascot.reset();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100vh-5rem)]">
      <h1 className="font-display text-5xl leading-none mb-3">Agent</h1>
      <p className="text-sm text-warm mb-8">
        Ask a research question. The agent searches your saved corpus and arXiv to answer.
      </p>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 mb-6">
        {turns.length === 0 && !running && (
          <p className="text-sm text-warm">
            Try: &ldquo;What have I saved about retrieval-augmented generation?&rdquo;
          </p>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col gap-3">
            <p className="font-display text-lg text-cream">{turn.query}</p>

            {turn.error_message ? (
              <Panel className="p-4 border-warm/60">
                <p className="text-sm text-warm">{turn.error_message}</p>
              </Panel>
            ) : (
              <Panel className="p-5">
                {turn.answer && <Markdown>{turn.answer}</Markdown>}

                {(turn.tools_used.length > 0 || turn.items.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-warm/20 flex flex-col gap-2">
                    {turn.tools_used.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-warm">Tools used:</span>
                        {[...new Set(turn.tools_used)].map((t) => (
                          <Badge key={t} tone="muted">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {turn.items.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-warm">From your library:</span>
                        {turn.items.map((item) => (
                          <TextLink key={item.id} href={`/items/${item.id}`} className="text-xs">
                            {item.title ?? item.url}
                          </TextLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Panel>
            )}
          </div>
        ))}

        {running && (
          <div className="flex items-center gap-3">
            <Mascot pose="loading" size="sm" />
            <span className="text-sm text-warm">Thinking…</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a research question…"
          className="flex-1"
          disabled={running}
        />
        <Button type="submit" disabled={running || !query.trim()}>
          {running ? "Asking…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
