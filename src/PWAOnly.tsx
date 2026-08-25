import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
};

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(
    window as Window & { MSStream?: unknown }
  ).MSStream;
}

export default function PWAOnly({
  children,
}: {
  children: ReactNode;
}) {
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
        setStandalone(isStandalone());

        function handleBeforeInstallPrompt(event: Event) {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        }

        function handleAppInstalled() {
            setInstallPrompt(null);
        }

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt,
        );

        window.addEventListener(
            'appinstalled',
            handleAppInstalled,
        );

        return () => {
            window.removeEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt,
            );

            window.removeEventListener(
            'appinstalled',
            handleAppInstalled,
            );
        };
        }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  if (standalone === null) {
    return null;
  }

  if (!standalone) {
    const ios = isIOS();

    return (
      <div className="pwa-required">
        <div className="pwa-required-card">
          <div className="pwa-required-logo">
            <img
              src="/pwa-192x192.png"
              alt="Summer Takeoff"
            />
          </div>

          <h1>Summer Takeoff Staff</h1>

          <p className="pwa-required-text">
            Az alkalmazás használatához telepítsd az
            alkalmazást a készülékedre.
          </p>

          {ios ? (
            <div className="pwa-required-instructions">
              <strong>iPhone / iPad</strong>

              <p>
                Nyomd meg a <strong>Megosztás</strong> gombot,
                majd válaszd a{' '}
                <strong>Hozzáadás a főképernyőhöz</strong>{' '}
                lehetőséget.
              </p>
            </div>
          ) : installPrompt ? (
            <>
              <button
                type="button"
                className="pwa-install-button"
                onClick={handleInstall}
              >
                Telepítés
              </button>

              <p className="pwa-required-hint">
                A telepítés után a főképernyőről indítsd az
                alkalmazást.
              </p>
            </>
          ) : (
            <div className="pwa-required-instructions">
              <strong>Telepítés</strong>

              <p>
                A böngésző menüjében keresd a{' '}
                <strong>Telepítés</strong> vagy{' '}
                <strong>Hozzáadás a főképernyőhöz</strong>{' '}
                lehetőséget.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}