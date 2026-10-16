// POST /api/subscribe {token}  (Authorization: Bearer <Firebase ID token>)
// Topic ab server tay karta hai (role ke hisaab se) — koi bhi khud ko 'admin'/'riders' me subscribe nahi kar sakta.
const L = require('../serverlib');
const ALL = ['customers', 'riders', 'shops', 'admin', 'drivers', 'mall_shops'];
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const me = await L.bearer(req); if (!me) return L.fail(res, 401, 'Login chahiye');
  const token = String((req.body || {}).token || ''); if (token.length < 50 || token.length > 4096) return L.fail(res, 400, 'Invalid token');
  try {
    if (!(await L.rl('sub_' + me.uid, 30, 3600))) return L.fail(res, 429, 'Bahut zyada requests');
    const want = L.isAdmin(me) ? 'admin' : me.role === 'rider' ? 'riders' : me.role === 'shop' ? 'shops' : me.role === 'partner' ? (me.ptype === 'cab' ? 'drivers' : 'mall_shops') : 'customers';
    const m = L.msg();
    await m.subscribeToTopic(token, want);
    await Promise.allSettled(ALL.filter(t => t !== want).map(t => m.unsubscribeFromTopic(token, t)));
    await L.db().collection('push_tokens').doc(L.sha(token)).set({ token, uid: me.uid, role: me.role || 'customer', pid: me.pid || '', ptype: me.ptype || '', topic: want, ts: Date.now() });
    return L.ok(res, { topic: want });
  } catch (e) { console.error('subscribe', e.message); return L.fail(res, 500, 'Server error'); }
};
