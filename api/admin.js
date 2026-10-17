// POST /api/admin  step: login | resend | verify
// Env (Vercel): ADMIN_ID, ADMIN_PASSWORD, ADMIN_EMAIL, (optional) ADMIN_PHONE
const L = require('../serverlib');
const SESSION_MS = 2 * 3600 * 1000;
async function sendBoth(res, otpObj) {
  const email = process.env.ADMIN_EMAIL, phone = process.env.ADMIN_PHONE;
  const [mail, sms] = await Promise.all([L.sendEmail(email, 'Admin', otpObj.otp), /^[6-9]\d{9}$/.test(phone || '') ? L.sendSms(phone, otpObj.otp) : 'ADMIN_PHONE set nahi']);
  return { mail: mail === true, sms: sms === true, why: 'Email: ' + (mail === true ? 'ok' : mail) + ' | SMS: ' + (sms === true ? 'ok' : sms) };
}
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const b = req.body || {};
  try {
    if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) return L.fail(res, 500, 'Server me ADMIN_ID aur ADMIN_PASSWORD env set karo');
    if (b.step === 'login') {
      if (!(await L.rl('adm_ip_' + L.ip(req), 8, 900)) || !(await L.rl('adm_try', 20, 900))) return L.fail(res, 429, 'Bahut zyada attempts. 15 min baad try karo.');
      const good = L.safeEq(b.id || '', process.env.ADMIN_ID) & L.safeEq(b.pass || '', process.env.ADMIN_PASSWORD);
      if (!good) return L.fail(res, 401, 'Invalid credentials');
      const o = L.makeOtp('admin', 'admin', 300); const s = await sendBoth(res, o);
      if (!s.mail && !s.sms) return L.fail(res, 502, 'OTP nahi gaya → ' + s.why);
      return L.ok(res, { token: o.token, proof: L.makeProof('admproof', 'admin', 600, { r: 0 }), email: s.mail ? L.mask(process.env.ADMIN_EMAIL) : '', sms: !!s.sms });
    }
    if (b.step === 'resend') {
      const p = L.checkProof(b.proof, 'admproof'); if (!p || p.r >= 3) return L.fail(res, 401, 'Dobara login karo');
      const o = L.makeOtp('admin', 'admin', 300); const s = await sendBoth(res, o);
      if (!s.mail && !s.sms) return L.fail(res, 502, 'OTP nahi gaya → ' + s.why);
      return L.ok(res, { token: o.token, proof: L.makeProof('admproof', 'admin', Math.max(60, Math.round((p.e - Date.now()) / 1000)), { r: p.r + 1 }), email: s.mail ? L.mask(process.env.ADMIN_EMAIL) : '', sms: !!s.sms });
    }
    if (b.step === 'verify') {
      let n = ''; try { n = JSON.parse(Buffer.from(String(b.token).split('.')[0], 'base64url').toString()).n; } catch (e) {}
      if (!n || !(await L.rl('adm_v_' + n, 5, 600))) return L.fail(res, 429, 'Bahut zyada galat OTP. Dobara login karo.');
      const p = L.checkOtp(b.token, b.otp, 'admin'); if (!p) return L.fail(res, 400, 'Galat ya expired OTP');
      if (!(await L.useOnce(n))) return L.fail(res, 400, 'OTP pehle hi use ho chuka hai');
      const until = Date.now() + SESSION_MS;
      const customToken = await L.auth().createCustomToken('adm_main', { role: 'admin', admin: true, adminUntil: until });
      return L.ok(res, { customToken, until });
    }
    return L.fail(res, 400, 'Invalid step');
  } catch (e) { console.error('admin', e.message); return L.fail(res, 500, e.message.includes('OTP_SECRET') ? e.message : 'Server error'); }
};
