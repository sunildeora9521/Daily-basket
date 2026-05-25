const crypto = require('crypto');
const https  = require('https');

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = await new Promise((resolve) => {
      let data = '';
      req.on('data', c => data += c);
      req.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
      req.on('error', () => resolve({}));
    });

    const phone = (body.phone || '').toString().trim();
    if (!/^\d{10}$/.test(phone))
      return res.status(400).json({ error: 'Invalid phone number' });

    const otp    = String(Math.floor(100000 + Math.random() * 900000));
    const exp    = Date.now() + 5 * 60 * 1000;
    const raw    = JSON.stringify({ phone, otp, exp });
    const payload= Buffer.from(raw).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    const secret = process.env.OTP_SECRET || 'db_fallback';
    const sig    = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token  = payload + '.' + sig;

    const key = process.env.FAST2SMS_API_KEY;
    if (!key) return res.status(500).json({ error: 'API key missing' });

    await new Promise((resolve, reject) => {
      const path = `/dev/bulkV2?authorization=${encodeURIComponent(key)}&route=otp&variables_values=${otp}&flash=0&numbers=${phone}`;
      const r2 = https.request(
        { hostname:'www.fast2sms.com', path, method:'GET', headers:{'cache-control':'no-cache'} },
        r => {
          let buf = '';
          r.on('data', d => buf += d);
          r.on('end', () => {
            try {
              const d = JSON.parse(buf);
              if (d.return) resolve(d);
              else reject(new Error(d.message || buf.slice(0,100)));
            } catch(e) { reject(new Error('Parse: '+buf.slice(0,80))); }
          });
        }
      );
      r2.on('error', reject);
      r2.end();
    });

    return res.json({ success: true, token });

  } catch(e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
