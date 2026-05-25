const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, userOtp } = req.body || {};
  if (!token || !userOtp) return res.status(400).json({ error: 'Missing fields' });

  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return res.status(400).json({ error: 'Invalid token' });

    const secret      = process.env.OTP_SECRET || 'db_fallback_secret';
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expectedSig) return res.status(400).json({ error: 'Invalid token' });

    const { phone, otp, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() > exp)     return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    if (userOtp.trim() !== otp) return res.status(400).json({ error: 'Incorrect OTP' });

    res.json({ success: true, phone });
  } catch (e) {
    res.status(500).json({ error: 'Verification error: ' + e.message });
  }
};
