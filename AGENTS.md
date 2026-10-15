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
- Keep Phase 1 state in React memory with no persistence or backend dependencies, because each load is an isolated local desktop session.
- Inline positioning styles are limited to state-driven window geometry; all visual design values belong to semantic global CSS tokens.
