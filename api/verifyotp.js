const crypto = require('crypto');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();

  const { token, userOtp } = req.body || {};
  if (!token||!userOtp) return res.status(400).json({error:'Missing fields'});

  try {
    const [raw,sig] = token.split('.');
    const secret    = process.env.OTP_SECRET || 'db_fallback';
    const expected  = crypto.createHmac('sha256',secret).update(raw).digest('hex');
    if (sig!==expected) return res.status(400).json({error:'Invalid token'});

    const {phone,otp,exp} = JSON.parse(Buffer.from(raw,'base64').toString());
    if (Date.now()>exp)        return res.status(400).json({error:'OTP expired'});
    if (userOtp.trim()!==otp)  return res.status(400).json({error:'Galat OTP!'});

    return res.json({success:true, phone});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
