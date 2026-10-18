import { readAll, deleteRecord, updateLibraryRecord, subscribeLibrary, type DrawingProject, type StoredImage } from "./local-storage";

export const PICTURES = "/home/root/Pictures";
export const FORGE_FOLDER = `${PICTURES}/Pixel Forge`;
export const directories = ["/", "/home", "/home/root", "/documents", "/downloads", "/system", PICTURES, FORGE_FOLDER];
export type VirtualFile = { id: string; name: string; folder: string; kind: "project" | "image"; size: number; width: number; height: number; modified: number; layers?: number; project?: DrawingProject; image?: StoredImage };
export const subscribeFilesystem = subscribeLibrary;
export function resolvePath(path: string, cwd = "/home/root") {
  const parts: string[] = [];
  const expanded = path.replace(/^~(?=\/|$)/, "/home/root");
  for (const part of (expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`).split("/")) { if (part === "..") parts.pop(); else if (part && part !== ".") parts.push(part); }
  return "/" + parts.join("/");
}
export function projectFilename(name: string) { return name.replace(/\.nexus$/i, "") + ".nexus"; }
export function validFilename(name: string) { return !!name.trim() && !/[\/\\\x00-\x1f]/.test(name) && name !== "." && name !== ".."; }
export function projectFile(p: DrawingProject): VirtualFile { return { id: p.id, name: projectFilename(p.name), folder: p.folder ?? FORGE_FOLDER, kind: "project", size: p.layers.reduce((sum, l) => sum + l.blob.size, 0), width: p.width, height: p.height, modified: p.modified, layers: p.layers.length, project: p }; }
export async function readFilesystem(): Promise<VirtualFile[]> {
  const [projects, images] = await Promise.all([readAll<DrawingProject>("drawings"), readAll<StoredImage>("images")]);
  return [...projects.map(projectFile), ...images.map(image => ({ ...image, kind: "image" as const, size: image.blob.size, image }))];
}
export function children(path: string, files: VirtualFile[]) {
  return { folders: directories.filter(folder => folder !== path && resolvePath("..", folder) === path), files: files.filter(file => file.folder === path) };
}
export async function saveDrawing(project: DrawingProject, existing: boolean) {
  if (!validFilename(project.name)) throw new Error("Use a project name without slashes.");
  return updateLibraryRecord<DrawingProject>("drawings", project.id, previous => {
    if (existing && !previous) throw new Error("This file was deleted. Save it as a new project.");
    return { ...project, folder: previous?.folder ?? project.folder ?? FORGE_FOLDER };
  });
}
export async function renameFile(file: VirtualFile, name: string) {
  if (!validFilename(name)) throw new Error("Use a filename without slashes.");
  if (file.kind === "project") return updateLibraryRecord<DrawingProject>("drawings", file.id, p => { if (!p) throw new Error("File no longer exists."); return { ...p, name: name.replace(/\.nexus$/i, ""), modified: Date.now() }; });
  return updateLibraryRecord<StoredImage>("images", file.id, p => { if (!p) throw new Error("File no longer exists."); return { ...p, name, modified: Date.now() }; });
}
export async function moveFile(file: VirtualFile, folder: string) {
  if (!directories.includes(folder)) throw new Error("Folder not found.");
  if (file.kind === "project") return updateLibraryRecord<DrawingProject>("drawings", file.id, p => { if (!p) throw new Error("File no longer exists."); return { ...p, folder, modified: Date.now() }; });
  return updateLibraryRecord<StoredImage>("images", file.id, p => { if (!p) throw new Error("File no longer exists."); return { ...p, folder, modified: Date.now() }; });
}
export function deleteFile(file: VirtualFile) { return deleteRecord(file.kind === "project" ? "drawings" : "images", file.id); }
export async function saveImage(image: StoredImage) {
  const existing = (await readAll<StoredImage>("images")).find(p => p.folder === image.folder && p.name === image.name);
  return updateLibraryRecord<StoredImage>("images", existing?.id ?? image.id, () => ({ ...image, id: existing?.id ?? image.id }));
}
export function metadata(file: VirtualFile) { return [`${file.name} · ${file.kind === "project" ? "NEXUS editable project" : "Image"}`, `${file.width} × ${file.height}${file.layers !== undefined ? ` · ${file.layers} layers` : ""}`, `${file.size} bytes · ${file.folder}`, `Modified: ${new Date(file.modified).toLocaleString()}`]; }
export function filesystemCommand(command: string, cwd: string, files: VirtualFile[]): { output: string[]; cwd: string } | null {
  const match = command.trim().match(/^(ls|cd|cat|pwd)(?:\s+([\s\S]*))?$/); if (!match) return null;
  const cmd = match[1]; const raw = (match[2] ?? "").trim(); const arg = raw.replace(/^(["'])([\s\S]*)\1$/, "$2");
  const path = resolvePath(arg || (cmd === "cd" ? "/home/root" : "."), cwd);
  if (cmd === "pwd") return { output: [cwd], cwd };
  if (cmd === "cd") return directories.includes(path) ? { output: [], cwd: path } : { output: [`cd: folder not found: ${arg}`], cwd };
  const file = files.find(f => `${f.folder}/${f.name}` === path);
  if (cmd === "cat") return { output: file ? metadata(file) : [directories.includes(path) ? "cat: is a directory" : `cat: file not found: ${arg}`], cwd };
  if (file) return { output: [file.name], cwd };
  if (!directories.includes(path)) return { output: [`ls: path not found: ${arg}`], cwd };
  const list = children(path, files); return { output: [...list.folders.map(f => f.split("/").at(-1) + "/"), ...list.files.map(f => f.name)], cwd };
}