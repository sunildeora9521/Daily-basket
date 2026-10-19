// GET /api/cron-refill  — Vercel Cron roz chalata hai (Authorization: Bearer CRON_SECRET). Due refill reminders par push bhejta hai.
const L = require('../serverlib');
module.exports = async (req, res) => {
  const sec = process.env.CRON_SECRET; if (!sec || req.headers.authorization !== 'Bearer ' + sec) return L.fail(res, 401, 'unauthorized');
  try {
    const q = await L.db().collection('refills').where('active', '==', true).get(), now = Date.now(); let sent = 0, due = 0;
    for (const s of q.docs) {
      const r = s.data(); if (!(Number(r.dueMs) <= now)) continue; due++;
      try { sent += await L.pushToUid(r.uid, { title: '🛒 ' + (r.title || 'Refill') + ' khatam hone wala hai?', body: 'Dobara order karne ke liye tap karo — "Order again" se 1 tap me.', url: '/', tag: 'rf' + s.id }); } catch (e) {}
      await s.ref.update({ dueMs: now + Math.max(1, Number(r.every) || 30) * 864e5, lastMs: now });
    }
    return L.ok(res, { due, sent });
  } catch (e) { return L.fail(res, 500, 'Server error'); }
};
