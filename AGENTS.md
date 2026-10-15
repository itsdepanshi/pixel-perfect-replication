<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## NEXUS architecture
- Keep the desktop in modular `src/components/nexus` components with a shared registry, because shortcuts, taskbar and windows must represent the same applications.
- Own all window geometry, stacking and lifecycle in WindowManager; AppWindow alone handles pointer dragging so application content never duplicates window behavior.
- Execute terminal commands through a browser-safe allowlisted pure function; never connect the preview terminal to a real shell.
- Keep desktop lifecycle in React memory; persist Notes and Media in browser IndexedDB through the shared local-storage module, because user content must survive refresh without external services.
- Store audio blobs and metadata, recreating and revoking object URLs at runtime, because temporary URLs are not durable file references.
- Debounce note saves by immutable note ID and revision with a module-level pending queue flushed on app closure, because edits must never leak between notes or disappear on closing a window.
- Inline positioning styles are limited to state-driven window geometry; all visual design values belong to semantic global CSS tokens.
