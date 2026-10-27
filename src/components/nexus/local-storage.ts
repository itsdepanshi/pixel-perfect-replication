export type TodoItem = { id: string; text: string; done: boolean };
export type Note = { id: string; title: string; body: string; modified: number; todos?: TodoItem[] };
export type Track = { id: string; name: string; blob: Blob; duration: number | null; added: number };
export type DrawingProject = { id: string; name: string; folder?: string; width: number; height: number; background: string | null; modified: number; layers: { id: string; name: string; visible: boolean; opacity: number; blob: Blob }[]; swatches: string[] };
export type StoredImage = { id: string; name: string; folder: string; blob: Blob; width: number; height: number; modified: number };
export type TrashedItem = { id: string; name: string; kind: "project" | "image"; originalFolder: string; deletedAt: number; size: number; width: number; height: number; payload: DrawingProject | StoredImage };
export type StoredFolder = { id: string };
export type Appearance = { id: "desktop-appearance"; theme: "phosphor" | "cyan" | "amber" | "rose"; wallpaper: Blob | null; wallpaperName: string; fit: "cover" | "contain" };
type Store = "notes" | "tracks" | "drawings" | "images" | "trash" | "folders" | "preferences";
const listeners = new Set<() => void>();
export function subscribeLibrary(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notifyLibrary() { for (const listener of listeners) listener(); }
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("nexus-local-library", 6);
    request.onupgradeneeded = () => {
      for (const name of ["notes", "tracks", "drawings", "images", "trash", "folders", "preferences"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = undefined; }; resolve(request.result); };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error("Local storage is blocked by another tab.")); };
  });
  return database;
}
export async function readAll<T>(store: Store): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).getAll();
    tx.oncomplete = () => resolve(request.result as T[]);
    tx.onabort = () => reject(tx.error);
    request.onerror = () => reject(request.error);
  });
}
export async function writeRecord(store: Store, value: Note | Track | DrawingProject | StoredImage | TrashedItem) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => { notifyLibrary(); resolve(); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function deleteRecord(store: Store, id: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => { notifyLibrary(); resolve(); };
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
/** Atomic read-modify-write keeps Explorer moves/renames from racing artwork saves. */
export async function updateLibraryRecord<T extends DrawingProject | StoredImage | StoredFolder | Appearance>(store: "drawings" | "images" | "folders" | "preferences", id: string, update: (existing: T | undefined) => T) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite"); const objects = tx.objectStore(store); const request = objects.get(id); let result: T;
    request.onsuccess = () => { try { result = update(request.result as T | undefined); objects.put(result); } catch (error) { reject(error); tx.abort(); } };
    tx.oncomplete = () => { notifyLibrary(); resolve(result); };
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error("File update cancelled."));
  });
}
const pending = new Map<string, { note: Note; timer: ReturnType<typeof setTimeout>; done: (ok: boolean) => void }>();
export function scheduleNote(note: Note, done: (ok: boolean) => void) {
  cancelNote(note.id);
  const timer = setTimeout(() => { void flushNote(note.id); }, 450);
  pending.set(note.id, { note, timer, done });
}
export function cancelNote(id: string) {
  const item = pending.get(id);
  if (item) clearTimeout(item.timer);
  pending.delete(id);
}
export async function flushNote(id: string) {
  const item = pending.get(id);
  if (!item) return;
  cancelNote(id);
  try { await writeRecord("notes", item.note); item.done(true); } catch { item.done(false); }
}
export function flushNotes() { for (const id of pending.keys()) void flushNote(id); }
export function formatDuration(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--:--";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
export function isAudioFile(file: Pick<File, "type" | "name">) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|wave|ogg|oga|m4a|aac|flac|opus|webm|aiff|aif)$/i.test(file.name);
}