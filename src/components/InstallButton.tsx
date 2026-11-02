import { useEffect, useState } from 'react';

// Floating PWA install button. Appears only when the browser offers an
// install prompt (beforeinstallprompt) and the app is not already installed.
// Falls back to manual instructions when the prompt isn't available.
export function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showTip, setShowTip] = useState(false);
  const [installed, setInstalled] = useState(false);

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

  if (installed) return null;

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
      <button
        onClick={handleClick}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/50 transition hover:bg-red-500 active:scale-95"
        type="button"
      >
        ⚡ INSTALL APP
      </button>
      {showTip && (
        <div className="fixed bottom-20 left-1/2 z-[9999] w-[88vw] max-w-sm -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm text-slate-100 shadow-2xl">
          To install: open your browser menu (⋮) and tap "Install app" or "Add to Home screen".
        </div>
      )}
    </>
  );
}
