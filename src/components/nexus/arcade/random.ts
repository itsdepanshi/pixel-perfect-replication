/** Deterministic mulberry32 generator so daily and seeded levels are reproducible. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)]!;
export function dailySeed(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
export type Difficulty = "easy" | "normal" | "hard";
export type Dir = "up" | "down" | "left" | "right";
export type Pt = { x: number; y: number };
export const DV: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export const KEY_DIRS: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
export const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
