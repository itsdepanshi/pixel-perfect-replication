import { createFileRoute } from "@tanstack/react-router";
import { DesktopShell } from "@/components/nexus/desktop-shell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "NEXUS OS — Your system. Your rules." },
    { name: "description", content: "A local hacker desktop with PIXEL//FORGE drawing, editable projects, Notes, Media, Arcade and a safe terminal." },
    { property: "og:title", content: "NEXUS OS — Your system. Your rules." },
    { property: "og:description", content: "Create artwork in PIXEL//FORGE, play NEXUS Arcade and keep notes and media in a local-first hacker desktop." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DesktopShell,
});
