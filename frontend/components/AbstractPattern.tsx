// A generated abstract pattern for cards with no real image — never a stock
// photo pulled from the internet. Deterministic per seed so the same item
// always renders the same pattern.
// Small unsigned PRNG steps, kept well under 2^31 at every stage so bitwise
// ops never flip into negative (signed 32-bit) territory.
function seedNum(seed: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
    h = h >>> 0;
  }
  return h >>> 0;
}

export default function AbstractPattern({ seed, className = "" }: { seed: string; className?: string }) {
  const colors = ["var(--ochre)", "var(--blue)", "var(--purple)"];
  const circles = Array.from({ length: 6 }, (_, i) => {
    const n = seedNum(seed, i + 1);
    return {
      cx: 5 + (n % 90),
      cy: 5 + (Math.floor(n / 97) % 90),
      r: 14 + (Math.floor(n / 977) % 26),
      color: colors[Math.floor(n / 7919) % colors.length],
      opacity: 0.35 + (Math.floor(n / 104729) % 35) / 100,
    };
  });

  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill="var(--surface-raised)" />
      {circles.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.color} opacity={c.opacity} />
      ))}
    </svg>
  );
}
