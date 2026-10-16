import { useSyncExternalStore } from "react";

export type GameId = "snake" | "breach" | "maze";
export type Profile = {
  xp: number; played: number; best: Record<string, number>; achievements: string[]; cosmetics: string[];
  challenges: string[]; theme: string; trail: string; effect: string; secretBonus: boolean; stats: Record<string, number>;
};
export const RANKS = [
  { name: "NEW PROCESS", xp: 0 }, { name: "SCRIPT KIDDIE", xp: 300 }, { name: "OPERATOR", xp: 900 }, { name: "ROOT ACCESS", xp: 2200 },
];
export const COSMETICS: Record<string, { name: string; kind: "theme" | "trail" | "effect"; desc: string }> = {
  phosphor: { name: "Phosphor", kind: "theme", desc: "Default acid-green arcade theme." },
  amber: { name: "Amber CRT", kind: "theme", desc: "Hidden warm-monitor theme." },
  crimson: { name: "Crimson Root", kind: "theme", desc: "Reserved for ROOT ACCESS operators." },
  neon: { name: "Neon Worm", kind: "trail", desc: "Default worm trail." },
  ember: { name: "Ember Trail", kind: "trail", desc: "Amber-hot worm segments." },
  ice: { name: "Ice Trail", kind: "trail", desc: "Cold-blue stealth segments." },
  none: { name: "Clean Signal", kind: "effect", desc: "No extra arcade effects." },
  glitch: { name: "Glitch Scan", kind: "effect", desc: "Animated scanline glitch on the arcade." },
};
export const ACHIEVEMENTS: Record<string, { name: string; desc: string; reward?: string; secret?: boolean }> = {
  first_run: { name: "Process Spawned", desc: "Finish your first arcade run." },
  snake_25: { name: "Memory Leak", desc: "Score 25 in VIRUS RUN.", reward: "ember" },
  ghost: { name: "Ghost in the Shell", desc: "Phase through your own body 5 times during one phase power-up.", reward: "amber", secret: true },
  daily: { name: "Daily Patch", desc: "Score 15 in today's Daily Challenge." },
  combo_15: { name: "Chain Reaction", desc: "Reach a 15× combo in BREACH PROTOCOL.", reward: "glitch" },
  decoy_5: { name: "Honeypot Hunter", desc: "Reject 5 decoys in one BREACH run." },
  breach_clear: { name: "Mainframe Breached", desc: "Clear all 8 structured BREACH levels." },
  stealth: { name: "Ghost Protocol", desc: "Escape a ZERO DAY level without detection.", reward: "ice" },
  kernel_5: { name: "Deep Kernel", desc: "Clear 5 levels in one ZERO DAY run." },
  secret_bonus: { name: "Overclocked", desc: "Discover the hidden terminal command.", secret: true },
  root: { name: "Root Access", desc: "Reach the ROOT ACCESS rank.", reward: "crimson" },
};
const KEY = "nexus-arcade-profile-v1";
const fresh = (): Profile => ({ xp: 0, played: 0, best: {}, achievements: [], cosmetics: ["phosphor", "neon", "none"], challenges: [], theme: "phosphor", trail: "neon", effect: "none", secretBonus: false, stats: {} });
const SERVER = fresh();
let current: Profile | null = null;
const listeners = new Set<() => void>();
function load(): Profile {
  if (current) return current;
  try { const raw = localStorage.getItem(KEY); current = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh(); } catch { current = fresh(); }
  return current!;
}
function save(next: Profile) {
  current = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked: keep in memory */ }
  listeners.forEach(l => l());
}
export function useProfile() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, load, () => SERVER);
}
export function rankFor(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1];
  return { rank: RANKS[i].name, next: next?.name ?? null, progress: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1, toNext: next ? next.xp - xp : 0 };
}
/* Notices let mid-game unlocks surface without coupling games to the arcade shell. */
let notices: { id: number; text: string }[] = [];
const noticeListeners = new Set<() => void>();
const EMPTY: typeof notices = [];
function notify(text: string) {
  const id = Date.now() + Math.random();
  notices = [...notices, { id, text }];
  noticeListeners.forEach(l => l());
  setTimeout(() => { notices = notices.filter(n => n.id !== id); noticeListeners.forEach(l => l()); }, 4200);
}
export function useNotices() {
  return useSyncExternalStore(cb => { noticeListeners.add(cb); return () => { noticeListeners.delete(cb); }; }, () => notices, () => EMPTY);
}
function grant(p: Profile, ids: string[]) {
  const unlocked: string[] = [];
  for (const id of ids) {
    if (!ACHIEVEMENTS[id] || p.achievements.includes(id)) continue;
    p.achievements.push(id);
    unlocked.push(id);
    const reward = ACHIEVEMENTS[id].reward;
    if (reward && !p.cosmetics.includes(reward)) p.cosmetics.push(reward);
    notify(`ACHIEVEMENT — ${ACHIEVEMENTS[id].name}${reward ? ` · unlocked ${COSMETICS[reward].name}` : ""}`);
  }
  return unlocked;
}
export function unlock(ids: string[]) {
  const p = structuredClone(load());
  const unlocked = grant(p, ids);
  if (unlocked.length) save(p);
  return unlocked;
}
export type RunInput = { game: GameId; mode: string; score: number; durationSec: number; xpBase: number; completed?: boolean; achievements?: string[]; challenge?: string; stats?: Record<string, number> };
export type RunResult = { xp: number; record: boolean; previousBest: number; unlocked: string[]; rankUp: string | null; counted: boolean };
/** Single entry point for all games. Very short abandoned runs earn nothing so resets cannot farm XP. */
export function recordRun(r: RunInput): RunResult {
  const p = structuredClone(load());
  const key = `${r.game}:${r.mode}`;
  const previousBest = p.best[key] ?? 0;
  const counted = !!r.completed || (r.durationSec >= 6 && r.score > 0);
  const record = counted && r.score > previousBest;
  const before = rankFor(p.xp).rank;
  let xp = 0;
  if (counted) {
    const newChallenge = !!r.challenge && !p.challenges.includes(r.challenge);
    xp = Math.min(220, Math.round(r.xpBase)) + (record && previousBest > 0 ? 30 : 0) + (newChallenge ? 75 : 0);
    if (newChallenge) p.challenges.push(r.challenge!);
    p.played += 1;
    p.xp += xp;
    if (record) p.best[key] = r.score;
    for (const [k, v] of Object.entries(r.stats ?? {})) p.stats[k] = Math.max(p.stats[k] ?? 0, v);
  }
  const after = rankFor(p.xp).rank;
  const unlocked = counted ? grant(p, ["first_run", ...(r.achievements ?? []), ...(after === "ROOT ACCESS" ? ["root"] : [])]) : [];
  if (after !== before) notify(`RANK UP — ${after}`);
  save(p);
  return { xp, record, previousBest, unlocked, rankUp: after !== before ? after : null, counted };
}
export function equip(kind: "theme" | "trail" | "effect", id: string) {
  const p = load();
  if (!p.cosmetics.includes(id) || COSMETICS[id]?.kind !== kind) return;
  save({ ...p, [kind]: id });
}
export function unlockSecretBonus() {
  const p = structuredClone(load());
  p.secretBonus = true;
  grant(p, ["secret_bonus"]);
  save(p);
}
