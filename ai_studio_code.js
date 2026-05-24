import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, messaging, requestNotificationPermission, onMessage } from "./firebase";
import { collection, addDoc, getDocs, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

/* ═══════════ GLOBAL CSS ═══════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
:root{--bg:#070907;--card:#0F160F;--green:#3DFF7A;--g2:#00C44F;--gdim:#1A3320;--gold:#D4AF37;--glass:rgba(255,255,255,.04);--gb:rgba(61,255,122,.12);--t:#F0F4F0;--t2:#8A9A8A;--t3:#5A6A5A;}
body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--t);overflow:hidden;}
.btn{background:linear-gradient(135deg,var(--btn1),var(--btn2)) !important;color:var(--btnTxt) !important;box-shadow:0 4px 20px var(--shadow) !important;}
.phone{width:390px;background:var(--bg);border-radius:0;overflow:hidden;position:relative;touch-action:pan-x pan-y;}
.scr{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;}
.scr::-webkit-scrollbar{display:none;}
.hindi{font-family:'Noto Sans Devanagari','Outfit',sans-serif;}

@keyframes fadeIn   {from{opacity:0}to{opacity:1}}
@keyframes fadeOut  {from{opacity:1}to{opacity:0}}
@keyframes fadeUp   {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn  {from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp  {from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes floatY   {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes floatP   {0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(-12px) rotate(8deg)}70%{transform:translateY(-6px) rotate(-4deg)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(61,255,122,.3)}50%{box-shadow:0 0 50px rgba(61,255,122,.7),0 0 100px rgba(61,255,122,.2)}}
@keyframes spin     {from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes ripple   {0%{transform:scale(0);opacity:.6}100%{transform:scale(4);opacity:0}}
@keyframes cartBump {0%{transform:scale(1)}35%{transform:scale(1.35)}70%{transform:scale(.9)}100%{transform:scale(1)}}
@keyframes pulseD   {0%,100%{box-shadow:0 0 0 0 rgba(61,255,122,.4)}70%{box-shadow:0 0 0 10px rgba(61,255,122,0)}}
@keyframes splExit  {0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
@keyframes shakeBsk {0%,100%{transform:translateX(0)}20%{transform:translateX(-6px) rotate(-3deg)}50%{transform:translateX(5px) rotate(2deg)}80%{transform:translateX(-3px) rotate(-1deg)}}
@keyframes itemDrop {0%{opacity:0;transform:translateY(-90px) rotate(-20deg) scale(.5)}55%{opacity:1;transform:translateY(6px) rotate(4deg) scale(1.08)}80%{transform:translateY(-3px) rotate(-1deg) scale(.97)}100%{opacity:1;transform:translateY(0) rotate(0) scale(1)}}
@keyframes popIn    {0%{opacity:0;transform:scale(0) rotate(-15deg)}60%{transform:scale(1.12)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes gStartIn {from{opacity:0;transform:translateY(30px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes overlayI {from{opacity:0}to{opacity:1}}
@keyframes modalUp  {from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes statusP  {0%,100%{box-shadow:0 0 0 0 rgba(61,255,122,.4)}70%{box-shadow:0 0 0 10px rgba(61,255,122,0)}}
@keyframes otpShake {0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
@keyframes langIn   {from{opacity:0;transform:translateY(40px) scale(.88)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes langBg   {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes checkAnim{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
@keyframes ringExpand{0%{transform:scale(.6);opacity:1}100%{transform:scale(2.2);opacity:0}}

.gc{background:var(--glass);backdrop-filter:blur(20px);border:1px solid var(--gb);border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.05);}
.btn{background:linear-gradient(135deg,var(--btn1,#3DFF7A),var(--btn2,#00C44F));color:var(--btnTxt,#0A1A0A);font-weight:700;font-size:15px;border:none;border-radius:50px;cursor:pointer;box-shadow:0 4px 20px var(--shadow,rgba(61,255,122,.35));transition:all .2s cubic-bezier(.34,1.56,.64,1);font-family:'Outfit',sans-serif;}
.btn:active{transform:scale(.94);}
.btng{background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--gb);color:var(--t);font-weight:600;font-size:13px;border-radius:50px;cursor:pointer;font-family:'Outfit',sans-serif;}
.rip{position:relative;overflow:hidden;}.rip::after{content:'';position:absolute;border-radius:50%;background:rgba(255,255,255,.28);width:100px;height:100px;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);}.rip:active::after{animation:ripple .5s ease;}
.chip{background:var(--gdim);border:1px solid rgba(61,255,122,.2);color:var(--green);font-size:11px;font-weight:600;padding:3px 10px;border-radius:50px;display:inline-flex;align-items:center;gap:4px;}
.srow{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}.srow::-webkit-scrollbar{display:none;}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.st{font-size:18px;font-weight:700;}.sl{font-size:13px;color:var(--green);font-weight:600;cursor:pointer;}
.divr{height:1px;background:linear-gradient(90deg,transparent,rgba(61,255,122,.1),transparent);margin:16px 0;}
.pc{background:var(--card);border:1px solid rgba(61,255,122,.07);border-radius:18px;overflow:hidden;cursor:pointer;}.pc:active{transform:scale(.96);}
.cp{padding:8px 16px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s;border:1px solid transparent;}
.cp.on{background:linear-gradient(135deg,#3DFF7A,#00C44F);color:#0A1A0A;box-shadow:0 4px 15px rgba(61,255,122,.3);}
.cp:not(.on){background:var(--glass);backdrop-filter:blur(10px);border-color:var(--gb);color:var(--t2);}
.sbar{height:env(safe-area-inset-top,44px);display:block;background:var(--bg);}
.bnav{position:absolute;bottom:0;left:0;right:0;height:calc(80px + env(safe-area-inset-bottom,0px));background:rgba(7,9,7,.95);backdrop-filter:blur(30px);border-top:1px solid rgba(61,255,122,.08);display:flex;align-items:flex-start;justifyContent:'space-around';padding-top:12px;padding-bottom:env(safe-area-inset-bottom,0px);z-index:100;}
.ni{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px 10px;border-radius:12px;min-width:58px;}
.ni.on .nl{color:var(--green);}.nl{font-size:10px;color:var(--t3);font-weight:500;}
.fcart{position:absolute;bottom:88px;left:16px;right:16px;background:linear-gradient(135deg,#1A3320,#0E2318);border:1px solid rgba(61,255,122,.28);border-radius:18px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 24px rgba(61,255,122,.12);z-index:90;animation:slideUp .4s cubic-bezier(.34,1.56,.64,1) both;}
.dbi{width:100%;background:rgba(255,255,255,.04);border:1.5px solid rgba(61,255,122,.14);border-radius:14px;padding:14px 16px;font-size:16px;color:#F0F4F0;font-family:'Outfit',sans-serif;outline:none;transition:border-color .25s;}
.dbi:focus{border-color:rgba(61,255,122,.55);background:rgba(61,255,122,.04);}
.dbi::placeholder{color:#3A4A3A;}
.pbar{height:5px;background:rgba(255,255,255,.07);border-radius:50px;overflow:hidden;}
.pfill{height:100%;border-radius:50px;background:linear-gradient(90deg,#3DFF7A,#D4AF37);box-shadow:0 0 12px rgba(61,255,122,.6);}
.tog{width:48px;height:26px;border-radius:13px;cursor:pointer;position:relative;transition:all .3s;flex-shrink:0;}
.tog::after{content:'';position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;top:3px;transition:all .3s cubic-bezier(.34,1.56,.64,1);}
.tog.on{background:linear-gradient(135deg,#3DFF7A,#00C44F);}.tog.on::after{left:25px;box-shadow:0 0 8px rgba(61,255,122,.5);}
.tog:not(.on){background:rgba(255,255,255,.12);}.tog:not(.on)::after{left:3px;}
.ovl{position:absolute;inset:0;background:rgba(0,0,0,.75);z-index:300;animation:overlayI .25s ease;display:flex;align-items:flex-end;}
.modal{width:100%;background:linear-gradient(180deg,#0E160E,#070907);border-radius:28px 28px 0 0;border-top:1px solid rgba(61,255,122,.15);padding:22px 20px 60px;animation:modalUp .32s cubic-bezier(.34,1.2,.64,1) both;max-height:85vh;overflow-y:scroll;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
`;

/* ═══════════ CONSTANTS & HELPERS ═══════════ */
const ADMIN_ID = 'Sunil14581';
const ADMIN_PASS = 'Sunil@$14581';

const T = {
  en: {
    home:'Home', combos:'Combos', food:'Food', eco:'Eco', profile:'Profile',
    goodMorning:'Good morning 👋', freshVeggies:'Fresh Veggies\nDelivered Daily',
    shopNow:'Shop Now →', bestSellers:'Best Sellers', categories:'Categories', all:'All', veggies:'Veggies', fruits:'Fruits',
    dairy:'Dairy', addToCart:'Add to Cart', addedToCart:'✓ Added to Basket!',
    quantity:'Quantity', about:'About this product', ecoImpact:'Eco Impact 🌱',
    myBasket:'My Basket 🧺', items:'items', tapCheckout:'Tap to checkout',
    placeOrder:'Place Order', subtotal:'Subtotal', delivery:'Delivery',
    ecoPackaging:'Eco Packaging', total:'Total', free:'FREE 🎉',
    orderTracking:'Order Tracking', freeDelivery:'Free delivery',
    smartCombos:'Smart Combos', nearYou:'Near You', viewAll:'View all',
    greenRank:'Green Rank Progress', plasticSaved:'Plastic Saved',
    included:'Included ♻️', foodDelivery:'Food Delivery 🍽️',
    hotMeals:'Hot meals · 20–35 min delivery', browseBy:'Browse By',
    contribution:'Your contribution to a greener planet',
    myOrders:'My Orders', subscription:'Subscription', addresses:'Addresses', payment:'Payment', settings:'Settings',
    ecoFriendly:'Eco-Friendly Delivery', signOut:'Sign Out', productDetails:'Product Details',
    riderOnWay:'Rider on the way', orderStatus:'Order Status', priceDetails:'Price Details',
    addFreeDelivery:'Add ₹', forFreeDelivery:' more for free delivery', welcomeBack:'Welcome back! 👋',
  },
  hi: {
    home:'होम', combos:'कॉम्बो', food:'खाना', eco:'इको', profile:'प्रोफाइल',
    goodMorning:'शुभ प्रभात 👋', freshVeggies:'ताजी सब्जियां\nघर पर डिलीवरी',
    shopNow:'अभी खरीदें →', bestSellers:'बेस्ट सेलर', categories:'श्रेणियां', all:'सभी', veggies:'सब्जियां', fruits:'फल',
    dairy:'डेयरी', addToCart:'कार्ट में जोड़ें', addedToCart:'✓ टोकरी में जोड़ा!',
    quantity:'मात्रा', about:'इस उत्पाद के बारे में', ecoImpact:'इको प्रभाव 🌱',
    myBasket:'मेरी टोकरी 🧺', items:'आइटम', tapCheckout:'चेकआउट के लिए टैप करें',
    placeOrder:'ऑर्डर दें', subtotal:'उप-योग', delivery:'डिलीवरी',
    ecoPackaging:'इको पैकेजिंग', total:'कुल', free:'मुफ्त 🎉',
    orderTracking:'ऑर्डर ट्रैकिंग', freeDelivery:'मुफ्त डिलीवरी',
    smartCombos:'स्मार्ट कॉम्बो', nearYou:'आपके पास', viewAll:'सभी देखें',
    greenRank:'ग्रीन रैंक प्रगति', plasticSaved:'प्लास्टिक बचाया',
    included:'शामिल ♻️', foodDelivery:'खाना डिलीवरी 🍽️',
    hotMeals:'गरम खाना · 20–35 मिनट', browseBy:'श्रेणी से देखें',
    contribution:'एक हरित ग्रह के लिए आपका योगदान',
    myOrders:'मेरे ऑर्डर', subscription:'सदस्यता', addresses:'पते', payment:'भुगतान', settings:'सेटिंग',
    ecoFriendly:'इको-फ्रेंडली डिलीवरी', signOut:'साइन आउट', productDetails:'उत्पाद विवरण',
    riderOnWay:'राइडर रास्ते में है', orderStatus:'ऑर्डर स्थिति', priceDetails:'मूल्य विवरण',
    addFreeDelivery:'मुफ्त डिलीवरी के लिए ₹', forFreeDelivery:' और जोड़ें', welcomeBack:'वापसी पर स्वागत है! 👋',
  }
};

const THEMES = {
  eco: { vars:{'--bg':'#070907','--card':'#0F160F','--green':'#3DFF7A','--g2':'#00C44F','--btn1':'#3DFF7A','--btn2':'#00C44F','--btnTxt':'#0A1A0A','--shadow':'rgba(61,255,122,.35)'} },
  premium: { vars:{'--bg':'#080808','--card':'#0E0E0E','--green':'#D4AF37','--g2':'#C49A20','--btn1':'#D4AF37','--btn2':'#C49A20','--btnTxt':'#0A0800','--shadow':'rgba(212,175,55,.4)'} },
};

const Ic = ({n,s=20,c='currentColor'}) => {
    const M = {
      home:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
      grid:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      user:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      leaf:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
      food:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
      arrow: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>,
      back:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>,
      plus:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
      minus: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
      check: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
      bell:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
      search:<svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      truck: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      lock:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
      loc:   <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
      edit:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
      phone: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.61 3.38 2 2 0 013.58 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 8.96a16 16 0 006 6l.92-.92a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    };
    return M[n]||null;
};

/* ═══════════ COMPONENTS ═══════════ */

function Splash({onDone}) {
  const [prog, setProg] = useState(0);
  useEffect(()=>{
    const iv = setInterval(()=>{ setProg(p => p<100 ? p+2 : 100); }, 30);
    return () => clearInterval(iv);
  },[]);
  if(prog>=100) setTimeout(onDone, 500);
  return (
    <div style={{position:'absolute',inset:0,background:'#070907',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',animation:'fadeIn .5s ease'}}>
        <div style={{fontSize:80,marginBottom:20,animation:'floatY 3s ease-in-out infinite'}}>🧺</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:800,color:'#3DFF7A',letterSpacing:-0.5}}>Daily Basket</div>
        <div style={{width:200,height:4,background:'rgba(255,255,255,.05)',borderRadius:10,marginTop:20,overflow:'hidden'}}>
            <div style={{width:`${prog}%`,height:'100%',background:'#3DFF7A',transition:'width .1s linear'}}/>
        </div>
    </div>
  );
}

function CustomerLogin({onLogin}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [confirmObj, setConfirmObj] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if(!name || phone.length!==10) { alert('Sahi details daalo!'); return; }
    setLoading(true);
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {size:'invisible'});
      const result = await signInWithPhoneNumber(auth, '+91'+phone, window.recaptchaVerifier);
      setConfirmObj(result);
      setStep('otp');
    } catch(e) { alert('OTP error: ' + e.message); }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if(otp.length!==6) return;
    setLoading(true);
    try {
      const res = await confirmObj.confirm(otp);
      const uData = { name, phone, uid: res.user.uid };
      await setDoc(doc(db, 'users', res.user.uid), { ...uData, createdAt: serverTimestamp() }, {merge:true});
      onLogin(uData);
    } catch(e) { alert('Galat OTP!'); }
    setLoading(false);
  };

  return (
    <div className="scr" style={{padding:40,display:'flex',flexDirection:'column',justifyContent:'center',background:'radial-gradient(circle at 50% 20%, #1A3320, #070907)'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:64,marginBottom:10}}>🧺</div>
          <div style={{fontSize:24,fontWeight:800}}>Swagat Hai!</div>
          <div style={{fontSize:14,color:'var(--t3)'}}>Daily Basket mein login karein</div>
      </div>
      {step==='phone' ? (
        <div style={{animation:'fadeUp .5s ease'}}>
          <input className="dbi" placeholder="Apna Naam" value={name} onChange={e=>setName(e.target.value)} style={{marginBottom:15}}/>
          <input className="dbi" placeholder="Mobile Number" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} style={{marginBottom:25}}/>
          <button className="btn rip" onClick={sendOTP} disabled={loading} style={{width:'100%',padding:18}}>{loading?'Bhej rahe hain...':'Get OTP →'}</button>
          <div id="recaptcha-container"></div>
        </div>
      ) : (
        <div style={{animation:'fadeUp .5s ease'}}>
          <input className="dbi" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} style={{textAlign:'center',letterSpacing:10,fontSize:24,marginBottom:25}}/>
          <button className="btn rip" onClick={verifyOTP} disabled={loading} style={{width:'100%',padding:18}}>{loading?'Check kar rahe hain...':'Verify & Continue ✓'}</button>
        </div>
      )}
    </div>
  );
}

function CustomerApp({user, lang}) {
  const t = T[lang] || T.en;
  const [scr, setScr] = useState('home');
  const [cart, setCart] = useState([]);
  const [prods, setProds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notifications safety fix
  useEffect(() => {
    const setupNotifs = async () => {
      try {
        if (messaging) {
          await requestNotificationPermission();
          onMessage(messaging, (payload) => {
             console.log('Message:', payload);
          });
        }
      } catch (e) { console.log('Notification skip:', e); }
    };
    setupNotifs();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active);
      setProds(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addC = p => setCart(curr => {
    const ex = curr.find(i=>i.id===p.id);
    return ex ? curr.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...curr,{...p,qty:1}];
  });

  const total = cart.reduce((s,i)=>s+(i.price*i.qty), 0);

  if(loading) return <div style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center'}}>
    <div style={{width:40,height:40,border:'3px solid #3DFF7A',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
  </div>;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div className="sbar"/>
      <div className="scr" style={{padding:20,paddingBottom:100}}>
        <div style={{marginBottom:25}}>
            <div style={{fontSize:13,color:'var(--t3)'}}>Shubh Prabhat 👋</div>
            <div style={{fontSize:22,fontWeight:800}}>{user?.name || 'Grahak'}</div>
        </div>

        {/* Categories placeholder */}
        <div className="srow" style={{marginBottom:25}}>
            {['🥦 Sabzi', '🍎 Phal', '🥛 Doodh', '🍛 Khana'].map(c=>(
                <div key={c} style={{padding:'10px 18px',background:'var(--card)',borderRadius:50,fontSize:13,border:'1px solid var(--gb)',whiteSpace:'nowrap'}}>{c}</div>
            ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15}}>
            {prods.map(p=>(
                <div key={p.id} className="pc" style={{padding:12}}>
                    <div style={{fontSize:40,textAlign:'center',marginBottom:10}}>{p.emoji}</div>
                    <div style={{fontSize:14,fontWeight:700}}>{lang==='hi'?p.nameHi:p.name}</div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>{p.unit}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
                        <div style={{fontWeight:800,color:'#3DFF7A'}}>₹{p.price}</div>
                        <button className="btn" onClick={()=>addC(p)} style={{width:30,height:30,borderRadius:8}}>+</button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {cart.length > 0 && (
          <div className="fcart" onClick={()=>alert('Checkout Coming Soon!')}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{background:'#3DFF7A',color:'#000',padding:'2px 8px',borderRadius:6,fontWeight:800}}>{cart.length}</div>
                  <div style={{fontSize:13,fontWeight:700}}>Basket Mein Hai</div>
              </div>
              <div style={{fontWeight:800,fontSize:16}}>₹{total} →</div>
          </div>
      )}

      <div className="bnav">
          <div onClick={()=>setScr('home')} className={`ni ${scr==='home'?'on':''}`}><Ic n="home" c={scr==='home'?'#3DFF7A':'#5A6A5A'}/><span className="nl">Home</span></div>
          <div onClick={()=>setScr('orders')} className={`ni ${scr==='orders'?'on':''}`}><Ic n="grid" c={scr==='orders'?'#3DFF7A':'#5A6A5A'}/><span className="nl">Orders</span></div>
          <div onClick={()=>setScr('profile')} className={`ni ${scr==='profile'?'on':''}`}><Ic n="user" c={scr==='profile'?'#3DFF7A':'#5A6A5A'}/><span className="nl">Profile</span></div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN EXPORT ═══════════ */

export default function DailyBasket() {
  const [phase, setPhase] = useState('splash');
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('hi');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if(u) {
        setUser({uid: u.uid, phone: u.phoneNumber});
        setPhase('app');
      }
    });
    return () => unsub();
  }, []);

  return (
    <div style={{width:'100vw',height:'100dvh',background:'#000',display:'flex',justifyContent:'center',overflow:'hidden'}}>
      <style>{CSS}</style>
      <div className="phone">
        {phase === 'splash' && <Splash onDone={() => setPhase('login')} />}
        {phase === 'login' && <CustomerLogin onLogin={(u) => { setUser(u); setPhase('app'); }} />}
        {phase === 'app' && <CustomerApp user={user} lang={lang} />}
      </div>
    </div>
  );
}