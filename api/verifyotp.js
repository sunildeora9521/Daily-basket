// POST /api/verifyotp {token, userOtp} -> {success, phone}   (sirf check; login ke liye /api/session use hota hai)
const L = require('../serverlib');
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const { token, userOtp } = req.body || {};
  if (!token || !userOtp) return L.fail(res, 400, 'Missing fields');
  try {
    const t = String(token).split('.')[0]; let n = ''; try { n = JSON.parse(Buffer.from(t, 'base64url').toString()).n; } catch (e) {}
    if (!n || !(await L.rl('v_' + n, 6, 600))) return L.fail(res, 429, 'Bahut zyada galat try. Naya OTP mangao.');
    const p = L.checkOtp(token, userOtp, 'login');
    if (!p) return L.fail(res, 400, 'Galat ya expired OTP');
    return L.ok(res, { phone: p.s });
  } catch (e) { return L.fail(res, 500, 'Server error'); }
};
