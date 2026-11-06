"use client";

// The court from above with a live doubles match that never ends.
//
// A small match engine plans each point the way padel is played: players walk to the
// serve formation, the server bounces the ball and serves underhand into the diagonal box,
// then the rally goes on with drives, volleys at the net and lobs that push the net team
// back. Deep balls bounce and come off the back glass. A point ends with a winner (two
// bounces) or a ball into the net, and the scoreboard counts it: 0, 15, 30, 40, game, with
// the golden point at 40–40. Spectators turn to follow the ball.
//
// Court units: metres, x 0–20 along the court (net at 10), y 0–10 across.
// Drawing units: 12 per metre, the court's corner at (30, 40).

import { useEffect, useRef } from "react";

const S = 12;
const OX = 30;
const OY = 40;
const W = 20 * S;
const H = 10 * S;
const sx = (x: number) => OX + S * x;
const sy = (y: number) => OY + S * y;
const NETX = 10;

type V = { x: number; y: number };
type Team = "L" | "R";
type Half = "top" | "bottom";
const PIDS = ["L1", "L2", "R1", "R2"] as const;
type PID = (typeof PIDS)[number];
const TEAM: Record<PID, Team> = { L1: "L", L2: "L", R1: "R", R2: "R" };
const HALF: Record<PID, Half> = { L1: "top", L2: "bottom", R1: "top", R2: "bottom" };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
const len = (a: V) => Math.hypot(a.x, a.y);
const dist = (a: V, b: V) => len(sub(a, b));
const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
const other = (t: Team): Team => (t === "L" ? "R" : "L");
/** x of a spot `d` metres from the net on a team's side */
const depthX = (t: Team, d: number) => (t === "L" ? NETX - d : NETX + d);
const fromNet = (x: number) => Math.abs(x - NETX);
const baseY = (p: PID) => (HALF[p] === "top" ? 2.6 : 7.4);
/** Where the racket meets the ball, relative to the player (they face the net). */
const hand = (t: Team): V => (t === "L" ? { x: 0.5, y: 0.72 } : { x: -0.5, y: -0.72 });
const keepOnSide = (t: Team, v: V): V => ({
  x: t === "L" ? clamp(v.x, 0.5, 9.3) : clamp(v.x, 10.7, 19.5),
  y: clamp(v.y, 0.5, 9.5),
});
const inCourt = (v: V): V => ({ x: clamp(v.x, 0.35, 19.65), y: clamp(v.y, 0.35, 9.65) });
const partnerOf = (p: PID) => PIDS.find((q) => TEAM[q] === TEAM[p] && q !== p)!;
const playerAt = (t: Team, h: Half) => PIDS.find((q) => TEAM[q] === t && HALF[q] === h)!;

// ---------- Plans ----------
/** A stroke: low ball (bend), volley, overhead smash, underhand serve, or a dive for a ball they won't reach. */
type SwingKind = "low" | "volley" | "over" | "serve" | "lunge";
type Swing = { pid: PID; t: number; kind: SwingKind; bend: number };
type Seg = { t0: number; t1: number; a: V; b: V; h0: number; h1: number; peak: number };
type Move = { t0: number; t1: number; a: V; b: V };
type Score = { p: [number, number]; g: [number, number]; server: Team };
type Plan = {
  start: number;
  ballFrom: number;
  segs: Seg[];
  moves: Record<PID, Move[]>;
  from: Record<PID, V>;
  swings: Swing[];
  flashes: { t: number; p: V; kind: "glass" | "side" | "net" }[];
  scoreAt: number;
  score: Score;
  caption: string;
  end: number;
};

function award(s: Score, team: Team): Score {
  const i = team === "L" ? 0 : 1;
  const p: [number, number] = [s.p[0], s.p[1]];
  const g: [number, number] = [s.g[0], s.g[1]];
  let server = s.server;
  p[i]++;
  // 0, 15, 30, 40, game. At 40–40 the next point wins (golden point).
  if (p[i] === 4) {
    g[i]++;
    p[0] = 0;
    p[1] = 0;
    server = other(server);
    if ((g[i] >= 6 && g[i] - g[1 - i] >= 2) || g[i] === 7) {
      g[0] = 0;
      g[1] = 0;
    }
  }
  return { p, g, server };
}

function posIn(list: Move[], fallback: V, t: number): V {
  let p = fallback;
  for (const m of list) {
    if (t >= m.t1) p = m.b;
    else if (t >= m.t0) return { x: lerp(m.a.x, m.b.x, smooth((t - m.t0) / (m.t1 - m.t0))), y: lerp(m.a.y, m.b.y, smooth((t - m.t0) / (m.t1 - m.t0))) };
    else break;
  }
  return p;
}

/** Players' spots while the server gets ready. */
function formation(score: Score): Record<PID, V> {
  const sT = score.server;
  const rT = other(sT);
  const point = score.p[0] + score.p[1];
  // Serve from the right first, then alternate (L faces +x, so its right is the bottom half).
  const right: Half = sT === "L" ? "bottom" : "top";
  const serveHalf: Half = point % 2 === 0 ? right : right === "top" ? "bottom" : "top";
  const recvHalf: Half = serveHalf === "top" ? "bottom" : "top";
  const server = playerAt(sT, serveHalf);
  const receiver = playerAt(rT, recvHalf);
  const out = {} as Record<PID, V>;
  out[server] = { x: depthX(sT, 7.9), y: serveHalf === "top" ? 3.3 : 6.7 };
  out[partnerOf(server)] = { x: depthX(sT, 2.8), y: baseY(partnerOf(server)) };
  out[receiver] = { x: depthX(rT, 8.1), y: recvHalf === "top" ? 2.3 : 7.7 };
  out[partnerOf(receiver)] = { x: depthX(rT, 6.4), y: baseY(partnerOf(receiver)) };
  return out;
}

type Shot = "serve" | "drive" | "volley" | "lob" | "smash";
const SPEED: Record<Shot, number> = { serve: 10.5, drive: 15, volley: 13.5, lob: 8.5, smash: 21 };
const PEAK: Record<Shot, number> = { serve: 1.5, drive: 1.3, volley: 1.0, lob: 5.5, smash: 2.6 };
const wallX = (t: Team) => (t === "L" ? 0.12 : 19.88);

function planPoint(start: number, from: Record<PID, V>, score: Score): Plan {
  const moves = { L1: [], L2: [], R1: [], R2: [] } as Record<PID, Move[]>;
  const segs: Seg[] = [];
  const swings: Plan["swings"] = [];
  const flashes: Plan["flashes"] = [];
  const posAt = (p: PID, t: number) => posIn(moves[p], from[p], t);
  const move = (p: PID, t0: number, t1: number, to: V) => {
    const a = posAt(p, t0);
    const list = moves[p];
    const last = list[list.length - 1];
    if (last && last.t1 > t0) {
      last.b = a;
      last.t1 = Math.max(last.t0 + 0.01, t0);
    }
    list.push({ t0, t1: Math.max(t1, t0 + 0.08), a, b: keepOnSide(TEAM[p], to) });
  };
  /** The nearest player of a team lunges for a ball they won't reach. */
  const lunge = (team: Team, at: V, t0: number, t1: number, reach = 0.55) => {
    const p = playerAt(team, at.y < 5 ? "top" : "bottom");
    const cur = posAt(p, t0);
    move(p, t0 + 0.15, t1, add(cur, mul(sub(sub(at, hand(team)), cur), reach)));
    swings.push({ pid: p, t: t1, kind: "lunge", bend: 0.95 });
  };

  /**
   * After the bounce at B (travelling along d), the ball comes off the back glass,
   * and off the side glass too if it's near a corner. Returns where it can be played.
   */
  const offTheGlass = (B: V, d: V, tB: number, v: number, team: Team, hWall: number, peak: number) => {
    const u = Math.max(0.2, (wallX(team) - B.x) / d.x);
    const Wp = inCourt({ x: wallX(team), y: B.y + d.y * u });
    const tW = tB + u / v;
    segs.push({ t0: tB, t1: tW, a: B, b: Wp, h0: 0, h1: hWall, peak });
    flashes.push({ t: tW, p: Wp, kind: "glass" });
    let dir: V = norm({ x: -d.x, y: d.y });
    let P = Wp;
    let tP = tW;
    let h = hWall;
    if ((Wp.y < 1.9 && dir.y < 0) || (Wp.y > 8.1 && dir.y > 0)) {
      const sideY = dir.y < 0 ? 0.12 : 9.88;
      const u2 = (sideY - Wp.y) / dir.y;
      if (u2 > 0 && u2 < 2.8) {
        const Ws = inCourt({ x: Wp.x + dir.x * u2, y: sideY });
        const tS = tW + u2 / (v * 0.8);
        segs.push({ t0: tW, t1: tS, a: Wp, b: Ws, h0: hWall, h1: hWall * 0.85, peak: hWall + 0.15 });
        flashes.push({ t: tS, p: Ws, kind: "side" });
        dir = { x: dir.x, y: -dir.y };
        P = Ws;
        tP = tS;
        h = hWall * 0.85;
      }
    }
    let K = inCourt(add(P, mul(dir, rand(1.5, 2.5))));
    K = { x: team === "L" ? Math.max(K.x, 1.3) : Math.min(K.x, 18.7), y: K.y };
    const tK = tP + dist(P, K) / (v * 0.7);
    segs.push({ t0: tP, t1: tK, a: P, b: K, h0: h, h1: rand(0.35, 0.95), peak: h + 0.3 });
    return { K, tK };
  };

  // 1. Walk to the serve formation.
  const sT = score.server;
  const f = formation(score);
  const tReady = start + 1.7;
  for (const p of PIDS) move(p, start, tReady, f[p]);
  const point = score.p[0] + score.p[1];
  const right: Half = sT === "L" ? "bottom" : "top";
  const serveHalf: Half = point % 2 === 0 ? right : right === "top" ? "bottom" : "top";
  const recvHalf: Half = serveHalf === "top" ? "bottom" : "top";
  const server = playerAt(sT, serveHalf);

  // 2. Bounce the ball once before serving.
  const hb = add(f[server], hand(sT));
  segs.push({ t0: tReady, t1: tReady + 0.28, a: hb, b: hb, h0: 1.0, h1: 0, peak: 1.0 });
  segs.push({ t0: tReady + 0.28, t1: tReady + 0.56, a: hb, b: hb, h0: 0, h1: 1.0, peak: 1.0 });
  segs.push({ t0: tReady + 0.56, t1: tReady + 0.85, a: hb, b: hb, h0: 1.0, h1: 0.9, peak: 1.0 });

  // 3. The rally.
  let hitter: PID = server;
  let C = hb;
  let t = tReady + 0.85;
  let n = 0;
  let forced: Shot | null = null;
  let pointTo: Team = sT;
  let caption = "";
  let end = t;

  for (;;) {
    const hT = TEAM[hitter];
    const oT = other(hT);
    const hp = posAt(hitter, t);
    const atNet = fromNet(hp.x) < 4.2;
    // How high the ball is as it's struck decides the stroke: bend for low balls, reach up for overheads.
    const cH = segs.length ? segs[segs.length - 1].h1 : 1.0;

    const type: Shot =
      forced ?? (n === 0 ? "serve" : atNet ? (Math.random() < 0.13 ? "lob" : "volley") : Math.random() < 0.32 ? "lob" : "drive");
    forced = null;
    swings.push(
      type === "serve"
        ? { pid: hitter, t, kind: "serve", bend: 0.35 }
        : type === "smash"
          ? { pid: hitter, t, kind: "over", bend: 0 }
          : cH >= 1.05
            ? { pid: hitter, t, kind: "volley", bend: 0.12 }
            : { pid: hitter, t, kind: "low", bend: clamp((1.15 - cH) / 0.8, 0.2, 0.9) },
    );

    // ----- Does this shot end the point? -----
    const endChance = n < 2 ? 0 : n > 16 ? 1 : type === "smash" ? 0.6 : Math.min(0.45, 0.05 + n * 0.04);
    if (Math.random() < endChance) {
      if (type === "smash" && Math.random() < 0.55) {
        // Por tres: the smash kicks up off the floor and flies out over the back glass.
        const B = { x: depthX(oT, rand(5.2, 6.6)), y: rand(2, 8) };
        const tB = t + dist(C, B) / SPEED.smash;
        segs.push({ t0: t, t1: tB, a: C, b: B, h0: 2.6, h1: 0, peak: 2.6 });
        const d = norm(sub(B, C));
        const u = Math.max(0.5, (wallX(oT) - B.x) / d.x);
        const Wp = { x: wallX(oT), y: clamp(B.y + d.y * u, 0.5, 9.5) };
        const tW = tB + u / 13;
        segs.push({ t0: tB, t1: tW, a: B, b: Wp, h0: 0, h1: 3.6, peak: 4.0 });
        const O = { x: oT === "L" ? -1.9 : 21.9, y: Wp.y + d.y * 1.4 };
        segs.push({ t0: tW, t1: tW + 0.55, a: Wp, b: O, h0: 3.6, h1: 0, peak: 4.4 });
        const O2 = { x: oT === "L" ? -2.25 : 22.25, y: O.y + d.y * 0.4 };
        segs.push({ t0: tW + 0.55, t1: tW + 0.95, a: O, b: O2, h0: 0, h1: 0, peak: 0.3 });
        lunge(oT, { x: depthX(oT, 8.6), y: Wp.y }, t, tW + 0.3, 0.8);
        caption = "SMASH · POR TRES";
        pointTo = hT;
        end = tW + 0.95;
      } else if (type === "smash") {
        // Smash winner: off the glass so high and fast the defenders can't get to it.
        const B = { x: depthX(oT, rand(4.8, 6.2)), y: rand(1.6, 8.4) };
        const tB = t + dist(C, B) / SPEED.smash;
        segs.push({ t0: t, t1: tB, a: C, b: B, h0: 2.6, h1: 0, peak: 2.6 });
        const d = norm(sub(B, C));
        const u = Math.max(0.5, (wallX(oT) - B.x) / d.x);
        const Wp = inCourt({ x: wallX(oT), y: B.y + d.y * u });
        const tW = tB + u / 15;
        segs.push({ t0: tB, t1: tW, a: B, b: Wp, h0: 0, h1: 2.4, peak: 3.0 });
        flashes.push({ t: tW, p: Wp, kind: "glass" });
        const B2 = inCourt({ x: depthX(oT, rand(4.6, 5.6)), y: Wp.y + d.y * 2 });
        const tB2 = tW + dist(Wp, B2) / 9;
        segs.push({ t0: tW, t1: tB2, a: Wp, b: B2, h0: 2.4, h1: 0, peak: 2.7 });
        const B3 = inCourt({ x: depthX(oT, 3.4), y: B2.y + d.y * 0.6 });
        segs.push({ t0: tB2, t1: tB2 + 0.6, a: B2, b: B3, h0: 0, h1: 0, peak: 0.6 });
        lunge(oT, B2, tW, tB2 + 0.2, 0.5);
        caption = "SMASH WINNER";
        pointTo = hT;
        end = tB2 + 0.6;
      } else if (type === "lob") {
        // Lob winner: over the net players, dies off the back glass.
        const B = { x: depthX(oT, rand(8.4, 8.9)), y: rand(1.5, 8.5) };
        const tB = t + dist(C, B) / SPEED.lob;
        segs.push({ t0: t, t1: tB, a: C, b: B, h0: cH, h1: 0, peak: 5.8 });
        const d = norm(sub(B, C));
        const u = Math.max(0.15, (wallX(oT) - B.x) / d.x);
        const Wp = inCourt({ x: wallX(oT), y: B.y + d.y * u });
        const tW = tB + u / 5;
        segs.push({ t0: tB, t1: tW, a: B, b: Wp, h0: 0, h1: 0.9, peak: 1.3 });
        flashes.push({ t: tW, p: Wp, kind: "glass" });
        const B2 = inCourt({ x: depthX(oT, 8.9), y: Wp.y + d.y * 0.5 });
        segs.push({ t0: tW, t1: tW + 0.32, a: Wp, b: B2, h0: 0.9, h1: 0, peak: 0.95 });
        const B3 = inCourt({ x: depthX(oT, 8.5), y: B2.y + d.y * 0.3 });
        segs.push({ t0: tW + 0.32, t1: tW + 0.7, a: B2, b: B3, h0: 0, h1: 0, peak: 0.18 });
        for (const p of PIDS.filter((q) => TEAM[q] === oT)) {
          const cur = posAt(p, t);
          move(p, t + 0.25, tW + 0.4, { x: depthX(oT, 6.4), y: cur.y });
        }
        caption = "LOB WINNER";
        pointTo = hT;
        end = tW + 0.7;
      } else if (type === "volley") {
        // Volley winner: angled away towards the side fence.
        const top = Math.random() < 0.5;
        const B = { x: depthX(oT, rand(3.0, 4.6)), y: top ? rand(0.7, 1.2) : rand(8.8, 9.3) };
        const tB = t + dist(C, B) / 16;
        segs.push({ t0: t, t1: tB, a: C, b: B, h0: cH, h1: 0, peak: 1.1 });
        const Sd = { x: B.x + (oT === "L" ? -1.2 : 1.2), y: top ? 0.12 : 9.88 };
        const tS = tB + dist(B, Sd) / 10;
        segs.push({ t0: tB, t1: tS, a: B, b: Sd, h0: 0, h1: 0.7, peak: 0.9 });
        flashes.push({ t: tS, p: Sd, kind: "side" });
        const B2 = { x: Sd.x + (oT === "L" ? -1.4 : 1.4), y: top ? 1.3 : 8.7 };
        segs.push({ t0: tS, t1: tS + 0.4, a: Sd, b: B2, h0: 0.7, h1: 0, peak: 0.8 });
        const B3 = { x: B2.x + (oT === "L" ? -1.2 : 1.2), y: top ? 1.8 : 8.2 };
        segs.push({ t0: tS + 0.4, t1: tS + 0.9, a: B2, b: B3, h0: 0, h1: 0, peak: 0.2 });
        lunge(oT, B, t, tB + 0.3, 0.6);
        caption = "VOLLEY WINNER";
        pointTo = hT;
        end = tS + 0.9;
      } else if (Math.random() < 0.38) {
        // Into the net.
        const N = { x: NETX + (hT === "L" ? -0.1 : 0.1), y: clamp(C.y + rand(-1.6, 1.6), 0.8, 9.2) };
        const tN = t + dist(C, N) / 14;
        segs.push({ t0: t, t1: tN, a: C, b: N, h0: cH, h1: 0.55, peak: Math.max(1.0, cH) });
        flashes.push({ t: tN, p: N, kind: "net" });
        const D = { x: depthX(hT, 0.7), y: N.y + 0.1 };
        segs.push({ t0: tN, t1: tN + 0.34, a: N, b: D, h0: 0.55, h1: 0, peak: 0.6 });
        const D2 = { x: depthX(hT, 1.15), y: N.y + 0.2 };
        segs.push({ t0: tN + 0.34, t1: tN + 0.62, a: D, b: D2, h0: 0, h1: 0, peak: 0.16 });
        caption = "INTO THE NET";
        pointTo = oT;
        end = tN + 0.62;
      } else {
        // Passing shot: down the line or through the middle.
        const r = Math.random();
        const B = { x: depthX(oT, rand(4.8, 7.2)), y: r < 0.45 ? rand(4.4, 5.6) : r < 0.72 ? rand(0.9, 1.4) : rand(8.6, 9.1) };
        const tB = t + dist(C, B) / 16.5;
        segs.push({ t0: t, t1: tB, a: C, b: B, h0: cH, h1: 0, peak: 1.2 });
        const d = norm(sub(B, C));
        const u = Math.max(0.5, (wallX(oT) - B.x) / d.x);
        const Wp = inCourt({ x: wallX(oT), y: B.y + d.y * u });
        const tW = tB + u / 12;
        segs.push({ t0: tB, t1: tW, a: B, b: Wp, h0: 0, h1: 0.8, peak: 1.0 });
        flashes.push({ t: tW, p: Wp, kind: "glass" });
        const B2 = inCourt({ x: depthX(oT, 8.4), y: Wp.y + d.y * 1.2 });
        const tB2 = tW + dist(Wp, B2) / 6;
        segs.push({ t0: tW, t1: tB2, a: Wp, b: B2, h0: 0.8, h1: 0, peak: 0.9 });
        const B3 = inCourt({ x: depthX(oT, 7.2), y: B2.y + d.y * 0.6 });
        segs.push({ t0: tB2, t1: tB2 + 0.55, a: B2, b: B3, h0: 0, h1: 0, peak: 0.28 });
        lunge(oT, B, t, tB + 0.25);
        caption = r < 0.45 ? "WINNER DOWN THE MIDDLE" : "WINNER DOWN THE LINE";
        pointTo = hT;
        end = tB2 + 0.55;
      }
      break;
    }

    // ----- The rally goes on -----
    let B: V;
    if (type === "serve") B = { x: depthX(oT, rand(3.6, 6.4)), y: recvHalf === "top" ? rand(1.2, 4.2) : rand(5.8, 8.8) };
    else if (type === "smash") B = { x: depthX(oT, rand(4.8, 6.6)), y: rand(1.4, 8.6) };
    else B = { x: depthX(oT, type === "lob" ? rand(7.7, 8.7) : type === "volley" ? rand(3.8, 6.4) : rand(4.6, 7.4)), y: rand(1.3, 8.7) };

    const rcv = playerAt(oT, B.y < 5 ? "top" : "bottom");
    // In a real rally most balls land within reach: pull the bounce a little towards the receiver.
    if (type !== "serve") B = { x: B.x, y: lerp(B.y, posAt(rcv, t).y, 0.3) };
    const rPart = partnerOf(rcv);
    const speed = SPEED[type];
    const h0 = type === "serve" ? 0.9 : type === "smash" ? 2.6 : cH;
    const rcvAtNet = fromNet(posAt(rcv, t).x) < 4.2;

    let K: V | null = null;
    let tK = t;

    if (type === "lob" && rcvAtNet && Math.random() < 0.5) {
      // A short lob: the net player steps back and smashes it out of the air.
      const ix = depthX(oT, rand(3.4, 5.0));
      const u = clamp((ix - C.x) / (B.x - C.x), 0.3, 0.95);
      K = inCourt({ x: ix, y: lerp(C.y, B.y, u) });
      tK = t + dist(C, K) / speed;
      segs.push({ t0: t, t1: tK, a: C, b: K, h0: cH, h1: 2.6, peak: 5.2 });
      forced = "smash";
    } else if (rcvAtNet && (type === "drive" || type === "volley") && Math.random() < 0.7) {
      // A net player cuts off a flat ball before it bounces: quick volleys.
      const ix = depthX(oT, 2.3);
      const u = (ix - C.x) / (B.x - C.x);
      if (u > 0.25 && u < 0.95) {
        K = inCourt({ x: ix, y: lerp(C.y, B.y, u) });
        tK = t + dist(C, K) / speed;
        const hv = rand(0.85, 1.3);
        segs.push({ t0: t, t1: tK, a: C, b: K, h0: cH, h1: hv, peak: Math.max(1.35, hv + 0.2) });
      }
    }

    if (!K) {
      const tB = t + dist(C, B) / speed;
      segs.push({ t0: t, t1: tB, a: C, b: B, h0, h1: 0, peak: PEAK[type] });
      const d = norm(sub(B, C));
      const v2 = speed * (type === "smash" ? 0.8 : 0.72);
      const carry = type === "lob" ? rand(2.6, 3.4) : rand(1.8, 3.2);
      const after = add(B, mul(d, carry));
      if (type === "smash" || (oT === "L" && after.x < 0.9) || (oT === "R" && after.x > 19.1)) {
        // Off the back glass (and the side glass in the corners), then played.
        const r = offTheGlass(B, d, tB, v2, oT, type === "smash" ? 2.3 : 1.5, type === "smash" ? 3.0 : type === "lob" ? 2.3 : 1.8);
        K = r.K;
        tK = r.tK;
        // After defending a smash off the glass, the usual answer is a lob to win back the net.
        if (type === "smash") forced = Math.random() < 0.65 ? "lob" : "drive";
      } else {
        K = inCourt(after);
        tK = tB + carry / v2;
        segs.push({ t0: tB, t1: tK, a: B, b: K, h0: 0, h1: rand(0.45, 1.0), peak: type === "lob" ? 2.0 : 1.15 });
      }
    }

    // Receiving pair: one goes to the ball, the partner lines up beside them.
    move(rcv, t + 0.12, tK - 0.04, sub(K, hand(oT)));
    const rd = fromNet(K.x);
    const partnerDepth = rd < 4.5 ? 2.7 : clamp(rd - 0.4, 2.5, 8.3);
    move(rPart, t + 0.2, tK, { x: depthX(oT, partnerDepth), y: baseY(rPart) + (K.y - 5) * 0.25 });

    // Hitting pair: after a lob, serve, volley or smash they take or hold the net; otherwise they hold their depth.
    for (const p of PIDS.filter((q) => TEAM[q] === hT)) {
      const cur = posAt(p, t);
      const depth = type === "drive" ? clamp(fromNet(cur.x), 2.6, 8.2) : 2.7;
      move(p, t + 0.25, Math.max(t + 0.9, tK - 0.1), { x: depthX(hT, depth), y: baseY(p) + (K.y - 5) * 0.3 });
    }

    hitter = rcv;
    C = K;
    t = tK;
    n++;
  }

  const golden = score.p[0] === 3 && score.p[1] === 3;
  const next = award(score, pointTo);
  const game = next.g[0] !== score.g[0] || next.g[1] !== score.g[1];
  if (golden) caption = `GOLDEN POINT · ${caption}`;
  else if (game) caption = `${caption} · GAME`;
  const scoreAt = end + 0.35;
  return { start, ballFrom: tReady, segs, moves, from, swings, flashes, scoreAt, score: next, caption, end: scoreAt + 1.6 };
}

// ---------- Drawing ----------
type Look = { shirt: string; hair: string; skin: string; legs?: string; shorts?: string; shoe?: string };

/** A spectator seen from above (seated or standing still), facing +x, centred on their shoulders. Drawn a little larger than life so it reads at card size. */
function Person({ look, seated }: { look: Look; seated?: boolean }) {
  return (
    <g transform="scale(1.32)">
      <ellipse cx="1.4" cy="1.7" rx={seated ? 4.6 : 3.4} ry="3.9" fill="#000" opacity="0.42" filter="url(#gpc-soft)" />
      {seated && (
        <g fill={look.legs ?? "#2b2f36"}>
          <rect x="0.4" y="-2.1" width="4.4" height="1.75" rx="0.85" />
          <rect x="0.4" y="0.35" width="4.4" height="1.75" rx="0.85" />
        </g>
      )}
      <rect x="-0.5" y="-3.7" width={seated ? 3.3 : 2.3} height="1.1" rx="0.55" fill={look.skin} transform="rotate(-3 -0.5 -3.4)" />
      <rect x="-0.5" y="2.6" width={seated ? 3.3 : 2.3} height="1.1" rx="0.55" fill={look.skin} transform="rotate(3 -0.5 3.2)" />
      <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill={look.shirt} />
      <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill="url(#gpc-shade)" />
      <ellipse cx="1.25" cy="0" rx="0.75" ry="1.05" fill={look.skin} />
      <circle cx="0.25" cy="0" r="1.42" fill={look.hair} />
      <circle cx="-0.15" cy="-0.45" r="0.6" fill="#fff" opacity="0.1" />
    </g>
  );
}

/** The parts of a moving figure that the animation updates every frame. */
type FigRefs = {
  body: SVGGElement | null;
  head: SVGGElement | null;
  arm: SVGGElement | null;
  swing: SVGGElement | null;
  legL: SVGLineElement | null;
  legR: SVGLineElement | null;
  shortL: SVGLineElement | null;
  shortR: SVGLineElement | null;
  footL: SVGEllipseElement | null;
  footR: SVGEllipseElement | null;
};
const newFig = (): FigRefs => ({ body: null, head: null, arm: null, swing: null, legL: null, legR: null, shortL: null, shortR: null, footL: null, footR: null });

// Hips and resting feet, in the figure's own units (facing +x, before the 1.32 scale).
const HIP_L: V = { x: -0.3, y: -0.85 };
const HIP_R: V = { x: -0.3, y: 0.85 };
// Ready stance: feet a little apart and just ahead of the shoulders, so the shoes show from above.
const FOOT_L: V = { x: 1.85, y: -1.45 };
const FOOT_R: V = { x: 1.85, y: 1.45 };

/**
 * A person on their feet, seen from above, facing +x. Legs show when they stride,
 * the back leans and lengthens when they bend, and the racket arm swings.
 */
function Figure({ look, racket, r }: { look: Look; racket?: string; r: FigRefs }) {
  const shorts = look.shorts ?? "#2a2d33";
  const shoe = look.shoe ?? "#e8e8e6";
  return (
    <g transform="scale(1.32)">
      {/* legs: shorts at the top, skin below, shoes */}
      <line ref={(el: SVGLineElement | null) => { r.legL = el; }} x1={HIP_L.x} y1={HIP_L.y} x2={FOOT_L.x} y2={FOOT_L.y} stroke={look.skin} strokeWidth="0.95" strokeLinecap="round" />
      <line ref={(el: SVGLineElement | null) => { r.legR = el; }} x1={HIP_R.x} y1={HIP_R.y} x2={FOOT_R.x} y2={FOOT_R.y} stroke={look.skin} strokeWidth="0.95" strokeLinecap="round" />
      <line ref={(el: SVGLineElement | null) => { r.shortL = el; }} x1={HIP_L.x} y1={HIP_L.y} x2={HIP_L.x} y2={HIP_L.y} stroke={shorts} strokeWidth="1.35" strokeLinecap="round" />
      <line ref={(el: SVGLineElement | null) => { r.shortR = el; }} x1={HIP_R.x} y1={HIP_R.y} x2={HIP_R.x} y2={HIP_R.y} stroke={shorts} strokeWidth="1.35" strokeLinecap="round" />
      <ellipse ref={(el: SVGEllipseElement | null) => { r.footL = el; }} cx={FOOT_L.x} cy={FOOT_L.y} rx="0.85" ry="0.48" fill={shoe} />
      <ellipse ref={(el: SVGEllipseElement | null) => { r.footR = el; }} cx={FOOT_R.x} cy={FOOT_R.y} rx="0.85" ry="0.48" fill={shoe} />
      {/* back and shoulders, with the free arm */}
      <g ref={(el: SVGGElement | null) => { r.body = el; }}>
        <rect x="-0.5" y={racket ? -3.95 : -3.7} width={racket ? 3.1 : 2.3} height="1.1" rx="0.55" fill={look.skin} transform={`rotate(${racket ? -8 : -3} -0.5 -3.4)`} />
        <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill={look.shirt} />
        <rect x="-1.8" y="-3.6" width="3.6" height="7.2" rx="1.75" fill="url(#gpc-shade)" />
      </g>
      {racket ? (
        <g ref={(el: SVGGElement | null) => { r.swing = el; }}>
          <rect x="-0.4" y="2.8" width="3.6" height="1.15" rx="0.57" fill={look.skin} transform="rotate(22 -0.4 3.3)" />
          <line x1="2.6" y1="5" x2="3.5" y2="5.8" stroke="#111" strokeWidth="0.7" strokeLinecap="round" />
          <ellipse cx="4.6" cy="6.75" rx="1.55" ry="1.95" transform="rotate(-40 4.6 6.75)" fill="#151515" stroke={racket} strokeWidth="0.42" />
          <ellipse cx="4.45" cy="6.55" rx="0.6" ry="0.85" transform="rotate(-40 4.45 6.55)" fill="#fff" opacity="0.08" />
        </g>
      ) : (
        <g ref={(el: SVGGElement | null) => { r.arm = el; }}>
          <rect x="-0.5" y="2.6" width="2.3" height="1.1" rx="0.55" fill={look.skin} transform="rotate(3 -0.5 3.2)" />
        </g>
      )}
      <g ref={(el: SVGGElement | null) => { r.head = el; }}>
        <ellipse cx="1.25" cy="0" rx="0.75" ry="1.05" fill={look.skin} />
        <circle cx="0.25" cy="0" r="1.42" fill={look.hair} />
        <circle cx="-0.15" cy="-0.45" r="0.6" fill="#fff" opacity="0.1" />
      </g>
    </g>
  );
}

/** Put a figure in a pose: where each foot is, how far they bend, the racket or arm angle, a head nod. */
function pose(r: FigRefs, o: { fl: V; fr: V; bend: number; swing?: number; arm?: number; nod?: number }) {
  const b = o.bend;
  const leg = (line: SVGLineElement | null, short: SVGLineElement | null, foot: SVGEllipseElement | null, hip: V, f: V) => {
    line?.setAttribute("x2", f.x.toFixed(2));
    line?.setAttribute("y2", f.y.toFixed(2));
    short?.setAttribute("x2", lerp(hip.x, f.x, 0.42).toFixed(2));
    short?.setAttribute("y2", lerp(hip.y, f.y, 0.42).toFixed(2));
    foot?.setAttribute("cx", f.x.toFixed(2));
    foot?.setAttribute("cy", f.y.toFixed(2));
  };
  leg(r.legL, r.shortL, r.footL, HIP_L, o.fl);
  leg(r.legR, r.shortR, r.footR, HIP_R, o.fr);
  // Bending forward: from above the back looks longer and the head moves out over the feet.
  r.body?.setAttribute("transform", `translate(${(b * 1.1).toFixed(2)} 0) scale(${(1 + b * 0.32).toFixed(3)} ${(1 - b * 0.06).toFixed(3)})`);
  r.head?.setAttribute("transform", `translate(${(b * 2.1 + (o.nod ?? 0)).toFixed(2)} 0) scale(${(1 - b * 0.12).toFixed(3)})`);
  r.swing?.setAttribute("transform", `translate(${(b * 0.9).toFixed(2)} 0) rotate(${(o.swing ?? 0).toFixed(1)})`);
  r.arm?.setAttribute("transform", `rotate(${(o.arm ?? 0).toFixed(1)} -0.5 3.2)`);
}

// Small groups standing and chatting, facing each other.
type Talker = { x: number; y: number; group: number; look: Look };
const GROUPS: V[] = [
  { x: 36, y: 186.5 },
  { x: 100, y: 15.5 },
  { x: 286.5, y: 100 },
];
const TALKERS: Talker[] = [
  { x: 29.5, y: 183.5, group: 0, look: { shirt: "#3d4b3a", hair: "#1a1410", skin: "#a8785a", shorts: "#2a2d33", shoe: "#d9d6cf" } },
  { x: 42.5, y: 183.5, group: 0, look: { shirt: "#e9e5dc", hair: "#4a3626", skin: "#d2a684", shorts: "#3a4a5e", shoe: "#ffffff" } },
  { x: 36, y: 192.5, group: 0, look: { shirt: "#7a2f2f", hair: "#120e0b", skin: "#8d5f43", shorts: "#1f2229", shoe: "#c8f031" } },
  { x: 93, y: 15.5, group: 1, look: { shirt: "#22252b", hair: "#6b4f35", skin: "#c99a76", shorts: "#2f3540", shoe: "#ffffff" } },
  { x: 107, y: 15.5, group: 1, look: { shirt: "#b8a68a", hair: "#15110e", skin: "#b98a68", shorts: "#2a2d33", shoe: "#e8e8e6" } },
  { x: 286.5, y: 93, group: 2, look: { shirt: "#4a5a6e", hair: "#2c2018", skin: "#c69a78", shorts: "#22252b", shoe: "#e8e8e6" } },
  { x: 286.5, y: 107, group: 2, look: { shirt: "#d9d4c8", hair: "#3b2a1e", skin: "#a8785a", shorts: "#3c3a35", shoe: "#ffffff" } },
];
const COURT_CENTRE: V = { x: sx(NETX), y: sy(5) };

// Visitors: people who wander in, find a spot by the glass, watch, get bored, and leave.
// Spots are where they stand (drawing units) with the way that faces the court and the way in/out.
type Spot = { x: number; y: number; face: number; door: V };
const SPOTS: Spot[] = [
  { x: 52, y: 29, face: 90, door: { x: 28, y: -12 } },
  { x: 63.5, y: 30, face: 90, door: { x: 28, y: -12 } },
  { x: 21, y: 72, face: 0, door: { x: -12, y: 58 } },
  { x: 21, y: 128, face: 0, door: { x: -12, y: 142 } },
  { x: 281, y: 150, face: 180, door: { x: 312, y: 166 } },
  { x: 281, y: 54, face: 180, door: { x: 312, y: 44 } },
];
// Pairs of spots side by side: friends sometimes arrive together.
const NEXT_TO: Record<number, number> = { 0: 1, 1: 0 };
const VISITORS: Look[] = [
  { shirt: "#2f3a4a", hair: "#15110e", skin: "#a8785a", shorts: "#22252b", shoe: "#e8e8e6" },
  { shirt: "#e4e0d6", hair: "#6b4f35", skin: "#d2a684", shorts: "#3a4a5e", shoe: "#ffffff" },
  { shirt: "#5b3a5e", hair: "#1a1410", skin: "#8d5f43", shorts: "#1f2229", shoe: "#d9d6cf" },
  { shirt: "#c46b3c", hair: "#2c2018", skin: "#c99a76", shorts: "#2a2d33", shoe: "#ffffff" },
  { shirt: "#3e5f55", hair: "#9c7b52", skin: "#d2a684", shorts: "#3c3a35", shoe: "#e8e8e6" },
  { shirt: "#1f2125", hair: "#120e0b", skin: "#b98a68", shorts: "#1b1d21", shoe: "#c8f031" },
  { shirt: "#a9b4c2", hair: "#3b2a1e", skin: "#a8785a", shorts: "#2f3540", shoe: "#ffffff" },
  { shirt: "#8a6d3b", hair: "#15110e", skin: "#c69a78", shorts: "#22252b", shoe: "#d9d6cf" },
  { shirt: "#f0ede6", hair: "#4a3626", skin: "#8d5f43", shorts: "#3a4a5e", shoe: "#e8e8e6" },
];
const WALK = 16; // drawing units per second (about 1.3 m/s)
type Visit = {
  phase: "away" | "in" | "watch" | "bored" | "out";
  spot: number;
  pos: V;
  from: V;
  to: V;
  t0: number;
  t1: number;
  until: number;
  face: number;
  phaseLeg: number;
};
/** Who's there when the page opens: three people already watching. */
const firstVisits = (): Visit[] =>
  VISITORS.map((_, i) => {
    const sp = SPOTS[i];
    if (i < 3) return { phase: "watch", spot: i, pos: { x: sp.x, y: sp.y }, from: { x: sp.x, y: sp.y }, to: { x: sp.x, y: sp.y }, t0: 0, t1: 0, until: 9 + i * 7, face: sp.face, phaseLeg: 0 };
    return { phase: "away", spot: -1, pos: { x: -40, y: -40 }, from: { x: -40, y: -40 }, to: { x: -40, y: -40 }, t0: 0, t1: 0, until: 3 + i * 2.5, face: 0, phaseLeg: 0 };
  });
const angleTo = (from: V, to: V) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const turn = (from: number, to: number) => ((to - from + 540) % 360) - 180;

const LOOKS: Record<PID, { look: Look; rim: string }> = {
  L1: { look: { shirt: "#ecebe6", hair: "#2a1d14", skin: "#c69a78", shorts: "#23262c", shoe: "#c8f031" }, rim: "#c8f031" },
  L2: { look: { shirt: "#d8d6cf", hair: "#15110e", skin: "#a8785a", shorts: "#23262c", shoe: "#f2f2f0" }, rim: "#e9e9e9" },
  R1: { look: { shirt: "#6e2626", hair: "#8f6d47", skin: "#c99a76", shorts: "#15161a", shoe: "#f2f2f0" }, rim: "#e9e9e9" },
  R2: { look: { shirt: "#1c1e22", hair: "#3b2a1e", skin: "#d2a684", shorts: "#15161a", shoe: "#d64545" }, rim: "#d64545" },
};

// People watching: position (drawing units), the way they face (degrees), and whether they follow the ball.
type Watcher = { x: number; y: number; face: number; look: Look; seated?: boolean; follows: number };
const WATCHERS: Watcher[] = [
  { x: 74, y: 182.5, face: -90, seated: true, follows: 0.7, look: { shirt: "#3a4a5e", hair: "#1a1410", skin: "#b98a68", legs: "#1f2229" } },
  { x: 96, y: 182.5, face: -90, seated: true, follows: 0.6, look: { shirt: "#c9c2b0", hair: "#2c2018", skin: "#c99a76", legs: "#3c3a35" } },
  { x: 118, y: 182.5, face: -90, seated: true, follows: 0.75, look: { shirt: "#5a5f3d", hair: "#120e0b", skin: "#8d5f43", legs: "#22252b" } },
  { x: 182, y: 182.5, face: -90, seated: true, follows: 0.7, look: { shirt: "#8a2f3a", hair: "#3b2a1e", skin: "#d2a684", legs: "#1f2229" } },
  { x: 204, y: 182.5, face: -90, seated: true, follows: 0.55, look: { shirt: "#e6e3dc", hair: "#1a1410", skin: "#a8785a", legs: "#2f3540" } },
  { x: 226, y: 182.5, face: -90, seated: true, follows: 0.7, look: { shirt: "#2d3036", hair: "#6b4f35", skin: "#c69a78", legs: "#1b1d21" } },
  { x: 236.5, y: 18, face: 0, seated: true, follows: 0.15, look: { shirt: "#40464f", hair: "#1a1410", skin: "#b98a68", legs: "#20232a" } },
  { x: 255.5, y: 18, face: 180, seated: true, follows: 0.35, look: { shirt: "#b8a68a", hair: "#3b2a1e", skin: "#c99a76", legs: "#33302b" } },
];

// Steel posts every 2 m; glass for 4 m from each back wall, mesh between, doors by the net.
const GLASS_RETURN = 4 * S;
const NET_SX = sx(NETX);
const DOORS: [number, number][] = [
  [NET_SX - 22, NET_SX - 10],
  [NET_SX + 10, NET_SX + 22],
];
const POSTS: [number, number][] = [];
for (let i = 0; i <= 10; i++) POSTS.push([OX + i * 24, OY], [OX + i * 24, OY + H]);
for (let j = 1; j < 5; j++) POSTS.push([OX, OY + j * 24], [OX + W, OY + j * 24]);
const MESH: [number, number][] = [
  [OX + GLASS_RETURN, DOORS[0][0]],
  [DOORS[0][1], DOORS[1][0]],
  [DOORS[1][1], OX + W - GLASS_RETURN],
];
const LIGHTS: [number, number][] = [
  [OX - 8, OY - 8],
  [OX + W + 8, OY - 8],
  [OX - 8, OY + H + 8],
  [OX + W + 8, OY + H + 8],
];
const POINTS = ["0", "15", "30", "40"];

// Each post throws a short shadow into the court, away from its nearest floodlight.
const POST_SHADOWS: [number, number, number, number][] = POSTS.flatMap(([x, y]) => {
  const [lx, ly] = LIGHTS.reduce((a, b) => (Math.hypot(b[0] - x, b[1] - y) < Math.hypot(a[0] - x, a[1] - y) ? b : a));
  const dx = x - lx;
  const dy = y - ly;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const inward = (x <= OX ? ux : x >= OX + W ? -ux : 0) + (y <= OY ? uy : y >= OY + H ? -uy : 0);
  if (inward <= 0.15) return [];
  const k = 10 + 6 * inward;
  return [[x, y, x + ux * k, y + uy * k]];
});

/** A palm seen from above. */
function Palm({ x, y, r }: { x: number; y: number; r: number }) {
  const leaves = 11;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="2" cy="2.5" r={r * 0.95} fill="#000" opacity="0.35" filter="url(#gpc-soft)" />
      {Array.from({ length: leaves }, (_, i) => (
        <g key={i} transform={`rotate(${(360 / leaves) * i + (i % 2) * 9})`}>
          <path d={`M0 0 Q ${r * 0.5} ${-r * 0.16} ${r} 0 Q ${r * 0.5} ${r * 0.16} 0 0`} fill={i % 2 ? "#2f4a2b" : "#3a5a33"} />
          <line x1="0" y1="0" x2={r * 0.95} y2="0" stroke="#4f7346" strokeWidth="0.25" opacity="0.7" />
        </g>
      ))}
      <circle r={r * 0.12} fill="#5a4330" />
    </g>
  );
}

export function CourtDrawing({ className }: { className?: string }) {
  const players = useRef<Record<PID, SVGGElement | null>>({ L1: null, L2: null, R1: null, R2: null });
  const figs = useRef<Record<PID, FigRefs>>({ L1: newFig(), L2: newFig(), R1: newFig(), R2: newFig() });
  const visitors = useRef<{ root: SVGGElement | null; shadow: SVGEllipseElement | null; fig: FigRefs }[]>(VISITORS.map(() => ({ root: null, shadow: null, fig: newFig() })));
  const talkers = useRef<{ root: SVGGElement | null; fig: FigRefs }[]>(TALKERS.map(() => ({ root: null, fig: newFig() })));
  const ball = useRef<SVGGElement | null>(null);
  const ballUp = useRef<SVGGElement | null>(null);
  const ballShadow = useRef<SVGEllipseElement | null>(null);
  const heightLine = useRef<SVGLineElement | null>(null);
  const trail = useRef<(SVGCircleElement | null)[]>([]);
  const bounceRing = useRef<SVGCircleElement | null>(null);
  const glassFlash = useRef<SVGEllipseElement | null>(null);
  const netFlash = useRef<SVGLineElement | null>(null);
  const sideFlash = useRef<SVGEllipseElement | null>(null);
  const caption = useRef<SVGTextElement | null>(null);
  const watchers = useRef<(SVGGElement | null)[]>([]);
  const shadows = useRef<Record<string, SVGEllipseElement | null>>({});
  const scoreL = useRef<SVGTextElement | null>(null);
  const scoreR = useRef<SVGTextElement | null>(null);
  const gamesL = useRef<SVGTextElement | null>(null);
  const gamesR = useRef<SVGTextElement | null>(null);
  const root = useRef<SVGSVGElement | null>(null);

  const first: Score = { p: [0, 0], g: [0, 0], server: "L" };
  const start = formation(first);

  useEffect(() => {
    // People who turn off motion get one still frame of the court (with its shadows).
    const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let score = first;
    let shown = first;
    let plan = planPoint(0, start, score);
    let sim = 0;
    let last = performance.now();
    let visible = true;
    let frame = 0;
    let capAt = -99;
    let history: V[] = []; // recent ball positions (drawing units, lifted by height) for the trail
    const facing: Record<PID, number> = { L1: 0, L2: 0, R1: 180, R2: 180 };
    const looks = WATCHERS.map((w) => w.face);
    // Running: smoothed velocity (m/s), stride phase, and the lean that comes with speed.
    const motion = {} as Record<PID, { prev: V; v: V; phase: number; stride: number }>;
    for (const p of PIDS) motion[p] = { prev: { ...start[p] }, v: { x: 0, y: 0 }, phase: 0, stride: 0 };
    const talkFace = TALKERS.map((m) => angleTo(m, GROUPS[m.group]));
    const visits = firstVisits();
    const spotFreeAt = SPOTS.map((_, i) => (i < 3 ? Infinity : 4 + i * 3)); // when each empty spot can take someone new
    const walkTo = (v: Visit, to: V, now: number) => {
      v.from = { ...v.pos };
      v.to = to;
      v.t0 = now;
      v.t1 = now + dist(v.from, to) / WALK;
    };

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (root.current) io.observe(root.current);

    const ballAt = (t: number) => {
      const segs = plan.segs;
      let s = segs[segs.length - 1];
      for (const g of segs) {
        if (t < g.t1) {
          s = g;
          break;
        }
      }
      const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
      const h = lerp(s.h0, s.h1, u) + 4 * Math.max(0, s.peak - Math.max(s.h0, s.h1)) * u * (1 - u);
      return { p: { x: lerp(s.a.x, s.b.x, u), y: lerp(s.a.y, s.b.y, u) }, h };
    };

    /** Racket angle, bend and dive for a player at time t, from their strokes. */
    const stroke = (pid: PID, t: number) => {
      for (const s of plan.swings) {
        if (s.pid !== pid) continue;
        const d = t - s.t;
        if (d < -0.45 || d > 0.6) continue;
        const [wind, hit] = s.kind === "over" ? [-135, 32] : s.kind === "volley" ? [-30, 22] : [-55, 38];
        const angle = d < 0 ? wind * smooth((d + 0.45) / 0.45) : d < 0.14 ? lerp(wind, hit, d / 0.14) : hit * (1 - smooth((d - 0.14) / 0.46));
        const bell = d < 0 ? smooth((d + 0.45) / 0.45) : 1 - smooth(clamp((d - 0.1) / 0.5, 0, 1));
        return { angle, bend: s.bend * bell, dive: s.kind === "lunge" ? bell : 0 };
      }
      return { angle: 0, bend: 0, dive: 0 };
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && !document.hidden && !still) sim += dt;
      while (sim >= plan.end) {
        const from = {} as Record<PID, V>;
        for (const p of PIDS) from[p] = posIn(plan.moves[p], plan.from[p], plan.end);
        score = plan.score;
        plan = planPoint(plan.end, from, score);
      }
      const t = sim;
      const b = ballAt(t);
      const ballOn = t >= plan.ballFrom;

      // Players: where they are, which way they look, and the racket swing.
      for (const p of PIDS) {
        const pos = posIn(plan.moves[p], plan.from[p], t);
        const base = TEAM[p] === "L" ? 0 : 180;
        let want = base;
        if (ballOn) {
          const a = (Math.atan2(b.p.y - pos.y, b.p.x - pos.x) * 180) / Math.PI;
          const delta = ((a - base + 540) % 360) - 180;
          want = base + clamp(delta, -38, 38);
        }
        facing[p] += (want - facing[p]) * 0.12;
        players.current[p]?.setAttribute("transform", `translate(${sx(pos.x).toFixed(2)} ${sy(pos.y).toFixed(2)}) rotate(${facing[p].toFixed(1)})`);
        // Four floodlight shadows: longer and fainter the further the light.
        const px = sx(pos.x);
        const py = sy(pos.y);
        LIGHTS.forEach(([lx, ly], i) => {
          const el = shadows.current[`${p}${i}`];
          if (!el) return;
          const dx = px - lx;
          const dy = py - ly;
          const l = Math.hypot(dx, dy) || 1;
          const reach = 2.6 + l * 0.018;
          el.setAttribute("cx", (px + (dx / l) * reach).toFixed(2));
          el.setAttribute("cy", (py + (dy / l) * reach).toFixed(2));
          el.setAttribute("rx", (3.2 + l * 0.012).toFixed(2));
          el.setAttribute("transform", `rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)} ${(px + (dx / l) * reach).toFixed(2)} ${(py + (dy / l) * reach).toFixed(2)})`);
          el.setAttribute("opacity", Math.max(0.08, 0.34 - l * 0.0011).toFixed(2));
        });
        // Legs: stride with the speed, in the direction they're moving relative to where they face.
        const m = motion[p];
        if (dt > 0) {
          const rv = { x: (pos.x - m.prev.x) / dt, y: (pos.y - m.prev.y) / dt };
          m.v = { x: lerp(m.v.x, rv.x, 0.25), y: lerp(m.v.y, rv.y, 0.25) };
        }
        m.prev = pos;
        const speed = len(m.v);
        m.phase += speed * dt * 3.1;
        m.stride = lerp(m.stride, clamp(speed * 0.8, 0, 3.4), 0.2);
        const fr = (-facing[p] * Math.PI) / 180;
        const dir = speed > 0.05 ? norm({ x: m.v.x * Math.cos(fr) - m.v.y * Math.sin(fr), y: m.v.x * Math.sin(fr) + m.v.y * Math.cos(fr) }) : { x: 1, y: 0 };
        const st = stroke(p, t);
        const swingStep = Math.sin(m.phase) * m.stride;
        const spread = 0.35 * st.bend + 1.3 * st.dive; // feet wider when bending low or diving
        pose(figs.current[p], {
          fl: { x: FOOT_L.x + dir.x * swingStep + st.dive * 1.2, y: FOOT_L.y + dir.y * swingStep - spread },
          fr: { x: FOOT_R.x - dir.x * swingStep - st.dive * 0.6, y: FOOT_R.y - dir.y * swingStep + spread },
          bend: clamp(st.bend + clamp((speed - 3) / 4, 0, 1) * 0.22, 0, 1),
          swing: st.angle,
        });
      }

      // Ball: its spot on the ground (shadow) and its height (lifted and a touch larger).
      // The shadow marks the spot on the ground; the ball is lifted above it by its height,
      // joined by a thin dotted line when it's high, with a short trail showing where it's going.
      const lift = { x: b.h * 1.1, y: -b.h * 2.2 };
      if (ball.current) {
        ball.current.setAttribute("opacity", ballOn ? "1" : "0");
        ball.current.setAttribute("transform", `translate(${sx(b.p.x).toFixed(2)} ${sy(b.p.y).toFixed(2)})`);
        ballUp.current?.setAttribute("transform", `translate(${lift.x.toFixed(2)} ${lift.y.toFixed(2)}) scale(${(1 + Math.min(b.h, 6) * 0.1).toFixed(3)})`);
        const sh = ballShadow.current;
        if (sh) {
          sh.setAttribute("opacity", Math.max(0.14, 0.6 - Math.min(b.h, 5) * 0.09).toFixed(2));
          sh.setAttribute("rx", (1.5 + Math.min(b.h, 5) * 0.28).toFixed(2));
          sh.setAttribute("ry", (1.1 + Math.min(b.h, 5) * 0.2).toFixed(2));
        }
        const hl = heightLine.current;
        if (hl) {
          hl.setAttribute("x2", lift.x.toFixed(2));
          hl.setAttribute("y2", (lift.y + 1.2).toFixed(2));
          hl.setAttribute("opacity", clamp((b.h - 0.5) / 1.2, 0, 0.55).toFixed(2));
        }
      }
      const here = { x: sx(b.p.x) + lift.x, y: sy(b.p.y) + lift.y };
      const lastP = history[history.length - 1];
      if (!ballOn || (lastP && Math.hypot(here.x - lastP.x, here.y - lastP.y) > 25)) history = [];
      if (ballOn && dt > 0) history.push(here);
      if (history.length > 16) history.shift();
      trail.current.forEach((c, i) => {
        if (!c) return;
        const hp = history[history.length - 1 - (i + 1) * 2];
        if (!hp) return c.setAttribute("opacity", "0");
        c.setAttribute("cx", hp.x.toFixed(2));
        c.setAttribute("cy", hp.y.toFixed(2));
        c.setAttribute("opacity", (0.5 * (1 - i / 7)).toFixed(2));
      });

      // A ring on the turf where the ball bounces.
      if (bounceRing.current) {
        let ring = 0;
        let at: V | null = null;
        for (let i = 0; i < plan.segs.length - 1; i++) {
          const sg = plan.segs[i];
          const d = t - sg.t1;
          if (sg.h1 === 0 && plan.segs[i + 1].h0 === 0 && d >= 0 && d < 0.5 && fromNet(sg.b.x) < 10.2) {
            ring = d / 0.5;
            at = sg.b;
          }
        }
        if (at) {
          bounceRing.current.setAttribute("cx", sx(at.x).toFixed(2));
          bounceRing.current.setAttribute("cy", sy(at.y).toFixed(2));
          bounceRing.current.setAttribute("r", (1.4 + ring * 4.5).toFixed(2));
          bounceRing.current.setAttribute("opacity", (0.75 * (1 - ring)).toFixed(2));
        } else bounceRing.current.setAttribute("opacity", "0");
      }

      // Glass and net flashes where the ball hits.
      let g = 0;
      let sf = 0;
      let nf = 0;
      for (const f of plan.flashes) {
        const d = t - f.t;
        if (d < 0 || d > 0.4) continue;
        if (f.kind === "glass" && glassFlash.current) {
          g = 1 - d / 0.4;
          glassFlash.current.setAttribute("cx", sx(f.p.x < NETX ? 0 : 20).toFixed(2));
          glassFlash.current.setAttribute("cy", sy(f.p.y).toFixed(2));
        }
        if (f.kind === "side" && sideFlash.current) {
          sf = 1 - d / 0.4;
          sideFlash.current.setAttribute("cx", sx(f.p.x).toFixed(2));
          sideFlash.current.setAttribute("cy", sy(f.p.y < 5 ? 0 : 10).toFixed(2));
        }
        if (f.kind === "net") nf = 1 - d / 0.4;
      }
      glassFlash.current?.setAttribute("opacity", (g * 0.9).toFixed(2));
      sideFlash.current?.setAttribute("opacity", (sf * 0.9).toFixed(2));
      netFlash.current?.setAttribute("opacity", (nf * 0.9).toFixed(2));

      // Spectators turn to follow the ball.
      WATCHERS.forEach((w, i) => {
        let want = w.face;
        if (ballOn) {
          const a = (Math.atan2(sy(b.p.y) - w.y, sx(b.p.x) - w.x) * 180) / Math.PI;
          const delta = ((a - w.face + 540) % 360) - 180;
          want = w.face + clamp(delta, -50, 50) * w.follows;
        }
        looks[i] += (want - looks[i]) * 0.06;
        watchers.current[i]?.setAttribute("transform", `translate(${w.x} ${w.y}) rotate(${looks[i].toFixed(1)})`);
      });

      // Visitors: arrive, watch the ball, get bored (look away, check their phone), leave; someone new comes.
      const taken = new Set(visits.filter((v) => v.phase !== "away").map((v) => v.spot));
      SPOTS.forEach((sp, si) => {
        if (taken.has(si) || t < spotFreeAt[si]) return;
        const idle = visits.map((v, i) => [v, i] as const).filter(([v]) => v.phase === "away" && t >= v.until);
        if (!idle.length) return;
        const [v] = idle[Math.floor(Math.random() * idle.length)];
        v.phase = "in";
        v.spot = si;
        v.pos = { ...sp.door };
        walkTo(v, sp, t);
        taken.add(si);
        // Now and then a friend comes along to the spot beside them.
        const nb = NEXT_TO[si];
        if (nb !== undefined && !taken.has(nb) && Math.random() < 0.5) {
          const friend = visits.find((w) => w.phase === "away" && w !== v && t >= w.until);
          if (friend) {
            friend.phase = "in";
            friend.spot = nb;
            friend.pos = { x: sp.door.x - 6, y: sp.door.y - 4 };
            walkTo(friend, SPOTS[nb], t);
            taken.add(nb);
          }
        }
      });
      visits.forEach((v, i) => {
        const r = visitors.current[i];
        if (v.phase === "away") {
          r.root?.setAttribute("opacity", "0");
          r.shadow?.setAttribute("opacity", "0");
          return;
        }
        const sp = SPOTS[v.spot];
        let moving = false;
        if (v.phase === "in" || v.phase === "out") {
          const u = clamp((t - v.t0) / Math.max(0.01, v.t1 - v.t0), 0, 1);
          v.pos = { x: lerp(v.from.x, v.to.x, u), y: lerp(v.from.y, v.to.y, u) };
          moving = u < 1;
          if (moving) v.face += turn(v.face, angleTo(v.from, v.to)) * 0.2;
          if (!moving && v.phase === "in") {
            v.phase = "watch";
            v.until = t + rand(14, 36);
          }
          if (!moving && v.phase === "out") {
            v.phase = "away";
            v.until = t + rand(4, 14);
            spotFreeAt[v.spot] = t + rand(2, 7);
            v.spot = -1;
            return;
          }
        }
        let arm = -4 + 3 * Math.sin(t * 0.8 + i);
        let nod = 0;
        if (v.phase === "watch") {
          // Follow the ball, a little lazily.
          const toBall = ballOn ? angleTo(v.pos, { x: sx(b.p.x), y: sy(b.p.y) }) : sp.face;
          v.face += turn(v.face, sp.face + clamp(turn(sp.face, toBall), -55, 55) * 0.8) * 0.06;
          if (t >= v.until) {
            v.phase = "bored";
            v.until = t + rand(2.5, 5);
          }
        } else if (v.phase === "bored") {
          // Looks away and checks their phone, then heads off.
          v.face += turn(v.face, sp.face + 70 * (i % 2 ? 1 : -1)) * 0.04;
          arm = -78;
          nod = -0.35;
          if (t >= v.until) {
            v.phase = "out";
            walkTo(v, sp.door, t);
          }
        }
        const speed = moving ? WALK / S : 0; // m/s
        v.phaseLeg += speed * dt * 3.1;
        const step = Math.sin(v.phaseLeg) * clamp(speed * 0.8, 0, 3.4);
        const shift = moving ? 0 : Math.sin(t * 0.9 + i * 2.1) * 0.35;
        r.root?.setAttribute("opacity", "1");
        r.root?.setAttribute("transform", `translate(${v.pos.x.toFixed(2)} ${v.pos.y.toFixed(2)}) rotate(${v.face.toFixed(1)})`);
        r.shadow?.setAttribute("opacity", "0.4");
        r.shadow?.setAttribute("cx", (v.pos.x + 1.8).toFixed(2));
        r.shadow?.setAttribute("cy", (v.pos.y + 2.2).toFixed(2));
        pose(r.fig, {
          fl: { x: 1.35 + step + shift * 0.4, y: -1.1 },
          fr: { x: 1.35 - step - shift * 0.4, y: 1.1 },
          bend: moving ? 0.06 : 0.02,
          arm,
          nod,
        });
      });

      // Groups chatting: one talks with their hands while the others nod; they all turn to look when a point ends.
      const react = t >= plan.scoreAt - 0.3 && t < plan.scoreAt + 2.4 ? Math.sin(clamp((t - plan.scoreAt + 0.3) / 2.7, 0, 1) * Math.PI) : 0;
      TALKERS.forEach((m, i) => {
        const g = GROUPS[m.group];
        const size = TALKERS.filter((q) => q.group === m.group).length;
        const idx = TALKERS.filter((q, j) => q.group === m.group && j < i).length;
        const speaker = Math.floor((t + m.group * 1.3) / 2.8) % size;
        const talking = speaker === idx;
        const base = angleTo(m, g);
        const toCourt = angleTo(m, COURT_CENTRE);
        const want = base + turn(base, toCourt) * 0.75 * react + (talking ? Math.sin(t * 1.7 + i) * 6 : 0);
        talkFace[i] += turn(talkFace[i], want) * 0.08;
        const r = talkers.current[i];
        const shift = Math.sin(t * 0.9 + i * 2.1) * 0.35; // weight shifting foot to foot
        r.root?.setAttribute("transform", `translate(${m.x} ${m.y}) rotate(${talkFace[i].toFixed(1)})`);
        pose(r.fig, {
          fl: { x: 1.35 + shift * 0.4, y: -1.1 },
          fr: { x: 1.35 - shift * 0.4, y: 1.1 },
          bend: talking ? 0.06 + 0.04 * Math.sin(t * 3.1) : 0.02,
          arm: talking ? -35 + 22 * Math.sin(t * 5.3 + i) : -4 + 3 * Math.sin(t * 0.8 + i),
          nod: talking ? 0.22 * Math.sin(t * 6.5) : 0.28 * Math.max(0, Math.sin(t * 2.2 + i * 1.7)),
        });
      });

      // Name the shot that won the point, under the scoreboard.
      if (caption.current) {
        if (t >= plan.scoreAt && capAt < plan.scoreAt) {
          capAt = plan.scoreAt;
          caption.current.textContent = plan.caption;
        }
        const d = t - capAt;
        const o = d < 0 ? 0 : d < 0.25 ? d / 0.25 : d < 3 ? 1 : d < 3.5 ? 1 - (d - 3) / 0.5 : 0;
        caption.current.setAttribute("opacity", o.toFixed(2));
      }

      // Scoreboard updates when the point is over.
      const sc = t >= plan.scoreAt ? plan.score : score;
      if (sc !== shown) {
        shown = sc;
        if (scoreL.current) scoreL.current.textContent = POINTS[sc.p[0]];
        if (scoreR.current) scoreR.current.textContent = POINTS[sc.p[1]];
        if (gamesL.current) gamesL.current.textContent = String(sc.g[0]);
        if (gamesR.current) gamesR.current.textContent = String(sc.g[1]);
      }

      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serverHand = add(start[playerAt("L", "bottom")], hand("L"));

  return (
    <svg ref={root} viewBox="0 0 300 200" className={`gp-court ${className ?? ""}`} role="img" aria-label="Padel court seen from above with a doubles match in play">
      <defs>
        <pattern id="gpc-tiles" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#131313" />
          <path d="M12 0H0V12" fill="none" stroke="#1b1b1b" strokeWidth="0.5" />
        </pattern>
        <filter id="gpc-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <radialGradient id="gpc-shade" cx="0.4" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <radialGradient id="gpc-lamp">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gpc-flash">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#bfe0ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="gpc-court">
          <rect x={OX} y={OY} width={W} height={H} />
        </clipPath>
      </defs>

      {/* Ground, palms */}
      <rect width="300" height="200" fill="url(#gpc-tiles)" />
      <Palm x={6} y={8} r={15} />
      <Palm x={293} y={193} r={14} />

      {/* Turf: blue artificial grass with sand infill, wear, roll seams, lines and the club logo (public/court-turf.jpg) */}
      <image href="/court-turf.jpg" x={OX} y={OY} width={W} height={H} preserveAspectRatio="none" />

      {/* Shadows of the steel posts, thrown away from the nearest floodlight */}
      <g filter="url(#gpc-soft)" clipPath="url(#gpc-court)">
        {POST_SHADOWS.map(([x1, y1, x2, y2], i) => (
          <line key={`ps${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth="1.3" strokeLinecap="round" opacity="0.2" />
        ))}
      </g>

      {/* Each player casts four soft shadows, one from each floodlight */}
      {PIDS.map((p) => (
        <g key={`sh${p}`} filter="url(#gpc-soft)">
          {LIGHTS.map((_, i) => (
            <ellipse
              key={i}
              ref={(el: SVGEllipseElement | null) => {
                shadows.current[`${p}${i}`] = el;
              }}
              rx="4.4"
              ry="2.3"
              fill="#000"
              opacity="0"
            />
          ))}
        </g>
      ))}

      {/* Net */}
      <line x1={NET_SX + 1.6} y1={OY - 1} x2={NET_SX + 1.6} y2={OY + H + 1} stroke="#000" strokeWidth="2.2" opacity="0.28" filter="url(#gpc-soft)" />
      <line x1={NET_SX - 1.8} y1={OY - 1} x2={NET_SX - 1.8} y2={OY + H + 1} stroke="#000" strokeWidth="2" opacity="0.16" filter="url(#gpc-soft)" />
      <line x1={NET_SX} y1={OY - 1.5} x2={NET_SX} y2={OY + H + 1.5} stroke="#0d0d0d" strokeWidth="1.4" opacity="0.75" />
      <line x1={NET_SX} y1={OY - 1.5} x2={NET_SX} y2={OY + H + 1.5} stroke="#f5f5f5" strokeWidth="0.55" />
      <line ref={netFlash} x1={NET_SX} y1={OY} x2={NET_SX} y2={OY + H} stroke="#ffffff" strokeWidth="2.4" opacity="0" filter="url(#gpc-soft)" />
      <rect x={NET_SX - 1.3} y={OY - 3.2} width="2.6" height="2.6" rx="0.4" fill="#1a1a1a" />
      <rect x={NET_SX - 1.3} y={OY + H + 0.6} width="2.6" height="2.6" rx="0.4" fill="#1a1a1a" />

      {/* Players */}
      {PIDS.map((p) => (
        <g
          key={p}
          ref={(el: SVGGElement | null) => {
            players.current[p] = el;
          }}
          transform={`translate(${sx(start[p].x)} ${sy(start[p].y)}) rotate(${TEAM[p] === "L" ? 0 : 180})`}
        >
          <Figure look={LOOKS[p].look} racket={LOOKS[p].rim} r={figs.current[p]} />
        </g>
      ))}

      {/* Walls: glass at the back and the first 4 m of each side, mesh between, steel posts */}
      {[OX, OX + W].map((x) => (
        <g key={`bw${x}`}>
          <line x1={x} y1={OY} x2={x} y2={OY + H} stroke="#000" strokeWidth="3" opacity="0.35" filter="url(#gpc-soft)" />
          <line x1={x} y1={OY} x2={x} y2={OY + H} stroke="#bfe0ff" strokeWidth="2.4" opacity="0.28" />
          <line x1={x + (x === OX ? 0.7 : -0.7)} y1={OY} x2={x + (x === OX ? 0.7 : -0.7)} y2={OY + H} stroke="#e8f4ff" strokeWidth="0.35" opacity="0.7" />
        </g>
      ))}
      <ellipse ref={glassFlash} cx={OX} cy={OY + H / 2} rx="3.5" ry="9" fill="url(#gpc-flash)" opacity="0" />
      <ellipse ref={sideFlash} cx={OX} cy={OY} rx="9" ry="3.5" fill="url(#gpc-flash)" opacity="0" />
      {[OY, OY + H].flatMap((y) =>
        [
          [OX, OX + GLASS_RETURN],
          [OX + W - GLASS_RETURN, OX + W],
        ].map(([a, b]) => (
          <g key={`gr${y}-${a}`}>
            <line x1={a} y1={y} x2={b} y2={y} stroke="#bfe0ff" strokeWidth="2.4" opacity="0.28" />
            <line x1={a} y1={y + (y === OY ? 0.7 : -0.7)} x2={b} y2={y + (y === OY ? 0.7 : -0.7)} stroke="#e8f4ff" strokeWidth="0.35" opacity="0.7" />
          </g>
        )),
      )}
      {[OY, OY + H].flatMap((y) =>
        MESH.map(([a, b]) => (
          <g key={`m${y}-${a}`}>
            <line x1={a} y1={y} x2={b} y2={y} stroke="#9aa0a8" strokeWidth="1.5" strokeDasharray="0.45 0.45" opacity="0.55" />
            <line x1={a} y1={y} x2={b} y2={y} stroke="#2a2d31" strokeWidth="0.3" />
          </g>
        )),
      )}
      {[...POSTS.filter(([x]) => !DOORS.some(([a, b]) => x > a && x < b)), ...DOORS.flat().flatMap((x) => [[x, OY] as [number, number], [x, OY + H] as [number, number]])].map(([x, y]) => (
        <rect key={`po${x}-${y}`} x={x - 0.9} y={y - 0.9} width="1.8" height="1.8" fill="#0b0b0b" stroke="#3a3a3a" strokeWidth="0.2" />
      ))}

      {/* Ball: bounce ring, trail, shadow on the ground, height line, and the ball itself */}
      <circle ref={bounceRing} r="2" fill="none" stroke="#e9f7a6" strokeWidth="0.45" opacity="0" />
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={`tr${i}`}
          ref={(el: SVGCircleElement | null) => {
            trail.current[i] = el;
          }}
          r={(1.25 - i * 0.12).toFixed(2)}
          fill="#d7f43c"
          opacity="0"
        />
      ))}
      <g ref={ball} transform={`translate(${sx(serverHand.x)} ${sy(serverHand.y)})`} opacity="0">
        <ellipse ref={ballShadow} rx="1.5" ry="1.1" fill="#000" opacity="0.5" filter="url(#gpc-soft)" />
        <line ref={heightLine} x1="0" y1="0" x2="0" y2="0" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="0.7 0.7" opacity="0" />
        <g ref={ballUp} transform="translate(1.1 -2.2)">
          <circle r="2.5" fill="#c8f031" opacity="0.18" />
          <circle r="1.65" fill="#dcf53f" stroke="#3f4a0e" strokeWidth="0.28" />
          <path d="M-1.2 -1 Q -0.15 0 -1.2 1" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.85" />
          <path d="M1.2 -1 Q 0.15 0 1.2 1" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.85" />
          <circle cx="-0.55" cy="-0.6" r="0.5" fill="#fff" opacity="0.5" />
        </g>
      </g>

      {/* Floodlights */}
      {LIGHTS.map(([x, y]) => (
        <g key={`l${x}-${y}`}>
          <circle cx={x} cy={y} r="8" fill="url(#gpc-lamp)" opacity="0.45" />
          <rect x={x - 1.1} y={y - 1.1} width="2.2" height="2.2" rx="0.4" fill="#202020" />
          <rect x={x - 2.6} y={y + (y < 100 ? 1.3 : -2.2)} width="5.2" height="0.9" rx="0.45" fill="#fbf8ea" />
        </g>
      ))}

      {/* Scoreboard on the fence */}
      <g transform={`translate(${NET_SX} 22)`}>
        <rect x="-30" y="-8" width="60" height="16" rx="3" fill="#0b0b0b" stroke="#2c2c2c" strokeWidth="0.5" />
        <g fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">
          <rect x="-26.5" y="-4.5" width="2.4" height="9" rx="1" fill="#ecebe6" />
          <rect x="24.1" y="-4.5" width="2.4" height="9" rx="1" fill="#6e2626" />
          <text ref={gamesL} x="-18" y="2.4" fontSize="6.5" fill="#a3a3a3">0</text>
          <text ref={scoreL} x="-7.5" y="2.6" fontSize="8" fill="#f5f5f5">0</text>
          <text x="0" y="2.2" fontSize="5" fill="#555">–</text>
          <text ref={scoreR} x="7.5" y="2.6" fontSize="8" fill="#f5f5f5">0</text>
          <text ref={gamesR} x="18" y="2.4" fontSize="6.5" fill="#a3a3a3">0</text>
          <text x="0" y="-4.4" fontSize="2.4" fill="#c8f031" letterSpacing="0.4">GO PADEL</text>
          <text ref={caption} x="0" y="12.8" fontSize="3.3" fill="#c8f031" letterSpacing="0.5" opacity="0" />
        </g>
      </g>

      {/* Bench, bags and bottles below the court */}
      <rect x="62" y="181" width="176" height="5" rx="1" fill="#3b2e24" />
      <rect x="62" y="181" width="176" height="1" rx="0.5" fill="#5a4636" opacity="0.8" />
      <rect x="140" y="179.5" width="11" height="6" rx="2" fill="#26292e" />
      <rect x="140.8" y="180.3" width="9.4" height="1.2" rx="0.6" fill="#c8f031" opacity="0.7" />
      <rect x="154" y="180" width="10" height="5.5" rx="2" fill="#4a1f1f" />
      {[133, 135.5, 167, 169.5].map((x) => (
        <g key={`bt${x}`}>
          <circle cx={x} cy="183.5" r="1.15" fill="#dfe6ee" opacity="0.85" />
          <circle cx={x} cy="183.5" r="0.55" fill="#3b82c4" />
        </g>
      ))}

      {/* Cafe table */}
      <circle cx="246" cy="18" r="4.2" fill="#d9d4c8" />
      <circle cx="246" cy="18" r="4.2" fill="url(#gpc-shade)" />
      <circle cx="244.8" cy="17" r="0.8" fill="#7a4b2a" />
      <circle cx="247.4" cy="19.2" r="0.8" fill="#c8f031" opacity="0.85" />

      {/* Visitors who come and go */}
      {VISITORS.map((look, i) => {
        const v0 = firstVisits()[i];
        const on = v0.phase !== "away";
        return (
          <g key={`v${i}`}>
            <ellipse
              ref={(el: SVGEllipseElement | null) => {
                visitors.current[i].shadow = el;
              }}
              cx={v0.pos.x + 1.8}
              cy={v0.pos.y + 2.2}
              rx="4.4"
              ry="4.1"
              fill="#000"
              opacity={on ? 0.4 : 0}
              filter="url(#gpc-soft)"
            />
            <g
              ref={(el: SVGGElement | null) => {
                visitors.current[i].root = el;
              }}
              transform={`translate(${v0.pos.x} ${v0.pos.y}) rotate(${v0.face})`}
              opacity={on ? 1 : 0}
            >
              <Figure look={look} r={visitors.current[i].fig} />
            </g>
          </g>
        );
      })}

      {/* People standing and chatting */}
      {TALKERS.map((m, i) => (
        <g key={`t${i}`}>
          <ellipse cx={m.x + 1.8} cy={m.y + 2.2} rx="4.6" ry="4.2" fill="#000" opacity="0.4" filter="url(#gpc-soft)" />
          <g
            ref={(el: SVGGElement | null) => {
              talkers.current[i].root = el;
            }}
            transform={`translate(${m.x} ${m.y}) rotate(${angleTo(m, GROUPS[m.group]).toFixed(1)})`}
          >
            <Figure look={m.look} r={talkers.current[i].fig} />
          </g>
        </g>
      ))}

      {/* Spectators */}
      {WATCHERS.map((w, i) => (
        <g
          key={`w${i}`}
          ref={(el: SVGGElement | null) => {
            watchers.current[i] = el;
          }}
          transform={`translate(${w.x} ${w.y}) rotate(${w.face})`}
        >
          <Person look={w.look} seated={w.seated} />
        </g>
      ))}
    </svg>
  );
}
