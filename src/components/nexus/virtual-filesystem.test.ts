import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { describe, it, expect } from "vitest";
import { readAll, subscribeLibrary, writeRecord, type DrawingProject, type StoredImage } from "./local-storage";
import { FORGE_FOLDER, PICTURES, saveDrawing, readFilesystem, projectFile, renameFile, moveFile, deleteFile, saveImage, filesystemCommand } from "./virtual-filesystem";

// Node's structured-cloneable Blob models browser IndexedDB; jsdom's Blob cannot be cloned.
function storedBlob(text: string): Blob { return new NodeBlob([text], { type: "image/png" }) as unknown as Blob; }
function project(id: string): DrawingProject { return { id, name: id, width: 640, height: 480, background: null, modified: 1, swatches: ["#a3ff12"], layers: [{ id: "layer-1", name: "Hidden layer", visible: false, opacity: .35, blob: storedBlob("pixels") }] }; }
describe("Shared virtual artwork files", () => {
  it("saves native projects in the required folder preserving all editable data and notifies immediately", async () => {
    let changes = 0; const off = subscribeLibrary(() => changes++); const p = project("native"); await saveDrawing(p, false); off();
    const file = (await readFilesystem()).find(f => f.id === p.id);
    expect(file?.folder).toBe("/home/root/Pictures/Pixel Forge"); expect(file?.name).toBe("native.nexus"); expect(file?.project?.width).toBe(640); expect(file?.project?.height).toBe(480); expect(file?.project?.layers[0]).toMatchObject({ visible: false, opacity: .35 }); expect(file?.project?.layers[0]?.blob.size).toBe(6); expect(changes).toBe(1);
  });
  it("repeated saves update one existing project instead of making duplicate file records", async () => {
    const p = project("updates"); await saveDrawing(p, false); await saveDrawing({ ...p, width: 800 }, true);
    const rows = (await readAll<DrawingProject>("drawings")).filter(row => row.id === p.id); expect(rows).toHaveLength(1); expect(rows[0]?.width).toBe(800);
  });
  it("projects already stored before integration appear without migration or copies", async () => {
    const p = project("legacy"); await writeRecord("drawings", p); expect((await readFilesystem()).find(f => f.id === p.id)?.folder).toBe(FORGE_FOLDER); expect((await readAll<DrawingProject>("drawings")).filter(f => f.id === p.id)).toHaveLength(1);
  });
  it("renames and moves the original record and subsequent artwork saves keep its destination", async () => {
    const p = project("move"); await saveDrawing(p, false); await renameFile(projectFile(p), "Renamed.nexus"); await moveFile(projectFile(p), PICTURES);
    const renamed = (await readAll<DrawingProject>("drawings")).find(f => f.id === p.id); expect(renamed?.name).toBe("Renamed"); expect(renamed?.folder).toBe(PICTURES);
    await saveDrawing({ ...p, name: "Renamed", height: 600 }, true); const file = (await readFilesystem()).find(f => f.id === p.id); expect(file?.folder).toBe(PICTURES); expect(file?.height).toBe(600);
  });
  it("deletion prevents a stale save from silently resurrecting an existing file", async () => {
    const p = project("delete"); await saveDrawing(p, false); await deleteFile(projectFile(p)); await expect(saveDrawing(p, true)).rejects.toThrow("deleted"); expect((await readFilesystem()).some(f => f.id === p.id)).toBe(false);
  });
  it("repeated PNG exports overwrite the same Pictures image", async () => {
    const image: StoredImage = { id: "export-1", name: "drawing.png", folder: PICTURES, width: 640, height: 480, modified: 1, blob: storedBlob("png") }; await saveImage(image); await saveImage({ ...image, id: "export-2", width: 800 });
    const rows = (await readAll<StoredImage>("images")).filter(f => f.name === image.name); expect(rows).toHaveLength(1); expect(rows[0]?.width).toBe(800); expect(rows[0]?.folder).toBe("/home/root/Pictures");
  });
  it("ls, cd and cat use the same project paths and expose metadata rather than binary contents", () => {
    const file = projectFile(project("terminal")); expect(filesystemCommand('cd "Pictures/Pixel Forge"', "/home/root", [file])?.cwd).toBe(FORGE_FOLDER); expect(filesystemCommand("ls", FORGE_FOLDER, [file])?.output).toEqual(["terminal.nexus"]);
    const result = filesystemCommand('cat "terminal.nexus"', FORGE_FOLDER, [file])?.output.join("\n"); expect(result).toContain("640 × 480 · 1 layers"); expect(result).not.toContain("pixels"); expect(filesystemCommand("rm -rf /", "/", [file])).toBeNull();
  });
});