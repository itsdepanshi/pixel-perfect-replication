import { describe, expect, it } from "vitest";
import { executeCommand } from "./terminal-commands";
describe("Safe terminal commands", () => {
  it("lists all supported commands", () => {
    const result = executeCommand("help").join("\n");
    for (const command of ["help", "clear", "date", "whoami", "neofetch"]) expect(result).toContain(command);
  });
  it("returns the supplied local date", () => {
    const now = new Date("2026-10-15T18:14:00Z");
    expect(executeCommand("date", now)).toEqual([now.toString()]);
  });
  it("clears and handles empty input", () => {
    expect(executeCommand("clear")).toEqual([]);
    expect(executeCommand("  ")).toEqual([]);
  });
  it("uses a local identity and labeled simulated information", () => {
    expect(executeCommand("whoami")[0]).toBe("root");
    expect(executeCommand("neofetch").join("\n")).toContain("simulated");
  });
  it("rejects arbitrary shell commands", () => {
    expect(executeCommand("rm -rf /")[0]).toContain("command not found");
  });
});