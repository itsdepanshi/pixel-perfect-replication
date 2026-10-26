import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu, clampMenu, ownsContextMenu } from "./desktop-context-menu";

afterEach(cleanup);

describe("desktop context menu safeguards", () => {
  it("clamps menu geometry to the workspace", () => {
    expect(clampMenu(1190, 650, 180, 262, 1198, 676)).toEqual({ x: 1014, y: 410 });
    expect(clampMenu(-20, -10, 180, 262, 1198, 676)).toEqual({ x: 4, y: 4 });
  });
  it("leaves app windows, drawing canvases, typing fields and widgets in control of right-click", () => {
    for (const [tag, className] of [["div", "app-window"], ["canvas", ""], ["textarea", ""], ["div", "desktop-widget"]] as const) {
      const element = document.createElement(tag);
      element.className = className;
      expect(ownsContextMenu(element)).toBe(true);
    }
    expect(ownsContextMenu(document.createElement("div"))).toBe(false);
  });
  it("restores parent focus on Escape and runs the selected action once", async () => {
    const action = vi.fn();
    const close = vi.fn();
    render(<ContextMenu x={20} y={20} label="Desktop options" onClose={close} items={[{ label: "New", items: [{ label: "New Folder", action }] }]} />);
    const parent = screen.getByRole("menuitem", { name: /^New$/ });
    fireEvent.keyDown(parent, { key: "ArrowRight" });
    const child = await screen.findByRole("menuitem", { name: "New Folder" });
    child.focus();
    fireEvent.keyDown(child, { key: "Escape" });
    expect(document.activeElement).toBe(parent);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(parent);
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});