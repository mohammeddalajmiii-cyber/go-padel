// Top-down padel court, drawn to scale (10 m × 20 m, 10 units per metre).
// Glass back walls and corner panels are drawn solid; the mesh sides dashed.
export function CourtDrawing({ className }: { className?: string }) {
  const line = "var(--color-court-line)";
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden fill="none">
      {/* turf */}
      <rect x="10" y="10" width="200" height="100" fill="var(--color-court)" />
      {/* playing lines */}
      <g stroke={line} strokeWidth="0.9" opacity="0.9">
        <rect x="10" y="10" width="200" height="100" />
        <line x1="40.5" y1="10" x2="40.5" y2="110" />
        <line x1="179.5" y1="10" x2="179.5" y2="110" />
        <line x1="40.5" y1="60" x2="179.5" y2="60" />
      </g>
      {/* net */}
      <line x1="110" y1="6" x2="110" y2="114" stroke={line} strokeWidth="2.2" />
      <circle cx="110" cy="6" r="1.8" fill={line} />
      <circle cx="110" cy="114" r="1.8" fill={line} />
      {/* the ball */}
      <circle cx="146" cy="36" r="3.2" fill="var(--color-lime)" />
      {/* glass walls: back walls plus 4 m returns at each corner */}
      <g stroke="var(--color-glass)" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M50 6 H6 V114 H50" />
        <path d="M170 6 H214 V114 H170" />
      </g>
      {/* mesh sides */}
      <g stroke="var(--color-glass)" strokeWidth="1" strokeDasharray="2 2.5" opacity="0.45">
        <line x1="50" y1="6" x2="170" y2="6" />
        <line x1="50" y1="114" x2="170" y2="114" />
      </g>
    </svg>
  );
}
