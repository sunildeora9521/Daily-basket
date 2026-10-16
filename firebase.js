import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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

// Offline-first cache: kamzor network me bhi app turant khulta hai (multi-tab safe). Na chale to normal Firestore.
let _db;
try { _db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (err) { _db = getFirestore(app); }
export const db = _db;

let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch(err) {
  console.log('Firebase messaging not supported:', err);
}
export { messaging };

/* ───── secure server calls ───── */
export const apiPost = async (path, body, withAuth) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (withAuth && auth.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken();
    const r = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
    return await r.json();
  } catch (e) { return { success: false, error: 'Internet check karo' }; }
};
export const signInToken = (customToken) => signInWithCustomToken(auth, customToken);
// Portal switch / purana session: isi device ka customer session bina OTP ke wapas
export const restoreCustomer = async () => {
  try {
    const k = localStorage.getItem('db_devkey'); if (!k) return false;
    const j = await apiPost('/api/session', { restore: true, deviceKey: k });
    if (!j.success) return false;
    await signInWithCustomToken(auth, j.customToken); return j;
  } catch (e) { return false; }
};
// Server ko batao "kya hua" — kise push jayega ye server khud verify karke tay karta hai
export const notifyEvent = async (event, data) => {
  try { const j = await apiPost('/api/notify', { event, ...(data || {}) }, true); return !!j.success; } catch (e) { return false; }
};

export const requestNotificationPermission = async (topic) => {
  try {
    if (!messaging) return null;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BHhAER8KU6I-KU-o8HoeaTVfRsIEn4OmvmzuYcF5VGYJUgOmeoVpNnHAU2YhxUz-mOXLbY1EXLC8jn_RqeRx3U4'
      });
      let subStatus = 'skipped';
      if (token) {
        // Topic server role ke hisaab se khud tay karta hai (login zaroori)
        const j = await apiPost('/api/subscribe', { token, topic }, true);
        subStatus = j.success ? 'ok' : ('error: ' + (j.error || 'not signed in'));
      }
      return { token, subStatus };
    }
  } catch (err) {
    console.log('Notification error:', err);
  }
  return null;
};

export const onMessage = (msgInstance, callback) => {
  try {
    if (!msgInstance) return () => {};
    return fbOnMessage(msgInstance, callback);
  } catch (err) {
    console.log('onMessage error:', err);
    return () => {};
  }
};

export default app;
