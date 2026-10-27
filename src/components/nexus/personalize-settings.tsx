import { useRef, useState } from "react";
import { Check, ImagePlus, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAppearance, themes, useAppearance, useWallpaperUrl, validateWallpaper } from "./appearance";
import type { Appearance } from "./local-storage";

export function PersonalizeSettings() {
  const { appearance, error: loadError } = useAppearance();
  const url = useWallpaperUrl(appearance.wallpaper);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update(change: Partial<Omit<Appearance, "id">>) {
    setBusy(true); setError("");
    try { await saveAppearance(change); }
    catch { setError("Changes could not be saved. Your previous appearance is unchanged."); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    setBusy(true); setError("");
    try { await validateWallpaper(file); await saveAppearance({ wallpaper: file, wallpaperName: file.name }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Wallpaper could not be saved."); }
    finally { setBusy(false); }
  }
  return <section className="personalize-settings" aria-label="Personalize">
    <h3 className="enhancement-heading"><Palette size={15} /> PERSONALIZE</h3>
    <fieldset className="appearance-options" disabled={busy}><legend>Color theme</legend>
      <div className="theme-choices">{themes.map(theme => <Button key={theme.id} variant="system" className="theme-choice" aria-label={`${theme.name} theme`} aria-pressed={appearance.theme === theme.id} onClick={() => void update({ theme: theme.id })}><span className={`theme-swatch swatch-${theme.id}`} />{theme.name}{appearance.theme === theme.id && <Check size={12} />}</Button>)}</div>
    </fieldset>
    <div className="wallpaper-settings">
      <h4>Wallpaper</h4>
      <div className="wallpaper-preview" data-fit={appearance.fit}>{url ? <img src={url} alt="Selected wallpaper" /> : <span>NEXUS<span>://OS</span></span>}</div>
      <p className="wallpaper-name">{appearance.wallpaperName}</p>
      <div className="appearance-actions">
        <Button variant="system" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={14} /> Choose image</Button>
        <Button variant="system" disabled={busy || !appearance.wallpaper} onClick={() => void update({ wallpaper: null, wallpaperName: "NEXUS Original" })}><RotateCcw size={14} /> NEXUS Original</Button>
      </div>
      <input ref={input} type="file" hidden aria-label="Upload wallpaper" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void upload(file); }} />
      {appearance.wallpaper && <fieldset className="appearance-options" disabled={busy}><legend>Image fit</legend><div className="appearance-actions">{(["cover", "contain"] as const).map(fit => <Button variant="system" key={fit} aria-pressed={appearance.fit === fit} onClick={() => void update({ fit })}>{fit === "cover" ? "Fill screen" : "Fit image"}</Button>)}</div></fieldset>}
    </div>
    {(error || loadError) && <p role="alert" className="appearance-error">{error || loadError}</p>}
    {busy && <p role="status" className="wallpaper-name">Saving appearance…</p>}
  </section>;
}