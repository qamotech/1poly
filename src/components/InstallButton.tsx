import { useEffect, useState } from 'react';

// Floating PWA install button. When the browser offers a real install
// prompt (beforeinstallprompt) the tap fires it directly. Where no prompt
// exists — iOS Safari, Samsung Internet, Firefox, and Amazon's Silk browser
// on Fire tablets — the tap opens a stay-open instruction card with the
// exact steps for THAT browser (the old 4-second generic tip was too fast
// to follow and wrong for Silk).

interface InstallGuide {
  title: string;
  steps: string[];
}

function guideFor(ua: string): InstallGuide {
  // Amazon Fire tablets: Silk browser (UA carries "Silk" and/or a KF model).
  if (/Silk|Kindle|Amazon/i.test(ua) || /\bKF[A-Z]{2,}/.test(ua)) {
    return {
      title: '📲 Add 1poly on your Fire tablet',
      steps: [
        'Tap the menu (⋮) at the top right of the Silk browser',
        'Tap “Add to Home Screen”',
        'Tap “Add” — 1poly lands on your home screen like an app 🎉',
      ],
    };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      title: '📲 Add 1poly to your Home Screen',
      steps: [
        'Tap the Share button (the box with an ↑) in Safari',
        'Scroll down and tap “Add to Home Screen”',
        'Tap “Add” — done! 🎉',
      ],
    };
  }
  if (/SamsungBrowser/i.test(ua)) {
    return {
      title: '📲 Install 1poly',
      steps: [
        'Tap the menu (☰) at the bottom right',
        'Tap “Add page to”, then “Home screen”',
        'Tap “Add” — done! 🎉',
      ],
    };
  }
  if (/Firefox/i.test(ua)) {
    return {
      title: '📲 Add 1poly to your Home Screen',
      steps: [
        'Tap the menu (⋮) at the top right',
        'Tap “Add to Home screen”',
        'Tap “Add” — done! 🎉',
      ],
    };
  }
  return {
    title: '📲 Install 1poly',
    steps: [
      'Tap the menu (⋮) at the top right of your browser',
      'Tap “Install app” (or “Add to Home screen”)',
      'Confirm — 1poly lands on your home screen 🎉',
    ],
  };
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  // The × hides the pill for the rest of this visit (sessionStorage, so it
  // comes back next time the app is opened fresh).
  const [dismissed, setDismissed] = useState<boolean>(
    () => sessionStorage.getItem('1poly-install-dismissed') === '1'
  );

  const handleDismiss = () => {
    sessionStorage.setItem('1poly-install-dismissed', '1');
    setDismissed(true);
    setShowGuide(false);
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
      setShowGuide(true);
    }
  };

  const guide = guideFor(window.navigator.userAgent);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={handleClick}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/50 transition hover:bg-red-500 active:scale-95 fx-install-pulse"
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
      {showGuide && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuide(false)}>
          <div
            className="w-full max-w-sm rounded-3xl border-2 border-red-500/50 bg-slate-900 px-5 py-5 text-slate-100 shadow-2xl fx-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-black">{guide.title}</h3>
              <button
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-sm font-bold text-slate-200 hover:bg-slate-700 active:scale-90 cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>
            <ol className="space-y-2.5">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition active:scale-95 cursor-pointer"
              type="button"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
