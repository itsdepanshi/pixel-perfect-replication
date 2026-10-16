import { createRng, DV, same, type Difficulty, type Dir, type Pt } from "./random";

export type MazeLevel = {
  level: number; seed: number; w: number; h: number; walls: boolean[]; start: Pt; exit: Pt; key: Pt; gate: Pt;
  switchAt: Pt | null; firewallA: Pt[]; firewallB: Pt[]; fragments: Pt[]; drones: Pt[][];
};
const idx = (L: { w: number }, p: Pt) => p.y * L.w + p.x;
const has = (list: Pt[], p: Pt) => list.some(q => same(q, p));
const neighbors = (p: Pt) => (Object.keys(DV) as Dir[]).map(d => ({ x: p.x + DV[d].x, y: p.y + DV[d].y }));

/** Whether a cell can be entered for a switch state and key ownership. */
export function passable(L: MazeLevel, p: Pt, sw: boolean, key: boolean) {
  if (p.x < 0 || p.y < 0 || p.x >= L.w || p.y >= L.h || L.walls[idx(L, p)]) return false;
  if (same(p, L.gate) && !key) return false;
  if (!sw && has(L.firewallA, p)) return false;
  if (sw && has(L.firewallB, p)) return false;
  return true;
}
/** Breadth-first search over position, switch state and key ownership; true when the exit is reachable. */
export function isSolvable(L: MazeLevel) {
  const seen = new Set<string>();
  const queue: [Pt, boolean, boolean][] = [[L.start, false, false]];
  while (queue.length) {
    const [p, sw, key] = queue.shift()!;
    const id = `${p.x},${p.y},${sw},${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (same(p, L.exit)) return true;
    for (const n of neighbors(p)) {
      if (!passable(L, n, sw, key)) continue;
      queue.push([n, L.switchAt && same(n, L.switchAt) ? !sw : sw, key || same(n, L.key)]);
    }
  }
  return false;
}
function distances(L: MazeLevel, from: Pt, block: Pt[] = []) {
  const dist = new Map<number, number>([[idx(L, from), 0]]);
  const queue = [from];
  while (queue.length) {
    const p = queue.shift()!;
    for (const n of neighbors(p)) {
      if (n.x < 0 || n.y < 0 || n.x >= L.w || n.y >= L.h || L.walls[idx(L, n)] || has(block, n) || dist.has(idx(L, n))) continue;
      dist.set(idx(L, n), dist.get(idx(L, p))! + 1);
      queue.push(n);
    }
  }
  return dist;
}
const toPt = (L: { w: number }, i: number) => ({ x: i % L.w, y: Math.floor(i / L.w) });

function build(level: number, seed: number): MazeLevel {
  const r = createRng(seed);
  const cw = Math.min(13, 6 + level), ch = Math.min(9, 4 + level);
  const w = cw * 2 + 1, h = ch * 2 + 1;
  const L: MazeLevel = { level, seed, w, h, walls: Array(w * h).fill(true), start: { x: 1, y: 1 }, exit: { x: 1, y: 1 }, key: { x: 1, y: 1 }, gate: { x: 1, y: 1 }, switchAt: null, firewallA: [], firewallB: [], fragments: [], drones: [] };
  const stack: Pt[] = [{ x: 1, y: 1 }];
  L.walls[idx(L, stack[0])] = false;
  while (stack.length) {
    const p = stack[stack.length - 1];
    const options = (Object.keys(DV) as Dir[]).map(d => ({ x: p.x + DV[d].x * 2, y: p.y + DV[d].y * 2 })).filter(n => n.x > 0 && n.y > 0 && n.x < w - 1 && n.y < h - 1 && L.walls[idx(L, n)]);
    if (!options.length) { stack.pop(); continue; }
    const n = options[Math.floor(r() * options.length)];
    L.walls[idx(L, { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 })] = false;
    L.walls[idx(L, n)] = false;
    stack.push(n);
  }
  const floorNeighbors = (p: Pt) => neighbors(p).filter(n => !L.walls[idx(L, n)]).length;
  const fromStart = distances(L, L.start);
  const deadEnds = [...fromStart.keys()].map(i => toPt(L, i)).filter(p => !same(p, L.start) && floorNeighbors(p) === 1);
  L.exit = deadEnds.sort((a, b) => fromStart.get(idx(L, b))! - fromStart.get(idx(L, a))!)[0];
  L.gate = neighbors(L.exit).find(n => !L.walls[idx(L, n)])!;
  // Carve loops for alternative routes, never next to the exit so the gate stays mandatory.
  const loops = Math.floor(cw * ch * 0.1);
  for (let i = 0, tries = 0; i < loops && tries < 400; tries++) {
    const p = { x: 1 + Math.floor(r() * (w - 2)), y: 1 + Math.floor(r() * (h - 2)) };
    if (!L.walls[idx(L, p)] || Math.abs(p.x - L.exit.x) + Math.abs(p.y - L.exit.y) <= 1) continue;
    const horizontal = !L.walls[idx(L, { x: p.x - 1, y: p.y })] && !L.walls[idx(L, { x: p.x + 1, y: p.y })];
    const vertical = !L.walls[idx(L, { x: p.x, y: p.y - 1 })] && !L.walls[idx(L, { x: p.x, y: p.y + 1 })];
    if (horizontal !== vertical) { L.walls[idx(L, p)] = false; i++; }
  }
  const beforeGate = distances(L, L.start, [L.gate]);
  const far = [...beforeGate.entries()].filter(([, d]) => d > 6).map(([i]) => toPt(L, i)).filter(p => !same(p, L.exit));
  L.key = far.length ? far[Math.floor(r() * far.length)] : toPt(L, [...beforeGate.keys()].pop()!);
  const special = (p: Pt) => same(p, L.start) || same(p, L.exit) || same(p, L.gate) || same(p, L.key) || (L.switchAt !== null && same(p, L.switchAt));
  const floors = [...distances(L, L.start).keys()].map(i => toPt(L, i));
  if (level >= 2) {
    const reachable = [...beforeGate.keys()].map(i => toPt(L, i)).filter(p => !special(p) && Math.abs(p.x - 1) + Math.abs(p.y - 1) > 3);
    L.switchAt = reachable[Math.floor(r() * reachable.length)] ?? null;
    const corridors = floors.filter(p => !special(p) && floorNeighbors(p) === 2 && Math.abs(p.x - 1) + Math.abs(p.y - 1) > 3);
    for (let i = 0; i < 3 && corridors.length; i++) L.firewallA.push(corridors.splice(Math.floor(r() * corridors.length), 1)[0]);
    for (let i = 0; i < 2 && corridors.length; i++) L.firewallB.push(corridors.splice(Math.floor(r() * corridors.length), 1)[0]);
  }
  const blocked = (p: Pt) => special(p) || has(L.firewallA, p) || has(L.firewallB, p);
  const ends = floors.filter(p => !blocked(p) && floorNeighbors(p) === 1);
  const pool = [...ends, ...floors.filter(p => !blocked(p) && floorNeighbors(p) !== 1)];
  for (let i = 0; i < 3 + level && i < pool.length; i++) L.fragments.push(pool[i < ends.length ? i : Math.floor(r() * pool.length)]);
  L.fragments = L.fragments.filter((p, i) => L.fragments.findIndex(q => same(p, q)) === i);
  if (level >= 3) {
    const runs: Pt[][] = [];
    for (let y = 1; y < h - 1; y++) {
      let run: Pt[] = [];
      for (let x = 1; x < w; x++) {
        const p = { x, y };
        if (x < w - 1 && !L.walls[idx(L, p)] && !blocked(p)) run.push(p);
        else { if (run.length >= 4 && run.every(q => q.x + q.y > 7)) runs.push(run); run = []; }
      }
    }
    for (let i = 0; i < Math.min(level - 2, 4) && runs.length; i++) L.drones.push(runs.splice(Math.floor(r() * runs.length), 1)[0]);
  }
  return L;
}
/** Generates a level and validates it; retries deterministic seeds until the exit is reachable. */
export function generateLevel(level: number, seed: number): MazeLevel {
  for (let attempt = 0; attempt < 60; attempt++) {
    const L = build(level, seed + attempt * 977);
    if (isSolvable(L)) return L;
  }
  const L = build(level, seed);
  return { ...L, firewallA: [], firewallB: [], switchAt: null };
}

export type MazeMode = "campaign" | "seeded";
export type MazeRun = {
  mode: MazeMode; difficulty: Difficulty; baseSeed: number; L: MazeLevel; pos: Pt; sw: boolean; key: boolean; collected: Pt[];
  lives: number; timeLeft: number; detected: boolean; drone: { i: number; step: number }[]; score: number; levelsCleared: number;
  totalFragments: number; stealthClears: number; status: "playing" | "cleared" | "over"; message: string; hitId: number;
};
export const MAZE_LEVELS = 8;
const levelSeed = (mode: MazeMode, base: number, level: number) => (mode === "campaign" ? level * 7919 + 13 : base + level * 31);
function enterLevel(run: Omit<MazeRun, "L" | "pos" | "sw" | "key" | "collected" | "timeLeft" | "detected" | "drone" | "status">, level: number): MazeRun {
  const L = generateLevel(level, levelSeed(run.mode, run.baseSeed, level));
  const time = { easy: 100, normal: 75, hard: 55 }[run.difficulty] + level * 15;
  return { ...run, L, pos: L.start, sw: false, key: false, collected: [], timeLeft: time, detected: false, drone: L.drones.map(() => ({ i: 0, step: 1 })), status: "playing", message: `Level ${level}: retrieve the key, unlock the gate, reach the exit.` };
}
export function startMaze(mode: MazeMode, difficulty: Difficulty, baseSeed: number): MazeRun {
  return enterLevel({ mode, difficulty, baseSeed, lives: { easy: 5, normal: 3, hard: 2 }[difficulty], score: 0, levelsCleared: 0, totalFragments: 0, stealthClears: 0, message: "", hitId: 0 }, 1);
}
export const dronePositions = (run: MazeRun) => run.L.drones.map((path, i) => path[run.drone[i].i]);
function detects(run: MazeRun, p: Pt) {
  return dronePositions(run).some(d => {
    if (same(d, p)) return true;
    if (d.y === p.y && Math.abs(d.x - p.x) <= 2) { for (let x = Math.min(d.x, p.x) + 1; x < Math.max(d.x, p.x); x++) if (run.L.walls[idx(run.L, { x, y: p.y })]) return false; return true; }
    if (d.x === p.x && Math.abs(d.y - p.y) <= 2) { for (let y = Math.min(d.y, p.y) + 1; y < Math.max(d.y, p.y); y++) if (run.L.walls[idx(run.L, { x: p.x, y })]) return false; return true; }
    return false;
  });
}
function checkDetection(run: MazeRun): MazeRun {
  if (run.status !== "playing" || !detects(run, run.pos)) return run;
  const lives = run.lives - 1;
  if (lives <= 0) return { ...run, lives: 0, detected: true, status: "over", message: "Detected by a security drone — process terminated.", hitId: run.hitId + 1 };
  return { ...run, lives, detected: true, pos: run.L.start, message: "Detected! Integrity lost — returned to entry point.", hitId: run.hitId + 1 };
}
export function moveMaze(run: MazeRun, d: Dir): MazeRun {
  if (run.status !== "playing") return run;
  const p = { x: run.pos.x + DV[d].x, y: run.pos.y + DV[d].y };
  if (!passable(run.L, p, run.sw, run.key)) return { ...run, message: same(p, run.L.gate) ? "Gate locked — find the access key." : run.message };
  let n: MazeRun = { ...run, pos: p };
  if (!run.key && same(p, run.L.key)) n = { ...n, key: true, message: "Access key acquired. The gate will open." };
  if (run.L.switchAt && same(p, run.L.switchAt)) n = { ...n, sw: !run.sw, message: "Switch toggled — firewall segments shifted." };
  if (has(run.L.fragments, p) && !has(run.collected, p)) n = { ...n, collected: [...n.collected, p], score: n.score + 50, totalFragments: n.totalFragments + 1, message: "Data fragment recovered (+50)." };
  if (same(p, run.L.exit)) {
    const stealth = !run.detected;
    const bonus = Math.round(n.timeLeft) * 5 + run.L.level * 100 + (stealth ? 200 : 0);
    return { ...n, score: n.score + bonus, levelsCleared: n.levelsCleared + 1, stealthClears: n.stealthClears + (stealth ? 1 : 0), status: "cleared", message: stealth ? `Kernel escaped undetected! +${bonus}` : `Kernel escaped! +${bonus}` };
  }
  return checkDetection(n);
}
export function tickDrones(run: MazeRun): MazeRun {
  if (run.status !== "playing" || !run.L.drones.length) return run;
  const drone = run.drone.map((s, k) => {
    const len = run.L.drones[k].length;
    let step = s.step;
    if (s.i + step < 0 || s.i + step >= len) step = -step;
    return { i: s.i + step, step };
  });
  return checkDetection({ ...run, drone });
}
export function tickMazeTime(run: MazeRun, seconds: number): MazeRun {
  if (run.status !== "playing") return run;
  const timeLeft = run.timeLeft - seconds;
  return timeLeft <= 0 ? { ...run, timeLeft: 0, status: "over", message: "Time expired — the kernel locked down." } : { ...run, timeLeft };
}
export function nextMazeLevel(run: MazeRun): MazeRun {
  return enterLevel(run, run.L.level + 1);
}
