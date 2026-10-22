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
- Keep each arcade game's rules in a pure `src/components/nexus/arcade/*-logic.ts` module with unit tests, and React game components only for rendering, timers and input, because mechanics must stay testable and isolated.
- Route all arcade scores, XP, achievements and cosmetics through the single `arcade/progression.ts` store in localStorage, because small single-player records need no database and every game must share one profile.
- Games capture keys at window capture phase only while running in the active, unminimized window and pause on minimize or hidden tab, so gameplay never leaks input to other apps.
- Maze levels are validated with a state-space search (position, switch, key) before use, so every generated level is solvable.
- Keep PIXEL//FORGE rendering, layer canvases and bounded snapshot history in its browser-only engine, with pure geometry helpers tested separately, so drawing stays independent of desktop layout and screen density.
- Persist editable drawing projects as per-layer PNG blobs through the shared IndexedDB library; export composited images separately, because image exports cannot preserve layer editing.
- Project virtual files are projections of the existing drawings records, with folder metadata and stable IDs; image exports use the same IndexedDB library, because duplicating artwork into file records causes stale data. Files, Forge and the allowlisted terminal share virtual-filesystem helpers and commit notifications.
- Route file-open requests through WindowManager as identified requests, because new and already-running Forge windows must load projects with their existing discard protection.
- Register discard protection through WindowManager close guards and isolate studio shortcuts to the active window, because drawing must not override other desktop applications.

- Dispatch desktop and editor shortcuts through ShortcutSystem and registered app actions; Forge has no duplicate key listener, so custom bindings and context safeguards apply consistently.
- Observe shortcut cancellation failures in the existing dispatcher only; never infer OS interception from missing events, because browsers cannot expose keystrokes they never receive.
- Store user-created virtual folders in the existing IndexedDB library and hydrate the shared directory projection on filesystem reads, so Files and the terminal see the same durable paths.
