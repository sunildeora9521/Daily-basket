module.exports = (req,res) => {
  res.json({ok:true, body:req.body, key:!!process.env.FAST2SMS_API_KEY});
};
