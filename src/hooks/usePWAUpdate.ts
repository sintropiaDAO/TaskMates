import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Get current registration
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setRegistration(reg);
          
          // Check for updates on load
          reg.update();

          // Listen for new service worker waiting
          if (reg.waiting) {
            setNeedRefresh(true);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setNeedRefresh(true);
                }
              });
            }
          });
        }
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check for updates periodically (every 30 seconds)
      const interval = setInterval(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update();
          }
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      // Tell waiting SW to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
}
