// POST /api/notify {event, ...ids}  (Authorization: Bearer)
// Client sirf "kya hua" batata hai; kise, kya aur kab bhejna hai ye server Firestore se verify karke tay karta hai.
const L = require('../serverlib');
const W = require('../walletlib');
const hav = (a, b) => { const R = 6371, d = Math.PI / 180, x = Math.sin((b.lat - a.lat) * d / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin((b.lng - a.lng) * d / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const TXT = { pending: ['🧾 Order mil gaya', 'Aapka order receive ho gaya hai'], confirmed: ['✅ Order confirm ho gaya', 'Shop ne aapka order accept kar liya'], accepted: ['✅ Order accept ho gaya', 'Shop ne aapka order accept kar liya'], packed: ['📦 Order pack ho gaya', 'Delivery partner jald pickup karega'], out: ['🛵 Order raaste me hai', 'Aapka order delivery ke liye nikal chuka hai'], on_the_way: ['🛵 Order raaste me hai', 'Aapka order jald pahunchega'], delivered: ['🎉 Order deliver ho gaya', 'Dhanyavaad! Daily Basket ke saath rehne ke liye'], cancelled: ['❌ Order cancel', 'Aapka order cancel ho gaya'] };
const RIDE = { accepted: d => ['🚕 Driver mil gaya', (d.driverName || 'Driver') + ' aa raha hai · ' + (d.vehicleNo || '')], arrived: () => ['📍 Driver pahunch gaya', 'OTP batao aur ride shuru karo'], ongoing: () => ['🛣️ Ride shuru', 'Safe journey!'], completed: d => ['✅ Ride complete', 'Fare ₹' + d.fare + ' — driver ko cash do'], searching: () => ['🔄 Naya driver dhoondh rahe hain', 'Pehla driver ride chhod gaya'] };
const payload = (t, b, url, tag) => ({ title: t, body: b, url: url || '/', tag: tag || 'db' });
async function tokensFor(field, vals) {
  const d = L.db(), out = []; const arr = [].concat(vals).filter(Boolean); if (!arr.length) return out;
  for (let i = 0; i < arr.length; i += 10) { const q = await d.collection('push_tokens').where(field, 'in', arr.slice(i, i + 10)).get(); q.forEach(s => out.push({ token: s.data().token, ref: s.ref })); }
  return out;
}
async function toTokens(list, data) {
  const seen = {}, uniq = list.filter(x => x.token && !seen[x.token] && (seen[x.token] = 1)); let sent = 0;
  for (let i = 0; i < uniq.length; i += 500) {
    const part = uniq.slice(i, i + 500);
    const r = await L.msg().sendEachForMulticast({ tokens: part.map(x => x.token), data, android: { priority: 'high' }, webpush: { headers: { Urgency: 'high', TTL: '3600' } } });
    sent += r.successCount;
    await Promise.all(r.responses.map((x, k) => !x.success && x.error && /registration-token-not-registered|invalid-registration-token/.test(x.error.code || '') ? part[k].ref.delete().catch(() => {}) : null));
  }
  return sent;
}
const toTopic = (topic, data) => L.msg().send({ topic, data, android: { priority: 'high' }, webpush: { headers: { Urgency: 'high', TTL: '3600' } } }).then(() => 1).catch(() => 0);
// duplicate push roko. undefined = doc nahi, false = guard fail (koi aur ka order), null = pehle hi bhej chuke
async function once(ref, field, val, guard) {
  return L.db().runTransaction(async tx => { const s = await tx.get(ref); if (!s.exists) return undefined; const d = s.data(); if (guard && !guard(d)) return false; if (d[field] === val) return null; tx.update(ref, { [field]: val }); return d; });
}
const gate = (o, res) => o === undefined ? (L.fail(res, 404, 'Not found'), true) : o === false ? (L.fail(res, 403, 'Not allowed'), true) : o === null ? (L.ok(res, { sent: 0 }), true) : false;
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const me = await L.bearer(req); if (!me) return L.fail(res, 401, 'Login chahiye');
  const b = req.body || {}, ev = b.event, d = L.db(); let sent = 0;
  try {
    if (!(await L.rl('ntf_' + me.uid, 90, 600))) return L.fail(res, 429, 'Bahut zyada notifications');
    const staff = me.role === 'shop' || me.role === 'rider' || me.role === 'partner' || L.isAdmin(me);
    if (ev === 'broadcast') {
      if (!L.isAdmin(me) || !['customers', 'riders', 'shops', 'drivers', 'mall_shops'].includes(b.topic) || !b.title || !b.body) return L.fail(res, 403, 'Not allowed');
      sent = await toTopic(b.topic, payload(L.clean(b.title, 80), L.clean(b.body, 200), '/', 'bc' + Date.now()));
    } else if (ev === 'order_new') {
      const ref = d.collection('orders').doc(String(b.orderId || '')), o = await once(ref, 'pushNew', true, x => x.userId === me.uid);
      if (gate(o, res)) return;
      try { await W.reconcileOrder(ref, o); } catch (e) { console.error('reconcile', e.message); }
      const p = payload('🛒 Naya Order!', (o.userName || 'Customer') + ' ne ₹' + o.total + ' ka order kiya', '/', 'o' + ref.id);
      sent = (await toTopic('shops', p)) + (await toTopic('admin', p));
    } else if (ev === 'order_status') {
      if (!staff) return L.fail(res, 403, 'Not allowed');
      const ref = d.collection('orders').doc(String(b.orderId || '')), s0 = await ref.get(); if (!s0.exists) return L.fail(res, 404, 'Not found');
      const o = await once(ref, 'pushStatus', s0.data().status); if (!o) return L.ok(res, { sent: 0 });
      const t = TXT[o.status] || ['Order update', 'Status: ' + o.status];
      try { if (o.status === 'delivered') await W.onDelivered(ref, o); else if (o.status === 'cancelled') await W.onCancelled(ref, o); } catch (e) { console.error('wallet hook', e.message); }
      if (o.userId) sent += await toTokens(await tokensFor('uid', o.userId), payload(t[0], t[1], '/', 'o' + ref.id));
      if (o.status === 'packed') sent += await toTopic('riders', payload('📦 Order Ready for Pickup!', 'Ek order pack ho gaya, abhi pickup karo!', '/', 'pk' + ref.id));
    } else if (ev === 'mall_order_new') {
      const ref = d.collection('mall_orders').doc(String(b.orderId || '')), o = await once(ref, 'pushNew', true, x => x.userId === me.uid);
      if (gate(o, res)) return;
      sent = await toTokens(await tokensFor('pid', o.shopId), payload('🛍️ Naya order — ₹' + o.total, (o.userName || 'Customer') + ' · ' + (o.items || []).length + ' items', '/', 'm' + ref.id));
    } else if (ev === 'mall_order_status') {
      if (!staff) return L.fail(res, 403, 'Not allowed');
      const ref = d.collection('mall_orders').doc(String(b.orderId || '')), s0 = await ref.get(); if (!s0.exists) return L.fail(res, 404, 'Not found');
      const o = await once(ref, 'pushStatus', s0.data().status); if (!o) return L.ok(res, { sent: 0 });
      const t = TXT[o.status] || ['Order update', 'Status: ' + o.status];
      try { if (o.status === 'delivered') await W.onDelivered(ref, o); } catch (e) { console.error('wallet hook', e.message); }
      sent += await toTokens(await tokensFor('uid', o.userId), payload(t[0], t[1], '/', 'm' + ref.id));
      if (o.status === 'packed' && o.needRider) sent += await toTopic('riders', payload('📦 Mall pickup ready', (o.shopName || 'Shop') + ' se order uthao', '/', 'mp' + ref.id));
    } else if (ev === 'ride_new') {
      const ref = d.collection('cab_rides').doc(String(b.rideId || '')), r = await once(ref, 'pushNew', true, x => x.userId === me.uid && x.status === 'searching');
      if (gate(r, res)) return;
      const q = await d.collection('mall_partners').where('type', '==', 'cab').where('online', '==', true).get(), ids = [];
      q.forEach(s => { const p = s.data(); if (p.active !== false && p.vehicleType === r.vehicle && p.loc && Date.now() - p.loc.ts < 120000 && hav(p.loc, r.pickup) <= 12) ids.push(s.id); });
      sent = await toTokens(await tokensFor('pid', ids), payload('🚕 Nayi ride — ₹' + r.fare, (r.pickup.addr || 'Pickup') + ' → ' + (r.drop.addr || 'Drop'), '/', 'r' + ref.id));
    } else if (ev === 'ride_status') {
      const ref = d.collection('cab_rides').doc(String(b.rideId || '')), s0 = await ref.get(); if (!s0.exists) return L.fail(res, 404, 'Not found');
      const r0 = s0.data(), byDriver = me.role === 'partner' && me.pid === r0.driverId, byRider = me.uid === r0.userId;
      if (!byDriver && !byRider && !L.isAdmin(me)) return L.fail(res, 403, 'Not allowed');
      const key = r0.status + '|' + (r0.driverId || ''), r = await once(ref, 'pushStatus', key); if (!r) return L.ok(res, { sent: 0 });
      if (r.status === 'cancelled' && byRider && r.driverId) sent = await toTokens(await tokensFor('pid', r.driverId), payload('❌ Ride cancel', 'Rider ne ride cancel kar di', '/', 'r' + ref.id));
      else if ((byDriver || L.isAdmin(me)) && RIDE[r.status]) { const t = RIDE[r.status](r); sent = await toTokens(await tokensFor('uid', r.userId), payload(t[0], t[1], '/', 'r' + ref.id)); }
    } else return L.fail(res, 400, 'Unknown event');
    return L.ok(res, { sent });
  } catch (e) { console.error('notify', ev, e.message); return L.fail(res, 500, 'Server error'); }
};
