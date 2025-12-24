import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Register service worker
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          setRegistration(reg);
          console.log('Service Worker registered:', reg);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };
    
    checkSupport();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
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
    showNotification,
    isEnabled: permission === 'granted'
  };
}
