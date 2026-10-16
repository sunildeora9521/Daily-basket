// POST /api/login {role:'rider'|'shop'|'cab'|'grocery'|'fashion', id, pass} -> {customToken, profile}
// Purane plain-text / sha256 passwords pehli successful login par apne aap scrypt hash me badal jate hain.
const L = require('../serverlib');
const crypto = require('crypto');
const MALL = ['cab', 'grocery', 'fashion'];
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const { role, pass } = req.body || {}; const id = String((req.body || {}).id || '').trim();
  if (!['rider', 'shop', ...MALL].includes(role) || !id || !pass || id.length > 40 || String(pass).length > 100) return L.fail(res, 400, 'ID aur password daalo');
  try {
    if (!(await L.rl('lg_ip_' + L.ip(req), 20, 900)) || !(await L.rl('lg_id_' + role + id.toUpperCase(), 6, 900))) return L.fail(res, 429, 'Bahut zyada attempts. 15 min baad try karo.');
    const d = L.db(); let profile, uid, claims, okPass = false;
    if (role === 'rider' || role === 'shop') {
      const col = role === 'rider' ? 'riders' : 'shops'; let snap = await d.collection(col).doc(id).get();
      if (!snap.exists) { const q = await d.collection(col).where('id', '==', id).limit(1).get(); if (!q.empty) snap = q.docs[0]; }
      if (!snap.exists) return L.fail(res, 401, 'Invalid credentials');
      const data = snap.data(); if (data.active === false) return L.fail(res, 401, 'Account disabled');
      const credRef = d.collection('cred').doc(role + '_' + snap.id), cs = await credRef.get();
      if (cs.exists) okPass = L.verifyPass(pass, cs.data());
      else if (data.pass != null && L.safeEq(pass, data.pass)) { okPass = true; await credRef.set({ ...L.hashPass(pass), migratedMs: Date.now() }); await snap.ref.update({ pass: L.FieldValue.delete() }); }
      if (!okPass) return L.fail(res, 401, 'Invalid credentials');
      const { pass: _p, ...pub } = data; profile = { ...pub, id: data.id || snap.id, firestoreId: snap.id };
      uid = (role === 'rider' ? 'rd_' : 'sh_') + snap.id; claims = { role, pid: snap.id };
    } else {
      const ID = id.toUpperCase(), as = await d.collection('mall_auth').doc(ID).get();
      if (!as.exists || as.data().type !== role) return L.fail(res, 401, 'Invalid credentials');
      const a = as.data();
      if (a.algo === 'scrypt') okPass = L.verifyPass(pass, a);
      else if (a.passHash && L.safeEq(L.sha('mallsalt1|' + ID + '|' + pass), a.passHash)) { okPass = true; await as.ref.set({ ...L.hashPass(pass), type: role, migratedMs: Date.now() }); }
      if (!okPass) return L.fail(res, 401, 'Invalid credentials');
      const ps = await d.collection('mall_partners').doc(ID).get();
      if (!ps.exists || ps.data().active === false) return L.fail(res, 401, 'Account disabled. Admin se contact karo.');
      profile = { ...ps.data(), id: ps.id }; uid = 'pt_' + ID; claims = { role: 'partner', ptype: role, pid: ID };
    }
    const customToken = await L.auth().createCustomToken(uid, claims);
    return L.ok(res, { customToken, profile });
  } catch (e) { console.error('login', e.message); return L.fail(res, 500, 'Server error'); }
};
