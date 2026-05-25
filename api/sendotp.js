const crypto = require('crypto');
const https  = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};
  if (!phone || !/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number' });

  const otp     = String(Math.floor(100000 + Math.random() * 900000));
  const exp     = Date.now() + 5 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ phone, otp, exp })).toString('base64url');
  const secret  = process.env.OTP_SECRET || 'db_fallback_secret';
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token   = payload + '.' + sig;

  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    await new Promise((resolve, reject) => {
      const path = `/dev/bulkV2?authorization=${key}&route=otp` +
                   `&variables_values=${otp}&flash=0&numbers=${phone}`;
      https.get({
        hostname: 'www.fast2sms.com',
        path,
        method: 'GET',
        headers: { 'cache-control': 'no-cache' }
      }, r => {
        let body = '';
        r.on('data', c => body += c);
        r.on('end', () => {
          try {
            const d = JSON.parse(body);
            if (!d.return) reject(new Error(d.message || 'SMS failed'));
            else resolve(d);
          } catch(e) { reject(new Error('Fast2SMS parse error')); }
        });
      }).on('error', reject);
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }

  res.json({ success: true, token });
};
