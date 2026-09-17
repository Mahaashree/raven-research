"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { extractArxivIds } from "@/lib/extractArxiv";
import { useMascot } from "@/components/MascotProvider";
import Mascot from "@/components/Mascot";
import { Panel, Button, Input } from "@/components/ui";
import Markdown from "@/components/Markdown";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function GapFinderPage() {
  const mascot = useMascot();
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || running) return;
    setRunning(true);
    setAnswer(null);
    setError(null);
    setSaveStates({});
    mascot.setLoading();
    try {
      const run = await api.gapFinder(topic.trim());
      if (run.error_message) {
        setError(run.error_message);
        mascot.reset();
      } else {
        setAnswer(run.answer);
        mascot.flashSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      mascot.reset();
    } finally {
      setRunning(false);
    }
  }

  async function handleSave(arxivId: string) {
    setSaveStates((prev) => ({ ...prev, [arxivId]: "saving" }));
    try {
      await api.createItem(`https://arxiv.org/abs/${arxivId}`);
      setSaveStates((prev) => ({ ...prev, [arxivId]: "saved" }));
      mascot.flashSuccess();
    } catch {
      setSaveStates((prev) => ({ ...prev, [arxivId]: "error" }));
    }
  }

  const arxivIds = answer ? extractArxivIds(answer) : [];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-5xl leading-none mb-3">Gap-finder</h1>
      <p className="text-sm text-warm mb-8">
        Pick a topic. The agent checks what you&apos;ve saved, then finds arXiv papers you
        haven&apos;t.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="A topic — e.g. watermark detector generalization"
          className="flex-1"
          disabled={running}
        />
        <Button type="submit" disabled={running || !topic.trim()}>
          {running ? "Searching…" : "Find gaps"}
        </Button>
      </form>

      {running && (
        <div className="flex items-center gap-3 mb-8">
          <Mascot pose="loading" size="sm" />
          <span className="text-sm text-warm">
            Checking your corpus and arXiv…
          </span>
        </div>
      )}

      {error && (
        <Panel className="p-4 border-warm/60 mb-8">
          <p className="text-sm text-warm">{error}</p>
        </Panel>
      )}

      {answer && (
        <>
          <Panel className="p-5 mb-6">
            <Markdown>{answer}</Markdown>
          </Panel>

          {arxivIds.length > 0 && (
            <section>
              <h2 className="text-sm text-warm mb-3">Save a result</h2>
              <div className="flex flex-col gap-2">
                {arxivIds.map((id) => {
                  const state = saveStates[id] ?? "idle";
                  const saved = state === "saved";
                  return (
                    <Panel
                      key={id}
                      className={`p-3 flex items-center justify-between gap-3 ${saved ? "border-ochre/50" : ""}`}
                    >
                      <span className="text-sm text-cream/80">arXiv:{id}</span>
                      {saved ? (
                        <span className="px-4 py-2 text-sm rounded-md border border-ochre text-ochre">
                          Saved
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleSave(id)}
                          disabled={state === "saving"}
                        >
                          {state === "saving"
                            ? "Saving…"
                            : state === "error"
                              ? "Retry"
                              : "Save this"}
                        </Button>
                      )}
                    </Panel>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
