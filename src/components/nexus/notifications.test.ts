import { describe, expect, it } from "vitest";
import { addTo, dismiss, markRead, unreadCount, NOTIFY_LIMIT, type NexusNotification } from "./notifications";

const n = (id: string, read = false): NexusNotification => ({ id, title: id, body: "", kind: "info", time: 1, read });

describe("notifications", () => {
  it("adds newest first and caps history", () => {
    let list: NexusNotification[] = [];
    for (let i = 0; i < NOTIFY_LIMIT + 5; i++) list = addTo(list, n(String(i)));
    expect(list).toHaveLength(NOTIFY_LIMIT);
    expect(list[0]?.id).toBe(String(NOTIFY_LIMIT + 4));
  });
  it("marks one or all read", () => {
    const list = [n("a"), n("b")];
    expect(unreadCount(markRead(list, "a"))).toBe(1);
    expect(unreadCount(markRead(list))).toBe(0);
  });
  it("dismisses only the chosen item", () => {
    expect(dismiss([n("a"), n("b")], "a").map(x => x.id)).toEqual(["b"]);
  });
});
