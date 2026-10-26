import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Plus, Save, Search, Trash2, Check, AlertTriangle, ListTodo, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelNote, deleteRecord, flushNotes, readAll, scheduleNote, writeRecord, type Note, type TodoItem } from "./local-storage";
import { useAppShortcuts } from "./shortcut-system";

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [todoDraft, setTodoDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const versions = useRef<Record<string, number>>({});
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    void readAll<Note>("notes").then(rows => { if (!live) return; setNotes(rows); setActiveId(rows.sort((a, b) => b.modified - a.modified)[0]?.id ?? null); }).catch(() => { if (live) setError("Could not open local notes. Check your browser’s storage permissions."); }).finally(() => { if (live) setLoading(false); });
    const flush = () => flushNotes();
    window.addEventListener("pagehide", flush);
    const visibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { live = false; flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const active = notes.find(note => note.id === activeId);
  function saved(note: Note, version: number, ok: boolean) {
    if (versions.current[note.id] !== version) return;
    setStatuses(prev => ({ ...prev, [note.id]: ok ? "Saved" : "Save failed" }));
    if (!ok) setError("Save failed. Local storage may be full or unavailable. Your text is still open; try Save again.");
  }
  function update(field: "title" | "body", value: string) {
    if (!active) return;
    const note = { ...active, [field]: value, modified: Date.now() };
    const version = (versions.current[note.id] ?? 0) + 1;
    versions.current[note.id] = version;
    setNotes(prev => prev.map(item => item.id === note.id ? note : item));
    setStatuses(prev => ({ ...prev, [note.id]: "Saving..." }));
    scheduleNote(note, ok => saved(note, version, ok));
  }
  function updateTodos(todos: TodoItem[]) {
    if (!active) return;
    const note = { ...active, todos, modified: Date.now() };
    const version = (versions.current[note.id] ?? 0) + 1;
    versions.current[note.id] = version;
    setNotes(prev => prev.map(item => item.id === note.id ? note : item));
    setStatuses(prev => ({ ...prev, [note.id]: "Saving..." }));
    scheduleNote(note, ok => saved(note, version, ok));
  }
  function addTodo(event: FormEvent) {
    event.preventDefault();
    const text = todoDraft.trim();
    if (!text || !active) return;
    updateTodos([...(active.todos ?? []), { id: crypto.randomUUID(), text, done: false }]);
    setTodoDraft("");
  }
  async function newNote() {
    if (busy) return;
    setBusy(true); setError("");
    const note: Note = { id: crypto.randomUUID(), title: "", body: "", modified: Date.now() };
    setNotes(prev => [note, ...prev]); setActiveId(note.id); setSearch("");
    setStatuses(prev => ({ ...prev, [note.id]: "Saving..." }));
    versions.current[note.id] = 0;
    try { await writeRecord("notes", note); saved(note, 0, true); } catch { saved(note, 0, false); }
    setBusy(false); titleInput.current?.focus();
  }
  async function manualSave() {
    if (!active) return;
    cancelNote(active.id);
    const version = (versions.current[active.id] ?? 0) + 1;
    versions.current[active.id] = version;
    setStatuses(prev => ({ ...prev, [active.id]: "Saving..." })); setError("");
    try { await writeRecord("notes", active); saved(active, version, true); } catch { saved(active, version, false); }
  }
  async function removeNote() {
    if (!active || busy) return;
    setBusy(true); cancelNote(active.id);
    try { await deleteRecord("notes", active.id); const remaining = notes.filter(note => note.id !== active.id); setNotes(remaining); setActiveId(remaining[0]?.id ?? null); setDeleting(false); }
    catch { setError("Could not delete this note. Please try again."); }
    setBusy(false);
  }
  const status = active ? statuses[active.id] ?? "Saved" : "";
  const todos = active?.todos ?? [];
  useAppShortcuts("notes", id => { if (id !== "save" || !active || loading || busy || deleting) return false; void manualSave(); return true; });
  return <div className="notes-app local-app">
    <div className="local-app-toolbar"><span className="app-section-title"><FileText size={15} /> NOTES <span>{notes.length.toString().padStart(2, "0")}</span></span><Button variant="system" className="primary-action" disabled={loading || busy} onClick={() => void newNote()}><Plus /> New Note</Button></div>
    {error && <div className="local-error" role="alert"><AlertTriangle size={13} />{error}</div>}
    <div className="notes-layout"><aside className="notes-sidebar"><label className="local-search"><Search size={13} /><input aria-label="Search notes" placeholder="Search notes..." value={search} onChange={event => setSearch(event.target.value)} /></label><div className="notes-list">{notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.modified - a.modified).map(note => <Button key={note.id} variant="system" className="note-list-item" data-selected={note.id === activeId} onClick={() => { setActiveId(note.id); setDeleting(false); }}><span>{note.title.trim() || "Untitled Note"}</span><time>{new Date(note.modified).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></Button>)}{!loading && !notes.length && <p className="list-empty">No notes yet</p>}{search && !notes.some(note => `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase())) && <p className="list-empty">No matching notes</p>}</div></aside>
    {active ? <section className="note-editor"><div className="note-editor-tools"><span className={`save-status ${status === "Save failed" ? "save-error" : ""}`} role="status">{status === "Saved" ? <Check size={11} /> : null}{status}</span><Button variant="system" size="sm" onClick={() => void manualSave()}><Save /> Save</Button><Button variant="system" size="icon" aria-label="Delete note" title="Delete note" onClick={() => setDeleting(true)}><Trash2 /></Button></div><input ref={titleInput} className="note-title" aria-label="Note title" placeholder="Untitled Note" value={active.title} onChange={event => update("title", event.target.value)} /><textarea className="note-body" aria-label="Note text" placeholder="Start writing..." value={active.body} onChange={event => update("body", event.target.value)} /><div className="note-editor-footer"><span>{active.body.length.toLocaleString()} CHARACTERS</span><span>LOCAL STORAGE</span></div></section> : <div className="local-empty"><FileText size={32} /><h2>{loading ? "Opening notes..." : "A blank page awaits."}</h2>{!loading && <Button variant="system" className="primary-action" onClick={() => void newNote()} disabled={busy}><Plus /> New Note</Button>}</div>}</div>
    {deleting && active && <div className="local-confirm-overlay"><section className="local-confirm" role="alertdialog" aria-label="Delete note confirmation" aria-modal="true"><Trash2 size={22} /><h2>Delete this note?</h2><p>“{active.title.trim() || "Untitled Note"}” will be permanently deleted.</p><div><Button variant="system" autoFocus disabled={busy} onClick={() => setDeleting(false)}>Cancel</Button><Button variant="system" className="danger-action" disabled={busy} onClick={() => void removeNote()}>Delete permanently</Button></div></section></div>}
  </div>;
}