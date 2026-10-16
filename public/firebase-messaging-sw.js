importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC2AKNq6YSU_NYMU7eSYC8Gm-o84SDW99E",
  authDomain: "daily-basket-25d1a.firebaseapp.com",
  projectId: "daily-basket-25d1a",
  storageBucket: "daily-basket-25d1a.firebasestorage.app",
  messagingSenderId: "852431532900",
  appId: "1:852431532900:web:abb9ceb9c49586a4934071"
});

const messaging = firebase.messaging();

// Server ab data-only push bhejta hai (title/body/url/tag) — yahin se notification dikhti hai (duplicate nahi)
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {}, n = payload.notification || {};
  const title = d.title || n.title || 'Daily Basket';
  self.registration.showNotification(title, {
    body: d.body || n.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [200, 100, 200],
    data: { url: d.url || '/' }
  });
});

// Notification tap karne par app khule / focus ho
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { return c.focus(); } }
      return clients.openWindow(url);
    })
  );
});
