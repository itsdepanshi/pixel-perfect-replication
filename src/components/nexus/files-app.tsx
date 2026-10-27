import { useEffect, useRef, useState } from "react";
import { Folder, FileImage, File as FileIcon, Upload, Paintbrush, ArrowUp, Pencil, Trash2, FolderInput, Download, FolderPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWindowManager } from "./window-manager";
import { children, directories, readFilesystem, subscribeFilesystem, renameFile, moveFile, deleteFile, metadata, createFolder, permanentlyDeleteFile, importComputerFile, downloadableBlob, TRASH, type VirtualFile } from "./virtual-filesystem";

import { useAppShortcuts } from "./shortcut-system";

export function FilesApp() {
  const manager = useWindowManager(); const [path, setPath] = useState("/home/root"); const [files, setFiles] = useState<VirtualFile[]>([]); const [selected, setSelected] = useState<string | null>(null); const [error, setError] = useState("");
  const [moving, setMoving] = useState(false); const [destination, setDestination] = useState(path);
  const uploadInput = useRef<HTMLInputElement>(null);
  const importing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [transfer, setTransfer] = useState("");
  async function importFiles(incoming: File[]) {
    if (importing.current || !incoming.length) return;
    importing.current = true; setBusy(true); setError("");
    const target = path; let saved = 0; const failures: string[] = [];
    try {
      for (const input of incoming) {
        setTransfer(`Importing ${saved + 1}/${incoming.length} · ${input.name}`);
        try { await importComputerFile({ name: input.name, blob: input, modified: input.lastModified }, target); saved++; }
        catch (reason) { failures.push(`${input.name}: ${reason instanceof Error ? reason.message : "Storage unavailable"}`); }
      }
      setTransfer(`${saved}/${incoming.length} files imported into ${target}`);
      if (failures.length) setError(failures.join(" · "));
    } finally { importing.current = false; setBusy(false); }
  }
  useEffect(() => { let alive = true; let revision = 0; const refresh = () => { const current = ++revision; void readFilesystem().then(list => { if (alive && current === revision) setFiles(list); }).catch(() => { if (alive) setError("Files could not be read from this device."); }); }; refresh(); const unsubscribe = subscribeFilesystem(refresh); return () => { alive = false; unsubscribe(); }; }, []);
  useEffect(() => { if (manager.filesRequest) { setPath(manager.filesRequest.path); setSelected(null); } }, [manager.filesRequest]);
  const listing = children(path, files); const file = files.find(f => f.id === selected);
  const enter = (folder: string) => { setPath(folder); setSelected(null); };
  async function action(work: () => Promise<unknown>) { setError(""); try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "File could not be updated."); } }
  function open(f: VirtualFile) { if (f.kind === "project") manager.openProject(f.id); else { const blob = downloadableBlob(f); if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); } }
  function rename() { if (!file) return false; const name = window.prompt("Filename", file.name)?.trim(); if (name) void action(() => renameFile(file, name)); return true; }
  function remove(permanent = false) { if (!file || file.folder !== path) return false; if (window.confirm(permanent ? `Permanently delete “${file.name}”? This cannot be undone.` : `Move “${file.name}” to the Recycle Bin?`)) void action(async () => { await (permanent ? permanentlyDeleteFile(file) : deleteFile(file)); setSelected(null); }); return true; }
  function folder() { if (path === "/system/Trash") return false; const name = window.prompt("Folder name")?.trim(); if (name) void action(() => createFolder(path, name)); return true; }
  function refresh() { void action(async () => setFiles(await readFilesystem())); return true; }
  useAppShortcuts("files", id => { if (moving) return false; if (id === "folder") return folder(); if (id === "rename") return rename(); if (id === "delete") return remove(); if (id === "permanent") return remove(true); if (id === "refresh") return refresh(); return false; });
  return <div className={`app-preview files-app ${dropActive ? "files-drop-active" : ""}`} onDragOver={event => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = busy || moving || path === TRASH ? "none" : "copy"; setDropActive(!busy && !moving && path !== TRASH); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); setDropActive(false); if (busy || moving) return; if (path === TRASH) { setError("Choose a folder outside the Recycle Bin to import files."); return; } const items = Array.from(event.dataTransfer.items); if (items.some(item => item.kind === "file" && item.webkitGetAsEntry?.()?.isDirectory)) { setError("Choose files rather than folders. You can select multiple files together."); return; } void importFiles(Array.from(event.dataTransfer.files)); }}>
    <div className="preview-heading"><Folder size={28} /><div><p>FILE EXPLORER</p><h2>Files</h2></div><span className="phase-label">LOCAL</span></div>
    {error && <div role="alert" className="local-error">{error}</div>}
    <div className="file-transfer-toolbar"><Button variant="system" disabled={busy || moving || path === TRASH} onClick={() => uploadInput.current?.click()}><Upload size={14} /> Import files</Button>{busy && <span role="status">{transfer}</span>}</div>
    <input ref={uploadInput} type="file" multiple hidden aria-label="Import computer files" onChange={event => { const incoming = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void importFiles(incoming); }} />
    {!busy && transfer && <p className="file-transfer-status" role="status">{transfer}</p>}
    <div className="files-toolbar"><Button variant="system" size="icon" title="Parent folder" aria-label="Parent folder" disabled={path === "/"} onClick={() => enter(path.slice(0, path.lastIndexOf("/")) || "/")}><ArrowUp /></Button><span aria-label="Current folder">{path}</span><Button variant="system" size="icon" title="New folder" aria-label="New folder" onClick={folder}><FolderPlus /></Button><Button variant="system" size="icon" title="Refresh Files" aria-label="Refresh Files" onClick={refresh}><RefreshCw /></Button>{file && <><Button variant="system" size="icon" title="Rename file" aria-label="Rename file" onClick={rename}><Pencil /></Button><Button variant="system" size="icon" title="Move file" aria-label="Move file" onClick={() => { setDestination(path); setMoving(true); }}><FolderInput /></Button><Button variant="system" size="icon" title="Move to Recycle Bin" aria-label="Move to Recycle Bin" onClick={() => remove()}><Trash2 /></Button>{file.kind !== "project" && <Button variant="system" size="icon" title="Download file" aria-label="Download file" onClick={() => open(file)}><Download /></Button>}</>}</div>
    <div className="preview-list files-list">{listing.folders.map(folder => <div key={folder}><Folder size={15} /><Button variant="system" className="files-entry" onDoubleClick={() => enter(folder)} onClick={() => setSelected(null)} onKeyDown={event => { if (event.key === "Enter") enter(folder); }} aria-label={`Folder ${folder.split("/").at(-1)}`}><pre>{folder.split("/").at(-1)}</pre></Button><Button variant="system" size="icon" title="Open folder" aria-label={`Open folder ${folder.split("/").at(-1)}`} onClick={() => enter(folder)}><FolderInput /></Button></div>)}{listing.files.map(f => <div key={f.id} data-selected={f.id === selected}>{f.kind === "project" ? <Paintbrush size={15} /> : f.kind === "image" ? <FileImage size={15} /> : <FileIcon size={15} />}<Button variant="system" className="files-entry" aria-label={`File ${f.name}`} aria-pressed={f.id === selected} onClick={() => setSelected(f.id)} onDoubleClick={() => open(f)} onKeyDown={event => { if (event.key === "Enter") open(f); }}><pre>{f.name}</pre></Button><small>{f.kind === "file" ? `${f.size.toLocaleString()} B` : `${f.width} × ${f.height}`}</small></div>)}</div>
    <p className="preview-status"><span className="status-dot" />{listing.folders.length + listing.files.length} ITEMS <span>— LOCAL FILESYSTEM</span></p>
    {file && <pre className="files-metadata">{metadata(file).join("\n")}</pre>}
    {moving && file && <div className="local-confirm-overlay"><section className="forge-dialog" role="dialog" aria-label="Move file"><header><h2>Move {file.name}</h2></header><label>FOLDER<select aria-label="Destination folder" value={destination} onChange={event => setDestination(event.target.value)}>{directories.filter(folder => folder !== TRASH).map(folder => <option key={folder}>{folder}</option>)}</select></label><Button onClick={() => void action(async () => { await moveFile(file, destination); setMoving(false); setPath(destination); })}><FolderInput /> Move</Button><Button variant="system" onClick={() => setMoving(false)}>Cancel</Button></section></div>}
  </div>;
}