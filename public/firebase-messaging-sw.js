importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config comes from the registration query string (service workers cannot read app env).
// Firebase shows background notifications and opens fcm_options.link when tapped.
firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();
