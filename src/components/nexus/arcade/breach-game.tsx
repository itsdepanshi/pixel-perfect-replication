import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { accuracy, breachKey, breachTick, continueBreach, startBreach, wpm, BREACH_LEVELS, PER_LEVEL, type BreachMode, type BreachState } from "./breach-logic";
import type { Difficulty } from "./random";
import { recordRun, useProfile, type RunResult } from "./progression";
import { Hud, PauseOverlay, SetupScreen, Summary, useAutoPause, useGameKeys, type GameProps, type Phase } from "./arcade-ui";

export function BreachGame({ suspended, onExit }: GameProps) {
  const profile = useProfile();
  const [mode, setMode] = useState<BreachMode>("levels");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [effects, setEffects] = useState(true);
  const [phase, setPhaseState] = useState<Phase>("setup");
  const setPhase = useCallback((p: Phase) => setPhaseState(p), []);
  const [g, setG] = useState<BreachState | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const finished = useRef(false);
  useAutoPause(phase, setPhase, suspended);
  const start = () => { finished.current = false; setResult(null); setG(startBreach(mode, difficulty, Math.floor(Math.random() * 1e9))); setPhase("playing"); };

  useEffect(() => {
    if (phase !== "playing" || g?.status !== "playing") return;
    const id = window.setInterval(() => setG(s => s && breachTick(s, 100)), 100);
    return () => window.clearInterval(id);
  }, [phase, g?.status]);

  const finish = useCallback((s: BreachState, quit = false) => {
    if (finished.current) return;
    finished.current = true;
    const victory = s.status === "victory";
    setResult(recordRun({ game: "breach", mode, score: s.score, durationSec: s.activeMs / 1000, xpBase: s.score / 12 + s.levelsCleared * 25, completed: s.levelsCleared > 0, challenge: victory ? `breach-clear-${difficulty}` : undefined, stats: { breachCombo: s.maxCombo, breachWpm: wpm(s), breachLevels: s.levelsCleared }, achievements: [...(s.maxCombo >= 15 ? ["combo_15"] : []), ...(s.decoys >= 5 ? ["decoy_5"] : []), ...(victory ? ["breach_clear"] : [])] }));
    if (quit) setG({ ...s, status: "over", message: "Connection aborted" });
    setPhase("over");
  }, [mode, difficulty, setPhase]);
  useEffect(() => { if (g && (g.status === "over" || g.status === "victory")) finish(g); }, [g, finish]);

  useGameKeys(!suspended && (phase === "playing" || phase === "paused"), e => {
    if (e.key === "Escape") { setPhase(phase === "playing" ? "paused" : "playing"); return true; }
    if (phase !== "playing" || !g) return false;
    if (g.status === "levelup") { if (e.key === "Enter") { setG(s => s && continueBreach(s)); return true; } return e.key.length === 1; }
    if (e.key === "Enter" || e.key.length === 1) { setG(s => s && breachKey(s, e.key)); return true; }
    return e.key === "Backspace" || e.key === "Tab";
  });

  const best = profile.best[`breach:${mode}`] ?? 0;
  if (phase === "setup" || !g) return <SetupScreen code="G2" title="BREACH PROTOCOL" subtitle="HACK THE MAINFRAME" desc="Reproduce each intercepted sequence before the trace completes. Type SIGNED commands exactly, decode reversed streams, and press ENTER to reject UNVERIFIED honeypots — typing them triggers a penalty. Inputs are fictional and never executed." controls={["TYPE — enter sequence", "ENTER — reject decoy", "ESC — pause"]} best={best} mode={mode} setMode={setMode} difficulty={difficulty} setDifficulty={setDifficulty} onPlay={start} onBack={onExit} modes={[
    { id: "levels", label: "CHALLENGE", desc: `${BREACH_LEVELS} structured levels of ${PER_LEVEL} sequences.` },
    { id: "endless", label: "ENDLESS", desc: "Survive escalating security as long as you can." },
  ]}><label className="arcade-toggle"><input type="checkbox" checked={effects} onChange={e => setEffects(e.target.checked)} /> Distortion effects (never hide the prompt)</label></SetupScreen>;

  const c = g.challenge;
  const pct = Math.max(0, g.timeLeft / g.timeMax) * 100;
  return <div className="arcade-game">
    <Hud onPause={phase === "playing" ? () => setPhase("paused") : undefined} items={[["SCORE", g.score], ["LEVEL", `${g.level}${mode === "levels" ? `/${BREACH_LEVELS}` : ""}`], ["COMBO", `${g.combo}×`], ["ACCURACY", `${accuracy(g)}%`], ["WPM", wpm(g)], ["INTEGRITY", "■".repeat(g.lives) || "—"]]} />
    <div className={`breach-console ${effects && g.level >= 3 ? "is-distorted" : ""}`} data-flash={g.flash ?? undefined} key={g.flashId}>
      <div className="breach-meta"><span data-kind={c.kind}>{c.label}</span><span>SEQ {g.index + 1}/{PER_LEVEL}</span></div>
      <p className="breach-prompt" aria-live="polite">{c.kind === "decoy" ? c.prompt : c.prompt.split("").map((ch, i) => <span key={i} className={c.kind !== "decode" && i < g.typed.length ? "is-typed" : ""}>{ch}</span>)}</p>
      {c.kind === "decode" && <p className="breach-hint">Type the stream forwards</p>}
      {c.kind === "decoy" && <p className="breach-hint warning">Unverified source — press ENTER to reject</p>}
      <p className="breach-input" aria-label="Your input">&gt; {g.typed}<span className="cursor" /></p>
      <div className="breach-timer" role="progressbar" aria-label="Time remaining" aria-valuenow={Math.round(pct)}><i style={{ width: `${pct}%` }} /></div>
      <p className="breach-message">{g.message || "Awaiting input…"}</p>
    </div>
    {g.status === "levelup" && phase === "playing" && <div className="arcade-overlay"><div className="arcade-overlay-card"><h3>LEVEL {g.level} CLEARED</h3><p>Accuracy {accuracy(g)}% · combo {g.combo}×</p><div className="arcade-actions"><Button onClick={() => setG(s => s && continueBreach(s))}>Next level <ChevronRight /></Button></div><p>or press ENTER</p></div></div>}
    {phase === "paused" && <PauseOverlay onResume={() => setPhase("playing")} onRestart={start} onQuit={() => finish(g, true)} />}
    {phase === "over" && <Summary title={g.status === "victory" ? "MAINFRAME BREACHED" : g.message.toUpperCase() || "CONNECTION LOST"} score={g.score} result={result} stats={[["LEVELS", g.levelsCleared], ["ACCURACY", `${accuracy(g)}%`], ["MAX COMBO", `${g.maxCombo}×`], ["WPM", wpm(g)]]} onRetry={start} onBack={onExit} />}
  </div>;
}
