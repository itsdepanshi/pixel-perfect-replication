import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppId } from "./registry";

export type WindowState = { id: AppId; x: number; y: number; width: number; height: number; minimized: boolean; maximized: boolean; z: number };
type Bounds = { width: number; height: number };
const fit = (w: WindowState, b: Bounds): WindowState => {
  const width = Math.min(w.width, Math.max(280, b.width - 24));
  const height = Math.min(w.height, Math.max(220, b.height - 24));
  return { ...w, width, height, x: Math.max(12, Math.min(w.x, b.width - width - 12)), y: Math.max(12, Math.min(w.y, b.height - height - 12)) };
};
type Manager = { windows: WindowState[]; active: AppId | null; open: (id: AppId) => void; focus: (id: AppId) => void; close: (id: AppId) => void; minimize: (id: AppId) => void; maximize: (id: AppId) => void; move: (id: AppId, x: number, y: number) => void; bounds: Bounds };
const Context = createContext<Manager | null>(null);
export function WindowManager({ children }: { children: ReactNode }) {
  const [bounds, setBounds] = useState<Bounds>({ width: 1280, height: 780 });
  const [windows, setWindows] = useState<WindowState[]>([]);
  useEffect(() => {
    const resize = () => {
      const next = { width: window.innerWidth, height: window.innerHeight - 112 };
      setBounds(next);
      setWindows(prev => prev.map(w => fit(w, next)));
    };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const top = (list: WindowState[]) => Math.max(0, ...list.map(w => w.z)) + 1;
  const active = windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null;
  const change = (id: AppId, fn: (w: WindowState, list: WindowState[]) => WindowState) => setWindows(prev => prev.map(w => w.id === id ? fn(w, prev) : w));
  const manager: Manager = {
    windows, active, bounds,
    open: id => setWindows(prev => {
      if (prev.some(w => w.id === id)) return prev.map(w => w.id === id ? { ...w, minimized: false, z: top(prev) } : w);
      return [...prev, fit({ id, x: bounds.width < 700 ? 12 : bounds.width * 0.29 + prev.length * 24, y: bounds.width < 700 ? 148 : Math.min(170, bounds.height * 0.21) + prev.length * 24, width: 720, height: 440, minimized: false, maximized: false, z: top(prev) }, bounds)];
    }),
    focus: id => change(id, (w, list) => ({ ...w, z: top(list) })),
    close: id => setWindows(prev => prev.filter(w => w.id !== id)),
    minimize: id => change(id, w => ({ ...w, minimized: true })),
    maximize: id => change(id, (w, list) => ({ ...w, maximized: !w.maximized, z: top(list) })),
    move: (id, x, y) => change(id, w => fit({ ...w, x, y }, bounds)),
  };
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useWindowManager() {
  const context = useContext(Context);
  if (!context) throw new Error("Window manager is not mounted");
  return context;
}