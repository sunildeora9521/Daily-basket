// POST /api/wallet {action}  (Authorization: Bearer)  — get | apply_referral | hold | release
const L = require('../serverlib'); const W = require('../walletlib');
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const me = await L.bearer(req); if (!me || me.role === 'admin' || me.role === 'rider' || me.role === 'shop' || me.role === 'partner') return L.fail(res, 401, 'Customer login chahiye');
  const uid = me.uid, b = req.body || {}, d = L.db();
  try {
    if (!(await L.rl('wal_' + uid, 80, 600))) return L.fail(res, 429, 'Bahut zyada requests');
    if (b.action === 'get') {
      await W.expireHolds(uid).catch(() => {}); const w = await W.ensure(uid), x = (await w.ref.get()).data(), mk = W.monthKey();
      const q = await d.collection('wallet_tx').where('uid', '==', uid).get(), hist = []; q.forEach(s => { const t = s.data(); hist.push({ type: t.type, points: t.points, ms: t.ms, note: t.note || '' }); });
      hist.sort((a, c) => c.ms - a.ms);
      return L.ok(res, { points: x.points || 0, refCode: x.refCode, referred: !!x.referredBy, refRewarded: !!x.refRewarded, refMonthEarned: x.refMonth === mk ? (x.refMonthEarned || 0) : 0, cap: W.CAP, refPts: W.REF_PTS, minOrder: W.MIN_REF_ORDER, history: hist.slice(0, 25) });
    }
    if (b.action === 'apply_referral') {
      const code = String(b.code || '').trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(code)) return L.fail(res, 400, 'Code galat hai');
      const w = await W.ensure(uid); if (w.data.referredBy) return L.fail(res, 400, 'Aap pehle hi referral code laga chuke ho');
      if (w.data.refCode === code) return L.fail(res, 400, 'Apna khud ka code nahi laga sakte');
      const done = await d.collection('orders').where('userId', '==', uid).where('status', '==', 'delivered').limit(1).get(); const done2 = await d.collection('mall_orders').where('userId', '==', uid).where('status', '==', 'delivered').limit(1).get();
      if (!done.empty || !done2.empty) return L.fail(res, 400, 'Referral code sirf pehle order se pehle lagta hai');
      const q = await d.collection('wallets').where('refCode', '==', code).limit(1).get(); if (q.empty) return L.fail(res, 404, 'Ye code mila nahi');
      const rid = q.docs[0].id, rd = q.docs[0].data(); if (rid === uid || rd.referredBy === uid) return L.fail(res, 400, 'Ye code use nahi ho sakta');
      await w.ref.update({ referredBy: rid, referredMs: Date.now() });
      return L.ok(res, { message: 'Code lag gaya! Pehla order (₹' + W.MIN_REF_ORDER + '+) deliver hone par aapke dost ko ' + W.REF_PTS + ' points milenge.' });
    }
    if (b.action === 'hold') {
      const pts = Math.floor(Number(b.points) || 0); if (pts < 100 || pts % 10 !== 0 || pts > 100000) return L.fail(res, 400, 'Kam se kam 100 points (10 ke multiple) chahiye');
      const id = await W.hold(uid, pts); return L.ok(res, { holdId: id, points: pts, discount: pts / 10 });
    }
    if (b.action === 'release') { const back = await W.releaseHold(String(b.holdId || ''), uid); return L.ok(res, { refunded: back }); }
    return L.fail(res, 400, 'Invalid action');
  } catch (e) { console.error('wallet', e.message); return L.fail(res, e.message.includes('kaafi') ? 400 : 500, e.message.includes('kaafi') ? e.message : 'Server error'); }
};
