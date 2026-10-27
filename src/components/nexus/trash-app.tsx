import { useEffect, useState } from "react";
import { Trash2, Undo2, XCircle, Paintbrush, FileImage, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readTrash, restoreFile, deletePermanently, emptyTrash, subscribeFilesystem } from "./virtual-filesystem";
import type { TrashedItem } from "./local-storage";
import { useAppShortcuts } from "./shortcut-system";

export function TrashApp() {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () => { void readTrash().then(list => { if (alive) setItems(list.sort((a, b) => b.deletedAt - a.deletedAt)); }).catch(() => { if (alive) setError("Recycle Bin could not be read from this device."); }); };
    refresh();
    const unsubscribe = subscribeFilesystem(refresh);
    return () => { alive = false; unsubscribe(); };
  }, []);
  async function action(work: () => Promise<unknown>) { setError(""); try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "Recycle Bin action failed."); } }
  useAppShortcuts("trash", id => { if (id !== "refresh") return false; void action(async () => setItems((await readTrash()).sort((a, b) => b.deletedAt - a.deletedAt))); return true; });
  return <div className="app-preview files-app">
    <div className="preview-heading"><Trash2 size={28} /><div><p>DELETED ITEMS</p><h2>Recycle Bin</h2></div><span className="phase-label">LOCAL</span></div>
    {error && <div role="alert" className="local-error">{error}</div>}
    <div className="files-toolbar"><span>{items.length} {items.length === 1 ? "ITEM" : "ITEMS"}</span>{items.length > 0 && <Button variant="system" title="Empty Recycle Bin" aria-label="Empty Recycle Bin" onClick={() => { if (window.confirm(`Permanently delete all ${items.length} items? This cannot be undone.`)) void action(emptyTrash); }}><XCircle /> Empty Bin</Button>}</div>
    <div className="preview-list files-list">
      {items.length === 0 && <div><Trash2 size={15} /><Button variant="system" className="files-entry" disabled><pre>Recycle Bin is empty</pre></Button></div>}
      {items.map(item => <div key={item.id}>
        {item.kind === "project" ? <Paintbrush size={15} /> : item.kind === "image" ? <FileImage size={15} /> : <FileIcon size={15} />}
        <Button variant="system" className="files-entry" aria-label={`Deleted file ${item.name}`} onClick={() => void action(() => restoreFile(item))} title="Restore to original location"><pre>{item.name}</pre></Button>
        <small>{item.kind === "project" ? "NEXUS project" : item.kind === "image" ? "Image" : "File"} · from {item.originalFolder} · {new Date(item.deletedAt).toLocaleString()}</small>
        <Button variant="system" size="icon" title={`Restore ${item.name}`} aria-label={`Restore ${item.name}`} onClick={() => void action(() => restoreFile(item))}><Undo2 /></Button>
        <Button variant="system" size="icon" title={`Delete ${item.name} permanently`} aria-label={`Delete ${item.name} permanently`} onClick={() => { if (window.confirm(`Permanently delete “${item.name}”? This cannot be undone.`)) void action(() => deletePermanently(item)); }}><XCircle /></Button>
      </div>)}
    </div>
    <p className="preview-status"><span className="status-dot" /> DELETED ITEMS ARE KEPT UNTIL EMPTIED <span>— LOCAL FILESYSTEM</span></p>
  </div>;
}
