import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enablePush, type PushResult } from '@/lib/firebase-push';
import { registerPushToken } from '@/lib/push-tokens.functions';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [lastStatus, setLastStatus] = useState<PushResult['status'] | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);

        // Do NOT register /sw.js here: it is a cleanup/kill-switch worker that
        // unregisters itself and re-navigates open clients, causing reload
        // glitches (landing page / blank screen flashes) during navigation.
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) setRegistration(reg);
        } catch {
          /* ignore */
        }
      }
    };
    
    checkSupport();
  }, []);

  // When permission is already granted, (re)register this device so pushes
  // arrive even with the app closed. Asking for permission needs a tap.
  useEffect(() => {
    if (!user || !isSupported || permission !== 'granted') return;
    enablePush(false)
      .then(async (r) => {
        if (r.status === 'registered') {
          await registerPushToken({ data: { token: r.token, user_agent: navigator.userAgent.slice(0, 500) } });
        }
      })
      .catch((e) => console.error('Push registration failed:', e));
  }, [user?.id, isSupported, permission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const r = await enablePush(true);
      setPermission(Notification.permission);
      setLastStatus(r.status);
      if (r.status === 'registered') {
        await registerPushToken({ data: { token: r.token, user_agent: navigator.userAgent.slice(0, 500) } });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions & { url?: string; taskId?: string }) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Cannot show notification - not supported or permission denied');
      return false;
    }

    try {
      if (registration) {
        await registration.showNotification(title, {
          body: options?.body,
          icon: options?.icon || '/favicon.ico',
          badge: '/favicon.ico',
          data: {
            url: options?.url || '/dashboard',
            taskId: options?.taskId
          }
        });
        return true;
      } else {
        // Fallback to regular notification
        new Notification(title, options);
        return true;
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, registration]);

  return {
    isSupported,
    permission,
    requestPermission,
    lastStatus,
    showNotification,
    isEnabled: permission === 'granted'
  };
}
