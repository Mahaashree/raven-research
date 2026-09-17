"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ClaimVerification, Item, ItemBoard, Relation } from "@/lib/types";
import { firstSentences } from "@/lib/format";
import { tagColorClasses } from "@/lib/tagColors";
import { useMascot } from "@/components/MascotProvider";
import Mascot from "@/components/Mascot";
import { Panel, TypeBadge, StatusBadge, TagChip, Button, Input, TextLink } from "@/components/ui";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { EquationDecodingResult } from "@/lib/types";

function relationSentence(r: Relation, otherTitle: string): string {
  if (r.note) return r.note;
  const verb = r.as_source
    ? { supports: "supports", contradicts: "contradicts", extends: "extends" }[r.relation_type]
    : { supports: "is supported by", contradicts: "is contradicted by", extends: "is extended by" }[
        r.relation_type
      ];
  return `This ${verb} ${otherTitle}.`;
}

export default function ItemDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const mascot = useMascot();
  const [item, setItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [relations, setRelations] = useState<Relation[] | null>(null);
  const [relatedTags, setRelatedTags] = useState<Record<string, string[]>>({});
  const [boards, setBoards] = useState<ItemBoard[] | null>(null);
  const [findingRelations, setFindingRelations] = useState(false);

  const [newTag, setNewTag] = useState("");
  const [tagBusy, setTagBusy] = useState(false);

  const [claim, setClaim] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifications, setVerifications] = useState<ClaimVerification[]>([]);

  const [equation, setEquation] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [decodings, setDecodings] = useState<EquationDecodingResult[]>([]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadItem = useCallback(async () => {
    try {
      const data = await api.getItem(id);
      setItem(data);
      return data;
    } catch {
      setNotFound(true);
      return null;
    }
  }, [id]);

  useEffect(() => {
    loadItem();
    api.getRelations(id).then((r) => setRelations(r.relations));
    api.getItemBoards(id).then((r) => setBoards(r.boards));
  }, [id, loadItem]);

  useEffect(() => {
    if (!relations) return;
    Promise.all(
      relations.map((r) =>
        api
          .getItem(r.other_item_id)
          .then((item) => [r.other_item_id, item.tags ?? []] as const)
          .catch(() => [r.other_item_id, []] as const)
      )
    ).then((entries) => setRelatedTags(Object.fromEntries(entries)));
  }, [relations]);

  useEffect(() => {
    if (!item || item.status !== "pending") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    mascot.setLoading();
    pollingRef.current = setInterval(async () => {
      const updated = await loadItem();
      if (updated && updated.status !== "pending") {
        if (updated.status === "processed") mascot.flashSuccess();
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 2500);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.status]);

  async function handleSuggestTags() {
    setTagBusy(true);
    try {
      await api.addTags(id);
      await loadItem();
    } finally {
      setTagBusy(false);
    }
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim() || tagBusy) return;
    setTagBusy(true);
    try {
      await api.addTags(id, [newTag.trim()]);
      setNewTag("");
      await loadItem();
    } finally {
      setTagBusy(false);
    }
  }

  async function handleRemoveTag(tag: string) {
    setItem((prev) => (prev ? { ...prev, tags: prev.tags?.filter((t) => t !== tag) } : prev));
    await api.removeTag(id, tag);
  }

  async function handleFindRelations() {
    setFindingRelations(true);
    mascot.setLoading();
    try {
      await api.findRelations(id);
      const r = await api.getRelations(id);
      setRelations(r.relations);
      mascot.flashSuccess();
    } catch {
      mascot.reset();
    } finally {
      setFindingRelations(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!claim.trim() || verifying) return;
    setVerifying(true);
    mascot.setLoading();
    try {
      const result = await api.verifyClaim(id, claim.trim());
      setVerifications((prev) => [result, ...prev]);
      setClaim("");
      mascot.flashSuccess();
    } catch {
      mascot.reset();
    } finally {
      setVerifying(false);
    }
  }

  async function handleDecode(e: React.FormEvent) {
    e.preventDefault();
    if (!equation.trim() || decoding) return;
    setDecoding(true);
    mascot.setLoading();
    try {
      const result = await api.decodeEquation(id, equation.trim());
      setDecodings((prev) => [result, ...prev]);
      setEquation("");
      mascot.flashSuccess();
    } catch {
      mascot.reset();
    } finally {
      setDecoding(false);
    }
  }

  async function handleMarkDone() {
    if (!item) return;
    const next = item.reading_status === "active" ? "done" : "active";
    setItem({ ...item, reading_status: next });
    await api.updateItem(id, { reading_status: next });
  }

  async function handleDelete() {
    if (!confirm("Delete this item? This can't be undone.")) return;
    await api.deleteItem(id);
    router.push("/");
  }

  if (notFound) {
    return <p className="text-sm text-warm">Item not found.</p>;
  }
  if (!item) {
    return <p className="text-sm text-warm">Loading…</p>;
  }

  const board = boards?.[0];
  const whyNote =
    item.user_note ??
    (item.summary_text ? firstSentences(item.summary_text, 1) : null);

  return (
    <div className="flex gap-10">
      <div className="flex-1 min-w-0 max-w-2xl">
        <p className="text-xs text-warm mb-3">
          <TextLink href="/">Archive</TextLink>
          {" › "}
          {board ? board.name : "Uncategorized"}
          {" › "}
          <span className="text-cream/70">Detail</span>
        </p>

        <h1 className="font-display text-4xl leading-tight mb-2">{item.title ?? item.url}</h1>
        <div className="flex items-center gap-2 mb-5">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
        </div>

        {item.status === "processed" && (
          <div className="flex items-center gap-3 pb-5 mb-6 border-b border-warm/20">
            <Button variant={item.reading_status === "done" ? "secondary" : "primary"} onClick={handleMarkDone}>
              {item.reading_status === "done" ? "Mark Active" : "Mark Done"}
            </Button>
            <a href={item.url} target="_blank" rel="noreferrer">
              <Button variant="secondary">Open Link</Button>
            </a>
            <button onClick={handleDelete} className="text-sm text-warm hover:text-cream ml-1">
              Delete
            </button>
          </div>
        )}

        {item.status === "pending" && (
          <Panel className="p-6 flex items-center gap-4 mb-8">
            <Mascot pose="loading" size="sm" />
            <p className="text-sm text-warm">Fetching, summarizing, and embedding this item…</p>
          </Panel>
        )}

        {item.status === "failed" && (
          <Panel className="p-6 mb-8">
            <p className="text-sm text-cream/80">Processing failed.</p>
            {item.error_message && <p className="text-xs text-warm mt-2">{item.error_message}</p>}
          </Panel>
        )}

        {item.status === "processed" && (
          <>
            {whyNote && (
              <Panel className="p-6 mb-6 relative">
                <span className="text-xs tracking-wider uppercase text-ochre font-medium">
                  Why you saved this
                </span>
                <span className="absolute top-3 right-5 font-display text-4xl text-warm/30">
                  &rdquo;
                </span>
                <p className="font-display italic text-lg text-cream/90 leading-relaxed mt-2 pr-8">
                  &ldquo;{whyNote}&rdquo;
                </p>
              </Panel>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-8">
              {item.tags?.map((tag) => (
                <TagChip key={tag} onClick={() => handleRemoveTag(tag)}>
                  {tag}
                </TagChip>
              ))}
              <div className="flex gap-2 ml-1">
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    className="w-32 py-1 text-xs"
                  />
                </form>
                <button
                  onClick={handleSuggestTags}
                  disabled={tagBusy}
                  className="text-xs text-warm hover:text-ochre"
                >
                  + Suggest
                </button>
              </div>
            </div>

            <p className="text-cream/90 leading-relaxed max-w-[72ch]">{item.summary_text}</p>

            {item.key_claims && item.key_claims.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm text-warm mb-3">Key claims</h2>
                <ul className="flex flex-col gap-2">
                  {item.key_claims.map((c, i) => (
                    <li key={i} className="flex items-start justify-between gap-3">
                      <span className="text-cream/90 leading-relaxed max-w-[64ch]">{c}</span>
                      <button
                        type="button"
                        onClick={() => setClaim(c)}
                        className="text-xs text-ochre hover:underline shrink-0 pt-0.5"
                      >
                        Verify
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {item.method && (
              <section className="mt-8">
                <h2 className="text-sm text-warm mb-3">Method</h2>
                <p className="text-cream/90 leading-relaxed max-w-[72ch]">{item.method}</p>
              </section>
            )}

            <section className="mt-10">
              <h2 className="text-sm text-warm mb-3">Verify a claim</h2>
              <form onSubmit={handleVerify} className="flex gap-2 mb-4">
                <Input
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="Type a claim to check against the source…"
                  className="flex-1"
                />
                <Button type="submit" disabled={verifying || !claim.trim()}>
                  {verifying ? "Checking…" : "Verify"}
                </Button>
              </form>
              <div className="flex flex-col gap-3">
                {verifications.map((v) => (
                  <Panel key={v.id + v.checked_at} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-cream/90 max-w-[60ch]">{v.claim}</p>
                      <VerdictBadge verdict={v.verdict} />
                    </div>
                    <p className="text-sm text-warm mt-2 leading-relaxed">{v.explanation}</p>
                    {v.quoted_evidence && (
                      <blockquote className="text-sm text-ochre/90 border-l-2 border-ochre/40 pl-3 mt-3 italic">
                        &ldquo;{v.quoted_evidence}&rdquo;
                      </blockquote>
                    )}
                  </Panel>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-sm text-warm mb-3">Decode an equation</h2>
              <form onSubmit={handleDecode} className="flex gap-2 mb-4">
                <Input
                  value={equation}
                  onChange={(e) => setEquation(e.target.value)}
                  placeholder="Paste an equation from this paper…"
                  className="flex-1"
                />
                <Button type="submit" disabled={decoding || !equation.trim()}>
                  {decoding ? "Decoding…" : "Decode"}
                </Button>
              </form>
              <div className="flex flex-col gap-4">
                {decodings.map((d) => (
                  <Panel key={d.id + d.created_at} className="p-6 relative">
                    <span className="text-xs tracking-wider uppercase text-ochre font-medium">
                      {d.equation_text}
                    </span>
                    <span className="absolute top-3 right-5 font-display text-4xl text-warm/30">
                      &rdquo;
                    </span>

                    <p className="text-xs text-warm mt-3">Pronunciation</p>
                    <p className="text-sm text-cream/90 mt-1">{d.decoding.pronunciation}</p>

                    {Object.keys(d.decoding.variable_types).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-warm mb-1.5">Variables</p>
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            {Object.entries(d.decoding.variable_types).map(([symbol, desc]) => (
                              <tr key={symbol}>
                                <td className="border-b border-warm/15 py-1.5 pr-3 text-ochre font-mono align-top whitespace-nowrap">
                                  {symbol}
                                </td>
                                <td className="border-b border-warm/15 py-1.5 text-cream/80 align-top">
                                  {desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <p className="font-display italic text-lg text-cream/90 leading-relaxed mt-4">
                      &ldquo;{d.decoding.plain_language}&rdquo;
                    </p>

                    <p className="text-xs text-warm mt-4">Tiny example</p>
                    <p className="text-sm text-cream/80 mt-1 leading-relaxed whitespace-pre-line">
                      {d.decoding.tiny_example}
                    </p>

                    <p className="text-xs text-warm mt-4">Why it matters here</p>
                    <p className="text-sm text-cream/80 mt-1 leading-relaxed">
                      {d.decoding.role_in_paper}
                    </p>
                  </Panel>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {item.status === "processed" && (
        <aside className="w-72 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs tracking-wider uppercase text-warm">Connected saves</h2>
            <button
              onClick={handleFindRelations}
              disabled={findingRelations}
              className="text-xs text-ochre hover:underline"
            >
              {findingRelations ? "Searching…" : "+ Add Connection"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {relations && relations.length > 0 ? (
              relations.map((r) => {
                const otherTags = relatedTags[r.other_item_id] ?? [];
                const category = otherTags[0];
                const title = r.other_item_title ?? r.other_item_url;
                return (
                  <TextLink key={r.id} href={`/items/${r.other_item_id}`} className="block">
                    <Panel className="p-4 hover:bg-surface-raised">
                      {category && (
                        <span
                          className={`text-[11px] tracking-wider uppercase font-medium ${tagColorClasses(category).text}`}
                        >
                          {category}
                        </span>
                      )}
                      <h3 className="text-sm text-cream mt-1 leading-snug">{title}</h3>
                      <p className="text-xs text-warm mt-1.5 leading-relaxed">
                        {relationSentence(r, title)}
                      </p>
                    </Panel>
                  </TextLink>
                );
              })
            ) : (
              <p className="text-xs text-warm">
                No connections yet. Try &ldquo;+ Add Connection&rdquo;.
              </p>
            )}

            {board && (
              <TextLink href={`/boards?id=${board.id}`} className="block">
                <Panel className="p-4 text-center hover:bg-surface-raised">
                  <p className="text-sm text-cream">{board.name}</p>
                  <p className="text-xs text-warm mt-1">
                    This save is the {board.board_position}
                    {board.board_position === 1 ? "st" : board.board_position === 2 ? "nd" : "th"} item in
                    this board.
                  </p>
                  <p className="text-xs text-ochre mt-2">View Full Board</p>
                </Panel>
              </TextLink>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
