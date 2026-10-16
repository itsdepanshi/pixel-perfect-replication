import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENTS, type RunResult } from "./progression";
import type { Difficulty, Dir } from "./random";

export type Phase = "setup" | "playing" | "paused" | "over";
export type GameProps = { suspended: boolean; onExit: () => void; bonus?: boolean };

/** Captures game keys at window level only while enabled, so other apps and desktop shortcuts never see them. */
export function useGameKeys(enabled: boolean, handler: (e: KeyboardEvent) => boolean) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ref.current(e)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
export function useDocumentHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}
export function useAutoPause(phase: Phase, setPhase: (p: Phase) => void, suspended: boolean) {
  const hidden = useDocumentHidden();
  useEffect(() => { if ((suspended || hidden) && phase === "playing") setPhase("paused"); }, [suspended, hidden, phase, setPhase]);
  return hidden;
}

type Option<T extends string> = { id: T; label: string; desc: string; locked?: boolean };
export function SetupScreen<T extends string>(props: { code: string; title: string; subtitle: string; desc: string; controls: string[]; modes: Option<T>[]; mode: T; setMode: (m: T) => void; difficulty: Difficulty; setDifficulty: (d: Difficulty) => void; best: number; onPlay: () => void; onBack: () => void; children?: ReactNode }) {
  return <div className="arcade-setup">
    <div className="arcade-setup-head"><span className="arcade-code">{props.code}</span><div><p>{props.subtitle}</p><h2>{props.title}</h2></div><span className="arcade-best"><Trophy size={12} /> BEST {props.best}</span></div>
    <p className="arcade-desc">{props.desc}</p>
    <fieldset className="arcade-options"><legend>MODE</legend>{props.modes.map(m => <Button key={m.id} variant="system" className="arcade-option" data-selected={props.mode === m.id} disabled={m.locked} aria-pressed={props.mode === m.id} onClick={() => props.setMode(m.id)}><strong>{m.label}</strong><span>{m.locked ? "LOCKED" : m.desc}</span></Button>)}</fieldset>
    <fieldset className="arcade-options difficulty"><legend>DIFFICULTY</legend>{(["easy", "normal", "hard"] as const).map(d => <Button key={d} variant="system" className="arcade-option" data-selected={props.difficulty === d} aria-pressed={props.difficulty === d} onClick={() => props.setDifficulty(d)}><strong>{d.toUpperCase()}</strong></Button>)}</fieldset>
    {props.children}
    <div className="arcade-controls"><span>CONTROLS</span>{props.controls.map(c => <kbd key={c}>{c}</kbd>)}</div>
    <div className="arcade-actions"><Button variant="system" onClick={props.onBack}><ArrowLeft /> Arcade</Button><Button className="arcade-play" onClick={props.onPlay}><Play /> Play</Button></div>
  </div>;
}
export function PauseOverlay({ onResume, onRestart, onQuit }: { onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  return <div className="arcade-overlay" role="dialog" aria-label="Game paused"><div className="arcade-overlay-card"><Pause size={20} /><h3>PAUSED</h3><p>Press ESC to resume.</p><div className="arcade-actions"><Button onClick={onResume}><Play /> Resume</Button><Button variant="system" onClick={onRestart}><RotateCcw /> Restart</Button><Button variant="system" onClick={onQuit}><LogOut /> Quit</Button></div></div></div>;
}
export function Summary({ title, score, result, stats, onRetry, onBack, children }: { title: string; score: number; result: RunResult | null; stats: [string, ReactNode][]; onRetry: () => void; onBack: () => void; children?: ReactNode }) {
  return <div className="arcade-overlay" role="dialog" aria-label="Round summary"><div className="arcade-overlay-card summary">
    <h3>{title}</h3>
    <p className="summary-score">{score}</p>
    {result?.record && <p className="summary-record">NEW PERSONAL BEST{result.previousBest ? ` — previous ${result.previousBest}` : ""}</p>}
    <dl className="summary-stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>XP</dt><dd>{result?.counted ? `+${result.xp}` : "0 (run too short)"}</dd></div></dl>
    {result?.rankUp && <p className="summary-record">RANK UP — {result.rankUp}</p>}
    {!!result?.unlocked.length && <ul className="summary-unlocks">{result.unlocked.map(id => <li key={id}><Trophy size={11} /> {ACHIEVEMENTS[id].name}</li>)}</ul>}
    <div className="arcade-actions">{children}<Button onClick={onRetry}><RotateCcw /> Retry</Button><Button variant="system" onClick={onBack}><ArrowLeft /> Arcade</Button></div>
  </div></div>;
}
export function Hud({ items, onPause }: { items: [string, ReactNode][]; onPause?: () => void }) {
  return <div className="arcade-hud">{items.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}{onPause && <Button variant="system" size="icon" aria-label="Pause game" title="Pause (Esc)" onClick={onPause}><Pause /></Button>}</div>;
}
export function DPad({ onDir }: { onDir: (d: Dir) => void }) {
  return <div className="arcade-dpad" aria-label="Touch controls"><Button variant="system" size="icon" aria-label="Up" onClick={() => onDir("up")}><ArrowUp /></Button><Button variant="system" size="icon" aria-label="Left" onClick={() => onDir("left")}><ArrowLeft /></Button><Button variant="system" size="icon" aria-label="Down" onClick={() => onDir("down")}><ArrowDown /></Button><Button variant="system" size="icon" aria-label="Right" onClick={() => onDir("right")}><ArrowRight /></Button></div>;
}
export const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
