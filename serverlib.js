// serverlib.js — shared helpers for all /api functions (CommonJS, repo root me rakhna)
const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

function init() {
  if (!getApps().length) {
    initializeApp({ credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }) });
  }
}
const db = () => { init(); return getFirestore(); };
const auth = () => { init(); return getAuth(); };
const msg = () => { init(); return getMessaging(); };

/* ───── tiny utils ───── */
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const b64u = s => Buffer.from(s).toString('base64url');
const safeEq = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const ip = req => String((req.headers && req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '?').trim();
const clean = (s, m = 60) => String(s == null ? '' : s).replace(/[<>`"\\]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, m);
const mask = e => String(e || '').replace(/(.{2}).*(@.*)/, '$1***$2');
const genPass = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let o = ''; for (let i = 0; i < 10; i++) o += A[crypto.randomInt(A.length)]; return o; };

/* ───── http helpers ───── */
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
const ok = (res, o = {}) => res.status(200).json({ success: true, ...o });
const fail = (res, code, error) => res.status(code).json({ success: false, error });

/* ───── rate limit (Firestore counter, serverless me bhi chalta hai) ───── */
async function rl(key, max, sec) {
  const ref = db().collection('sec_rl').doc(sha(key)), now = Date.now();
  return db().runTransaction(async tx => {
    const s = await tx.get(ref); let d = s.exists ? s.data() : { n: 0, t: now };
    if (now - d.t > sec * 1000) d = { n: 0, t: now };
    if (d.n >= max) return false;
    d.n++; tx.set(ref, d); return true;
  });
}
async function useOnce(nonce) { // replay protection
  try { await db().collection('sec_used').doc(String(nonce)).create({ t: Date.now() }); return true; } catch (e) { return false; }
}

/* ───── OTP token: OTP token ke andar NAHI hota, sirf signature me bandha hota hai ───── */
const secret = () => { const s = process.env.OTP_SECRET; if (!s || s.length < 16) throw new Error('OTP_SECRET env set karo (kam se kam 16 characters)'); return s; };
const hmac = s => crypto.createHmac('sha256', secret()).update(s).digest('base64url');
function makeOtp(kind, subject, ttlSec = 300, extra = {}) {
  const otp = String(crypto.randomInt(100000, 1000000));
  const raw = b64u(JSON.stringify({ k: kind, s: subject, e: Date.now() + ttlSec * 1000, n: crypto.randomBytes(8).toString('hex'), ...extra }));
  return { otp, token: raw + '.' + hmac(raw + '|' + otp) };
}
function parse(token) { try { const [raw, sig] = String(token).split('.'); if (!raw || !sig) return null; return { raw, sig, p: JSON.parse(Buffer.from(raw, 'base64url').toString()) }; } catch (e) { return null; } }
function checkOtp(token, otp, kind) {
  const t = parse(token); if (!t || t.p.k !== kind || Date.now() > t.p.e) return null;
  const want = hmac(t.raw + '|' + String(otp || '').trim());
  if (want.length !== t.sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(t.sig))) return null;
  return t.p;
}
function makeProof(kind, subject, ttlSec, extra = {}) { const raw = b64u(JSON.stringify({ k: kind, s: subject, e: Date.now() + ttlSec * 1000, ...extra })); return raw + '.' + hmac(raw); }
function checkProof(proof, kind) { const t = parse(proof); if (!t || t.p.k !== kind || Date.now() > t.p.e) return null; const want = hmac(t.raw); if (want.length !== t.sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(t.sig))) return null; return t.p; }

/* ───── password hashing (scrypt + salt) ───── */
function hashPass(pw) { const salt = crypto.randomBytes(16).toString('hex'); return { algo: 'scrypt', salt, hash: crypto.scryptSync(String(pw), salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex') }; }
function verifyPass(pw, rec) {
  if (!rec || !rec.hash || !rec.salt) return false;
  const h = crypto.scryptSync(String(pw), rec.salt, 32, { N: 16384, r: 8, p: 1 }), e = Buffer.from(rec.hash, 'hex');
  return e.length === h.length && crypto.timingSafeEqual(h, e);
}

/* ───── senders ───── */
// sendSms / sendEmail: success par true, fail par chhota sa karan (string) — taaki pata chale kya galat hai
async function sendSms(phone, otp) {
  const key = (process.env.FAST2SMS_API_KEY || '').trim(); if (!key) return 'FAST2SMS_API_KEY env nahi hai';
  try {
    const r = await fetch('https://www.fast2sms.com/dev/bulkV2?route=otp&variables_values=' + otp + '&numbers=' + phone + '&flash=0', { headers: { authorization: key } });
    const j = await r.json().catch(() => ({}));
    if (j && j.return) return true;
    return 'Fast2SMS: ' + String((j && (Array.isArray(j.message) ? j.message.join(' ') : j.message)) || r.status).slice(0, 110);
  } catch (e) { return 'Fast2SMS network error'; }
}
async function sendEmail(to, name, otp) {
  const E = process.env, s = (E.EMAILJS_SERVICE_ID || '').trim(), t = (E.EMAILJS_TEMPLATE_ID || '').trim(), u = (E.EMAILJS_PUBLIC_KEY || '').trim(), k = (E.EMAILJS_PRIVATE_KEY || '').trim();
  if (!s || !t || !u) return 'EMAILJS service/template/public key env khali hain'; if (!k) return 'EMAILJS_PRIVATE_KEY env khali hai (EmailJS → Account → General → Private Key paste karo)'; if (!to) return 'email diya nahi';
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: s, template_id: t, user_id: u, accessToken: k, template_params: { to_email: to, to_name: clean(name, 40) || 'Customer', otp_code: otp, app_name: 'Daily Basket' } }) });
    if (r.ok) return true;
    const tx = await r.text().catch(() => ''); return 'EmailJS ' + r.status + ': ' + String(tx).slice(0, 110);
  } catch (e) { return 'EmailJS network error'; }
}

/* ───── Firebase ID token verify + claims ───── */
async function bearer(req) {
  const h = String(req.headers.authorization || ''); if (!/^Bearer /.test(h)) return null;
  try { return await auth().verifyIdToken(h.slice(7)); } catch (e) { return null; }
}
const isAdmin = d => !!(d && d.admin === true && Number(d.adminUntil) > Date.now());


/* ───── push helper: kisi user (uid) ke saare devices ko data-only push ───── */
async function pushToUid(uid, data) {
  const q = await db().collection('push_tokens').where('uid', '==', uid).get(); const toks = []; q.forEach(x => toks.push({ t: x.data().token, ref: x.ref }));
  if (!toks.length) return 0; let sent = 0;
  const r = await msg().sendEachForMulticast({ tokens: toks.map(x => x.t), data, android: { priority: 'high' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } });
  sent = r.successCount;
  await Promise.all(r.responses.map((x, i) => !x.success && x.error && /registration-token-not-registered|invalid-registration-token/.test(x.error.code || '') ? toks[i].ref.delete().catch(() => {}) : null));
  return sent;
}

module.exports = { pushToUid, db, auth, msg, FieldValue, sha, b64u, safeEq, ip, clean, mask, genPass, cors, ok, fail, rl, useOnce, makeOtp, checkOtp, makeProof, checkProof, hashPass, verifyPass, sendSms, sendEmail, bearer, isAdmin };
