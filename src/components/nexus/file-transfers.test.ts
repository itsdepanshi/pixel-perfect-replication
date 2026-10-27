import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { importComputerFile, readFilesystem, downloadableBlob, renameFile, moveFile, deleteFile, readTrash, restoreFile, permanentlyDeleteFile, filesystemCommand } from "./virtual-filesystem";

describe("computer file transfers", () => {
  it("accepts arbitrary binary types and preserves exact bytes through rename, move, trash and restore", async () => {
    const bytes = new Uint8Array([0, 255, 13, 10, 128, 42]);
    const blob = new NodeBlob([bytes], { type: "application/octet-stream" }) as unknown as Blob;
    const imported = await importComputerFile({ name: "archive.weird", blob, modified: 123 }, "/home/root");
    let file = (await readFilesystem()).find(f => f.id === imported.id);
    if (!file) throw new Error("Missing imported file");
    expect(file.name).toBe("archive.weird");
    expect(file.modified).toBe(123);
    expect(filesystemCommand('cat archive.weird', '/home/root', [file])?.output.join('\n')).toContain('6 bytes');
    await renameFile(file, "renamed.weird"); await moveFile(file, "/downloads");
    file = (await readFilesystem()).find(f => f.id === imported.id);
    if (!file) throw new Error("Missing moved file");
    expect(file.folder).toBe("/downloads"); expect(file.name).toBe("renamed.weird");
    await deleteFile(file);
    expect((await readFilesystem()).some(f => f.id === imported.id)).toBe(false);
    const deleted = (await readTrash()).find(f => f.id === imported.id);
    if (!deleted) throw new Error("Missing trashed file");
    await restoreFile(deleted);
    const restored = (await readFilesystem()).find(f => f.id === imported.id);
    if (!restored) throw new Error("Missing restored file");
    const restoredBlob = downloadableBlob(restored);
    if (!restoredBlob) throw new Error("Missing file bytes");
    expect(new Uint8Array(await restoredBlob.arrayBuffer())).toEqual(bytes);
    expect((await readFilesystem()).filter(f => f.id === imported.id)).toHaveLength(1);
    await permanentlyDeleteFile(restored);
    expect((await readFilesystem()).some(f => f.id === imported.id)).toBe(false);
  });
  it("keeps existing files instead of overwriting same-name imports", async () => {
    const blob = new NodeBlob(["original"]) as unknown as Blob;
    const first = await importComputerFile({ name: "same.zip", blob, modified: 1 }, "/downloads");
    const second = await importComputerFile({ name: "same.zip", blob, modified: 2 }, "/downloads");
    expect(first.name).toBe("same.zip"); expect(second.name).toBe("same (2).zip");
    expect(first.id).not.toBe(second.id);
  });
  it("does not treat imported executable or .nexus content as runnable apps or editable projects", async () => {
    const blob = new NodeBlob(["untrusted"]) as unknown as Blob;
    for (const name of ["program.exe", "external.nexus", "script.html"]) {
      const imported = await importComputerFile({ name, blob, modified: 0 }, "/downloads");
      const file = (await readFilesystem()).find(f => f.id === imported.id);
      expect(file?.kind).toBe("file"); expect(file?.project).toBeUndefined();
    }
    await expect(importComputerFile({ name: "file", blob, modified: 0 }, "/system/Trash")).rejects.toThrow("outside the Recycle Bin");
  });
});