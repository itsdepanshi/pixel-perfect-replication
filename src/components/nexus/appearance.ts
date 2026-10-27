import { useEffect, useState } from "react";
import { readAll, subscribeLibrary, updateLibraryRecord, type Appearance } from "./local-storage";

export const defaultAppearance: Appearance = { id: "desktop-appearance", theme: "phosphor", wallpaper: null, wallpaperName: "NEXUS Original", fit: "cover" };
export const themes = [ { id: "phosphor", name: "Phosphor" }, { id: "cyan", name: "Ice Cyan" }, { id: "amber", name: "Amber" }, { id: "rose", name: "Rose" } ] as const;
export function saveAppearance(change: Partial<Omit<Appearance, "id">>) {
  return updateLibraryRecord<Appearance>("preferences", defaultAppearance.id, current => ({ ...(current ?? defaultAppearance), ...change, id: defaultAppearance.id }));
}
export function useAppearance() {
  const [appearance, setAppearance] = useState(defaultAppearance);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true, revision = 0;
    const load = async () => {
      const request = ++revision;
      try {
        const records = await readAll<Appearance>("preferences");
        if (alive && request === revision) { setAppearance(records.find(record => record.id === defaultAppearance.id) ?? defaultAppearance); setError(""); }
      } catch { if (alive) setError("Personalization could not be loaded on this device."); }
    };
    void load(); const unsubscribe = subscribeLibrary(() => void load());
    return () => { alive = false; unsubscribe(); };
  }, []);
  return { appearance, error };
}
export function useWallpaperUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
export async function validateWallpaper(file: File) {
  if (!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG, WebP, GIF, AVIF or BMP image.");
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 ? resolve() : reject(new Error("This image cannot be opened."));
      image.onerror = () => reject(new Error("This image cannot be opened."));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}