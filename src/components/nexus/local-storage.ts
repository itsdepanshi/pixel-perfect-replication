export type Note = { id: string; title: string; body: string; modified: number };
export type Track = { id: string; name: string; blob: Blob; duration: number | null; added: number };
type Store = "notes" | "tracks";
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("nexus-local-library", 1);
    request.onupgradeneeded = () => {
      for (const name of ["notes", "tracks"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
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
export async function writeRecord(store: Store, value: Note | Track) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function deleteRecord(store: Store, id: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
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