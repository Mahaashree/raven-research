import Link from "next/link";
import type { ItemStatus, ItemType } from "@/lib/types";
import { tagColorClasses } from "@/lib/tagColors";

export function Panel({
  children,
  className = "",
  raised = false,
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <div
      className={`${raised ? "bg-surface-raised" : "bg-surface"} border border-warm/25 rounded-md transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted" | "filled-ochre" | "filled-warm";
}) {
  if (tone === "filled-ochre") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-ochre text-bg font-medium">
        {children}
      </span>
    );
  }
  if (tone === "filled-warm") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-warm text-cream font-medium">
        {children}
      </span>
    );
  }

  const toneClasses = {
    neutral: "border-warm/40 text-cream/80",
    accent: "border-ochre text-ochre",
    muted: "border-warm/40 text-warm",
  }[tone];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border ${toneClasses}`}
    >
      {children}
    </span>
  );
}

const TYPE_LABEL: Record<ItemType, string> = {
  paper: "Paper",
  article: "Article",
  blog: "Blog",
};

export function TypeBadge({ type }: { type: ItemType }) {
  return <Badge tone="neutral">{TYPE_LABEL[type]}</Badge>;
}

// Status gets real, filled color coding — not the same outline treatment as
// everything else — so a list of items reads at a glance.
const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Processing",
  processed: "Ready",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const label = STATUS_LABEL[status];

  if (status === "processed") return <Badge tone="filled-ochre">{label}</Badge>;
  if (status === "failed") return <Badge tone="filled-warm">{label}</Badge>;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md border border-warm/50 text-warm">
      <span className="w-1.5 h-1.5 rounded-full bg-warm status-pending-pulse" />
      {label}
    </span>
  );
}

// Small uppercase eyebrow label — "NATURE.COM / JOURNAL ARTICLE" style —
// colored per the semantic tag/category palette, not a generic badge.
export function Eyebrow({
  children,
  colorKey,
}: {
  children: React.ReactNode;
  colorKey?: ReturnType<typeof tagColorClasses>;
}) {
  const palette = colorKey ?? { text: "text-warm", bg: "", border: "" };
  return (
    <span className={`text-[11px] tracking-wider uppercase font-medium ${palette.text}`}>
      {children}
    </span>
  );
}

// Tags/categories are mapped semantically (see lib/tagColors.ts), not hashed —
// same category always the same color, by meaning rather than coincidence.
export function TagChip({
  children,
  onClick,
}: {
  children: string;
  onClick?: () => void;
}) {
  const palette = tagColorClasses(children);
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border ${palette.bg} ${palette.text} ${palette.border} ${
        onClick ? "cursor-pointer hover:brightness-125 group" : ""
      }`}
    >
      {onClick ? (
        <>
          <span className="group-hover:hidden">{children}</span>
          <span className="hidden group-hover:inline">remove {children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  const variantClasses =
    variant === "primary"
      ? "bg-ochre text-bg hover:bg-ochre/90 disabled:bg-ochre/40 disabled:text-bg/60"
      : "border border-warm/40 text-cream hover:border-ochre disabled:opacity-50";

  return (
    <button
      className={`px-4 py-2 text-sm rounded-md transition-colors disabled:cursor-not-allowed ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`bg-bg border border-warm/40 rounded-md px-3 py-2 text-sm text-cream placeholder:text-warm focus:outline-none focus:border-ochre ${
        props.className ?? ""
      }`}
    />
  );
}

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`text-ochre hover:underline ${className}`}>
      {children}
    </Link>
  );
}
