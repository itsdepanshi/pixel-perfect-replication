import { describe, expect, it } from "vitest";
import { shortcuts, eventBinding, findShortcut, parseBindings, validBinding, bindingConflict, nextWindow } from "./shortcut-logic";

describe("NEXUS keyboard rules", () => {
  it.each([
    ["terminal", "Ctrl+Alt+T"], ["files", "Meta+E"], ["settings", "Meta+I"], ["launcher", "Meta"],
    ["switch", "Alt+Tab"], ["close", "Alt+F4"], ["maximize", "Meta+ArrowUp"], ["minimize", "Meta+ArrowDown"],
    ["palette", "Ctrl+K"], ["help", "Meta+/"], ["folder", "Ctrl+Shift+N"], ["rename", "F2"],
    ["delete", "Delete"], ["permanent", "Shift+Delete"], ["refresh", "F5"], ["save", "Ctrl+S"],
    ["undo", "Ctrl+Z"], ["redo", "Ctrl+Y"], ["pencil", "B"], ["eraser", "E"], ["pan", "H"],
  ])("%s has the requested binding %s", (id, keys) => {
    expect(shortcuts.find(s => s.id === id)?.keys).toBe(keys);
  });
  it("ignores all typing except saving within a supported editor", () => {
    expect(findShortcut("Delete", {}, "files", true)).toBeUndefined();
    expect(findShortcut("Ctrl+Alt+T", {}, "notes", true)).toBeUndefined();
    expect(findShortcut("Ctrl+S", {}, "notes", true, true)?.id).toBe("save");
    expect(findShortcut("Ctrl+S", {}, "notes", true, false)).toBeUndefined();
  });
  it("file deletion only dispatches in Files and never through a dialog", () => {
    expect(findShortcut("Shift+Delete", {}, "files")?.id).toBe("permanent");
    for (const app of ["notes", "forge", "games", null] as const) expect(findShortcut("Shift+Delete", {}, app)).toBeUndefined();
    expect(findShortcut("Shift+Delete", {}, "files", false, false, true)).toBeUndefined();
  });
  it("drawing keys only target Forge, not running games", () => {
    expect(findShortcut("B", {}, "forge")?.id).toBe("pencil");
    expect(findShortcut("B", {}, "games")).toBeUndefined();
    expect(findShortcut("Ctrl+Z", {}, "notes")).toBeUndefined();
  });
  it("refresh applies only to Files, Disk Management and Recycle Bin", () => {
    for (const app of ["files", "disk", "trash"] as const) expect(findShortcut("F5", {}, app)?.id).toBe("refresh");
    expect(findShortcut("F5", {}, "terminal")).toBeUndefined();
  });
  it("custom bindings replace the primary and preserve the alternate", () => {
    const bindings = parseBindings('{"terminal":"Ctrl+Alt+Q","files":"Ctrl+Alt+J"}');
    expect(findShortcut("Ctrl+Alt+T", bindings, null)).toBeUndefined();
    expect(findShortcut("Ctrl+Alt+Q", bindings, null)?.id).toBe("terminal");
    expect(findShortcut("Ctrl+Alt+E", bindings, null)?.id).toBe("files");
    expect(findShortcut("Ctrl+Alt+T", {}, null)?.id).toBe("terminal");
  });
  it("warns for conflicts with primary and alternate keys", () => {
    expect(bindingConflict("terminal", "Ctrl+K", {})).toContain("Command palette");
    expect(bindingConflict("terminal", "Ctrl+Alt+E", {})).toContain("Open Files");
    expect(bindingConflict("terminal", "Ctrl+Alt+Q", {})).toBeNull();
  });
  it("rejects corrupt, duplicate and unrepresentable stored combinations", () => {
    for (const invalid of ["Ctrl+Meta", "Ctrl+Ctrl+T", "Alt+Ctrl+T", "Ctrl+", "control+T"]) expect(validBinding(invalid)).toBe(false);
    expect(parseBindings('{"terminal":"Ctrl+Ctrl+T","unknown":"B"}')).toEqual({});
    expect(eventBinding({ key: "t", ctrlKey: true, altKey: true, shiftKey: false, metaKey: false })).toBe("Ctrl+Alt+T");
    expect(eventBinding({ key: "?", ctrlKey: false, altKey: false, shiftKey: true, metaKey: false })).toBe("?");
  });
  it("cycles only visible windows, wraps, and safely handles fewer than two", () => {
    const windows = [{ id: "files" as const, minimized: false }, { id: "notes" as const, minimized: true }, { id: "forge" as const, minimized: false }];
    expect(nextWindow(windows, "files")).toBe("forge"); expect(nextWindow(windows, "forge")).toBe("files");
    expect(nextWindow(windows.slice(0, 2), "files")).toBeNull(); expect(nextWindow([], null)).toBeNull();
  });
});