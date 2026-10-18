/** Hidden, harmless easter egg: opens the arcade bonus mode. Not listed in help. */
import { filesystemCommand, type VirtualFile } from "./virtual-filesystem";
export const SECRET_COMMAND = "arcade --overclock";
export const SECRET_EVENT = "nexus:secret-command";
export function executeCommand(command: string, now = new Date(), files: VirtualFile[] = [], cwd = "/home/root"): string[] {
  const filesystem = filesystemCommand(command, cwd, files); if (filesystem) return filesystem.output;
  const cmd = command.trim().toLowerCase();
  if (!cmd || cmd === "clear") return [];
  switch (cmd) {
    case "help": return ["AVAILABLE COMMANDS", "help      List available commands", "clear     Clear terminal output", "date      Current local date and time", "whoami    Display session identity", "neofetch  Display NEXUS system information", "ls [path] List virtual files", "cd [path] Change virtual folder", "cat path  Show file metadata", "pwd       Current virtual folder", "", "Sandboxed session · no access to your device shell."];
    case "date": return [now.toString()];
    case "whoami": return ["root", "Local NEXUS session · simulated identity"];
    case "neofetch": return ["   /\\   /\\     root@nexus", "  /  \\/  \\    ─────────────────────", "  \\  /\\  /    OS       NEXUS OS 1.0", "   \\/  \\/     Host     Browser sandbox", "              Shell    nexus-sh", "              Desktop  NEXUS / Phase 01", "              Memory   2.4 / 8 GB (simulated)"];
    case SECRET_COMMAND: return ["> overclock handshake accepted", "> injecting bonus cartridge into NEXUS ARCADE...", "Secret unlocked. Have fun, operator."];
    default: return [`nexus-sh: command not found: ${command.trim()}`, "Type 'help' for available commands."];
  }
}