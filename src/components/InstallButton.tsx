import { useEffect, useState } from 'react';

// Floating PWA install button. Appears only when the browser offers an
// install prompt (beforeinstallprompt) and the app is not already installed.
// Falls back to manual instructions when the prompt isn't available.
export function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showTip, setShowTip] = useState(false);
  const [installed, setInstalled] = useState(false);
  // The × hides the pill for the rest of this visit (sessionStorage, so it
  // comes back next time the app is opened fresh).
  const [dismissed, setDismissed] = useState<boolean>(
    () => sessionStorage.getItem('1poly-install-dismissed') === '1'
  );

  const handleDismiss = () => {
    sessionStorage.setItem('1poly-install-dismissed', '1');
    setDismissed(true);
    setShowTip(false);
  };

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const handleClick = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 4200);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={handleClick}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/50 transition hover:bg-red-500 active:scale-95"
          type="button"
        >
          ⚡ INSTALL APP
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install button"
          title="Dismiss"
          className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xs font-bold text-slate-200 shadow-md transition hover:bg-slate-700 active:scale-90"
          type="button"
        >
          ✕
        </button>
      </div>
      {showTip && (
        <div className="fixed bottom-20 left-1/2 z-[9999] w-[88vw] max-w-sm -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm text-slate-100 shadow-2xl">
          To install: open your browser menu (⋮) and tap "Install app" or "Add to Home screen".
        </div>
      )}
    </>
  );
}
