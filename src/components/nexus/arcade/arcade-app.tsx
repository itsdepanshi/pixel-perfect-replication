import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Play, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENTS, COSMETICS, equip, rankFor, useNotices, useProfile } from "./progression";
import { SnakeGame } from "./snake-game";
import { BreachGame } from "./breach-game";
import { MazeGame } from "./maze-game";

type Screen = "home" | "snake" | "breach" | "maze" | "achievements";
const GAMES = [
  { id: "snake", code: "G1", title: "VIRUS RUN", sub: "SNAKE.EXE", desc: "Arcade worm survival with collapsing arenas, hazards and DASH/PHASE abilities.", modes: ["classic", "chaos", "daily"] },
  { id: "breach", code: "G2", title: "BREACH PROTOCOL", sub: "HACK THE MAINFRAME", desc: "Typing and pattern recognition against a trace timer. Spot the honeypots.", modes: ["levels", "endless"] },
  { id: "maze", code: "G3", title: "ZERO DAY", sub: "ESCAPE THE KERNEL", desc: "Validated procedural mazes with keys, gates, switches and patrol drones.", modes: ["campaign", "seeded"] },
] as const;
export const ARCADE_BONUS_EVENT = "nexus:arcade-bonus";

export function ArcadeApp({ suspended }: { suspended: boolean }) {
  const profile = useProfile();
  const notices = useNotices();
  const [screen, setScreen] = useState<Screen>("home");
  const [bonus, setBonus] = useState(false);
  useEffect(() => {
    const open = () => { setBonus(true); setScreen("snake"); };
    window.addEventListener(ARCADE_BONUS_EVENT, open);
    return () => window.removeEventListener(ARCADE_BONUS_EVENT, open);
  }, []);
  const rank = rankFor(profile.xp);
  const back = () => { setBonus(false); setScreen("home"); };
  return <div className="arcade-app" data-theme={profile.theme} data-effect={profile.effect}>
    {screen === "home" && <div className="arcade-home">
      <div className="arcade-profile">
        <div><p>OPERATOR RANK</p><h2>{rank.rank}</h2></div>
        <div className="arcade-xp"><div className="metric-track"><i style={{ width: `${Math.round(rank.progress * 100)}%` }} /></div><span>{profile.xp} XP{rank.next ? ` · ${rank.toNext} to ${rank.next}` : " · MAX RANK"}</span></div>
        <div className="arcade-profile-stats"><span>{profile.played} RUNS</span><span>{profile.achievements.length}/{Object.keys(ACHIEVEMENTS).length} ACHIEVEMENTS</span></div>
        <Button variant="system" onClick={() => setScreen("achievements")}><Trophy /> Achievements</Button>
      </div>
      <div className="arcade-cards">{GAMES.map(g => {
        const best = Math.max(0, ...g.modes.map(m => profile.best[`${g.id}:${m}`] ?? 0));
        return <article key={g.id} className="arcade-card">
          <div className={`arcade-preview preview-${g.id}`} aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
          <span className="arcade-code">{g.code} · {g.sub}</span>
          <h3>{g.title}</h3>
          <p>{g.desc}</p>
          <div className="arcade-card-foot"><span><Trophy size={11} /> BEST {best}</span><Button size="sm" className="arcade-play" aria-label={`Play ${g.title}`} onClick={() => setScreen(g.id)}><Play /> Play</Button></div>
        </article>;
      })}</div>
      {profile.secretBonus && <Button variant="system" className="arcade-bonus" onClick={() => { setBonus(true); setScreen("snake"); }}><Zap /> OVERCLOCK BONUS MODE UNLOCKED</Button>}
    </div>}
    {screen === "achievements" && <div className="arcade-achievements">
      <div className="arcade-actions start"><Button variant="system" onClick={back}><ArrowLeft /> Arcade</Button><span>{profile.challenges.length} CHALLENGES COMPLETED</span></div>
      <h3>ACHIEVEMENTS</h3>
      <ul className="achievement-list">{Object.entries(ACHIEVEMENTS).map(([id, a]) => {
        const got = profile.achievements.includes(id);
        return <li key={id} data-unlocked={got}>{got ? <Trophy size={14} /> : <Lock size={14} />}<div><strong>{got || !a.secret ? a.name : "???"}</strong><span>{got || !a.secret ? a.desc : "Hidden achievement — keep exploring."}</span></div>{a.reward && <em>{got || !a.secret ? COSMETICS[a.reward]?.name : "???"}</em>}</li>;
      })}</ul>
      <h3>UNLOCKABLES</h3>
      <ul className="cosmetic-list">{Object.entries(COSMETICS).map(([id, c]) => {
        const owned = profile.cosmetics.includes(id);
        const equipped = profile[c.kind] === id;
        return <li key={id} data-owned={owned}><div><strong>{owned || id !== "amber" ? c.name : "???"}</strong><span>{c.kind.toUpperCase()} · {owned || id !== "amber" ? c.desc : "Hidden theme"}</span></div><Button variant="system" size="sm" disabled={!owned || equipped} onClick={() => equip(c.kind, id)}>{equipped ? "Equipped" : owned ? "Equip" : <><Lock /> Locked</>}</Button></li>;
      })}</ul>
    </div>}
    {screen === "snake" && <SnakeGame key={bonus ? "bonus" : "std"} suspended={suspended} onExit={back} bonus={bonus} />}
    {screen === "breach" && <BreachGame suspended={suspended} onExit={back} />}
    {screen === "maze" && <MazeGame suspended={suspended} onExit={back} />}
    <div className="arcade-notices" aria-live="polite">{notices.map(n => <p key={n.id}>{n.text}</p>)}</div>
  </div>;
}
