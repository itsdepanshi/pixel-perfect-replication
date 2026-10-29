import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, ChevronRight, Command, Cpu, HardDrive, LayoutGrid, Lock, Search, ShieldCheck, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apps, type AppId } from "./registry";
import { WindowManager, useWindowManager } from "./window-manager";
import { AppWindow } from "./app-window";
import { SECRET_EVENT } from "./terminal-commands";
import { unlockSecretBonus } from "./arcade/progression";
import { ARCADE_BONUS_EVENT } from "./arcade/arcade-app";
import { CURSOR_EVENT, readCursorPreference } from "./settings-app";
import { ShortcutSystem, useShortcuts } from "./shortcut-system";
import { ContextMenu, ownsContextMenu, type MenuItem } from "./desktop-context-menu";
import { createFolder, readDirectories, readFilesystem } from "./virtual-filesystem";
import { writeRecord } from "./local-storage";
import { notify } from "./notifications";
import { DesktopWidgets, LockScreen, NotificationButton, NotificationCenter, toggleWidget, useProfile, useWidgets, widgetNames } from "./desktop-enhancements";
import { useAppearance, useWallpaperUrl } from "./appearance";
import nexusMark from "@/assets/nexus-mark.png";

type IconCell = { col: number; row: number };
const GRID = { x: 22, y: 30, w: 96, h: 104 };
const LAYOUT_KEY = "nexus-icon-layout";
const LABELS_KEY = "nexus-icon-labels";
function readLabels(): Record<string, string> { try { const v = JSON.parse(localStorage.getItem(LABELS_KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function defaultLayout(): Record<string, IconCell> { return Object.fromEntries(apps.map((app, i) => [app.id, { col: Math.floor(i / 6), row: i % 6 }])); }
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
  return <WindowManager><ShortcutSystem><Desktop /></ShortcutSystem></WindowManager>;
}
function Desktop() {
  const manager = useWindowManager();
  const { appearance } = useAppearance();
  const wallpaperUrl = useWallpaperUrl(appearance.wallpaper);
  useEffect(() => {
    document.documentElement.dataset["nexusTheme"] = appearance.theme;
    return () => { delete document.documentElement.dataset["nexusTheme"]; };
  }, [appearance.theme]);
  const [booting, setBooting] = useState(true);
  const [time, setTime] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState(true);
  const [customCursor, setCustomCursor] = useState(true);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [layout, setLayout] = useState<Record<string, IconCell>>(defaultLayout);
  const [menu, setMenu] = useState<{ x: number; y: number; icon?: AppId } | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<AppId | null>(null);
  const [sync, setSync] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [locked, setLocked] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const widgets = useWidgets();
  useEffect(() => {
    setCustomCursor(readCursorPreference());
    setLayout(readLayout());
    setLabels(readLabels());
    const onCursor = () => setCustomCursor(readCursorPreference());
    window.addEventListener(CURSOR_EVENT, onCursor);
    return () => window.removeEventListener(CURSOR_EVENT, onCursor);
  }, []);
  const saveLayout = (next: Record<string, IconCell>) => { setLayout(next); try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* private mode */ } };
  const takenCells = (except?: AppId) => new Set(apps.filter(a => a.id !== except).map(a => { const c = layout[a.id] ?? { col: 0, row: 0 }; return `${c.col},${c.row}`; }));
  const alignToGrid = () => { const next = { ...layout }; const taken = new Set<string>(); for (const app of apps) { const current = next[app.id] ?? { col: 0, row: 0 }; const cell = freeCell(cellFor(GRID.x + current.col * GRID.w, GRID.y + current.row * GRID.h, manager.bounds), taken, manager.bounds); next[app.id] = cell; taken.add(`${cell.col},${cell.row}`); } saveLayout(next); };
  const autoArrange = () => { const next = { ...layout }; const perColumn = Math.max(1, Math.floor((manager.bounds.height - GRID.y) / GRID.h)); apps.forEach((app, i) => { next[app.id] = { col: Math.floor(i / perColumn), row: i % perColumn }; }); saveLayout(next); };
  const resetLayout = () => { saveLayout(defaultLayout()); };
  const saveLabel = (id: AppId, name: string) => { const next = { ...labels }; const clean = name.trim().slice(0, 40); if (!clean || clean === apps.find(a => a.id === id)?.name) delete next[id]; else next[id] = clean; setLabels(next); try { localStorage.setItem(LABELS_KEY, JSON.stringify(next)); } catch { /* private mode */ } };
  const refreshDesktop = async () => {
    setSync("SYNCING DESKTOP…");
    setLayout(readLayout()); setLabels(readLabels()); setCustomCursor(readCursorPreference());
    try { await readDirectories(); const files = await readFilesystem(); setSync(`DESKTOP SYNCED · ${files.length} FILES`); } catch { setSync("SYNC FAILED — STORAGE UNAVAILABLE"); }
    window.setTimeout(() => setSync(null), 1800);
  };
  const newFolder = async () => {
    for (let n = 1; n < 100; n++) {
      const name = n === 1 ? "New Folder" : `New Folder ${n}`;
      try { const path = await createFolder("/home/root", name); notify({ title: "Folder created", body: path, kind: "success", app: "files", path }); manager.openFilesAt(path); return; }
      catch (error) { if (!(error instanceof Error) || !error.message.includes("already exists")) { notify({ title: "Folder not created", body: error instanceof Error ? error.message : "Storage unavailable", kind: "warning" }); return; } }
    }
  };
  const newTextFile = async () => {
    try { await writeRecord("notes", { id: crypto.randomUUID(), title: "New Text File", body: "", modified: Date.now() }); notify({ title: "Text file created", body: "New Text File in Notes", kind: "success", app: "notes" }); manager.close("notes"); window.setTimeout(() => manager.open("notes"), 0); }
    catch { notify({ title: "Text file not created", body: "Local storage is unavailable", kind: "warning" }); }
  };
  const desktopItems: MenuItem[] = [
    { label: "Refresh", action: () => void refreshDesktop() },
    { label: "Arrange Icons", items: [{ label: "Auto Arrange", action: autoArrange }, { label: "Align to Grid", action: alignToGrid }, { label: "Reset Layout", action: resetLayout }, { label: arrangeMode ? "Lock Shortcuts" : "Arrange Shortcuts", action: () => setArrangeMode(v => !v) }] },
    { label: "New", items: [{ label: "New Folder", action: () => void newFolder() }, { label: "New Text File", action: () => void newTextFile() }] },
    ...(widgets ? [{ label: "Widgets", items: (Object.keys(widgetNames) as (keyof typeof widgetNames)[]).map(id => ({ label: `${widgets[id].on ? "Hide" : "Show"} ${widgetNames[id]}`, action: () => toggleWidget(id) })) }] : []),
    { label: "Personalize", action: () => manager.open("settings") },
    { label: "Open Terminal", action: () => manager.open("terminal") },
    { label: "Display Settings", action: () => manager.open("settings") },
  ];
  const iconItems = (id: AppId): MenuItem[] => [
    { label: "Open", action: () => manager.open(id) },
    { label: "Rename", action: () => setRenaming(id) },
    { label: "Create Shortcut", disabled: true, hint: "System apps already have their desktop shortcut" },
    { label: "Move to Recycle Bin", disabled: true, hint: "System apps cannot be deleted" },
  ];
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
    <div className="desktop-workspace" ref={workspaceRef} onContextMenu={event => { if (ownsContextMenu(event.target)) return; event.preventDefault(); const rect = workspaceRef.current?.getBoundingClientRect(); setMenu({ x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }); }}>
      {wallpaperUrl && <img className="desktop-user-wallpaper" data-fit={appearance.fit} src={wallpaperUrl} alt="" aria-hidden="true" />}
      <div className="desktop-wallpaper" aria-hidden="true"><div className="wallpaper-cross cross-top" /><div className="wallpaper-cross cross-bottom" /><div className="wallpaper-identity"><div className="wallpaper-eyebrow"><span /> PERSONAL COMPUTING. REDEFINED.</div><div className="wallpaper-word">NEXUS<span>://OS</span></div><div className="wallpaper-bottom"><span>YOUR SYSTEM. YOUR RULES.</span><span>EST. 2026 — V.1.0</span></div></div><div className="wallpaper-wire"><svg viewBox="0 0 400 400" fill="none"><path d="M200 20 360 110v180L200 380 40 290V110L200 20Z M200 60 325 130v140L200 340 75 270V130L200 60Z M200 100 290 150v100l-90 50-90-50V150l90-50Z M200 140 255 170v60l-55 30-55-30v-60l55-30Z M200 20v120M360 110l-105 60M360 290l-105-60M200 380V260M40 290l105-60M40 110l105 60" /></svg></div><div className="wallpaper-coordinate">NX—01 / LOCAL ENVIRONMENT</div></div>
      <nav className={`desktop-shortcuts ${arrangeMode ? "is-arranging" : ""}`} aria-label="Desktop applications">{apps.map(app => <DesktopIcon key={app.id} id={app.id} label={labels[app.id] ?? app.name} renaming={renaming === app.id} onRename={name => { if (name !== null) saveLabel(app.id, name); setRenaming(null); }} onMenu={(x, y) => { const rect = workspaceRef.current?.getBoundingClientRect(); setMenu({ x: x - (rect?.left ?? 0), y: y - (rect?.top ?? 0), icon: app.id }); }} cell={layout[app.id] ?? { col: 0, row: 0 }} arrange={arrangeMode} onDrop={(id, x, y) => { const cell = freeCell(cellFor(x, y, manager.bounds), takenCells(id), manager.bounds); saveLayout({ ...layout, [id]: cell }); }} />)}</nav>
      <div className="workspace-label"><span className="status-dot" /> WORKSPACE 01 <span>/</span> <span>LOCAL</span><Button variant="system" size="icon" className="arrange-toggle" title={arrangeMode ? "Lock shortcut positions" : "Arrange shortcuts"} aria-label={arrangeMode ? "Lock shortcut positions" : "Arrange shortcuts"} aria-pressed={arrangeMode} onClick={() => setArrangeMode(v => !v)}><LayoutGrid /></Button>{arrangeMode && <span className="arrange-hint">ARRANGE MODE — DRAG ICONS</span>}</div>
      {menu && <ContextMenu key={`${menu.x},${menu.y},${menu.icon ?? ""}`} x={menu.x} y={menu.y} label={menu.icon ? `${labels[menu.icon] ?? apps.find(a => a.id === menu.icon)?.name} options` : "Desktop options"} items={menu.icon ? iconItems(menu.icon) : desktopItems} onClose={() => setMenu(null)} />}
      {sync && <div className="desktop-sync" role="status"><span className="status-dot" /> {sync}</div>}
      {showStatus && <aside className="system-status" aria-label="Simulated system status"><div className="system-status-heading"><span><Activity size={12} /> SYSTEM TELEMETRY</span><Button variant="system" size="icon" aria-label="Hide system status" title="Hide system status" onClick={() => setShowStatus(false)}><X /></Button></div><div className="metric"><span><Cpu size={12} /> CPU</span><div className="metric-track"><i /></div><span>12%</span></div><div className="metric memory"><span><HardDrive size={12} /> MEM</span><div className="metric-track"><i /></div><span>2.4 / 8 GB</span></div><p>SIMULATED METRICS <span>●</span></p></aside>}
      <DesktopWidgets time={time} />
      {notifyOpen && <NotificationCenter onClose={() => setNotifyOpen(false)} />}
      {manager.windows.map(w => <AppWindow key={w.id} window={w} />)}
      <div className="desktop-bottom-label"><span><ShieldCheck size={12} /> ISOLATED & SECURE</span><span>NEXUS KERNEL / 1.0.0 <ArrowUpRight size={11} /></span></div>
    </div>
    <Taskbar clock={clock} showStatus={showStatus} toggleStatus={() => setShowStatus(v => !v)} notifyOpen={notifyOpen} toggleNotify={() => setNotifyOpen(v => !v)} lock={() => { setNotifyOpen(false); setLocked(true); }} />
    {locked && <LockScreen clock={clock} onUnlock={() => setLocked(false)} />}
    {booting && <div className="boot-screen"><div className="boot-content"><div className="boot-logo"><img className="boot-mark" src={nexusMark} alt="" /><span>NEXUS<span>://OS</span></span></div><p className="boot-version">BOOT SEQUENCE / KERNEL 1.0.0</p><div className="boot-lines"><p>[ OK ] Initializing isolated environment</p><p>[ OK ] Mounting virtual filesystem</p><p>[ OK ] Loading desktop services</p><p>[ OK ] Welcome to NEXUS OS<span className="boot-cursor">_</span></p></div><Button variant="system" onClick={() => setBooting(false)}>Skip boot <ChevronRight /></Button></div><span className="boot-footer">LOCAL FIRST. ALWAYS.</span></div>}
  </main>;
}
export function StatusBar({ time, clock }: { time: Date | null; clock: string }) {
  const profile = useProfile();
  return <header className="status-bar"><div className="brand"><img className="brand-mark" src={nexusMark} alt="" /><span>NEXUS<span>://OS</span></span><span className="version-badge">1.0</span></div><div className="session-status"><span className="status-dot" /> SYSTEM ONLINE <span className="status-divider">/</span><span className="session-user">{profile.name}@nexus</span></div><div className="top-right"><span className="local-status"><Wifi size={13} /> LOCAL SESSION</span><span className="top-date">{time?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() ?? "—"}</span><time>{clock}</time></div></header>;
}
export function DesktopIcon({ id, label, renaming, onRename, onMenu, cell, arrange, onDrop }: { id: AppId; label: string; renaming: boolean; onRename: (name: string | null) => void; onMenu: (x: number, y: number) => void; cell: IconCell; arrange: boolean; onDrop: (id: AppId, x: number, y: number) => void }) {
  const manager = useWindowManager();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const app = apps.find(a => a.id === id);
  if (!app) return null;
  const Icon = app.icon;
  const x = GRID.x + cell.col * GRID.w, y = GRID.y + cell.row * GRID.h;
  const pos = drag ?? { x, y };
  if (renaming) return <div className="desktop-icon is-renaming" style={{ position: "absolute", left: pos.x, top: pos.y }}><span className="shortcut-icon"><Icon /><span className="shortcut-number">{app.code}</span></span><input className="icon-rename" aria-label={`Rename ${label}`} defaultValue={label} maxLength={40} autoFocus onFocus={e => e.currentTarget.select()} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") onRename(e.currentTarget.value); if (e.key === "Escape") onRename(null); }} onBlur={e => onRename(e.currentTarget.value)} /></div>;
  return <Button variant="shortcut" className={`desktop-icon ${drag ? "is-dragging" : ""}`} style={{ position: "absolute", left: pos.x, top: pos.y }} aria-label={`Open ${label}`}
    onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onMenu(event.clientX, event.clientY); }}
    onPointerDown={event => { if (!arrange || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); start.current = { px: event.clientX, py: event.clientY, x, y, moved: false }; }}
    onPointerMove={event => { const s = start.current; if (!s) return; const dx = event.clientX - s.px, dy = event.clientY - s.py; if (!s.moved && Math.hypot(dx, dy) < 4) return; s.moved = true; setDrag({ x: s.x + dx, y: s.y + dy }); }}
    onPointerUp={() => { const s = start.current; start.current = null; if (s?.moved && drag) onDrop(id, drag.x, drag.y); setDrag(null); }}
    onPointerCancel={() => { start.current = null; setDrag(null); }}
    onClick={() => { if (!arrange) manager.open(id); }}
    onDoubleClick={() => { if (arrange) manager.open(id); }}><span className="shortcut-icon"><Icon /><span className="shortcut-number">{app.code}</span></span><span className="shortcut-name">{label}</span></Button>;
}
export function Taskbar({ clock, showStatus, toggleStatus, notifyOpen, toggleNotify, lock }: { clock: string; showStatus: boolean; toggleStatus: () => void; notifyOpen: boolean; toggleNotify: () => void; lock: () => void }) {
  const manager = useWindowManager();
  const shortcuts = useShortcuts();
  return <footer className="taskbar"><div className="taskbar-left"><Button variant="system" size="icon" aria-label="Open app launcher" title="App launcher" className="launcher-button" onClick={() => shortcuts.show("launcher")}><Command /></Button><Button variant="system" size="icon" aria-label="Open Command Palette" title="Command Palette (Alt+Space; availability depends on browser / OS)" onClick={() => shortcuts.show("palette")}><Search /></Button><span className="taskbar-separator" /><div className="taskbar-apps">{apps.filter(app => manager.windows.some(w => w.id === app.id)).map(app => { const running = true; const Icon = app.icon; return <Button key={app.id} variant="task" className="taskbar-app" aria-label={`Show ${app.name}`} title={app.name} data-running={running} data-active={manager.active === app.id} onClick={() => manager.open(app.id)}><Icon />{running && <span className="running-indicator" />}</Button>; })}</div></div><div className="taskbar-right"><NotificationButton open={notifyOpen} onToggle={toggleNotify} /><Button variant="system" size="icon" aria-label="Lock screen" title="Lock screen" onClick={lock}><Lock /></Button><Button variant="system" size="icon" title="Toggle simulated system status" aria-label="Toggle simulated system status" aria-pressed={showStatus} onClick={toggleStatus}><Activity /></Button><span className="taskbar-separator" /><div className="taskbar-clock"><time>{clock.slice(0, 5)}</time><span>LOCAL TIME</span></div></div></footer>;
}