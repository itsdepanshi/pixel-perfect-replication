import { Terminal, Folder, FileText, Disc3, Settings2, Gamepad2, Paintbrush, Trash2, HardDrive } from "lucide-react";

export const apps = [
  { id: "terminal", name: "Terminal", icon: Terminal, code: "01", subtitle: "SYSTEM SHELL" },
  { id: "files", name: "Files", icon: Folder, code: "02", subtitle: "FILE EXPLORER" },
  { id: "notes", name: "Notes", icon: FileText, code: "03", subtitle: "WORKSPACE NOTES" },
  { id: "media", name: "Media", icon: Disc3, code: "04", subtitle: "MEDIA PLAYER" },
  { id: "settings", name: "Settings", icon: Settings2, code: "05", subtitle: "SYSTEM SETTINGS" },
  { id: "games", name: "Arcade", icon: Gamepad2, code: "06", subtitle: "NEXUS ARCADE" },
  { id: "forge", name: "PIXEL//FORGE", icon: Paintbrush, code: "07", subtitle: "DRAWING STUDIO" },
  { id: "trash", name: "Recycle Bin", icon: Trash2, code: "08", subtitle: "DELETED ITEMS" },
  { id: "disk", name: "Disk Management", icon: HardDrive, code: "09", subtitle: "STORAGE" },
] as const;
export type AppId = (typeof apps)[number]["id"];