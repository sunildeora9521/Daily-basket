import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { topic, title, body, token } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  try {
    const messaging = getMessaging();
    const message = {
      notification: { title, body },
      android: { notification: { sound: 'default', priority: 'high' } },
      apns: { payload: { aps: { sound: 'default' } } },
    };
    const result = token
      ? await messaging.send({ ...message, token })
      : await messaging.send({ ...message, topic });
    return res.status(200).json({ success: true, result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
