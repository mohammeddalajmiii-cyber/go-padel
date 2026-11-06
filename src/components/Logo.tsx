// Go Padel logo: a lime padel racket with "GO / PADEL" stacked beside it.

// Holes in the racket face, kept inside the head.
const HOLES: [number, number][] = [];
for (let y = 6; y < 30; y += 5) {
  for (let x = 9; x < 33; x += 5) {
    if (((x - 20) / 9.5) ** 2 + ((y - 17) / 11.5) ** 2 <= 1) HOLES.push([x, y]);
  }
}

export function Racket({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={Math.round((size * 40) / 48)} height={size} viewBox="0 0 40 48" aria-hidden className={className}>
      <g transform="rotate(32 20 24)">
        <rect x="17.2" y="31" width="5.6" height="15" rx="2.6" fill="#d4d4d4" />
        <path d="M14.5 28.5 L20 33.5 L25.5 28.5 Z" fill="#c8f031" />
        <ellipse cx="20" cy="17" rx="12" ry="14" fill="#c8f031" />
        {HOLES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="#0a0a0a" />
        ))}
      </g>
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  const text = Math.round(size * 0.42);
  return (
    <span className="flex items-center gap-2" dir="ltr">
      <Racket size={size} />
      <span
        className="flex flex-col font-semibold text-chalk"
        style={{ fontFamily: "Inter, sans-serif", fontSize: text, lineHeight: 0.98, letterSpacing: `${(text * 0.14).toFixed(1)}px` }}
      >
        <span>GO</span>
        <span>PADEL</span>
      </span>
    </span>
  );
}
