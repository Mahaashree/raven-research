type IconProps = { className?: string };

export function DeskIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4 3.5h9l3 3v10a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5v-13a.5.5 0 01.5-.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M13 3.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.5 10h7M6.5 13h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function RabbitHoleIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3 5.5c2.5-1.5 5-1.5 7 0 2-1.5 4.5-1.5 7 0v9c-2.5-1.5-5-1.5-7 0-2-1.5-4.5-1.5-7 0v-9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M10 5.5v9" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function BoardsIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function ConstellationIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4.5" cy="14" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="15.5" cy="14" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 6.1L4.5 12.4M10 6.1l5.5 6.3M6.1 14h7.8" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function SettingsIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10 3.5v1.6M10 14.9v1.6M16.5 10h-1.6M5.1 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SupportIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7.8 8a2.2 2.2 0 114 1.3c-.6.5-1.3.9-1.3 1.9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="10.5" cy="13.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 3.5c-2 0-3.5 1.6-3.5 3.6v2.3c0 .8-.3 1.5-.8 2.1l-.6.7h9.8l-.6-.7a3 3 0 01-.8-2.1V7.1c0-2-1.5-3.6-3.5-3.6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8.3 14.5a1.7 1.7 0 003.4 0" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function BookmarkIcon({ className = "", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M5.5 3.5h9v13l-4.5-3-4.5 3v-13z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function PinIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 2.5c-2.2 0-4 1.8-4 4 0 2.8 4 8.5 4 8.5s4-5.7 4-8.5c0-2.2-1.8-4-4-4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="6.5" r="1.4" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
