import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MenuItem = { label: string; action?: () => void; items?: MenuItem[]; disabled?: boolean; hint?: string };

/** Elements that keep their own (or the browser's) context menu. */
export function ownsContextMenu(target: EventTarget | null) {
  return !!(target as HTMLElement | null)?.closest?.(".app-window, .desktop-icon, input, textarea, select, canvas, [contenteditable]:not([contenteditable='false']), .desktop-menu, .desktop-widget");
}

/** Clamp a menu inside the container. */
export function clampMenu(x: number, y: number, w: number, h: number, bw: number, bh: number) {
  return { x: Math.max(4, Math.min(x, bw - w - 4)), y: Math.max(4, Math.min(y, bh - h - 4)) };
}

export function ContextMenu({ x, y, items, label, onClose }: { x: number; y: number; items: MenuItem[]; label: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current; const parent = el?.offsetParent as HTMLElement | null;
    if (el && parent) setPos(clampMenu(x, y, el.offsetWidth, el.offsetHeight, parent.clientWidth, parent.clientHeight));
    el?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, [x, y]);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (open !== null) setOpen(null); else onClose(); } };
    window.addEventListener("pointerdown", down, true); window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, [onClose, open]);
  const run = (item: MenuItem) => { if (item.disabled || !item.action) return; onClose(); item.action(); };
  const nav = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(e.currentTarget.querySelectorAll<HTMLButtonElement>(":scope > button:not([disabled]), :scope > .desktop-submenu-wrap > button:not([disabled])"))];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); buttons[(i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus(); }
  };
  const flipSub = pos.x + 400 > ((ref.current?.offsetParent as HTMLElement | null)?.clientWidth ?? 9999);
  return <div ref={ref} className="desktop-menu" role="menu" aria-label={label} style={{ left: pos.x, top: pos.y }} onKeyDown={nav} onContextMenu={e => e.preventDefault()}>
    {items.map((item, i) => item.items
      ? <div key={item.label} className="desktop-submenu-wrap" onPointerEnter={e => { if (e.pointerType === "mouse") setOpen(i); }}>
          <Button variant="system" role="menuitem" aria-haspopup="menu" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen(i); window.setTimeout(() => ref.current?.querySelector<HTMLButtonElement>(".desktop-submenu button")?.focus(), 0); } }}>{item.label}<ChevronRight className="menu-chevron" /></Button>
          {open === i && <div className={`desktop-menu desktop-submenu ${flipSub ? "flip" : ""}`} role="menu" aria-label={item.label} onKeyDown={e => { nav(e); if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setOpen(null); (e.currentTarget.previousElementSibling as HTMLButtonElement)?.focus(); } }}>
            {item.items.map(sub => <Button key={sub.label} variant="system" role="menuitem" disabled={sub.disabled} title={sub.hint} onClick={() => run(sub)}>{sub.label}</Button>)}
          </div>}
        </div>
      : <Button key={item.label} variant="system" role="menuitem" disabled={item.disabled} title={item.hint} onPointerEnter={() => setOpen(null)} onClick={() => run(item)}>{item.label}</Button>)}
  </div>;
}
