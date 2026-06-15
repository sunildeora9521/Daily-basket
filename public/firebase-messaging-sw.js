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

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Daily Basket';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200]
  });
});
