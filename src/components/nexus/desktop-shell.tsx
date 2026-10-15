import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, ChevronRight, Command, Cpu, HardDrive, Hexagon, ShieldCheck, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apps, type AppId } from "./registry";
import { WindowManager, useWindowManager } from "./window-manager";
import { AppWindow } from "./app-window";

export function DesktopShell() {
  return <WindowManager><Desktop /></WindowManager>;
}
function Desktop() {
  const manager = useWindowManager();
  const [booting, setBooting] = useState(true);
  const [time, setTime] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState(true);
  useEffect(() => {
    setTime(new Date());
    const clock = window.setInterval(() => setTime(new Date()), 1000);
    const boot = window.setTimeout(() => setBooting(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 2100);
    return () => { window.clearInterval(clock); window.clearTimeout(boot); };
  }, []);
  useEffect(() => { if (!booting) manager.open("terminal"); }, [booting]); // One initial window per completed boot.
  const clock = time?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "--:--:--";
  return <main className="desktop-shell">
    <StatusBar time={time} clock={clock} />
    <div className="desktop-workspace">
      <div className="desktop-wallpaper" aria-hidden="true"><div className="wallpaper-cross cross-top" /><div className="wallpaper-cross cross-bottom" /><div className="wallpaper-identity"><div className="wallpaper-eyebrow"><span /> PERSONAL COMPUTING. REDEFINED.</div><div className="wallpaper-word">NEXUS<span>://OS</span></div><div className="wallpaper-bottom"><span>YOUR SYSTEM. YOUR RULES.</span><span>EST. 2026 — V.1.0</span></div></div><div className="wallpaper-wire"><svg viewBox="0 0 400 400" fill="none"><path d="M200 20 360 110v180L200 380 40 290V110L200 20Z M200 60 325 130v140L200 340 75 270V130L200 60Z M200 100 290 150v100l-90 50-90-50V150l90-50Z M200 140 255 170v60l-55 30-55-30v-60l55-30Z M200 20v120M360 110l-105 60M360 290l-105-60M200 380V260M40 290l105-60M40 110l105 60" /></svg></div><div className="wallpaper-coordinate">NX—01 / LOCAL ENVIRONMENT</div></div>
      <nav className="desktop-shortcuts" aria-label="Desktop applications">{apps.map(app => <DesktopIcon key={app.id} id={app.id} />)}</nav>
      <div className="workspace-label"><span className="status-dot" /> WORKSPACE 01 <span>/</span> <span>LOCAL</span></div>
      {showStatus && <aside className="system-status" aria-label="Simulated system status"><div className="system-status-heading"><span><Activity size={12} /> SYSTEM TELEMETRY</span><Button variant="system" size="icon" aria-label="Hide system status" title="Hide system status" onClick={() => setShowStatus(false)}><X /></Button></div><div className="metric"><span><Cpu size={12} /> CPU</span><div className="metric-track"><i /></div><span>12%</span></div><div className="metric memory"><span><HardDrive size={12} /> MEM</span><div className="metric-track"><i /></div><span>2.4 / 8 GB</span></div><p>SIMULATED METRICS <span>●</span></p></aside>}
      {manager.windows.map(w => <AppWindow key={w.id} window={w} />)}
      <div className="desktop-bottom-label"><span><ShieldCheck size={12} /> ISOLATED & SECURE</span><span>NEXUS KERNEL / 1.0.0 <ArrowUpRight size={11} /></span></div>
    </div>
    <Taskbar clock={clock} showStatus={showStatus} toggleStatus={() => setShowStatus(v => !v)} />
    {booting && <div className="boot-screen"><div className="boot-content"><div className="boot-logo"><Hexagon /><span>NEXUS<span>://OS</span></span></div><p className="boot-version">BOOT SEQUENCE / KERNEL 1.0.0</p><div className="boot-lines"><p>[ OK ] Initializing isolated environment</p><p>[ OK ] Mounting virtual filesystem</p><p>[ OK ] Loading desktop services</p><p>[ OK ] Welcome to NEXUS OS<span className="boot-cursor">_</span></p></div><Button variant="system" onClick={() => setBooting(false)}>Skip boot <ChevronRight /></Button></div><span className="boot-footer">LOCAL FIRST. ALWAYS.</span></div>}
  </main>;
}
export function StatusBar({ time, clock }: { time: Date | null; clock: string }) {
  return <header className="status-bar"><div className="brand"><Hexagon size={19} /><span>NEXUS<span>://OS</span></span><span className="version-badge">1.0</span></div><div className="session-status"><span className="status-dot" /> SYSTEM ONLINE <span className="status-divider">/</span><span className="session-user">root@nexus</span></div><div className="top-right"><span className="local-status"><Wifi size={13} /> LOCAL SESSION</span><span className="top-date">{time?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() ?? "—"}</span><time>{clock}</time></div></header>;
}
export function DesktopIcon({ id }: { id: AppId }) {
  const manager = useWindowManager();
  const app = apps.find(a => a.id === id);
  if (!app) return null;
  const Icon = app.icon;
  return <Button variant="shortcut" className="desktop-icon" aria-label={`Open ${app.name}`} onClick={() => manager.open(id)}><span className="shortcut-icon"><Icon /><span className="shortcut-number">{app.code}</span></span><span className="shortcut-name">{app.name}</span></Button>;
}
export function Taskbar({ clock, showStatus, toggleStatus }: { clock: string; showStatus: boolean; toggleStatus: () => void }) {
  const manager = useWindowManager();
  return <footer className="taskbar"><div className="taskbar-left"><Button variant="system" size="icon" aria-label="Open Terminal from launcher" title="Terminal launcher" className="launcher-button" onClick={() => manager.open("terminal")}><Command /></Button><span className="taskbar-separator" /><div className="taskbar-apps">{apps.map(app => { const running = manager.windows.some(w => w.id === app.id); const Icon = app.icon; return <Button key={app.id} variant="task" className="taskbar-app" aria-label={`Show ${app.name}`} title={app.name} data-running={running} data-active={manager.active === app.id} onClick={() => manager.open(app.id)}><Icon />{running && <span className="running-indicator" />}</Button>; })}</div></div><div className="taskbar-center"><span className="status-dot" /> {String(manager.windows.length).padStart(2, "0")} PROCESSES <span>/</span> WORKSPACE 01</div><div className="taskbar-right"><Button variant="system" size="icon" title="Toggle simulated system status" aria-label="Toggle simulated system status" aria-pressed={showStatus} onClick={toggleStatus}><Activity /></Button><Wifi size={15} /><span className="taskbar-separator" /><div className="taskbar-clock"><time>{clock.slice(0, 5)}</time><span>LOCAL TIME</span></div></div></footer>;
}