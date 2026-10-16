// POST /api/sendpush {topic,title,body}  — ab sirf ADMIN broadcast ke liye (pehle koi bhi bhej sakta tha)
const L = require('../serverlib');
const TOPICS = ['customers', 'riders', 'shops', 'drivers', 'mall_shops', 'admin'];
module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'Method not allowed');
  const me = await L.bearer(req); if (!L.isAdmin(me)) return L.fail(res, 403, 'Admin login chahiye');
  const { topic, title, body } = req.body || {};
  if (!TOPICS.includes(topic) || !title || !body) return L.fail(res, 400, 'topic, title aur body chahiye');
  try {
    await L.msg().send({ topic, data: { title: L.clean(title, 80), body: L.clean(body, 200), url: '/', tag: 'bc' + Date.now() }, android: { priority: 'high' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } });
    return L.ok(res);
  } catch (e) { return L.fail(res, 500, 'Push fail: ' + e.message); }
};
