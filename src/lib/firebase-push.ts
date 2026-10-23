import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as string | undefined;
const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as string | undefined;
const firebaseConfig = {
  apiKey: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as string | undefined) ?? '',
  projectId: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as string | undefined) ?? '',
  appId: appId ?? '',
  messagingSenderId: appId?.split(':')[1] ?? '',
};

export type PushResult =
  | { status: 'registered'; token: string }
  | { status: 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied' | 'needs-install' };

const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

/** Gets this device's push token. Set ask=true only from a tap (browsers require it). */
export async function enablePush(ask: boolean): Promise<PushResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId) {
    return { status: 'not-configured' };
  }
  if (window.top !== window.self) return { status: 'open-in-new-tab' };
  if (isIOS() && !isStandalone()) return { status: 'needs-install' };
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    return { status: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default' && ask) permission = await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' };

  const query = new URLSearchParams(firebaseConfig).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
    { scope: SW_SCOPE },
  );
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  if (!token) return { status: 'denied' };

  // Foreground notifications are already shown by the in-app realtime listeners.
  return { status: 'registered', token };
}
