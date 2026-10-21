import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { apps, type AppId } from "./registry";
import { useWindowManager } from "./window-manager";
import { readFilesystem, subscribeFilesystem, type VirtualFile } from "./virtual-filesystem";
import { BINDINGS_KEY, shortcuts, bindingFor, bindingConflict, eventBinding, findShortcut, nextWindow, parseBindings, validBinding, type Bindings } from "./shortcut-logic";

type Handler = (id: string) => boolean;
type Panel = "launcher" | "palette" | "help" | null;
type System = { bindings: Bindings; panel: Panel; show: (panel: Panel) => void; register: (app: AppId, handler: Handler) => () => void; setBinding: (id: string, value: string) => string | null; reset: () => void; run: (id: string) => boolean };
const Context = createContext<System | null>(null);
export function useShortcuts() { const value = useContext(Context); if (!value) throw new Error("Shortcut system is not mounted"); return value; }
export function useAppShortcuts(app: AppId, handler: Handler) {
  const { register } = useShortcuts(); const latest = useRef(handler); latest.current = handler;
  useEffect(() => register(app, id => latest.current(id)), [app, register]);
}
export function ShortcutSystem({ children }: { children: ReactNode }) {
  const manager = useWindowManager(); const [bindings, setBindings] = useState<Bindings>({}); const [panel, show] = useState<Panel>(null);
  const handlers = useRef(new Map<AppId, Handler>());
  const register = useRef((app: AppId, handler: Handler) => { handlers.current.set(app, handler); return () => { if (handlers.current.get(app) === handler) handlers.current.delete(app); }; }).current;
  useEffect(() => { try { setBindings(parseBindings(localStorage.getItem(BINDINGS_KEY))); } catch { setBindings({}); } const sync = (e: StorageEvent) => { if (e.key === BINDINGS_KEY) setBindings(parseBindings(e.newValue)); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  function persist(next: Bindings) { try { localStorage.setItem(BINDINGS_KEY, JSON.stringify(next)); setBindings(next); return null; } catch { return "Bindings could not be saved on this device."; } }
  function run(id: string) {
    if (["terminal", "files", "settings"].includes(id)) { const app = apps.find(a => a.id === id); if (app) manager.open(app.id); return true; }
    if (id === "launcher" || id === "palette" || id === "help") { show(id); return true; }
    if (id === "switch") { const next = nextWindow(manager.windows, manager.active); if (!next) return false; manager.focus(next); return true; }
    if (!manager.active) return false;
    if (id === "close") { manager.close(manager.active); return true; }
    if (id === "maximize") { manager.maximize(manager.active); return true; }
    if (id === "minimize") { manager.minimize(manager.active); return true; }
    return handlers.current.get(manager.active)?.(id) ?? false;
  }
  const latest = useRef({ manager, bindings, panel, run }); latest.current = { manager, bindings, panel, run };
  useEffect(() => {
    let metaSolo = false;
    const dispatch = (event: KeyboardEvent, binding: string) => {
      const state = latest.current; const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = !!target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
      const editor = !!target?.closest(".note-title, .note-body");
      const modal = !!state.panel || Array.from(document.querySelectorAll<HTMLElement>("[role='dialog'], [role='alertdialog'], .local-confirm-overlay, .boot-screen, [aria-busy='true']")).some(element => element.getClientRects().length > 0);
      const shortcut = findShortcut(binding, state.bindings, state.manager.active, typing, editor, modal);
      if (shortcut && state.run(shortcut.id)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const down = (event: KeyboardEvent) => { if (event.defaultPrevented || event.isComposing || event.repeat || document.hidden) return; if (event.key === "Meta") { metaSolo = true; return; } metaSolo = false; dispatch(event, eventBinding(event)); };
    const up = (event: KeyboardEvent) => { if (event.key === "Meta" && metaSolo) dispatch(event, "Meta"); metaSolo = false; };
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, []);
  useEffect(() => { const element = document.activeElement; if (element instanceof HTMLElement && element.closest(".app-window")?.getAttribute("data-app-id") !== manager.active) element.blur(); }, [manager.active]);
  const system: System = { bindings, panel, show, register, run, reset: () => { persist({}); }, setBinding: (id, value) => { if (!validBinding(value)) return "Choose a key or a key with modifiers."; const conflict = bindingConflict(id, value, bindings); if (conflict) return conflict; return persist({ ...bindings, [id]: value }); } };
  return <Context.Provider value={system}>{children}<ShortcutPanel /></Context.Provider>;
}
export function KeyboardSettings({ editable = true }: { editable?: boolean }) {
  const system = useShortcuts(); const [query, setQuery] = useState(""); const [category, setCategory] = useState("All"); const [recording, setRecording] = useState<string | null>(null); const [error, setError] = useState("");
  return <section className="keyboard-settings">
    <header><h2><Keyboard size={16} /> Keyboard Shortcuts</h2>{editable && <Button variant="system" size="icon" title="Reset shortcuts to defaults" aria-label="Reset shortcuts to defaults" onClick={() => { system.reset(); setRecording(null); setError(""); }}><RotateCcw /></Button>}</header>
    <div className="shortcut-filters"><label className="local-search"><Search size={14} /><input aria-label="Search keyboard shortcuts" placeholder="Search shortcuts…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Shortcut category" value={category} onChange={e => setCategory(e.target.value)}>{["All", ...new Set(shortcuts.map(s => s.category))].map(c => <option key={c}>{c}</option>)}</select></div>
    {error && <p role="alert" className="local-error">{error}</p>}
    <div className="shortcut-rows">{shortcuts.filter(s => (category === "All" || s.category === category) && `${s.label} ${s.category} ${bindingFor(s, system.bindings)}`.toLowerCase().includes(query.toLowerCase())).map(s => <div className="shortcut-row" key={s.id}><span><strong>{s.label}</strong><small>{s.category}{s.alternate ? ` · Alternate: ${s.alternate.replaceAll("Meta", "Win / Cmd")}` : ""}</small></span>{editable ? <input aria-label={`Binding for ${s.label}`} className="binding-input" readOnly value={recording === s.id ? "Press keys…" : bindingFor(s, system.bindings).replaceAll("Meta", "Win / Cmd")} onFocus={() => { setRecording(s.id); setError(""); }} onBlur={() => setRecording(null)} onKeyDown={event => { event.preventDefault(); event.stopPropagation(); if (event.nativeEvent.isComposing || event.repeat) return; if (event.key === "Escape") { event.currentTarget.blur(); return; } const value = eventBinding(event.nativeEvent); if (!value) return; const problem = system.setBinding(s.id, value); setError(problem ?? ""); if (!problem) event.currentTarget.blur(); }} /> : <kbd>{bindingFor(s, system.bindings).replaceAll("Meta", "Win / Cmd")}</kbd>}</div>)}</div>
    <small className="shortcut-platform-note">Win / Cmd keys may be reserved by your operating system. Alternate bindings remain available.</small>
  </section>;
}
function ShortcutPanel() {
  const system = useShortcuts(); const manager = useWindowManager(); const [query, setQuery] = useState(""); const [files, setFiles] = useState<VirtualFile[]>([]); const [error, setError] = useState("");
  useEffect(() => { setQuery(""); setError(""); if (system.panel !== "palette") return; let alive = true; const refresh = () => { void readFilesystem().then(rows => { if (alive) setFiles(rows); }).catch(() => { if (alive) setError("Files could not be read."); }); }; refresh(); const off = subscribeFilesystem(refresh); return () => { alive = false; off(); }; }, [system.panel]);
  const matches = (text: string) => text.toLowerCase().includes(query.toLowerCase());
  const finish = (action: () => void) => { system.show(null); action(); };
  return <Dialog open={!!system.panel} onOpenChange={open => { if (!open) system.show(null); }}><DialogContent className="nexus-shortcut-dialog" aria-describedby={undefined}><DialogTitle>{system.panel === "help" ? "NEXUS // KEYBOARD" : system.panel === "launcher" ? "NEXUS // APPLICATIONS" : "NEXUS // COMMANDS"}</DialogTitle>
    {system.panel === "help" ? <KeyboardSettings editable={false} /> : <><label className="local-search"><Search size={16} /><input autoFocus aria-label="Search apps files and actions" placeholder={system.panel === "launcher" ? "Search applications…" : "Search apps, files and actions…"} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); document.querySelector<HTMLButtonElement>(".command-results button")?.focus(); } if (e.key === "Enter") document.querySelector<HTMLButtonElement>(".command-results button")?.click(); }} /></label><div className="command-results" onKeyDown={e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus(); e.preventDefault(); }}>
    {apps.filter(a => matches(a.name)).map(a => <Button variant="system" key={a.id} onClick={() => finish(() => manager.open(a.id))}><a.icon size={16} /><span>{a.name}</span><small>APPLICATION</small></Button>)}
    {system.panel === "palette" && files.filter(f => matches(`${f.name} ${f.folder}`)).map(f => <Button variant="system" key={f.id} onClick={() => finish(() => f.kind === "project" ? manager.openProject(f.id) : manager.openFilesAt(f.folder))}><span>{f.name}</span><small>{f.folder}</small></Button>)}
    {system.panel === "palette" && shortcuts.filter(s => !["terminal", "files", "settings", "palette"].includes(s.id) && matches(s.label) && findShortcut(bindingFor(s, system.bindings), system.bindings, manager.active)?.id === s.id).map(s => <Button variant="system" key={s.id} onClick={() => finish(() => { system.run(s.id); })}><span>{s.label}</span><kbd>{bindingFor(s, system.bindings).replaceAll("Meta", "Win / Cmd")}</kbd></Button>)}
    </div>{error && <p role="alert">{error}</p>}</>}
  </DialogContent></Dialog>;
}