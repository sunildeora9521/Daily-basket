const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};
  if (!phone || !/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number' });

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Sign: payload = base64(phone + otp + expiry)
  const exp = Date.now() + 5 * 60 * 1000; // 5 min
  const payload = Buffer.from(JSON.stringify({ phone, otp, exp })).toString('base64url');
  const secret  = process.env.OTP_SECRET || 'db_fallback_secret';
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token   = payload + '.' + sig;

  // Send SMS via Fast2SMS
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    const url = `https://www.fast2sms.com/dev/bulkV2` +
      `?authorization=${key}&route=otp&variables_values=${otp}` +
      `&flash=0&numbers=${phone}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.return) return res.status(500).json({ error: 'SMS failed: ' + (d.message || 'unknown') });
  } catch (e) {
    return res.status(500).json({ error: 'Fast2SMS error: ' + e.message });
  }

  // Return signed token (OTP never sent to client)
  res.json({ success: true, token });
};
