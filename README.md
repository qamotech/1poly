# 🎲🏘️ 1poly

**React and TypeScript board-and-card game project with property trading, auctions, bankruptcy flows, game rules, AI modules, and a Socket.IO server.**

🏷️ Maintained in [qamotech/1poly](https://github.com/qamotech/1poly) · 🌐 Public repository

## ✨ What is here

- 🎲 Board, dice, lobby, HUD, and turn-notification components.
- 🏘️ Property management, auctions, trades, and bankruptcy dialogs.
- 🃏 Separate card-game engine, cards, AI, and views.
- 🌐 Express/Socket.IO server and production build commands.

## 🧭 Try the project

Start the Node server, enter the lobby, explore a match, and test property and trade flows. Compare the board and card modes before changing shared rules.

## 🚀 Local setup

```sh
git clone https://github.com/qamotech/1poly.git
cd 1poly
```

Use Node.js and npm compatible with the versions in `package.json`. Install dependencies locally, then launch the declared development command:

```sh
npm install
npm run dev
```

Open the address printed by the development server. The manifest is the source of truth for commands:

| Command | Declared operation |
|---|---|
| `npm run dev` | `tsx server.ts` |
| `npm run build` | `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` |
| `npm run start` | `node dist/server.cjs` |
| `npm run preview` | `vite preview` |
| `npm run clean` | `rm -rf dist server.js` |
| `npm run lint` | `tsc --noEmit` |

Install/build scripts can execute code. Inspect project configuration and keep secrets in local configuration excluded from Git. No dependency installation or application build was performed for this documentation update.

## 🗂️ Source map

- 📄 [`fix_hud.ts`](fix_hud.ts)
- 📄 [`fix_rent.ts`](fix_rent.ts)
- 📄 [`index.html`](index.html)
- 📄 [`metadata.json`](metadata.json)
- 📄 [`package-lock.json`](package-lock.json)
- 📄 [`package.json`](package.json)
- 📄 [`patch.cjs`](patch.cjs)
- 📄 [`patch_app.ts`](patch_app.ts)
- 📄 [`patch_board.ts`](patch_board.ts)
- 📄 [`patch_board_anim.ts`](patch_board_anim.ts)
- 📄 [`patch_hud.ts`](patch_hud.ts)
- 📄 [`patch_modal.ts`](patch_modal.ts)
- 📄 [`src`](src) — source directory
- 📄 [`public`](public) — source directory
- 📄 [`assets`](assets) — source directory

## ⚙️ Configuration & data

This app needs its Node server for server-backed features; static hosting alone does not reproduce that runtime. Review game-name, artwork, and audio rights before redistribution.

Keep credentials, private exports, customer records, and personal information out of commits and screenshots. A local browser demo is not evidence of account security, reliable persistence, or connected external services. Preserve exports before changing storage keys or resetting an application.

## 🧪 Verification checklist

- 🔎 Confirm the entry file and asset paths above exist in your checkout.
- ▶️ Start the documented runtime and inspect browser or terminal errors.
- 🧭 Exercise the project-specific workflow described above using sample data.
- 📱 Check narrow and wide layouts when the project has a browser interface.
- 💾 Verify save/export and recovery behavior before trusting important work to it.
- 📝 Record the exact command, browser, operating system, and outcome of your checks.

This guide was prepared from repository files and manifests. It does not claim a fresh build, deployment, security audit, or full functional test of this project.

## 🤝 Contributions & useful reports

Keep changes focused and explain the user-visible result. Preserve existing assets and configuration unless a change requires updating them. Include reproduction steps, expected and actual behavior, and relevant screenshots with personal information removed. For UI work, include the viewport and browser; for runtime issues, include the command and error text.

## 🛠️ Maintenance priorities

- 📚 Keep this guide aligned with implemented behavior and current entry points.
- 🧪 Add or maintain checks for the core workflow before expanding features.
- ♿ Review labels, keyboard navigation, contrast, and responsive layout.
- 📦 Document external services, asset rights, and deployment prerequisites.

## 📜 Licensing & attribution

This documentation update does not grant a new software or asset license. Consult existing license files, source headers, package metadata, and original asset terms; resolve inconsistencies with the owner before redistribution. Third-party names and resources retain their own terms.
