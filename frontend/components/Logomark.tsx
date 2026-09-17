export default function Logomark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Raven logomark"
    >
      <circle cx="20" cy="20" r="19" fill="none" stroke="var(--ochre)" strokeWidth="1.2" />
      {/* Raven head in profile, facing right: simple line-art strokes,
          matching the mascot's silhouette style. */}
      <path
        d="M11 25
           C10 20, 12 14, 17 12
           C19 11, 21 11.5, 22.5 13
           L27 12.3
           L24.5 15
           C26 16.5, 26.5 18.5, 26 20.5
           C25.3 23.5, 22.5 25.5, 19 25.8
           C19.5 27, 19.2 28, 18 28.4
           C16.5 28.8, 15 28, 14.5 26.5"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21.3" cy="15.4" r="0.9" fill="var(--ochre)" />
    </svg>
  );
}
