import { createRng, DV, same, type Difficulty, type Dir, type Pt } from "./random";

export const SNAKE_W = 24;
export const SNAKE_H = 16;
export type SnakeMode = "classic" | "chaos" | "daily" | "overclock";
export type Power = "dash" | "phase";
export type SnakeEvent = "collect" | "dash" | "phase" | "ghost" | "shift";
export type SnakeState = {
  mode: SnakeMode; seed: number; snake: Pt[]; dir: Dir; queue: Dir[]; food: Pt; hazards: Pt[];
  power: { kind: Power; at: Pt } | null; active: { dash: number; phase: number };
  inset: number; shrinkAt: number | null; score: number; ticks: number; elapsed: number;
  alive: boolean; cause: string; events: SnakeEvent[]; ghostPasses: number; ghostFound: boolean;
};
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const modifiers = (m: SnakeMode) => m !== "classic";

export const outside = (s: Pick<SnakeState, "inset">, p: Pt, inset = s.inset) => p.x < inset || p.y < inset || p.x >= SNAKE_W - inset || p.y >= SNAKE_H - inset;

function freeCell(s: SnakeState, r: () => number, minHeadDistance = 0): Pt {
  const head = s.snake[0];
  const inset = s.shrinkAt !== null ? s.inset + 1 : s.inset;
  for (let i = 0; i < 800; i++) {
    const p = { x: Math.floor(r() * SNAKE_W), y: Math.floor(r() * SNAKE_H) };
    if (outside(s, p, inset)) continue;
    if (s.snake.some(b => same(b, p)) || s.hazards.some(h => same(h, p)) || (s.food && same(s.food, p)) || (s.power && same(s.power.at, p))) continue;
    if (Math.abs(p.x - head.x) + Math.abs(p.y - head.y) < minHeadDistance) continue;
    return p;
  }
  return { x: inset, y: inset };
}

export function createSnake(mode: SnakeMode, seed: number): SnakeState {
  const y = Math.floor(SNAKE_H / 2);
  const s: SnakeState = {
    mode, seed, snake: [{ x: 6, y }, { x: 5, y }, { x: 4, y }], dir: "right", queue: [], food: { x: -1, y: -1 }, hazards: [],
    power: null, active: { dash: 0, phase: 0 }, inset: 0, shrinkAt: null, score: 0, ticks: 0, elapsed: 0,
    alive: true, cause: "", events: [], ghostPasses: 0, ghostFound: false,
  };
  const r = createRng(seed);
  if (mode === "daily") for (let i = 0; i < 6; i++) s.hazards.push(freeCell(s, r, 5));
  s.food = freeCell(s, r, 3);
  return s;
}

/** Queue a turn; reversals and turns duplicating the last queued direction are ignored. */
export function turn(s: SnakeState, d: Dir): SnakeState {
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (d === last || OPP[d] === last || s.queue.length >= 2) return s;
  return { ...s, queue: [...s.queue, d] };
}

function moveOnce(n: SnakeState, r: () => number) {
  const head = n.snake[0];
  const next = { x: head.x + DV[n.dir].x, y: head.y + DV[n.dir].y };
  if (outside(n, next)) { n.alive = false; n.cause = "Hit the arena firewall"; return; }
  const eating = same(next, n.food);
  const body = eating ? n.snake : n.snake.slice(0, -1);
  const hitSelf = body.some(p => same(p, next));
  if (hitSelf && n.active.phase === 0) { n.alive = false; n.cause = "Collided with your own code"; return; }
  if (hitSelf) {
    n.ghostPasses += 1;
    if (n.ghostPasses >= 5 && !n.ghostFound) { n.ghostFound = true; n.events.push("ghost"); }
  }
  if (n.active.phase === 0 && n.hazards.some(h => same(h, next))) { n.alive = false; n.cause = "Touched a corrupted sector"; return; }
  n.snake.unshift(next);
  if (!eating) n.snake.pop();
  else {
    n.score += 1;
    n.events.push("collect");
    n.food = freeCell(n, r, 2);
    if (modifiers(n.mode)) {
      if (n.score % 4 === 0 && !n.power) n.power = { kind: r() < 0.5 ? "dash" : "phase", at: freeCell(n, r, 2) };
      if (n.score % 5 === 0 && n.inset < 3 && n.shrinkAt === null) n.shrinkAt = n.ticks + 30;
      if (n.score % 5 === 0 && n.mode !== "daily") for (let i = 0; i < 2; i++) n.hazards.push(freeCell(n, r, 5));
    }
  }
  if (n.power && same(next, n.power.at)) {
    n.active[n.power.kind] = n.power.kind === "dash" ? 18 : 30;
    n.events.push(n.power.kind);
    n.power = null;
  }
}

export function stepSnake(s: SnakeState): SnakeState {
  if (!s.alive) return s;
  const r = createRng(s.seed + s.ticks * 7919 + s.score * 31);
  const n: SnakeState = { ...s, queue: [...s.queue], snake: [...s.snake], hazards: [...s.hazards], active: { ...s.active }, events: [], ticks: s.ticks + 1 };
  if (n.queue.length) n.dir = n.queue.shift()!;
  const moves = n.active.dash > 0 ? 2 : 1;
  for (let i = 0; i < moves && n.alive; i++) moveOnce(n, r);
  n.active.dash = Math.max(0, n.active.dash - 1);
  n.active.phase = Math.max(0, n.active.phase - 1);
  if (n.active.phase === 0) n.ghostPasses = 0;
  if (n.alive && n.shrinkAt !== null && n.ticks >= n.shrinkAt) {
    n.inset += 1;
    n.shrinkAt = null;
    n.events.push("shift");
    if (n.snake.some(p => outside(n, p))) { n.alive = false; n.cause = "Caught in the collapsing arena"; }
    n.hazards = n.hazards.filter(h => !outside(n, h));
    if (outside(n, n.food)) n.food = freeCell(n, r, 2);
    if (n.power && outside(n, n.power.at)) n.power = null;
  }
  return n;
}

export function snakeInterval(s: SnakeState, difficulty: Difficulty) {
  const base = { easy: 155, normal: 120, hard: 95 }[difficulty] * (s.mode === "overclock" ? 0.7 : 1);
  return Math.max(55, base - s.score * 2.5);
}
