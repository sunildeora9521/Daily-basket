module.exports = (req, res) => {
  res.json({ ok: true, method: req.method, env_key_exists: !!process.env.FAST2SMS_API_KEY });
};
