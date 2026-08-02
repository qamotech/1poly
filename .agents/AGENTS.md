# ⚡ High-Speed, High-Accuracy App & Game Revision Protocol

## 1. Scope & Constant Guarding
- **Top-Level Constant Scope:** Always declare game/app constants (`CHARACTERS`, `PROPERTIES`, `CONFIG`) at the top of the main script scope BEFORE any initialization functions or render calls run to prevent Temporal Dead Zone (`ReferenceError`) bugs.
- **Deferred Bootstrapping:** Never execute initialization functions (`initGame()`, `startApp()`) inline during initial script parsing. Always defer execution to `window.addEventListener('DOMContentLoaded')` or user action after all event listeners and DOM elements are registered.

## 2. Fast Automated Verification & Syntax Checks
- **Node.js AST Syntax Validation:** Always run a quick Node syntax validation script (`node -e "new Function(script)"`) after editing JS files before declaring completion.
- **Empirical Browser Console Log Inspections:** Autonomously run the browser subagent to verify zero console errors, inspect uncaught exceptions, and test interactive button click handlers.

## 3. Mobile-First Ergonomic Standards
- **Viewport Testing:** Validate layouts across phone (375px), tablet (683px), and desktop (1600px) viewports.
- **Interactive Control States:** Ensure all interactive elements set both visual opacities (`opacity: 0.4`) and pointer events (`pointer-events: none`) when disabled, and enable local single-device fallback controls when offline.

## 4. Local Development Tooling
- Use `http-server` for serving static web applications locally during development (`http-server -p 8080`).
