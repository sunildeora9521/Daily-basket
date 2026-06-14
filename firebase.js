import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage as fbOnMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyC2AKNq6YSU_NYMU7eSYC8Gm-o84SDW99E",
  authDomain: "daily-basket-25d1a.firebaseapp.com",
  projectId: "daily-basket-25d1a",
  storageBucket: "daily-basket-25d1a.firebasestorage.app",
  messagingSenderId: "852431532900",
  appId: "1:852431532900:web:abb9ceb9c49586a4934071"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch(err) {
  console.log('Firebase messaging not supported:', err);
}
export { messaging };

export const requestNotificationPermission = async (topic) => {
  try {
    if (!messaging) return null;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BHhAER8KU6I-KU-o8HoeaTVfRsIEn4OmvmzuYcF5VGYJUgOmeoVpNnHAU2YhxUz-m0XLbY1EXLC8jn_RqeRx3U4'
      });
      console.log('FCM Token:', token);
      if (token && topic) {
        try {
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ token, topic })
          });
        } catch(e) { console.log('Subscribe error:', e); }
      }
      return token;
    }
  } catch(err) {
    console.log('Notification error:', err);
  }
  return null;
};

export const onMessage = (msgInstance, callback) => {
  try {
    if (!msgInstance) return () => {};
    return fbOnMessage(msgInstance, callback);
  } catch(err) {
    console.log('onMessage error:', err);
    return () => {};
  }
};

export default app;
