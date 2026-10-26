# NEXUS OS Phase 1
## Desktop context menus
- [ ] Verify desktop/icon actions, submenu keyboard controls, edge placement and app-owned right-click behavior; fix discovered issues.
## Desktop enhancement pack
- [x] Phase 2: connected Task Manager; preview search, minimize, restore/switch and close checks passed.
- [x] Phase 3: durable local profile; preview wrong/correct PIN, no-PIN unlock and retained-window checks passed.
- [x] Phase 4: shared-library widgets; preview clock dragging, position persistence and hide persistence checks passed.
- [x] Phase 1: real project-save notifications; preview read/all-read, dismiss/clear, folder navigation and refresh persistence checks passed; notification unit tests passed.
## Keyboard shortcuts
- [x] Update Windows-style bindings and clickable palette fallback; verify preview actions (automated Chromium, not physical OS interception).
- [ ] Test published shortcuts — blocked until a published application is available.
- [x] Add shared configurable dispatch, window controls, launcher, palette and searchable help.
- [x] Wire safe Files, Notes and Forge actions and persistent folder creation.
- [x] Verify bindings, contexts, persistence, destructive confirmations and existing tests.
- [x] Verify Arcade input stays isolated from Notes and Command Palette; inactive/minimized games remain paused on restore (preview Chromium).
## PIXEL//FORGE filesystem integration
- [x] Connect project saves and image exports to the shared IndexedDB filesystem projection.
- [x] Connect Files open/rename/delete/move and terminal ls/cd/cat.
- [x] Verify draw/save/open/edit/save/refresh/reopen and no duplicate records.

## PIXEL//FORGE
- [x] Implement drawing engine, tools, coordinates and real undo/redo.
- [x] Add editable layers, project persistence, image import/export and discard protection.
- [x] Integrate studio, advanced controls, isolated shortcuts and smaller-screen layout.
- [x] Test drawing, layers, saving/reopening, exports, imports and zoom/resizing.

- [x] Build desktop shell, boot sequence, shortcuts, clocks and simulated status.
- [x] Implement centralized reusable window controls and taskbar state.
- [x] Add safe terminal commands and five lightweight application previews.
- [x] Verify interactions and desktop/mobile layouts.

## Notes and Media
- [x] Add local durable storage for notes and audio blobs.
- [x] Implement note creation, editing, autosave, manual save, search and confirmed deletion.
- [x] Implement media imports, playlist, real playback and player controls.
- [x] Verify refresh/window persistence, errors and narrow layouts.
## NEXUS Arcade
- [x] Shared progression (XP, ranks, achievements, cosmetics) with localStorage.
- [x] VIRUS RUN, BREACH PROTOCOL and ZERO DAY playable with pause/restart/summary.
- [x] Secrets: terminal bonus command, hidden achievement and theme.
- [x] Logic tests and browser play-through.
