import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// PWA icons travel as base64 text (icons/*.png.b64) because the repo push
// path is text-only; decode them into public/ at build start so vite copies
// real PNGs into dist.
function iconDecodePlugin() {
  return {
    name: '1poly-icons',
    buildStart() {
      for (const size of [192, 512]) {
        const src = path.resolve(__dirname, `icons/icon-${size}.png.b64`);
        if (fs.existsSync(src)) {
          const data = Buffer.from(fs.readFileSync(src, 'utf8').replace(/\s+/g, ''), 'base64');
          fs.writeFileSync(path.resolve(__dirname, `public/icon-${size}.png`), data);
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [iconDecodePlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
