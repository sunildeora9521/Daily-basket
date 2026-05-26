const crypto = require('crypto');
const https  = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel auto-parses body — direct use karo
  const phone = ((req.body || {}).phone || '').toString().trim();
  if (!/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone' });

  const otp    = '123456'; // DEV MODE
  const exp    = Date.now() + 5 * 60 * 1000;
  const secret = process.env.OTP_SECRET || 'db_fallback';
  const raw    = Buffer.from(JSON.stringify({phone,otp,exp})).toString('base64');
  const sig    = crypto.createHmac('sha256',secret).update(raw).digest('hex');
  const token  = raw + '.' + sig;

  // DEV MODE - hardcoded OTP (remove after Fast2SMS recharge)
console.log('DEV OTP for', phone, ':', otp);
return res.json({ success: true, token });
  try {
    await new Promise((resolve, reject) => {
      const message = `Your Daily Basket OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;
const path = `/dev/bulkV2?authorization=${encodeURIComponent(key)}&route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${phone}&sender_id=FSTSMS`;
      const r2 = https.request(
        {hostname:'www.fast2sms.com',path,method:'GET',headers:{'cache-control':'no-cache'}},
        r => {
          let buf='';
          r.on('data',d=>buf+=d);
          r.on('end',()=>{
            try{const d=JSON.parse(buf);d.return?resolve(d):reject(new Error(d.message||buf.slice(0,80)));}
            catch(e){reject(new Error('Parse:'+buf.slice(0,80)));}
          });
        }
      );
      r2.on('error',reject);
      r2.end();
    });
  } catch(e) {
    return res.status(500).json({ error: 'SMS failed: '+e.message });
  }

  return res.json({ success:true, token });
};
