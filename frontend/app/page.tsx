"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Item, ResurfacedCandidate, SearchResult } from "@/lib/types";
import { sourceEyebrow, firstSentences } from "@/lib/format";
import { tagColorClasses } from "@/lib/tagColors";
import { parseSuggestions, type Suggestion } from "@/lib/parseSuggestions";
import { useMascot } from "@/components/MascotProvider";
import Mascot from "@/components/Mascot";
import AbstractPattern from "@/components/AbstractPattern";
import { Panel, TagChip, Eyebrow, Input } from "@/components/ui";
import { SearchIcon, BellIcon, BookmarkIcon } from "@/components/icons";
import Link from "next/link";

function ActiveCard({ item }: { item: Item }) {
  const primaryTag = item.tags?.[0];
  const accent = primaryTag ? tagColorClasses(primaryTag).text.replace("text-", "border-l-") : "border-l-ochre";
  return (
    <Link href={`/items/${item.id}`}>
      <Panel className={`p-4 hover:bg-surface-raised border-l-[3px] ${accent} mb-3`}>
        <Eyebrow colorKey={primaryTag ? tagColorClasses(primaryTag) : undefined}>
          {sourceEyebrow(item.url, item.type)}
        </Eyebrow>
        <h3 className="font-display text-lg mt-1.5 leading-snug">{item.title ?? item.url}</h3>
        {item.summary_text && (
          <p className="text-sm text-cream/70 mt-1.5 leading-relaxed line-clamp-2">
            {firstSentences(item.summary_text)}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.slice(0, 3).map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </div>
        )}
      </Panel>
    </Link>
  );
}

function ResurfacedCard({ candidate }: { candidate: ResurfacedCandidate }) {
  return (
    <Link href={`/items/${candidate.id}`}>
      <Panel className="overflow-hidden hover:bg-surface-raised">
        <AbstractPattern seed={candidate.id} className="w-full h-36" />
        <div className="p-5">
          <h3 className="font-display italic text-xl leading-snug">
            {candidate.title ?? candidate.url}
          </h3>
          {candidate.summary_text && (
            <p className="text-sm text-cream/70 mt-2 leading-relaxed line-clamp-3">
              {firstSentences(candidate.summary_text, 2)}
            </p>
          )}
          {candidate.relation_count > 0 && (
            <div className="mt-4 bg-ochre text-bg text-sm font-medium rounded-md px-3 py-2 flex items-center justify-between">
              <span>
                Connects to your {candidate.relation_count} save
                {candidate.relation_count === 1 ? "" : "s"}
              </span>
              <span>→</span>
            </div>
          )}
        </div>
      </Panel>
    </Link>
  );
}

function SuggestionCard({
  suggestion,
  onSave,
  saved,
}: {
  suggestion: Suggestion;
  onSave: () => void;
  saved: boolean;
}) {
  const category = suggestion.blurb.length > 90 ? "SOTA" : "CROSS-FIELD";
  const palette = category === "SOTA" ? tagColorClasses("sota") : tagColorClasses("cross-field");
  return (
    <Panel className="p-4 mb-3 relative">
      <button
        onClick={onSave}
        disabled={saved}
        className="absolute top-3 right-3 text-warm hover:text-ochre disabled:text-ochre"
        aria-label="Save this suggestion"
      >
        <BookmarkIcon className="w-4 h-4" filled={saved} />
      </button>
      <Eyebrow colorKey={palette}>{category}</Eyebrow>
      <h3 className="font-display text-base mt-1.5 leading-snug pr-6">{suggestion.title}</h3>
      {suggestion.blurb && (
        <p className="text-xs text-cream/60 mt-1.5 leading-relaxed line-clamp-2">{suggestion.blurb}</p>
      )}
    </Panel>
  );
}

export default function TheDeskPage() {
  const mascot = useMascot();
  const [items, setItems] = useState<Item[] | null>(null);
  const [resurfaced, setResurfaced] = useState<ResurfacedCandidate[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [suggestionsTopic, setSuggestionsTopic] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    api.listItems().then(setItems);
    api
      .getResurfaced()
      .then((r) => setResurfaced(r.candidates))
      .catch(() => setResurfaced([]));
  }, []);

  function loadSuggestions(topic: string, force = false) {
    const cacheKey = `raven:suggestions:${topic}`;
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setSuggestions(JSON.parse(cached));
          setSuggestionsError(false);
          return;
        }
      } catch {
        // sessionStorage unavailable (private mode etc) — fall through to a live fetch.
      }
    }
    setSuggestions(null);
    setSuggestionsError(false);
    api
      .gapFinder(topic)
      .then((run) => {
        const parsed = run.answer ? parseSuggestions(run.answer) : [];
        setSuggestions(parsed);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
        } catch {
          // best-effort cache only
        }
      })
      .catch(() => setSuggestionsError(true));
  }

  useEffect(() => {
    // Gap-finder is a slow (multi-tool agent) call — only run it once per
    // topic per browser session (cached in sessionStorage), rather than
    // re-running the whole ~60-90s pipeline every time this page mounts.
    if (!items || items.length === 0) return;
    const tagCounts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topic = topTag ?? items[0]?.title ?? "recent research";
    setSuggestionsTopic(topic);
    loadSuggestions(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items === null]);

  async function handleSaveSuggestion(id: string) {
    mascot.setLoading();
    try {
      await api.createItem(`https://arxiv.org/abs/${id}`);
      setSavedIds((prev) => new Set(prev).add(id));
      mascot.flashSuccess();
    } catch {
      mascot.reset();
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const { results } = await api.search(query.trim());
    setSearchResults(results);
  }

  const activeItems = (items ?? []).filter(
    (i) => i.status === "processed" && i.reading_status === "active"
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <form onSubmit={handleSearch} className="relative w-96 max-w-full">
          <SearchIcon className="w-4 h-4 text-warm absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="pl-9 w-full"
          />
        </form>
        <div className="flex items-center gap-4">
          <BellIcon className="w-5 h-5 text-warm" />
          <div className="w-8 h-8 rounded-full bg-surface-raised border border-warm/30 flex items-center justify-center text-xs text-cream">
            R
          </div>
        </div>
      </div>

      {searchResults !== null ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-warm">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for &ldquo;
              {query}&rdquo;
            </p>
            <button
              onClick={() => {
                setSearchResults(null);
                setQuery("");
              }}
              className="text-sm text-ochre hover:underline"
            >
              Back to The Desk
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16">
              <Mascot pose="empty" size="lg" />
              <p className="text-sm text-warm mt-4">No matches. Try a broader query.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {searchResults.map((r) => (
                <Link key={r.id} href={`/items/${r.id}`}>
                  <Panel className="p-4 hover:bg-surface-raised">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-lg">{r.title ?? r.url}</h3>
                      <span className="text-xs text-ochre shrink-0">
                        {(r.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-cream/70 mt-1.5 line-clamp-2">{r.summary_text}</p>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Active */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-ochre" />
              <h2 className="text-sm font-medium text-cream">Active — Main Quest</h2>
            </div>
            {items === null ? (
              <p className="text-sm text-warm">Loading…</p>
            ) : activeItems.length === 0 ? (
              <div className="flex flex-col items-center text-center py-10">
                <Mascot pose="empty" size="md" />
                <p className="text-xs text-warm mt-3">Nothing active. Save something to start.</p>
              </div>
            ) : (
              activeItems.map((item) => <ActiveCard key={item.id} item={item} />)
            )}
          </div>

          {/* Column 2: Resurfaced */}
          <div>
            <h2 className="text-sm font-medium text-cream mb-4">Resurfaced for you</h2>
            {resurfaced === null ? (
              <p className="text-sm text-warm">Loading…</p>
            ) : resurfaced.length > 0 ? (
              <ResurfacedCard candidate={resurfaced[0]} />
            ) : (
              <Panel className="p-6 text-center">
                <p className="text-sm text-warm">
                  Nothing to resurface yet — everything active has been opened recently, or
                  there&apos;s nothing saved yet.
                </p>
              </Panel>
            )}
          </div>

          {/* Column 3: Raven suggests */}
          <div>
            <h2 className="text-sm font-medium text-cream mb-4">Raven suggests</h2>
            {suggestionsError ? (
              <Panel className="p-4">
                <p className="text-sm text-warm mb-3">
                  Couldn&apos;t reach Raven for suggestions right now.
                </p>
                <button
                  onClick={() => suggestionsTopic && loadSuggestions(suggestionsTopic, true)}
                  className="text-sm text-ochre hover:underline"
                >
                  Retry
                </button>
              </Panel>
            ) : suggestions === null ? (
              <div className="flex items-center gap-2 text-sm text-warm">
                <Mascot pose="loading" size="sm" />
                Thinking…
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-warm">No suggestions yet.</p>
            ) : (
              suggestions.map((s) => (
                <SuggestionCard
                  key={s.arxivId}
                  suggestion={s}
                  saved={savedIds.has(s.arxivId)}
                  onSave={() => handleSaveSuggestion(s.arxivId)}
                />
              ))
            )}
            <div className="flex items-center gap-2 justify-end mt-6 text-xs text-warm italic">
              Curated by Raven v2.4
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
