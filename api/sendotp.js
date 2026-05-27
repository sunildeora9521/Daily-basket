// /api/sendemailotp.js - Vercel Serverless Function
// Uses EmailJS free tier OR simple SMTP

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({success:false,error:'Method not allowed'});
  
  const {email, name, otp} = req.body;
  if(!email || !otp) return res.status(400).json({success:false,error:'Missing fields'});

  try {
    // Using EmailJS REST API (free - 200 emails/month)
    const EMAILJS_SERVICE_ID  = process.env.EMAILJS_SERVICE_ID;
    const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
    const EMAILJS_PUBLIC_KEY  = process.env.EMAILJS_PUBLIC_KEY;
    const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: email,
          to_name:  name || 'Customer',
          otp_code: otp,
          app_name: 'Daily Basket'
        }
      })
    });

    if(response.ok) {
      return res.status(200).json({success:true});
    } else {
      const err = await response.text();
      throw new Error(err);
    }
  } catch(e) {
    console.error('Email OTP error:', e);
    // Don't fail login if email fails - SMS OTP is primary
    return res.status(200).json({success:true, warning:'Email send failed but SMS OTP sent'});
  }
}
