import { Minus, Square, Copy, X, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apps } from "./registry";
import { useWindowManager, type WindowState } from "./window-manager";
import { TerminalApp } from "./terminal-app";
import { NotesApp } from "./notes-app";
import { MediaApp } from "./media-app";
import { ArcadeApp } from "./arcade/arcade-app";
import { ForgeApp } from "./forge/forge-app";
import { FilesApp } from "./files-app";
import { TrashApp } from "./trash-app";
import { DiskApp } from "./disk-app";
import { SettingsApp } from "./settings-app";

export function AppWindow({ window: w }: { window: WindowState }) {
  const manager = useWindowManager();
  const app = apps.find(a => a.id === w.id);
  if (!app) return null;
  const active = manager.active === w.id;
  const Icon = app.icon;
  return <section aria-label={`${app.name} window`} data-app-id={w.id} className={`app-window ${active ? "is-active" : ""} ${w.maximized ? "is-maximized" : ""}`} hidden={w.minimized} style={{ left: w.maximized ? 12 : w.x, top: w.maximized ? 12 : w.y, width: w.maximized ? manager.bounds.width - 24 : w.width, height: w.maximized ? manager.bounds.height - 24 : w.height, zIndex: w.z }} onPointerDown={() => manager.focus(w.id)}>
    <header className="window-titlebar" onDoubleClick={event => { if (!(event.target as HTMLElement).closest("button")) manager.maximize(w.id); }} onPointerDown={event => {
      if (w.maximized || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset['offsetX'] = String(event.clientX - w.x);
      event.currentTarget.dataset['offsetY'] = String(event.clientY - w.y);
    }} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; manager.move(w.id, event.clientX - Number(event.currentTarget.dataset['offsetX']), event.clientY - Number(event.currentTarget.dataset['offsetY'])); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
      <div className="window-title"><Icon size={15} /><span>{app.name.toLowerCase()}</span><span className="window-path">{w.id === "terminal" ? "— root@nexus: ~" : `— /${w.id}`}</span></div>
      <div className="window-controls"><Button variant="window" size="icon" title={`Minimize ${app.name}`} aria-label={`Minimize ${app.name}`} onClick={() => manager.minimize(w.id)}><Minus /></Button><Button variant="window" size="icon" title={`${w.maximized ? "Restore" : "Maximize"} ${app.name}`} aria-label={`${w.maximized ? "Restore" : "Maximize"} ${app.name}`} onClick={() => manager.maximize(w.id)}>{w.maximized ? <Copy /> : <Square />}</Button><Button variant="window" size="icon" className="close-control" title={`Close ${app.name}`} aria-label={`Close ${app.name}`} onClick={() => manager.close(w.id)}><X /></Button></div>
    </header>
    <div className="window-body">{w.id === "terminal" ? <TerminalApp active={active && !w.minimized} /> : w.id === "notes" ? <NotesApp /> : w.id === "media" ? <MediaApp /> : w.id === "games" ? <ArcadeApp suspended={!active || w.minimized} /> : w.id === "forge" ? <ForgeApp active={active && !w.minimized} /> : w.id === "files" ? <FilesApp /> : w.id === "trash" ? <TrashApp /> : w.id === "disk" ? <DiskApp /> : w.id === "settings" ? <SettingsApp /> : <AppPreview id={w.id} />}</div>
    <footer className="window-footer"><span><span className="status-dot" />{w.id === "terminal" ? "LOCAL SESSION" : w.id === "games" ? "ARCADE ONLINE" : w.id === "forge" ? "CREATIVE SESSION" : w.id === "notes" || w.id === "media" ? "LOCAL LIBRARY" : "APPLICATION PREVIEW"}</span><span>{w.id === "terminal" ? <><LockKeyhole size={10} /> BROWSER SANDBOX</> : w.id === "forge" ? "LOCAL-FIRST STUDIO" : w.id === "notes" || w.id === "media" || w.id === "games" ? "SAVED ON THIS DEVICE" : "PHASE 01"}</span></footer>
  </section>;
}
function AppPreview({ id }: { id: string }) {
  const app = apps.find(a => a.id === id);
  if (!app) return null;
  const Icon = app.icon;
  const items: Record<string, string[]> = { files: ["/home/root", "/documents", "/downloads", "/system"], notes: ["Workspace initialized", "No notes yet"], media: ["Library connected", "No media loaded"], settings: ["Environment    NEXUS OS", "Version        1.0.0", "Session        Local sandbox", "Theme          Phosphor"], games: ["Library initialized", "No games installed"] };
  return <div className="app-preview"><div className="preview-heading"><Icon size={28} /><div><p>{app.subtitle}</p><h2>{app.name}</h2></div><span className="phase-label">PHASE 01</span></div><div className="preview-list">{items[id]?.map((item, i) => <div key={item}><span>{String(i + 1).padStart(2, "0")}</span><pre>{item}</pre></div>)}</div><p className="preview-status"><span className="status-dot" /> Foundation ready <span>— application preview</span></p></div>;
}