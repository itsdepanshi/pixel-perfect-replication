import { useCallback, useEffect, useRef, useState } from "react";
import { createSnake, outside, snakeInterval, stepSnake, turn, SNAKE_H, SNAKE_W, type SnakeMode, type SnakeState } from "./snake-logic";
import { dailySeed, KEY_DIRS, same, type Difficulty } from "./random";
import { recordRun, unlock, useProfile, type RunResult } from "./progression";
import { DPad, fmtTime, Hud, PauseOverlay, SetupScreen, Summary, useAutoPause, useGameKeys, type GameProps, type Phase } from "./arcade-ui";

export function SnakeGame({ suspended, onExit, bonus }: GameProps) {
  const profile = useProfile();
  const [mode, setMode] = useState<SnakeMode>(bonus ? "overclock" : "classic");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [phase, setPhaseState] = useState<Phase>("setup");
  const setPhase = useCallback((p: Phase) => setPhaseState(p), []);
  const [state, setState] = useState<SnakeState | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [fx, setFx] = useState<string | null>(null);
  const finished = useRef(false);
  useAutoPause(phase, setPhase, suspended);
  const seed = mode === "daily" ? dailySeed() : Math.floor(Math.random() * 1e9);
  const start = () => { finished.current = false; setResult(null); setState(createSnake(mode, seed)); setPhase("playing"); };

  useEffect(() => {
    if (phase !== "playing" || !state?.alive) return;
    const interval = snakeInterval(state, difficulty);
    const id = window.setTimeout(() => setState(s => s && { ...stepSnake(s), elapsed: s.elapsed + interval }), interval);
    return () => window.clearTimeout(id);
  }, [phase, state, difficulty]);

  useEffect(() => {
    if (!state) return;
    if (state.events.includes("ghost")) unlock(["ghost"]);
    if (!state.alive && !finished.current) {
      finished.current = true;
      const daily = mode === "daily" && state.score >= 15;
      setResult(recordRun({ game: "snake", mode, score: state.score, durationSec: state.elapsed / 1000, xpBase: state.score * 6, completed: daily, challenge: daily ? `snake-daily-${dailySeed()}` : undefined, achievements: [...(state.score >= 25 ? ["snake_25"] : []), ...(daily ? ["daily"] : [])] }));
      setPhase("over");
      return;
    }
    const e = state.events.find(x => x !== "ghost");
    if (!e) return;
    setFx(e);
    const t = window.setTimeout(() => setFx(null), 280);
    return () => window.clearTimeout(t);
  }, [state, mode, setPhase]);

  useGameKeys(!suspended && (phase === "playing" || phase === "paused"), e => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { setPhase(phase === "playing" ? "paused" : "playing"); return true; }
    const d = KEY_DIRS[e.key];
    if (d && phase === "playing") setState(s => s && turn(s, d));
    return !!d || e.key === " ";
  });

  const best = profile.best[`snake:${mode}`] ?? 0;
  if (phase === "setup" || !state) return <SetupScreen code="G1" title="VIRUS RUN" subtitle="SNAKE.EXE" desc="Steer a digital worm through the arena. Collect data fragments to grow; avoid walls, your own body and corrupted sectors. Speed rises with every fragment." controls={["ARROWS / WASD — steer", "ESC / P — pause"]} best={best} mode={mode} setMode={setMode} difficulty={difficulty} setDifficulty={setDifficulty} onPlay={start} onBack={onExit} modes={[
    { id: "classic", label: "CLASSIC", desc: "Traditional rules. No modifiers." },
    { id: "chaos", label: "CHAOS", desc: "Arena collapses every 5 fragments (3s warning), hazards, DASH and PHASE power-ups." },
    { id: "daily", label: "DAILY", desc: `Fixed layout for ${dailySeed()}. Score 15 to complete.` },
    { id: "overclock", label: "OVERCLOCK", desc: "Secret bonus mode: chaos at 1.4× speed.", locked: !profile.secretBonus },
  ]} />;

  const cells = [];
  const warning = state.shrinkAt !== null;
  for (let y = 0; y < SNAKE_H; y++) for (let x = 0; x < SNAKE_W; x++) {
    const p = { x, y };
    const bodyIndex = state.snake.findIndex(b => same(b, p));
    let cls = "snake-cell";
    if (outside(state, p)) cls += " is-wall";
    else if (warning && outside(state, p, state.inset + 1)) cls += " is-warn";
    if (bodyIndex === 0) cls += " is-head";
    else if (bodyIndex > 0) cls += " is-body";
    else if (same(p, state.food)) cls += " is-food";
    else if (state.power && same(p, state.power.at)) cls += ` is-power-${state.power.kind}`;
    else if (state.hazards.some(h => same(h, p))) cls += " is-hazard";
    cells.push(<i key={`${x}-${y}`} className={cls} />);
  }
  const powers = [state.active.dash ? `DASH ${state.active.dash}` : "", state.active.phase ? `PHASE ${state.active.phase}` : ""].filter(Boolean).join(" · ") || "—";
  return <div className="arcade-game">
    <Hud onPause={phase === "playing" ? () => setPhase("paused") : undefined} items={[["SCORE", state.score], ["BEST", Math.max(best, state.score)], ["TIME", fmtTime(state.elapsed / 1000)], ["POWER", powers], ["STATUS", phase === "paused" ? "PAUSED" : warning ? "ARENA SHIFT!" : mode.toUpperCase()]]} />
    <div className={`snake-board ${fx ? `fx-${fx}` : ""} ${state.active.phase ? "is-phasing" : ""}`} data-trail={profile.trail} role="img" aria-label={`Snake arena, score ${state.score}`}>{cells}</div>
    <DPad onDir={d => setState(s => s && turn(s, d))} />
    {phase === "paused" && <PauseOverlay onResume={() => setPhase("playing")} onRestart={start} onQuit={() => setPhase("setup")} />}
    {phase === "over" && <Summary title={state.cause.toUpperCase()} score={state.score} result={result} stats={[["MODE", mode.toUpperCase()], ["LENGTH", state.snake.length], ["TIME", fmtTime(state.elapsed / 1000)]]} onRetry={start} onBack={onExit} />}
  </div>;
}
