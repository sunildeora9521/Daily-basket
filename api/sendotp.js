// POST /api/sendotp  {phone, email?, name?}  ->  {success, token, sms, email}
// OTP server banata hai; client kabhi OTP ka code nahi dekhta (token me OTP nahi hota).
const L = require('../serverlib');
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const { phone, email, name } = req.body || {};
  if (!/^[6-9]\d{9}$/.test(String(phone || ''))) return L.fail(res, 400, 'Valid 10-digit mobile number daalo');
  const em = email && /^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$/.test(String(email)) ? String(email).trim() : '';
  try {
    if (!(await L.rl('otp_ph_' + phone, 5, 900))) return L.fail(res, 429, 'Bahut zyada OTP requests. 15 min baad try karo.');
    if (!(await L.rl('otp_ip_' + L.ip(req), 25, 3600))) return L.fail(res, 429, 'Bahut zyada requests. Thodi der baad try karo.');
    const { otp, token } = L.makeOtp('login', phone);
    const [sms, mail] = await Promise.all([L.sendSms(phone, otp), em ? L.sendEmail(em, name, otp) : false]);
    if (!sms && !mail) return L.fail(res, 502, 'OTP bhej nahi paye. Thodi der baad try karo.');
    return L.ok(res, { token, sms: !!sms, email: !!mail });
  } catch (e) { console.error('sendotp', e.message); return L.fail(res, 500, e.message.includes('OTP_SECRET') ? e.message : 'Server error'); }
};
