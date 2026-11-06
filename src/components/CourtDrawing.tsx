// The court from above, alive: a doubles rally that loops forever, with people watching.
// Drawn to scale: a padel court is 10 m × 20 m (12 units per metre here), glass back walls
// with 4 m glass returns, wire mesh along the sides, doors by the net, floodlights at the corners.
// All motion is CSS (see .gp-court in globals.css), so it pauses for people who turn motion off.

const X0 = 30; // court left edge
const Y0 = 40; // court top edge
const W = 240; // 20 m
const H = 120; // 10 m
const NET = X0 + W / 2;
const SERVICE = 6.95 * 12; // service line distance from the net

type Look = { shirt: string; hair: string; skin: string; legs?: string };

/** One person seen from above, facing +x, centred on their shoulders. Drawn a little larger than life so it reads at card size. */
function Person({ look, racket, seated }: { look: Look; racket?: string; seated?: boolean }) {
  return (
    <g transform="scale(1.32)">
      {/* soft shadow, thrown away from the floodlights */}
      <ellipse cx="1.4" cy="1.7" rx={seated ? 4.6 : 3.4} ry="3.9" fill="#000" opacity="0.42" filter="url(#gpc-soft)" />
      {seated && (
        <g fill={look.legs ?? "#2b2f36"}>
          <rect x="0.4" y="-2.1" width="4.4" height="1.75" rx="0.85" />
          <rect x="0.4" y="0.35" width="4.4" height="1.75" rx="0.85" />
        </g>
      )}
      {/* left arm */}
      <rect x="-0.5" y={racket ? -3.95 : -3.7} width={racket ? 3.1 : seated ? 3.3 : 2.3} height="1.1" rx="0.55" fill={look.skin} transform={`rotate(${racket ? -8 : -3} -0.5 -3.4)`} />
      {racket ? (
        <g className="gp-swing">
          {/* right arm reaching forward with the racket */}
          <rect x="-0.4" y="2.8" width="3.6" height="1.15" rx="0.57" fill={look.skin} transform="rotate(22 -0.4 3.3)" />
          <line x1="2.6" y1="5" x2="3.5" y2="5.8" stroke="#111" strokeWidth="0.7" strokeLinecap="round" />
          <ellipse cx="4.6" cy="6.75" rx="1.55" ry="1.95" transform="rotate(-40 4.6 6.75)" fill="#151515" stroke={racket} strokeWidth="0.42" />
          <ellipse cx="4.45" cy="6.55" rx="0.6" ry="0.85" transform="rotate(-40 4.45 6.55)" fill="#fff" opacity="0.08" />
        </g>
      ) : (
        <rect x="-0.5" y="2.6" width={seated ? 3.3 : 2.3} height="1.1" rx="0.55" fill={look.skin} transform="rotate(3 -0.5 3.2)" />
      )}
      {/* shoulders and back */}
      <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill={look.shirt} />
      <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill="url(#gpc-shade)" />
      {/* head: hair on top, a little face showing at the front */}
      <ellipse cx="1.25" cy="0" rx="0.75" ry="1.05" fill={look.skin} />
      <circle cx="0.25" cy="0" r="1.42" fill={look.hair} />
      <circle cx="-0.15" cy="-0.45" r="0.6" fill="#fff" opacity="0.1" />
    </g>
  );
}

const PLAYERS: { id: "A" | "B" | "C" | "D"; look: Look; rim: string; facing: 0 | 180 }[] = [
  { id: "A", look: { shirt: "#ecebe6", hair: "#2a1d14", skin: "#c69a78" }, rim: "#c8f031", facing: 0 },
  { id: "B", look: { shirt: "#d8d6cf", hair: "#15110e", skin: "#a8785a" }, rim: "#e9e9e9", facing: 0 },
  { id: "C", look: { shirt: "#1c1e22", hair: "#3b2a1e", skin: "#d2a684" }, rim: "#d64545", facing: 180 },
  { id: "D", look: { shirt: "#6e2626", hair: "#8f6d47", skin: "#c99a76" }, rim: "#e9e9e9", facing: 180 },
];

// Spectators on the bench below the court, facing the play.
const BENCH: { x: number; look: Look; delay: number }[] = [
  { x: 74, look: { shirt: "#3a4a5e", hair: "#1a1410", skin: "#b98a68", legs: "#1f2229" }, delay: -0.2 },
  { x: 96, look: { shirt: "#c9c2b0", hair: "#2c2018", skin: "#c99a76", legs: "#3c3a35" }, delay: -0.5 },
  { x: 118, look: { shirt: "#5a5f3d", hair: "#120e0b", skin: "#8d5f43", legs: "#22252b" }, delay: -0.1 },
  { x: 182, look: { shirt: "#8a2f3a", hair: "#3b2a1e", skin: "#d2a684", legs: "#1f2229" }, delay: -0.35 },
  { x: 204, look: { shirt: "#e6e3dc", hair: "#1a1410", skin: "#a8785a", legs: "#2f3540" }, delay: -0.6 },
  { x: 226, look: { shirt: "#2d3036", hair: "#6b4f35", skin: "#c69a78", legs: "#1b1d21" }, delay: -0.15 },
];

// Steel posts every 2 m around the court.
const POSTS: [number, number][] = [];
for (let i = 0; i <= 10; i++) {
  POSTS.push([X0 + i * 24, Y0], [X0 + i * 24, Y0 + H]);
}
for (let j = 1; j < 5; j++) POSTS.push([X0, Y0 + j * 24], [X0 + W, Y0 + j * 24]);

// Side fences: glass for the first 4 m from each back wall, mesh in between, with doors by the net.
const GLASS_RETURN = 4 * 12;
const DOORS: [number, number][] = [
  [NET - 22, NET - 10],
  [NET + 10, NET + 22],
];
function meshRuns(): [number, number][] {
  const runs: [number, number][] = [];
  let from = X0 + GLASS_RETURN;
  for (const [a, b] of DOORS) {
    runs.push([from, a]);
    from = b;
  }
  runs.push([from, X0 + W - GLASS_RETURN]);
  return runs;
}

export function CourtDrawing({ className }: { className?: string }) {
  const lights: [number, number][] = [
    [X0 - 8, Y0 - 8],
    [X0 + W + 8, Y0 - 8],
    [X0 - 8, Y0 + H + 8],
    [X0 + W + 8, Y0 + H + 8],
  ];
  return (
    <svg viewBox="0 0 300 200" className={`gp-court ${className ?? ""}`} role="img" aria-label="Padel court seen from above with a doubles game in play">
      <defs>
        <linearGradient id="gpc-turf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2257bd" />
          <stop offset="1" stopColor="#1a4398" />
        </linearGradient>
        <pattern id="gpc-rows" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="3" height="6" fill="#fff" opacity="0.025" />
        </pattern>
        <pattern id="gpc-tiles" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#131313" />
          <path d="M12 0H0V12" fill="none" stroke="#1b1b1b" strokeWidth="0.5" />
        </pattern>
        <filter id="gpc-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
        </filter>
        <filter id="gpc-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <radialGradient id="gpc-pool">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gpc-shade" cx="0.4" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <radialGradient id="gpc-lamp">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
        </radialGradient>
        <clipPath id="gpc-court">
          <rect x={X0} y={Y0} width={W} height={H} />
        </clipPath>
      </defs>

      {/* Ground around the court */}
      <rect width="300" height="200" fill="url(#gpc-tiles)" />

      {/* Turf with its rows and grain */}
      <rect x={X0} y={Y0} width={W} height={H} fill="url(#gpc-turf)" />
      <rect x={X0} y={Y0} width={W} height={H} fill="url(#gpc-rows)" />
      <rect x={X0} y={Y0} width={W} height={H} filter="url(#gpc-grain)" opacity="0.6" />

      {/* Floodlight pools on the court */}
      <g clipPath="url(#gpc-court)">
        {lights.map(([x, y]) => (
          <ellipse key={`p${x}-${y}`} cx={x + (x < NET ? 40 : -40)} cy={y + (y < 100 ? 30 : -30)} rx="90" ry="62" fill="url(#gpc-pool)" />
        ))}
      </g>

      {/* Lines */}
      <g stroke="#f2f4f8" strokeWidth="0.8" fill="none" opacity="0.92">
        <line x1={NET - SERVICE} y1={Y0} x2={NET - SERVICE} y2={Y0 + H} />
        <line x1={NET + SERVICE} y1={Y0} x2={NET + SERVICE} y2={Y0 + H} />
        <line x1={NET - SERVICE} y1={Y0 + H / 2} x2={NET + SERVICE} y2={Y0 + H / 2} />
      </g>

      {/* Net: shadow, mesh band, white tape, posts */}
      <line x1={NET + 1.6} y1={Y0 - 1} x2={NET + 1.6} y2={Y0 + H + 1} stroke="#000" strokeWidth="2.2" opacity="0.28" filter="url(#gpc-soft)" />
      <line x1={NET} y1={Y0 - 1.5} x2={NET} y2={Y0 + H + 1.5} stroke="#0d0d0d" strokeWidth="1.4" opacity="0.75" />
      <line x1={NET} y1={Y0 - 1.5} x2={NET} y2={Y0 + H + 1.5} stroke="#f5f5f5" strokeWidth="0.55" />
      <rect x={NET - 1.3} y={Y0 - 3.2} width="2.6" height="2.6" rx="0.4" fill="#1a1a1a" />
      <rect x={NET - 1.3} y={Y0 + H + 0.6} width="2.6" height="2.6" rx="0.4" fill="#1a1a1a" />

      {/* Players and the ball */}
      {PLAYERS.map((p) => (
        <g key={p.id} className={`gp-p gp-p${p.id}`}>
          <g transform={`rotate(${p.facing})`}>
            <Person look={p.look} racket={p.rim} />
          </g>
        </g>
      ))}
      <g className="gp-ball">
        <ellipse className="gp-ball-s" cx="0" cy="0" rx="1.3" ry="1" fill="#000" opacity="0.45" filter="url(#gpc-soft)" />
        <g className="gp-ball-h">
          <circle r="1.25" fill="#d7f43c" />
          <circle cx="-0.4" cy="-0.4" r="0.45" fill="#fff" opacity="0.55" />
        </g>
      </g>

      {/* Back walls: glass on a steel frame */}
      <g>
        {[X0, X0 + W].map((x) => (
          <g key={`bw${x}`}>
            <line x1={x} y1={Y0} x2={x} y2={Y0 + H} stroke="#000" strokeWidth="3" opacity="0.35" filter="url(#gpc-soft)" />
            <line x1={x} y1={Y0} x2={x} y2={Y0 + H} stroke="#bfe0ff" strokeWidth="2.4" opacity="0.28" />
            <line x1={x + (x === X0 ? 0.7 : -0.7)} y1={Y0} x2={x + (x === X0 ? 0.7 : -0.7)} y2={Y0 + H} stroke="#e8f4ff" strokeWidth="0.35" opacity="0.7" />
          </g>
        ))}
        {/* Glass returns on the sides */}
        {[Y0, Y0 + H].map((y) =>
          [
            [X0, X0 + GLASS_RETURN],
            [X0 + W - GLASS_RETURN, X0 + W],
          ].map(([a, b]) => (
            <g key={`gr${y}-${a}`}>
              <line x1={a} y1={y} x2={b} y2={y} stroke="#bfe0ff" strokeWidth="2.4" opacity="0.28" />
              <line x1={a} y1={y + (y === Y0 ? 0.7 : -0.7)} x2={b} y2={y + (y === Y0 ? 0.7 : -0.7)} stroke="#e8f4ff" strokeWidth="0.35" opacity="0.7" />
            </g>
          )),
        )}
        {/* Wire mesh along the sides, with doors by the net */}
        {[Y0, Y0 + H].map((y) =>
          meshRuns().map(([a, b]) => (
            <g key={`m${y}-${a}`}>
              <line x1={a} y1={y} x2={b} y2={y} stroke="#9aa0a8" strokeWidth="1.5" strokeDasharray="0.45 0.45" opacity="0.55" />
              <line x1={a} y1={y} x2={b} y2={y} stroke="#2a2d31" strokeWidth="0.3" />
            </g>
          )),
        )}
        {/* Steel posts */}
        {POSTS.filter(([x]) => !DOORS.some(([a, b]) => x > a && x < b)).map(([x, y]) => (
          <rect key={`po${x}-${y}`} x={x - 0.9} y={y - 0.9} width="1.8" height="1.8" fill="#0b0b0b" stroke="#3a3a3a" strokeWidth="0.2" />
        ))}
        {DOORS.flatMap(([a, b]) => [a, b]).flatMap((x) =>
          [Y0, Y0 + H].map((y) => <rect key={`dp${x}-${y}`} x={x - 0.9} y={y - 0.9} width="1.8" height="1.8" fill="#0b0b0b" stroke="#3a3a3a" strokeWidth="0.2" />),
        )}
      </g>

      {/* Floodlights */}
      {lights.map(([x, y]) => (
        <g key={`l${x}-${y}`}>
          <circle cx={x} cy={y} r="8" fill="url(#gpc-lamp)" opacity="0.45" />
          <rect x={x - 1.1} y={y - 1.1} width="2.2" height="2.2" rx="0.4" fill="#202020" />
          <rect x={x - 2.6} y={y + (y < 100 ? 1.3 : -2.2)} width="5.2" height="0.9" rx="0.45" fill="#fbf8ea" />
        </g>
      ))}

      {/* Bench and spectators below the court */}
      <rect x="62" y="181" width="176" height="5" rx="1" fill="#3b2e24" />
      <rect x="62" y="181" width="176" height="1" rx="0.5" fill="#5a4636" opacity="0.8" />
      {BENCH.map((s) => (
        <g key={`s${s.x}`} transform={`translate(${s.x} 182.5)`}>
          <g className="gp-watch" style={{ animationDelay: `${s.delay}s` }}>
            <g transform="rotate(-90)">
              <Person look={s.look} seated />
            </g>
          </g>
        </g>
      ))}

      {/* Café table at the top right: two people with drinks */}
      <circle cx="246" cy="18" r="4.2" fill="#d9d4c8" />
      <circle cx="246" cy="18" r="4.2" fill="url(#gpc-shade)" />
      <circle cx="244.8" cy="17" r="0.8" fill="#7a4b2a" />
      <circle cx="247.4" cy="19.2" r="0.8" fill="#c8f031" opacity="0.85" />
      <g transform="translate(236.5 18)">
        <g className="gp-watch" style={{ animationDelay: "-0.4s" }}>
          <Person look={{ shirt: "#40464f", hair: "#1a1410", skin: "#b98a68", legs: "#20232a" }} seated />
        </g>
      </g>
      <g transform="translate(255.5 18)">
        <g className="gp-watch" style={{ animationDelay: "-0.9s" }}>
          <g transform="rotate(180)">
            <Person look={{ shirt: "#b8a68a", hair: "#3b2a1e", skin: "#c99a76", legs: "#33302b" }} seated />
          </g>
        </g>
      </g>

      {/* Two people standing by the glass at the top left, watching */}
      {[
        { x: 52, look: { shirt: "#2f3a4a", hair: "#15110e", skin: "#a8785a" }, d: -0.3 },
        { x: 62, look: { shirt: "#e4e0d6", hair: "#6b4f35", skin: "#d2a684" }, d: -0.7 },
      ].map((s) => (
        <g key={`st${s.x}`} transform={`translate(${s.x} 30)`}>
          <g className="gp-watch" style={{ animationDelay: `${s.d}s` }}>
            <g transform="rotate(90)">
              <Person look={s.look} />
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
