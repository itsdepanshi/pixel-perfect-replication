import { createFileRoute } from "@tanstack/react-router";
import { DesktopShell } from "@/components/nexus/desktop-shell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "NEXUS OS — Your system. Your rules." },
    { name: "description", content: "A local hacker desktop with a safe terminal, movable application windows, and a phosphor-green operating environment." },
    { property: "og:title", content: "NEXUS OS — Your system. Your rules." },
    { property: "og:description", content: "Enter a browser-contained hacker desktop with a safe terminal and six application previews." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DesktopShell,
});
