import { useEffect, useState } from "react";
import { Settings2, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyboardSettings } from "./shortcut-system";
import { ProfileSettings } from "./desktop-enhancements";
import { PersonalizeSettings } from "./personalize-settings";

export const CURSOR_KEY = "nexus-custom-cursor";
export const CURSOR_EVENT = "nexus:cursor-preference";
export function readCursorPreference() {
  try { return localStorage.getItem(CURSOR_KEY) !== "off"; } catch { return true; }
}
export function SettingsApp() {
  const [cursor, setCursor] = useState(true);
  useEffect(() => { setCursor(readCursorPreference()); }, []);
  function toggle() {
    const next = !cursor;
    setCursor(next);
    try { localStorage.setItem(CURSOR_KEY, next ? "on" : "off"); } catch { /* private mode */ }
    window.dispatchEvent(new Event(CURSOR_EVENT));
  }
  return <div className="app-preview">
    <div className="preview-heading"><Settings2 size={28} /><div><p>SYSTEM SETTINGS</p><h2>Settings</h2></div><span className="phase-label">LOCAL</span></div>
    <PersonalizeSettings />
    <div className="preview-list">
      <div><MousePointer2 size={15} /><Button variant="system" className="files-entry" aria-pressed={cursor} aria-label="Toggle custom NEXUS cursor" onClick={toggle}><pre>Custom NEXUS cursor</pre></Button><small>{cursor ? "ON — neon pointer theme" : "OFF — system cursor"}</small><Button variant="system" onClick={toggle}>{cursor ? "Disable" : "Enable"}</Button></div>
      <div><Settings2 size={15} /><span className="files-entry">Environment</span><small>NEXUS OS 1.0.0 · local sandbox</small></div>
    </div>
    <ProfileSettings />
    <KeyboardSettings />
    <p className="preview-status"><span className="status-dot" /> SETTINGS ARE SAVED ON THIS DEVICE</p>
  </div>;
}
