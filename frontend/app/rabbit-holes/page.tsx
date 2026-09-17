"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Item } from "@/lib/types";
import { sourceEyebrow, firstSentences } from "@/lib/format";
import { tagColorClasses } from "@/lib/tagColors";
import Mascot from "@/components/Mascot";
import { Panel, TypeBadge, StatusBadge, TagChip, Eyebrow } from "@/components/ui";

export default function RabbitHolesPage() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    api.listItems().then(setItems);
  }, []);

  const activeItems = (items ?? []).filter((i) => i.reading_status === "active");

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-5xl leading-none mb-2">Rabbit Holes</h1>
      <p className="text-sm text-warm mb-9">Everything you&apos;re still actively exploring.</p>

      {items === null ? (
        <p className="text-sm text-warm">Loading…</p>
      ) : activeItems.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16">
          <Mascot pose="empty" size="lg" />
          <p className="text-sm text-warm mt-4 max-w-xs">
            Nothing active right now — everything you&apos;ve saved is marked done.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeItems.map((item) => {
            const primaryTag = item.tags?.[0];
            return (
              <Link key={item.id} href={`/items/${item.id}`}>
                <Panel className="p-4 hover:bg-surface-raised">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Eyebrow colorKey={primaryTag ? tagColorClasses(primaryTag) : undefined}>
                        {sourceEyebrow(item.url, item.type)}
                      </Eyebrow>
                      <h3 className="font-display text-lg mt-1 leading-snug truncate">
                        {item.title ?? item.url}
                      </h3>
                      {item.summary_text && (
                        <p className="text-sm text-cream/70 mt-1.5 leading-relaxed line-clamp-2">
                          {firstSentences(item.summary_text)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <TypeBadge type={item.type} />
                    <StatusBadge status={item.status} />
                    {item.tags?.map((t) => (
                      <TagChip key={t}>{t}</TagChip>
                    ))}
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
