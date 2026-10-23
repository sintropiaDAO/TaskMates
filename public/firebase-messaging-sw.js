importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();

// Open (or focus) the app on the right page when the notification is tapped.
self.addEventListener('notificationclick', (event) => {
  const url = event.notification?.data?.FCM_MSG?.data?.url || event.notification?.data?.url || '/dashboard';
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if ('focus' in c) {
          await c.focus();
          if ('navigate' in c) { try { await c.navigate(url); } catch (e) {} }
          return;
        }
      }
      await clients.openWindow(url);
    })(),
  );
});
