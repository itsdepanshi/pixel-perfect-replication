import { useState } from "react";
import { Activity, Search, ArrowUpRight, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apps } from "./registry";
import { useWindowManager } from "./window-manager";

export function TaskManagerApp() {
  const manager = useWindowManager();
  const [query, setQuery] = useState("");
  const rows = manager.windows.filter(w => apps.find(a => a.id === w.id)?.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="app-preview task-manager-app">
    <div className="preview-heading"><Activity size={28} /><div><p>LIVE NEXUS WINDOWS</p><h2>Task Manager</h2></div><span className="phase-label">{manager.windows.length} OPEN</span></div>
    <h3 className="enhancement-heading">Processes</h3>
    <label className="local-search"><Search size={14} /><input aria-label="Search processes" placeholder="Search processes…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="process-list">{rows.map(w => { const app = apps.find(a => a.id === w.id); if (!app) return null; return <div className="process-row" key={w.id} data-process={w.id}><app.icon size={18} /><div><strong>{app.name}</strong><small>{w.minimized ? "Minimized" : manager.active === w.id ? "Active" : "Open"}{w.maximized ? " · Maximized" : ""}</small></div><Button variant="system" size="icon" title={`Switch to ${app.name}`} aria-label={`Switch to ${app.name}`} onClick={() => manager.open(w.id)}><ArrowUpRight /></Button><Button variant="system" size="icon" disabled={w.minimized} title={`Minimize process ${app.name}`} aria-label={`Minimize process ${app.name}`} onClick={() => manager.minimize(w.id)}><Minus /></Button><Button variant="system" size="icon" title={`Close process ${app.name}`} aria-label={`Close process ${app.name}`} onClick={() => manager.close(w.id)}><X /></Button></div>; })}{!rows.length && <p className="list-empty">No matching processes</p>}</div>
    <p className="shortcut-platform-note">NEXUS application windows only. Browser and operating-system processes are unavailable. Per-app CPU and memory are not exposed by this browser; no resource estimates are shown.</p>
  </div>;
}