// walletlib.js — points / referral ka server-side hisaab (client kabhi points nahi likh sakta)
const crypto = require('crypto');
const L = require('./serverlib');
const CAP = 200, REF_PTS = 50, MIN_REF_ORDER = 99, HOLD_MS = 15 * 60 * 1000;
const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const monthKey = () => new Date(Date.now() + 19800000).toISOString().slice(0, 7); // IST
const newCode = () => Array.from({ length: 6 }, () => CH[crypto.randomInt(CH.length)]).join('');
const d = () => L.db();

async function logTx(uid, type, points, extra) { await d().collection('wallet_tx').add({ uid, type, points, ms: Date.now(), ...(extra || {}) }); }

async function ensure(uid) {
  const ref = d().collection('wallets').doc(uid), s = await ref.get(); if (s.exists) return { ref, data: s.data() };
  let legacy = 0; try { const u = await d().collection('users').doc(uid).get(); if (u.exists) legacy = Math.max(0, Math.min(2000, Math.floor(Number(u.data().points) || 0))); } catch (e) {}
  let code = newCode(); for (let i = 0; i < 6; i++) { const q = await d().collection('wallets').where('refCode', '==', code).limit(1).get(); if (q.empty) break; code = newCode(); }
  const data = { points: legacy, earnedTotal: legacy, spentTotal: 0, refCode: code, referredBy: '', refRewarded: false, refMonth: monthKey(), refMonthEarned: 0, createdMs: Date.now() };
  await ref.create(data).catch(() => {});
  if (legacy) await logTx(uid, 'migrated', legacy, { note: 'Purane points' });
  return { ref, data: (await ref.get()).data() };
}
async function credit(uid, points, type, extra) {
  const w = await ensure(uid); await w.ref.update({ points: L.FieldValue.increment(points), ...(points > 0 ? { earnedTotal: L.FieldValue.increment(points) } : {}) });
  await logTx(uid, type, points, extra);
}
async function releaseHold(holdId, uid) {
  const hr = d().collection('wallet_holds').doc(String(holdId)); let back = 0;
  await d().runTransaction(async t => {
    const hs = await t.get(hr); if (!hs.exists) return; const h = hs.data(); if (h.uid !== uid || h.status !== 'open') return;
    t.update(hr, { status: 'refunded', refundedMs: Date.now() }); t.update(d().collection('wallets').doc(uid), { points: L.FieldValue.increment(h.points), spentTotal: L.FieldValue.increment(-h.points) }); back = h.points;
  });
  if (back) await logTx(uid, 'redeem_refund', back, { hold: holdId });
  return back;
}
async function expireHolds(uid) {
  const q = await d().collection('wallet_holds').where('uid', '==', uid).get(); const old = [];
  q.forEach(x => { const h = x.data(); if (h.status === 'open' && Date.now() - h.createdMs > HOLD_MS) old.push(x.id); });
  for (const id of old) await releaseHold(id, uid);
}
async function hold(uid, points) {
  const w = await ensure(uid); await expireHolds(uid);
  const id = crypto.randomBytes(8).toString('hex'), hr = d().collection('wallet_holds').doc(id);
  await d().runTransaction(async t => {
    const ws = await t.get(w.ref); if (!ws.exists || (ws.data().points || 0) < points) throw new Error('Points kaafi nahi hain');
    t.update(w.ref, { points: L.FieldValue.increment(-points), spentTotal: L.FieldValue.increment(points) }); t.set(hr, { uid, points, status: 'open', createdMs: Date.now() });
  });
  await logTx(uid, 'redeem_hold', -points, { hold: id });
  return id;
}
// order_new ke time: points discount sach me held tha ya nahi — nahi to total sahi kar do
async function reconcileOrder(orderRef, o) {
  const pd = Number(o.pointsDiscount) || 0; if (!pd) return;
  let good = false; const hr = d().collection('wallet_holds').doc(String(o.walletHold || 'none'));
  await d().runTransaction(async t => {
    const hs = await t.get(hr);
    if (hs.exists) { const h = hs.data(); if (h.uid === o.userId && h.status === 'open' && h.points === pd * 10 && Number(o.pointsUsed) === h.points) { t.update(hr, { status: 'used', orderId: orderRef.id }); good = true; } }
  });
  if (!good) await orderRef.update({ total: (o.total || 0) + pd, pointsDiscount: 0, pointsUsed: 0, walletRejected: true });
}
async function onCancelled(orderRef, o) {
  if (!o.walletHold || o.walletRefunded) return;
  const hr = d().collection('wallet_holds').doc(String(o.walletHold)); let back = 0;
  await d().runTransaction(async t => {
    const hs = await t.get(hr); if (!hs.exists) return; const h = hs.data(); if (h.uid !== o.userId || h.status !== 'used') return;
    t.update(hr, { status: 'refunded', refundedMs: Date.now() }); t.update(d().collection('wallets').doc(o.userId), { points: L.FieldValue.increment(h.points), spentTotal: L.FieldValue.increment(-h.points) }); back = h.points;
  });
  if (back) { await orderRef.update({ walletRefunded: true }); await logTx(o.userId, 'redeem_refund', back, { orderId: orderRef.id, note: 'Order cancel' }); }
}
// order deliver hone par: 1) khareedari ke points, 2) referral reward (referee ka pehla delivered order)
async function onDelivered(orderRef, o) {
  const uid = o.userId; if (!uid || String(uid).startsWith('guest_')) return { earned: 0, ref: 0 };
  const claimed = await d().runTransaction(async t => { const s = await t.get(orderRef); if (!s.exists || s.data().walletEarned) return false; t.update(orderRef, { walletEarned: true }); return true; });
  if (!claimed) return { earned: 0, ref: 0 };
  const earn = Math.floor((Number(o.total) || 0) / 10); if (earn > 0) await credit(uid, earn, 'order_earn', { orderId: orderRef.id });
  const w = await ensure(uid); let referrer = '';
  if ((Number(o.total) || 0) >= MIN_REF_ORDER) {
    referrer = await d().runTransaction(async t => { const ws = await t.get(w.ref), x = ws.data(); if (!x.referredBy || x.refRewarded) return ''; t.update(w.ref, { refRewarded: true }); return x.referredBy; });
  }
  let give = 0;
  if (referrer) {
    const r = await ensure(referrer), mk = monthKey();
    give = await d().runTransaction(async t => {
      const rs = await t.get(r.ref), x = rs.data(); const used = x.refMonth === mk ? (x.refMonthEarned || 0) : 0; const g = Math.max(0, Math.min(REF_PTS, CAP - used)); if (!g) return 0;
      t.update(r.ref, { points: L.FieldValue.increment(g), earnedTotal: L.FieldValue.increment(g), refMonth: mk, refMonthEarned: used + g }); return g;
    });
    if (give) { await logTx(referrer, 'referral', give, { from: uid, orderId: orderRef.id, note: 'Dost ka pehla order deliver hua' }); try { await L.pushToUid(referrer, { title: '🎁 Referral reward: +' + give + ' points', body: 'Aapke dost ka pehla order deliver ho gaya!', url: '/', tag: 'ref' }); } catch (e) {} }
  }
  return { earned: earn, ref: give };
}
module.exports = { CAP, REF_PTS, MIN_REF_ORDER, monthKey, ensure, credit, hold, releaseHold, expireHolds, reconcileOrder, onCancelled, onDelivered, logTx };
