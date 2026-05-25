const crypto = require('crypto');
const https  = require('https');

const readBody = req => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    try { resolve(JSON.parse(data)); }
    catch(e) { resolve({}); }
  });
  req.on('error', reject);
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body  = await readBody(req);
  const phone = body.phone || '';

  if (!/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number' });

  const otp     = String(Math.floor(100000 + Math.random() * 900000));
  const exp     = Date.now() + 5 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ phone, otp, exp })).toString('base64url');
  const secret  = process.env.OTP_SECRET || 'db_fallback_secret';
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token   = payload + '.' + sig;

  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key missing' });

  try {
    await new Promise((resolve, reject) => {
      const path = `/dev/bulkV2?authorization=${encodeURIComponent(key)}&route=otp&variables_values=${otp}&flash=0&numbers=${phone}`;
      const options = {
        hostname: 'www.fast2sms.com',
        path,
        method: 'GET',
        headers: { 'cache-control': 'no-cache' }
      };
      const r2 = https.request(options, r => {
        let buf = '';
        r.on('data', d => buf += d);
        r.on('end', () => {
          try {
            const d = JSON.parse(buf);
            if (d.return) resolve(d);
            else reject(new Error(d.message || JSON.stringify(d)));
          } catch(e) { reject(new Error('Parse error: ' + buf.slice(0,120))); }
        });
      });
      r2.on('error', reject);
      r2.end();
    });
  } catch(e) {
    return res.status(500).json({ error: 'SMS failed: ' + e.message });
  }

  return res.json({ success: true, token });
};
