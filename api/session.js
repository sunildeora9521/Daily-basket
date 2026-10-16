// POST /api/session
//   {token, userOtp, name}   -> OTP sahi hone par Firebase custom token (uid = ph_<phone>)
//   {restore:true, deviceKey}-> isi device ka purana session wapas (portal switch ke baad)
//   {revoke:true, deviceKey} -> logout par device key hatao
const L = require('../serverlib');
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const b = req.body || {};
  try {
    if (b.revoke && b.deviceKey) { await L.db().collection('devices').doc(L.sha(b.deviceKey)).delete().catch(() => {}); return L.ok(res); }
    if (b.restore) {
      if (!(await L.rl('restore_' + L.ip(req), 30, 3600))) return L.fail(res, 429, 'Bahut zyada requests');
      const s = await L.db().collection('devices').doc(L.sha(String(b.deviceKey || ''))).get();
      if (!s.exists || Date.now() - (s.data().createdMs || 0) > 90 * 864e5) return L.fail(res, 401, 'Session expired — dobara login karo');
      const uid = s.data().uid, phone = s.data().phone;
      const customToken = await L.auth().createCustomToken(uid, { role: 'customer', phone });
      return L.ok(res, { customToken, uid, phone });
    }
    const { token, userOtp, name } = b;
    if (!token || !userOtp) return L.fail(res, 400, 'Missing fields');
    let n = ''; try { n = JSON.parse(Buffer.from(String(token).split('.')[0], 'base64url').toString()).n; } catch (e) {}
    if (!n || !(await L.rl('v_' + n, 6, 600))) return L.fail(res, 429, 'Bahut zyada galat try. Naya OTP mangao.');
    const p = L.checkOtp(token, userOtp, 'login');
    if (!p) return L.fail(res, 400, 'Galat OTP! Dobara check karo.');
    if (!(await L.useOnce(n))) return L.fail(res, 400, 'Ye OTP pehle hi use ho chuka hai');
    const phone = p.s, uid = 'ph_' + phone;
    await L.db().collection('users').doc(uid).set({ name: L.clean(name, 40) || 'Customer', phone, updatedAt: new Date() }, { merge: true });
    const customToken = await L.auth().createCustomToken(uid, { role: 'customer', phone });
    const crypto = require('crypto'), deviceKey = crypto.randomBytes(32).toString('hex');
    await L.db().collection('devices').doc(L.sha(deviceKey)).set({ uid, phone, createdMs: Date.now() });
    return L.ok(res, { customToken, uid, phone, deviceKey });
  } catch (e) { console.error('session', e.message); return L.fail(res, 500, 'Server error'); }
};
