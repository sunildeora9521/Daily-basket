import React, { useState, useEffect, useRef } from "react";
import { db, auth, apiPost, signInToken, notifyEvent, requestNotificationPermission } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, addDoc, getDoc, setDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp, runTransaction, arrayUnion, increment } from "firebase/firestore";

/* ═══════════════════════════════════════════════════════════════════════
   DAILY BASKET — SUPER MALL SYSTEM
   Daily Mart (groceries) · Daily Ride (cab) · Daily Style (fashion)
   + partner portals (driver / grocery shop / fashion boutique) + admin panel
   ═══════════════════════════════════════════════════════════════════════ */

/* ───────── design tokens: teeno ka alag aesthetic ───────── */
const TH = {
  grocery: { bg:'#F2FBF6', card:'#FFFFFF', ink:'#10261A', sub:'#5E7466', acc:'#0FA968', acc2:'#FFC93C', accTxt:'#FFFFFF', line:'#D9EEE1', font:"'Poppins',sans-serif", head:"'Poppins',sans-serif", name:'Daily Mart', dark:false },
  fashion: { bg:'#FAF6F0', card:'#FFFFFF', ink:'#1B1A19', sub:'#7B746B', acc:'#B5473A', acc2:'#E8DAC8', accTxt:'#FFFFFF', line:'#E6DCCF', font:"'Poppins',sans-serif", head:"'Cormorant Garamond',serif", name:'Daily Style', dark:false },
  cab:     { bg:'#0B0F14', card:'#141B24', ink:'#F4F6F8', sub:'#8A97A6', acc:'#FFD60A', acc2:'#1F2A37', accTxt:'#0B0F14', line:'#232E3B', font:"'Space Grotesk',sans-serif", head:"'Space Grotesk',sans-serif", name:'Daily Ride', dark:true },
};
const MALL_CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');
.mall *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.mall input,.mall select,.mall textarea,.mall button{font-family:inherit}
.mall ::-webkit-scrollbar{display:none}
.mall .tap:active{transform:scale(.97)}
@keyframes mRadar{0%{transform:scale(.25);opacity:.7}100%{transform:scale(2.6);opacity:0}}
@keyframes mUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes mFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mRoad{from{background-position:0 0}to{background-position:-80px 0}}
@keyframes mBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.mall .leaflet-container{background:#0B0F14;font-family:inherit}
.mall .mall-dark-tiles{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9) saturate(.65)}
.mall .leaflet-control-attribution{font-size:8px;background:rgba(0,0,0,.45)!important;color:#aaa}
.mall .leaflet-control-attribution a{color:#ccc}`;

/* ───────── helpers ───────── */
const rs = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const clean = (s, m = 60) => String(s == null ? '' : s).replace(/[<>`"\\]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, m);
const r5 = n => Math.round(n * 1e5) / 1e5;
const sha = async s => {
  const sub = window.crypto && window.crypto.subtle; if (!sub) throw new Error('Secure (https) connection chahiye');
  const b = await sub.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
};
const pHash = (id, pw) => sha('mallsalt1|' + String(id).toUpperCase() + '|' + pw);
const hav = (a, b) => {
  if (!a || !b) return 9999; const R = 6371, d = Math.PI / 180;
  const dLa = (b.lat - a.lat) * d, dLo = (b.lng - a.lng) * d;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const hit = (key, max, mins) => { // rate limit: 0 = ok, else minutes to wait
  try { const w = mins * 60000; let r = JSON.parse(localStorage.getItem('sec_' + key) || 'null') || { n: 0, t: 0 };
    if (!r.t || Date.now() - r.t > w) r = { n: 0, t: Date.now() };
    if (r.n >= max) return Math.max(1, Math.ceil((r.t + w - Date.now()) / 60000));
    r.n++; localStorage.setItem('sec_' + key, JSON.stringify(r)); return 0; } catch (e) { return 0; }
};
const unhit = key => { try { localStorage.removeItem('sec_' + key); } catch (e) {} };
const genPass = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; const a = new Uint32Array(8); window.crypto.getRandomValues(a); return Array.from(a).map(x => A[x % A.length]).join(''); };
const PFX = { cab: 'CAB', grocery: 'GRO', fashion: 'FSH' };
const uniqueId = async type => { for (let i = 0; i < 8; i++) { const id = PFX[type] + (1000 + Math.floor(Math.random() * 9000)); const s = await getDoc(doc(db, 'mall_partners', id)); if (!s.exists()) return id; } throw new Error('ID generate nahi hui, dobara try karo'); };
const ratingOf = p => (p && p.ratingCount ? (p.ratingSum / p.ratingCount).toFixed(1) : 'New');
const flatPts = pts => { const o = []; (pts || []).forEach(p => { o.push(r5(p[0]), r5(p[1])); }); return o; };
const unflat = f => { const o = []; for (let i = 0; i + 1 < (f || []).length; i += 2) o.push([f[i], f[i + 1]]); return o; };
const timeAgo = ms => { if (!ms) return ''; const m = Math.floor((Date.now() - ms) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.floor(m / 60); if (h < 24) return h + ' hr ago'; return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

/* photo -> chhoti JPEG (robust decode: ImageBitmap -> blob <img> -> base64 <img>) */
async function imgToData(file, max = 720, q = 0.72) {
  if (!file || file.size === 0) throw new Error('Photo khali hai');
  if (file.type && !/^image\//.test(file.type)) throw new Error('Sirf image choose karo');
  if (file.size > 12 * 1024 * 1024) throw new Error('12MB se chhoti photo choose karo');
  const viaImg = url => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('decode')); im.src = url; });
  let src = null, w = 0, h = 0;
  try { src = await createImageBitmap(file); w = src.width; h = src.height; } catch (e) { src = null; }
  if (!src) { const u = URL.createObjectURL(file); try { src = await viaImg(u); w = src.naturalWidth; h = src.naturalHeight; } catch (e) { src = null; } try { URL.revokeObjectURL(u); } catch (e) {} }
  if (!src) { try { const d = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('read')); r.readAsDataURL(file); }); src = await viaImg(d); w = src.naturalWidth; h = src.naturalHeight; } catch (e) { src = null; } }
  if (!src || !w || !h) throw new Error('Photo open nahi ho rahi (HEIC?). JPG/PNG choose karo');
  const k = Math.min(1, max / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

/* Firestore live collection hook. cons===null => disabled */
function useCol(name, cons, key) {
  const [d, setD] = useState([]); const [ld, setLd] = useState(!!cons); const [er, setEr] = useState('');
  useEffect(() => {
    if (!cons) { setD([]); setLd(false); return; }
    setLd(true); setEr(''); let un = () => {};
    try { un = onSnapshot(cons.length ? query(collection(db, name), ...cons) : collection(db, name), s => { setD(s.docs.map(x => ({ ...x.data(), id: x.id }))); setLd(false); }, e => { setLd(false); setEr((e && (e.code || e.message)) || 'error'); }); } catch (e) { setLd(false); }
    return () => { try { un(); } catch (e) {} };
  }, [name, key]);
  return [d, ld, er];
}
/* mall screens ke time: Diwali FX band, status bar ka rang match */
function useMallChrome(bg) {
  useEffect(() => {
    const m = document.querySelector('meta[name="theme-color"]'); const prev = m && m.getAttribute('content');
    document.body.setAttribute('data-mall', '1'); if (m) m.setAttribute('content', bg);
    const pb = document.documentElement.style.background; document.documentElement.style.background = bg;
    return () => { document.body.removeAttribute('data-mall'); if (m && prev) m.setAttribute('content', prev); document.documentElement.style.background = pb; };
  }, [bg]);
}
function useToast() {
  const [t, setT] = useState(''); const r = useRef();
  const say = m => { setT(m); clearTimeout(r.current); r.current = setTimeout(() => setT(''), 2800); };
  useEffect(() => () => clearTimeout(r.current), []);
  const node = t ? <div style={{ position: 'absolute', left: '50%', bottom: 100, transform: 'translateX(-50%)', zIndex: 999, background: '#111', color: '#fff', padding: '10px 18px', borderRadius: 50, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,.4)', maxWidth: '88%', textAlign: 'center', animation: 'mFade .25s ease' }}>{t}</div> : null;
  return [say, node];
}
function Shell({ T, children }) {
  return <div className="mall" style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: T.bg, color: T.ink, fontFamily: T.font, overflow: 'hidden', paddingTop: 'env(safe-area-inset-top,0px)' }}><style>{MALL_CSS}</style>{children}</div>;
}
const Scroll = ({ children, style }) => <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', ...style }}>{children}</div>;
const RoundBtn = ({ onClick, children, T, style }) => <div onClick={onClick} className="tap" style={{ width: 40, height: 40, borderRadius: 14, background: T.card, border: '1px solid ' + T.line, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, flexShrink: 0, color: T.ink, ...style }}>{children}</div>;
const Pill = ({ T, on, onClick, children, style }) => <div onClick={onClick} className="tap" style={{ padding: '8px 14px', borderRadius: 50, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, background: on ? T.acc : T.card, color: on ? T.accTxt : T.ink, border: '1px solid ' + (on ? T.acc : T.line), ...style }}>{children}</div>;
const inp = (T, extra) => ({ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid ' + T.line, background: T.dark ? '#0F151D' : '#fff', color: T.ink, fontSize: 14, outline: 'none', ...extra });
const Spin = ({ T }) => <div style={{ textAlign: 'center', padding: 30, color: T.sub, fontSize: 13 }}>Loading…</div>;

/* single-shop cart (grocery + fashion) */
function useCart() {
  const [c, setC] = useState({ shopId: null, shopName: '', shopPhone: '', items: [] });
  const add = (shop, p, size) => {
    if (c.shopId && c.shopId !== shop.id && c.items.length) { if (!window.confirm('Cart me doosri shop ka saman hai. Purana cart hata ke naya shuru karein?')) return false; }
    const key = p.id + (size ? '|' + size : '');
    setC(prev => {
      const base = prev.shopId === shop.id ? prev : { shopId: shop.id, shopName: shop.name, shopPhone: shop.phone || '', items: [] };
      const ex = base.items.find(i => i.key === key);
      const items = ex ? base.items.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i) : [...base.items, { key, id: p.id, name: p.name, price: p.price, unit: p.unit || '', emoji: p.emoji || '', img: p.img || '', size: size || '', qty: 1 }];
      return { ...base, items };
    });
    return true;
  };
  const inc = k => setC(p => ({ ...p, items: p.items.map(i => i.key === k ? { ...i, qty: i.qty + 1 } : i) }));
  const dec = k => setC(p => { const items = p.items.map(i => i.key === k ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0); return items.length ? { ...p, items } : { shopId: null, shopName: '', shopPhone: '', items: [] }; });
  const clear = () => setC({ shopId: null, shopName: '', shopPhone: '', items: [] });
  const count = c.items.reduce((s, i) => s + i.qty, 0), subtotal = c.items.reduce((s, i) => s + i.qty * i.price, 0);
  const qtyOf = (id, size) => { const i = c.items.find(x => x.key === id + (size ? '|' + size : '')); return i ? i.qty : 0; };
  return { ...c, add, inc, dec, clear, count, subtotal, qtyOf };
}

/* ───── platform fee / ledger config (admin se badalta hai) ───── */
const FEE_DEF = { platformFee: 2, feeStartMs: 0, riderPay: 30, groceryDelivery: 25, groceryFree: 299, fashionDelivery: 40, fashionFree: 999 };
function useFees() {
  const [c, setC] = useState(FEE_DEF);
  useEffect(() => { getDoc(doc(db, 'mall_config', 'fees')).then(s => { if (s.exists()) setC({ ...FEE_DEF, ...s.data() }); }).catch(() => {}); }, []);
  const active = !!c.feeStartMs && Date.now() >= c.feeStartMs;
  return { ...c, active, platformNow: active ? (Number(c.platformFee) || 0) : 0 };
}
/* order deliver hone par ledger entry banti hai (kisne cash collect kiya, kisko kitna dena hai) */
async function finishOrder(o, by, rider) {
  let cfg = FEE_DEF; try { const s = await getDoc(doc(db, 'mall_config', 'fees')); if (s.exists()) cfg = { ...FEE_DEF, ...s.data() }; } catch (e) {}
  const now = Date.now(), riderPay = by === 'rider' ? (Number(cfg.riderPay) || 0) : 0, pf = o.platformFee || 0;
  await setDoc(doc(db, 'mall_ledger', o.id), { orderId: o.id, type: o.type, shopId: o.shopId, shopName: o.shopName, riderId: by === 'rider' ? rider.id : '', riderName: by === 'rider' ? (rider.name || '') : '', collectedBy: by, subtotal: o.subtotal || 0, delivery: o.delivery || 0, platformFee: pf, total: o.total || 0, riderPay, deliveredMs: now, riderSettled: by !== 'rider', shopPaid: by === 'shop', feeSettled: by === 'shop' ? !(pf > 0) : true });
  await updateDoc(doc(db, 'mall_orders', o.id), { status: 'delivered', deliveredMs: now, deliveredBy: by });
  notifyEvent('mall_order_status', { orderId: o.id });
}

const STATUS_FLOW = ['placed', 'accepted', 'packed', 'out', 'delivered'];
const STATUS_LBL = { placed: 'Order placed', accepted: 'Accepted', packed: 'Packed', out: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

/* ───────── shared cart + orders screens (grocery & fashion) ───────── */
function MallCart({ T, type, cart, user, say, onBack, onPlaced }) {
  const fees = useFees(); const sub = cart.subtotal, free = type === 'grocery' ? fees.groceryFree : fees.fashionFree, fee = type === 'grocery' ? fees.groceryDelivery : fees.fashionDelivery, delivery = sub >= free ? 0 : fee, pf = fees.platformNow;
  const sv = (() => { try { return JSON.parse(localStorage.getItem('mall_addr') || '{}'); } catch (e) { return {}; } })();
  const [f, setF] = useState({ flat: sv.flat || '', area: sv.area || '', note: '', phone: (user && user.phone) || sv.phone || '' });
  const [busy, setBusy] = useState(false);
  const place = async () => {
    if (busy) return;
    if (!f.flat.trim() || !f.area.trim()) { say('Address poora bharo'); return; }
    if (!/^\d{10}$/.test(f.phone)) { say('10-digit phone number daalo'); return; }
    if (!user || !user.uid) { say('Pehle login karo'); return; }
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'mall_orders'), {
        type, shopId: cart.shopId, shopName: cart.shopName, shopPhone: cart.shopPhone || '', userId: user.uid, userName: clean(user.name, 40), phone: f.phone,
        address: clean(f.flat, 80) + ', ' + clean(f.area, 80), note: clean(f.note, 120),
        items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit, size: i.size, emoji: i.emoji })),
        subtotal: sub, delivery, platformFee: pf, total: sub + delivery + pf, pay: 'cod', status: 'placed', createdMs: Date.now(), createdAt: serverTimestamp()
      });
      try { localStorage.setItem('mall_addr', JSON.stringify({ flat: f.flat, area: f.area, phone: f.phone })); } catch (e) {}
      notifyEvent('mall_order_new', { orderId: ref.id }); cart.clear(); onPlaced(ref.id);
    } catch (e) { say('Order fail: ' + e.message); }
    setBusy(false);
  };
  const serif = type === 'fashion';
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
        <RoundBtn T={T} onClick={onBack}>←</RoundBtn>
        <div style={{ fontFamily: T.head, fontSize: serif ? 26 : 20, fontWeight: 700 }}>{serif ? 'Your Bag' : 'Your Cart'}</div>
      </div>
      <Scroll style={{ padding: '4px 16px 120px' }}>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>from <b style={{ color: T.ink }}>{cart.shopName}</b></div>
        {cart.items.map(i => (
          <div key={i.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.card, border: '1px solid ' + T.line, borderRadius: 16, padding: 10, marginBottom: 10 }}>
            <div style={{ width: 58, height: 58, borderRadius: 12, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, overflow: 'hidden', flexShrink: 0 }}>{i.img ? <img src={i.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (i.emoji || (serif ? '👗' : '🛒'))}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
              <div style={{ fontSize: 11.5, color: T.sub }}>{i.size ? 'Size ' + i.size : i.unit} · {rs(i.price)}</div>
            </div>
            <Stepper T={T} q={i.qty} onInc={() => cart.inc(i.key)} onDec={() => cart.dec(i.key)} />
          </div>
        ))}
        <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Delivery address</div>
          <input style={inp(T, { marginBottom: 8 })} placeholder="House / Flat no." value={f.flat} maxLength={80} onChange={e => setF({ ...f, flat: e.target.value })} />
          <input style={inp(T, { marginBottom: 8 })} placeholder="Area / Mohalla / Landmark" value={f.area} maxLength={80} onChange={e => setF({ ...f, area: e.target.value })} />
          <input style={inp(T, { marginBottom: 8 })} placeholder="Mobile (10 digit)" inputMode="numeric" value={f.phone} maxLength={10} onChange={e => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
          <input style={inp(T)} placeholder="Note for shop (optional)" value={f.note} maxLength={120} onChange={e => setF({ ...f, note: e.target.value })} />
        </div>
        <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 16, padding: 14 }}>
          <Row l="Subtotal" v={rs(sub)} T={T} />
          <Row l="Delivery" v={delivery ? rs(delivery) : 'FREE'} T={T} g={!delivery} />
          <Row l="Platform fee" v={pf ? rs(pf) : 'FREE 🎉'} T={T} g={!pf} />
          {delivery > 0 && <div style={{ fontSize: 11, color: T.sub, margin: '-2px 0 8px' }}>Add {rs(free - sub)} more for free delivery</div>}
          <div style={{ borderTop: '1px dashed ' + T.line, margin: '8px 0' }} />
          <Row l="Total (Cash on Delivery)" v={rs(sub + delivery + pf)} T={T} b />
        </div>
      </Scroll>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom,0px))', background: T.bg, borderTop: '1px solid ' + T.line }}>
        <div onClick={place} className="tap" style={{ background: T.acc, color: T.accTxt, borderRadius: serif ? 4 : 16, padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 15, opacity: busy ? .6 : 1, letterSpacing: serif ? 1.5 : 0, textTransform: serif ? 'uppercase' : 'none' }}>{busy ? 'Placing…' : 'Place Order · ' + rs(sub + delivery + pf)}</div>
      </div>
    </>
  );
}
const Row = ({ l, v, T, b, g }) => <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: b ? 15 : 13, fontWeight: b ? 800 : 500, marginBottom: 6, color: g ? T.acc : T.ink }}><span>{l}</span><span>{v}</span></div>;
const Stepper = ({ T, q, onInc, onDec }) => (
  <div style={{ display: 'flex', alignItems: 'center', background: T.acc, color: T.accTxt, borderRadius: 10, overflow: 'hidden' }}>
    <div onClick={onDec} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>−</div>
    <div style={{ minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{q}</div>
    <div onClick={onInc} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>+</div>
  </div>
);

function MallOrders({ T, type, orders, say, onBack, focusId }) {
  const list = orders.filter(o => o.type === type).sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0));
  const cancel = async o => { if (!window.confirm('Order cancel karein?')) return; try { await updateDoc(doc(db, 'mall_orders', o.id), { status: 'cancelled', cancelledBy: 'customer' }); say('Order cancelled'); } catch (e) { say('Cancel fail: ' + e.message); } };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
        <RoundBtn T={T} onClick={onBack}>←</RoundBtn>
        <div style={{ fontFamily: T.head, fontSize: type === 'fashion' ? 26 : 20, fontWeight: 700 }}>My Orders</div>
      </div>
      <Scroll style={{ padding: '4px 16px 40px' }}>
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: T.sub }}><div style={{ fontSize: 46 }}>{type === 'fashion' ? '🛍️' : '🧺'}</div><div style={{ marginTop: 8, fontSize: 14 }}>Abhi koi order nahi</div></div>}
        {list.map(o => {
          const idx = STATUS_FLOW.indexOf(o.status), canc = o.status === 'cancelled';
          return (
            <div key={o.id} style={{ background: T.card, border: '1.5px solid ' + (o.id === focusId ? T.acc : T.line), borderRadius: 18, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{o.shopName}</div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: canc ? '#FEE2E2' : o.status === 'delivered' ? '#DCFCE7' : T.acc2, color: canc ? '#B91C1C' : o.status === 'delivered' ? '#15803D' : T.ink }}>{STATUS_LBL[o.status] || o.status}</div>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>{(o.items || []).map(i => i.qty + '× ' + i.name + (i.size ? ' (' + i.size + ')' : '')).join(', ')}</div>
              {o.riderName && o.status !== 'delivered' && o.status !== 'cancelled' && <div style={{ fontSize: 12.5, fontWeight: 600, background: T.acc2, borderRadius: 12, padding: '8px 12px', marginBottom: 8 }}>🛵 {o.status === 'out' ? 'Delivery partner' : 'Pickup ke liye aa raha hai'}: {o.riderName}{o.riderPhone && <a href={'tel:' + o.riderPhone} style={{ color: T.acc, marginLeft: 8, textDecoration: 'none', fontWeight: 700 }}>📞 Call</a>}</div>}
              {!canc && <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                {STATUS_FLOW.map((s, i) => (<React.Fragment key={s}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: i <= idx ? T.acc : T.line, flexShrink: 0, boxShadow: i === idx ? '0 0 0 4px ' + T.acc + '33' : 'none' }} />
                  {i < STATUS_FLOW.length - 1 && <div style={{ flex: 1, height: 3, background: i < idx ? T.acc : T.line }} />}
                </React.Fragment>))}
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div style={{ fontSize: 12, color: T.sub }}>{timeAgo(o.createdMs)} · {rs(o.total)} · COD</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {o.shopPhone && <a href={'tel:' + o.shopPhone} style={{ fontSize: 12, fontWeight: 700, color: T.acc, textDecoration: 'none', padding: '6px 10px' }}>📞 Call</a>}
                  {o.status === 'placed' && <div onClick={() => cancel(o)} style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', padding: '6px 10px', cursor: 'pointer' }}>Cancel</div>}
                </div>
              </div>
            </div>
          );
        })}
      </Scroll>
    </>
  );
}

/* ═══════════════════════ DAILY MART — GROCERIES ═══════════════════════ */
const G_CATS = [['All', '🛒'], ['Staples', '🌾'], ['Dal & Pulses', '🫘'], ['Vegetables', '🥬'], ['Fruits', '🍎'], ['Dairy', '🥛'], ['Snacks', '🍪'], ['Beverages', '🥤'], ['Household', '🧴'], ['Personal Care', '🧼']];

function GroceryApp({ user, onBack }) {
  const T = TH.grocery;
  const [say, toast] = useToast();
  const [view, setView] = useState('home'); const [shop, setShop] = useState(null);
  useMallChrome(view === 'home' ? '#0FA968' : T.bg);
  const [cat, setCat] = useState('All'); const [q, setQ] = useState(''); const [focus, setFocus] = useState(null);
  const cart = useCart();
  const [shopsAll, sl, serr] = useCol('mall_partners', [where('type', '==', 'grocery')], 'gs');
  const shops = shopsAll.filter(s => s.active !== false);
  const [prodsAll, pl] = useCol('mall_products', [where('type', '==', 'grocery')], 'gp');
  const [orders] = useCol('mall_orders', user && user.uid ? [where('userId', '==', user.uid)] : null, 'go' + (user && user.uid));
  const shopOf = id => shops.find(s => s.id === id);
  const prods = prodsAll.filter(p => shopOf(p.shopId) && (!shop || p.shopId === shop.id) && (cat === 'All' || p.cat === cat) && (!q || (p.name || '').toLowerCase().includes(q.toLowerCase())));
  const addP = p => { const s = shopOf(p.shopId); if (!s) return; if (s.open === false) { say(s.name + ' abhi band hai'); return; } if (p.inStock === false) { say('Out of stock'); return; } cart.add(s, p); };
  const activeOrders = orders.filter(o => o.type === 'grocery' && !['delivered', 'cancelled'].includes(o.status)).length;

  if (view === 'cart') return <Shell T={T}><MallCart T={T} type="grocery" cart={cart} user={user} say={say} onBack={() => setView('home')} onPlaced={id => { setFocus(id); setView('orders'); }} />{toast}</Shell>;
  if (view === 'orders') return <Shell T={T}><MallOrders T={T} type="grocery" orders={orders} say={say} focusId={focus} onBack={() => setView('home')} />{toast}</Shell>;

  return (
    <Shell T={T}>
      <div style={{ background: 'linear-gradient(160deg,#0FA968,#07754A)', padding: '12px 16px 16px', borderRadius: '0 0 28px 28px', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoundBtn T={T} onClick={shop ? () => { setShop(null); setCat('All'); } : onBack} style={{ background: 'rgba(255,255,255,.18)', border: 'none', color: '#fff' }}>←</RoundBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop ? shop.name : '🥬 Daily Mart'}</div>
            <div style={{ fontSize: 11.5, opacity: .85 }}>{shop ? (shop.area || 'Local shop') + (shop.open === false ? ' · Closed' : ' · Open now') : '⚡ Groceries in 30–45 min · Bhopalgarh'}</div>
          </div>
          <div onClick={() => setView('orders')} className="tap" style={{ position: 'relative', width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>📦{activeOrders > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: T.acc2, color: '#10261A', fontSize: 10, fontWeight: 800, borderRadius: 50, padding: '1px 6px' }}>{activeOrders}</span>}</div>
        </div>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
          <span style={{ color: T.sub }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search atta, doodh, sabzi…" style={{ flex: 1, border: 'none', outline: 'none', padding: '13px 0', fontSize: 14, color: T.ink, background: 'transparent' }} />
          {q && <span onClick={() => setQ('')} style={{ color: T.sub, cursor: 'pointer' }}>✕</span>}
        </div>
      </div>
      <Scroll style={{ padding: '14px 0 120px' }}>
        {!shop && <div style={{ margin: '0 16px 14px', background: 'linear-gradient(120deg,#FFE9A8,#FFC93C)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 34, animation: 'mBob 2s ease-in-out infinite' }}>🛵</div>
          <div><div style={{ fontSize: 14, fontWeight: 800, color: '#4A3500' }}>Free delivery above ₹299</div><div style={{ fontSize: 11.5, color: '#6B5200' }}>Pay cash on delivery · Local shops, fresh stock</div></div>
        </div>}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px' }}>
          {G_CATS.map(([c, e]) => <Pill key={c} T={T} on={cat === c} onClick={() => setCat(c)}>{e} {c}</Pill>)}
        </div>
        {!shop && <>
          <div style={{ padding: '2px 16px 8px', fontSize: 16, fontWeight: 800 }}>Shops near you</div>
          {sl && <Spin T={T} />}
          {serr && <div style={{ margin: '0 16px 14px', padding: 14, background: '#FEE2E2', color: '#991B1B', borderRadius: 14, fontSize: 12.5, lineHeight: 1.5 }}>⚠️ Database permission error ({serr}). Firebase Rules me Mall collections ko Publish karo.</div>}
          {!sl && shops.length === 0 && <div style={{ margin: '0 16px 14px', padding: 18, background: T.card, borderRadius: 16, border: '1px dashed ' + T.line, color: T.sub, fontSize: 13, textAlign: 'center' }}>Abhi koi shop add nahi hui. Jaldi aa rahi hain! 🏪</div>}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 16px' }}>
            {shops.map(s => (
              <div key={s.id} onClick={() => { setShop(s); setCat('All'); setQ(''); }} className="tap" style={{ width: 250, flexShrink: 0, background: T.card, borderRadius: 20, border: '1px solid ' + T.line, padding: 14, cursor: 'pointer', boxShadow: '0 6px 20px rgba(15,169,104,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: '#E5F7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏪</div>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div><div style={{ fontSize: 11, color: T.sub }}>{s.area || 'Bhopalgarh'}</div></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11.5 }}>
                  <span style={{ color: s.open === false ? '#DC2626' : T.acc, fontWeight: 700 }}>● {s.open === false ? 'Closed' : 'Open'}</span>
                  <span style={{ color: T.sub }}>⭐ {ratingOf(s) === 'New' ? '4.5' : ratingOf(s)} · 30–45 min</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 8px', fontSize: 16, fontWeight: 800 }}>{cat === 'All' ? 'Popular products' : cat}</div>
        </>}
        {pl && <Spin T={T} />}
        {!pl && prods.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.sub, fontSize: 13 }}>Koi product nahi mila 🔎</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' }}>
          {prods.map(p => {
            const qty = cart.qtyOf(p.id), off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0, out = p.inStock === false;
            return (
              <div key={p.id} style={{ background: T.card, borderRadius: 20, border: '1px solid ' + T.line, overflow: 'hidden', opacity: out ? .55 : 1, animation: 'mFade .4s ease both' }}>
                <div style={{ height: 124, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, position: 'relative' }}>
                  {p.img ? <img src={p.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 6, boxSizing: 'border-box' }} /> : (p.emoji || '🛒')}
                  {off > 0 && <div style={{ position: 'absolute', top: 8, left: 8, background: '#FF4D4F', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8 }}>{off}% OFF</div>}
                  {out && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#555' }}>OUT OF STOCK</div>}
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, minHeight: 32 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: T.sub, margin: '2px 0 8px' }}>{p.unit}{!shop && p.shopName ? ' · ' + p.shopName : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><span style={{ fontSize: 15, fontWeight: 800 }}>{rs(p.price)}</span>{p.mrp > p.price && <span style={{ fontSize: 11, color: T.sub, textDecoration: 'line-through', marginLeft: 5 }}>{rs(p.mrp)}</span>}</div>
                    {qty > 0 ? <Stepper T={T} q={qty} onInc={() => cart.inc(p.id)} onDec={() => cart.dec(p.id)} /> :
                      <div onClick={() => addP(p)} className="tap" style={{ padding: '7px 16px', borderRadius: 10, border: '1.5px solid ' + T.acc, color: T.acc, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>ADD</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Scroll>
      {cart.count > 0 && <div onClick={() => setView('cart')} className="tap" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom,0px))', background: T.acc, color: '#fff', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 10px 30px rgba(15,169,104,.45)', zIndex: 20 }}>
        <div><div style={{ fontSize: 12, opacity: .85 }}>{cart.count} item{cart.count > 1 ? 's' : ''} · {cart.shopName}</div><div style={{ fontSize: 16, fontWeight: 800 }}>{rs(cart.subtotal)}</div></div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>View Cart →</div>
      </div>}
      {toast}
    </Shell>
  );
}

/* ═══════════════════════ DAILY STYLE — FASHION ═══════════════════════ */
const F_CATS = ['All', 'Men', 'Women', 'Kids', 'Ethnic', 'Footwear', 'Accessories'];
const SIZE_SETS = { Men: ['S', 'M', 'L', 'XL', 'XXL'], Women: ['XS', 'S', 'M', 'L', 'XL'], Kids: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'], Ethnic: ['S', 'M', 'L', 'XL', 'XXL'], Footwear: ['6', '7', '8', '9', '10', '11'], Accessories: ['Free'] };
const sizeSetFor = c => SIZE_SETS[c] || ['S', 'M', 'L', 'XL'];

function FashionApp({ user, onBack }) {
  const T = TH.fashion; useMallChrome(T.bg);
  const [say, toast] = useToast();
  const [view, setView] = useState('home'); const [cat, setCat] = useState('All'); const [q, setQ] = useState('');
  const [sel, setSel] = useState(null); const [size, setSize] = useState(''); const [shop, setShop] = useState(null); const [focus, setFocus] = useState(null);
  const [wish, setWish] = useState(() => { try { return JSON.parse(localStorage.getItem('mall_wish') || '[]'); } catch (e) { return []; } });
  const cart = useCart();
  const [shopsAll, , serr] = useCol('mall_partners', [where('type', '==', 'fashion')], 'fs');
  const shops = shopsAll.filter(s => s.active !== false);
  const [prodsAll, pl] = useCol('mall_products', [where('type', '==', 'fashion')], 'fp');
  const [orders] = useCol('mall_orders', user && user.uid ? [where('userId', '==', user.uid)] : null, 'fo' + (user && user.uid));
  const shopOf = id => shops.find(s => s.id === id);
  const toggleWish = id => setWish(w => { const n = w.includes(id) ? w.filter(x => x !== id) : [...w, id]; try { localStorage.setItem('mall_wish', JSON.stringify(n)); } catch (e) {} return n; });
  const prods = prodsAll.filter(p => shopOf(p.shopId) && (!shop || p.shopId === shop.id) && (cat === 'All' || p.cat === cat) && (!q || (p.name || '').toLowerCase().includes(q.toLowerCase())));
  const head = (s, sz) => ({ fontFamily: T.head, fontSize: sz, fontWeight: 600, ...s });
  const addToBag = () => {
    const s = shopOf(sel.shopId); if (!s) return;
    if (s.open === false) { say(s.name + ' abhi band hai'); return; }
    const sizes = sel.sizes && sel.sizes.length ? sel.sizes : [];
    if (sizes.length && !size) { say('Pehle size select karo'); return; }
    if (cart.add(s, sel, size)) { say('Bag me add ho gaya ✓'); }
  };

  if (view === 'cart') return <Shell T={T}><MallCart T={T} type="fashion" cart={cart} user={user} say={say} onBack={() => setView(sel ? 'detail' : 'home')} onPlaced={id => { setFocus(id); setView('orders'); }} />{toast}</Shell>;
  if (view === 'orders') return <Shell T={T}><MallOrders T={T} type="fashion" orders={orders} say={say} focusId={focus} onBack={() => setView('home')} />{toast}</Shell>;

  const Tile = ({ p }) => {
    const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0, out = p.inStock === false;
    return (
      <div onClick={() => { setSel(p); setSize(''); setView('detail'); }} style={{ cursor: 'pointer', animation: 'mFade .4s ease both', opacity: out ? .6 : 1 }}>
        <div style={{ aspectRatio: '3/4', background: 'linear-gradient(160deg,#EFE3D3,#F7EFE5)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
          {p.img ? <img src={p.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.emoji || '👗')}
          <div onClick={e => { e.stopPropagation(); toggleWish(p.id); }} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{wish.includes(p.id) ? '❤️' : '🤍'}</div>
          {off > 0 && <div style={{ position: 'absolute', left: 0, bottom: 10, background: T.acc, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 9px', letterSpacing: .8 }}>{off}% OFF</div>}
          {out && <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,246,240,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>SOLD OUT</div>}
        </div>
        <div style={{ padding: '8px 2px 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: T.sub }}>{p.shopName}</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, margin: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{rs(p.price)}{p.mrp > p.price && <span style={{ fontSize: 11, color: T.sub, textDecoration: 'line-through', marginLeft: 6, fontWeight: 400 }}>{rs(p.mrp)}</span>}</div>
        </div>
      </div>
    );
  };

  if (view === 'detail' && sel) {
    const s = shopOf(sel.shopId), sizes = sel.sizes && sel.sizes.length ? sel.sizes : [], off = sel.mrp > sel.price ? Math.round((1 - sel.price / sel.mrp) * 100) : 0;
    return (
      <Shell T={T}>
        <Scroll style={{ paddingBottom: 110 }}>
          <div style={{ position: 'relative', aspectRatio: '4/5', background: 'linear-gradient(160deg,#EFE3D3,#F7EFE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>
            {sel.img ? <img src={sel.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : (sel.emoji || '👗')}
            <RoundBtn T={T} onClick={() => setView('home')} style={{ position: 'absolute', top: 12, left: 14, borderRadius: '50%' }}>←</RoundBtn>
            <RoundBtn T={T} onClick={() => toggleWish(sel.id)} style={{ position: 'absolute', top: 12, right: 14, borderRadius: '50%' }}>{wish.includes(sel.id) ? '❤️' : '🤍'}</RoundBtn>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.sub }}>{sel.shopName} · {sel.cat}</div>
            <div style={head({ margin: '4px 0 8px', lineHeight: 1.1 }, 32)}>{sel.name}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs(sel.price)}{sel.mrp > sel.price && <><span style={{ fontSize: 14, color: T.sub, textDecoration: 'line-through', marginLeft: 8, fontWeight: 400 }}>{rs(sel.mrp)}</span><span style={{ fontSize: 12, color: T.acc, marginLeft: 8, fontWeight: 700 }}>{off}% off</span></>}</div>
            {sizes.length > 0 && <>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '20px 0 10px', color: T.sub }}>Select size</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{sizes.map(z => <div key={z} onClick={() => setSize(z)} className="tap" style={{ minWidth: 48, textAlign: 'center', padding: '11px 12px', border: '1.5px solid ' + (size === z ? T.ink : T.line), background: size === z ? T.ink : 'transparent', color: size === z ? '#fff' : T.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{z}</div>)}</div>
            </>}
            {sel.desc && <div style={{ fontSize: 13.5, lineHeight: 1.65, color: T.sub, marginTop: 20 }}>{sel.desc}</div>}
            <div style={{ marginTop: 22, padding: 14, border: '1px solid ' + T.line, background: T.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: T.acc2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏬</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{sel.shopName}</div><div style={{ fontSize: 11.5, color: T.sub }}>{s && s.area ? s.area : 'Local boutique'}</div></div>
              {s && s.phone && <a href={'tel:' + s.phone} style={{ fontSize: 12, fontWeight: 700, color: T.acc, textDecoration: 'none' }}>📞 Call</a>}
            </div>
          </div>
        </Scroll>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom,0px))', background: T.bg, borderTop: '1px solid ' + T.line, display: 'flex', gap: 10 }}>
          <div onClick={sel.inStock === false ? () => say('Sold out') : addToBag} className="tap" style={{ flex: 1, background: T.ink, color: '#fff', padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', opacity: sel.inStock === false ? .5 : 1 }}>{sel.inStock === false ? 'Sold out' : 'Add to bag'}</div>
          {cart.count > 0 && <div onClick={() => setView('cart')} className="tap" style={{ background: T.acc, color: '#fff', padding: '16px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🛍️ {cart.count}</div>}
        </div>
        {toast}
      </Shell>
    );
  }

  return (
    <Shell T={T}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', flexShrink: 0 }}>
        <RoundBtn T={T} onClick={shop ? () => setShop(null) : onBack} style={{ borderRadius: '50%' }}>←</RoundBtn>
        <div style={head({ flex: 1, textAlign: 'center', fontSize: 22, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }, 22)}>{shop ? shop.name : 'Daily Style'}</div>
        <RoundBtn T={T} onClick={() => setView('orders')} style={{ borderRadius: '50%', fontSize: 16 }}>📦</RoundBtn>
        <RoundBtn T={T} onClick={() => cart.count ? setView('cart') : say('Bag khali hai')} style={{ borderRadius: '50%', position: 'relative', fontSize: 16 }}>🛍️{cart.count > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: T.acc, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 50, padding: '1px 6px' }}>{cart.count}</span>}</RoundBtn>
      </div>
      <Scroll style={{ padding: '0 0 40px' }}>
        {!shop && <div style={{ margin: '4px 16px 16px', background: 'linear-gradient(135deg,#B5473A,#7E2A20)', color: '#fff', padding: '26px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', opacity: .8 }}>Festive edit · Bhopalgarh</div>
          <div style={head({ fontSize: 38, lineHeight: 1, margin: '8px 0 6px', fontStyle: 'italic' }, 38)}>Dress local.<br />Look global.</div>
          <div style={{ fontSize: 12.5, opacity: .85 }}>Boutiques near you · deliver to your door</div>
          <div style={{ position: 'absolute', right: -10, bottom: -14, fontSize: 90, opacity: .18 }}>👗</div>
        </div>}
        <div style={{ margin: '0 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.5px solid ' + T.ink, padding: '8px 2px' }}>
          <span style={{ color: T.sub }}>🔍</span><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search kurta, saree, jeans…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: T.ink }} />
          {q && <span onClick={() => setQ('')} style={{ color: T.sub, cursor: 'pointer' }}>✕</span>}
        </div>
        <div style={{ display: 'flex', gap: 22, overflowX: 'auto', padding: '2px 16px 14px' }}>
          {F_CATS.map(c => <div key={c} onClick={() => setCat(c)} style={{ fontSize: 12.5, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: cat === c ? 700 : 500, color: cat === c ? T.ink : T.sub, borderBottom: '2px solid ' + (cat === c ? T.acc : 'transparent'), paddingBottom: 5, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{c}</div>)}
        </div>
        {!shop && shops.length > 0 && <>
          <div style={head({ padding: '4px 16px 10px', fontSize: 22 }, 22)}>Boutiques</div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 16px 18px' }}>
            {shops.map(s => <div key={s.id} onClick={() => { setShop(s); setCat('All'); }} style={{ textAlign: 'center', flexShrink: 0, cursor: 'pointer', width: 76 }}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', background: T.acc2, border: '2px solid ' + T.acc, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.head, fontSize: 26, fontWeight: 700 }}>{(s.name || '?')[0]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            </div>)}
          </div>
        </>}
        <div style={head({ padding: '0 16px 10px', fontSize: 22 }, 22)}>{cat === 'All' ? 'New arrivals' : cat}</div>
        {pl && <Spin T={T} />}
        {serr && <div style={{ margin: '0 16px 14px', padding: 14, background: '#FEE2E2', color: '#991B1B', borderRadius: 14, fontSize: 12.5, lineHeight: 1.5 }}>⚠️ Database permission error ({serr}). Firebase Rules me Mall collections ko Publish karo.</div>}
        {!pl && shops.length === 0 && <div style={{ margin: '0 16px', padding: 22, border: '1px dashed ' + T.line, textAlign: 'center', color: T.sub, fontSize: 13 }}>Boutiques jald hi judne wali hain ✨</div>}
        {!pl && shops.length > 0 && prods.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.sub, fontSize: 13 }}>Kuch nahi mila 🔎</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 12px', padding: '0 16px' }}>{prods.map(p => <Tile key={p.id} p={p} />)}</div>
      </Scroll>
      {toast}
    </Shell>
  );
}

/* ═══════════════════════ DAILY RIDE — CAB BOOKING (Ola/Uber style) ═══════════════════════ */
const CAB_TYPES = [
  { id: 'bike', n: 'Bike', e: '🏍️', seats: 1, base: 20, km: 6, min: 30, per: 0.4, desc: 'Fastest through traffic' },
  { id: 'auto', n: 'Auto', e: '🛺', seats: 3, base: 30, km: 10, min: 45, per: 0.5, desc: 'Budget friendly' },
  { id: 'mini', n: 'Mini', e: '🚗', seats: 4, base: 45, km: 12, min: 70, per: 0.7, desc: 'Compact AC hatchback' },
  { id: 'sedan', n: 'Sedan', e: '🚕', seats: 4, base: 60, km: 15, min: 100, per: 0.9, desc: 'Comfortable sedan' },
  { id: 'suv', n: 'SUV', e: '🚙', seats: 6, base: 90, km: 19, min: 150, per: 1.2, desc: 'Space for the family' },
];
const calcFare = (t, km, min) => Math.max(Number(t.min) || 0, Math.round(((+t.base || 0) + (+t.km || 0) * km + (+t.per || 0) * min) / 5) * 5);
function useCabTypes() {
  const [o, setO] = useState({});
  useEffect(() => { getDoc(doc(db, 'mall_config', 'cab')).then(s => { if (s.exists()) setO(s.data().types || {}); }).catch(() => {}); }, []);
  return CAB_TYPES.map(t => ({ ...t, ...(o[t.id] || {}) }));
}
const fresh = p => p && p.online && p.loc && Date.now() - p.loc.ts < 90000 && p.active !== false;
const etaMin = (km, kmh = 24) => Math.max(1, Math.round(km / kmh * 60));

/* free map stack: Leaflet + OpenStreetMap/CARTO tiles + Nominatim + OSRM (koi API key nahi) */
let _lp = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (_lp) return _lp;
  const srcs = [['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'], ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js']];
  const load = ([css, js]) => new Promise((res, rej) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = js; s.onload = () => (window.L ? res(window.L) : rej(new Error('map'))); s.onerror = () => rej(new Error('map')); document.head.appendChild(s);
  });
  _lp = load(srcs[0]).catch(() => load(srcs[1])).catch(() => { _lp = null; throw new Error('Map load nahi hua — internet check karo'); });
  return _lp;
}
async function revGeo(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`); const j = await r.json(); const a = j.address || {};
    const p = [a.road || a.neighbourhood || a.hamlet || a.amenity, a.suburb || a.village || a.town || a.city_district, a.city || a.county || a.state_district].filter(Boolean);
    return clean(p.length ? p.join(', ') : String(j.display_name || '').split(',').slice(0, 3).join(','), 90) || 'Pinned location';
  } catch (e) { return 'Pinned location'; }
}
async function searchPlaces(qs, near) {
  try {
    const vb = near ? `&viewbox=${near.lng - .7},${near.lat + .7},${near.lng + .7},${near.lat - .7}` : '';
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(qs)}&countrycodes=in&limit=6${vb}&accept-language=en`); const j = await r.json();
    return j.map(x => ({ lat: r5(+x.lat), lng: r5(+x.lon), addr: clean(String(x.display_name).split(',').slice(0, 3).join(','), 90) }));
  } catch (e) { return []; }
}
async function getRoute(a, b) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`); const j = await r.json(); const rt = j.routes && j.routes[0]; if (!rt) throw new Error('no route');
    let pts = rt.geometry.coordinates.map(c => [c[1], c[0]]); if (pts.length > 90) { const st = Math.ceil(pts.length / 90); pts = pts.filter((_, i) => i % st === 0 || i === pts.length - 1); }
    return { km: rt.distance / 1000, min: rt.duration / 60, pts };
  } catch (e) { const km = hav(a, b) * 1.35; return { km, min: km / 28 * 60, pts: [[a.lat, a.lng], [b.lat, b.lng]], approx: true }; }
}

function CabMap({ center, pin, onMove, pickup, drop, route, driver, drivers, fitKey, bottomPad = 300 }) {
  const el = useRef(null), S = useRef({}); const [ready, setReady] = useState(false); const [err, setErr] = useState('');
  S.current.pin = pin; S.current.onMove = onMove;
  useEffect(() => {
    let dead = false;
    loadLeaflet().then(L => {
      if (dead || !el.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(center ? [center.lat, center.lng] : [26.2389, 73.0243], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'mall-dark-tiles', attribution: '© OpenStreetMap contributors' }).addTo(m);
      try { m.attributionControl.setPrefix(false); } catch (e) {}
      S.current.L = L; S.current.m = m; S.current.lay = {}; S.current.dm = {};
      m.on('moveend', () => { if (S.current.pin && S.current.onMove) { const c = m.getCenter(); S.current.onMove({ lat: r5(c.lat), lng: r5(c.lng) }); } });
      setTimeout(() => { try { m.invalidateSize(); } catch (e) {} }, 250);
      setReady(true);
    }).catch(e => setErr(e.message));
    return () => { dead = true; try { S.current.m && S.current.m.remove(); } catch (e) {} S.current = {}; };
  }, []);
  const put = (name, pt, html, anchor) => {
    const { L, m, lay } = S.current; if (!m) return;
    if (!pt) { if (lay[name]) { m.removeLayer(lay[name]); delete lay[name]; } return; }
    const ic = L.divIcon({ className: '', html, iconSize: [34, 34], iconAnchor: anchor || [17, 17] });
    if (lay[name]) { lay[name].setLatLng([pt.lat, pt.lng]); lay[name].setIcon(ic); } else lay[name] = L.marker([pt.lat, pt.lng], { icon: ic, interactive: false, keyboard: false }).addTo(m);
  };
  useEffect(() => { if (ready && center && S.current.m) S.current.m.setView([center.lat, center.lng], center.zoom || 16, { animate: true }); }, [ready, center && center.k]);
  useEffect(() => { if (ready) put('pu', pickup, '<div style="width:22px;height:22px;border-radius:50%;background:#FFD60A;border:5px solid #0B0F14;box-shadow:0 0 0 3px #FFD60A,0 4px 14px rgba(0,0,0,.6);margin:6px"></div>'); }, [ready, pickup && pickup.lat, pickup && pickup.lng]);
  useEffect(() => { if (ready) put('dr', drop, '<div style="width:22px;height:22px;background:#0B0F14;border:4px solid #FFD60A;box-shadow:0 4px 14px rgba(0,0,0,.6);margin:6px"></div>'); }, [ready, drop && drop.lat, drop && drop.lng]);
  useEffect(() => { if (ready) put('dv', driver, '<div style="width:34px;height:34px;border-radius:50%;background:#FFD60A;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,.7)">🚕</div>'); }, [ready, driver && driver.lat, driver && driver.lng]);
  useEffect(() => {
    if (!ready) return; const { L, m } = S.current; if (S.current.pl) { m.removeLayer(S.current.pl); S.current.pl = null; }
    if (route && route.length > 1) S.current.pl = L.polyline(route, { color: '#FFD60A', weight: 5, opacity: .9, lineJoin: 'round' }).addTo(m);
  }, [ready, route && route.length, route && route[0] && route[0][0]]);
  useEffect(() => {
    if (!ready) return; const { L, m, dm } = S.current; const ids = {};
    (drivers || []).forEach(d => { ids[d.id] = 1; const ic = L.divIcon({ className: '', html: '<div style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.8))">🚕</div>', iconSize: [24, 24], iconAnchor: [12, 12] }); if (dm[d.id]) dm[d.id].setLatLng([d.loc.lat, d.loc.lng]); else dm[d.id] = L.marker([d.loc.lat, d.loc.lng], { icon: ic, interactive: false }).addTo(m); });
    Object.keys(dm).forEach(k => { if (!ids[k]) { m.removeLayer(dm[k]); delete dm[k]; } });
  }, [ready, (drivers || []).map(d => d.id + d.loc.lat + d.loc.lng).join('|')]);
  useEffect(() => {
    if (!ready || !fitKey) return; const { L, m } = S.current; const pts = [];
    if (pickup) pts.push([pickup.lat, pickup.lng]); if (drop) pts.push([drop.lat, drop.lng]); if (driver) pts.push([driver.lat, driver.lng]); (route || []).forEach(p => pts.push(p));
    if (pts.length > 1) { try { m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 90], paddingBottomRight: [40, bottomPad], maxZoom: 17 }); } catch (e) {} }
    else if (pts.length === 1) m.setView(pts[0], 16);
  }, [ready, fitKey]);
  return <div style={{ position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate' }}>
    <div ref={el} style={{ position: 'absolute', inset: 0, background: '#0B0F14' }} />
    {err && <div style={{ position: 'absolute', top: 90, left: 16, right: 16, zIndex: 5, background: '#7F1D1D', color: '#fff', padding: 12, borderRadius: 12, fontSize: 12.5 }}>{err}</div>}
  </div>;
}

const Sheet = ({ T, children, style }) => <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, background: T.card, borderRadius: '26px 26px 0 0', padding: '12px 18px calc(16px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -12px 40px rgba(0,0,0,.55)', animation: 'mUp .3s ease', maxHeight: '74%', overflowY: 'auto', ...style }}><div style={{ width: 42, height: 4, borderRadius: 4, background: T.line, margin: '0 auto 12px' }} />{children}</div>;
const YBtn = ({ T, onClick, children, off, style }) => <div onClick={off ? undefined : onClick} className="tap" style={{ background: off ? T.acc2 : T.acc, color: off ? T.sub : T.accTxt, borderRadius: 16, padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 15.5, cursor: off ? 'default' : 'pointer', ...style }}>{children}</div>;
const Pin = ({ label }) => <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-100%)', zIndex: 10, pointerEvents: 'none', textAlign: 'center' }}>
  <div style={{ background: '#FFD60A', color: '#0B0F14', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
  <div style={{ width: 4, height: 26, background: '#FFD60A', margin: '0 auto', borderRadius: 2, boxShadow: '0 4px 10px rgba(0,0,0,.6)' }} />
  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFD60A', margin: '-2px auto 0', boxShadow: '0 0 0 6px rgba(255,214,10,.25)' }} />
</div>;
const TopBar = ({ T, onBack, right, title }) => <div style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top,0px))', left: 14, right: 14, zIndex: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
  <RoundBtn T={T} onClick={onBack} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}>←</RoundBtn>
  {title && <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}>{title}</div>}
  <div style={{ flex: 1 }} />{right}
</div>;

function Booking({ T, types, partners, user, rides, say, onBack, onHistory }) {
  const [step, setStep] = useState('pickup'); const [pickup, setPickup] = useState(null), [drop, setDrop] = useState(null);
  const [ctr, setCtr] = useState(null), [addr, setAddr] = useState(''), [fly, setFly] = useState(null);
  const [route, setRoute] = useState(null), [sel, setSel] = useState('mini'), [busy, setBusy] = useState(false);
  const [qt, setQt] = useState(''), [res, setRes] = useState([]), [srch, setSrch] = useState(false), [fit, setFit] = useState(0);
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);
  const locate = manual => {
    const def = { lat: 26.2389, lng: 73.0243 };
    const done = (p, real) => { if (!alive.current) return; setFly({ ...p, k: Date.now() }); setCtr(p); if (!real) say('GPS nahi mila — map hila ke pickup set karo ya 🎯 dabao'); else if (manual) say('Location mil gayi ✓'); };
    if (!navigator.geolocation) { if (manual) say('GPS support nahi hai'); else done(def, false); return; }
    const ok = g => done({ lat: r5(g.coords.latitude), lng: r5(g.coords.longitude) }, true);
    navigator.geolocation.getCurrentPosition(ok, () => navigator.geolocation.getCurrentPosition(ok, () => { if (manual) say('Location permission off hai — Chrome site settings me allow karo'); else done(def, false); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };
  useEffect(() => { locate(false); }, []);
  const pinStep = step === 'pickup' || step === 'dropmap';
  useEffect(() => { if (!ctr || !pinStep) return; setAddr(''); const t = setTimeout(async () => setAddr(await revGeo(ctr.lat, ctr.lng)), 650); return () => clearTimeout(t); }, [ctr && ctr.lat, ctr && ctr.lng, step]);
  useEffect(() => { if (step !== 'dest' || qt.trim().length < 3) { setRes([]); return; } setSrch(true); const t = setTimeout(async () => { setRes(await searchPlaces(qt.trim(), pickup)); setSrch(false); }, 700); return () => clearTimeout(t); }, [qt, step]);
  const nearby = tid => { if (!pickup) return null; const l = partners.filter(p => p.vehicleType === tid && fresh(p) && hav(p.loc, pickup) <= 10); if (!l.length) return null; return { n: l.length, eta: etaMin(Math.min(...l.map(p => hav(p.loc, pickup))) * 1.3) + 1 }; };
  const nearDrivers = pickup ? partners.filter(p => fresh(p) && hav(p.loc, pickup) <= 10) : [];
  const pickDrop = async d => { setDrop(d); setStep('options'); setRoute(null); const r = await getRoute(pickup, d); setRoute(r); setFit(k => k + 1); };
  const opts = types.map(t => ({ ...t, fare: route ? calcFare(t, route.km, route.min) : 0, near: nearby(t.id) }));
  const cur = opts.find(o => o.id === sel) || opts[0];
  const recents = (() => { const seen = {}; return (rides || []).filter(r => r.drop && r.drop.addr).sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0)).filter(r => !seen[r.drop.addr] && (seen[r.drop.addr] = 1)).slice(0, 4).map(r => r.drop); })();
  const book = async () => {
    if (busy || !route || !cur) return; const lk = hit('cab_book', 6, 30); if (lk) { say('Bahut zyada bookings. ' + lk + ' min baad try karo'); return; }
    setBusy(true);
    try { const rr = await addDoc(collection(db, 'cab_rides'), { userId: user.uid, userName: clean(user.name, 40), phone: user.phone || '', pickup, drop, distanceKm: +route.km.toFixed(1), durationMin: Math.round(route.min), route: flatPts(route.pts), vehicle: cur.id, vehicleName: cur.n, fare: cur.fare, pay: 'cash', otp: String(1000 + Math.floor(Math.random() * 9000)), status: 'searching', createdMs: Date.now(), createdAt: serverTimestamp() }); notifyEvent('ride_new', { rideId: rr.id }); }
    catch (e) { say('Booking fail: ' + e.message); }
    setBusy(false);
  };
  return (
    <>
      <CabMap center={fly} pin={pinStep} onMove={setCtr} pickup={step === 'pickup' || step === 'dropmap' ? (step === 'dropmap' ? pickup : null) : pickup} drop={step === 'options' ? drop : null} route={step === 'options' && route ? route.pts : null} drivers={nearDrivers.map(p => ({ id: p.id, loc: p.loc }))} fitKey={fit} bottomPad={step === 'options' ? 380 : 260} />
      <TopBar T={T} onBack={step === 'pickup' ? onBack : () => setStep(step === 'options' ? 'dest' : step === 'dropmap' ? 'dest' : 'pickup')} right={<div style={{ display: 'flex', gap: 8 }}>{pinStep && <RoundBtn T={T} onClick={() => locate(true)} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}>🎯</RoundBtn>}<RoundBtn T={T} onClick={onHistory} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}>🕘</RoundBtn></div>} />
      {pinStep && <Pin label={step === 'pickup' ? 'Pickup here' : 'Drop here'} />}
      {step === 'pickup' && <Sheet T={T}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: T.sub }}>PICKUP LOCATION</div>
        <div style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 4px', minHeight: 24 }}>{addr || 'Locating…'}</div>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>{nearDrivers.length ? '🚕 ' + nearDrivers.length + ' driver' + (nearDrivers.length > 1 ? 's' : '') + ' online nearby' : 'Map ko hila ke exact jagah chuno'}</div>
        <YBtn T={T} off={!addr || !ctr} onClick={() => { setPickup({ lat: ctr.lat, lng: ctr.lng, addr }); setStep('dest'); }}>Confirm pickup</YBtn>
      </Sheet>}
      {step === 'dest' && <Sheet T={T} style={{ maxHeight: '82%' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: T.acc }} /><div style={{ fontSize: 13, color: T.sub, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pickup && pickup.addr}</div><div onClick={() => setStep('pickup')} style={{ fontSize: 12, color: T.acc, fontWeight: 700, cursor: 'pointer' }}>Edit</div></div>
        <input autoFocus value={qt} onChange={e => setQt(e.target.value)} placeholder="Where to? (area, shop, village…)" style={inp(T, { background: T.acc2, border: '1.5px solid ' + T.acc })} />
        <div onClick={() => setStep('dropmap')} className="tap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', cursor: 'pointer', borderBottom: '1px solid ' + T.line }}><div style={{ width: 36, height: 36, borderRadius: 12, background: T.acc2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</div><div style={{ fontSize: 14, fontWeight: 600 }}>Set drop location on map</div></div>
        {srch && <div style={{ padding: 14, color: T.sub, fontSize: 13 }}>Searching…</div>}
        {res.map((r, i) => <div key={i} onClick={() => pickDrop(r)} className="tap" style={{ display: 'flex', gap: 12, padding: '12px 4px', borderBottom: '1px solid ' + T.line, cursor: 'pointer' }}><div style={{ marginTop: 2 }}>📌</div><div style={{ fontSize: 13.5, lineHeight: 1.35 }}>{r.addr}</div></div>)}
        {!srch && qt.trim().length >= 3 && res.length === 0 && <div style={{ padding: 14, color: T.sub, fontSize: 13 }}>Kuch nahi mila — map se drop set karo</div>}
        {qt.trim().length < 3 && recents.length > 0 && <><div style={{ fontSize: 11, letterSpacing: 2, color: T.sub, margin: '14px 0 4px' }}>RECENT</div>{recents.map((r, i) => <div key={i} onClick={() => pickDrop(r)} className="tap" style={{ display: 'flex', gap: 12, padding: '11px 4px', cursor: 'pointer' }}><div>🕘</div><div style={{ fontSize: 13.5 }}>{r.addr}</div></div>)}</>}
      </Sheet>}
      {step === 'dropmap' && <Sheet T={T}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: T.sub }}>DROP LOCATION</div>
        <div style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 14px', minHeight: 24 }}>{addr || 'Locating…'}</div>
        <YBtn T={T} off={!addr || !ctr} onClick={() => pickDrop({ lat: ctr.lat, lng: ctr.lng, addr })}>Confirm drop</YBtn>
      </Sheet>}
      {step === 'options' && <Sheet T={T} style={{ maxHeight: '68%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, color: T.sub, flex: 1, minWidth: 0 }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>● {pickup && pickup.addr}</div><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>■ {drop && drop.addr}</div></div>
          <div onClick={() => setStep('dest')} style={{ fontSize: 12, color: T.acc, fontWeight: 700, cursor: 'pointer', paddingLeft: 10 }}>Change</div>
        </div>
        {route ? <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>{route.km.toFixed(1)} km · ~{Math.round(route.min)} min{route.approx ? ' (approx)' : ''}</div> : <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>Route calculate ho raha hai…</div>}
        {opts.map(o => <div key={o.id} onClick={() => setSel(o.id)} className="tap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 16, marginBottom: 8, cursor: 'pointer', background: sel === o.id ? 'rgba(255,214,10,.1)' : 'transparent', border: '1.5px solid ' + (sel === o.id ? T.acc : T.line) }}>
          <div style={{ fontSize: 34, width: 44, textAlign: 'center' }}>{o.e}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{o.n} <span style={{ fontSize: 11, color: T.sub, fontWeight: 500 }}>· 👤 {o.seats}</span></div><div style={{ fontSize: 11.5, color: o.near ? T.acc : T.sub }}>{o.near ? o.near.eta + ' min away · ' + o.near.n + ' nearby' : 'No driver nearby right now'}</div></div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{route ? rs(o.fare) : '…'}</div>
        </div>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px 14px', fontSize: 13, color: T.sub }}>💵 <b style={{ color: T.ink }}>Cash</b> — driver ko ride ke baad pay karo</div>
        <YBtn T={T} off={!route || busy} onClick={book}>{busy ? 'Booking…' : route ? 'Book ' + cur.n + ' · ' + rs(cur.fare) : 'Please wait…'}</YBtn>
      </Sheet>}
    </>
  );
}

function RideView({ T, ride, say, onBack }) {
  const st = ride.status, dl = ride.driverLoc && ride.driverLoc.lat ? ride.driverLoc : null;
  const pickup = ride.pickup, drop = ride.drop; const [fit, setFit] = useState(1);
  useEffect(() => { setFit(k => k + 1); }, [st]);
  useEffect(() => {
    if (st !== 'searching') return;
    const t = setInterval(() => { if (Date.now() - (ride.createdMs || 0) > 180000) { updateDoc(doc(db, 'cab_rides', ride.id), { status: 'cancelled', cancelledBy: 'system', reason: 'no_driver' }).then(() => say('Koi driver nahi mila. Thodi der baad try karo.')).catch(() => {}); } }, 5000);
    return () => clearInterval(t);
  }, [st, ride.id]);
  const cancel = async () => { if (!window.confirm('Ride cancel karein?')) return; try { await updateDoc(doc(db, 'cab_rides', ride.id), { status: 'cancelled', cancelledBy: 'rider', cancelledMs: Date.now() }); notifyEvent('ride_status', { rideId: ride.id }); } catch (e) { say('Cancel fail: ' + e.message); } };
  const share = () => { const t = `Meri Daily Ride: ${ride.driverName || 'driver'} · ${ride.vehicleNo || ''} · ${ride.vehicleModel || ''}. ${pickup.addr} → ${drop.addr}`; if (navigator.share) navigator.share({ text: t }).catch(() => {}); else { try { navigator.clipboard.writeText(t); say('Ride details copy ho gaye'); } catch (e) {} } };
  const eta = dl ? etaMin(hav(dl, st === 'ongoing' ? drop : pickup) * 1.3) : null;
  const banner = st === 'searching' ? 'Finding your ' + ride.vehicleName + '…' : st === 'accepted' ? (eta ? 'Driver arriving in ' + eta + ' min' : 'Driver is on the way') : st === 'arrived' ? 'Driver has arrived 🎉' : 'On trip' + (eta ? ' · ' + eta + ' min to drop' : '');
  return (
    <>
      <CabMap center={st === 'searching' ? { lat: pickup.lat, lng: pickup.lng, k: 1, zoom: 15 } : null} pickup={pickup} drop={st === 'searching' ? null : drop} route={st === 'searching' ? null : unflat(ride.route)} driver={st === 'searching' ? null : dl} fitKey={st === 'searching' ? 0 : fit} bottomPad={330} />
      <TopBar T={T} onBack={onBack} right={st !== 'searching' ? <RoundBtn T={T} onClick={share} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}>📤</RoundBtn> : null} />
      <Sheet T={T}>
        {st === 'searching' ? <>
          <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', border: '2px solid ' + T.acc, animation: 'mRadar 2.4s ease-out ' + (i * .8) + 's infinite' }} />)}
            <div style={{ fontSize: 40, animation: 'mBob 1.4s ease-in-out infinite' }}>{(CAB_TYPES.find(c => c.id === ride.vehicle) || {}).e || '🚕'}</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{banner}</div>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: T.sub, margin: '4px 0 14px' }}>Nearby drivers ko request bheji gayi hai · {rs(ride.fare)} · {ride.distanceKm} km</div>
          <YBtn T={T} onClick={cancel} style={{ background: T.acc2, color: T.ink }}>Cancel request</YBtn>
        </> : <>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{banner}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, background: T.acc2, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.acc, color: T.accTxt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>{(ride.driverName || 'D')[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{ride.driverName} <span style={{ fontSize: 12, color: T.acc }}>★ {ride.driverRating || 'New'}</span></div><div style={{ fontSize: 12, color: T.sub }}>{ride.vehicleModel || ride.vehicleName}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ background: '#fff', color: '#111', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8, letterSpacing: 1 }}>{ride.vehicleNo || '—'}</div></div>
          </div>
          {(st === 'accepted' || st === 'arrived') && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 14, border: '1.5px dashed ' + T.acc, marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, color: T.sub }}>Start OTP — driver ko batao</div>
            <div style={{ display: 'flex', gap: 6 }}>{String(ride.otp).split('').map((d, i) => <div key={i} style={{ width: 34, height: 42, borderRadius: 10, background: T.acc, color: T.accTxt, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>)}</div>
          </div>}
          <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 12 }}><div>● {pickup.addr}</div><div style={{ marginTop: 3 }}>■ {drop.addr}</div></div>
          <div style={{ display: 'flex', gap: 10 }}>
            {ride.driverPhone && <a href={'tel:' + ride.driverPhone} style={{ flex: 1, textDecoration: 'none' }}><YBtn T={T}>📞 Call · {rs(ride.fare)}</YBtn></a>}
            {st !== 'ongoing' && <YBtn T={T} onClick={cancel} style={{ flex: 1, background: T.acc2, color: T.ink }}>Cancel</YBtn>}
          </div>
        </>}
      </Sheet>
    </>
  );
}

function DoneView({ T, ride, say }) {
  const [star, setStar] = useState(5), [busy, setBusy] = useState(false);
  const fin = async rate => {
    if (busy) return; setBusy(true);
    try {
      await updateDoc(doc(db, 'cab_rides', ride.id), rate ? { rating: star, riderDone: true } : { riderDone: true });
      if (rate && ride.driverId) await updateDoc(doc(db, 'mall_partners', ride.driverId), { ratingSum: increment(star), ratingCount: increment(1) });
    } catch (e) { say('Error: ' + e.message); }
    setBusy(false);
  };
  return (
    <Scroll style={{ padding: '60px 20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: T.acc, color: T.accTxt, fontSize: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'mBob 1.6s ease-in-out infinite' }}>✓</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 18 }}>You've arrived</div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 4, textAlign: 'center' }}>{ride.drop.addr}</div>
      <div style={{ margin: '22px 0 6px', fontSize: 12, letterSpacing: 2, color: T.sub }}>PAY DRIVER (CASH)</div>
      <div style={{ fontSize: 52, fontWeight: 700, color: T.acc, letterSpacing: -1 }}>{rs(ride.fare)}</div>
      <div style={{ fontSize: 12.5, color: T.sub }}>{ride.distanceKm} km · {ride.durationMin} min · {ride.vehicleName}</div>
      <div style={{ marginTop: 28, fontSize: 14, fontWeight: 600 }}>Rate {ride.driverName || 'your driver'}</div>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 26px' }}>{[1, 2, 3, 4, 5].map(n => <div key={n} onClick={() => setStar(n)} style={{ fontSize: 38, cursor: 'pointer', color: n <= star ? T.acc : T.line }}>★</div>)}</div>
      <YBtn T={T} onClick={() => fin(true)} style={{ width: '100%' }}>{busy ? 'Saving…' : 'Submit rating'}</YBtn>
      <div onClick={() => fin(false)} style={{ marginTop: 14, fontSize: 13, color: T.sub, cursor: 'pointer' }}>Skip</div>
    </Scroll>
  );
}

function RideHistory({ T, rides, onBack }) {
  const list = rides.filter(r => ['completed', 'cancelled'].includes(r.status)).sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0));
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}><RoundBtn T={T} onClick={onBack}>←</RoundBtn><div style={{ fontSize: 20, fontWeight: 700 }}>Your rides</div></div>
    <Scroll style={{ padding: '4px 16px 40px' }}>
      {list.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: T.sub }}><div style={{ fontSize: 44 }}>🚕</div><div style={{ marginTop: 8 }}>Abhi koi ride nahi</div></div>}
      {list.map(r => <div key={r.id} style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 18, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub }}><span>{timeAgo(r.createdMs)} · {r.vehicleName}</span><span style={{ color: r.status === 'completed' ? T.acc : '#F87171', fontWeight: 700 }}>{r.status === 'completed' ? rs(r.fare) : 'Cancelled'}</span></div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>● {r.pickup.addr}<br />■ {r.drop.addr}</div>
        {r.status === 'completed' && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 6 }}>{r.distanceKm} km · {r.driverName}{r.rating ? ' · you rated ' + r.rating + '★' : ''}</div>}
      </div>)}
    </Scroll>
  </>;
}

function CabApp({ user, onBack }) {
  const T = TH.cab; useMallChrome(T.bg); const [say, toast] = useToast(); const types = useCabTypes();
  const uid = user && user.uid; const [hist, setHist] = useState(false);
  const [rides] = useCol('cab_rides', uid ? [where('userId', '==', uid)] : null, 'cr' + uid);
  const [partners] = useCol('mall_partners', [where('type', '==', 'cab')], 'cp');
  const act = rides.find(r => ['searching', 'accepted', 'arrived', 'ongoing'].includes(r.status));
  const unrated = !act && rides.filter(r => r.status === 'completed' && !r.riderDone).sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0))[0];
  let body;
  if (!uid) body = <div style={{ padding: 40, textAlign: 'center' }}><div style={{ fontSize: 40 }}>🔒</div><div style={{ margin: '10px 0 20px' }}>Cab book karne ke liye pehle login karo</div><YBtn T={T} onClick={onBack}>Go back</YBtn></div>;
  else if (hist) body = <RideHistory T={T} rides={rides} onBack={() => setHist(false)} />;
  else if (act) body = <RideView T={T} ride={act} say={say} onBack={onBack} />;
  else if (unrated) body = <DoneView T={T} ride={unrated} say={say} />;
  else body = <Booking T={T} types={types} partners={partners} user={user} rides={rides} say={say} onBack={onBack} onHistory={() => setHist(true)} />;
  return <Shell T={T}>{body}{toast}</Shell>;
}

/* ═══════════════════════ PARTNER LOGIN (teeno ke alag design) ═══════════════════════ */
const PCFG = {
  cab: { T: TH.cab, title: 'Driver Partner', sub: 'Go online · accept rides · earn daily', icon: '🚕', tag: 'DAILY RIDE' },
  grocery: { T: TH.grocery, title: 'Shop Partner', sub: 'Run your store on Daily Mart', icon: '🥬', tag: 'DAILY MART' },
  fashion: { T: TH.fashion, title: 'Boutique Partner', sub: 'Show your collection on Daily Style', icon: '👗', tag: 'DAILY STYLE' },
};
function PartnerLogin({ type, onLogin, onBack }) {
  const C = PCFG[type], T = C.T; useMallChrome(T.bg);
  const [id, setId] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const go = async () => {
    setErr(''); const ID = id.trim().toUpperCase(); if (!ID || !pw) { setErr('ID aur password daalo'); return; }
    const lk = hit('mlogin', 5, 15); if (lk) { setErr('Too many attempts. Try again in ' + lk + ' min.'); return; }
    setBusy(true);
    try {
      const j = await apiPost('/api/login', { role: type, id: ID, pass: pw.trim() });
      if (!j.success) { setErr(j.error === 'Invalid credentials' ? 'Invalid ID or password' : (j.error || 'Login error')); setBusy(false); return; }
      await signInToken(j.customToken); unhit('mlogin'); onLogin(j.profile);
    } catch (e) { setErr(e.message || 'Login error'); }
    setBusy(false);
  };
  const hero = type === 'cab'
    ? <div style={{ position: 'relative', height: 190, overflow: 'hidden', background: 'linear-gradient(180deg,#0B0F14,#141B24)', borderRadius: '0 0 36px 36px' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 38, height: 4, backgroundImage: 'repeating-linear-gradient(90deg,#FFD60A 0 40px,transparent 40px 80px)', animation: 'mRoad .8s linear infinite' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 34, background: '#1F2A37' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 44, fontSize: 70, transform: 'translateX(-50%)', animation: 'mBob 1.2s ease-in-out infinite' }}>🚕</div>
        <div style={{ position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: 5, color: T.acc, fontWeight: 700 }}>{C.tag}</div>
      </div>
    : type === 'grocery'
    ? <div style={{ position: 'relative', height: 190, background: 'linear-gradient(160deg,#0FA968,#07754A)', borderRadius: '0 0 40px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {['🥕', '🍅', '🥛', '🍎', '🌽'].map((e, i) => <div key={i} style={{ position: 'absolute', fontSize: 26 + (i % 3) * 8, left: (8 + i * 20) + '%', top: (i % 2 ? 18 : 120), opacity: .35, animation: 'mBob ' + (2 + i * .3) + 's ease-in-out infinite' }}>{e}</div>)}
        <div style={{ width: 96, height: 96, borderRadius: 30, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, boxShadow: '0 14px 36px rgba(0,0,0,.25)', zIndex: 1 }}>{C.icon}</div>
      </div>
    : <div style={{ position: 'relative', height: 190, background: T.bg, borderBottom: '1px solid ' + T.line, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: T.sub }}>EST. BHOPALGARH</div>
        <div style={{ fontFamily: T.head, fontSize: 52, fontStyle: 'italic', fontWeight: 600, lineHeight: 1, margin: '6px 0' }}>Atelier</div>
        <div style={{ width: 60, height: 1.5, background: T.acc }} />
        <div style={{ position: 'absolute', right: 20, bottom: 10, fontSize: 38, opacity: .25 }}>👗</div>
      </div>;
  const serif = type === 'fashion';
  return (
    <Shell T={T}>
      <Scroll>
        {hero}
        <div style={{ padding: '24px 22px' }}>
          <div style={{ fontFamily: T.head, fontSize: serif ? 34 : 26, fontWeight: serif ? 600 : 700, letterSpacing: serif ? 0 : -.4 }}>{C.title}</div>
          <div style={{ fontSize: 13, color: T.sub, margin: '4px 0 22px' }}>{C.sub}</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: T.sub, marginBottom: 6 }}>PARTNER ID</div>
          <input value={id} onChange={e => setId(e.target.value.toUpperCase())} placeholder={PFX[type] + '1234'} autoCapitalize="characters" style={inp(T, { marginBottom: 14, letterSpacing: 2, fontWeight: 600 })} />
          <div style={{ fontSize: 11, letterSpacing: 2, color: T.sub, marginBottom: 6 }}>PASSWORD</div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="••••••••" style={inp(T, { paddingRight: 50 })} />
            <div onClick={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: 13, cursor: 'pointer', fontSize: 16 }}>{show ? '🙈' : '👁️'}</div>
          </div>
          {err && <div style={{ background: 'rgba(220,38,38,.12)', color: '#F87171', padding: '10px 14px', borderRadius: 12, fontSize: 13, margin: '10px 0' }}>{err}</div>}
          <div onClick={busy ? undefined : go} className="tap" style={{ marginTop: 14, background: T.acc, color: T.accTxt, padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 15, borderRadius: serif ? 4 : 16, letterSpacing: serif ? 2 : 0, textTransform: serif ? 'uppercase' : 'none', opacity: busy ? .6 : 1, cursor: 'pointer' }}>{busy ? 'Checking…' : 'Login'}</div>
          <div style={{ fontSize: 12, color: T.sub, textAlign: 'center', marginTop: 16 }}>ID aur password Daily Basket admin se milta hai</div>
          <div onClick={onBack} style={{ textAlign: 'center', marginTop: 18, fontSize: 13, fontWeight: 600, color: T.sub, cursor: 'pointer' }}>← Back</div>
        </div>
      </Scroll>
    </Shell>
  );
}

/* ═══════════════════════ DRIVER APP ═══════════════════════ */
function DriverApp({ partner, onLogout }) {
  const T = TH.cab; useMallChrome(T.bg); const [say, toast] = useToast();
  const [me, setMe] = useState(partner), [tab, setTab] = useState('ride'), [pos, setPos] = useState(null), [otpIn, setOtpIn] = useState(''), [fit, setFit] = useState(1);
  const last = useRef(null), actRef = useRef(null), tick = useRef(0), prevN = useRef(0), logoutRef = useRef(onLogout); logoutRef.current = onLogout;
  const online = !!me.online;
  useEffect(() => { try { requestNotificationPermission('partner'); } catch (e) {} }, []);
  useEffect(() => { const u = onSnapshot(doc(db, 'mall_partners', partner.id), s => { if (s.exists()) { const d = { ...s.data(), id: s.id }; setMe(d); if (d.active === false) logoutRef.current(); } }, () => {}); return () => u(); }, [partner.id]);
  const [mine] = useCol('cab_rides', [where('driverId', '==', partner.id)], 'm' + partner.id);
  const active = mine.find(r => ['accepted', 'arrived', 'ongoing'].includes(r.status)); actRef.current = active ? active.id : null;
  const [reqs] = useCol('cab_rides', online && !active ? [where('status', '==', 'searching')] : null, 'q' + online + (active ? 1 : 0));
  const list = reqs.filter(r => r.vehicle === me.vehicleType && Date.now() - (r.createdMs || 0) < 240000 && !(r.declinedBy || []).includes(partner.id) && pos && hav(pos, r.pickup) <= 12).map(r => ({ ...r, pd: hav(pos, r.pickup) })).sort((a, b) => a.pd - b.pd);
  useEffect(() => { if (list.length > prevN.current) { try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {} say('🔔 New ride request!'); } prevN.current = list.length; }, [list.length]);
  useEffect(() => {
    if (!online || !navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(g => { last.current = { lat: r5(g.coords.latitude), lng: r5(g.coords.longitude) }; setPos(last.current); }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    const hb = setInterval(() => {
      const p = last.current; if (!p) return; tick.current++; const loc = { lat: p.lat, lng: p.lng, ts: Date.now() };
      if (actRef.current) updateDoc(doc(db, 'cab_rides', actRef.current), { driverLoc: loc }).catch(() => {});
      if (tick.current % 2 === 0 || !actRef.current) updateDoc(doc(db, 'mall_partners', partner.id), { loc }).catch(() => {});
    }, 8000);
    return () => { navigator.geolocation.clearWatch(wid); clearInterval(hb); };
  }, [online, partner.id]);
  const toggle = () => {
    if (online) { if (active) { say('Pehle ride complete karo'); return; } updateDoc(doc(db, 'mall_partners', partner.id), { online: false }).then(() => say('You are offline')).catch(e => say(e.message)); return; }
    if (!navigator.geolocation) { say('GPS support nahi hai'); return; }
    navigator.geolocation.getCurrentPosition(g => { const p = { lat: r5(g.coords.latitude), lng: r5(g.coords.longitude) }; last.current = p; setPos(p); updateDoc(doc(db, 'mall_partners', partner.id), { online: true, loc: { ...p, ts: Date.now() } }).then(() => say('You are online 🟢')).catch(e => say(e.message)); }, () => say('Location permission do — bina GPS online nahi ho sakte'), { enableHighAccuracy: true, timeout: 12000 });
  };
  const accept = async r => {
    try {
      await runTransaction(db, async tx => {
        const ref = doc(db, 'cab_rides', r.id); const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'searching') throw new Error('Ye ride kisi aur ne le li');
        tx.update(ref, { status: 'accepted', driverId: partner.id, driverName: me.ownerName || me.name, driverPhone: me.phone || '', vehicleNo: me.vehicleNo || '', vehicleModel: me.vehicleModel || '', driverRating: ratingOf(me), driverLoc: pos ? { ...pos, ts: Date.now() } : null, acceptedMs: Date.now() });
      });
      say('Ride accepted ✅'); notifyEvent('ride_status', { rideId: r.id }); setFit(k => k + 1);
    } catch (e) { say(e.message); }
  };
  const patch = async p => { try { await updateDoc(doc(db, 'cab_rides', active.id), p); notifyEvent('ride_status', { rideId: active.id }); } catch (e) { say(e.message); } };
  const startTrip = () => { if (otpIn !== String(active.otp)) { const lk = hit('otp_' + active.id, 5, 30); say(lk ? 'Bahut galat OTP — ' + lk + ' min ruko' : 'Wrong OTP'); return; } patch({ status: 'ongoing', startedMs: Date.now() }); setOtpIn(''); };
  const release = () => { if (!window.confirm('Ride chhod dein? Ye dusre driver ko chali jayegi.')) return; patch({ status: 'searching', driverId: null, driverName: null, driverPhone: null, vehicleNo: null, vehicleModel: null, driverLoc: null, declinedBy: arrayUnion(partner.id) }); };
  const nav = pt => window.open('https://www.google.com/maps/dir/?api=1&destination=' + pt.lat + ',' + pt.lng + '&travelmode=driving', '_blank');
  const done = mine.filter(r => r.status === 'completed'), midnight = new Date().setHours(0, 0, 0, 0);
  const today = done.filter(r => (r.completedMs || 0) >= midnight), sum = a => a.reduce((s, r) => s + (r.fare || 0), 0);
  const vt = (CAB_TYPES.find(c => c.id === me.vehicleType) || {});

  const head = <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexShrink: 0 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.acc, color: T.accTxt, fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(me.ownerName || me.name || 'D')[0]}</div>
    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{me.ownerName || me.name}</div><div style={{ fontSize: 11.5, color: T.sub }}>{vt.e} {me.vehicleNo || me.vehicleType} · ★ {ratingOf(me)} · {partner.id}</div></div>
    <div onClick={() => { if (active) { say('Pehle ride complete karo'); return; } if (online) updateDoc(doc(db, 'mall_partners', partner.id), { online: false }).catch(() => {}); onLogout(); }} style={{ fontSize: 12, color: '#F87171', fontWeight: 700, padding: 8, cursor: 'pointer' }}>Logout</div>
  </div>;

  if (active) {
    const st = active.status, rt = unflat(active.route);
    return (
      <Shell T={T}>
        <CabMap pickup={active.pickup} drop={active.drop} route={rt} driver={pos} fitKey={fit} bottomPad={340} />
        <TopBar T={T} onBack={() => say('Ride chal rahi hai')} title={st === 'accepted' ? 'Go to pickup' : st === 'arrived' ? 'Waiting for rider' : 'Trip in progress'} />
        <Sheet T={T}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>{active.userName || 'Rider'}</div><div style={{ fontSize: 12, color: T.sub }}>{active.distanceKm} km · {active.durationMin} min</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 700, color: T.acc }}>{rs(active.fare)}</div><div style={{ fontSize: 11, color: T.sub }}>Cash</div></div>
          </div>
          <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>● {active.pickup.addr}<br />■ {active.drop.addr}</div>
          {st === 'arrived' && <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={otpIn} onChange={e => setOtpIn(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Rider OTP" style={inp(T, { flex: 1, textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 })} />
            <YBtn T={T} off={otpIn.length !== 4} onClick={startTrip} style={{ padding: '14px 22px' }}>Start</YBtn>
          </div>}
          <div style={{ display: 'flex', gap: 8 }}>
            {st !== 'arrived' && <YBtn T={T} onClick={() => nav(st === 'ongoing' ? active.drop : active.pickup)} style={{ flex: 1, background: T.acc2, color: T.ink }}>🧭 Navigate</YBtn>}
            {st === 'accepted' && <YBtn T={T} onClick={() => patch({ status: 'arrived', arrivedMs: Date.now() })} style={{ flex: 1 }}>I've arrived</YBtn>}
            {st === 'ongoing' && <YBtn T={T} onClick={() => { if (window.confirm('Trip complete? ' + rs(active.fare) + ' cash collect karo.')) patch({ status: 'completed', completedMs: Date.now() }); }} style={{ flex: 1 }}>Complete · {rs(active.fare)}</YBtn>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            {active.phone ? <a href={'tel:' + active.phone} style={{ fontSize: 13, color: T.acc, fontWeight: 700, textDecoration: 'none' }}>📞 Call rider</a> : <span />}
            {st !== 'ongoing' && <div onClick={release} style={{ fontSize: 13, color: '#F87171', fontWeight: 700, cursor: 'pointer' }}>Cancel ride</div>}
          </div>
        </Sheet>
        {toast}
      </Shell>
    );
  }
  return (
    <Shell T={T}>
      {head}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', flexShrink: 0 }}>{[['ride', '🚕 Rides'], ['earn', '💰 Earnings']].map(([k, l]) => <Pill key={k} T={T} on={tab === k} onClick={() => setTab(k)}>{l}</Pill>)}</div>
      {tab === 'ride' && <Scroll style={{ padding: '0 16px 40px' }}>
        <div onClick={toggle} className="tap" style={{ borderRadius: 24, padding: 20, marginBottom: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: online ? 'linear-gradient(135deg,#FFD60A,#FFB800)' : T.card, color: online ? '#0B0F14' : T.ink, border: '1px solid ' + (online ? '#FFD60A' : T.line) }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{online ? "You're online" : "You're offline"}</div><div style={{ fontSize: 12.5, opacity: .75, marginTop: 2 }}>{online ? 'Ride requests aapko yahin dikhengi' : 'Tap karke online ho jao'}</div></div>
          <div style={{ width: 62, height: 34, borderRadius: 20, background: online ? '#0B0F14' : T.acc2, position: 'relative' }}><div style={{ position: 'absolute', top: 4, left: online ? 32 : 4, width: 26, height: 26, borderRadius: '50%', background: online ? '#FFD60A' : '#6B7785', transition: 'left .2s' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[['Today', rs(sum(today))], ['Trips', today.length], ['Total', rs(sum(done))]].map(([l, v]) => <div key={l} style={{ flex: 1, background: T.card, border: '1px solid ' + T.line, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}><div style={{ fontSize: 17, fontWeight: 700, color: T.acc }}>{v}</div><div style={{ fontSize: 11, color: T.sub }}>{l}</div></div>)}
        </div>
        {online && pos && <div style={{ position: 'relative', height: 170, borderRadius: 20, overflow: 'hidden', marginBottom: 16, border: '1px solid ' + T.line }}><CabMap center={{ ...pos, k: 1, zoom: 15 }} driver={pos} /></div>}
        {online && <div style={{ fontSize: 12, letterSpacing: 2, color: T.sub, marginBottom: 8 }}>RIDE REQUESTS · {vt.n || ''}</div>}
        {online && list.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: T.sub, fontSize: 13 }}><div style={{ fontSize: 36, animation: 'mBob 1.6s ease-in-out infinite' }}>📡</div>Requests ka intezaar… (12 km ke andar)</div>}
        {list.map(r => <div key={r.id} style={{ background: T.card, border: '1.5px solid ' + T.acc, borderRadius: 20, padding: 14, marginBottom: 12, animation: 'mUp .3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 26, fontWeight: 700, color: T.acc }}>{rs(r.fare)}</div><div style={{ fontSize: 12, color: T.sub }}>pickup {r.pd.toFixed(1)} km door · trip {r.distanceKm} km</div></div>
          <div style={{ fontSize: 13, lineHeight: 1.5, margin: '8px 0 12px' }}>● {r.pickup.addr}<br />■ {r.drop.addr}</div>
          <div style={{ display: 'flex', gap: 8 }}><YBtn T={T} onClick={() => accept(r)} style={{ flex: 1 }}>Accept</YBtn><YBtn T={T} onClick={() => updateDoc(doc(db, 'cab_rides', r.id), { declinedBy: arrayUnion(partner.id) }).catch(() => {})} style={{ background: T.acc2, color: T.ink, padding: '16px 20px' }}>Skip</YBtn></div>
        </div>)}
      </Scroll>}
      {tab === 'earn' && <Scroll style={{ padding: '0 16px 40px' }}>
        <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 22, padding: 20, marginBottom: 16, textAlign: 'center' }}><div style={{ fontSize: 12, letterSpacing: 2, color: T.sub }}>TODAY'S EARNINGS</div><div style={{ fontSize: 44, fontWeight: 700, color: T.acc }}>{rs(sum(today))}</div><div style={{ fontSize: 12.5, color: T.sub }}>{today.length} trips · lifetime {rs(sum(done))} ({done.length} trips)</div></div>
        {done.sort((a, b) => (b.completedMs || 0) - (a.completedMs || 0)).slice(0, 25).map(r => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '12px 4px', borderBottom: '1px solid ' + T.line }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.drop.addr}</div><div style={{ fontSize: 11, color: T.sub }}>{timeAgo(r.completedMs)} · {r.distanceKm} km{r.rating ? ' · ' + r.rating + '★' : ''}</div></div><div style={{ fontWeight: 700, color: T.acc }}>{rs(r.fare)}</div></div>)}
        {done.length === 0 && <div style={{ textAlign: 'center', color: T.sub, padding: 30 }}>Abhi koi trip complete nahi hui</div>}
      </Scroll>}
      {toast}
    </Shell>
  );
}

/* ═══════════════════════ SHOP / BOUTIQUE PARTNER APP ═══════════════════════ */
const EMOJIS = ['🥕', '🍅', '🥔', '🧅', '🥬', '🍎', '🍌', '🍇', '🥛', '🧈', '🧀', '🍞', '🥚', '🌾', '🫘', '🍪', '🍫', '🥤', '☕', '🧴', '🧼', '🪥', '🍚', '🧂', '🛒'];
const NEXT = { placed: ['accepted', 'Accept order'], accepted: ['packed', 'Packed — rider bulao 🛵'] };

function ShopPartnerApp({ type, partner, onLogout }) {
  const T = TH[type]; useMallChrome(T.bg); const [say, toast] = useToast(); const serif = type === 'fashion', PC = PCFG[type];
  const [me, setMe] = useState(partner), [tab, setTab] = useState('orders'), [flt, setFlt] = useState('new'), [edit, setEdit] = useState(null), prevN = useRef(0), logoutRef = useRef(onLogout); logoutRef.current = onLogout;
  useEffect(() => { const u = onSnapshot(doc(db, 'mall_partners', partner.id), s => { if (s.exists()) { const d = { ...s.data(), id: s.id }; setMe(d); if (d.active === false) logoutRef.current(); } }, () => {}); return () => u(); }, [partner.id]);
  const [orders] = useCol('mall_orders', [where('shopId', '==', partner.id)], 'so' + partner.id);
  const [prods] = useCol('mall_products', [where('shopId', '==', partner.id)], 'sp' + partner.id);
  const sorted = [...orders].sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0));
  const nNew = orders.filter(o => o.status === 'placed').length;
  useEffect(() => { try { requestNotificationPermission('partner'); } catch (e) {} }, []);
  useEffect(() => { if (nNew > prevN.current) { try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {} say('🔔 Naya order aaya!'); } prevN.current = nNew; }, [nNew]);
  const shown = sorted.filter(o => flt === 'new' ? o.status === 'placed' : flt === 'active' ? ['accepted', 'packed', 'out'].includes(o.status) : ['delivered', 'cancelled'].includes(o.status));
  const move = async (o, s, extra) => { try { await updateDoc(doc(db, 'mall_orders', o.id), { status: s, [s + 'Ms']: Date.now(), ...(s === 'packed' ? { needRider: true } : {}), ...(extra || {}) }); notifyEvent('mall_order_status', { orderId: o.id }); } catch (e) { say(e.message); } };
  const reject = async o => { if (!window.confirm('Order reject karein?')) return; try { await updateDoc(doc(db, 'mall_orders', o.id), { status: 'cancelled', cancelledBy: 'shop' }); notifyEvent('mall_order_status', { orderId: o.id }); } catch (e) { say(e.message); } };
  const setOpen = async v => { try { await updateDoc(doc(db, 'mall_partners', partner.id), { open: v }); say(v ? 'Store open ✅' : 'Store closed'); } catch (e) { say(e.message); } };
  const delP = async p => { if (!window.confirm('"' + p.name + '" delete karein?')) return; try { await deleteDoc(doc(db, 'mall_products', p.id)); } catch (e) { say(e.message); } };
  const stockP = async p => { try { await updateDoc(doc(db, 'mall_products', p.id), { inStock: p.inStock === false }); } catch (e) { say(e.message); } };
  const todayAmt = orders.filter(o => o.status === 'delivered' && (o.deliveredMs || o.createdMs || 0) >= new Date().setHours(0, 0, 0, 0)).reduce((s, o) => s + (o.total || 0), 0);

  if (edit) return <Shell T={T}><ProductForm T={T} type={type} me={me} init={edit} say={say} onClose={() => setEdit(null)} />{toast}</Shell>;
  return (
    <Shell T={T}>
      <div style={{ background: serif ? T.bg : 'linear-gradient(160deg,#0FA968,#07754A)', color: serif ? T.ink : '#fff', padding: '14px 18px 16px', borderRadius: serif ? 0 : '0 0 26px 26px', borderBottom: serif ? '1px solid ' + T.line : 'none', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: serif ? '50%' : 14, background: serif ? T.acc2 : 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontFamily: T.head, fontWeight: 700 }}>{PC.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: serif ? T.head : T.font, fontSize: serif ? 24 : 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</div><div style={{ fontSize: 11.5, opacity: .8 }}>{partner.id} · {me.open === false ? 'Closed' : 'Open'} · Today {rs(todayAmt)}</div></div>
          <div onClick={() => setOpen(me.open === false)} className="tap" style={{ padding: '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: me.open === false ? '#DC2626' : (serif ? T.acc : '#fff'), color: me.open === false ? '#fff' : (serif ? '#fff' : '#07754A') }}>{me.open === false ? 'CLOSED' : 'OPEN'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 6px', flexShrink: 0 }}>
        {[['orders', '📦 Orders' + (nNew ? ' (' + nNew + ')' : '')], ['products', (serif ? '👗' : '🛒') + ' Products'], ['more', '⚙️ More']].map(([k, l]) => <Pill key={k} T={T} on={tab === k} onClick={() => setTab(k)}>{l}</Pill>)}
      </div>
      {tab === 'orders' && <><div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', flexShrink: 0 }}>{[['new', 'New'], ['active', 'In progress'], ['done', 'Done']].map(([k, l]) => <div key={k} onClick={() => setFlt(k)} style={{ fontSize: 12.5, fontWeight: flt === k ? 700 : 500, color: flt === k ? T.ink : T.sub, borderBottom: '2px solid ' + (flt === k ? T.acc : 'transparent'), padding: '4px 6px', cursor: 'pointer' }}>{l}</div>)}</div>
        <Scroll style={{ padding: '4px 16px 40px' }}>
          {shown.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: T.sub }}><div style={{ fontSize: 42 }}>📭</div><div style={{ marginTop: 6, fontSize: 13 }}>Koi order nahi</div></div>}
          {shown.map(o => <div key={o.id} style={{ background: T.card, border: '1.5px solid ' + (o.status === 'placed' ? T.acc : T.line), borderRadius: 18, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{o.userName}</div><div style={{ fontSize: 11.5, color: T.sub }}>{timeAgo(o.createdMs)}</div></div>
            <div style={{ fontSize: 12.5, color: T.sub, margin: '4px 0 8px' }}>📍 {o.address}{o.note ? ' · “' + o.note + '”' : ''}</div>
            {(o.items || []).map((i, k) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}><span>{i.qty}× {i.name}{i.size ? ' (' + i.size + ')' : ''}{i.unit ? ' · ' + i.unit : ''}</span><span>{rs(i.qty * i.price)}</span></div>)}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed ' + T.line, marginTop: 8, paddingTop: 8, fontWeight: 800, fontSize: 14 }}><span>Collect (COD)</span><span>{rs(o.total)}</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {NEXT[o.status] && <div onClick={() => move(o, NEXT[o.status][0])} className="tap" style={{ flex: 1, background: T.acc, color: T.accTxt, padding: 12, textAlign: 'center', fontWeight: 700, fontSize: 13.5, borderRadius: serif ? 4 : 12, cursor: 'pointer' }}>{NEXT[o.status][1]}</div>}
              {o.status === 'placed' && <div onClick={() => reject(o)} style={{ padding: '12px 14px', color: '#DC2626', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Reject</div>}
              <a href={'tel:' + o.phone} style={{ padding: '10px 12px', textDecoration: 'none', fontSize: 18 }}>📞</a>
              <a href={'https://wa.me/91' + o.phone} target="_blank" rel="noreferrer" style={{ padding: '10px 6px', textDecoration: 'none', fontSize: 18 }}>💬</a>
            </div>
            {o.status === 'accepted' && <div onClick={() => move(o, 'out', { deliveredBy: 'shop' })} style={{ fontSize: 12, fontWeight: 700, color: T.sub, padding: '8px 2px 0', cursor: 'pointer' }}>🚶 Khud deliver karunga (rider nahi)</div>}
            {o.status === 'packed' && !o.riderId && <div style={{ fontSize: 12.5, color: T.sub, padding: '8px 2px 0' }}>⏳ Rider ka intezaar… <span onClick={() => move(o, 'out', { deliveredBy: 'shop', needRider: false })} style={{ color: T.acc, fontWeight: 700, cursor: 'pointer', marginLeft: 6 }}>Khud deliver karo</span></div>}
            {o.status === 'packed' && o.riderId && <div style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 2px 0' }}>🛵 {o.riderName} pickup ke liye aa raha hai {o.riderPhone && <a href={'tel:' + o.riderPhone} style={{ color: T.acc, textDecoration: 'none', marginLeft: 6 }}>📞</a>}</div>}
            {o.status === 'out' && o.deliveredBy === 'shop' && <div onClick={() => finishOrder(o, 'shop').catch(e => say(e.message))} className="tap" style={{ marginTop: 8, background: T.acc, color: T.accTxt, padding: 12, textAlign: 'center', fontWeight: 700, fontSize: 13.5, borderRadius: serif ? 4 : 12, cursor: 'pointer' }}>✅ Mark delivered · cash {rs(o.total)}</div>}
            {o.status === 'out' && o.deliveredBy !== 'shop' && <div style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 2px 0' }}>🛵 {o.riderName} deliver kar raha hai</div>}
          </div>)}
        </Scroll></>}
      {tab === 'products' && <Scroll style={{ padding: '4px 16px 100px' }}>
        {prods.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.sub, fontSize: 13 }}>Abhi koi product nahi — neeche + se add karo</div>}
        {prods.map(p => <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: T.card, border: '1px solid ' + T.line, borderRadius: 16, padding: 10, marginBottom: 10, opacity: p.inStock === false ? .65 : 1 }}>
          <div style={{ width: 60, height: 60, borderRadius: 12, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, overflow: 'hidden', flexShrink: 0 }}>{p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.emoji || '📦')}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div style={{ fontSize: 12, color: T.sub }}>{rs(p.price)}{p.mrp > p.price ? ' (MRP ' + rs(p.mrp) + ')' : ''} · {p.cat}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4 }}><span onClick={() => stockP(p)} style={{ fontSize: 11.5, fontWeight: 700, color: p.inStock === false ? '#DC2626' : T.acc, cursor: 'pointer' }}>{p.inStock === false ? '○ Out of stock' : '● In stock'}</span><span onClick={() => setEdit(p)} style={{ fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>✏️ Edit</span><span onClick={() => delP(p)} style={{ fontSize: 11.5, fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}>🗑️</span></div></div>
        </div>)}
        <div onClick={() => setEdit({})} className="tap" style={{ position: 'absolute', right: 18, bottom: 'calc(20px + env(safe-area-inset-bottom,0px))', background: T.acc, color: T.accTxt, padding: '15px 22px', borderRadius: serif ? 4 : 50, fontWeight: 700, fontSize: 14, boxShadow: '0 10px 28px rgba(0,0,0,.3)', cursor: 'pointer' }}>＋ Add product</div>
      </Scroll>}
      {tab === 'more' && <Scroll style={{ padding: '10px 16px 40px' }}>
        <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 18, padding: 16, marginBottom: 12, fontSize: 13.5, lineHeight: 1.9 }}><b>{me.name}</b><br />Owner: {me.ownerName || '—'}<br />📞 {me.phone || '—'}<br />📍 {me.area || me.address || '—'}<br />ID: {partner.id}</div>
        <div style={{ background: T.card, border: '1px solid ' + T.line, borderRadius: 18, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ fontWeight: 700, fontSize: 14 }}>Store open</div><div style={{ fontSize: 12, color: T.sub }}>Band karne par customer order nahi kar payenge</div></div><div onClick={() => setOpen(me.open === false)} style={{ width: 54, height: 30, borderRadius: 20, background: me.open === false ? T.line : T.acc, position: 'relative', cursor: 'pointer' }}><div style={{ position: 'absolute', top: 3, left: me.open === false ? 3 : 27, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></div></div>
        <div onClick={onLogout} className="tap" style={{ padding: 16, textAlign: 'center', color: '#DC2626', fontWeight: 700, border: '1.5px solid #DC262655', borderRadius: 16, cursor: 'pointer' }}>🚪 Logout</div>
      </Scroll>}
      {toast}
    </Shell>
  );
}

function ProductForm({ T, type, me, init, say, onClose }) {
  const serif = type === 'fashion', cats = (serif ? F_CATS : G_CATS.map(c => c[0])).filter(c => c !== 'All');
  const [f, setF] = useState(() => ({ name: '', cat: cats[0], unit: '', emoji: '', img: '', desc: '', sizes: [], inStock: true, ...init, price: init.price != null ? String(init.price) : '', mrp: init.mrp ? String(init.mrp) : '' }));
  const [busy, setBusy] = useState(false); const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const sizeOpts = sizeSetFor(f.cat);
  const pick = async e => { const file = e.target.files && e.target.files[0]; try { if (file) { set('img', await imgToData(file, 720, 0.72)); } } catch (er) { say(er.message); } try { e.target.value = ''; } catch (x) {} };
  const save = async () => {
    if (busy) return; if (clean(f.name, 60).length < 2) { say('Product ka naam daalo'); return; } if (!(Number(f.price) > 0)) { say('Sahi price daalo'); return; }
    setBusy(true);
    const data = { shopId: me.id, shopName: me.name, type, name: clean(f.name, 60), cat: f.cat, price: Number(f.price), mrp: Number(f.mrp) || 0, unit: clean(f.unit, 20), emoji: f.emoji || '', img: f.img || '', desc: clean(f.desc, 300), sizes: serif ? (f.sizes || []) : [], inStock: f.inStock !== false, updatedMs: Date.now() };
    try { if (init.id) await updateDoc(doc(db, 'mall_products', init.id), data); else await addDoc(collection(db, 'mall_products'), { ...data, createdMs: Date.now() }); onClose(); } catch (e) { say('Save fail: ' + e.message); }
    setBusy(false);
  };
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}><RoundBtn T={T} onClick={onClose}>←</RoundBtn><div style={{ fontFamily: T.head, fontSize: serif ? 26 : 19, fontWeight: 700 }}>{init.id ? 'Edit product' : 'New product'}</div></div>
    <Scroll style={{ padding: '4px 16px 110px' }}>
      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ height: 160, borderRadius: 18, border: '2px dashed ' + T.line, background: T.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', color: T.sub, fontSize: 13 }}>
          {f.img ? <img src={f.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><div style={{ fontSize: 34 }}>📷</div>Photo add karo {serif ? '' : '(optional)'}</>}
        </div><input type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      </label>
      {f.img && <div onClick={() => set('img', '')} style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, margin: '-6px 0 12px', cursor: 'pointer' }}>Photo hatao</div>}
      <input style={inp(T, { marginBottom: 10 })} placeholder="Product name" maxLength={60} value={f.name} onChange={e => set('name', e.target.value)} />
      <select style={inp(T, { marginBottom: 10 })} value={f.cat} onChange={e => { set('cat', e.target.value); set('sizes', []); }}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input style={inp(T, { flex: 1 })} placeholder="Price ₹" inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value.replace(/[^\d.]/g, ''))} />
        <input style={inp(T, { flex: 1 })} placeholder="MRP ₹ (optional)" inputMode="decimal" value={f.mrp} onChange={e => set('mrp', e.target.value.replace(/[^\d.]/g, ''))} />
      </div>
      {!serif && <input style={inp(T, { marginBottom: 10 })} placeholder="Unit (e.g. 1 kg, 500 ml, 1 pc)" maxLength={20} value={f.unit} onChange={e => set('unit', e.target.value)} />}
      {!serif && !f.img && <><div style={{ fontSize: 12, color: T.sub, margin: '4px 0 6px' }}>Emoji chuno (photo nahi hai to)</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{EMOJIS.map(e => <div key={e} onClick={() => set('emoji', e)} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', border: '2px solid ' + (f.emoji === e ? T.acc : T.line), background: T.card }}>{e}</div>)}</div></>}
      {serif && <><div style={{ fontSize: 12, color: T.sub, margin: '4px 0 6px' }}>Available sizes</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>{sizeOpts.map(z => { const on = (f.sizes || []).includes(z); return <div key={z} onClick={() => set('sizes', on ? f.sizes.filter(x => x !== z) : [...(f.sizes || []), z])} style={{ minWidth: 46, textAlign: 'center', padding: '10px 12px', border: '1.5px solid ' + (on ? T.ink : T.line), background: on ? T.ink : 'transparent', color: on ? '#fff' : T.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{z}</div>; })}</div>
        <textarea style={inp(T, { marginBottom: 10, minHeight: 80, resize: 'none' })} placeholder="Description (fabric, fit, colour…)" maxLength={300} value={f.desc} onChange={e => set('desc', e.target.value)} /></>}
      <div onClick={() => set('inStock', !f.inStock)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', cursor: 'pointer' }}><span style={{ fontSize: 14, fontWeight: 600 }}>In stock</span><div style={{ width: 54, height: 30, borderRadius: 20, background: f.inStock ? T.acc : T.line, position: 'relative' }}><div style={{ position: 'absolute', top: 3, left: f.inStock ? 27 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></div></div>
    </Scroll>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom,0px))', background: T.bg, borderTop: '1px solid ' + T.line }}>
      <div onClick={save} className="tap" style={{ background: T.acc, color: T.accTxt, padding: 16, textAlign: 'center', fontWeight: 700, fontSize: 15, borderRadius: serif ? 4 : 16, opacity: busy ? .6 : 1, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save product'}</div>
    </div>
  </>;
}

/* ═══════════════════════ ADMIN PANEL (Mall) ═══════════════════════ */
const AC = { bg: 'rgba(255,255,255,.05)', line: 'rgba(255,255,255,.12)', acc: '#FF8C42', sub: 'rgba(255,255,255,.6)' };
const aInp = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid ' + AC.line, background: 'rgba(0,0,0,.25)', color: 'inherit', fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 8 };
const aBtn = (on, extra) => ({ padding: '9px 14px', borderRadius: 50, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid ' + (on ? AC.acc : AC.line), background: on ? AC.acc : 'transparent', color: on ? '#1A0A04' : 'inherit', ...extra });
const TYPE_LBL = { cab: '🚕 Cab Drivers', grocery: '🥬 Grocery Shops', fashion: '👗 Fashion Boutiques' };

function MallAdminPanel() {
  const [sub, setSub] = useState('partners'), [ft, setFt] = useState('cab'), [msg, setMsg] = useState(''), [cred, setCred] = useState(null), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const say = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const [all] = useCol('mall_partners', [], 'adm');
  const needO = ['orders', 'stats', 'analytics'].includes(sub), needR = ['rides', 'stats', 'analytics'].includes(sub), needL = ['ledger', 'analytics'].includes(sub);
  const [orders] = useCol('mall_orders', needO ? [] : null, 'admo' + needO);
  const [rides] = useCol('cab_rides', needR ? [] : null, 'admr' + needR);
  const [ledger] = useCol('mall_ledger', needL ? [] : null, 'adml' + needL);
  const blank = { name: '', ownerName: '', phone: '', area: '', vehicleType: 'mini', vehicleModel: '', vehicleNo: '' };
  const [f, setF] = useState(blank); const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const list = all.filter(p => p.type === ft).sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0));
  const [fares, setFares] = useState(() => Object.fromEntries(CAB_TYPES.map(t => [t.id, { base: t.base, km: t.km, min: t.min, per: t.per }])));
  useEffect(() => { getDoc(doc(db, 'mall_config', 'cab')).then(s => { if (s.exists() && s.data().types) setFares(p => { const n = { ...p }; Object.keys(s.data().types).forEach(k => { n[k] = { ...(n[k] || {}), ...s.data().types[k] }; }); return n; }); }).catch(() => {}); }, []);

  const create = async () => {
    if (busy) return;
    if (clean(f.name, 60).length < 2) { say('Naam daalo'); return; }
    if (!/^\d{10}$/.test(f.phone)) { say('10-digit phone daalo'); return; }
    if (ft === 'cab' && (!clean(f.ownerName, 40) || !clean(f.vehicleNo, 20))) { say('Driver ka naam aur vehicle number daalo'); return; }
    setBusy(true);
    try {
      const id = await uniqueId(ft);
      const base = { type: ft, name: clean(f.name, 60), ownerName: clean(f.ownerName, 40), phone: f.phone, area: clean(f.area, 80), active: true, open: true, ratingSum: 0, ratingCount: 0, createdMs: Date.now() };
      await setDoc(doc(db, 'mall_partners', id), ft === 'cab' ? { ...base, vehicleType: f.vehicleType, vehicleModel: clean(f.vehicleModel, 40), vehicleNo: clean(f.vehicleNo, 20).toUpperCase(), online: false } : base);
      const cj = await apiPost('/api/cred', { action: 'set', kind: ft, id }, true); if (!cj.success) throw new Error(cj.error || 'Password set nahi hua');
      setCred({ id, pw: cj.pass, name: f.name, phone: f.phone, type: ft }); setF(blank); setShow(false);
    } catch (e) { say('Error: ' + e.message); }
    setBusy(false);
  };
  const resetPw = async p => { if (!window.confirm(p.name + ' ka password reset karein?')) return; try { const cj = await apiPost('/api/cred', { action: 'set', kind: p.type, id: p.id }, true); if (!cj.success) throw new Error(cj.error || 'Error'); setCred({ id: p.id, pw: cj.pass, name: p.name, phone: p.phone, type: p.type }); } catch (e) { say(e.message); } };
  const toggleA = async p => { try { await updateDoc(doc(db, 'mall_partners', p.id), { active: p.active === false, ...(p.active === false ? {} : { online: false }) }); } catch (e) { say(e.message); } };
  const del = async p => { if (!window.confirm(p.name + ' ko permanently delete karein?')) return; try { await deleteDoc(doc(db, 'mall_partners', p.id)); await apiPost('/api/cred', { action: 'delete', kind: p.type, id: p.id }, true); say('Deleted'); } catch (e) { say(e.message); } };
  const saveFares = async () => { try { const t = {}; Object.keys(fares).forEach(k => { t[k] = { base: +fares[k].base || 0, km: +fares[k].km || 0, min: +fares[k].min || 0, per: +fares[k].per || 0 }; }); await setDoc(doc(db, 'mall_config', 'cab'), { types: t, updatedMs: Date.now() }); say('Fares save ho gaye ✅'); } catch (e) { say(e.message); } };
  const cancelOrder = async o => { if (!window.confirm('Order cancel karein?')) return; try { await updateDoc(doc(db, 'mall_orders', o.id), { status: 'cancelled', cancelledBy: 'admin' }); } catch (e) { say(e.message); } };
  const copy = t => { try { navigator.clipboard.writeText(t); say('Copied ✓'); } catch (e) { say('Copy nahi hua'); } };
  const mid = new Date().setHours(0, 0, 0, 0);
  const ordToday = orders.filter(o => (o.createdMs || 0) >= mid), ridesToday = rides.filter(r => r.status === 'completed' && (r.completedMs || 0) >= mid);
  const card = { background: AC.bg, border: '1px solid ' + AC.line, borderRadius: 16, padding: 14, marginBottom: 10 };
  const credMsg = c => `Daily Basket ${c.type === 'cab' ? 'Driver' : c.type === 'grocery' ? 'Shop' : 'Boutique'} Partner login\nID: ${c.id}\nPassword: ${c.pw}\nApp me 🧢 icon dabake apna portal chuno.`;

  return (
    <div style={{ padding: '4px 0 90px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🏬 Super Mall</div>
      <div style={{ fontSize: 12, color: AC.sub, marginBottom: 12 }}>Shops, boutiques aur cab drivers manage karo</div>
      {msg && <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>{[['partners', '👥 Partners'], ['orders', '📦 Orders'], ['rides', '🚕 Rides'], ['ledger', '🧾 Ledger'], ['analytics', '📈 Analytics'], ['fares', '💰 Fares'], ['stats', '📊 Stats']].map(([k, l]) => <div key={k} onClick={() => setSub(k)} style={aBtn(sub === k)}>{l}</div>)}</div>

      {sub === 'partners' && <>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>{Object.keys(TYPE_LBL).map(k => <div key={k} onClick={() => { setFt(k); setShow(false); }} style={aBtn(ft === k)}>{TYPE_LBL[k]} ({all.filter(p => p.type === k).length})</div>)}</div>
        <div onClick={async () => { const j = await apiPost('/api/cred', { action: 'migrate' }, true); say(j.success ? ('Migrated ' + j.migrated + ' passwords ✅') : (j.error || 'Error')); }} style={aBtn(false, { textAlign: 'center', marginBottom: 8, fontSize: 11.5 })}>🔐 Purane rider/shop passwords hash karo</div>
        <div onClick={() => setShow(!show)} style={{ ...aBtn(show, { textAlign: 'center', padding: 13, borderRadius: 14, marginBottom: 12 }) }}>{show ? '✕ Close' : '＋ Add ' + (ft === 'cab' ? 'driver' : ft === 'grocery' ? 'grocery shop' : 'boutique')}</div>
        {show && <div style={card}>
          <input style={aInp} placeholder={ft === 'cab' ? 'Display name (e.g. Ramesh Cabs)' : 'Shop name'} maxLength={60} value={f.name} onChange={e => set('name', e.target.value)} />
          <input style={aInp} placeholder={ft === 'cab' ? 'Driver full name' : 'Owner name'} maxLength={40} value={f.ownerName} onChange={e => set('ownerName', e.target.value)} />
          <input style={aInp} placeholder="Mobile (10 digit)" inputMode="numeric" maxLength={10} value={f.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
          <input style={aInp} placeholder="Area / address" maxLength={80} value={f.area} onChange={e => set('area', e.target.value)} />
          {ft === 'cab' && <>
            <div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 6px' }}>Vehicle type</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>{CAB_TYPES.map(t => <div key={t.id} onClick={() => set('vehicleType', t.id)} style={aBtn(f.vehicleType === t.id)}>{t.e} {t.n}</div>)}</div>
            <input style={aInp} placeholder="Vehicle model (e.g. Swift Dzire)" maxLength={40} value={f.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} />
            <input style={aInp} placeholder="Number plate (RJ19 AB 1234)" maxLength={20} value={f.vehicleNo} onChange={e => set('vehicleNo', e.target.value.toUpperCase())} />
          </>}
          <div onClick={create} style={{ ...aBtn(true, { textAlign: 'center', padding: 13, borderRadius: 12, opacity: busy ? .6 : 1 }) }}>{busy ? 'Creating…' : 'Create & generate login'}</div>
        </div>}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: AC.sub, fontSize: 13 }}>Abhi koi {TYPE_LBL[ft].split(' ').slice(1).join(' ').toLowerCase()} nahi</div>}
        {list.map(p => <div key={p.id} style={{ ...card, opacity: p.active === false ? .55 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, fontWeight: 700, color: p.active === false ? '#F87171' : '#4ADE80' }}>{p.active === false ? 'DISABLED' : ft === 'cab' ? (fresh(p) ? '🟢 ONLINE' : '⚪ offline') : (p.open === false ? 'Closed' : 'Open')}</div></div>
          <div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 8px', lineHeight: 1.6 }}>ID: <b style={{ color: 'inherit' }}>{p.id}</b> · 📞 {p.phone}{p.ownerName ? ' · ' + p.ownerName : ''}{p.area ? ' · ' + p.area : ''}{ft === 'cab' ? <><br />{(CAB_TYPES.find(c => c.id === p.vehicleType) || {}).e} {p.vehicleModel} · {p.vehicleNo} · ★ {ratingOf(p)}</> : null}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><div onClick={() => resetPw(p)} style={aBtn(false)}>🔑 Reset password</div><div onClick={() => toggleA(p)} style={aBtn(false)}>{p.active === false ? '✅ Enable' : '⛔ Disable'}</div><div onClick={() => del(p)} style={aBtn(false, { color: '#F87171' })}>🗑️ Delete</div></div>
        </div>)}
      </>}

      {sub === 'orders' && <>{[...orders].sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0)).slice(0, 40).map(o => <div key={o.id} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 13.5 }}>{o.type === 'fashion' ? '👗' : '🥬'} {o.shopName}</b><span style={{ fontSize: 11.5, color: o.status === 'cancelled' ? '#F87171' : '#4ADE80', fontWeight: 700 }}>{STATUS_LBL[o.status] || o.status}</span></div>
        <div style={{ fontSize: 12, color: AC.sub, margin: '4px 0' }}>{o.userName} · {o.phone} · {timeAgo(o.createdMs)}<br />{(o.items || []).map(i => i.qty + '× ' + i.name).join(', ')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>{rs(o.total)} · COD</b>{!['delivered', 'cancelled'].includes(o.status) && <div onClick={() => cancelOrder(o)} style={aBtn(false, { color: '#F87171' })}>Cancel</div>}</div>
      </div>)}{orders.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: AC.sub, fontSize: 13 }}>Koi order nahi</div>}</>}

      {sub === 'rides' && <>{[...rides].sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0)).slice(0, 40).map(r => <div key={r.id} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 13.5 }}>{r.vehicleName} · {rs(r.fare)}</b><span style={{ fontSize: 11.5, fontWeight: 700, color: r.status === 'completed' ? '#4ADE80' : r.status === 'cancelled' ? '#F87171' : AC.acc }}>{r.status}</span></div>
        <div style={{ fontSize: 12, color: AC.sub, marginTop: 4, lineHeight: 1.5 }}>{r.userName} → {r.driverName || 'no driver'} · {timeAgo(r.createdMs)}<br />● {r.pickup && r.pickup.addr}<br />■ {r.drop && r.drop.addr}</div>
      </div>)}{rides.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: AC.sub, fontSize: 13 }}>Koi ride nahi</div>}</>}

      {sub === 'fares' && <>
        <div style={{ fontSize: 12, color: AC.sub, marginBottom: 10 }}>Fare = base + (per km × km) + (per min × minutes), minimum fare se kam nahi.</div>
        {CAB_TYPES.map(t => <div key={t.id} style={card}><div style={{ fontWeight: 700, marginBottom: 8 }}>{t.e} {t.n}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[['base', 'Base ₹'], ['km', 'Per km ₹'], ['per', 'Per min ₹'], ['min', 'Min fare ₹']].map(([k, l]) => <div key={k}><div style={{ fontSize: 10.5, color: AC.sub, marginBottom: 3 }}>{l}</div><input style={{ ...aInp, marginBottom: 0 }} inputMode="decimal" value={(fares[t.id] || {})[k] ?? ''} onChange={e => setFares(p => ({ ...p, [t.id]: { ...p[t.id], [k]: e.target.value.replace(/[^\d.]/g, '') } }))} /></div>)}</div></div>)}
        <div onClick={saveFares} style={aBtn(true, { textAlign: 'center', padding: 13, borderRadius: 12 })}>Save fares</div>
      </>}

      {sub === 'ledger' && <LedgerPanel ledger={ledger} say={say} />}
      {sub === 'analytics' && <AnalyticsPanel orders={orders} rides={rides} ledger={ledger} partners={all} />}

      {sub === 'stats' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['🚕 Drivers', all.filter(p => p.type === 'cab').length], ['🟢 Online now', all.filter(p => p.type === 'cab' && fresh(p)).length], ['🥬 Grocery shops', all.filter(p => p.type === 'grocery').length], ['👗 Boutiques', all.filter(p => p.type === 'fashion').length], ['📦 Orders today', ordToday.length], ['💵 Order value today', rs(ordToday.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0))], ['🚕 Rides today', ridesToday.length], ['💰 Ride fares today', rs(ridesToday.reduce((s, r) => s + (r.fare || 0), 0))]].map(([l, v]) => <div key={l} style={{ ...card, marginBottom: 0, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: AC.acc }}>{v}</div><div style={{ fontSize: 11.5, color: AC.sub }}>{l}</div></div>)}
      </div>}

      {cred && <div onClick={() => setCred(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#1B1B1B', color: '#fff', borderRadius: 22, padding: 22, width: '100%', maxWidth: 360, border: '1px solid ' + AC.acc }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>✅ Login ready</div>
          <div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 14px' }}>{cred.name} — password sirf abhi dikhega, copy ya share kar lo.</div>
          <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 14, padding: 14, fontSize: 15, lineHeight: 2 }}>ID: <b style={{ letterSpacing: 1 }}>{cred.id}</b><br />Password: <b style={{ letterSpacing: 1 }}>{cred.pw}</b></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <div onClick={() => copy(credMsg(cred))} style={aBtn(true, { flex: 1, textAlign: 'center', borderRadius: 12 })}>📋 Copy</div>
            <a href={'https://wa.me/91' + cred.phone + '?text=' + encodeURIComponent(credMsg(cred))} target="_blank" rel="noreferrer" style={{ ...aBtn(false, { flex: 1, textAlign: 'center', borderRadius: 12, textDecoration: 'none', color: '#fff' }) }}>💬 WhatsApp</a>
          </div>
          <div onClick={() => setCred(null)} style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: AC.sub, cursor: 'pointer' }}>Close</div>
        </div>
      </div>}
    </div>
  );
}

/* ═══════════════════════ ADMIN: LEDGER ═══════════════════════ */
function LedgerPanel({ ledger, say }) {
  const [cfg, setCfg] = useState(FEE_DEF);
  useEffect(() => { getDoc(doc(db, 'mall_config', 'fees')).then(s => { if (s.exists()) setCfg({ ...FEE_DEF, ...s.data() }); }).catch(() => {}); }, []);
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v.replace(/[^\d.]/g, '') }));
  const save = async extra => {
    try {
      const d = { platformFee: +cfg.platformFee || 0, riderPay: +cfg.riderPay || 0, groceryDelivery: +cfg.groceryDelivery || 0, groceryFree: +cfg.groceryFree || 0, fashionDelivery: +cfg.fashionDelivery || 0, fashionFree: +cfg.fashionFree || 0, feeStartMs: +cfg.feeStartMs || 0, ...(extra || {}), updatedMs: Date.now() };
      await setDoc(doc(db, 'mall_config', 'fees'), d, { merge: true }); setCfg(p => ({ ...p, ...d })); say('Saved ✅');
    } catch (e) { say(e.message); }
  };
  const startFree = () => { if (!window.confirm('4 mahine ka free period aaj se shuru karein? Uske baad ₹' + (+cfg.platformFee || 0) + ' per order customer se liya jayega.')) return; save({ feeStartMs: Date.now() + 120 * 864e5 }); };
  const sum = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const group = (rows, keyF, nameF) => { const m = {}; rows.forEach(r => { const k = keyF(r) || '—'; (m[k] = m[k] || { name: nameF(r), rows: [] }).rows.push(r); }); return Object.entries(m).map(([k, v]) => ({ k, ...v })); };
  const settle = async (rows, patch) => { try { await Promise.all(rows.map(r => updateDoc(doc(db, 'mall_ledger', r.id), patch))); say('Settled ✅'); } catch (e) { say(e.message); } };
  const riders = group(ledger.filter(r => r.collectedBy === 'rider' && !r.riderSettled), r => r.riderId, r => r.riderName || r.riderId);
  const shopsPay = group(ledger.filter(r => r.collectedBy === 'rider' && !r.shopPaid), r => r.shopId, r => r.shopName);
  const shopsOwe = group(ledger.filter(r => r.collectedBy === 'shop' && !r.feeSettled), r => r.shopId, r => r.shopName);
  const card = { background: AC.bg, border: '1px solid ' + AC.line, borderRadius: 16, padding: 14, marginBottom: 10 };
  const now = Date.now(), st = !cfg.feeStartMs ? 'Platform fee abhi OFF (free)' : cfg.feeStartMs > now ? 'FREE until ' + new Date(cfg.feeStartMs).toLocaleDateString('en-IN') + ' — phir ₹' + cfg.platformFee + '/order' : 'ON: ₹' + cfg.platformFee + ' per order (customer se)';
  const field = (k, l) => <div key={k}><div style={{ fontSize: 10.5, color: AC.sub, marginBottom: 3 }}>{l}</div><input style={{ ...aInp, marginBottom: 0 }} inputMode="decimal" value={cfg[k] ?? ''} onChange={e => set(k, e.target.value)} /></div>;
  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>⚙️ Fees & payout</div>
        <div style={{ fontSize: 12, color: AC.acc, marginBottom: 10 }}>{st}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>{[['platformFee', 'Platform fee ₹/order'], ['riderPay', 'Rider pay ₹/delivery'], ['groceryDelivery', 'Grocery delivery ₹'], ['groceryFree', 'Grocery free above ₹'], ['fashionDelivery', 'Fashion delivery ₹'], ['fashionFree', 'Fashion free above ₹']].map(([k, l]) => field(k, l))}</div>
        <div style={{ display: 'flex', gap: 8 }}><div onClick={() => save()} style={aBtn(true, { flex: 1, textAlign: 'center', borderRadius: 12 })}>Save</div><div onClick={startFree} style={aBtn(false, { flex: 1, textAlign: 'center', borderRadius: 12 })}>▶ Start 4-month free</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {[['Delivered orders', ledger.length], ['Product value', rs(sum(ledger, r => r.subtotal))], ['Platform fee earned', rs(sum(ledger, r => r.platformFee))], ['Rider payouts', rs(sum(ledger, r => r.riderPay))]].map(([l, v]) => <div key={l} style={{ ...card, marginBottom: 0, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: AC.acc }}>{v}</div><div style={{ fontSize: 11.5, color: AC.sub }}>{l}</div></div>)}
      </div>
      <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>🛵 Riders se cash lena hai</div>
      {riders.length === 0 && <div style={{ fontSize: 12.5, color: AC.sub, marginBottom: 8 }}>Sab settled ✓</div>}
      {riders.map(g => { const held = sum(g.rows, r => r.total), earn = sum(g.rows, r => r.riderPay); return <div key={g.k} style={card}><b>{g.name}</b><div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 8px' }}>{g.rows.length} orders · cash collected {rs(held)} · rider kamai {rs(earn)}<br />Deposit karna hai: <b style={{ color: 'inherit' }}>{rs(held - earn)}</b></div><div onClick={() => settle(g.rows, { riderSettled: true, riderSettledMs: Date.now() })} style={aBtn(true, { textAlign: 'center', borderRadius: 12 })}>✅ Cash mil gaya — settle</div></div>; })}
      <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>🏪 Shops ko dena hai (rider ne cash liya)</div>
      {shopsPay.length === 0 && <div style={{ fontSize: 12.5, color: AC.sub, marginBottom: 8 }}>Sab paid ✓</div>}
      {shopsPay.map(g => <div key={g.k} style={card}><b>{g.name}</b><div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 8px' }}>{g.rows.length} orders · dena hai <b style={{ color: 'inherit' }}>{rs(sum(g.rows, r => r.subtotal))}</b> (product value)</div><div onClick={() => settle(g.rows, { shopPaid: true, shopPaidMs: Date.now() })} style={aBtn(true, { textAlign: 'center', borderRadius: 12 })}>💸 Paid</div></div>)}
      <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>🧾 Shops se platform fee lena hai (khud deliver)</div>
      {shopsOwe.length === 0 && <div style={{ fontSize: 12.5, color: AC.sub, marginBottom: 8 }}>Kuch baaki nahi ✓</div>}
      {shopsOwe.map(g => <div key={g.k} style={card}><b>{g.name}</b><div style={{ fontSize: 12, color: AC.sub, margin: '4px 0 8px' }}>{g.rows.length} orders · fee <b style={{ color: 'inherit' }}>{rs(sum(g.rows, r => r.platformFee))}</b></div><div onClick={() => settle(g.rows, { feeSettled: true, feeSettledMs: Date.now() })} style={aBtn(true, { textAlign: 'center', borderRadius: 12 })}>✅ Fee mil gayi</div></div>)}
    </>
  );
}

/* ═══════════════════════ ADMIN: ANALYTICS ═══════════════════════ */
const Bars = ({ vals, labels, color, h = 84, fmt }) => {
  const max = Math.max(1, ...vals);
  return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h + 34 }}>{vals.map((v, i) => <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}><div style={{ fontSize: 8.5, color: AC.sub, height: 12, whiteSpace: 'nowrap', overflow: 'hidden' }}>{v ? (fmt ? fmt(v) : v) : ''}</div><div style={{ height: Math.max(2, Math.round(v / max * h)), background: color || AC.acc, borderRadius: '4px 4px 0 0', opacity: v ? 1 : .25 }} /><div style={{ fontSize: 8.5, color: AC.sub, marginTop: 3 }}>{labels[i]}</div></div>)}</div>;
};
function AnalyticsPanel({ orders, rides, ledger, partners }) {
  const card = { background: AC.bg, border: '1px solid ' + AC.line, borderRadius: 16, padding: 14, marginBottom: 12 };
  const day = 864e5, st = new Date().setHours(0, 0, 0, 0);
  const live = orders.filter(o => o.status !== 'cancelled');
  const days = Array.from({ length: 7 }, (_, i) => { const f = st - (6 - i) * day; return { f, t: f + day, l: new Date(f).toLocaleDateString('en-IN', { weekday: 'short' }) }; });
  const perDay = days.map(d => live.filter(o => (o.createdMs || 0) >= d.f && (o.createdMs || 0) < d.t));
  const hours = Array.from({ length: 24 }, (_, h) => live.filter(o => new Date(o.createdMs || 0).getHours() === h).length);
  const peak = hours.indexOf(Math.max(...hours));
  const agg = (rows, keyF, valF) => { const m = {}; rows.forEach(r => { const k = keyF(r); if (!k) return; m[k] = (m[k] || 0) + valF(r); }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5); };
  const prodRows = []; live.forEach(o => (o.items || []).forEach(i => prodRows.push({ n: i.name, q: i.qty })));
  const topProd = agg(prodRows, r => r.n, r => r.q), topShop = agg(live, o => o.shopName, o => o.total || 0);
  const delivered = orders.filter(o => o.status === 'delivered'), cancelled = orders.filter(o => o.status === 'cancelled');
  const gmv = delivered.reduce((s, o) => s + (o.total || 0), 0), aov = delivered.length ? gmv / delivered.length : 0;
  const done = rides.filter(r => r.status === 'completed'), rCan = rides.filter(r => r.status === 'cancelled');
  const rDay = days.map(d => done.filter(r => (r.completedMs || 0) >= d.f && (r.completedMs || 0) < d.t));
  const byVeh = agg(done, r => r.vehicleName, () => 1), topDrv = agg(done, r => r.driverName, r => r.fare || 0);
  const fresh2 = partners.filter(p => p.type === 'cab' && fresh(p)).length;
  const list = (rows, fmt) => rows.length === 0 ? <div style={{ fontSize: 12, color: AC.sub }}>Abhi data nahi</div> : rows.map(([k, v], i) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: i < rows.length - 1 ? '1px solid ' + AC.line : 'none' }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {k}</span><b>{fmt(v)}</b></div>);
  const h12 = h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[['Orders (total)', orders.length], ['Delivered', delivered.length], ['Avg order', rs(aov)], ['Cancel rate', orders.length ? Math.round(cancelled.length / orders.length * 100) + '%' : '—'], ['Rides done', done.length], ['Ride cancel', rides.length ? Math.round(rCan.length / rides.length * 100) + '%' : '—']].map(([l, v]) => <div key={l} style={{ ...card, marginBottom: 0, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: AC.acc }}>{v}</div><div style={{ fontSize: 11.5, color: AC.sub }}>{l}</div></div>)}
      </div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>📦 Orders — last 7 days</div><Bars vals={perDay.map(a => a.length)} labels={days.map(d => d.l)} /></div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>💵 Sales ₹ — last 7 days</div><Bars color="#4ADE80" vals={perDay.map(a => a.reduce((s, o) => s + (o.total || 0), 0))} labels={days.map(d => d.l)} fmt={v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v} /></div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 2 }}>⏰ Orders by hour</div><div style={{ fontSize: 12, color: AC.sub, marginBottom: 8 }}>{Math.max(...hours) > 0 ? 'Peak time: ' + h12(peak) + ' – ' + h12((peak + 1) % 24) : 'Abhi data nahi'}</div><Bars color="#60A5FA" h={60} vals={hours} labels={hours.map((_, h) => h % 6 === 0 ? h12(h) : '')} /></div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>🔥 Top products</div>{list(topProd, v => v + ' pcs')}</div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>🏪 Top shops (sales)</div>{list(topShop, rs)}</div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>🚕 Rides — last 7 days</div><Bars color="#FFD60A" vals={rDay.map(a => a.length)} labels={days.map(d => d.l)} /><div style={{ fontSize: 12, color: AC.sub, marginTop: 8 }}>Drivers online abhi: <b style={{ color: 'inherit' }}>{fresh2}</b> · Total fares {rs(done.reduce((s, r) => s + (r.fare || 0), 0))}</div></div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>🚗 Vehicle type (rides)</div>{list(byVeh, v => v + ' rides')}</div>
      <div style={card}><div style={{ fontWeight: 800, marginBottom: 8 }}>🏆 Top drivers (fare)</div>{list(topDrv, rs)}</div>
      <div style={{ fontSize: 11.5, color: AC.sub, textAlign: 'center' }}>Platform fee earned: {rs(ledger.reduce((s, r) => s + (r.platformFee || 0), 0))} · GMV delivered: {rs(gmv)}</div>
    </>
  );
}

/* ═══════════════════════ RIDER: mall deliveries (existing rider app me tab) ═══════════════════════ */
function MallRiderTab({ rider }) {
  const fees = useFees(); const [msg, setMsg] = useState(''), prevN = useRef(0);
  const say = m => { setMsg(m); setTimeout(() => setMsg(''), 2800); };
  const [packed] = useCol('mall_orders', [where('status', '==', 'packed')], 'rpk');
  const [mine] = useCol('mall_orders', [where('riderId', '==', rider.id)], 'rmn' + rider.id);
  const [led] = useCol('mall_ledger', [where('riderId', '==', rider.id)], 'rld' + rider.id);
  const avail = packed.filter(o => o.needRider && !o.riderId).sort((a, b) => (a.createdMs || 0) - (b.createdMs || 0));
  const active = mine.filter(o => ['packed', 'out'].includes(o.status));
  useEffect(() => { if (avail.length > prevN.current) { try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {} say('🔔 Naya mall pickup!'); } prevN.current = avail.length; }, [avail.length]);
  const mid = new Date().setHours(0, 0, 0, 0), today = led.filter(r => (r.deliveredMs || 0) >= mid);
  const claim = async o => {
    if (active.length >= 3) { say('Pehle purane orders deliver karo (max 3)'); return; }
    try { await runTransaction(db, async tx => { const ref = doc(db, 'mall_orders', o.id); const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'packed' || s.data().riderId) throw new Error('Ye order kisi aur rider ne le liya'); tx.update(ref, { riderId: rider.id, riderName: rider.name || 'Rider', riderPhone: rider.phone || '', riderClaimedMs: Date.now() }); }); say('Order le liya ✅'); }
    catch (e) { say(e.message); }
  };
  const pick = o => updateDoc(doc(db, 'mall_orders', o.id), { status: 'out', outMs: Date.now() }).then(() => notifyEvent('mall_order_status', { orderId: o.id })).catch(e => say(e.message));
  const deliver = o => { if (!window.confirm('Delivered? Customer se ' + rs(o.total) + ' cash collect kiya?')) return; finishOrder(o, 'rider', rider).then(() => say('Delivered ✅')).catch(e => say(e.message)); };
  const nav = a => window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a), '_blank');
  const C = { background: 'var(--glass,rgba(255,255,255,.05))', border: '1px solid var(--gb,rgba(255,255,255,.12))', borderRadius: 16, padding: 14, marginBottom: 12 };
  const G = '#3DFF7A', B = (bg, c) => ({ flex: 1, textAlign: 'center', padding: '11px 8px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', background: bg, color: c, border: '1px solid ' + (bg === 'transparent' ? 'var(--gb,rgba(255,255,255,.2))' : bg) });
  return (
    <div style={{ padding: '10px 0 30px' }}>
      {msg && <div style={{ background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      <div style={{ ...C, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: G }}>{today.length}</div><div style={{ fontSize: 11, opacity: .7 }}>Mall deliveries aaj</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: G }}>{rs(today.reduce((s, r) => s + (r.riderPay || 0), 0))}</div><div style={{ fontSize: 11, opacity: .7 }}>Kamai aaj</div></div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, margin: '4px 0 8px' }}>🚚 Meri deliveries ({active.length})</div>
      {active.length === 0 && <div style={{ fontSize: 12.5, opacity: .6, marginBottom: 12 }}>Koi active order nahi</div>}
      {active.map(o => <div key={o.id} style={{ ...C, border: '1.5px solid ' + G }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{o.type === 'fashion' ? '👗' : '🛒'} {o.shopName}</b><span style={{ fontSize: 12, fontWeight: 800, color: G }}>{o.status === 'packed' ? 'PICKUP' : 'DELIVER'}</span></div>
        <div style={{ fontSize: 12.5, opacity: .8, margin: '6px 0' }}>📍 {o.address}<br />👤 {o.userName} · {o.phone}<br />💵 Cash collect: <b>{rs(o.total)}</b> ({(o.items || []).reduce((s, i) => s + i.qty, 0)} items)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => nav(o.status === 'packed' ? (o.shopName + ' Bhopalgarh') : o.address)} style={B('transparent', 'inherit')}>🧭 Navigate</div>
          <a href={'tel:' + o.phone} style={{ textDecoration: 'none', ...B('transparent', 'inherit') }}>📞 Customer</a>
          {o.status === 'packed' ? <div onClick={() => pick(o)} style={B(G, '#052e12')}>Picked up</div> : <div onClick={() => deliver(o)} style={B(G, '#052e12')}>Delivered</div>}
        </div>
      </div>)}
      <div style={{ fontSize: 13, fontWeight: 800, margin: '14px 0 8px' }}>📦 Pickup ke liye available ({avail.length})</div>
      {avail.length === 0 && <div style={{ fontSize: 12.5, opacity: .6 }}>Abhi koi pickup ready nahi</div>}
      {avail.map(o => <div key={o.id} style={C}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{o.type === 'fashion' ? '👗' : '🛒'} {o.shopName}</b><span style={{ fontSize: 12, opacity: .7 }}>{timeAgo(o.packedMs || o.createdMs)}</span></div>
        <div style={{ fontSize: 12.5, opacity: .8, margin: '6px 0 10px' }}>Drop: {o.address}<br />Order {rs(o.total)} · aapki kamai ≈ <b>{rs(fees.riderPay)}</b>*</div>
        <div onClick={() => claim(o)} style={B(G, '#052e12')}>Accept pickup</div>
      </div>)}
      <div style={{ fontSize: 10.5, opacity: .5, marginTop: 6 }}>* Admin ke set kiye rider pay ke hisaab se.</div>
    </div>
  );
}

/* ═══════════════════════ EXPORTS ═══════════════════════ */
function MallApp({ kind, user, onBack }) {
  if (kind === 'cab') return <CabApp user={user} onBack={onBack} />;
  if (kind === 'fashion') return <FashionApp user={user} onBack={onBack} />;
  return <GroceryApp user={user} onBack={onBack} />;
}
function MallPartnerGate({ type, onBack }) {
  const [p, setP] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => {
    const un = onAuthStateChanged(auth, u => {
      try {
        const sv = JSON.parse(localStorage.getItem('db_mall_p') || 'null');
        if (u && sv && sv.type === type && u.uid === 'pt_' + sv.p.id && Date.now() - (sv.ts || 0) < 30 * 864e5) setP(sv.p); else setP(null);
      } catch (e) { setP(null); }
      setReady(true);
    });
    return () => { try { un(); } catch (e) {} };
  }, [type]);
  const login = pp => { try { localStorage.setItem('db_mall_p', JSON.stringify({ type, ts: Date.now(), p: pp })); } catch (e) {} setP(pp); };
  const logout = () => { try { localStorage.removeItem('db_mall_p'); } catch (e) {} try { signOut(auth).catch(() => {}); } catch (e) {} setP(null); onBack(); };
  if (!ready) return <Shell T={TH[type] || TH.cab}><Spin T={TH[type] || TH.cab} /></Shell>;
  if (!p) return <PartnerLogin type={type} onLogin={login} onBack={onBack} />;
  return type === 'cab' ? <DriverApp partner={p} onLogout={logout} /> : <ShopPartnerApp type={type} partner={p} onLogout={logout} />;
}
export { MallApp, MallPartnerGate, MallAdminPanel, MallRiderTab, CAB_TYPES };
