import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readAll, writeRecord, type Note } from "./local-storage";

describe("Notes to-do list", () => {
  it("to-do items with their tick state persist on the note record", async () => {
    const note: Note = { id: "todo-note", title: "Plan", body: "", modified: 1, todos: [{ id: "t1", text: "Wire the module", done: false }, { id: "t2", text: "Test the tick", done: true }] };
    await writeRecord("notes", note);
    const rows = await readAll<Note>("notes");
    expect(rows.find(row => row.id === note.id)?.todos).toEqual([{ id: "t1", text: "Wire the module", done: false }, { id: "t2", text: "Test the tick", done: true }]);
  });
});
