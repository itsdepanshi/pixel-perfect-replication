import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bell, CheckCheck, Clock3, FileText, HardDrive, Lock, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismiss, markRead, NOTIFY_EVENT, readNotifications, unreadCount, writeNotifications, type NexusNotification } from "./notifications";
import { useWindowManager } from "./window-manager";
import { readAll, subscribeLibrary, type Note } from "./local-storage";
import { readFilesystem } from "./virtual-filesystem";

/* ---------- Notifications ---------- */
export function useNotifications() {
  const [list, setList] = useState<NexusNotification[]>([]);
  useEffect(() => {
    const load = () => setList(readNotifications());
    load(); window.addEventListener(NOTIFY_EVENT, load); window.addEventListener("storage", load);
    return () => { window.removeEventListener(NOTIFY_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  return list;
}
function ago(time: number) {
  const s = Math.round((Date.now() - time) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(time).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
export function NotificationButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const unread = unreadCount(useNotifications());
  return <Button variant="system" size="icon" className="notify-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} title="Notification Center" aria-expanded={open} onClick={onToggle}><Bell />{unread > 0 && <span className="notify-badge">{unread > 9 ? "9+" : unread}</span>}</Button>;
}
export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const list = useNotifications();
  const manager = useWindowManager();
  const go = (n: NexusNotification) => {
    writeNotifications(markRead(readNotifications(), n.id));
    if (n.path) manager.openFilesAt(n.path); else if (n.app) manager.open(n.app);
    if (n.app || n.path) onClose();
  };
  return <aside className="notify-center" role="dialog" aria-label="Notification Center">
    <div className="notify-head"><span><Bell size={13} /> NOTIFICATIONS</span><Button variant="system" size="icon" aria-label="Close notifications" onClick={onClose}><X /></Button></div>
    <div className="notify-actions"><Button variant="system" size="sm" disabled={!unreadCount(list)} onClick={() => writeNotifications(markRead(readNotifications()))}><CheckCheck /> Mark all read</Button><Button variant="system" size="sm" disabled={!list.length} onClick={() => writeNotifications([])}><Trash2 /> Clear all</Button></div>
    <div className="notify-list">{list.length === 0 && <p className="list-empty">No notifications yet. Saves, exports, downloads and file actions appear here.</p>}
      {list.map(n => <div key={n.id} className="notify-item" data-kind={n.kind} data-read={n.read}>
        <button type="button" className="notify-body" onClick={() => go(n)}><strong>{n.title}</strong><span>{n.body}</span><small>{ago(n.time)}{!n.read && " · NEW"}</small></button>
        <div className="notify-item-actions">{!n.read && <Button variant="system" size="icon" aria-label={`Mark ${n.title} read`} title="Mark read" onClick={() => writeNotifications(markRead(readNotifications(), n.id))}><CheckCheck /></Button>}<Button variant="system" size="icon" aria-label={`Dismiss ${n.title}`} title="Dismiss" onClick={() => writeNotifications(dismiss(readNotifications(), n.id))}><X /></Button></div>
      </div>)}
    </div>
  </aside>;
}

/* ---------- Profile & lock ---------- */
export type Profile = { name: string; pinHash: string | null };
const PROFILE_KEY = "nexus-profile";
export const PROFILE_EVENT = "nexus:profile";
export function readProfile(): Profile {
  try { const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); if (p && typeof p.name === "string") return { name: p.name, pinHash: p.pinHash ?? null }; } catch { /* ignore */ }
  return { name: "root", pinHash: null };
}
function saveProfile(p: Profile) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* private */ } window.dispatchEvent(new Event(PROFILE_EVENT)); }
async function hashPin(pin: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`nexus:${pin}`)); return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, "0")).join(""); }
export function useProfile() {
  const [p, setP] = useState<Profile>({ name: "root", pinHash: null });
  useEffect(() => { const load = () => setP(readProfile()); load(); window.addEventListener(PROFILE_EVENT, load); return () => window.removeEventListener(PROFILE_EVENT, load); }, []);
  return p;
}
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || "NX";

export function LockScreen({ onUnlock, clock }: { onUnlock: () => void; clock: string }) {
  const profile = useProfile();
  const [pin, setPin] = useState(""); const [error, setError] = useState("");
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => { input.current?.focus(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (profile.pinHash && (await hashPin(pin)) !== profile.pinHash) { setError("Incorrect PIN"); setPin(""); return; }
    onUnlock();
  }
  return <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Locked session">
    <time className="lock-clock">{clock.slice(0, 5)}</time>
    <form className="lock-card" onSubmit={submit}>
      <span className="lock-avatar">{initials(profile.name)}</span><strong>{profile.name}</strong><small>SESSION LOCKED · WINDOWS KEPT OPEN</small>
      {profile.pinHash && <input ref={input} type="password" inputMode="numeric" aria-label="PIN" placeholder="Enter PIN" value={pin} onChange={e => { setPin(e.target.value); setError(""); }} />}
      {error && <p className="lock-error" role="alert">{error}</p>}
      <Button type="submit"><Lock /> Unlock</Button>
      <p className="shortcut-platform-note">Local screen lock for this browser tab only — not account security.</p>
    </form>
  </div>;
}
export function ProfileSettings() {
  const profile = useProfile();
  const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { setName(profile.name); }, [profile.name]);
  return <div className="profile-settings"><h3 className="enhancement-heading"><User size={14} /> Profile & Lock</h3>
    <div className="profile-row"><span className="lock-avatar small">{initials(name)}</span><label>DISPLAY NAME<input aria-label="Display name" maxLength={24} value={name} onChange={e => setName(e.target.value)} /></label><Button variant="system" disabled={!name.trim() || name.trim() === profile.name} onClick={() => { saveProfile({ ...profile, name: name.trim() }); setMsg("Name saved"); }}>Save name</Button></div>
    <div className="profile-row"><label>LOCK PIN (4–8 DIGITS)<input aria-label="New PIN" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} /></label><Button variant="system" disabled={pin.length < 4} onClick={async () => { saveProfile({ ...profile, pinHash: await hashPin(pin) }); setPin(""); setMsg("PIN set"); }}>Set PIN</Button>{profile.pinHash && <Button variant="system" onClick={() => { saveProfile({ ...profile, pinHash: null }); setMsg("PIN removed"); }}>Remove PIN</Button>}</div>
    <small className="shortcut-platform-note">{msg || (profile.pinHash ? "PIN required to unlock." : "No PIN — Unlock button only.")} Stored on this device.</small>
  </div>;
}

/* ---------- Widgets ---------- */
type WidgetId = "clock" | "notes" | "storage";
type WidgetState = Record<WidgetId, { on: boolean; x: number; y: number }>;
const WIDGET_KEY = "nexus-widgets";
export const WIDGET_EVENT = "nexus:widgets";
const widgetDefaults: WidgetState = { clock: { on: true, x: 250, y: 30 }, notes: { on: true, x: 250, y: 170 }, storage: { on: false, x: 250, y: 340 } };
export const widgetNames: Record<WidgetId, string> = { clock: "Clock", notes: "Recent Notes", storage: "Storage" };
export function readWidgets(): WidgetState {
  try { const s = JSON.parse(localStorage.getItem(WIDGET_KEY) ?? "{}"); return Object.fromEntries((Object.keys(widgetDefaults) as WidgetId[]).map(k => [k, { ...widgetDefaults[k], ...(s[k] ?? {}) }])) as WidgetState; } catch { return widgetDefaults; }
}
export function writeWidgets(s: WidgetState) { try { localStorage.setItem(WIDGET_KEY, JSON.stringify(s)); } catch { /* private */ } window.dispatchEvent(new Event(WIDGET_EVENT)); }
export function toggleWidget(id: WidgetId) { const s = readWidgets(); writeWidgets({ ...s, [id]: { ...s[id], on: !s[id].on } }); }
export function useWidgets() {
  const [s, setS] = useState<WidgetState | null>(null);
  useEffect(() => { const load = () => setS(readWidgets()); load(); window.addEventListener(WIDGET_EVENT, load); return () => window.removeEventListener(WIDGET_EVENT, load); }, []);
  return s;
}
function Widget({ id, state, bounds, children, icon }: { id: WidgetId; state: WidgetState[WidgetId]; bounds: { width: number; height: number }; children: ReactNode; icon: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const clamp = (x: number, y: number) => ({ x: Math.max(0, Math.min(bounds.width - 220, x)), y: Math.max(0, Math.min(bounds.height - 120, y)) });
  const p = pos ?? clamp(state.x, state.y);
  return <section className="desktop-widget" data-widget={id} style={{ left: p.x, top: p.y }} aria-label={`${widgetNames[id]} widget`}>
    <header onPointerDown={e => { if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: p.x, y: p.y }; }}
      onPointerMove={e => { const d = drag.current; if (d) setPos(clamp(d.x + e.clientX - d.px, d.y + e.clientY - d.py)); }}
      onPointerUp={() => { if (drag.current && pos) { const s = readWidgets(); writeWidgets({ ...s, [id]: { ...s[id], ...pos } }); } drag.current = null; setPos(null); }}>
      {icon}<span>{widgetNames[id].toUpperCase()}</span><Button variant="system" size="icon" aria-label={`Hide ${widgetNames[id]} widget`} onClick={() => toggleWidget(id)}><X /></Button>
    </header>
    <div className="widget-body">{children}</div>
  </section>;
}
export function DesktopWidgets({ time }: { time: Date | null }) {
  const state = useWidgets();
  const manager = useWindowManager();
  const [notes, setNotes] = useState<Note[]>([]);
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null);
  useEffect(() => {
    const load = async () => {
      try { setNotes((await readAll<Note>("notes")).sort((a, b) => b.modified - a.modified).slice(0, 3)); } catch { setNotes([]); }
      try { const f = await readFilesystem(); setUsage({ count: f.length, bytes: f.reduce((s, x) => s + x.size, 0) }); } catch { setUsage(null); }
    };
    void load(); return subscribeLibrary(() => void load());
  }, []);
  if (!state) return null;
  return <div className="desktop-widgets">
    {state.clock.on && <Widget id="clock" state={state.clock} bounds={manager.bounds} icon={<Clock3 size={12} />}><time className="widget-time">{time?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</time><small>{time?.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" }) ?? ""}</small></Widget>}
    {state.notes.on && <Widget id="notes" state={state.notes} bounds={manager.bounds} icon={<FileText size={12} />}>{notes.length ? notes.map(n => <button type="button" key={n.id} className="widget-link" onClick={() => manager.open("notes")}>{n.title || "Untitled"}</button>) : <small>No notes yet</small>}<Button variant="system" size="sm" onClick={() => manager.open("notes")}>Open Notes</Button></Widget>}
    {state.storage.on && <Widget id="storage" state={state.storage} bounds={manager.bounds} icon={<HardDrive size={12} />}>{usage ? <><strong>{(usage.bytes / 1024).toFixed(1)} KB</strong><small>{usage.count} saved file{usage.count === 1 ? "" : "s"}</small></> : <small>Unavailable</small>}<Button variant="system" size="sm" onClick={() => manager.open("disk")}>Disk Management</Button></Widget>}
  </div>;
}
