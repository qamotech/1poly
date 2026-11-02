import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { GameViewProvider } from './context/GameViewContext.tsx';
import './index.css';

// Handle harmless Vite HMR WebSocket disconnects in sandbox environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (String(reason.message || reason).includes('WebSocket') ||
       String(reason.message || reason).includes('vite') ||
       String(reason).includes('WebSocket closed without opened'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  window.addEventListener('error', (event) => {
    if (
      event.message &&
      (event.message.includes('WebSocket') ||
       event.message.includes('[vite]') ||
       event.message.includes('WebSocket closed without opened'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

// Register the PWA service worker (production only). The SW caches static
// assets for fast loads; it never intercepts socket.io traffic.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameViewProvider>
      <App />
    </GameViewProvider>
  </StrictMode>,
);

