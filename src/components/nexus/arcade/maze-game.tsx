import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dronePositions, moveMaze, nextMazeLevel, startMaze, tickDrones, tickMazeTime, MAZE_LEVELS, type MazeMode, type MazeRun } from "./maze-logic";
import { KEY_DIRS, same, type Difficulty, type Pt } from "./random";
import { recordRun, useProfile, type RunResult } from "./progression";
import { DPad, fmtTime, Hud, PauseOverlay, SetupScreen, Summary, useAutoPause, useGameKeys, type GameProps, type Phase } from "./arcade-ui";

export function MazeGame({ suspended, onExit }: GameProps) {
  const profile = useProfile();
  const [mode, setMode] = useState<MazeMode>("campaign");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [seedText, setSeedText] = useState("1337");
  const [phase, setPhaseState] = useState<Phase>("setup");
  const setPhase = useCallback((p: Phase) => setPhaseState(p), []);
  const [run, setRun] = useState<MazeRun | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const finished = useRef(false);
  useAutoPause(phase, setPhase, suspended);
  const start = () => { finished.current = false; setResult(null); setRun(startMaze(mode, difficulty, Math.abs(parseInt(seedText, 10)) || 1337)); setPhase("playing"); };
  const playing = phase === "playing" && run?.status === "playing";

  useEffect(() => {
    if (!playing) return;
    const clock = window.setInterval(() => setRun(r => r && tickMazeTime(r, 1)), 1000);
    const drones = window.setInterval(() => setRun(r => r && tickDrones(r)), difficulty === "hard" ? 340 : difficulty === "easy" ? 560 : 440);
    return () => { window.clearInterval(clock); window.clearInterval(drones); };
  }, [playing, difficulty]);

  const finish = useCallback((r: MazeRun, quit = false) => {
    if (finished.current) return;
    finished.current = true;
    setResult(recordRun({ game: "maze", mode, score: r.score, durationSec: 999, xpBase: r.levelsCleared * 40 + r.totalFragments * 4, completed: r.levelsCleared > 0, challenge: r.levelsCleared >= MAZE_LEVELS ? `maze-clear-${difficulty}` : undefined, stats: { mazeLevels: r.levelsCleared }, achievements: [...(r.stealthClears > 0 ? ["stealth"] : []), ...(r.levelsCleared >= 5 ? ["kernel_5"] : [])] }));
    if (quit) setRun({ ...r, status: "over", message: "Run aborted." });
    setPhase("over");
  }, [mode, difficulty, setPhase]);
  useEffect(() => { if (run?.status === "over") finish(run); if (run?.status === "cleared" && run.L.level >= MAZE_LEVELS) finish(run); }, [run, finish]);

  useGameKeys(!suspended && (phase === "playing" || phase === "paused"), e => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { setPhase(phase === "playing" ? "paused" : "playing"); return true; }
    if (phase !== "playing") return false;
    if (e.key === "Enter" && run?.status === "cleared") { setRun(r => r && nextMazeLevel(r)); return true; }
    const d = KEY_DIRS[e.key];
    if (d) setRun(r => r && moveMaze(r, d));
    return !!d;
  });

  const best = profile.best[`maze:${mode}`] ?? 0;
  if (phase === "setup" || !run) return <SetupScreen code="G3" title="ZERO DAY" subtitle="ESCAPE THE KERNEL" desc="Navigate generated kernel mazes. Grab the access key, open the gate and reach the exit before time expires. Switches shift firewall segments, data fragments hide in dead ends, and drones detect you within 2 cells in line of sight." controls={["ARROWS / WASD — move", "ENTER — next level", "ESC / P — pause"]} best={best} mode={mode} setMode={setMode} difficulty={difficulty} setDifficulty={setDifficulty} onPlay={start} onBack={onExit} modes={[
    { id: "campaign", label: "CAMPAIGN", desc: `${MAZE_LEVELS} fixed, validated levels with new mechanics.` },
    { id: "seeded", label: "SEEDED", desc: "Procedural levels from your own deterministic seed." },
  ]}>{mode === "seeded" && <label className="arcade-toggle">SEED <input className="arcade-seed" inputMode="numeric" value={seedText} onChange={e => setSeedText(e.target.value.replace(/\D/g, "").slice(0, 9))} aria-label="Maze seed" /></label>}</SetupScreen>;

  const L = run.L;
  const drones = dronePositions(run);
  const inList = (list: Pt[], p: Pt) => list.some(q => same(q, p));
  const cells = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const p = { x, y };
    let cls = "maze-cell";
    if (L.walls[y * L.w + x]) cls += " is-wall";
    else if (same(p, run.pos)) cls += " is-player";
    else if (inList(drones, p)) cls += " is-drone";
    else if (same(p, L.exit)) cls += " is-exit";
    else if (same(p, L.gate)) cls += run.key ? " is-gate-open" : " is-gate";
    else if (!run.key && same(p, L.key)) cls += " is-key";
    else if (L.switchAt && same(p, L.switchAt)) cls += run.sw ? " is-switch on" : " is-switch";
    else if (inList(L.firewallA, p)) cls += run.sw ? " is-fw-open" : " is-fw";
    else if (inList(L.firewallB, p)) cls += run.sw ? " is-fw" : " is-fw-open";
    else if (inList(L.fragments, p) && !inList(run.collected, p)) cls += " is-fragment";
    cells.push(<i key={`${x}-${y}`} className={cls} />);
  }
  return <div className="arcade-game">
    <Hud onPause={phase === "playing" ? () => setPhase("paused") : undefined} items={[["SCORE", run.score], ["LEVEL", `${L.level}/${MAZE_LEVELS}`], ["TIME", fmtTime(run.timeLeft)], ["KEY", run.key ? "YES" : "NO"], ["DATA", `${run.collected.length}/${L.fragments.length}`], ["INTEGRITY", "■".repeat(run.lives)], ["STEALTH", run.detected ? "LOST" : "INTACT"]]} />
    <div className="maze-board" key={run.hitId} data-hit={run.hitId > 0 || undefined} style={{ gridTemplateColumns: `repeat(${L.w}, 1fr)`, aspectRatio: `${L.w} / ${L.h}` }} role="img" aria-label={`Maze level ${L.level}`}>{cells}</div>
    <p className="maze-message" aria-live="polite">{run.message}{mode === "seeded" ? ` · seed ${run.baseSeed}` : ""}</p>
    <DPad onDir={d => setRun(r => r && moveMaze(r, d))} />
    {run.status === "cleared" && L.level < MAZE_LEVELS && phase === "playing" && <div className="arcade-overlay"><div className="arcade-overlay-card"><h3>LEVEL {L.level} ESCAPED</h3><p>{run.message}</p><div className="arcade-actions"><Button onClick={() => setRun(r => r && nextMazeLevel(r))}>Next level <ChevronRight /></Button><Button variant="system" onClick={() => finish(run)}>Cash out</Button></div><p>or press ENTER</p></div></div>}
    {phase === "paused" && <PauseOverlay onResume={() => setPhase("playing")} onRestart={start} onQuit={() => finish(run, true)} />}
    {phase === "over" && <Summary title={run.status === "cleared" ? (run.L.level >= MAZE_LEVELS ? "KERNEL FULLY ESCAPED" : "RUN BANKED") : run.message.toUpperCase()} score={run.score} result={result} stats={[["LEVELS", run.levelsCleared], ["FRAGMENTS", run.totalFragments], ["STEALTH CLEARS", run.stealthClears]]} onRetry={start} onBack={onExit} />}
  </div>;
}
