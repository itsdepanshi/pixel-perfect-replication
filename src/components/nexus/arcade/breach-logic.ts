import { createRng, pick, type Difficulty } from "./random";

/** Every command is fictional game text. Input is only compared character by character, never executed. */
const TIER1 = ["ls", "scan", "ping", "sudo", "ssh", "grep", "nmap", "whois"];
const TIER2 = ["decrypt --key", "spoof mac", "bypass firewall", "inject payload", "trace route", "crack hash", "mount vault"];
const TIER3 = ["tunnel --port 8443", "exfil -z vault.db", "override kernel.sec=0", "spawn daemon --silent", "patch zero_day.bin", "chmod 777 /core"];
const DECODE_WORDS = ["kernel", "socket", "daemon", "packet", "cipher", "matrix", "uplink", "vector", "router", "binary"];
const SYMBOLS = "#@$%&*+=?<>";
export const BREACH_LEVELS = 8;
export const PER_LEVEL = 5;
export type BreachMode = "levels" | "endless";
export type Challenge = { kind: "type" | "decode" | "decoy" | "symbols"; prompt: string; answer: string; label: string };
export type BreachState = {
  mode: BreachMode; difficulty: Difficulty; seed: number; level: number; index: number; counter: number;
  challenge: Challenge; typed: string; timeLeft: number; timeMax: number; combo: number; maxCombo: number;
  score: number; correct: number; total: number; lives: number; status: "playing" | "levelup" | "over" | "victory";
  flash: "ok" | "bad" | null; flashId: number; levelsCleared: number; chars: number; activeMs: number; decoys: number; message: string;
};

export function makeChallenge(level: number, r: () => number): Challenge {
  const roll = r();
  if (level >= 3 && roll < 0.16) return { kind: "decoy", prompt: pick(r, level > 4 ? TIER3 : TIER2), answer: "", label: "SOURCE: UNVERIFIED" };
  if (level >= 2 && roll < 0.36) { const word = pick(r, DECODE_WORDS); return { kind: "decode", prompt: word.split("").reverse().join(""), answer: word, label: "DECODE: REVERSED STREAM" }; }
  if (level >= 2 && roll < 0.52) { let seq = ""; for (let i = 0; i < 3 + Math.floor(level / 2); i++) seq += SYMBOLS[Math.floor(r() * SYMBOLS.length)]; return { kind: "symbols", prompt: seq, answer: seq, label: "PATTERN: SYMBOL KEY" }; }
  const list = level <= 1 ? TIER1 : level <= 3 ? [...TIER1, ...TIER2] : level <= 5 ? TIER2 : [...TIER2, ...TIER3];
  const cmd = pick(r, list);
  return { kind: "type", prompt: cmd, answer: cmd, label: "SOURCE: SIGNED" };
}
export function timeFor(c: Challenge, level: number, d: Difficulty) {
  if (c.kind === "decoy") return 4;
  const mult = { easy: 1.5, normal: 1.15, hard: 0.9 }[d];
  return Math.round((3 + c.answer.length * 0.45 + (c.kind === "decode" ? 2.5 : 0)) * mult * Math.max(0.6, 1 - level * 0.04) * 10) / 10;
}
const penalty = (d: Difficulty) => ({ easy: 0.5, normal: 1.5, hard: 2.5 })[d];

function withChallenge(g: BreachState): BreachState {
  const counter = g.counter + 1;
  const challenge = makeChallenge(g.level, createRng(g.seed + counter * 104729));
  const t = timeFor(challenge, g.level, g.difficulty);
  return { ...g, counter, challenge, typed: "", timeLeft: t, timeMax: t };
}
export function startBreach(mode: BreachMode, difficulty: Difficulty, seed: number): BreachState {
  const base = { mode, difficulty, seed, level: 1, index: 0, counter: 0, typed: "", timeLeft: 0, timeMax: 0, combo: 0, maxCombo: 0, score: 0, correct: 0, total: 0, lives: difficulty === "easy" ? 4 : 3, status: "playing" as const, flash: null, flashId: 0, levelsCleared: 0, chars: 0, activeMs: 0, decoys: 0, message: "", challenge: { kind: "type" as const, prompt: "", answer: "", label: "" } };
  return withChallenge(base);
}
function advance(g: BreachState): BreachState {
  const index = g.index + 1;
  if (index < PER_LEVEL) return withChallenge({ ...g, index });
  const levelsCleared = g.levelsCleared + 1;
  if (g.mode === "levels" && g.level >= BREACH_LEVELS) return { ...g, index, levelsCleared, status: "victory", score: g.score + 500 };
  return { ...g, index, levelsCleared, status: "levelup" };
}
function success(g: BreachState, points: number, message: string): BreachState {
  const combo = g.combo + 1;
  return advance({ ...g, combo, maxCombo: Math.max(g.maxCombo, combo), score: g.score + Math.round(points * (1 + combo * 0.1)), flash: "ok", flashId: g.flashId + 1, message });
}
function wrong(g: BreachState, message: string): BreachState {
  return { ...g, combo: 0, timeLeft: g.timeLeft - penalty(g.difficulty), typed: g.difficulty === "hard" ? "" : g.typed, flash: "bad", flashId: g.flashId + 1, message };
}
export function breachKey(g: BreachState, key: string): BreachState {
  if (g.status !== "playing") return g;
  const c = g.challenge;
  const counted = { ...g, total: g.total + 1 };
  if (key === "Enter") return c.kind === "decoy" ? success({ ...counted, correct: g.correct + 1, decoys: g.decoys + 1 }, 40, "Honeypot rejected") : wrong(counted, "Sequence incomplete");
  if (c.kind === "decoy") return wrong({ ...counted, lives: g.lives }, "Honeypot engaged — trace penalty");
  const expected = c.answer[g.typed.length];
  if (expected === undefined || key.toLowerCase() !== expected.toLowerCase()) return wrong(counted, "Invalid character");
  const typed = g.typed + expected;
  const next = { ...counted, typed, correct: g.correct + 1, chars: g.chars + 1 };
  return typed.length === c.answer.length ? success(next, c.answer.length * 10 + (c.kind === "decode" ? 30 : 0), "Access granted") : next;
}
export function breachTick(g: BreachState, ms: number): BreachState {
  if (g.status !== "playing") return g;
  const timeLeft = g.timeLeft - ms / 1000;
  const n = { ...g, timeLeft, activeMs: g.activeMs + ms };
  if (timeLeft > 0) return n;
  if (g.challenge.kind === "decoy") return advance({ ...n, decoys: g.decoys + 1, message: "Honeypot ignored" });
  const lives = g.lives - 1;
  if (lives <= 0) return { ...n, lives: 0, combo: 0, status: "over", message: "Trace complete — connection lost" };
  return withChallenge({ ...n, lives, combo: 0, flash: "bad", flashId: g.flashId + 1, message: "Timed out — integrity lost" });
}
export function continueBreach(g: BreachState): BreachState {
  return withChallenge({ ...g, level: g.level + 1, index: 0, status: "playing", message: `Level ${g.level + 1} — security increased` });
}
export const accuracy = (g: BreachState) => (g.total ? Math.round((g.correct / g.total) * 100) : 100);
export const wpm = (g: BreachState) => (g.activeMs > 3000 ? Math.round(g.chars / 5 / (g.activeMs / 60000)) : 0);
