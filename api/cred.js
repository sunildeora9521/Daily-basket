// POST /api/cred  (sirf admin)  {action:'set', kind, id, pass?} -> {pass}   |   {action:'migrate'} -> {migrated}
const L = require('../serverlib');
const MALL = ['cab', 'grocery', 'fashion'];
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const me = await L.bearer(req); if (!L.isAdmin(me)) return L.fail(res, 403, 'Admin login chahiye');
  const b = req.body || {};
  try {
    const d = L.db();
    if (b.action === 'set') {
      const id = String(b.id || '').trim(); if (!id || !['rider', 'shop', ...MALL].includes(b.kind)) return L.fail(res, 400, 'Invalid request');
      const pw = b.pass && String(b.pass).length >= 6 ? String(b.pass) : L.genPass(), rec = L.hashPass(pw);
      if (b.kind === 'rider' || b.kind === 'shop') {
        const col = b.kind === 'rider' ? 'riders' : 'shops', s = await d.collection(col).doc(id).get(); if (!s.exists) return L.fail(res, 404, 'Not found');
        await d.collection('cred').doc(b.kind + '_' + id).set({ ...rec, updatedMs: Date.now() }); await s.ref.update({ pass: L.FieldValue.delete() }).catch(() => {});
      } else {
        const ID = id.toUpperCase(), s = await d.collection('mall_partners').doc(ID).get(); if (!s.exists || s.data().type !== b.kind) return L.fail(res, 404, 'Not found');
        await d.collection('mall_auth').doc(ID).set({ ...rec, type: b.kind, updatedMs: Date.now() });
      }
      return L.ok(res, { pass: pw });
    }
    if (b.action === 'delete') {
      const id = String(b.id || '').trim(); if (!id || !MALL.includes(b.kind)) return L.fail(res, 400, 'Invalid request');
      await d.collection('mall_auth').doc(id.toUpperCase()).delete().catch(() => {}); return L.ok(res);
    }
    if (b.action === 'migrate') {
      let n = 0;
      for (const [col, kind] of [['riders', 'rider'], ['shops', 'shop']]) {
        const q = await d.collection(col).get();
        for (const s of q.docs) { const x = s.data(); if (x.pass != null) { await d.collection('cred').doc(kind + '_' + s.id).set({ ...L.hashPass(x.pass), migratedMs: Date.now() }); await s.ref.update({ pass: L.FieldValue.delete() }); n++; } }
      }
      return L.ok(res, { migrated: n });
    }
    return L.fail(res, 400, 'Invalid action');
  } catch (e) { console.error('cred', e.message); return L.fail(res, 500, 'Server error'); }
};
