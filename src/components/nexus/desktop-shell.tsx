import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, ChevronRight, Command, Cpu, HardDrive, Hexagon, LayoutGrid, ShieldCheck, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apps, type AppId } from "./registry";
import { WindowManager, useWindowManager } from "./window-manager";
import { AppWindow } from "./app-window";
import { SECRET_EVENT } from "./terminal-commands";
import { unlockSecretBonus } from "./arcade/progression";
import { ARCADE_BONUS_EVENT } from "./arcade/arcade-app";
import { CURSOR_EVENT, readCursorPreference } from "./settings-app";

type IconCell = { col: number; row: number };
const GRID = { x: 22, y: 30, w: 96, h: 104 };
const LAYOUT_KEY = "nexus-icon-layout";
function defaultLayout(): Record<string, IconCell> { return Object.fromEntries(apps.map((app, i) => [app.id, { col: 0, row: i }])); }
function readLayout(): Record<string, IconCell> {
  const base = defaultLayout();
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") as Record<string, IconCell>;
    for (const app of apps) { const cell = saved[app.id]; if (cell && Number.isFinite(cell.col) && Number.isFinite(cell.row)) base[app.id] = cell; }
  } catch { /* ignore corrupt layout */ }
  return base;
}
function cellFor(x: number, y: number, bounds: { width: number; height: number }): IconCell {
  const maxCol = Math.max(0, Math.floor((bounds.width - GRID.x - 82) / GRID.w));
  const maxRow = Math.max(0, Math.floor((bounds.height - GRID.y - 83) / GRID.h));
  return { col: Math.max(0, Math.min(maxCol, Math.round((x - GRID.x) / GRID.w))), row: Math.max(0, Math.min(maxRow, Math.round((y - GRID.y) / GRID.h))) };
}
/** Nearest free cell to the target, so icons never overlap. */
function freeCell(target: IconCell, taken: Set<string>, bounds: { width: number; height: number }): IconCell {
  if (!taken.has(`${target.col},${target.row}`)) return target;
  for (let radius = 1; radius < 12; radius++) for (let dc = -radius; dc <= radius; dc++) for (let dr = -radius; dr <= radius; dr++) {
    if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
    const cell = cellFor(GRID.x + (target.col + dc) * GRID.w, GRID.y + (target.row + dr) * GRID.h, bounds);
    if (!taken.has(`${cell.col},${cell.row}`)) return cell;
  }
  return target;
}

export function DesktopShell() {
  return <WindowManager><Desktop /></WindowManager>;
}
function Desktop() {
  const manager = useWindowManager();
  const [booting, setBooting] = useState(true);
  const [time, setTime] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState(true);
  const [customCursor, setCustomCursor] = useState(true);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [layout, setLayout] = useState<Record<string, IconCell>>(defaultLayout);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setCustomCursor(readCursorPreference());
    setLayout(readLayout());
    const onCursor = () => setCustomCursor(readCursorPreference());
    window.addEventListener(CURSOR_EVENT, onCursor);
    return () => window.removeEventListener(CURSOR_EVENT, onCursor);
  }, []);
  const saveLayout = (next: Record<string, IconCell>) => { setLayout(next); try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* private mode */ } };
  const takenCells = (except?: AppId) => new Set(apps.filter(a => a.id !== except).map(a => { const c = layout[a.id] ?? { col: 0, row: 0 }; return `${c.col},${c.row}`; }));
  const alignToGrid = () => { const next = { ...layout }; const taken = new Set<string>(); for (const app of apps) { const current = next[app.id] ?? { col: 0, row: 0 }; const cell = freeCell(cellFor(GRID.x + current.col * GRID.w, GRID.y + current.row * GRID.h, manager.bounds), taken, manager.bounds); next[app.id] = cell; taken.add(`${cell.col},${cell.row}`); } saveLayout(next); };
  const autoArrange = () => { const next = { ...layout }; const perColumn = Math.max(1, Math.floor((manager.bounds.height - GRID.y) / GRID.h)); apps.forEach((app, i) => { next[app.id] = { col: Math.floor(i / perColumn), row: i % perColumn }; }); saveLayout(next); };
  const resetLayout = () => { saveLayout(defaultLayout()); };
  useEffect(() => {
    setTime(new Date());
    const clock = window.setInterval(() => setTime(new Date()), 1000);
    const boot = window.setTimeout(() => setBooting(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 2100);
    return () => { window.clearInterval(clock); window.clearTimeout(boot); };
  }, []);
  useEffect(() => { if (!booting) manager.open("terminal"); }, [booting]);
  useEffect(() => {
    const onSecret = () => { unlockSecretBonus(); manager.open("games"); window.setTimeout(() => window.dispatchEvent(new Event(ARCADE_BONUS_EVENT)), 60); };
    window.addEventListener(SECRET_EVENT, onSecret);
    return () => window.removeEventListener(SECRET_EVENT, onSecret);
  }, [manager.open]); // One initial window per completed boot.
  const clock = time?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "--:--:--";
  return <main className={`desktop-shell ${customCursor ? "custom-cursor" : ""}`}>
    <StatusBar time={time} clock={clock} />
    <div className="desktop-workspace" ref={workspaceRef} onContextMenu={event => { if ((event.target as HTMLElement).closest(".app-window")) return; event.preventDefault(); const rect = workspaceRef.current?.getBoundingClientRect(); setMenu({ x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }); }} onClick={() => setMenu(null)}>
      <div className="desktop-wallpaper" aria-hidden="true"><div className="wallpaper-cross cross-top" /><div className="wallpaper-cross cross-bottom" /><div className="wallpaper-identity"><div className="wallpaper-eyebrow"><span /> PERSONAL COMPUTING. REDEFINED.</div><div className="wallpaper-word">NEXUS<span>://OS</span></div><div className="wallpaper-bottom"><span>YOUR SYSTEM. YOUR RULES.</span><span>EST. 2026 — V.1.0</span></div></div><div className="wallpaper-wire"><svg viewBox="0 0 400 400" fill="none"><path d="M200 20 360 110v180L200 380 40 290V110L200 20Z M200 60 325 130v140L200 340 75 270V130L200 60Z M200 100 290 150v100l-90 50-90-50V150l90-50Z M200 140 255 170v60l-55 30-55-30v-60l55-30Z M200 20v120M360 110l-105 60M360 290l-105-60M200 380V260M40 290l105-60M40 110l105 60" /></svg></div><div className="wallpaper-coordinate">NX—01 / LOCAL ENVIRONMENT</div></div>
      <nav className={`desktop-shortcuts ${arrangeMode ? "is-arranging" : ""}`} aria-label="Desktop applications">{apps.map(app => <DesktopIcon key={app.id} id={app.id} cell={layout[app.id] ?? { col: 0, row: 0 }} arrange={arrangeMode} onDrop={(id, x, y) => { const cell = freeCell(cellFor(x, y, manager.bounds), takenCells(id), manager.bounds); saveLayout({ ...layout, [id]: cell }); }} />)}</nav>
      <div className="workspace-label"><span className="status-dot" /> WORKSPACE 01 <span>/</span> <span>LOCAL</span><Button variant="system" size="icon" className="arrange-toggle" title={arrangeMode ? "Lock shortcut positions" : "Arrange shortcuts"} aria-label={arrangeMode ? "Lock shortcut positions" : "Arrange shortcuts"} aria-pressed={arrangeMode} onClick={() => setArrangeMode(v => !v)}><LayoutGrid /></Button>{arrangeMode && <span className="arrange-hint">ARRANGE MODE — DRAG ICONS</span>}</div>
      {menu && <div className="desktop-menu" role="menu" style={{ left: menu.x, top: menu.y }} onClick={event => event.stopPropagation()}>
        <Button variant="system" role="menuitem" onClick={() => { alignToGrid(); setMenu(null); }}>Align to Grid</Button>
        <Button variant="system" role="menuitem" onClick={() => { autoArrange(); setMenu(null); }}>Auto Arrange</Button>
        <Button variant="system" role="menuitem" onClick={() => { resetLayout(); setMenu(null); }}>Reset Layout</Button>
        <Button variant="system" role="menuitem" aria-pressed={arrangeMode} onClick={() => { setArrangeMode(v => !v); setMenu(null); }}>{arrangeMode ? "Lock Shortcuts" : "Arrange Shortcuts"}</Button>
      </div>}
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
export function DesktopIcon({ id, cell, arrange, onDrop }: { id: AppId; cell: IconCell; arrange: boolean; onDrop: (id: AppId, x: number, y: number) => void }) {
  const manager = useWindowManager();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const app = apps.find(a => a.id === id);
  if (!app) return null;
  const Icon = app.icon;
  const x = GRID.x + cell.col * GRID.w, y = GRID.y + cell.row * GRID.h;
  const pos = drag ?? { x, y };
  return <Button variant="shortcut" className={`desktop-icon ${drag ? "is-dragging" : ""}`} style={{ position: "absolute", left: pos.x, top: pos.y }} aria-label={`Open ${app.name}`}
    onPointerDown={event => { if (!arrange || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); start.current = { px: event.clientX, py: event.clientY, x, y, moved: false }; }}
    onPointerMove={event => { const s = start.current; if (!s) return; const dx = event.clientX - s.px, dy = event.clientY - s.py; if (!s.moved && Math.hypot(dx, dy) < 4) return; s.moved = true; setDrag({ x: s.x + dx, y: s.y + dy }); }}
    onPointerUp={() => { const s = start.current; start.current = null; if (s?.moved && drag) onDrop(id, drag.x, drag.y); setDrag(null); }}
    onPointerCancel={() => { start.current = null; setDrag(null); }}
    onClick={() => { if (!arrange) manager.open(id); }}
    onDoubleClick={() => { if (arrange) manager.open(id); }}><span className="shortcut-icon"><Icon /><span className="shortcut-number">{app.code}</span></span><span className="shortcut-name">{app.name}</span></Button>;
}
export function Taskbar({ clock, showStatus, toggleStatus }: { clock: string; showStatus: boolean; toggleStatus: () => void }) {
  const manager = useWindowManager();
  return <footer className="taskbar"><div className="taskbar-left"><Button variant="system" size="icon" aria-label="Open Terminal from launcher" title="Terminal launcher" className="launcher-button" onClick={() => manager.open("terminal")}><Command /></Button><span className="taskbar-separator" /><div className="taskbar-apps">{apps.map(app => { const running = manager.windows.some(w => w.id === app.id); const Icon = app.icon; return <Button key={app.id} variant="task" className="taskbar-app" aria-label={`Show ${app.name}`} title={app.name} data-running={running} data-active={manager.active === app.id} onClick={() => manager.open(app.id)}><Icon />{running && <span className="running-indicator" />}</Button>; })}</div></div><div className="taskbar-center"><span className="status-dot" /> {String(manager.windows.length).padStart(2, "0")} PROCESSES <span>/</span> WORKSPACE 01</div><div className="taskbar-right"><Button variant="system" size="icon" title="Toggle simulated system status" aria-label="Toggle simulated system status" aria-pressed={showStatus} onClick={toggleStatus}><Activity /></Button><Wifi size={15} /><span className="taskbar-separator" /><div className="taskbar-clock"><time>{clock.slice(0, 5)}</time><span>LOCAL TIME</span></div></div></footer>;
}