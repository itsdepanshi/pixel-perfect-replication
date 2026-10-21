import type { AppId } from "./registry";

export type Shortcut = { id: string; label: string; category: string; scope: "global" | AppId | "editor" | "refresh"; keys: string; alternate?: string };
export const shortcuts: Shortcut[] = [
  { id: "terminal", label: "Open Terminal", category: "Applications", scope: "global", keys: "Ctrl+Alt+T" },
  { id: "files", label: "Open Files", category: "Applications", scope: "global", keys: "Meta+E", alternate: "Ctrl+Alt+E" },
  { id: "settings", label: "Open Settings", category: "Applications", scope: "global", keys: "Meta+I", alternate: "Ctrl+Alt+I" },
  { id: "launcher", label: "App launcher", category: "Desktop", scope: "global", keys: "Meta", alternate: "Ctrl+Alt+Space" },
  { id: "switch", label: "Next window", category: "Windows", scope: "global", keys: "Alt+Tab", alternate: "Ctrl+Alt+ArrowRight" },
  { id: "close", label: "Close active window", category: "Windows", scope: "global", keys: "Alt+F4", alternate: "Ctrl+Alt+W" },
  { id: "maximize", label: "Maximize / restore", category: "Windows", scope: "global", keys: "Meta+ArrowUp", alternate: "Ctrl+Alt+ArrowUp" },
  { id: "minimize", label: "Minimize", category: "Windows", scope: "global", keys: "Meta+ArrowDown", alternate: "Ctrl+Alt+ArrowDown" },
  { id: "palette", label: "Command palette", category: "Desktop", scope: "global", keys: "Ctrl+K" },
  { id: "help", label: "Keyboard shortcuts", category: "Desktop", scope: "global", keys: "Meta+/", alternate: "Ctrl+Alt+/" },
  { id: "folder", label: "New folder", category: "Files", scope: "files", keys: "Ctrl+Shift+N" },
  { id: "rename", label: "Rename selected file", category: "Files", scope: "files", keys: "F2" },
  { id: "delete", label: "Move selected file to Recycle Bin", category: "Files", scope: "files", keys: "Delete" },
  { id: "permanent", label: "Permanently delete selected file", category: "Files", scope: "files", keys: "Shift+Delete" },
  { id: "refresh", label: "Refresh current view", category: "Applications", scope: "refresh", keys: "F5" },
  { id: "save", label: "Save active document", category: "Editors", scope: "editor", keys: "Ctrl+S", alternate: "Meta+S" },
  { id: "undo", label: "Undo artwork", category: "PIXEL//FORGE", scope: "forge", keys: "Ctrl+Z", alternate: "Meta+Z" },
  { id: "redo", label: "Redo artwork", category: "PIXEL//FORGE", scope: "forge", keys: "Ctrl+Y", alternate: "Meta+Shift+Z" },
  { id: "pencil", label: "Pencil", category: "PIXEL//FORGE", scope: "forge", keys: "B" },
  { id: "brush", label: "Brush", category: "PIXEL//FORGE", scope: "forge", keys: "P" },
  { id: "eraser", label: "Eraser", category: "PIXEL//FORGE", scope: "forge", keys: "E" },
  { id: "pan", label: "Pan", category: "PIXEL//FORGE", scope: "forge", keys: "H" },
  ...([ ["line", "L"], ["rectangle", "R"], ["ellipse", "O"], ["fill", "F"], ["eyedropper", "I"], ["smaller", "["], ["larger", "]"], ["zoom-in", "="], ["zoom-out", "-"], ["fit", "0"], ["cancel", "Escape"], ["forge-help", "?"] ] as const).map(([id, keys]) => ({ id, label: id.replaceAll("-", " "), category: "PIXEL//FORGE", scope: "forge" as const, keys })),
];
export type Bindings = Record<string, string>;
export const BINDINGS_KEY = "nexus-keyboard-bindings";
export function normalizeKey(key: string) { return key === " " ? "Space" : key.length === 1 ? key.toUpperCase() : key; }
export function eventBinding(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">) {
  if (["Control", "Alt", "Shift"].includes(event.key)) return "";
  if (event.key === "Meta") return "Meta";
  // Shift-produced printable characters already encode Shift (e.g. ? or +).
  return [...(event.ctrlKey ? ["Ctrl"] : []), ...(event.altKey ? ["Alt"] : []), ...(event.shiftKey && (event.key.length !== 1 || /[a-z]/i.test(event.key)) ? ["Shift"] : []), ...(event.metaKey ? ["Meta"] : []), normalizeKey(event.key)].join("+");
}
export function bindingFor(shortcut: Shortcut, bindings: Bindings) { return bindings[shortcut.id] ?? shortcut.keys; }
export function validBinding(value: string) {
  if (value.length >= 64) return false;
  if (value === "Meta") return true;
  const parts = value.split("+"); const key = parts.pop();
  if (!key || !/^(?:Space|Arrow(?:Up|Down|Left|Right)|Escape|Tab|Delete|Backspace|Enter|F(?:[1-9]|1[0-2])|[^+\s])$/.test(key)) return false;
  const order = ["Ctrl", "Alt", "Shift", "Meta"];
  return parts.every((part, i) => order.includes(part) && (i === 0 || order.indexOf(part) > order.indexOf(parts[i - 1] ?? "")));
}
export function parseBindings(raw: string | null): Bindings {
  try { const parsed: unknown = JSON.parse(raw ?? "{}"); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}; return Object.fromEntries(Object.entries(parsed).filter(([id, value]) => shortcuts.some(s => s.id === id) && typeof value === "string" && validBinding(value))); } catch { return {}; }
}
export function eligible(shortcut: Shortcut, active: AppId | null, typing: boolean, editor: boolean, modal: boolean) {
  if (modal || (typing && !(shortcut.id === "save" && editor))) return false;
  return shortcut.scope === "global" || shortcut.scope === active || (shortcut.scope === "editor" && (active === "notes" || active === "forge")) || (shortcut.scope === "refresh" && (active === "files" || active === "disk" || active === "trash"));
}
export function findShortcut(binding: string, bindings: Bindings, active: AppId | null, typing = false, editor = false, modal = false) {
  return shortcuts.find(s => (bindingFor(s, bindings) === binding || s.alternate === binding) && eligible(s, active, typing, editor, modal));
}
export function bindingConflict(id: string, value: string, bindings: Bindings) {
  const own = shortcuts.find(s => s.id === id); if (!own) return "Unknown shortcut";
  const conflict = shortcuts.find(s => s.id !== id && (bindingFor(s, bindings) === value || s.alternate === value));
  return conflict ? `Already used by ${conflict.label}` : null;
}
export function nextWindow(windows: { id: AppId; minimized: boolean }[], active: AppId | null) {
  const visible = windows.filter(w => !w.minimized); if (visible.length < 2) return null;
  return visible[(visible.findIndex(w => w.id === active) + 1) % visible.length]?.id ?? null;
}