"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Collection, Item } from "@/lib/types";
import { sourceDomain, firstSentences } from "@/lib/format";
import { boardEyebrow } from "@/lib/boardEyebrow";
import { TAG_COLOR_CLASSES } from "@/lib/tagColors";
import Mascot from "@/components/Mascot";
import { Panel, Eyebrow, TextLink } from "@/components/ui";
import { PinIcon } from "@/components/icons";

type Filter = "all" | "active" | "done";

function BoardCard({ item }: { item: Item }) {
  const eyebrow = boardEyebrow(item);
  return (
    <Link href={`/items/${item.id}`}>
      <Panel className="p-4 hover:bg-surface-raised h-full flex flex-col">
        <Eyebrow colorKey={TAG_COLOR_CLASSES[eyebrow.colorKey]}>{eyebrow.label}</Eyebrow>
        <h3 className="font-display text-lg mt-1.5 leading-snug">{item.title ?? item.url}</h3>
        <p className="text-xs text-warm mt-1">{sourceDomain(item.url)}</p>
        {item.summary_text && (
          <p className="text-sm text-cream/70 mt-2 leading-relaxed line-clamp-2 flex-1">
            {firstSentences(item.summary_text)}
          </p>
        )}
        {item.user_note && (
          <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-warm/15">
            <PinIcon className="w-3.5 h-3.5 text-warm shrink-0 mt-0.5" />
            <p className="text-xs text-warm italic leading-relaxed">Why I saved this: {item.user_note}</p>
          </div>
        )}
      </Panel>
    </Link>
  );
}

export default function BoardsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams.get("id");
  const projectId = searchParams.get("project") ?? undefined;

  const [boards, setBoards] = useState<Collection[] | null>(null);
  const [board, setBoard] = useState<Collection | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.listCollections(projectId).then((list) => {
      setBoards(list);
      if (!boardId && list.length > 0) {
        router.replace(`/boards?id=${list[0].id}${projectId ? `&project=${projectId}` : ""}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!boardId) return;
    api.getCollection(boardId).then(setBoard);
  }, [boardId]);

  const filteredItems = (board?.items ?? []).filter((i) => {
    if (filter === "all") return true;
    return i.reading_status === filter;
  });

  return (
    <div className="flex gap-10">
      <aside className="w-56 shrink-0">
        <p className="text-xs text-warm mb-4">Boards</p>
        <div className="flex flex-col gap-0.5">
          {boards === null ? (
            <p className="text-xs text-warm">Loading…</p>
          ) : boards.length === 0 ? (
            <p className="text-xs text-warm">No boards yet.</p>
          ) : (
            boards.map((b) => (
              <TextLink
                key={b.id}
                href={`/boards?id=${b.id}${projectId ? `&project=${projectId}` : ""}`}
                className={`px-2 py-1.5 rounded-md text-sm no-underline ${
                  b.id === boardId ? "text-ochre bg-white/[0.03]" : "text-warm hover:text-cream"
                }`}
              >
                {b.name}
                {b.item_count > 0 && <span className="text-xs text-warm ml-1.5">{b.item_count}</span>}
              </TextLink>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {board === null ? (
          boards !== null && boards.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16">
              <Mascot pose="empty" size="lg" />
              <p className="text-sm text-warm mt-4 max-w-xs">
                No boards yet. Create one from an item&apos;s page.
              </p>
            </div>
          ) : (
            <p className="text-sm text-warm">Loading…</p>
          )
        ) : (
          <>
            <p className="text-xs text-warm mb-2">
              Boards {board.project_name ? `› ${board.project_name}` : ""}
            </p>
            <h1 className="font-display text-4xl leading-tight mb-1">{board.name}</h1>
            {board.description && (
              <p className="text-sm text-cream/60 italic mb-6">{board.description}</p>
            )}

            <div className="flex items-center gap-1 mb-6 border-b border-warm/20">
              {(["all", "active", "done"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px ${
                    filter === f ? "border-ochre text-ochre" : "border-transparent text-warm hover:text-cream"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-sm text-warm">No items in this filter.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <BoardCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {filteredItems.length > 0 && (
              <div className="flex flex-col items-center text-center mt-16 pb-4">
                <Mascot pose="idle" size="sm" />
                <p className="text-xs text-warm italic mt-2">Ars Longa, Vita Brevis</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
