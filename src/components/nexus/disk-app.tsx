import { useEffect, useState } from "react";
import { HardDrive, RefreshCw, FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWindowManager } from "./window-manager";
import { readFilesystem, subscribeFilesystem, type VirtualFile } from "./virtual-filesystem";
import { readAll, type Note, type Track } from "./local-storage";

/** The virtual filesystem has no real capacity limit; this is a clearly labelled simulated capacity. */
export const SIMULATED_CAPACITY = 512 * 1024 * 1024;
type Breakdown = { label: string; bytes: number }[];
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export function categorize(files: VirtualFile[], notes: Note[], tracks: Track[]): Breakdown {
  const pictures = files.reduce((sum, f) => sum + f.size, 0);
  const media = tracks.reduce((sum, t) => sum + t.blob.size, 0);
  const documents = notes.reduce((sum, n) => sum + n.title.length + n.body.length, 0);
  return [
    { label: "Pictures", bytes: pictures },
    { label: "Media", bytes: media },
    { label: "Documents", bytes: documents },
    { label: "Applications", bytes: 0 },
    { label: "Other", bytes: 0 },
  ];
}
export function DiskApp() {
  const manager = useWindowManager();
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown>([]);
  const [error, setError] = useState("");
  const [refreshed, setRefreshed] = useState<number | null>(null);
  async function recalculate() {
    setError("");
    try {
      const [list, notes, tracks] = await Promise.all([readFilesystem(), readAll<Note>("notes"), readAll<Track>("tracks")]);
      setFiles(list);
      setBreakdown(categorize(list, notes, tracks));
      setRefreshed(Date.now());
    } catch { setError("Storage could not be read from this device."); }
  }
  useEffect(() => { void recalculate(); return subscribeFilesystem(() => void recalculate()); }, []);
  const used = breakdown.reduce((sum, c) => sum + c.bytes, 0);
  const percent = Math.min(100, (used / SIMULATED_CAPACITY) * 100);
  const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 5);
  return <div className="app-preview files-app">
    <div className="preview-heading"><HardDrive size={28} /><div><p>STORAGE</p><h2>Disk Management</h2></div><span className="phase-label">SIMULATED</span></div>
    {error && <div role="alert" className="local-error">{error}</div>}
    <div className="files-toolbar"><span>NEXUS-VDISK / VIRTUAL VOLUME</span><Button variant="system" title="Recalculate usage" aria-label="Recalculate usage" onClick={() => void recalculate()}><RefreshCw /> Refresh</Button></div>
    <div className="disk-summary">
      <div className="disk-numbers"><span>{formatBytes(used)} used</span><span>{formatBytes(SIMULATED_CAPACITY - used)} free</span><span>{percent.toFixed(1)}%</span></div>
      <div className="disk-bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Virtual disk usage"><i style={{ width: `${Math.max(1, percent)}%` }} /></div>
      <p className="disk-note">Capacity of {formatBytes(SIMULATED_CAPACITY)} is a simulated limit for this virtual volume — NEXUS OS cannot inspect your real physical disk.</p>
    </div>
    <div className="preview-list disk-breakdown">
      {breakdown.map(c => <div key={c.label}><span className="disk-cat">{c.label}</span><div className="metric-track"><i style={{ width: `${used ? Math.max(c.bytes ? 2 : 0, (c.bytes / used) * 100) : 0}%` }} /></div><small>{formatBytes(c.bytes)}</small></div>)}
    </div>
    <div className="preview-list files-list">
      <div className="disk-section-label">LARGEST FILES</div>
      {largest.length === 0 && <div><HardDrive size={15} /><Button variant="system" className="files-entry" disabled><pre>No files stored yet</pre></Button></div>}
      {largest.map(f => <div key={f.id}><HardDrive size={15} /><Button variant="system" className="files-entry" aria-label={`Locate ${f.name} in Files`} title="Open location in Files" onClick={() => manager.openFilesAt(f.folder)}><pre>{f.name}</pre></Button><small>{formatBytes(f.size)} · {f.folder}</small><Button variant="system" size="icon" title={`Open ${f.folder} in Files`} aria-label={`Open ${f.folder} in Files`} onClick={() => manager.openFilesAt(f.folder)}><FolderSearch /></Button></div>)}
    </div>
    <p className="preview-status"><span className="status-dot" /> CALCULATED FROM THE VIRTUAL FILESYSTEM {refreshed ? `— ${new Date(refreshed).toLocaleTimeString()}` : ""}</p>
  </div>;
}
