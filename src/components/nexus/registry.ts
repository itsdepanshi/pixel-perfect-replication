import { Terminal, Folder, FileText, Disc3, Settings2, Gamepad2 } from "lucide-react";

export const apps = [
  { id: "terminal", name: "Terminal", icon: Terminal, code: "01", subtitle: "SYSTEM SHELL" },
  { id: "files", name: "Files", icon: Folder, code: "02", subtitle: "FILE EXPLORER" },
  { id: "notes", name: "Notes", icon: FileText, code: "03", subtitle: "WORKSPACE NOTES" },
  { id: "media", name: "Media", icon: Disc3, code: "04", subtitle: "MEDIA PLAYER" },
  { id: "settings", name: "Settings", icon: Settings2, code: "05", subtitle: "SYSTEM SETTINGS" },
  { id: "games", name: "Arcade", icon: Gamepad2, code: "06", subtitle: "NEXUS ARCADE" },
] as const;
export type AppId = (typeof apps)[number]["id"];