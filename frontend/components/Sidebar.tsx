"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Mascot from "./Mascot";
import Logomark from "./Logomark";
import AddItemModal from "./AddItemModal";
import { useMascot } from "./MascotProvider";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import {
  DeskIcon,
  RabbitHoleIcon,
  BoardsIcon,
  ConstellationIcon,
  SettingsIcon,
  SupportIcon,
} from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "The Desk", icon: DeskIcon, matchPrefix: [] as string[] },
  {
    href: "/rabbit-holes",
    label: "Rabbit Holes",
    icon: RabbitHoleIcon,
    // Item detail pages nest conceptually under Rabbit Holes.
    matchPrefix: ["/items"],
  },
  { href: "/boards", label: "Boards", icon: BoardsIcon, matchPrefix: [] },
  { href: "/graph", label: "Constellation", icon: ConstellationIcon, matchPrefix: [] },
];

function isActive(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  if (pathname === item.href) return true;
  return item.matchPrefix.some((p) => pathname.startsWith(p));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { pose } = useMascot();
  const [modalOpen, setModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => {});
  }, []);

  return (
    <aside className="w-64 shrink-0 bg-surface flex flex-col h-screen sticky top-0 border-r border-warm/15">
      <div className="px-6 py-7 flex items-start gap-3">
        <Logomark size={34} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-display text-xl tracking-[0.12em] text-ochre">RAVEN</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-warm mt-0.5">
            For Research
          </div>
        </div>
      </div>

      <nav className="px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm border-l-2 transition-colors ${
                active
                  ? "border-ochre text-ochre bg-white/[0.03]"
                  : "border-transparent text-warm hover:text-cream hover:bg-white/[0.02]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 mt-8">
        <div className="text-[10px] tracking-[0.15em] uppercase text-warm mb-3">
          Current projects
        </div>
        <div className="flex flex-col gap-2">
          {projects.length === 0 && (
            <p className="text-xs text-warm/70">No projects yet.</p>
          )}
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/boards?project=${p.id}`}
              className="flex items-center gap-2 text-sm text-cream/80 hover:text-cream"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
              {p.board_count > 0 && (
                <span className="text-xs text-warm ml-auto">{p.board_count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-4 pb-2">
        <Mascot pose={pose} size="md" className="mx-auto" />
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full bg-ochre text-bg text-sm font-medium py-2.5 rounded-md hover:bg-ochre/90 transition-colors"
        >
          Save Something
        </button>
      </div>

      <div className="px-4 pb-6 flex flex-col gap-0.5 border-t border-warm/15 pt-4">
        <span className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-warm">
          <SettingsIcon className="w-4 h-4" />
          Settings
        </span>
        <span className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-warm">
          <SupportIcon className="w-4 h-4" />
          Support
        </span>
      </div>

      <AddItemModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </aside>
  );
}
