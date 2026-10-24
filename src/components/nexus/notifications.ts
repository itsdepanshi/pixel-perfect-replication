import type { AppId } from "./registry";

export type NexusNotification = { id: string; title: string; body: string; kind: "info" | "success" | "warning"; app?: AppId; path?: string; time: number; read: boolean };
export const NOTIFY_KEY = "nexus-notifications";
export const NOTIFY_EVENT = "nexus:notifications";
export const NOTIFY_LIMIT = 100;

/** Pure: newest first, capped so history never grows without bound. */
export function addTo(list: NexusNotification[], item: NexusNotification) { return [item, ...list].slice(0, NOTIFY_LIMIT); }
export function markRead(list: NexusNotification[], id?: string) { return list.map(n => (id === undefined || n.id === id ? { ...n, read: true } : n)); }
export function dismiss(list: NexusNotification[], id: string) { return list.filter(n => n.id !== id); }
export function unreadCount(list: NexusNotification[]) { return list.filter(n => !n.read).length; }

export function readNotifications(): NexusNotification[] {
  try { const v = JSON.parse(localStorage.getItem(NOTIFY_KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeNotifications(list: NexusNotification[]) {
  try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(list)); } catch { /* private mode */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIFY_EVENT));
}
/** Record a completed real event. Safe to call during SSR (no-op). */
export function notify(input: Omit<NexusNotification, "id" | "time" | "read">) {
  if (typeof window === "undefined") return;
  writeNotifications(addTo(readNotifications(), { ...input, id: crypto.randomUUID(), time: Date.now(), read: false }));
}
