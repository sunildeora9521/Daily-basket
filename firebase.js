import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY'
      });
      console.log('FCM Token:', token);
      return token;
    }
  } catch(err) {
    console.log('Notification error:', err);
  }
};

export { onMessage };
export default app;
