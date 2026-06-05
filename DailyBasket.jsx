import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, messaging, requestNotificationPermission, onMessage } from "./firebase";
import { collection, addDoc, getDocs, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
/* ═══════════ GLOBAL CSS ═══════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
:root{--bg:#070907;--card:#0F160F;--green:#3DFF7A;--g2:#00C44F;--gdim:#1A3320;--gold:#D4AF37;--glass:rgba(255,255,255,.04);--gb:rgba(61,255,122,.12);--t:#F0F4F0;--t2:#8A9A8A;--t3:#5A6A5A;}
html,body{background:#070907;}body{font-family:'Outfit',sans-serif;color:var(--t);overflow:hidden;margin:0;padding:0;}
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
.bnav{position:absolute;bottom:0;left:0;right:0;height:calc(80px + env(safe-area-inset-bottom,0px));background:rgba(7,9,7,.95);backdrop-filter:blur(30px);border-top:1px solid rgba(61,255,122,.08);display:flex;align-items:flex-start;justify-content:space-around;padding-top:12px;padding-bottom:env(safe-area-inset-bottom,0px);z-index:100;}
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

/* ── GOLD PREMIUM OVERRIDES ── */
[style*="--bg:#050400"] .gc, [style*="050400"] .gc{border-color:rgba(255,215,0,.18) !important;background:linear-gradient(135deg,rgba(255,215,0,.06),rgba(20,16,0,1)) !important;}
[style*="--bg:#050400"] .bnav,[style*="050400"] .bnav{background:rgba(10,8,0,.97) !important;border-top-color:rgba(255,215,0,.2) !important;}
[style*="--bg:#050400"] .fcart,[style*="050400"] .fcart{background:linear-gradient(135deg,#1A1200,#0A0800) !important;border-color:rgba(255,215,0,.35) !important;box-shadow:0 8px 40px rgba(255,215,0,.2) !important;}
[style*="--bg:#050400"] .chip,[style*="050400"] .chip{border-color:rgba(255,215,0,.3) !important;}
[style*="--bg:#050400"] .pc,[style*="050400"] .pc{border-color:rgba(255,215,0,.12) !important;}
[style*="--bg:#050400"] .cp.on,[style*="050400"] .cp.on{background:linear-gradient(135deg,#FFD700,#D4AF37) !important;color:#0A0800 !important;box-shadow:0 4px 15px rgba(255,215,0,.4) !important;}
[style*="--bg:#050400"] .btn,[style*="050400"] .btn{background:linear-gradient(135deg,#FFD700,#C49A20) !important;box-shadow:0 4px 24px rgba(255,215,0,.4) !important;}
[style*="--bg:#050400"] .dbi,[style*="050400"] .dbi{border-color:rgba(255,215,0,.2) !important;}
[style*="--bg:#050400"] .dbi:focus,[style*="050400"] .dbi:focus{border-color:rgba(255,215,0,.6) !important;background:rgba(255,215,0,.05) !important;}
`;


/* ═══════════ THEMES ═══════════ */
const THEMES = {
  eco:     {
    name:'Eco Friendly', nameHi:'इको फ्रेंडली', icon:'🌿',
    desc:'Default green theme', descHi:'डिफ़ॉल्ट हरी थीम',
    vars:{'--bg':'#070907','--card':'#0F160F','--green':'#3DFF7A','--g2':'#00C44F','--gdim':'#1A3320','--gold':'#D4AF37','--glass':'rgba(255,255,255,.04)','--gb':'rgba(61,255,122,.12)','--t':'#F0F4F0','--t2':'#8A9A8A','--t3':'#5A6A5A','--btn1':'#3DFF7A','--btn2':'#00C44F','--btnTxt':'#0A1A0A','--shadow':'rgba(61,255,122,.35)'},
  },
  premium: {
    name:'Gold Premium', nameHi:'गोल्ड प्रीमियम', icon:'👑',
    desc:'Royal Black & Gold luxury', descHi:'रॉयल ब्लैक गोल्ड',
    vars:{'--bg':'#050400','--card':'#100D00','--green':'#FFD700','--g2':'#D4AF37','--gdim':'#1A1400','--gold':'#FFD700','--glass':'rgba(255,215,0,.07)','--gb':'rgba(255,215,0,.28)','--t':'#FFF8DC','--t2':'#C8A84B','--t3':'#8A7040','--btn1':'linear-gradient(135deg,#FFD700,#D4AF37)','--btn2':'#C49A20','--btnTxt':'#0A0800','--shadow':'rgba(255,215,0,.5)'},
  },
  light:   {
    name:'Light', nameHi:'लाइट', icon:'☀️',
    desc:'Clean white theme', descHi:'सफेद लाइट थीम',
    vars:{'--bg':'#F2F5F2','--card':'#FFFFFF','--green':'#00A843','--g2':'#007830','--gdim':'#E8F5EC','--gold':'#C49A20','--glass':'rgba(0,168,67,.06)','--gb':'rgba(0,168,67,.16)','--t':'#1A2A1A','--t2':'#4A6A4A','--t3':'#8A9A8A','--btn1':'#00A843','--btn2':'#007830','--btnTxt':'#FFFFFF','--shadow':'rgba(0,168,67,.3)'},
  },
};

function getThemeStyle(th) {
  const v = THEMES[th].vars;
  const base = Object.fromEntries(Object.entries(v).map(([k,val])=>[k,val]));
  if(th==='premium') {
    base.background = 'radial-gradient(ellipse at 20% 20%, #1A1200 0%, #050400 50%, #0A0800 100%)';
    base.boxShadow = '0 0 80px rgba(255,215,0,.15), inset 0 0 120px rgba(255,215,0,.03)';
  } else if(th==='light') {
    base.background = '#F2F5F2';
  }
  return base;
}

/* ═══════════ THEME PICKER MODAL ═══════════ */
function ThemePicker({theme, setTheme, onClose, isHi}) {
  return (
    <div className="ovl" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(180deg,var(--card),var(--bg))'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:'var(--t)'}}>🎨 {isHi?'थीम चुनें':'Choose Theme'}</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{isHi?'अपना लुक चुनें':'Personalise your look'}</div>
          </div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:10,background:'var(--glass)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'var(--t)'}}>✕</div>
        </div>

        {Object.entries(THEMES).map(([id, th])=>{
          const isCh = theme===id;
          const isPremium = id==='premium';
          const isLight = id==='light';
          return (
            <div key={id} onClick={()=>{setTheme(id);onClose();}}
              style={{
                display:'flex',alignItems:'center',gap:14,padding:'16px',
                borderRadius:18,cursor:'pointer',marginBottom:10,
                background: isPremium
                  ? isCh?'linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.08))':'rgba(212,175,55,.04)'
                  : isLight
                    ? isCh?'rgba(0,168,67,.14)':'rgba(0,0,0,.03)'
                    : isCh?'linear-gradient(135deg,rgba(61,255,122,.14),rgba(61,255,122,.06))':'rgba(61,255,122,.03)',
                border: isCh
                  ? isPremium?'1.5px solid rgba(212,175,55,.55)'
                  : isLight?'1.5px solid rgba(0,168,67,.4)'
                  : '1.5px solid rgba(61,255,122,.4)'
                  : '1px solid rgba(128,128,128,.1)',
                transition:'all .2s',
                transform: isCh?'scale(1.02)':'scale(1)',
              }}>

              {/* Theme Preview Swatch */}
              <div style={{
                width:52, height:52, borderRadius:14, flexShrink:0,
                overflow:'hidden', position:'relative',
                boxShadow: isCh?'0 4px 16px rgba(0,0,0,.3)':'0 2px 8px rgba(0,0,0,.15)',
                background: isPremium?'#080808':isLight?'#F2F5F2':'#070907',
                border: isPremium?'1.5px solid rgba(212,175,55,.3)':isLight?'1.5px solid rgba(0,168,67,.2)':'1.5px solid rgba(61,255,122,.2)',
              }}>
                {/* Mini card */}
                <div style={{
                  position:'absolute',bottom:4,left:4,right:4,height:18,borderRadius:5,
                  background: isPremium?'#0E0E0E':isLight?'#fff':'#0F160F',
                  border: isPremium?'1px solid rgba(212,175,55,.3)':isLight?'1px solid rgba(0,168,67,.2)':'1px solid rgba(61,255,122,.15)',
                }}/>
                {/* Accent dot */}
                <div style={{
                  position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',
                  width:16,height:16,borderRadius:'50%',
                  background: isPremium?'linear-gradient(135deg,#D4AF37,#C49A20)':isLight?'linear-gradient(135deg,#00A843,#007830)':'linear-gradient(135deg,#3DFF7A,#00C44F)',
                  boxShadow: isPremium?'0 0 10px rgba(212,175,55,.5)':isLight?'0 0 10px rgba(0,168,67,.4)':'0 0 10px rgba(61,255,122,.5)',
                }}/>
              </div>

              <div style={{flex:1}}>
                <div style={{
                  fontSize:15,fontWeight:700,
                  color: isPremium?'#D4AF37':isLight?'#00A843':'#3DFF7A',
                  display:'flex',alignItems:'center',gap:6,
                }}>
                  {th.icon} {isHi?th.nameHi:th.name}
                  {isPremium&&<span style={{fontSize:9,background:'linear-gradient(135deg,#D4AF37,#C49A20)',color:'#0A0800',padding:'2px 6px',borderRadius:20,fontWeight:800,letterSpacing:.5}}>LUXURY</span>}
                </div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:3}}>{isHi?th.descHi:th.desc}</div>
              </div>

              {isCh&&(
                <div style={{
                  width:24,height:24,borderRadius:'50%',
                  background: isPremium?'linear-gradient(135deg,#D4AF37,#C49A20)':isLight?'linear-gradient(135deg,#00A843,#007830)':'linear-gradient(135deg,#3DFF7A,#00C44F)',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                }}>
                  <svg width={12} height={12} fill="none" stroke={isPremium||isLight?'#fff':'#0A1A0A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
          );
        })}

        <div style={{marginTop:8,padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center'}}>
          <div style={{fontSize:11,color:'var(--t3)'}}>{isHi?'थीम तुरंत लागू होती है':'Theme applies instantly · Saved for session'}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ TRANSLATIONS ═══════════ */
const T = {
  en: {
    home:'Home', combos:'Combos', food:'Food', eco:'Eco', profile:'Profile',
    goodMorning:'Good morning 👋', freshVeggies:'Fresh Veggies\nDelivered Daily',
    shopNow:'Shop Now →', bestSellers:'Best Sellers', seeAll:'See all',
    categories:'Categories', all:'All', veggies:'Veggies', fruits:'Fruits',
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
    myOrders:'My Orders', myCombos:'My Combos', subscription:'Subscription',
    addresses:'Addresses', payment:'Payment', settings:'Settings',
    ecoFriendly:'Eco-Friendly Delivery', byShopping:'By Daily Basket · Bhopalgarh',
    signOut:'Sign Out', productDetails:'Product Details',
    riderOnWay:'Rider on the way', orderStatus:'Order Status',
    priceDetails:'Price Details', addFreeDelivery:'Add ₹',
    forFreeDelivery:' more for free delivery', welcomeBack:'Welcome back! 👋',
  },
  hi: {
    home:'होम', combos:'कॉम्बो', food:'खाना', eco:'इको', profile:'प्रोफाइल',
    goodMorning:'शुभ प्रभात 👋', freshVeggies:'ताजी सब्जियां\nघर पर डिलीवरी',
    shopNow:'अभी खरीदें →', bestSellers:'बेस्ट सेलर', seeAll:'सभी देखें',
    categories:'श्रेणियां', all:'सभी', veggies:'सब्जियां', fruits:'फल',
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
    myOrders:'मेरे ऑर्डर', myCombos:'मेरे कॉम्बो', subscription:'सदस्यता',
    addresses:'पते', payment:'भुगतान', settings:'सेटिंग',
    ecoFriendly:'इको-फ्रेंडली डिलीवरी', byShopping:'डेली बास्केट द्वारा · भोपालगढ़',
    signOut:'साइन आउट', productDetails:'उत्पाद विवरण',
    riderOnWay:'राइडर रास्ते में है', orderStatus:'ऑर्डर स्थिति',
    priceDetails:'मूल्य विवरण', addFreeDelivery:'मुफ्त डिलीवरी के लिए ₹',
    forFreeDelivery:' और जोड़ें', welcomeBack:'वापसी पर स्वागत है! 👋',
  }
};

/* ═══════════ DATA ═══════════ */
const ADMIN_ID = 'Sunil14581';
const ADMIN_PASS = 'Sunil@$14581';
const DEMO_OTP = '123456';
const mkData = () => ({
  products:[
    {id:1,name:'Tomatoes',nameHi:'टमाटर',    price:35, unit:'500g',  emoji:'🍅',cat:'veg',  stock:150,tag:'Fresh',  tagHi:'ताजा',  active:true},
    {id:2,name:'Spinach', nameHi:'पालक',     price:25, unit:'250g',  emoji:'🥬',cat:'veg',  stock:80, tag:'Organic',tagHi:'जैविक', active:true},
    {id:3,name:'Carrots', nameHi:'गाजर',     price:40, unit:'500g',  emoji:'🥕',cat:'veg',  stock:120,tag:'Local',  tagHi:'स्थानीय',active:true},
    {id:4,name:'Onions',  nameHi:'प्याज',    price:35, unit:'500g',  emoji:'🧅',cat:'veg',  stock:180,tag:'Local',  tagHi:'स्थानीय',active:true},
    {id:5,name:'Potatoes',nameHi:'आलू',      price:30, unit:'1kg',   emoji:'🥔',cat:'veg',  stock:200,tag:'Fresh',  tagHi:'ताजा',  active:true},
    {id:6,name:'Apples',  nameHi:'सेब',      price:120,unit:'1kg',   emoji:'🍎',cat:'fruit',stock:90, tag:'Fresh',  tagHi:'ताजा',  active:true},
    {id:7,name:'Bananas', nameHi:'केला',     price:45, unit:'6pcs',  emoji:'🍌',cat:'fruit',stock:100,tag:'Organic',tagHi:'जैविक', active:true},
    {id:8,name:'Oranges', nameHi:'संतरा',    price:80, unit:'1kg',   emoji:'🍊',cat:'fruit',stock:70, tag:'Fresh',  tagHi:'ताजा',  active:true},
    {id:9,name:'Grapes',  nameHi:'अंगूर',   price:90, unit:'500g',  emoji:'🍇',cat:'fruit',stock:60, tag:'Seasonal',tagHi:'मौसमी', active:true},
    {id:10,name:'Full Cream Milk',nameHi:'फुल क्रीम दूध',price:55,unit:'500ml',emoji:'🥛',cat:'milk',stock:200,tag:'Fresh',tagHi:'ताजा',active:true},
    {id:11,name:'Curd',   nameHi:'दही',     price:30, unit:'400g',  emoji:'🍶',cat:'milk',stock:150,tag:'Probiotic',tagHi:'प्रोबायोटिक',active:true},
    {id:12,name:'Paneer', nameHi:'पनीर',    price:90, unit:'200g',  emoji:'🧀',cat:'milk',stock:80, tag:'Fresh',  tagHi:'ताजा',  active:true},
    {id:13,name:'Butter', nameHi:'मक्खन',   price:55, unit:'100g',  emoji:'🧈',cat:'milk',stock:100,tag:'Premium',tagHi:'प्रीमियम',active:true},
    {id:14,name:'Veg Biryani',nameHi:'वेज बिरयानी',price:149,unit:'1 plate',emoji:'🍛',cat:'food',stock:50,tag:'Hot',tagHi:'गरम',active:true},
    {id:15,name:'Dal Makhani',nameHi:'दाल मखनी', price:99, unit:'1 bowl',emoji:'🥘',cat:'food',stock:40,tag:"Chef's",tagHi:'शेफ',active:true},
  ],
  riders:[],
  shops:[],
  orders:[
    {id:'ORD001',cust:'Raj Kumar',  items:[{name:'Tomatoes',qty:2,price:35}],     total:95, status:'delivered',       riderId:'RDR001',shopId:null,    time:'9:20 AM', date:'Today'},
    {id:'ORD002',cust:'Priya Singh',items:[{name:'Full Cream Milk',qty:2,price:55}],total:110,status:'out_for_delivery',riderId:'RDR002',shopId:null,    time:'10:15 AM',date:'Today'},
    {id:'ORD003',cust:'Amit Joshi', items:[{name:'Veg Biryani',qty:1,price:149}], total:248,status:'preparing',       riderId:null,    shopId:'SHP001',time:'10:30 AM',date:'Today'},
    {id:'ORD004',cust:'Sunita Devi',items:[{name:'Apples',qty:1,price:120}],      total:120,status:'confirmed',       riderId:null,    shopId:null,    time:'10:45 AM',date:'Today'},
  ],
});

/* ═══════════ ICONS ═══════════ */
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
    trash: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    eye:   <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    lock:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    loc:   <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    edit:  <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    phone: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.61 3.38 2 2 0 013.58 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 8.96a16 16 0 006 6l.92-.92a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    globe: <svg width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  };
  return M[n]||null;
};

const SBar = () => <div style={{height:'env(safe-area-inset-top,0px)',flexShrink:0}}/>;
const BBtn = ({onClick}) => <div onClick={onClick} style={{width:40,height:40,borderRadius:12,background:'var(--glass)',backdropFilter:'blur(10px)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="#8A9A8A"/></div>;
const Tog = ({on,onClick}) => <div className={`tog ${on?'on':''}`} onClick={onClick}/>;

/* ═══════════ CAP MODAL (role portal selector) ═══════════ */
function CapModal({onClose, onSelect}) {
  const opts = [
    {id:'help', icon:'❓', label:'How to Login',  labelHi:'कैसे लॉगिन करें', sub:'Help for new users',     subHi:'नए उपयोगकर्ताओं के लिए',  c:'#3DFF7A'},
    {id:'rider',icon:'🚲', label:'For Rider',      labelHi:'राइडर के लिए',    sub:'Delivery partner portal', subHi:'डिलीवरी पार्टनर पोर्टल',  c:'#00C44F'},
    {id:'shop', icon:'🏨', label:'For Shopkeeper', labelHi:'दुकानदार के लिए',  sub:'Restaurant & store portal',subHi:'रेस्तरां और स्टोर',         c:'#D4AF37'},
    {id:'admin',icon:'🍓', label:'Admin Access',   labelHi:'एडमिन एक्सेस',    sub:'Master control panel',    subHi:'मास्टर कंट्रोल',           c:'#FF8C42'},
  ];
  const rgb={'#3DFF7A':'61,255,122','#00C44F':'0,196,79','#D4AF37':'212,175,55','#FF8C42':'255,140,66'};
  return (
    <div className="ovl" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:800}}>🧢 Switch Portal</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>Select your access role</div>
          </div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:10,background:'var(--glass)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}}>✕</div>
        </div>
        {opts.map(o=>{
          const r=rgb[o.c]||'61,255,122';
          return (
            <div key={o.id} onClick={()=>{onClose();onSelect(o.id);}} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 15px',borderRadius:16,cursor:'pointer',marginBottom:9,background:`rgba(${r},.06)`,border:`1px solid rgba(${r},.15)`}}>
              <div style={{width:46,height:46,borderRadius:14,background:`rgba(${r},.12)`,border:`1px solid rgba(${r},.25)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{o.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:o.c}}>{o.label} <span style={{fontSize:12,fontWeight:500,opacity:.7}}>/ {o.labelHi}</span></div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:1}}>{o.sub}</div>
              </div>
              <Ic n="arrow" s={15} c={o.c}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPLASH SCREEN — Cinematic Basket Fill
═══════════════════════════════════════════════ */
/* Splash: simple basket, no complex animation */

function Splash({onDone, onCapSelect}) {
  const [prog,    setProg   ] = useState(0);
  const [showBtn, setShowBtn] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const MSGS = ['Sourcing fresh produce…','Handpicking the finest…','Filling your basket…','Your basket is ready! 🎉'];
  const mi = Math.min(Math.floor(prog/26),3);

  useEffect(()=>{
    let p=0;
    const iv=setInterval(()=>{
      p=Math.min(p+1,100);
      setProg(p);
      if(p>=100){clearInterval(iv);setTimeout(()=>setShowBtn(true),300);}
    },35);
    return()=>clearInterval(iv);
  },[]);

  const handleStart=()=>{
    setExiting(true);
    setTimeout(onDone, 450);
  };

  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 45% 35%,#0C1C0C 0%,#070907 65%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',animation:exiting?'splExit .45s ease forwards':'fadeIn .5s ease',overflow:'hidden'}}>

      {/* ambient particles */}
      {['🌿','✨','🍃','💚','⭐','🌱'].map((p,i)=>(
        <div key={i} style={{position:'absolute',left:`${7+i*15}%`,top:`${4+i*13}%`,fontSize:12+i*2,opacity:.1,animation:`floatP ${3+i*.5}s ease-in-out infinite`,animationDelay:`${i*.4}s`,pointerEvents:'none'}}>{p}</div>
      ))}

      {/* Title */}
      <div style={{textAlign:'center',marginBottom:32,animation:'fadeUp .7s ease .1s both'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,background:'linear-gradient(135deg,#F0F4F0 0%,#3DFF7A 55%,#D4AF37 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',letterSpacing:'-.5px'}}>Daily Basket</div>
        <div style={{fontSize:11,color:'#3A5A3A',letterSpacing:3,marginTop:3,textTransform:'uppercase'}}>Fresh · Local · Eco</div>
      </div>

      {/* ── SIMPLE BASKET ── */}
      <div style={{marginBottom:36,animation:'floatY 3s ease-in-out infinite'}}>
        <div style={{width:150,height:150,borderRadius:'50%',background:'linear-gradient(135deg,#1A4A1A,#0A2A0A)',border:'3px solid rgba(61,255,122,.45)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',boxShadow:'0 0 60px rgba(61,255,122,.45),0 0 120px rgba(61,255,122,.15)',animation:'glowPulse 2.5s ease-in-out infinite'}}>
          <div style={{fontSize:82,lineHeight:1}}>🧺</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{width:230,marginBottom:14,animation:'fadeIn .6s ease .3s both'}}>
        <div className="pbar">
          <div className="pfill" style={{width:`${prog}%`,transition:'width .04s linear'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
          <span style={{fontSize:11,color:'#3A4A3A',fontWeight:500}}>{MSGS[mi]}</span>
          <span style={{fontSize:12,color:'#3DFF7A',fontWeight:800}}>{Math.round(prog)}%</span>
        </div>
      </div>

      {/* GET STARTED BUTTON */}
      <div style={{height:60,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {showBtn&&(
          <button className="btn rip" onClick={handleStart} style={{padding:'16px 48px',fontSize:18,fontWeight:800,animation:'gStartIn .5s cubic-bezier(.34,1.56,.64,1) both',letterSpacing:.4}}>
            Get Started 🚀
          </button>
        )}
      </div>

      {/* Bottom badge */}
      <div style={{position:'absolute',bottom:34,display:'flex',alignItems:'center',gap:8,opacity:.22}}>
        <div style={{width:4,height:4,borderRadius:'50%',background:'#3DFF7A'}}/>
        <span style={{fontSize:10,letterSpacing:3,textTransform:'uppercase',color:'#3DFF7A'}}>Bhopalgarh</span>
        <div style={{width:4,height:4,borderRadius:'50%',background:'#3DFF7A'}}/>
      </div>

      {/* 🧢 CAP ICON — only on splash */}
      <div onClick={()=>setCapOpen(true)} style={{position:'absolute',bottom:26,left:20,width:44,height:44,borderRadius:'50%',background:'rgba(7,9,7,.9)',backdropFilter:'blur(16px)',border:'1.5px solid rgba(61,255,122,.22)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 4px 22px rgba(0,0,0,.55)',fontSize:20,animation:'slideUp .5s cubic-bezier(.34,1.56,.64,1) .6s both'}}>
        🧢
      </div>

      {capOpen&&<CapModal onClose={()=>setCapOpen(false)} onSelect={id=>{setCapOpen(false);onCapSelect(id);}}/>}
    </div>
  );
}

/* ═══════════ CUSTOMER LOGIN ═══════════ */
function AddressScreen({onBack, onConfirm, userId, payMethod='cod', isHi=false}) {
  const [flat, setFlat]=useState('');
  const [area, setArea]=useState('');
  const [city, setCity]=useState('Bhopalgarh');
  const [type, setType]=useState('home');
  const [slot, setSlot]=useState('quick');
  const [contactless, setContactless]=useState(false);
  const [loading, setLoading]=useState(false);
  const [gpsLoading, setGpsLoading]=useState(false);
  const [gpsCoords, setGpsCoords]=useState(null); // {lat, lng, accuracy}

  const getGPS=()=>{
    setGpsLoading(true);
    if(!navigator.geolocation){alert('GPS is aapke browser mein support nahi hai.');setGpsLoading(false);return;}
    // watchPosition se best accuracy milti hai - 5 readings lete hain
    let bestPos=null;
    let watchId=null;
    let readingCount=0;
    const done=async(pos)=>{
      if(watchId!=null) navigator.geolocation.clearWatch(watchId);
      const {latitude,longitude,accuracy}=pos.coords;
      setGpsCoords({lat:latitude,lng:longitude,accuracy:Math.round(accuracy)});
      try{
        const res=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1&accept-language=en`,{headers:{'User-Agent':'DailyBasket/1.0'}});
        const data=await res.json();
        const addr=data.address||{};
        const house=addr.house_number||'';
        const road=addr.road||addr.pedestrian||addr.footway||addr.path||'';
        const hamlet=addr.hamlet||addr.isolated_dwelling||'';
        const suburb=addr.suburb||addr.neighbourhood||addr.quarter||'';
        const village=addr.village||hamlet||suburb||'';
        const town=addr.town||addr.city||addr.municipality||'';
        const flatStr=[house,road].filter(Boolean).join(' ')||hamlet||suburb||'';
        const areaStr=village||suburb||hamlet||road||town||'';
        const cityStr=town||village||'Bhopalgarh';
        setFlat(flatStr||'GPS Location');
        setArea(areaStr||'');
        setCity(cityStr);
      }catch(e){setFlat('GPS Location');setArea('');}
      setGpsLoading(false);
    };
    watchId=navigator.geolocation.watchPosition(
      pos=>{
        readingCount++;
        // Best reading = lowest accuracy number (most precise)
        if(!bestPos||pos.coords.accuracy<bestPos.coords.accuracy){
          bestPos=pos;
        }
        // After 3 good readings OR accuracy < 30m, accept
        if(readingCount>=3||pos.coords.accuracy<30){
          done(bestPos);
        }
      },
      err=>{
        if(watchId!=null) navigator.geolocation.clearWatch(watchId);
        const msgs={1:'GPS permission denied. Settings > Location > Allow karo.',2:'Location signal nahi mila. Bahar jaake try karo.',3:'GPS timeout. Dobara try karo.'};
        alert(msgs[err.code]||'GPS error: '+err.message);
        setGpsLoading(false);
      },
      {enableHighAccuracy:true,timeout:25000,maximumAge:0}
    );
    // Fallback: after 12s, use best reading so far
    setTimeout(()=>{
      if(gpsLoading&&bestPos){done(bestPos);}
      else if(gpsLoading){
        if(watchId!=null) navigator.geolocation.clearWatch(watchId);
        setGpsLoading(false);
        alert('GPS signal weak hai. Bahar jaake ya window ke paas retry karo.');
      }
    },12000);
  };

  const save=async()=>{
    if(!flat.trim()){alert(isHi?'मकान नंबर / घर का पता डालें':'Flat/House number daalo');return;}
    if(!area.trim()){alert(isHi?'मोहल्ला / इलाका डालें':'Area/Mohalla daalo');return;}
    setLoading(true);
    const mapsLink=gpsCoords?`https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`:'';
    const addrText=`${flat?flat+', ':''}${area?area+', ':''}${city}`;
    const slotLabel=isHi
      ?(slot==='morning'?'🌅 सुबह 6-9 बजे':slot==='quick'?'⚡ जल्दी ~30 मिनट':'🌆 शाम 6-9 बजे')
      :(slot==='morning'?'🌅 Morning 6-9 AM':slot==='quick'?'⚡ Quick ~30 min':'🌆 Evening 6-9 PM');
    const addrObj={
      flat,area,city,type,slot,contactless,
      lat:gpsCoords?.lat||null,
      lng:gpsCoords?.lng||null,
      accuracy:gpsCoords?.accuracy||null,
      mapsLink,
      full:`${addrText} · ${slotLabel}${contactless?(isHi?' · 🚪 बिना संपर्क':' · 🚪 Contactless'):''}${mapsLink?' · 📍GPS':''}`
    };
    try{
      if(userId) await addDoc(collection(db,'users',userId,'addresses'),{...addrObj,createdAt:serverTimestamp()});
    }catch(e){console.log('Address save error:',e);}
    setLoading(false);
    onConfirm(addrObj);
  };

  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={onBack}/>
        <div><div style={{fontSize:18,fontWeight:800}}>🗺️ {isHi?'डिलीवरी पता':'Delivery Address'}</div><div style={{fontSize:12,color:'var(--t3)'}}>{isHi?'हम कहाँ डिलीवर करें?':'Where should we deliver?'}</div></div>
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 100px'}}>
        <button onClick={getGPS} disabled={gpsLoading} style={{width:'100%',padding:'14px',borderRadius:14,background:'rgba(61,255,122,.08)',border:'1.5px solid rgba(61,255,122,.3)',color:'#3DFF7A',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {gpsLoading?(isHi?'📡 लोकेशन मिल रही है...':'📡 Getting location...'):(gpsCoords?`✅ GPS Active (±${gpsCoords.accuracy}m) — ${isHi?'दोबारा लें?':'Retake?'}`:(isHi?'📍 वर्तमान स्थान (GPS)':'📍 Use Current Location (GPS)'))}
        </button>

        {/* Manual Address Input */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:8,letterSpacing:.8,textTransform:'uppercase'}}>📝 {isHi?'पता लिखें':'Manual Address'}</div>
          <input className="dbi" placeholder={isHi?'🏠 मकान नं / बिल्डिंग / दुकान':'🏠 Flat / House No / Building'} value={flat} onChange={e=>setFlat(e.target.value)} style={{marginBottom:10}}/>
          <input className="dbi" placeholder={isHi?'📍 मोहल्ला / कॉलोनी / इलाका':'📍 Area / Mohalla / Colony'} value={area} onChange={e=>setArea(e.target.value)} style={{marginBottom:10}}/>
          <input className="dbi" placeholder={isHi?'🏙️ शहर':'🏙️ City'} value={city} onChange={e=>setCity(e.target.value)}/>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:8,letterSpacing:.8,textTransform:'uppercase'}}>{isHi?'पते का प्रकार':'Address Type'}</div>
          <div style={{display:'flex',gap:8}}>
            {[{id:'home',icon:'🏠',label:isHi?'घर':'Home'},{id:'work',icon:'💼',label:isHi?'काम':'Work'},{id:'other',icon:'📍',label:isHi?'अन्य':'Other'}].map(tp=>(
              <div key={tp.id} onClick={()=>setType(tp.id)} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${type===tp.id?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:type===tp.id?'rgba(61,255,122,.08)':'transparent',cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:18}}>{tp.icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:type===tp.id?'#3DFF7A':'var(--t3)',marginTop:4}}>{tp.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:8,letterSpacing:.8,textTransform:'uppercase'}}>🕐 {isHi?'डिलीवरी का समय':'Delivery Time Slot'}</div>
          <div style={{display:'flex',gap:8}}>
            {[{id:'morning',icon:'🌅',label:isHi?'सुबह':'Morning',sub:'6–9 AM'},{id:'quick',icon:'⚡',label:isHi?'जल्दी':'Quick',sub:isHi?'~30 मिनट':'~30 min'},{id:'evening',icon:'🌆',label:isHi?'शाम':'Evening',sub:'6–9 PM'}].map(s=>(
              <div key={s.id} onClick={()=>setSlot(s.id)} style={{flex:1,padding:'10px 6px',borderRadius:12,border:`1.5px solid ${slot===s.id?(s.id==='quick'?'rgba(212,175,55,.6)':'rgba(61,255,122,.5)'):'rgba(61,255,122,.1)'}`,background:slot===s.id?(s.id==='quick'?'rgba(212,175,55,.1)':'rgba(61,255,122,.08)'):'transparent',cursor:'pointer',textAlign:'center',position:'relative'}}>
                {s.id==='quick'&&<div style={{position:'absolute',top:-7,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#D4AF37,#B8962E)',borderRadius:50,padding:'2px 7px',fontSize:9,fontWeight:700,color:'#0A0800',whiteSpace:'nowrap'}}>{isHi?'डिफ़ॉल्ट':'DEFAULT'}</div>}
                <div style={{fontSize:18,marginTop:s.id==='quick'?4:0}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:slot===s.id?(s.id==='quick'?'#D4AF37':'#3DFF7A'):'var(--t)',marginTop:3}}>{s.label}</div>
                <div style={{fontSize:10,color:'var(--t3)',marginTop:1}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Contactless - only for online payment */}
        <div style={{opacity:payMethod==='upi'?1:0.4,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:14,background:'rgba(61,255,122,.04)',border:'1px solid rgba(61,255,122,.1)',cursor:payMethod==='upi'?'pointer':'not-allowed'}} onClick={()=>payMethod==='upi'&&setContactless(c=>!c)}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:20}}>🚪</span>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>Contactless Delivery</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{payMethod==='upi'?'Leave order at door, ring bell':'Online payment pe available'}</div>
              </div>
            </div>
            <Tog on={contactless&&payMethod==='upi'} onClick={e=>{e.stopPropagation();payMethod==='upi'&&setContactless(c=>!c);}}/>
          </div>
        </div>
        {/* Drone Delivery - Coming Soon */}
        <div style={{marginBottom:14,padding:'14px 16px',borderRadius:14,background:'rgba(100,100,255,.04)',border:'1px solid rgba(100,149,237,.2)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(100,149,237,.02) 8px,rgba(100,149,237,.02) 16px)'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>🚁</span>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#6495ED'}}>Drone Delivery</div>
                  <div style={{background:'linear-gradient(135deg,#6495ED,#4169E1)',borderRadius:50,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff'}}>COMING SOON</div>
                </div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>5–15 km range · Ultra fast</div>
              </div>
            </div>
            <div style={{fontSize:18,opacity:.4}}>🔒</div>
          </div>
          <div style={{marginTop:10,fontSize:11,color:'#6495ED',fontWeight:500,background:'rgba(100,149,237,.08)',borderRadius:8,padding:'6px 10px',position:'relative'}}>
            🌟 Bhopalgarh ke 5–15km range mein drone delivery jald aayegi!
          </div>
        </div>
        {flat&&area&&(
          <div style={{padding:'12px 14px',borderRadius:12,background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.15)',marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--t3)',marginBottom:4}}>📦 {isHi?'डिलीवरी यहाँ होगी:':'Delivery to:'}</div>
            <div style={{fontSize:13,fontWeight:600,color:'#3DFF7A'}}>{flat}, {area}, {city}</div>
          </div>
        )}
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 30px',background:'rgba(7,9,7,.95)',backdropFilter:'blur(20px)'}}>
        <button className="btn rip" onClick={save} disabled={loading} style={{width:'100%',padding:17,fontSize:16}}>
          {loading?(isHi?'सेव हो रहा है...':'Saving...'):(isHi?'✅ पता कन्फर्म करें और ऑर्डर दें':'✅ Confirm Address & Place Order')}
        </button>
      </div>
    </div>
  );
}

/* ═══════════ LIVE ORDER TRACKING SCREEN ═══════════ */
function TrackScreen({onBack, lastOrderId, isHi, t, fam}) {
  const [orderStatus, setOrderStatus] = useState('confirmed');
  const [orderData, setOrderData] = useState(null);
  const [riderLoc, setRiderLoc] = useState(null);

  useEffect(()=>{
    if(!lastOrderId) return;
    const unsub = onSnapshot(
      doc(db,'orders',lastOrderId),
      snap=>{ if(snap.exists()){
        const d=snap.data();
        setOrderData(d);
        setOrderStatus(d.status||'pending');
        // Rider assigned hone ke baad unka live location lo
        if(d.riderId){
          onSnapshot(query(collection(db,'riders'),where('id','==',d.riderId)),rSnap=>{
            const r=rSnap.docs[0]?.data();
            if(r?.location?.lat) setRiderLoc(r.location);
          });
        }
      }}
    );
    return()=>unsub();
  },[lastOrderId]);

  // Map URL: rider live location > customer GPS > Bhopalgarh default
  const mapUrl = riderLoc
    ? `https://maps.google.com/maps?q=${riderLoc.lat},${riderLoc.lng}&z=17&output=embed`
    : orderData?.lat&&orderData?.lng
      ? `https://maps.google.com/maps?q=${orderData.lat},${orderData.lng}&z=17&output=embed`
      : `https://maps.google.com/maps?q=Bhopalgarh,Rajasthan,India&z=15&output=embed`;

  const steps = [
    {id:'pending',   icon:'🕐', l:isHi?'ऑर्डर मिला':'Order Received',       sub:isHi?'आपका ऑर्डर मिल गया':'Your order has been placed'},
    {id:'confirmed', icon:'✅', l:isHi?'ऑर्डर कन्फर्म':'Order Confirmed',    sub:isHi?'हमने आपका ऑर्डर कन्फर्म किया':'We have confirmed your order'},
    {id:'packed',    icon:'📦', l:isHi?'पैकिंग हो रही है':'Being Packed',      sub:isHi?'आपका सामान पैक हो रहा है':'Your items are being packed'},
    {id:'out',       icon:'🚴', l:isHi?'डिलीवरी पर निकला':'Out for Delivery',  sub:isHi?'राइडर आपके पास आ रहा है':'Rider is on the way to you'},
    {id:'delivered', icon:'🏠', l:isHi?'डिलीवर हो गया':'Delivered',            sub:isHi?'ऑर्डर डिलीवर हो गया! धन्यवाद':'Order delivered! Thank you'},
  ];
  const si = steps.findIndex(s=>s.id===orderStatus);
  const isOut = orderStatus==='out';

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={onBack}/>
        <div>
          <div style={{fontSize:18,fontWeight:800}}>{t.orderTracking}</div>
          <div style={{fontSize:12,color:'var(--t3)'}}>{lastOrderId?`#DB-${lastOrderId.slice(-6).toUpperCase()}`:'#DB-XXXXXX'}</div>
        </div>
        {orderStatus==='delivered'&&<div style={{marginLeft:'auto',background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.3)',borderRadius:50,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#3DFF7A'}}>✅ {isHi?'डिलीवर!':'Delivered!'}</div>}
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 20px'}}>
        {/* Live Map */}
        <div style={{height:220,borderRadius:20,marginBottom:18,overflow:'hidden',position:'relative',border:`1px solid ${isOut&&riderLoc?'rgba(61,255,122,.5)':'rgba(61,255,122,.2)'}`}}>
          <iframe src={mapUrl} style={{width:'100%',height:'100%',border:'none'}} title="Live Tracking Map" loading="lazy"/>
          <div style={{position:'absolute',bottom:8,right:8,background:'rgba(0,0,0,.7)',borderRadius:50,padding:'4px 10px',display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:isOut&&riderLoc?'#3DFF7A':'#FF8C42',animation:'statusP 1.5s infinite'}}/>
            <span style={{fontSize:11,color:'#fff',fontWeight:700}}>{isOut&&riderLoc?'🚴 Rider Live':'📍 Live'}</span>
          </div>
        </div>

        {/* Rider Card */}
        {orderData?.riderId&&(
          <div className="gc" style={{padding:'14px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:46,height:46,borderRadius:14,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🚴</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700}}>{orderData.riderName||'Daily Basket Rider'}</div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{color:'#D4AF37',fontSize:12}}>⭐</span>
                <span style={{fontSize:12,color:'var(--t3)'}}>{isHi?'रास्ते में':'On the way'}</span>
                {riderLoc&&<span style={{fontSize:10,color:'#3DFF7A',marginLeft:4}}>📍 Live</span>}
              </div>
            </div>
            <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#00C44F,#008835)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>window.open(`tel:+91${orderData.userPhone||'6375565339'}`)}>
              <svg width={18} height={18} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.61 3.38 2 2 0 013.58 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.96a16 16 0 006 6l.92-.92a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
          </div>
        )}

        {/* Status Steps */}
        <div className="gc" style={{padding:'16px',marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>{isHi?'ऑर्डर स्टेटस':'Order Status'}</div>
          {steps.map((step,i)=>{
            const done=i<si; const active=i===si;
            return(
              <div key={i} style={{display:'flex',gap:12}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:38,height:38,borderRadius:12,background:done?'linear-gradient(135deg,#3DFF7A,#00C44F)':active?'linear-gradient(135deg,#1A3320,#0E2318)':'var(--card)',border:done?'none':active?'1.5px solid rgba(61,255,122,.4)':'1px solid rgba(61,255,122,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:done?14:16,flexShrink:0,animation:active?'statusP 1.5s infinite':'none',color:done?'#0A1A0A':'inherit'}}>{done?'✓':step.icon}</div>
                  {i<4&&<div style={{width:2,height:22,background:done?'linear-gradient(to bottom,#3DFF7A,#00C44F)':'rgba(255,255,255,.06)',margin:'3px 0',borderRadius:1}}/>}
                </div>
                <div style={{flex:1,paddingTop:4,paddingBottom:8}}>
                  <div style={{fontSize:14,fontWeight:active?800:600,color:done?'#3DFF7A':active?'#fff':'#5A6A5A'}}>{step.l}</div>
                  <div style={{fontSize:11,color:active?'#3DFF7A':done?'rgba(61,255,122,.5)':'#3A4A3A',marginTop:2}}>{active?step.sub:done?'✓ '+step.sub:step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        {orderData&&<div className="gc" style={{padding:'14px'}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>🧾 {isHi?'ऑर्डर सारांश':'Order Summary'}</div>
          {orderData.items?.map((item,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:12,color:'var(--t2)'}}>{item.name} × {item.qty}</span>
              <span style={{fontSize:12,fontWeight:700}}>₹{item.price*item.qty}</span>
            </div>
          ))}
          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:13,fontWeight:800}}>{isHi?'कुल':'Total'}</span>
            <span style={{fontSize:13,fontWeight:900,color:'#3DFF7A'}}>₹{orderData.total}</span>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ═══════════ MILK SUBSCRIPTION SCREEN ═══════════ */
function MilkSubscriptionScreen({onBack, user, fam}) {
  const [plan, setPlan] = useState('1L');
  const [days, setDays] = useState(30);
  const [time, setTime] = useState('06:00');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const plans = [
    {id:'1L', label:'1 Litre/day', price:65, icon:'🥛'},
    {id:'2L', label:'2 Litre/day', price:125, icon:'🍼'},
    {id:'500ml', label:'500ml/day', price:35, icon:'🫙'},
  ];
  const selPlan = plans.find(p=>p.id===plan);
  const total = selPlan.price * days;

  const submit = async()=>{
    setLoading(true);
    try {
      await addDoc(collection(db,'milk_subscriptions'),{
        userId: auth.currentUser?.uid,
        userName: user?.name,
        userPhone: user?.phone,
        plan, qty: selPlan.label, pricePerDay: selPlan.price,
        days, total, deliveryTime: time,
        status: 'pending', createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch(e){ console.log(e); }
    setLoading(false);
  };

  if(submitted) return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse at 50% 40%,#0C1C0C,#070907)',padding:28}}>
      <div style={{fontSize:80,marginBottom:20,animation:'floatY 3s ease-in-out infinite'}}>🥛</div>
      <div style={{fontSize:24,fontWeight:900,color:'#3DFF7A',marginBottom:8,textAlign:'center'}}>Subscription Confirmed!</div>
      <div style={{fontSize:14,color:'var(--t3)',textAlign:'center',marginBottom:8}}>Fresh {selPlan.label} milk delivered at {time} daily</div>
      <div style={{fontSize:13,color:'#D4AF37',marginBottom:28}}>Total: ₹{total} for {days} days</div>
      <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.2)',borderRadius:14,padding:'12px 16px',marginBottom:24,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--t3)'}}>Hamara team 24 ghante mein contact karega</div>
        <div style={{fontSize:13,fontWeight:700,color:'#3DFF7A',marginTop:4}}>📞 +91 63755 65339</div>
      </div>
      <button className="btn rip" onClick={onBack} style={{width:'100%',padding:16,fontSize:15}}>← Back to Home</button>
    </div>
  );

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={onBack}/>
        <div><div style={{fontSize:18,fontWeight:800}}>🥛 Milk Subscription</div><div style={{fontSize:12,color:'var(--t3)'}}>Fresh milk at your door daily</div></div>
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 120px'}}>
        <div style={{background:'linear-gradient(135deg,#0A0D1A,#060710)',borderRadius:20,padding:20,marginBottom:16,border:'1px solid rgba(100,100,255,.15)'}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📦 Select Plan</div>
          {plans.map(p=>(
            <div key={p.id} onClick={()=>setPlan(p.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,marginBottom:8,cursor:'pointer',border:`1.5px solid ${plan===p.id?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:plan===p.id?'rgba(61,255,122,.08)':'rgba(255,255,255,.02)'}}>
              <span style={{fontSize:28}}>{p.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{p.label}</div><div style={{fontSize:12,color:'var(--t3)'}}>₹{p.price}/day</div></div>
              <div style={{fontSize:15,fontWeight:800,color:'#3DFF7A'}}>₹{p.price}</div>
            </div>
          ))}
        </div>
        <div className="gc" style={{padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📅 Duration: {days} days</div>
          <input type="range" min={7} max={90} value={days} onChange={e=>setDays(Number(e.target.value))} style={{width:'100%',accentColor:'#3DFF7A'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}><span style={{fontSize:11,color:'var(--t3)'}}>7 days</span><span style={{fontSize:11,color:'var(--t3)'}}>90 days</span></div>
        </div>
        <div className="gc" style={{padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>⏰ Delivery Time</div>
          {['06:00','07:00','08:00'].map(t=>(
            <div key={t} onClick={()=>setTime(t)} style={{display:'inline-flex',marginRight:8,marginBottom:8,padding:'8px 16px',borderRadius:50,cursor:'pointer',border:`1.5px solid ${time===t?'rgba(61,255,122,.5)':'rgba(61,255,122,.12)'}`,background:time===t?'rgba(61,255,122,.1)':'transparent',fontSize:13,fontWeight:600,color:time===t?'#3DFF7A':'var(--t3)'}}>{t} AM</div>
          ))}
        </div>
        <div className="gc" style={{padding:16,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'var(--t2)'}}>Plan</span><span style={{fontSize:13,fontWeight:600}}>{selPlan.label} × {days} days</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'var(--t2)'}}>Rate</span><span style={{fontSize:13,fontWeight:600}}>₹{selPlan.price}/day</span></div>
          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:10,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:15,fontWeight:800}}>Total</span><span style={{fontSize:16,fontWeight:900,color:'#3DFF7A'}}>₹{total}</span></div>
        </div>
        <button className="btn rip" onClick={submit} disabled={loading} style={{width:'100%',padding:16,fontSize:15,marginBottom:20}}>{loading?'Submitting...':'🥛 Subscribe Now — ₹'+total}</button>
      </div>
    </div>
  );
}

/* ═══════════ BULK / EVENT ORDER SCREEN ═══════════ */
function BulkOrderScreen({onBack, user, fam}) {
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [orderImg, setOrderImg] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const events = ['🎊 Party','💍 Wedding','🏢 Corporate','🎓 Graduation','🕌 Pooja/Event','📦 Bulk Groceries'];

  const submit = async()=>{
    if(!eventType||!date){alert('Event type aur date bharein');return;}
    setLoading(true);
    try {
      await addDoc(collection(db,'bulk_orders'),{
        userId: auth.currentUser?.uid,
        userName: user?.name,
        userPhone: user?.phone,
        eventType, date, note,
        hasPhoto: orderImg?true:false,
        status: 'inquiry', createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch(e){ console.log(e); }
    setLoading(false);
  };

  if(submitted) return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse at 50% 40%,#0C1C0C,#070907)',padding:28}}>
      <div style={{fontSize:80,marginBottom:20,animation:'floatY 3s ease-in-out infinite'}}>🎊</div>
      <div style={{fontSize:22,fontWeight:900,color:'#3DFF7A',marginBottom:8,textAlign:'center'}}>Bulk Order Request Sent!</div>
      <div style={{fontSize:13,color:'var(--t3)',textAlign:'center',marginBottom:24}}>Hamari team 2 ghante mein aapko call karegi aur custom quote degi</div>
      <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.2)',borderRadius:14,padding:'12px 16px',marginBottom:24,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#3DFF7A'}}>📞 +91 63755 65339</div>
        <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>WhatsApp pe bhi message kar sakte hain</div>
      </div>
      <button className="btn rip" onClick={onBack} style={{width:'100%',padding:16,fontSize:15}}>← Back to Home</button>
    </div>
  );

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={onBack}/>
        <div><div style={{fontSize:18,fontWeight:800}}>🎊 Bulk / Event Order</div><div style={{fontSize:12,color:'var(--t3)'}}>Min ₹500 · Custom quote milega</div></div>
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 120px'}}>
        <div className="gc" style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>🎉 Event Type</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {events.map(e=>(
              <div key={e} onClick={()=>setEventType(e)} style={{padding:'8px 14px',borderRadius:50,cursor:'pointer',border:`1.5px solid ${eventType===e?'rgba(61,255,122,.5)':'rgba(61,255,122,.12)'}`,background:eventType===e?'rgba(61,255,122,.1)':'transparent',fontSize:13,fontWeight:600,color:eventType===e?'#3DFF7A':'var(--t3)'}}>{e}</div>
            ))}
          </div>
        </div>
        <div className="gc" style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📅 Event Date</div>
          <input className="dbi" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:'dark'}}/>
        </div>
        <div className="gc" style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📸 Order List / Photo Upload</div>
          <div onClick={()=>document.getElementById('bulkImg').click()} style={{border:'2px dashed rgba(61,255,122,.25)',borderRadius:14,padding:20,textAlign:'center',cursor:'pointer',background:orderImg?'rgba(61,255,122,.04)':'transparent',marginBottom:8}}>
            {orderImg
              ? <div><img src={orderImg} alt="order" style={{width:'100%',maxHeight:160,objectFit:'cover',borderRadius:10,marginBottom:8}}/><div style={{fontSize:12,color:'#3DFF7A'}}>✅ Photo uploaded · Tap to change</div></div>
              : <div><div style={{fontSize:36,marginBottom:8}}>📷</div><div style={{fontSize:13,fontWeight:600,color:'var(--t3)'}}>Apni order list ki photo upload karo</div><div style={{fontSize:11,color:'#5A6A5A',marginTop:4}}>JPG, PNG · Max 5MB</div></div>
            }
          </div>
          <input id="bulkImg" type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setOrderImg(ev.target.result);r.readAsDataURL(f);}}}/>
        </div>
        <div className="gc" style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📝 Special Requirements</div>
          <textarea className="dbi" rows={3} placeholder="e.g. Veg only, specific items, quantity..." value={note} onChange={e=>setNote(e.target.value)} style={{resize:'none',minHeight:80}}/>
        </div>
        <div style={{background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.2)',borderRadius:14,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:12,color:'var(--t3)'}}>Minimum Order · Custom Quote</div>
          <div style={{fontSize:18,fontWeight:900,color:'#D4AF37'}}>₹500+</div>
          <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>Final quote call pe confirm hoga · 2 ghante mein callback</div>
        </div>
        <button className="btn rip" onClick={submit} disabled={loading} style={{width:'100%',padding:16,fontSize:15,marginBottom:20}}>{loading?'Sending...':'🎊 Send Bulk Order Request'}</button>
      </div>
    </div>
  );
}

function CustomerLogin({onLogin}) {
  const [name,       setName      ] = useState('');
  const [phone,      setPhone     ] = useState('');
  const [email,      setEmail     ] = useState('');
  const [emailOtp,   setEmailOtp  ] = useState(false);
  const [otp,        setOtp       ] = useState('');
  const [step,       setStep      ] = useState('phone');
  const [token,      setToken     ] = useState('');
  const [loading,    setLoading   ] = useState(false);
  const [err,        setErr       ] = useState('');
  const [resend,     setResend    ] = useState(0);
  const [otpSentTo,  setOtpSentTo ] = useState('');

  const sendOTP = async () => {
    if(!name.trim()){setErr('Apna naam daalo');return;}
    if(phone.length!==10){setErr('Valid 10-digit mobile number daalo');return;}
    setErr(''); setLoading(true);
    try {
      // Step 1: Email OTP pehle bhejo — EmailJS browser API (client-side)
      let emailSent = false;
      if(emailOtp && email.includes('@') && email.includes('.')) {
        const emailCode = String(Math.floor(100000+Math.random()*900000));
        localStorage.setItem('db_email_otp', emailCode);
        try {
          const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method:'POST',
            headers:{'Content-Type':'application/json','origin':'http://localhost'},
            body: JSON.stringify({
              service_id:'service_stnx9cf',
              template_id:'template_1zx0d4g',
              user_id:'d_7tKaWwZUPNIH54P',
              accessToken:'dwdte_YEIdiFgSomNI1Pi',
              template_params:{
                to_name: name.trim(),
                otp_code: emailCode,
                to_email: email
              }
            })
          });
          if(ejsRes.ok) emailSent = true;
          else console.log('EmailJS err:', await ejsRes.text());
        } catch(e){ console.log('Email OTP err:',e); }
      }

      // Step 2: SMS OTP try karo — fail ho to bhi email se kaam chalega
      let smsToken = '';
      try {
        const res = await fetch('/api/sendotp', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({phone})
        });
        const data = await res.json();
        if(data.success) smsToken = data.token;
      } catch(e){ console.log('SMS OTP err:',e); }

      // Agar dono fail ho to error do
      if(!smsToken && !emailSent) {
        throw new Error('OTP send nahi hua. Internet check karo.');
      }

      setToken(smsToken);
      setOtpSentTo(emailOtp && email.includes('@') ? phone+'|'+email : phone);
      setStep('otp'); setResend(30);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if(otp.length!==6){setErr('6 digit OTP daalo');return;}
    setLoading(true); setErr('');
    try {
      let verified = false;

      // Email OTP check karo pehle (agar SMS nahi aaya)
      if(emailOtp && email.includes('@')) {
        const savedEmailOtp = localStorage.getItem('db_email_otp');
        if(savedEmailOtp && otp === savedEmailOtp) {
          verified = true;
          localStorage.removeItem('db_email_otp');
        }
      }

      // Agar email se verify nahi hua to SMS se try karo
      if(!verified && token) {
        const res = await fetch('/api/verifyotp', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({token, userOtp:otp})
        });
        const data = await res.json();
        if(data.success) verified = true;
        else throw new Error('Galat OTP! Dobara check karo.');
      }

      if(!verified) throw new Error('Galat OTP! Email ya SMS check karo.');

      const uid = 'ph_'+phone;
      const uData = {name:name.trim(), phone, uid, email:email||''};
      try {
        await setDoc(doc(db,'users',uid),{name:name.trim(),phone,email:email||'',updatedAt:serverTimestamp()},{merge:true});
        localStorage.setItem('db_cust_user', JSON.stringify(uData));
        localStorage.setItem('db_name', name.trim());
      } catch(e){console.log('Save error:',e);}
      setLoading(false);
      onLogin(uData);
    } catch(e) {
      setErr(e.message||'Galat OTP! Dobara try karo.');
      setLoading(false);
    }
  };

  useEffect(()=>{
    if(resend<=0) return;
    const iv=setInterval(()=>setResend(r=>Math.max(0,r-1)),1000);
    return()=>clearInterval(iv);
  },[resend]);

  const sentPhone = otpSentTo.split('|')[0];
  const sentEmail = otpSentTo.split('|')[1];

  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 20%,#0C1C0C,#070907)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <SBar/>
      <div style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'10px 28px 40px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0 20px',animation:'fadeUp .6s ease both'}}>
          <div style={{fontSize:60,marginBottom:16,animation:'floatY 3s ease-in-out infinite'}}>🧺</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:800,textAlign:'center',background:'linear-gradient(135deg,#F0F4F0,#3DFF7A)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Daily Basket</div>
          <div style={{fontSize:14,color:'var(--t3)',marginTop:6,textAlign:'center'}}>Fresh groceries delivered to your door</div>
        </div>

        {step==='phone' ? (
          <div style={{animation:'fadeUp .6s ease .15s both'}}>
            <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Let's get started!</div>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:24}}>Enter your details to continue</div>

            {/* Name */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Your Name</div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><Ic n="user" s={16} c="#5A6A5A"/></div>
                <input className="dbi" style={{paddingLeft:42}} placeholder="Enter your full name" value={name} onChange={e=>{setName(e.target.value);setErr('');}}/>
              </div>
            </div>

            {/* Phone - Mandatory */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Mobile Number <span style={{color:'#FF6B6B'}}>*</span></div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:6}}>
                  <Ic n="phone" s={16} c="#5A6A5A"/>
                  <span style={{fontSize:13,color:'#5A6A5A',fontWeight:600,borderRight:'1px solid rgba(255,255,255,.1)',paddingRight:8}}>+91</span>
                </div>
                <input className="dbi" style={{paddingLeft:78}} type="tel" maxLength={10} placeholder="10-digit mobile" value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,''));setErr('');}}/>
              </div>
            </div>

            {/* Email - Optional */}
            <div style={{marginBottom:6}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Email <span style={{color:'var(--t3)',fontWeight:400,textTransform:'none',fontSize:10}}>(optional)</span></div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><span style={{fontSize:16}}>📧</span></div>
                <input className="dbi" style={{paddingLeft:42}} type="email" placeholder="yourname@gmail.com" value={email} onChange={e=>{setEmail(e.target.value.trim());setErr('');}}/>
              </div>
            </div>

            {/* Email OTP checkbox - show only if email entered */}
            {email.includes('@')&&email.includes('.')&&(
              <div onClick={()=>setEmailOtp(e=>!e)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:emailOtp?'rgba(61,255,122,.08)':'rgba(255,255,255,.03)',border:`1.5px solid ${emailOtp?'rgba(61,255,122,.4)':'rgba(255,255,255,.08)'}`,cursor:'pointer',marginBottom:6,transition:'all .2s'}}>
                <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${emailOtp?'#3DFF7A':'rgba(255,255,255,.2)'}`,background:emailOtp?'#3DFF7A':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                  {emailOtp&&<span style={{fontSize:12,color:'#0A1A0A',fontWeight:800}}>✓</span>}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Email pe bhi OTP bhejo</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>OTP {email} pe bhi jayega</div>
                </div>
              </div>
            )}

            {err&&<div style={{fontSize:12,color:'#FF6B6B',background:'rgba(255,107,107,.08)',padding:'10px 14px',borderRadius:10,marginBottom:12}}>{err}</div>}

            <button className="btn rip" onClick={sendOTP} disabled={loading} style={{width:'100%',padding:'17px',fontSize:16,marginTop:10}}>
              {loading ? 'OTP bhej raha hoon...' : 'Next — Get OTP →'}
            </button>
          </div>
        ) : (
          <div style={{animation:'fadeUp .6s ease both'}}>
            <div onClick={()=>setStep('phone')} style={{display:'flex',alignItems:'center',gap:8,marginBottom:24,cursor:'pointer'}}>
              <Ic n="back" s={18} c="#8A9A8A"/>
              <span style={{fontSize:14,color:'var(--t3)'}}>Back</span>
            </div>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:40,marginBottom:12}}>{sentEmail?'📱📧':'📱'}</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Verify OTP</div>
              <div style={{fontSize:13,color:'var(--t3)',marginBottom:4}}>OTP bheja gaya:</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>📱 +91 {sentPhone}</div>
              {sentEmail&&<div style={{fontSize:13,fontWeight:600,color:'#3DFF7A',marginTop:4}}>📧 {sentEmail}</div>}
            </div>

            <input className="dbi" type="tel" maxLength={6} placeholder="Enter 6-digit OTP" value={otp}
              onChange={e=>{setOtp(e.target.value.replace(/\D/g,''));setErr('');}}
              style={{textAlign:'center',fontSize:24,letterSpacing:12,marginBottom:16}}/>

            {err&&<div style={{fontSize:12,color:'#FF6B6B',background:'rgba(255,107,107,.08)',padding:'10px 14px',borderRadius:10,marginBottom:16}}>{err}</div>}

            <button className="btn rip" onClick={verifyOTP} disabled={loading} style={{width:'100%',padding:'17px',fontSize:16}}>
              {loading ? 'Verify ho raha hai...' : 'Verify & Login ✓'}
            </button>
            <div style={{textAlign:'center',marginTop:16,fontSize:13,color:'var(--t3)'}}>
              {resend>0
                ? <span>Resend in <strong style={{color:'#3DFF7A'}}>{resend}s</strong></span>
                : <span style={{color:'#3DFF7A',fontWeight:600,cursor:'pointer'}} onClick={()=>{setOtp('');sendOTP();}}>Resend OTP ↺</span>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ OTP SCREEN ═══════════ */
function OTPScreen({phone, name, onVerify, onBack}) {
  const [otp,    setOtp  ] = useState(['','','','','','']);
  const [err,    setErr  ] = useState('');
  const [shake,  setShake] = useState(false);
  const [resend, setResend] = useState(30);
  const [success,setSuccess]=useState(false);
  const r0=useRef(null),r1=useRef(null),r2=useRef(null),r3=useRef(null),r4=useRef(null),r5=useRef(null);
  const refs=[r0,r1,r2,r3,r4,r5];

  useEffect(()=>{
    const iv=setInterval(()=>setResend(r=>Math.max(0,r-1)),1000);
    return()=>clearInterval(iv);
  },[]);

  const handleKey=(i,val)=>{
    if(val.length>1) return;
    const next=[...otp];next[i]=val;setOtp(next);setErr('');
    if(val&&i<5) refs[i+1].current && refs[i+1].current.focus();
  };
  const handleKD=(i,e)=>{
    if(e.key==='Backspace'&&!otp[i]&&i>0){refs[i-1].current && refs[i-1].current.focus();}
  };

  const verify=()=>{
    const entered=otp.join('');
    if(entered.length<6){setErr('Please enter the complete 6-digit OTP');return;}
    if(entered!==DEMO_OTP){
      setErr('Incorrect OTP. Try: 123456');
      setShake(true);setTimeout(()=>setShake(false),500);
      setOtp(['','','','','','']);refs[0].current && refs[0].current.focus();
      return;
    }
    setSuccess(true);
    setTimeout(()=>onVerify({name,phone}),1200);
  };

  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 20%,#0C1C0C,#070907)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <SBar/>
      <div style={{padding:'4px 20px 0',display:'flex',alignItems:'center',gap:10}}>
        <BBtn onClick={onBack}/>
        <span style={{fontSize:16,fontWeight:700}}>Verify OTP</span>
      </div>

      <div style={{flex:1,padding:'30px 28px',display:'flex',flexDirection:'column'}}>
        {/* icon */}
        <div style={{textAlign:'center',marginBottom:28,animation:'fadeUp .6s ease both'}}>
          <div style={{width:70,height:70,borderRadius:22,background:'linear-gradient(135deg,var(--gdim),#0E2318)',border:'1.5px solid rgba(61,255,122,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 16px',boxShadow:'0 0 30px rgba(61,255,122,.15)'}}>📱</div>
          <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>Check your phone</div>
          <div style={{fontSize:13,color:'var(--t3)',lineHeight:1.6}}>We sent a 6-digit OTP to<br/><strong style={{color:'var(--t)'}}>+91 {phone}</strong></div>
          <div style={{marginTop:8,padding:'5px 14px',background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',borderRadius:50,display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:11,color:'#3DFF7A',fontWeight:600}}>Demo OTP: 123456</span>
          </div>
        </div>

        {/* OTP boxes */}
        {success
          ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,animation:'scaleIn .4s cubic-bezier(.34,1.56,.64,1) both'}}>
              <div style={{position:'relative',width:72,height:72}}>
                <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid rgba(61,255,122,.3)',animation:'ringExpand .6s ease both'}}/>
                <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#1A3320,#0E2318)',border:'2px solid #3DFF7A',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 30px rgba(61,255,122,.4)'}}>
                  <svg width={32} height={32} fill="none" stroke="#3DFF7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline style={{strokeDasharray:60,strokeDashoffset:0,animation:'checkAnim .4s ease .2s both'}} points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#3DFF7A'}}>Verified! Welcome 🎉</div>
            </div>
          : <>
              <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:10,animation:shake?'otpShake .4s ease':'none'}}>
                {otp.map((v,i)=>(
                  <input key={i} ref={refs[i]} maxLength={1} type="tel" value={v}
                    onChange={e=>handleKey(i,e.target.value.replace(/\D/g,''))}
                    onKeyDown={e=>handleKD(i,e)}
                    style={{width:48,height:58,borderRadius:14,border:`2px solid ${v?'rgba(61,255,122,.55)':'rgba(61,255,122,.14)'}`,background:v?'rgba(61,255,122,.08)':'rgba(255,255,255,.03)',color:'#F0F4F0',fontSize:24,fontWeight:800,textAlign:'center',outline:'none',transition:'all .2s',fontFamily:'Outfit,sans-serif'}}
                  />
                ))}
              </div>
              {err&&<div style={{fontSize:12,color:'#FF6B6B',textAlign:'center',marginBottom:14,animation:'fadeIn .3s ease'}}>{err}</div>}

              <button className="btn rip" onClick={verify} style={{width:'100%',padding:'16px',fontSize:16,marginBottom:20}}>
                Verify & Login ✓
              </button>

              <div style={{textAlign:'center',fontSize:13,color:'var(--t3)'}}>
                {resend>0
                  ? <span>Resend OTP in <strong style={{color:'#3DFF7A'}}>{resend}s</strong></span>
                  : <span style={{color:'#3DFF7A',fontWeight:600,cursor:'pointer'}} onClick={()=>setResend(30)}>Resend OTP</span>
                }
              </div>
            </>
        }
      </div>
    </div>
  );
}

/* ═══════════ LOCATION SCREEN ═══════════ */
function LocationScreen({user, onAllow, onSkip}) {
  const [requesting, setRequesting]=useState(false);

  const allow=()=>{
    setRequesting(true);
    setTimeout(onAllow, 1200);
  };

  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 25%,#0C1C0C,#070907)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'60px 28px 50px',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'20%',left:'50%',transform:'translateX(-50%)',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(61,255,122,.05),transparent 70%)',pointerEvents:'none'}}/>

      <div/>

      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,animation:'fadeUp .6s ease both'}}>
        {/* Location illustration */}
        <div style={{position:'relative',marginBottom:28}}>
          <div style={{width:120,height:120,borderRadius:'50%',background:'linear-gradient(135deg,#1A3320,#0E2318)',border:'2px solid rgba(61,255,122,.3)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 50px rgba(61,255,122,.25)',animation:'glowPulse 2.5s ease-in-out infinite'}}>
            <Ic n="loc" s={50} c="#3DFF7A"/>
          </div>
          {/* ping rings */}
          {[140,165,190].map((r,i)=>(
            <div key={i} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:r,height:r,borderRadius:'50%',border:`1px solid rgba(61,255,122,${.18-i*.05})`,animation:`ringExpand ${2+i*.5}s ease-in-out infinite`,animationDelay:`${i*.4}s`}}/>
          ))}
        </div>

        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,marginBottom:8}}>Allow Location 📍</div>
          <div style={{fontSize:14,color:'var(--t3)',lineHeight:1.7,maxWidth:280}}>
            Hello <strong style={{color:'var(--t)'}}>{user&&user.name}</strong>! 👋<br/>
            Daily Basket needs your location to find nearby delivery slots and show products available in your area.
          </div>
        </div>

        {/* Features */}
        <div style={{marginTop:24,width:'100%',display:'flex',flexDirection:'column',gap:10}}>
          {[{icon:'🚴',text:'Faster delivery to your doorstep'},{icon:'🛒',text:'Products available near you'},{icon:'🌱',text:'Support local farmers in Bhopalgarh'}].map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(61,255,122,.04)',border:'1px solid rgba(61,255,122,.1)',borderRadius:14,animation:`fadeUp .4s ease ${.1+i*.1}s both`}}>
              <span style={{fontSize:20}}>{item.icon}</span>
              <span style={{fontSize:13,color:'var(--t2)',fontWeight:500}}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{width:'100%',display:'flex',flexDirection:'column',gap:12,animation:'fadeUp .6s ease .4s both'}}>
        <button className="btn rip" onClick={allow} style={{width:'100%',padding:'16px',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
          {requesting
            ? <span style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:18,height:18,border:'2px solid #0A1A0A',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/> Getting location…</span>
            : <><Ic n="loc" s={18} c="#0A1A0A"/>Allow Location Access</>
          }
        </button>
        <button className="btng rip" onClick={onSkip} style={{width:'100%',padding:'14px',fontSize:14}}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ═══════════ LANGUAGE SELECTION ═══════════ */
function LanguageScreen({user, onSelect}) {
  const [chosen, setChosen]=useState(null);
  const [confirming,setConfirming]=useState(false);

  const choose=(lang)=>{
    setChosen(lang);
    setConfirming(true);
    setTimeout(()=>onSelect(lang),900);
  };

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'radial-gradient(ellipse at 50% 40%,#0C1C0C,#070907)'}}>
      {/* animated background */}
      {[...Array(8)].map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',background:`radial-gradient(circle,rgba(61,255,122,${.03+i*.005}),transparent 70%)`,width:100+i*80,height:100+i*80,top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:'0 28px',width:'100%',maxWidth:390}}>
        {/* header */}
        <div style={{textAlign:'center',marginBottom:36,animation:'fadeUp .6s ease both'}}>
          <div style={{fontSize:48,marginBottom:14,animation:'floatY 3s ease-in-out infinite'}}>🌐</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,marginBottom:6}}>Choose Your Language</div>
          <div style={{fontFamily:"'Noto Sans Devanagari','Outfit',sans-serif",fontSize:20,fontWeight:700,color:'#3DFF7A',marginBottom:8}}>भाषा चुनें</div>
          <div style={{fontSize:13,color:'var(--t3)'}}>Select the language you prefer</div>
        </div>

        {/* Language cards */}
        {[
          {id:'en', flag:'🇬🇧', name:'English',    desc:'English language interface',    sub:'English', color:'#3DFF7A', delay:0.1},
          {id:'hi', flag:'🇮🇳', name:'हिंदी',     desc:'हिंदी भाषा इंटरफ़ेस',         sub:'Hindi',   color:'#FF8C42', delay:0.2},
        ].map(lang=>{
          const rgb={'#3DFF7A':'61,255,122','#FF8C42':'255,140,66'}[lang.color]||'61,255,122';
          const isCh = chosen===lang.id;
          return (
            <div key={lang.id} onClick={()=>!confirming&&choose(lang.id)} style={{
              display:'flex',alignItems:'center',gap:18,padding:'20px 22px',
              borderRadius:22,cursor:'pointer',marginBottom:14,
              background:isCh?`linear-gradient(135deg,rgba(${rgb},.14),rgba(${rgb},.06))`:'rgba(255,255,255,.03)',
              border:`${isCh?2:1.5}px solid rgba(${rgb},${isCh?0.5:0.1})`,
              boxShadow:isCh?`0 0 30px rgba(${rgb},.2)`:'none',
              transform:isCh?'scale(1.03)':'scale(1)',
              transition:'all .25s cubic-bezier(.34,1.56,.64,1)',
              animation:`langIn .5s ease ${lang.delay}s both`,
            }}>
              <div style={{fontSize:40,flexShrink:0}}>{lang.flag}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:800,color:isCh?lang.color:'var(--t)',fontFamily:lang.id==='hi'?"'Noto Sans Devanagari','Outfit',sans-serif":'Outfit,sans-serif'}}>{lang.name}</div>
                <div style={{fontSize:12,color:'var(--t3)',marginTop:2,fontFamily:lang.id==='hi'?"'Noto Sans Devanagari','Outfit',sans-serif":'Outfit,sans-serif'}}>{lang.desc}</div>
              </div>
              <div style={{width:28,height:28,borderRadius:'50%',background:isCh?`linear-gradient(135deg,${lang.color},${lang.color}AA)`:'transparent',border:isCh?'none':`1.5px solid rgba(${rgb},.2)`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>
                {isCh&&(confirming
                  ? <span style={{width:14,height:14,border:`2px solid #0A1A0A`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .6s linear infinite'}}/>
                  : <Ic n="check" s={14} c="#0A1A0A"/>
                )}
              </div>
            </div>
          );
        })}

        <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'#3A4A3A',animation:'fadeIn .6s ease .4s both'}}>
          You can change this later in Settings / सेटिंग में बदल सकते हैं
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN CUSTOMER APP ═══════════ */
function CustomerApp({user, lang, setLang, data, setData, theme, setTheme}) {
  const t = T[lang]||T.en;
  const isHi = lang==='hi';
  const fam = isHi?"'Noto Sans Devanagari','Outfit',sans-serif":"'Outfit',sans-serif";

  const [scr,    setScr   ]=useState('home');
  const [nav,    setNav   ]=useState('home');
  const [cart,setCart]=useState(()=>{
    try{const c=localStorage.getItem('db_cart');return c?JSON.parse(c):[];}catch(e){return [];}
  });
  useEffect(()=>{
    try{localStorage.setItem('db_cart',JSON.stringify(cart));}catch(e){}
  },[cart]);
  const [selP,   setSelP  ]=useState(null);
  const [shCart, setShCart]=useState(false);
  const [track,  setTrack ]=useState(false);
  const [wishlist, setWishlist]=useState([]);
  const [shNotif, setShNotif]=useState(false);
  const [catF,   setCatF  ]=useState('all');
  const [searchQ, setSearchQ]=useState('');
  const [themeOpen, setThemeOpen]=useState(false);
  const [payMethod, setPayMethod]=useState('cod');
  const [coupon, setCoupon]=useState('');
  const [discount, setDiscount]=useState(0);
  const [couponMsg, setCouponMsg]=useState('');
  const [isFirstOrder, setIsFirstOrder]=useState(false); // true = is customer ka pehla order hai
  const [firstDelUsed, setFirstDelUsed]=useState(false); // true = free delivery already le chuke hain
  const [showFirstPopup, setShowFirstPopup]=useState(false); // popup dikha ya nahi
  const [dbCoupons, setDbCoupons]=useState([]);
  const [dbNotifs, setDbNotifs]=useState([]);
  const [upiConfirmed, setUpiConfirmed]=useState(false);
  const [upiInitiated, setUpiInitiated]=useState('idle');
  const upiStartTime=useRef(0);
  const [showCouponPicker, setShowCouponPicker]=useState(false);
  const [points, setPoints]=useState(0);
  const [usePoints, setUsePoints]=useState(false);
  const pointsDiscount = usePoints?Math.floor(points/10):0;

  const COUPONS = {};

  const applyCoupon=async()=>{
  const code=coupon.trim().toUpperCase();
  try {
    const snap=await getDocs(collection(db,'coupons'));
    const found=snap.docs.map(d=>({...d.data()})).find(c=>c.code===code);
    if(found){
      const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
      if(found.minOrder>0&&sub<found.minOrder){
        setCouponMsg(`❌ Min order ₹${found.minOrder} chahiye`);
        setDiscount(0);
      } else {
        setDiscount(found.discount);
        setCouponMsg(`✅ ₹${found.discount} off applied!`);
      }
    } else {
      setDiscount(0);
      setCouponMsg('❌ Invalid coupon code');
    }
  } catch(e) {
    setDiscount(0);setCouponMsg('❌ Invalid coupon code');
  }
  };
  const [showAddr, setShowAddr]=useState(false);
  const [address, setAddress]=useState(null);
  const [ckStep, setCkStep]=useState(1);
  const [savedAddr, setSavedAddr]=useState(null);
  const [adIdx, setAdIdx]=useState(0);
  // Push notification listener
  useEffect(()=>{
    try{if('Notification' in window && Notification.permission==='default') Notification.requestPermission();}catch(e){}
    const uid=user?.uid||auth.currentUser?.uid;
    if(!uid) return;
    let unsub=()=>{};
    try{
      unsub=onSnapshot(collection(db,'notifications'),snap=>{
        try{
          snap.docChanges().forEach(ch=>{
            if(ch.type==='added'){
              const n=ch.doc.data();
              if((n.userId===uid||n.broadcast===true)&&!n.read){
                try{if(Notification.permission==='granted') new Notification(n.title||'Daily Basket 🛒',{body:n.body||'',icon:'/icon-192.png'});}catch(e){}
                updateDoc(doc(db,'notifications',ch.doc.id),{read:true}).catch(()=>{});
              }
            }
          });
        }catch(e){console.log('notif parse err:',e);}
      });
    }catch(e){console.log('notif listener err:',e);}
    return()=>{try{unsub();}catch(e){}};
  },[user]);

  // Sync products from Firestore live (single source of truth)
  useEffect(()=>{
    let unsub=()=>{};
    try{
    unsub=onSnapshot(collection(db,'products'),snap=>{
      const rawProds=snap.docs
        .map(d=>{
          const data={...d.data(),id:d.data().id||d.id,firestoreId:d.id};
          // Restore image from localStorage if not in Firestore
          if(!data.imgUrl){
            let localImg=null;
try { localImg=localStorage.getItem('prodImg_'+d.id); } catch(e) {}
            if(localImg) data.imgUrl=localImg;
          }
          return data;
        })
        .filter(p=>p.name&&p.active!==false);
      // Deduplicate by firestoreId to prevent duplicates showing on home
      const seenIds=new Set();
      const fsProds=rawProds.filter(p=>{const k=p.firestoreId||String(p.id);if(seenIds.has(k))return false;seenIds.add(k);return true;});
      if(fsProds.length>0) setData(d=>({...d,products:fsProds}));
    });
    }catch(e){console.log('products listener err:',e);}
    return()=>{try{unsub();}catch(e){}};
  },[]);
  const [lastOrderId, setLastOrderId]=useState(null);
  const [scrMilk, setScrMilk]=useState(false);
  const [scrBulk, setScrBulk]=useState(false);
  const [premOpen, setPremOpen]=useState(false);
  const [adSlides,setAdSlides]=useState([]);
  const [mandiRates,setMandiRates]=useState([]);

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'mandiRates'),snap=>{
      setMandiRates(snap.docs.map(d=>({...d.data(),fid:d.id})));
    },()=>{});
    return()=>unsub();
  },[]);
  const safeAdIdx=adSlides.length>0?adIdx%adSlides.length:0;
  // Load slides from Firestore - with defaults if empty
  useEffect(()=>{
    const defaultSlides=[
      {id:'d1',bg:'linear-gradient(135deg,#0D2010,#0A180A)',emoji:'🥦',chip:isHi?'🌱 इको फ्रेंडली':'🌱 Eco Friendly',title:isHi?'ताजी सब्जियां रोज':'Fresh Veggies Daily',sub:isHi?'खेत से दरवाजे तक · भोपालगढ़':'Farm to doorstep · Bhopalgarh',btn:isHi?'खरीदें':'Shop Now',link:''},
      {id:'d2',bg:'linear-gradient(135deg,#1A1000,#0A0800)',emoji:'📢',chip:isHi?'💼 यहाँ विज्ञापन दें':'💼 Advertise Here',title:isHi?'अपना व्यापार बढ़ाएं':'Grow Your Business',sub:isHi?'Daily Basket के साथ जुड़ें':'Join Daily Basket today',btn:isHi?'संपर्क करें':'Contact Us',link:'https://wa.me/916375565339'},
    ];
    const unsub=onSnapshot(collection(db,'adSlides'),snap=>{
      const fs=snap.docs.map(d=>({...d.data(),firestoreId:d.id}));
      setAdSlides(fs.length>0?fs:defaultSlides);
    },()=>{ setAdSlides(defaultSlides); });
    return()=>unsub();
  },[]);

  useEffect(()=>{const iv=setInterval(()=>setAdIdx(i=>adSlides.length>0?(i+1)%adSlides.length:0),3000);return()=>clearInterval(iv);},[adSlides.length]);
  useEffect(()=>{
    if(auth.currentUser?.uid){
      const _addrUid=user?.uid||auth.currentUser?.uid;
      if(_addrUid) getDocs(collection(db,'users',_addrUid,'addresses')).then(snap=>{
        if(!snap.empty){const a=snap.docs[snap.docs.length-1].data();if(a.full)setSavedAddr(a.full);}
      }).catch(()=>{});
    }
  },[]);

  useEffect(()=>{
    getDocs(collection(db,'coupons')).then(snap=>{
      setDbCoupons(snap.docs.map(d=>({id:d.id,...d.data()})));
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    const uid=user?.uid||auth.currentUser?.uid;
    if(!uid) return;
    import('firebase/firestore').then(({doc,getDoc})=>{
      getDoc(doc(db,'users',uid)).then(d=>{
        if(d.exists()){
          const data=d.data();
          if(data.points!=null) setPoints(data.points);
          const prevOrders=data.totalOrders||0;
          const delUsed=data.firstDelUsed===true;
          setFirstDelUsed(delUsed);
          setIsFirstOrder(prevOrders===0 && !delUsed);
        } else {
          // Naya user — pehla order eligible
          setIsFirstOrder(true);
          setFirstDelUsed(false);
        }
      }).catch(()=>{});
    });
  },[user?.uid]);

  useEffect(()=>{
    let unsub=()=>{};
    try{
      unsub=onSnapshot(collection(db,'notifications'),snap=>{
        try{
          const notifs=snap.docs.map(d=>({id:d.id,...d.data()}))
            .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
            .slice(0,20);
          setDbNotifs(notifs);
        }catch(e){}
      });
    }catch(e){console.log('notif2 err:',e);}
    return()=>{try{unsub();}catch(e){}};
  },[]);

  useEffect(()=>{
    try {
      requestNotificationPermission();
      onMessage(messaging, payload => {
        console.log('Notification:', payload);
      });
    } catch(e) {
      console.log('Messaging error:', e);
    }
  },[]);
  useEffect(()=>{
    window.history.pushState({db:'1'},'',window.location.href);
  },[]);

  useEffect(()=>{
    const onBack=()=>{
      if(showAddr){setShowAddr(false);window.history.pushState({db:'1'},'',window.location.href);return;}
      if(selP){setSelP(null);window.history.pushState({db:'1'},'',window.location.href);return;}
      if(track){setTrack(false);setScr('home');setNav('home');window.history.pushState({db:'1'},'',window.location.href);return;}
      if(shCart){setShCart(false);window.history.pushState({db:'1'},'',window.location.href);return;}
      if(scr!=='home'){setScr('home');setNav('home');window.history.pushState({db:'1'},'',window.location.href);return;}
      window.history.pushState({db:'1'},'',window.location.href);
    };
    window.addEventListener('popstate',onBack);
    return()=>window.removeEventListener('popstate',onBack);
  },[showAddr,selP,track,shCart,scr]);

  const [isPlacing,setIsPlacing]=useState(false);
  const addC=p=>setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}];});
  const remC=id=>setCart(prev=>{const it=prev.find(i=>i.id===id);return it&&it.qty>1?prev.map(i=>i.id===id?{...i,qty:i.qty-1}:i):prev.filter(i=>i.id!==id);});
  const place=async(addr)=>{
  if(isPlacing){return;} // Double click protection
  const addrData=addr||address;
  if(!addrData){alert('⚠️ Address set karo pehle!');return;}
  if(cart.length===0){alert('⚠️ Cart khali hai!');return;}
  setIsPlacing(true);
  // Use user state (works for both Firebase auth + custom OTP login)
  const uid=user?.uid||auth.currentUser?.uid;
  const userName=user?.name||auth.currentUser?.displayName||'Customer';
  const userPhone=user?.phone||auth.currentUser?.phoneNumber||'';
  // Support both object and string address
  const addrText=typeof addrData==='object'?(addrData.full||[addrData.flat,addrData.area,addrData.city].filter(Boolean).join(', ')||''):String(addrData||'');
  const addrLat=typeof addrData==='object'?addrData.lat:null;
  const addrLng=typeof addrData==='object'?addrData.lng:null;
  const mapsLink=addrLat&&addrLng?`https://maps.google.com/?q=${addrLat},${addrLng}`:(typeof addrData==='object'?addrData.mapsLink||'':'');
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const isBulk=cart.some(i=>(i.cat||'').toLowerCase().includes('bulk')||(i.name||'').toLowerCase().includes('bulk')||(i.chip||'').toLowerCase().includes('bulk'));
  const firstFree=isFirstOrder&&!firstDelUsed&&sub>=99;
  const del=isBulk?100:firstFree?0:10;
  const total=Math.max(0,sub+del-discount-(usePoints?pointsDiscount:0));
  try{
    const oRef=await addDoc(collection(db,'orders'),{
      userId:uid||'guest_'+Date.now(),
      userName,
      userPhone,
      items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price,emoji:i.emoji||'',cat:i.cat||''})),
      subtotal:sub,delivery:del,discount:discount,total,
      payMethod:payMethod,
      address:addrText,
      lat:addrLat,
      lng:addrLng,
      mapsLink,
      status:'pending',
      createdAt:serverTimestamp()
    });
    // Push notification to admin/shop - order placed
    try{
      await fetch('/api/sendpush',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'shops',title:'🛒 Naya Order!',body:`${userName} ne ₹${total} ka order kiya`})});
    }catch(ne){console.log('Push skipped:',ne);}
    const earned=Math.floor(total/10);
    const newPoints=usePoints?Math.max(0,points-(Math.floor(points/10)*10))+earned:points+earned;
    setPoints(newPoints);
    const newItemsKg=cart.reduce((s,i)=>s+(i.qty||1),0)*0.05; // har item ~50g plastic saved
    if(uid){
      try{
        const {doc:fDoc,setDoc,getDoc}=await import('firebase/firestore');
        const uSnap=await getDoc(fDoc(db,'users',uid));
        const prev=uSnap.exists()?uSnap.data():{};
        const prevEco=prev.ecoScore||0;
        const prevOrders=prev.totalOrders||0;
        await setDoc(fDoc(db,'users',uid),{
          points:newPoints,
          lastOrder:oRef.id,
          phone:userPhone,
          name:userName,
          ecoScore:parseFloat((prevEco+newItemsKg).toFixed(3)),
          totalOrders:prevOrders+1,
          // Mark first delivery used — SIRF ek baar
          ...(firstFree && {firstDelUsed:true}),
        },{merge:true});
        // Local state bhi update karo — dobara free nahi milegi
        if(firstFree){
          setFirstDelUsed(true);
          setIsFirstOrder(false);
        }
      }catch(pe){console.log('Points save err:',pe);}
    }
    setUsePoints(false);
    setLastOrderId(oRef.id);
    setCart([]);
    try{localStorage.removeItem('db_cart');}catch(e){}
    setDiscount(0);
    setCoupon('');
    setShCart(false);
    setCkStep(1);
    setTrack(true);
  }catch(e){
    console.log('Order error:',e);
    alert('❌ Order place nahi hua! Error: '+(e.message||'Internet check karo')+'. Phir try karo.');
  }finally{
    setIsPlacing(false);
  }
  };
  const goNav=n=>{setNav(n);setScr(n);setShCart(false);setSelP(null);};

  const navScrs=['home','combos','food','eco','profile'];
  const totalQ = cart.reduce((s,i)=>s+i.qty,0);
  const activeProds = (data.products||[]).filter(p=>p&&p.active&&p.name);
  const filtP = activeProds.filter(p=>{
    const matchCat = catF==='all'||p.cat===catF;
    const q = (searchQ||'').toLowerCase();
    const matchQ = !q||(p.name||'').toLowerCase().includes(q)||(p.nameHi||'').includes(q);
    return matchCat&&matchQ;
  }).slice(0,20);

  const pName=p=>isHi?p.nameHi:p.name;
  const pTag=p=>isHi?p.tagHi:p.tag;

  // ── Derived cart totals (component-level so all JSX can access them) ──
  const sub = cart.reduce((s,i)=>s+(i.price||0)*i.qty, 0);
  const isBulkCart = cart.some(i=>(i.cat||'').toLowerCase().includes('bulk')||(i.name||'').toLowerCase().includes('bulk')||(i.chip||'').toLowerCase().includes('bulk'));
  // First order free delivery (sub >= ₹99 aur pehla order ho)
  const firstOrderDelFree = isFirstOrder && !firstDelUsed && sub>=99;
  const del = isBulkCart ? 100 : firstOrderDelFree ? 0 : 10;

  const showNav = navScrs.includes(scr)&&!shCart&&!track&&!selP;
  const showFC  = cart.length>0&&navScrs.includes(scr)&&!shCart&&!track&&!selP;
  useEffect(()=>{
    if(!shCart){setCkStep(1);}
    // Cart kholne pe first order popup dikhao — sirf ek baar
    if(shCart && isFirstOrder && !firstDelUsed && !showFirstPopup){
      setTimeout(()=>setShowFirstPopup(true), 400);
    }
  },[shCart]);

  const renderScr=()=>{
    if(track) return (
      <TrackScreen onBack={()=>{setTrack(false);setScr('home');setNav('home');}} lastOrderId={lastOrderId} isHi={isHi} t={t} fam={fam}/>
    );
    if(scrMilk) return <MilkSubscriptionScreen onBack={()=>setScrMilk(false)} user={user} fam={fam}/>;
    if(scrBulk) return <BulkOrderScreen onBack={()=>setScrBulk(false)} user={user} fam={fam}/>;
    if(showAddr) return <AddressScreen onBack={()=>setShowAddr(false)} onConfirm={addrObj=>{setAddress(addrObj);setShowAddr(false);setCkStep(3);}} userId={auth.currentUser?.uid} payMethod={payMethod} isHi={isHi}/>;
    if(shCart) return (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
        <SBar/>

        {/* 🎉 FIRST ORDER FREE DELIVERY POPUP */}
        {showFirstPopup&&(
          <div style={{position:'absolute',inset:0,zIndex:999,background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{background:'linear-gradient(145deg,#060D06,#0A1A0A)',border:'1.5px solid rgba(212,175,55,.4)',borderRadius:28,padding:30,maxWidth:340,width:'100%',textAlign:'center',boxShadow:'0 0 80px rgba(212,175,55,.2)',animation:'fadeUp .4s ease'}}>
              <div style={{fontSize:52,marginBottom:12}}>🎁</div>
              <div style={{fontSize:9,fontWeight:800,color:'#D4AF37',letterSpacing:2,marginBottom:8,textTransform:'uppercase'}}>पहला ऑर्डर ऑफर</div>
              <div style={{fontSize:22,fontWeight:900,color:'#fff',marginBottom:10,lineHeight:1.3}}>
                {isHi?'पहली डिलीवरी बिल्कुल FREE! 🚴':'First Delivery Absolutely FREE! 🚴'}
              </div>
              <div style={{fontSize:13,color:'rgba(240,255,244,.5)',marginBottom:20,lineHeight:1.7}}>
                {isHi
                  ?'₹99 या उससे ज़्यादा के ऑर्डर पर पहली डिलीवरी मुफ़्त। यह ऑफर सिर्फ आपके पहले ऑर्डर पर है!'
                  :'On orders above ₹99 — your first delivery is on us! This offer is valid only on your first order.'}
              </div>
              <div style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:12,padding:'10px 16px',marginBottom:20,fontSize:12,color:'#D4AF37'}}>
                {sub>=99
                  ?<span style={{color:'#3DFF7A',fontWeight:700}}>✅ {isHi?`आपका ऑर्डर ₹${sub} का है — Free Delivery Apply!`:`Your order ₹${sub} — Free Delivery Applied!`}</span>
                  :<span>{isHi?`₹${99-sub} और जोड़ें — Free Delivery पाएं 🎯`:`Add ₹${99-sub} more for Free Delivery 🎯`}</span>
                }
              </div>
              <button onClick={()=>setShowFirstPopup(false)} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#040906',fontWeight:900,fontSize:15,borderRadius:14,border:'none',cursor:'pointer',fontFamily:fam}}>
                {isHi?'समझ गया, ऑर्डर करते हैं! 🛒':'Got it, let\'s order! 🛒'}
              </button>
            </div>
          </div>
        )}

        <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
          <BBtn onClick={()=>setShCart(false)}/>
          <div><div style={{fontSize:18,fontWeight:800}}>{t.myBasket}</div><div style={{fontSize:12,color:'var(--t3)'}}>{cart.reduce((s,i)=>s+i.qty,0)} {t.items}</div></div>
        </div>
        <div className="scr" style={{position:'relative',padding:`0 20px ${ckStep===3?'380px':'160px'}`}}>
          {cart.length===0
            ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60%',gap:14}}><div style={{fontSize:64}}>🧺</div><div style={{fontSize:18,fontWeight:700}}>{isHi?'टोकरी खाली है':'Basket is empty'}</div></div>
            :<>
              {cart.map((item,i)=>(
                <div key={`${item.id}${i}`} className="gc" style={{padding:14,display:'flex',gap:12,alignItems:'center',marginBottom:10,animation:`fadeIn .3s ease ${i*.05}s both`}}>
                  <div style={{width:52,height:52,borderRadius:14,background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,border:'1px solid rgba(61,255,122,.07)',overflow:'hidden',flexShrink:0}}>
                    {item.imgUrl ? <img src={item.imgUrl} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : item.emoji}
                  </div>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{pName(item)}</div><div style={{fontSize:12,color:'var(--t3)'}}>{item.unit} × {item.qty}</div></div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
  <div style={{fontSize:15,fontWeight:800,color:'#3DFF7A'}}>₹{item.price*item.qty}</div>
  <div style={{display:'flex',alignItems:'center',gap:8}}>
    <div onClick={()=>remC(item.id)} style={{width:28,height:28,borderRadius:8,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <Ic n="minus" s={14} c="#3DFF7A"/>
    </div>
    <span style={{fontSize:14,fontWeight:700,minWidth:20,textAlign:'center'}}>{item.qty}</span>
    <div onClick={()=>addC(item)} style={{width:28,height:28,borderRadius:8,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <Ic n="plus" s={14} c="#3DFF7A"/>
    </div>
  </div>
  </div>
                </div>
              ))}
              {(()=>{
  const tot=Math.max(0,sub+del-discount);
  return(
    <>
      {activeProds.filter(p=>!cart.find(c=>c.id===p.id)).length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--t2)'}}>🔗 {isHi?'अक्सर साथ खरीदा':'Often bought together'}</div>
          <div className="srow">
            {activeProds.filter(p=>!cart.find(c=>c.id===p.id)).slice(0,5).map(p=>(
              <div key={p.id} onClick={()=>addC(p)} style={{flexShrink:0,width:82,background:'var(--card)',border:'1px solid rgba(61,255,122,.12)',borderRadius:14,padding:'10px 8px',textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:26}}>{p.emoji}</div>
                <div style={{fontSize:10,fontWeight:600,marginTop:4,color:'var(--t)',lineHeight:1.3}}>{pName(p)}</div>
                <div style={{fontSize:11,color:'#3DFF7A',fontWeight:800,marginTop:3}}>₹{p.price}</div>
                <div style={{marginTop:5,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',borderRadius:6,padding:'3px 0',fontSize:10,fontWeight:700,color:'#0A1A0A'}}>+ Add</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.14)',borderRadius:14,padding:'12px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
        <Ic n="truck" s={16} c="#3DFF7A"/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:'#3DFF7A',fontWeight:600}}>
            {del===0&&firstOrderDelFree
              ?'🎉 पहली डिलीवरी FREE!'
              :del===0?'🎉 '+t.free
              :`🚚 Delivery: ₹${del}`}
          </div>
          {isFirstOrder&&!firstDelUsed&&sub<99&&del!==0&&(
            <div style={{fontSize:10,color:'#D4AF37',marginTop:2}}>
              💡 ₹{99-sub} aur jodo — pehli delivery FREE!
            </div>
          )}
        </div>
        {del===0&&firstOrderDelFree&&<div style={{background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#040906',fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:50,letterSpacing:.5}}>1ST ORDER</div>}
      </div>
      {(()=>{
        const sub2=cart.reduce((s,i)=>s+i.price*i.qty,0);
        const allCoupons=[
          ...dbCoupons,
          ...[]
         ];
        const unlocked=allCoupons.filter(c=>(c.minOrder||0)<=sub2);
        const locked=allCoupons.filter(c=>(c.minOrder||0)>sub2);
        return(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:'var(--t3)',fontWeight:600,marginBottom:8}}>🏷️ Available Coupons</div>
            {discount>0&&<div style={{fontSize:12,marginBottom:8,color:'#3DFF7A',fontWeight:600}}>✅ {couponMsg}</div>}
            {unlocked.map(c=>(
              <div key={c.code} onClick={()=>{setCoupon(c.code);setDiscount(c.discount);setCouponMsg(`✅ ₹${c.discount} off applied!`);}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,marginBottom:8,cursor:'pointer',border:`1.5px solid ${discount===c.discount?'rgba(61,255,122,.5)':'rgba(61,255,122,.2)'}`,background:discount===c.discount?'rgba(61,255,122,.08)':'rgba(61,255,122,.03)'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'#3DFF7A',letterSpacing:1}}>{c.code}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>₹{c.discount} off{c.minOrder>0?` · Min ₹${c.minOrder}`:''}</div>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:discount===c.discount?'#3DFF7A':'var(--t2)',padding:'4px 10px',borderRadius:50,background:discount===c.discount?'rgba(61,255,122,.15)':'rgba(255,255,255,.05)'}}>{discount===c.discount?'✓ Applied':'Apply'}</div>
              </div>
            ))}
            {locked.map(c=>(
              <div key={c.code} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,marginBottom:8,border:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.02)',opacity:.5}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'var(--t3)',letterSpacing:1}}>🔒 {c.code}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>₹{c.discount} off · Add ₹{(c.minOrder||0)-sub2} more</div>
                </div>
                <div style={{fontSize:11,color:'var(--t3)',padding:'4px 10px',borderRadius:50,background:'rgba(255,255,255,.04)'}}>Locked</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="gc" style={{padding:16,marginBottom:80}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>{t.priceDetails}</div>
        {[{l:t.subtotal,v:`₹${sub}`},{l:t.delivery,v:del===0?t.free:`₹${del}`},{l:t.ecoPackaging,v:t.included},...(discount>0?[{l:'🏷️ Discount',v:`-₹${discount}`}]:[])].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span><span style={{fontSize:13,fontWeight:600,color:r.v.includes('FREE')||r.v.includes('मुफ्त')||r.v.includes('♻️')?'#3DFF7A':'var(--t)'}}>{r.v}</span></div>
        ))}
        <div className="divr"/>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:16,fontWeight:800}}>{t.total}</span><span style={{fontSize:18,fontWeight:900,color:'#3DFF7A'}}>₹{tot}</span></div>
      </div>
    </>
  );
  })()}
            </>
          }
        </div>
        {cart.length>0&&<div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 30px',background:'rgba(7,9,7,.95)',backdropFilter:'blur(20px)'}}>
  {ckStep===1&&<>
    {savedAddr&&<div onClick={()=>{setAddress(typeof savedAddr==='object'?savedAddr:savedAddr);setCkStep(3);}} style={{padding:'10px 14px',borderRadius:12,marginBottom:10,cursor:'pointer',border:'1.5px solid rgba(61,255,122,.3)',background:'rgba(61,255,122,.06)',display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:16}}>📍</span>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:'var(--t3)'}}>Saved Address</div><div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{typeof savedAddr==='object'?(savedAddr.full||savedAddr):savedAddr}</div></div>
      <span style={{fontSize:12,color:'#3DFF7A',fontWeight:700,flexShrink:0}}>Use →</span>
    </div>}
    <button className="btn rip" onClick={()=>setShowAddr(true)} style={{width:'100%',padding:17,fontSize:16,fontFamily:fam}}>📍 Delivery Address set karo →</button>
  </>}
  {ckStep===3&&<>
    <div style={{marginBottom:12}}>
      {address&&<div style={{padding:'8px 12px',borderRadius:10,marginBottom:10,background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.2)',fontSize:12,color:'#3DFF7A'}}>
        <span style={{fontWeight:700}}>📍 Delivery: </span>
        {typeof address==='object'?address.full:address}
        {typeof address==='object'&&address.mapsLink&&<a href={address.mapsLink} target="_blank" rel="noreferrer" style={{marginLeft:8,fontSize:10,color:'#D4AF37',fontWeight:700,textDecoration:'none'}}>🗺️ Map</a>}
        <span onClick={()=>{setShowAddr(true);}} style={{color:'#D4AF37',cursor:'pointer',marginLeft:8,fontSize:11}}>Change</span>
      </div>}
      <div style={{fontSize:12,color:'var(--t3)',fontWeight:600,marginBottom:8}}>💳 Payment Method</div>
      <div style={{display:'flex',gap:8}}>
        <div onClick={()=>setPayMethod('cod')} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${payMethod==='cod'?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:payMethod==='cod'?'rgba(61,255,122,.08)':'transparent',cursor:'pointer',textAlign:'center'}}>
          <div style={{fontSize:16}}>💵</div><div style={{fontSize:11,fontWeight:600,color:payMethod==='cod'?'#3DFF7A':'var(--t3)'}}>Cash on Delivery</div>
        </div>
        <div style={{flex:1,padding:'10px',borderRadius:12,border:'1.5px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.02)',textAlign:'center',opacity:.5}}>
          <div style={{fontSize:16}}>📱</div>
          <div style={{fontSize:11,fontWeight:600,color:'var(--t3)'}}>UPI</div>
          <div style={{fontSize:9,color:'#D4AF37',fontWeight:700,marginTop:2}}>🔜 Coming Soon</div>
        </div>
      </div>
    </div>
    {payMethod==='upi'&&(
      <div style={{background:'rgba(61,255,122,.05)',border:'1px solid rgba(61,255,122,.25)',borderRadius:14,padding:14,marginBottom:10,animation:'fadeUp .3s ease both'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#3DFF7A',marginBottom:10,textAlign:'center'}}>📱 UPI App se Pay karo</div>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {[{name:'GPay',pa:'9653895714@ybl',color:'#4285F4'},{name:'PhonePe',pa:'9653895714@ybl',color:'#7B2FBE'},{name:'Paytm',pa:'9653895714@ybl',color:'#00B9F1'},{name:'BHIM',pa:'9653895714@ybl',color:'#FF6B35'}].map(app=>(
            <button key={app.name} onClick={()=>{
              const amt=Math.max(0,sub+del-discount-pointsDiscount);
              upiStartTime.current=Date.now();
              setUpiInitiated('waiting');
              setUpiConfirmed(false);
              const onVisible=()=>{
                if(document.visibilityState==='visible'){
                  document.removeEventListener('visibilitychange',onVisible);
                  // Always show manual confirm - never auto-confirm
                  setUpiInitiated('returned');
                }
              };
              document.addEventListener('visibilitychange',onVisible);
              setTimeout(()=>{ window.location.href=`upi://pay?pa=${app.pa}&pn=Daily%20Basket&am=${amt}&cu=INR&tn=Grocery%20Order`; },100);
            }} style={{flex:1,padding:'8px 2px',borderRadius:10,border:`1.5px solid ${app.color}55`,background:`${app.color}18`,color:app.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>{app.name}</button>
          ))}
        </div>
        <div style={{textAlign:'center',marginBottom:6}}>
          <div style={{fontSize:11,color:'var(--t3)',marginBottom:8}}>Ya QR scan karo:</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=9653895714@ybl%26pn=Daily%20Basket%26am=${Math.max(0,cart.reduce((s,i)=>s+i.price*i.qty,0)+(cart.reduce((s,i)=>s+i.price*i.qty,0)>299?0:25)-discount)}%26cu=INR`} alt="UPI QR" style={{borderRadius:10,border:'2px solid rgba(61,255,122,.3)',width:140,height:140}}/>
        </div>
        <div style={{fontSize:11,color:'var(--t3)',textAlign:'center',marginTop:4}}>⬆️ Pay karke niche "Place Order" dabaao</div>
      </div>
    )}
    {points>=100&&<div onClick={()=>setUsePoints(u=>!u)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,marginBottom:10,cursor:'pointer',border:`1.5px solid ${usePoints?'rgba(212,175,55,.5)':'rgba(212,175,55,.15)'}`,background:usePoints?'rgba(212,175,55,.08)':'rgba(212,175,55,.03)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>🪙</span><div><div style={{fontSize:12,fontWeight:700,color:'#D4AF37'}}>{points} Points available</div><div style={{fontSize:10,color:'var(--t3)'}}>Use to save ₹{Math.floor(points/10)}</div></div></div>
      <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${usePoints?'#D4AF37':'rgba(212,175,55,.3)'}`,background:usePoints?'#D4AF37':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#0A0800',fontWeight:800}}>{usePoints?'✓':''}</div>
    </div>}
    {payMethod==='upi'&&(
      <div style={{marginBottom:10,animation:'fadeUp .3s ease both'}}>
        {upiConfirmed?(
          <div style={{background:'rgba(61,255,122,.1)',border:'1.5px solid rgba(61,255,122,.5)',borderRadius:14,padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:26,marginBottom:6}}>✅</div>
            <div style={{fontSize:14,fontWeight:800,color:'#3DFF7A'}}>Payment Confirmed!</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>Ab "Place Order" dabao</div>
          </div>
        ):upiInitiated==='toofast'?(
          <div style={{background:'rgba(255,107,107,.08)',border:'1.5px solid rgba(255,107,107,.3)',borderRadius:14,padding:'14px',textAlign:'center',animation:'scaleIn .3s ease both'}}>
            <div style={{fontSize:22,marginBottom:6}}>⚠️</div>
            <div style={{fontSize:13,fontWeight:700,color:'#FF6B6B',marginBottom:4}}>Payment bahut jaldi complete hui!</div>
            <div style={{fontSize:11,color:'var(--t3)',marginBottom:12}}>Lagta hai UPI app mein payment complete nahi hua. Pehle payment karo phir wapas aao.</div>
            <button onClick={()=>setUpiInitiated('idle')} style={{padding:'8px 20px',borderRadius:10,background:'rgba(255,107,107,.15)',border:'1px solid rgba(255,107,107,.3)',color:'#FF6B6B',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>← Wapas UPI chuno</button>
          </div>
        ):upiInitiated==='returned'?(
          <div style={{background:'rgba(212,175,55,.08)',border:'1.5px solid rgba(212,175,55,.4)',borderRadius:14,padding:'16px',animation:'scaleIn .3s cubic-bezier(.34,1.56,.64,1) both'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#D4AF37',marginBottom:4,textAlign:'center'}}>📱 Payment ho gayi kya?</div>
            <div style={{fontSize:11,color:'var(--t3)',textAlign:'center',marginBottom:14}}>UPI app mein payment successful dikhne ke baad hi confirm karo</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setUpiConfirmed(true)} style={{flex:2,padding:'12px',borderRadius:12,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',fontWeight:800,fontSize:13,border:'none',cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>✅ Haan, Payment Successful!</button>
              <button onClick={()=>{setUpiInitiated('idle');setUpiConfirmed(false);}} style={{flex:1,padding:'12px',borderRadius:12,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.25)',color:'#FF6B6B',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>❌ Nahi</button>
            </div>
          </div>
        ):upiInitiated==='waiting'?(
          <div style={{background:'rgba(61,255,122,.04)',border:'1px solid rgba(61,255,122,.15)',borderRadius:14,padding:'14px',textAlign:'center'}}>
            <div style={{width:28,height:28,border:'3px solid rgba(61,255,122,.3)',borderTopColor:'#3DFF7A',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 10px'}}/>
            <div style={{fontSize:13,fontWeight:600,color:'#3DFF7A'}}>UPI App mein payment karo...</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4,marginBottom:10}}>Payment hone mein kam se kam 8-10 second lagte hain</div>
            <div onClick={()=>setUpiInitiated('returned')} style={{fontSize:11,color:'#D4AF37',cursor:'pointer',fontWeight:600}}>✋ Payment app se wapas aao →</div>
          </div>
        ):(
          <div style={{background:'rgba(255,255,255,.02)',border:'1px dashed rgba(61,255,122,.15)',borderRadius:14,padding:'12px',textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--t3)'}}>⬆️ Upar GPay/PhonePe/Paytm se pay karo</div>
            <div style={{fontSize:10,color:'var(--t3)',marginTop:4,opacity:.7}}>Payment ke baad automatic confirm popup aayega</div>
          </div>
        )}
      </div>
    )}
    <button className="btn rip" onClick={async()=>{
      if(!address){alert('⚠️ Pehle delivery address set karo!');return;}
      if(payMethod==='upi'&&!upiConfirmed){alert('⚠️ Pehle UPI se payment karke confirm karo!');return;}
      await place(address);
      setUpiConfirmed(false);
      setUpiInitiated('idle');
    }} style={{width:'100%',padding:17,fontSize:16,fontFamily:fam,opacity:payMethod==='upi'&&!upiConfirmed?0.5:1,transition:'opacity .2s'}}>{isPlacing?'⏳ Placing Order...':'🛍️ '+t.placeOrder+' — ₹'+Math.max(0,sub+del-discount-pointsDiscount)}</button>
  </>}
  </div>}
  </div>
    );

    if(selP) return (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
        <SBar/>
        <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}><BBtn onClick={()=>setSelP(null)}/><span style={{fontSize:17,fontWeight:800}}>{t.productDetails}</span></div>
        <div className="scr" style={{position:'relative'}}>
          <div style={{margin:'0 20px',height:220,borderRadius:24,background:'linear-gradient(135deg,#0D1F0D,#111A11)',border:'1px solid rgba(61,255,122,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:106,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 50%,rgba(61,255,122,.05),transparent 70%)'}}/>
            {selP.imgUrl
              ? <img src={selP.imgUrl} alt={selP.name} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>
              : <span style={{animation:'floatY 3s ease-in-out infinite'}}>{selP.emoji}</span>
            }
            <div className="chip" style={{position:'absolute',top:14,right:14,zIndex:2}}>{pTag(selP)}</div>
          </div>
          <ProdDetailInner prod={selP} pName={pName} pTag={pTag} t={t} fam={fam} onAdd={p=>{addC(p);setSelP(null);}} cart={cart}/>
        </div>
      </div>
    );

    // HOME
    if(scr==='home') return (
      <div style={{paddingBottom:168,fontFamily:fam}}>
        <SBar/>
        <div style={{padding:'4px 20px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:13,color:'var(--t3)',fontWeight:500}}>{t.goodMorning}, {user&&user.name&&user.name.split(' ')[0]}!</div><div style={{fontSize:22,fontWeight:800}}>Daily Basket</div></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div onClick={()=>setShNotif(n=>!n)} style={{width:40,height:40,borderRadius:12,background:shNotif?'rgba(61,255,122,.15)':'var(--glass)',backdropFilter:'blur(10px)',border:`1px solid ${shNotif?'rgba(61,255,122,.5)':'var(--gb)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative',transition:'all .2s'}}>
              <Ic n="bell" s={18} c={shNotif?'#3DFF7A':'var(--t3)'}/>
              {dbNotifs.filter(n=>!n.read).length>0&&<span style={{position:'absolute',top:5,right:5,width:9,height:9,borderRadius:'50%',background:'#FF6B6B',border:'2px solid var(--bg)'}}/>}
            </div>
            <div onClick={()=>setLang&&setLang(isHi?'en':'hi')} style={{width:40,height:40,borderRadius:12,background:'var(--glass)',backdropFilter:'blur(10px)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:13,fontWeight:800,color:isHi?'#3DFF7A':'var(--t3)',transition:'all .2s',flexDirection:'column',gap:1}}>
              <span style={{fontSize:10,lineHeight:1}}>{isHi?'अ':'A'}</span>
              <span style={{fontSize:9,color:'var(--t3)',lineHeight:1}}>{isHi?'EN':'हि'}</span>
            </div>
            <div onClick={()=>setThemeOpen(t=>!t)} style={{width:40,height:40,borderRadius:12,background:themeOpen?'rgba(61,255,122,.15)':'var(--glass)',backdropFilter:'blur(10px)',border:`1px solid ${themeOpen?'rgba(61,255,122,.5)':'var(--gb)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,transition:'all .2s'}}>🎨</div>
            <div style={{position:'relative'}}>
              <div onClick={()=>setPremOpen(p=>!p)} style={{width:40,height:40,borderRadius:12,background:premOpen?'rgba(212,175,55,.2)':'var(--glass)',backdropFilter:'blur(10px)',border:`1px solid ${premOpen?'rgba(212,175,55,.6)':'var(--gb)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,transition:'all .2s'}}>👑</div>
              {premOpen&&<div style={{position:'absolute',right:0,top:48,background:'#0D1A0D',border:'1px solid rgba(61,255,122,.2)',borderRadius:16,overflow:'hidden',zIndex:999,minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
                <div style={{padding:'8px 12px',fontSize:11,color:'var(--t3)',fontWeight:700,borderBottom:'1px solid rgba(61,255,122,.08)'}}>⭐ PREMIUM SERVICES</div>
                <div onClick={()=>{setScrMilk(true);setPremOpen(false);}} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',borderBottom:'1px solid rgba(61,255,122,.06)'}}>
                  <span style={{fontSize:24}}>🥛</span>
                  <div><div style={{fontSize:13,fontWeight:700}}>Milk Subscription</div><div style={{fontSize:11,color:'var(--t3)'}}>Fresh milk daily · ₹65/L</div></div>
                </div>
                <div onClick={()=>{setScrBulk(true);setPremOpen(false);}} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer'}}>
                  <span style={{fontSize:24}}>🎊</span>
                  <div><div style={{fontSize:13,fontWeight:700}}>Event & Bulk Order</div><div style={{fontSize:11,color:'var(--t3)'}}>Party, wedding · Min ₹500</div></div>
                </div>
              </div>}
            </div>
          </div>
        </div>
        {/* Ad Slider */}
        {adSlides.length>0&&(()=>{const visSlides=adSlides.slice(0,6);const safeIdx=visSlides.length>0?safeAdIdx%visSlides.length:0;const sl=visSlides[safeIdx]||{};return(
        <div style={{margin:'0 16px 16px',position:'relative'}}>
          <div style={{borderRadius:18,overflow:'hidden',border:'1.5px solid rgba(61,255,122,.18)',boxShadow:'0 6px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.04)'}}>
            <div onClick={()=>{try{if(sl.link==='milk')setScrMilk(true);else if(sl.link==='bulk')setScrBulk(true);else if(sl.link)window.open(sl.link,'_blank');}catch(e){}}} style={{background:sl.bg||'#0D2010',position:'relative',overflow:'hidden',paddingTop:'56.25%',cursor:'pointer',transition:'background .5s ease'}}>
              {sl.imgUrl&&sl.imgUrl!=='uploading...'
                ? <img src={sl.imgUrl} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                : <div style={{position:'absolute',right:-8,top:'50%',transform:'translateY(-50%)',fontSize:105,opacity:.14,filter:'blur(1px)',pointerEvents:'none'}}>{sl.emoji||'🛒'}</div>
              }
              <div style={{position:'absolute',inset:0,padding:'16px 18px 14px'}}>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(0,0,0,.5) 50%,transparent)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',right:40,top:-18,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,.03)',pointerEvents:'none'}}/>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{display:'inline-flex',alignItems:'center',background:'rgba(0,0,0,.42)',backdropFilter:'blur(12px)',borderRadius:50,padding:'3px 10px',marginBottom:7,border:'1px solid rgba(255,255,255,.1)'}}>
                  <span style={{fontSize:10,fontWeight:700,color:'#fff',letterSpacing:.5}}>{sl.chip||''}</span>
                </div>
                <div style={{fontSize:19,fontWeight:900,lineHeight:1.2,maxWidth:195,fontFamily:fam,color:'#fff',textShadow:'0 2px 10px rgba(0,0,0,.6)'}}>{sl.title||''}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.58)',marginTop:3,fontWeight:500}}>{sl.sub||''}</div>
                <button className="btn rip" onClick={e=>{e.stopPropagation();try{if(sl.link==='milk')setScrMilk(true);else if(sl.link==='bulk')setScrBulk(true);else if(sl.link)window.open(sl.link,'_blank');}catch(e){}}} style={{marginTop:9,padding:'6px 16px',fontSize:12,fontFamily:fam,fontWeight:800}}>{sl.btn||'Learn More'} →</button>
              </div>
              </div>
            </div>
          </div>
          {visSlides.length>1&&<div style={{display:'flex',justifyContent:'center',gap:4,marginTop:7}}>
            {visSlides.map((_,i)=><div key={i} onClick={()=>setAdIdx(i)} style={{width:i===safeIdx?18:5,height:5,borderRadius:3,background:i===safeIdx?'#3DFF7A':'rgba(61,255,122,.18)',cursor:'pointer',transition:'all .3s'}}/>)}
          </div>}
        </div>
        );})()}
        {/* Search Bar */}
  <div style={{margin:'0 20px 16px'}}>
  <div style={{background:'var(--card)',border:`1.5px solid ${searchQ?'rgba(61,255,122,.4)':'rgba(61,255,122,.08)'}`,borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
    <Ic n="search" s={18} c="#5A6A5A"/>
    <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={isHi?'सब्जी, फल खोजें…':'Search veggies, fruits…'} style={{flex:1,background:'none',border:'none',outline:'none',fontSize:14,color:'var(--t)',fontFamily:fam}} />
    {searchQ&&<div onClick={()=>setSearchQ('')} style={{fontSize:16,color:'var(--t3)',cursor:'pointer'}}>✕</div>}
  </div>
  </div>
        {/* Categories */}
        <div style={{padding:'0 20px',marginBottom:20}}>
          <div className="sh"><div className="st">{t.categories}</div></div>
          <div className="srow">
            {[{id:'all',e:'🛒',l:t.all},{id:'veg',e:'🥦',l:t.veggies},{id:'fruit',e:'🍎',l:t.fruits},{id:'milk',e:'🥛',l:t.dairy},{id:'food',e:'🍛',l:t.food}].map(c=>(
              <div key={c.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}} onClick={()=>setCatF(c.id)}>
                <div style={{width:58,height:58,borderRadius:18,background:catF===c.id?'linear-gradient(135deg,#1A3320,#0E2318)':'var(--card)',border:catF===c.id?'1.5px solid rgba(61,255,122,.4)':'1px solid rgba(61,255,122,.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,transition:'all .2s',boxShadow:catF===c.id?'0 0 16px rgba(61,255,122,.15)':'none'}}>{c.e}</div>
                <span style={{fontSize:11,color:catF===c.id?'#3DFF7A':'var(--t3)',fontWeight:600,fontFamily:fam}}>{c.l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Products */}
        <div style={{padding:'0 20px'}}>
          {/* Mandi Rate Today */}
          {mandiRates.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:800}}>🌾 {isHi?'आज के मंडी भाव':'Mandi Rate Today'}</div>
                <div style={{fontSize:10,color:'var(--t3)'}}>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
              </div>
              <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
                {mandiRates.map(r=>(
                  <div key={r.fid} style={{flexShrink:0,padding:'8px 12px',borderRadius:12,background:'rgba(61,255,122,.05)',border:'1px solid rgba(61,255,122,.15)',display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:70}}>
                    <div style={{fontSize:22}}>{r.emoji||'🥦'}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--t)',textAlign:'center'}}>{r.item}</div>
                    <div style={{fontSize:13,fontWeight:900,color:'#3DFF7A'}}>₹{r.price}</div>
                    <div style={{fontSize:9,color:'var(--t3)'}}>/{r.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="sh"><div className="st">{t.bestSellers}</div><div className="sl">{t.seeAll}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {filtP.map((p,i)=>(
              <div key={p.id} className="pc" style={{animation:`fadeUp .5s ease ${i*.05}s both`}} onClick={()=>setSelP(p)}>
                <div style={{height:100,background:'linear-gradient(135deg,#111A11,#0D160D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:50,position:'relative',overflow:'hidden'}}>
                  {p.imgUrl
                    ? <img src={p.imgUrl} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>
                    : p.emoji}
                  <div className="chip" style={{position:'absolute',top:8,left:8,fontSize:10,padding:'2px 7px',fontFamily:fam}}>{pTag(p)}</div>
                  <div onClick={e=>{e.stopPropagation();setWishlist(w=>w.includes(p.id)?w.filter(x=>x!==p.id):[...w,p.id]);}} style={{position:'absolute',top:8,right:8,fontSize:14,cursor:'pointer'}}>{wishlist.includes(p.id)?'❤️':'🤍'}</div>
                </div>
                <div style={{padding:'10px 10px 12px'}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:2,fontFamily:fam}}>{pName(p)}</div>
                  <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:4}}>
                    <span style={{fontSize:11,color:'#D4AF37'}}>★</span>
                    <span style={{fontSize:11,color:'#D4AF37',fontWeight:700}}>{p.rating||4.2}</span>
                    <span style={{fontSize:10,color:'var(--t3)'}}>({p.reviews||128})</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--t3)',marginBottom:6}}>{p.unit}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:15,fontWeight:800,color:'#3DFF7A'}}>₹{p.price}</div>
                    <AddBtn inCart={!!cart.find(c=>c.id===p.id)} onAdd={e=>{e.stopPropagation();addC(p);}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if(scr==='combos') return <CombosScr t={t} fam={fam} cart={cart} onAdd={addC} isHi={isHi}/>;
    if(scr==='food')   return <FoodScr t={t} fam={fam} isHi={isHi}/>;
    if(scr==='eco')    return <EcoScr t={t} fam={fam} isHi={isHi} user={user} points={points}/>;
    if(scr==='profile')return <ProfileScr user={user} t={t} fam={fam} lang={lang} isHi={isHi} points={points} onReorder={items=>{items.forEach(item=>{for(let k=0;k<item.qty;k++)addC(item);});setShCart(true);}}/>;
    return null;
  };

  return (
    <div style={{position:'absolute',inset:0}}>
      <div className="scr">{renderScr()}</div>
      {themeOpen&&<ThemePicker theme={theme} setTheme={setTheme} onClose={()=>setThemeOpen(false)} isHi={isHi}/>}
      {shNotif&&<div className="ovl" onClick={()=>setShNotif(false)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:18,fontWeight:800}}>{isHi?'🔔 सूचनाएं':'🔔 Notifications'}</div>
            <div onClick={()=>setShNotif(false)} style={{width:32,height:32,borderRadius:10,background:'var(--glass)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}}>✕</div>
          </div>
          {dbNotifs.length===0
            ?<div style={{textAlign:'center',padding:'30px 0'}}><div style={{fontSize:48}}>🔔</div><div style={{fontSize:14,color:'var(--t3)',marginTop:10}}>{isHi?'अभी कोई सूचना नहीं':'No notifications yet'}</div></div>
            :dbNotifs.map((n,i)=>(
              <div key={n.id} style={{padding:'12px 14px',borderRadius:14,marginBottom:8,background:n.read?'rgba(255,255,255,.02)':'rgba(61,255,122,.06)',border:`1px solid ${n.read?'rgba(255,255,255,.05)':'rgba(61,255,122,.2)'}`,animation:`fadeUp .3s ease ${i*.05}s both`}}>
                <div style={{fontSize:14,fontWeight:n.read?600:800,marginBottom:3}}>{n.title||'📢 Update'}</div>
                <div style={{fontSize:12,color:'var(--t2)',lineHeight:1.5}}>{n.body||n.message||''}</div>
                {n.createdAt?.seconds&&<div style={{fontSize:10,color:'var(--t3)',marginTop:5}}>{new Date(n.createdAt.seconds*1000).toLocaleString('en-IN')}</div>}
              </div>
            ))
          }
        </div>
      </div>}
      {showNav&&(
        <div className="bnav">
          {[{id:'home',n:'home',l:t.home},{id:'combos',n:'grid',l:t.combos},{id:'food',n:'food',l:t.food},{id:'eco',n:'leaf',l:t.eco},{id:'profile',n:'user',l:t.profile}].map(it=>(
            <div key={it.id} className={`ni ${nav===it.id?'on':''}`} onClick={()=>goNav(it.id)}>
              <div style={{position:'relative'}}>
                <Ic n={it.n} s={22} c={nav===it.id?'#3DFF7A':'#5A6A5A'}/>
                {it.id==='home'&&totalQ>0&&<span style={{position:'absolute',top:-6,right:-8,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',fontSize:9,fontWeight:800,width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',animation:'cartBump .4s ease'}}>{totalQ}</span>}
              </div>
              <span className="nl" style={{fontFamily:fam}}>{it.l}</span>
            </div>
          ))}
        </div>
      )}
      {showFC&&(
        <div className="fcart" onClick={()=>setShCart(true)} style={{cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#0A1A0A'}}>{totalQ}</div>
            <div><div style={{fontSize:13,fontWeight:700,fontFamily:fam}}>{cart.length} {t.items}</div><div style={{fontSize:11,color:'var(--t2)',fontFamily:fam}}>{t.tapCheckout}</div></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{cart.reduce((s,i)=>s+i.price*i.qty,0)}</div>
            <div style={{width:32,height:32,borderRadius:50,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="arrow" s={16} c="#0A1A0A"/></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helper: Add button */
function AddBtn({inCart, onAdd}) {
  const [b,setB]=useState(false);
  return (
    <button className="btn rip" onClick={e=>{e.stopPropagation();setB(true);setTimeout(()=>setB(false),400);onAdd(e);}} style={{width:30,height:30,padding:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:9,animation:b?'cartBump .4s ease':'none',background:inCart?'linear-gradient(135deg,#D4AF37,#B8962E)':undefined}}>
      {inCart?<Ic n="check" s={13} c="#0A1A0A"/>:<Ic n="plus" s={13} c="#0A1A0A"/>}
    </button>
  );
}

/* Product detail inner */
function ProdDetailInner({prod,pName,pTag,t,fam,onAdd,cart}) {
  const [qty,setQty]=useState(1);const [added,setAdded]=useState(false);
  const [detailTab,setDetailTab]=useState('about');
  const nut=prod.nutrition||{};
  const hasNut=nut.calories||nut.protein||nut.carbs||nut.fat||nut.fiber;
  return (
    <div style={{padding:20,fontFamily:fam}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
        <div><div style={{fontSize:24,fontWeight:800}}>{pName(prod)}</div><div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>{prod.unit}</div></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:26,fontWeight:900,color:'#3DFF7A'}}>₹{prod.price}</div></div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {['🌿 Organic','📍 Local','✨ Fresh','💚 Eco'].map(tg=><div key={tg} style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.15)',color:'#3DFF7A',fontSize:11,fontWeight:600,padding:'5px 10px',borderRadius:50}}>{tg}</div>)}
      </div>
      <div className="divr"/>
      {/* Detail Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[{id:'about',l:'📋 About'},{id:'nutrition',l:'🥗 Nutrition'}].map(tab=>(
          <div key={tab.id} onClick={()=>setDetailTab(tab.id)} style={{padding:'6px 14px',borderRadius:50,fontSize:12,fontWeight:700,cursor:'pointer',border:`1.5px solid ${detailTab===tab.id?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:detailTab===tab.id?'rgba(61,255,122,.1)':'transparent',color:detailTab===tab.id?'#3DFF7A':'var(--t3)',transition:'all .2s'}}>{tab.l}</div>
        ))}
      </div>
      {detailTab==='about'&&(
        <div style={{marginBottom:20}}><div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7}}>{prod.about||`Farm-fresh ${pName(prod).toLowerCase()} from local farmers in Bhopalgarh. Delivered within 24 hours.`}</div></div>
      )}
      {detailTab==='nutrition'&&(
        <div style={{marginBottom:20}}>
          {hasNut?(
            <div className="gc" style={{padding:16}}>
              <div style={{fontSize:12,color:'var(--t3)',fontWeight:700,marginBottom:12,letterSpacing:.8}}>PER 100g / SERVING</div>
              {[
                {l:'🔥 Calories',v:nut.calories,u:'kcal',c:'#FF8C42'},
                {l:'💪 Protein',v:nut.protein,u:'g',c:'#3DFF7A'},
                {l:'🌾 Carbs',v:nut.carbs,u:'g',c:'#D4AF37'},
                {l:'🥑 Fat',v:nut.fat,u:'g',c:'#FF6B6B'},
                {l:'🌿 Fiber',v:nut.fiber,u:'g',c:'#00C44F'},
              ].filter(r=>r.v!=null&&r.v!=='').map(r=>(
                <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span>
                  <span style={{fontSize:14,fontWeight:800,color:r.c}}>{String(r.v).replace(/[^\d.]/g,'')} <span style={{fontSize:11,fontWeight:500,color:'var(--t3)'}}>{r.u}</span></span>
                </div>
              ))}
              {nut.note&&<div style={{fontSize:11,color:'var(--t3)',marginTop:8,borderTop:'1px solid rgba(61,255,122,.08)',paddingTop:8}}>📝 {nut.note}</div>}
            </div>
          ):(
            <div style={{textAlign:'center',padding:'30px 0',color:'var(--t3)'}}>
              <div style={{fontSize:32,marginBottom:8}}>🥗</div>
              <div style={{fontSize:13}}>Nutrition info available nahi hai</div>
            </div>
          )}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{fontSize:15,fontWeight:700}}>{t.quantity}</div>
        <div style={{display:'flex',alignItems:'center',gap:14,background:'var(--card)',borderRadius:14,padding:'4px 6px',border:'1px solid rgba(61,255,122,.1)'}}>
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:32,height:32,borderRadius:10,border:'none',cursor:'pointer',background:qty>1?'linear-gradient(135deg,#1A3320,#0E2318)':'var(--card)',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="minus" s={16} c={qty>1?'#3DFF7A':'#3A4A3A'}/></button>
          <span style={{fontSize:18,fontWeight:800,minWidth:24,textAlign:'center'}}>{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} style={{width:32,height:32,borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="plus" s={16} c="#0A1A0A"/></button>
        </div>
      </div>
      <button className="btn rip" onClick={()=>{for(let i=0;i<qty;i++)onAdd(prod);setAdded(true);setTimeout(()=>setAdded(false),2000);}} style={{width:'100%',padding:17,fontSize:16,fontFamily:fam,background:added?'linear-gradient(135deg,#D4AF37,#B8962E)':undefined}}>
        {added?t.addedToCart:`🧺 ${t.addToCart} — ₹${prod.price*qty}`}
      </button>
</div>
  );
}
function CombosScr({t,fam,cart,onAdd,isHi}) {
  const C=[
    {id:'C1',name:'Morning Boost',nameHi:'मॉर्निंग बूस्ट', desc:'Milk+Fruits+Curd',descHi:'दूध+फल+दही',price:149,orig:199,emoji:'🌅',tag:'Best Value',tagHi:'सर्वोत्तम',items:['🥛','🍎','🍶'],unit:'1 combo'},
    {id:'C2',name:'Veggie Pack',  nameHi:'सब्जी पैक',      desc:'5 Fresh Vegetables',descHi:'5 ताजी सब्जियां',price:89,orig:130,emoji:'🥗',tag:'Family Fav',tagHi:'परिवार पसंद',items:['🍅','🥬','🥕','🧅'],unit:'1 combo'},
    {id:'C3',name:'Dinner Special',nameHi:'डिनर स्पेशल',   desc:'Dal+Rice+Roti',descHi:'दाल+चावल+रोटी',price:129,orig:175,emoji:'🍽️',tag:"Chef's Pick",tagHi:'शेफ की पसंद',items:['🥘','🍚','🫓'],unit:'1 combo'},
    {id:'C4',name:'Weekly Pack',  nameHi:'वीकली पैक',      desc:'Complete home pack',descHi:'पूरा होम पैक',price:399,orig:550,emoji:'🧺',tag:'Best Deal',tagHi:'बेस्ट डील',items:['🥛','🍎','🍅','🥬'],unit:'1 combo'},
  ];
  return (
    <div style={{paddingBottom:168,fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'8px 20px 14px'}}><div style={{fontSize:22,fontWeight:800}}>{t.smartCombos}</div><div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>{isHi?'क्यूरेटेड बंडल · सर्वोत्तम मूल्य':'Curated bundles · Best value'}</div></div>
      <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:13}}>
        {C.map((c,i)=>{
          const inCart=cart.find(x=>x.id===c.id);
          const disc=Math.round((1-c.price/c.orig)*100);
          return(
            <div key={c.id} className="gc" style={{padding:16,display:'flex',gap:14,alignItems:'center',animation:`fadeUp .5s ease ${i*.08}s both`}}>
              <div style={{width:70,height:70,borderRadius:16,flexShrink:0,background:'linear-gradient(135deg,#111A11,#0D160D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,border:'1px solid rgba(61,255,122,.08)'}}>{c.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <div style={{fontSize:15,fontWeight:700}}>{isHi?c.nameHi:c.name}</div>
                  <span style={{background:'rgba(212,175,55,.14)',border:'1px solid rgba(212,175,55,.3)',color:'#D4AF37',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:50}}>{isHi?c.tagHi:c.tag}</span>
                </div>
                <div style={{fontSize:12,color:'var(--t3)',marginBottom:5}}>{isHi?c.descHi:c.desc}</div>
                <div style={{display:'flex',gap:3,marginBottom:8}}>{c.items.map((it,j)=><span key={j} style={{fontSize:14}}>{it}</span>)}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                    <span style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{c.price}</span>
                    <span style={{fontSize:12,color:'var(--t3)',textDecoration:'line-through'}}>₹{c.orig}</span>
                    <span style={{fontSize:11,color:'#3DFF7A',fontWeight:700}}>{disc}%</span>
                  </div>
                  <button className="btn rip" onClick={()=>onAdd(c)} style={{padding:'7px 16px',fontSize:12,fontFamily:fam,background:inCart?'linear-gradient(135deg,#D4AF37,#B8962E)':undefined,color:inCart?'#0A1A0A':undefined}}>{inCart?'✓':isHi?'जोड़ें':'Add'}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodScr({t,fam,isHi}) {
  const [shops,setShops]=useState([]);
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'shops'),snap=>{
      const s=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.active!==false&&s.name);
      setShops(s);
    });
    return()=>unsub();
  },[]);

  return (
    <div style={{paddingBottom:168,fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'8px 20px 14px'}}><div style={{fontSize:22,fontWeight:800}}>{t.foodDelivery}</div><div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>{t.hotMeals}</div></div>
      <div style={{padding:'0 20px',marginBottom:18}}><div style={{background:'var(--card)',border:'1px solid rgba(61,255,122,.08)',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}><Ic n="search" s={18} c="#5A6A5A"/><span style={{fontSize:14,color:'#3A4A3A'}}>{isHi?'रेस्तरां खोजें…':'Search restaurants…'}</span></div></div>
      <div style={{padding:'0 20px',marginBottom:18}}>
        <div className="sh"><div className="st">{t.browseBy}</div></div>
        <div className="srow">
          {[{e:'🍕',l:'Pizza',lh:'पिज्जा'},{e:'🥗',l:'Salads',lh:'सलाद'},{e:'🍛',l:'Indian',lh:'भारतीय'},{e:'🧁',l:'Bakery',lh:'बेकरी'},{e:'🥪',l:'Snacks',lh:'स्नैक्स'},{e:'☕',l:'Coffee',lh:'कॉफी'}].map(c=>(
            <div key={c.l} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
              <div style={{width:60,height:60,borderRadius:18,background:'var(--card)',border:'1px solid rgba(61,255,122,.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{c.e}</div>
              <span style={{fontSize:11,color:'var(--t3)',fontWeight:600}}>{isHi?c.lh:c.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'0 20px'}}>
        <div className="sh"><div className="st">{t.nearYou}</div><div className="sl">{t.viewAll}</div></div>
        {shops.length===0&&(
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
            <div style={{fontSize:40,marginBottom:10}}>🍽️</div>
            <div style={{fontSize:14,fontWeight:600}}>{isHi?'अभी कोई रेस्तरां उपलब्ध नहीं':'No restaurants available yet'}</div>
            <div style={{fontSize:12,marginTop:6,opacity:.6}}>{isHi?'जल्द ही आएंगे!':'Coming soon!'}</div>
          </div>
        )}
        {shops.map((r,i)=>(
          <div key={r.id} className="gc" style={{padding:0,marginBottom:12,cursor:'pointer',animation:`fadeUp .5s ease ${i*.1}s both`,overflow:'hidden',borderRadius:18}}>
            {/* Shop banner image */}
            {r.imgUrl&&<div style={{height:110,overflow:'hidden',position:'relative'}}>
              <img src={r.imgUrl} alt={r.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 50%,rgba(0,0,0,.6))'}}/>
              {r.badge&&<span style={{position:'absolute',top:10,left:10,background:'rgba(61,255,122,.9)',color:'#0A1A0A',fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:20}}>{r.badge}</span>}
            </div>}
            <div style={{padding:'14px 16px',display:'flex',gap:14,alignItems:'center'}}>
              {!r.imgUrl&&<div style={{width:68,height:68,borderRadius:18,flexShrink:0,background:'linear-gradient(135deg,#111A11,#0D160D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,border:'1px solid rgba(61,255,122,.08)'}}>{r.emoji||'🏪'}</div>}
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <div style={{fontSize:15,fontWeight:700}}>{isHi?r.nameHi||r.name:r.name}</div>
                  {r.badge&&!r.imgUrl&&<span style={{background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:50}}>{r.badge}</span>}
                </div>
                <div style={{fontSize:12,color:'var(--t3)',marginBottom:5}}>{r.cuisine||r.cuisineType||'Restaurant'}</div>
                <div style={{display:'flex',gap:12}}>
                  {r.rating&&<span style={{fontSize:12,color:'#D4AF37',fontWeight:600}}>★ {r.rating}</span>}
                  {r.deliveryTime&&<span style={{fontSize:12,color:'var(--t3)'}}>🕐 {r.deliveryTime}</span>}
                  <span style={{fontSize:12,color:'#3DFF7A'}}>{t.freeDelivery}</span>
                </div>
              </div>
              <Ic n="arrow" s={18} c="#5A6A5A"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EcoScr({t,fam,isHi,user,points=0}) {
  const [orders,setOrders]=useState([]);
  const [anim,setAnim]=useState(false);
  const [leaderboard,setLeaderboard]=useState([]);
  const [firestoreEco,setFirestoreEco]=useState(null);
  const canvasRef=useRef(null);
  const animRef=useRef(null);
  const hour=new Date().getHours();
  const month=new Date().getMonth();
  const isDay=hour>=6&&hour<18;
  const isNight=hour>=20||hour<5;
  const isDusk=!isDay&&!isNight;
  const season=month>=2&&month<=4?'spring':month>=5&&month<=6?'summer':month>=7&&month<=9?'monsoon':'winter';

  useEffect(()=>{
    const uid=user?.uid;
    if(!uid) return;
    // Real-time ecoScore from Firestore
    const unsubUser=onSnapshot(doc(db,'users',uid),snap=>{
      if(snap.exists()) setFirestoreEco(snap.data().ecoScore||null);
    },()=>{});
    const q2=query(collection(db,'orders'),where('userId','==',uid));
    getDocs(q2).then(snap=>{ setOrders(snap.docs.map(d=>({id:d.id,...d.data()}))); }).catch(()=>{});
    getDocs(collection(db,'users')).then(snap=>{
      const users=snap.docs.map(d=>({...d.data(),uid:d.id})).filter(u=>u.ecoScore>0).sort((a,b)=>(b.ecoScore||0)-(a.ecoScore||0)).slice(0,5);
      setLeaderboard(users);
    }).catch(()=>{});
    setTimeout(()=>setAnim(true),300);
    return()=>unsubUser();
  },[user?.uid]);

  const orderCount=orders.length;
  const totalItems=orders.reduce((s,o)=>s+(o.items||[]).reduce((a,i)=>a+(i.qty||1),0),0);
  // Use Firestore ecoScore if available (most accurate), else calculate
  const calcKg=parseFloat((totalItems*0.05).toFixed(3));
  const pointsBonus=parseFloat((points*0.002).toFixed(3)); // 100 points = 0.2 kg bonus
  const totalKg=firestoreEco!=null?parseFloat((firestoreEco+pointsBonus).toFixed(2)):parseFloat((calcKg+pointsBonus).toFixed(2));
  const bags=Math.floor(totalKg/0.05);
  const co2=parseFloat((totalKg*0.74).toFixed(2));
  const trees=parseFloat((totalKg*0.12).toFixed(2));

  const ranks=[
    {name:'Seedling',nameHi:'अंकुर',emoji:'🌱',min:0,max:1,color:'#8BC34A'},
    {name:'Sapling',nameHi:'पौधा',emoji:'🌿',min:1,max:5,color:'#4CAF50'},
    {name:'Green Leaf',nameHi:'हरी पत्ती',emoji:'🍃',min:5,max:15,color:'#3DFF7A'},
    {name:'Tree Guardian',nameHi:'वृक्ष रक्षक',emoji:'🌳',min:15,max:50,color:'#00C44F'},
    {name:'Eco Champion',nameHi:'इको चैंपियन',emoji:'🏆',min:50,max:999,color:'#D4AF37'},
  ];
  const rank=ranks.find(r=>totalKg>=r.min&&totalKg<r.max)||ranks[0];
  const nextRank=ranks[ranks.indexOf(rank)+1];
  const progress=nextRank?Math.min(100,((totalKg-rank.min)/(nextRank.min-rank.min))*100):100;

  // Canvas cinematic scene
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const DPR=window.devicePixelRatio||1;
    const cw=canvas.offsetWidth;
    const ch=canvas.offsetHeight;
    canvas.width=cw*DPR;
    canvas.height=ch*DPR;
    ctx.scale(DPR,DPR);
    const W=cw, H=ch;
    let frame=0;

    // Particles
    const particles=[];
    const PC=season==='monsoon'?110:isNight?55:30;
    for(let i=0;i<PC;i++) particles.push({
      x:Math.random()*W, y:Math.random()*H,
      vx:season==='monsoon'?0.4+Math.random()*0.3:Math.random()*0.4-0.2,
      vy:season==='monsoon'?3+Math.random()*2:isNight?-0.4-Math.random()*0.3:0.4+Math.random()*0.4,
      size:Math.random()*2+0.5, alpha:Math.random()*0.6+0.2, life:Math.random()*Math.PI*2
    });

    // Grass blades
    const blades=[];
    for(let i=0;i<90;i++) blades.push({x:Math.random()*W,h:6+Math.random()*16,phase:Math.random()*Math.PI*2,spd:0.8+Math.random()*0.7});

    // Trees — number based on orders
    const treeN=Math.min(7,1+Math.floor(orderCount/2));
    const treeArr=[];
    for(let i=0;i<treeN;i++) treeArr.push({
      x:25+(i/(Math.max(treeN-1,1)))*(W-50),
      th:28+Math.random()*32, cr:10+Math.random()*14,
      far:i%3===0, sway:Math.random()*Math.PI*2
    });

    const sky=()=>{
      const g=ctx.createLinearGradient(0,0,0,H*0.68);
      if(isNight){g.addColorStop(0,'#020810');g.addColorStop(0.5,'#06102A');g.addColorStop(1,'#0A1A0A');}
      else if(isDusk){g.addColorStop(0,'#15052A');g.addColorStop(0.3,'#7A1E50');g.addColorStop(0.65,'#E8572A');g.addColorStop(1,'#F0A030');}
      else if(season==='monsoon'){g.addColorStop(0,'#121E2E');g.addColorStop(0.5,'#233A52');g.addColorStop(1,'#3A5C42');}
      else if(season==='winter'){g.addColorStop(0,'#1C2840');g.addColorStop(0.5,'#3A567A');g.addColorStop(1,'#6A8898');}
      else{g.addColorStop(0,'#060E28');g.addColorStop(0.4,'#103868');g.addColorStop(1,'#1A5A38');}
      return g;
    };

    const drawScene=()=>{
      ctx.clearRect(0,0,W,H);
      // Sky
      ctx.fillStyle=sky(); ctx.fillRect(0,0,W,H*0.68);

      // Stars
      if(isNight||isDusk){
        for(let i=0;i<(isNight?90:25);i++){
          const sx=((i*137.5)%W); const sy=((i*89.3)%(H*0.5));
          const tw=0.2+0.8*Math.abs(Math.sin(frame*0.04+i));
          ctx.beginPath(); ctx.arc(sx,sy,i%7===0?1.4:0.7,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,255,255,${tw*(isNight?0.9:0.4)})`; ctx.fill();
        }
      }

      // Sun
      if(isDay){
        const sx=W*0.78, sy=H*0.11;
        for(let i=0;i<10;i++){
          const ang=i/10*Math.PI*2+frame*0.004;
          const rg=ctx.createLinearGradient(sx,sy,sx+Math.cos(ang)*50,sy+Math.sin(ang)*50);
          rg.addColorStop(0,'rgba(255,220,60,0.22)'); rg.addColorStop(1,'rgba(255,200,0,0)');
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.cos(ang)*50,sy+Math.sin(ang)*50);
          ctx.strokeStyle=rg; ctx.lineWidth=5; ctx.stroke();
        }
        const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,48);
        sg.addColorStop(0,'rgba(255,235,80,0.95)'); sg.addColorStop(0.4,'rgba(255,170,30,0.45)'); sg.addColorStop(1,'rgba(255,120,0,0)');
        ctx.beginPath(); ctx.arc(sx,sy,48,0,Math.PI*2); ctx.fillStyle=sg; ctx.fill();
        ctx.beginPath(); ctx.arc(sx,sy,13,0,Math.PI*2); ctx.fillStyle='#FFFCE0'; ctx.fill();
      }

      // Moon
      if(isNight){
        const mx=W*0.77, my=H*0.1;
        const mg=ctx.createRadialGradient(mx,my,0,mx,my,20);
        mg.addColorStop(0,'#FFFDE0'); mg.addColorStop(0.65,'#FFF5B0'); mg.addColorStop(1,'rgba(255,245,150,0)');
        ctx.beginPath(); ctx.arc(mx,my,20,0,Math.PI*2); ctx.fillStyle=mg; ctx.fill();
        ctx.beginPath(); ctx.arc(mx+7,my-2,16,0,Math.PI*2); ctx.fillStyle='#06102A'; ctx.fill();
        // Moon glow
        const mGlow=ctx.createRadialGradient(mx,my,0,mx,my,55);
        mGlow.addColorStop(0,'rgba(200,230,255,0.1)'); mGlow.addColorStop(1,'rgba(200,230,255,0)');
        ctx.beginPath(); ctx.arc(mx,my,55,0,Math.PI*2); ctx.fillStyle=mGlow; ctx.fill();
      }

      // Clouds
      if(!isNight){
        const cc=season==='monsoon'?'rgba(40,55,90,':'rgba(255,255,255,';
        [{x:W*0.12+Math.sin(frame*0.007)*18,y:H*0.16,r:20,a:0.5},{x:W*0.52+Math.cos(frame*0.005)*22,y:H*0.1,r:27,a:0.4},{x:W*0.8+Math.sin(frame*0.006)*14,y:H*0.19,r:16,a:0.45}].forEach(c=>{
          ctx.beginPath();
          ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
          ctx.arc(c.x+c.r*0.8,c.y-c.r*0.3,c.r*0.7,0,Math.PI*2);
          ctx.arc(c.x-c.r*0.55,c.y-c.r*0.2,c.r*0.55,0,Math.PI*2);
          ctx.fillStyle=cc+c.a+')'; ctx.fill();
        });
      }

      // Far mountains
      ctx.beginPath(); ctx.moveTo(0,H*0.58);
      [[0,0.58],[0.1,0.33],[0.22,0.46],[0.34,0.27],[0.46,0.38],[0.58,0.24],[0.7,0.41],[0.82,0.3],[0.92,0.47],[1,0.58]].forEach(([x,y])=>ctx.lineTo(x*W,y*H));
      ctx.lineTo(W,H*0.58); ctx.closePath();
      const mg=ctx.createLinearGradient(0,H*0.24,0,H*0.58);
      mg.addColorStop(0,isNight?'#040E04':'#0A1E0A'); mg.addColorStop(1,isNight?'#0A1E0A':'#142A14');
      ctx.fillStyle=mg; ctx.fill();

      // Near hills
      ctx.beginPath(); ctx.moveTo(0,H*0.68);
      [[0,0.68],[0.14,0.53],[0.28,0.62],[0.48,0.49],[0.68,0.59],[0.84,0.51],[1,0.68]].forEach(([x,y])=>ctx.lineTo(x*W,y*H));
      ctx.lineTo(W,H*0.68); ctx.closePath();
      const hg=ctx.createLinearGradient(0,H*0.49,0,H*0.68);
      hg.addColorStop(0,isNight?'#071A07':'#0D2A0D'); hg.addColorStop(1,isNight?'#040D04':'#081808');
      ctx.fillStyle=hg; ctx.fill();

      // Ground
      const gg=ctx.createLinearGradient(0,H*0.68,0,H);
      if(isNight){gg.addColorStop(0,'#061006');gg.addColorStop(1,'#030803');}
      else if(season==='monsoon'){gg.addColorStop(0,'#174017');gg.addColorStop(1,'#0A240A');}
      else{gg.addColorStop(0,'#164016');gg.addColorStop(1,'#0A220A');}
      ctx.fillStyle=gg; ctx.fillRect(0,H*0.68,W,H);

      // Ground rim glow
      const rimG=ctx.createLinearGradient(0,H*0.68,0,H*0.74);
      rimG.addColorStop(0,isNight?'rgba(20,70,20,0.6)':'rgba(30,110,30,0.55)');
      rimG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rimG; ctx.fillRect(0,H*0.68,W,H*0.08);

      // Grass blades
      blades.forEach(b=>{
        const sw=Math.sin(frame*0.038*b.spd+b.phase)*3.5;
        ctx.beginPath(); ctx.moveTo(b.x,H*0.72);
        ctx.quadraticCurveTo(b.x+sw,H*0.72-b.h*0.5,b.x+sw*1.6,H*0.72-b.h);
        ctx.strokeStyle=isNight?'rgba(15,60,15,0.8)':'rgba(25,90,25,0.75)';
        ctx.lineWidth=1.3; ctx.globalAlpha=0.75; ctx.stroke(); ctx.globalAlpha=1;
      });

      // Trees (SVG-style CSS drawn)
      [...treeArr].sort((a,b)=>a.far?-1:1).forEach(tr=>{
        const sw=Math.sin(frame*0.022+tr.sway)*2.8;
        const bY=H*0.68;
        const tH=tr.th*(tr.far?0.6:1);
        // Trunk
        const tg=ctx.createLinearGradient(tr.x,bY-tH,tr.x,bY);
        tg.addColorStop(0,'#1E0F05'); tg.addColorStop(1,'#120804');
        ctx.beginPath();
        ctx.moveTo(tr.x-2.5*(tr.far?0.6:1),bY);
        ctx.quadraticCurveTo(tr.x+sw*0.25,bY-tH*0.5,tr.x+sw*0.7,bY-tH);
        ctx.quadraticCurveTo(tr.x+sw*0.7+2.5*(tr.far?0.6:1),bY-tH*0.5,tr.x+2.5*(tr.far?0.6:1),bY);
        ctx.fillStyle=tg; ctx.fill();
        // Canopy (3 layers)
        const fc=isNight?(tr.far?'rgba(4,16,4,':'rgba(8,24,8,'):season==='winter'?(tr.far?'rgba(16,28,16,':'rgba(22,38,22,'):(tr.far?'rgba(8,34,8,':'rgba(14,52,14,');
        [1,0.78,0.55].forEach((sc,li)=>{
          const ly=bY-tH-(li*tr.cr*0.48);
          const lr=tr.cr*sc*(tr.far?0.65:1);
          const cg=ctx.createRadialGradient(tr.x+sw,ly,0,tr.x+sw,ly,lr);
          cg.addColorStop(0,fc+(tr.far?0.85:0.92)+')');
          cg.addColorStop(0.65,fc+(tr.far?0.55:0.72)+')');
          cg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(tr.x+sw,ly,lr,0,Math.PI*2);
          ctx.fillStyle=cg; ctx.fill();
        });
        // Leaf shimmer
        if(!isNight&&!tr.far){
          const shimmer=0.15+0.15*Math.sin(frame*0.08+tr.sway);
          const sg=ctx.createRadialGradient(tr.x+sw-tr.cr*0.3,bY-tH-tr.cr*0.2,0,tr.x+sw,bY-tH,tr.cr*0.8);
          sg.addColorStop(0,`rgba(100,200,80,${shimmer})`); sg.addColorStop(1,'rgba(100,200,80,0)');
          ctx.beginPath(); ctx.arc(tr.x+sw,bY-tH,tr.cr*0.8,0,Math.PI*2);
          ctx.fillStyle=sg; ctx.fill();
        }
      });

      // Particles
      particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.life+=0.02;
        if(p.y>H||p.y<0||p.x<-5||p.x>W+5){
          p.x=Math.random()*W; p.y=season==='monsoon'?-8:H*0.68+Math.random()*H*0.28; p.life=0;
        }
        if(season==='monsoon'){
          // Rain
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+p.vx*3,p.y+9);
          ctx.strokeStyle=`rgba(140,195,255,${p.alpha*0.65})`; ctx.lineWidth=p.size*0.65; ctx.stroke();
        } else if(isNight){
          // Fireflies
          const pulse=0.35+0.65*Math.abs(Math.sin(p.life*2.5+p.x*0.01));
          const fg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*5);
          fg.addColorStop(0,`rgba(80,255,130,${pulse*0.9})`);
          fg.addColorStop(0.5,`rgba(60,200,100,${pulse*0.4})`);
          fg.addColorStop(1,'rgba(60,200,100,0)');
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*5,0,Math.PI*2); ctx.fillStyle=fg; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.8,0,Math.PI*2);
          ctx.fillStyle=`rgba(200,255,200,${pulse})`; ctx.fill();
        } else {
          // Pollen/dust motes
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,235,150,${p.alpha*0.28})`; ctx.fill();
        }
      });

      // Fog (monsoon/dusk)
      if(season==='monsoon'||isDusk){
        const fogG=ctx.createLinearGradient(0,H*0.52,0,H*0.74);
        fogG.addColorStop(0,'rgba(255,255,255,0)');
        fogG.addColorStop(0.5,`rgba(180,210,255,${season==='monsoon'?0.07:0.04})`);
        fogG.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=fogG; ctx.fillRect(0,H*0.52,W,H*0.28);
      }

      // Light rays (day/dusk)
      if((isDay||isDusk)&&frame%2===0){
        const lx=isDay?W*0.78:W*0.5;
        for(let i=0;i<5;i++){
          const ang=-Math.PI*0.5+(-0.4+i*0.2)+Math.sin(frame*0.01)*0.05;
          const rg=ctx.createLinearGradient(lx,0,lx+Math.cos(ang)*H,Math.sin(ang)*H);
          rg.addColorStop(0,`rgba(255,220,80,${0.04+i*0.006})`);
          rg.addColorStop(1,'rgba(255,200,50,0)');
          ctx.beginPath(); ctx.moveTo(lx,0);
          ctx.lineTo(lx+Math.cos(ang-0.06)*H,Math.sin(ang-0.06)*H);
          ctx.lineTo(lx+Math.cos(ang+0.06)*H,Math.sin(ang+0.06)*H);
          ctx.closePath(); ctx.fillStyle=rg; ctx.fill();
        }
      }

      // Cinematic vignette
      const vig=ctx.createRadialGradient(W*0.5,H*0.5,H*0.18,W*0.5,H*0.5,H*0.95);
      vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.72)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

      // Letterbox bars (cinematic)
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H*0.04); ctx.fillRect(0,H*0.96,W,H*0.04);

      frame++;
      animRef.current=requestAnimationFrame(drawScene);
    };

    drawScene();
    return()=>{ if(animRef.current) cancelAnimationFrame(animRef.current); };
  },[orderCount,isNight,isDusk,season]);

  const seasonLabel={spring:isHi?'🌸 बसंत':'🌸 Spring',summer:isHi?'☀️ गर्मी':'☀️ Summer',monsoon:isHi?'🌧️ बरसात':'🌧️ Monsoon',winter:isHi?'❄️ सर्दी':'❄️ Winter'};

  return(
    <div style={{paddingBottom:100,fontFamily:fam,background:'#030D03',minHeight:'100%'}}>
      <SBar/>
      <div style={{padding:'8px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:2,position:'relative'}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{isHi?'🌱 मेरा बगीचा':'🌱 My Garden'}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.38)',marginTop:1}}>{seasonLabel[season]} · {isNight?'🌙 Raat':isDusk?'🌅 Sandhya':'☀️ Din'}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{background:'rgba(61,255,122,.07)',border:'1px solid rgba(61,255,122,.18)',borderRadius:12,padding:'6px 12px',fontSize:11,fontWeight:700,color:'#3DFF7A'}}>{orderCount} {isHi?'ऑर्डर':'Orders'}</div>
          <div style={{background:'rgba(0,0,0,.35)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'6px 10px',fontSize:14}}>{rank.emoji}</div>
        </div>
      </div>

      {/* CINEMATIC CANVAS */}
      <div style={{margin:'12px 16px 0',borderRadius:22,overflow:'hidden',position:'relative',height:248,border:'1px solid rgba(255,255,255,.05)',boxShadow:'0 24px 72px rgba(0,0,0,.85)'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block'}}/>
        <div style={{position:'absolute',bottom:10,left:12,background:'rgba(0,0,0,.55)',backdropFilter:'blur(14px)',borderRadius:10,padding:'5px 11px',display:'flex',alignItems:'center',gap:5}}>
          <span style={{fontSize:12}}>{rank.emoji}</span>
          <span style={{fontSize:10,fontWeight:700,color:'#3DFF7A'}}>{isHi?rank.nameHi:rank.name}</span>
        </div>
        <div style={{position:'absolute',bottom:10,right:12,background:'rgba(0,0,0,.55)',backdropFilter:'blur(14px)',borderRadius:10,padding:'5px 9px',fontSize:10,color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:4}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#3DFF7A',animation:'statusP 1.5s infinite'}}/>LIVE
        </div>
        {orderCount===0&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.28)',backdropFilter:'blur(3px)'}}>
            <div style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:34,marginBottom:8,animation:'float 2.5s ease-in-out infinite'}}>🌱</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.75)',fontWeight:600,lineHeight:1.5}}>{isHi?'पहला ऑर्डर दो और\nबगीचा शुरू करो!':'Place first order to\ngrow your garden!'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{margin:'12px 16px 0',padding:'13px 16px',background:'rgba(61,255,122,.025)',border:'1px solid rgba(61,255,122,.07)',borderRadius:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
          <span style={{fontSize:12,fontWeight:700,color:rank.color}}>{rank.emoji} {isHi?rank.nameHi:rank.name}</span>
          {nextRank&&<span style={{fontSize:11,color:'var(--t3)'}}>{nextRank.emoji} {isHi?nextRank.nameHi:nextRank.name}</span>}
        </div>
        <div style={{height:7,background:'rgba(255,255,255,.04)',borderRadius:99,overflow:'hidden'}}>
          <div style={{height:'100%',width:anim?`${progress}%`:'0%',background:`linear-gradient(90deg,${rank.color},#D4AF37)`,borderRadius:99,transition:'width 2s cubic-bezier(.25,.46,.45,.94)',boxShadow:`0 0 12px ${rank.color}77`}}/>
        </div>
        {nextRank?<div style={{fontSize:10,color:'var(--t3)',marginTop:4,textAlign:'right'}}>{isHi?`${(nextRank.min-totalKg).toFixed(2)} kg aur chaiye`:`${(nextRank.min-totalKg).toFixed(2)} kg more needed`}</div>
          :<div style={{fontSize:11,color:'#D4AF37',fontWeight:700,marginTop:4,textAlign:'center'}}>🏆 Max Rank!</div>}
      </div>

      {/* Stats */}
      <div style={{padding:'12px 16px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[
          {v:`${totalKg} kg`,l:isHi?'♻️ प्लास्टिक बचाया':'♻️ Plastic Saved',c:'#3DFF7A',bg:'rgba(61,255,122,.035)'},
          {v:`${co2} kg`,l:isHi?'🌿 CO₂ कम किया':'🌿 CO₂ Reduced',c:'#00C44F',bg:'rgba(0,196,79,.035)'},
          {v:String(bags),l:isHi?'🛍️ बैग बदले':'🛍️ Bags Replaced',c:'#D4AF37',bg:'rgba(212,175,55,.035)'},
          {v:String(trees),l:isHi?'🌳 पेड़ लगाए':'🌳 Trees Funded',c:'#2ECC60',bg:'rgba(46,204,96,.035)'},
        ].map((s,i)=>(
          <div key={i} style={{padding:'13px',background:s.bg,border:`1px solid ${s.c}14`,borderRadius:16,animation:`fadeUp .5s ease ${i*.07}s both`}}>
            <div style={{fontSize:20,fontWeight:900,color:s.c,lineHeight:1}}>{anim?s.v:'—'}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* 🪙 Points → Eco Integration Card */}
      <div style={{margin:'12px 16px 0',padding:'14px 16px',background:'rgba(212,175,55,.04)',border:'1px solid rgba(212,175,55,.15)',borderRadius:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#D4AF37',marginBottom:10}}>🪙 {isHi?'Loyalty Points → Eco Score':'Loyalty Points → Eco Score'}</div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <div style={{flex:1,padding:'10px',background:'rgba(212,175,55,.06)',borderRadius:12,textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:'#D4AF37'}}>{points}</div>
            <div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>{isHi?'अंक (Points)':'Points'}</div>
          </div>
          <div style={{fontSize:20,color:'var(--t3)'}}>→</div>
          <div style={{flex:1,padding:'10px',background:'rgba(61,255,122,.06)',borderRadius:12,textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:'#3DFF7A'}}>+{pointsBonus} kg</div>
            <div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>{isHi?'Eco Bonus':'Eco Bonus'}</div>
          </div>
        </div>
        <div style={{fontSize:11,color:'var(--t3)',lineHeight:1.6,padding:'8px 10px',background:'rgba(255,255,255,.03)',borderRadius:10}}>
          💡 {isHi?`हर ₹10 = 1 Point · 100 Points = +0.2 kg Eco Score · ${points>=100?'Redeem karo aur garden badhao!':'Aur points kamao!'}`:`₹10 = 1 Point · 100 Points = +0.2 kg Eco Score · ${points>=100?'Redeem to boost your garden!':'Earn more points!'}`}
        </div>
        {points>=100&&<div style={{marginTop:8,padding:'8px 12px',background:'linear-gradient(135deg,rgba(212,175,55,.12),rgba(61,255,122,.06))',borderRadius:10,border:'1px solid rgba(212,175,55,.2)',textAlign:'center',fontSize:12,fontWeight:700,color:'#D4AF37'}}>
          ✨ {isHi?`${points} points = ₹${Math.floor(points/10)} discount + garden mein badhaav!`:`${points} points = ₹${Math.floor(points/10)} off + garden grows!`}
        </div>}
      </div>

      {/* Leaderboard */}
      <div style={{margin:'12px 16px 0',padding:'15px',background:'rgba(212,175,55,.025)',border:'1px solid rgba(212,175,55,.08)',borderRadius:20}}>
        <div style={{fontSize:13,fontWeight:800,color:'#D4AF37',marginBottom:11}}>🏆 {isHi?'Bhopalgarh के Eco Warriors':'Bhopalgarh Eco Warriors'}</div>
        {leaderboard.length===0
          ?<div style={{textAlign:'center',padding:'11px 0',color:'var(--t3)',fontSize:12}}>{isHi?'Aap pehle ban sakte ho!':'Be the first eco warrior!'}</div>
          :leaderboard.map((u,i)=>(
            <div key={u.uid} style={{display:'flex',alignItems:'center',gap:9,marginBottom:i<leaderboard.length-1?7:0,padding:'7px 9px',borderRadius:11,background:u.uid===user?.uid?'rgba(61,255,122,.055)':'transparent',border:u.uid===user?.uid?'1px solid rgba(61,255,122,.12)':'1px solid transparent'}}>
              <div style={{fontSize:15,width:20,textAlign:'center'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</div>
              <div style={{width:28,height:28,borderRadius:9,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#0A1A0A',flexShrink:0}}>{(u.name||'?')[0].toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700}}>{u.name||'Eco Warrior'}{u.uid===user?.uid&&<span style={{fontSize:9,color:'#3DFF7A',marginLeft:4}}>YOU</span>}</div>
                <div style={{fontSize:10,color:'var(--t3)'}}>{u.ecoScore?.toFixed?.(1)||0} kg</div>
              </div>
              <div style={{fontSize:12}}>{ranks.find(r=>(u.ecoScore||0)>=r.min&&(u.ecoScore||0)<r.max)?.emoji||'🌱'}</div>
            </div>
          ))
        }
      </div>

      <div style={{margin:'12px 16px 0',padding:'12px 16px',background:'linear-gradient(135deg,rgba(61,255,122,.03),rgba(212,175,55,.015))',border:'1px solid rgba(61,255,122,.06)',borderRadius:16,textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--t3)',lineHeight:1.6}}>
          {orderCount===0?(isHi?'🌱 पहला ऑर्डर दो और बगीचा उगाओ!':'🌱 Grow your cinematic garden with every order!'):(isHi?`🌍 ${orderCount} orders में प्रकृति बचाई! बगीचा जीवंत है!`:`🌍 ${orderCount} orders — your garden is alive and growing!`)}
        </div>
      </div>
    </div>
  );
}

function ProfileScr({user,t,fam,lang,isHi,onReorder,points=312}) {
  const [showOrders, setShowOrders]=useState(false);
  const [showMilkSubs, setShowMilkSubs]=useState(false);
  const [showEditProfile, setShowEditProfile]=useState(false);
  const [showOrderTrack, setShowOrderTrack]=useState(false);
  const [trackOrderId, setTrackOrderId]=useState(null);
  const [orders, setOrders]=useState([]);
  const [milkSubs, setMilkSubs]=useState([]);
  const [loadingOrders, setLoadingOrders]=useState(false);
  const [editName, setEditName]=useState((user&&user.name)||'');
  const [editSaving, setEditSaving]=useState(false);

  const fetchOrders=async()=>{
    if(!user?.uid&&!auth.currentUser?.uid) return;
    setLoadingOrders(true);
    try{
      const q=await getDocs(collection(db,'orders'));
      const myOrders=q.docs
        .map(d=>({id:d.id,...d.data()}))
        .filter(o=>o.userId===(user?.uid||auth.currentUser?.uid))
        .sort((a,b)=>b.createdAt?.seconds-a.createdAt?.seconds);
      setOrders(myOrders);
    }catch(e){console.log('Orders fetch error:',e);}
    setLoadingOrders(false);
  };

  const fetchMilkSubs=async()=>{
    if(!user?.uid&&!auth.currentUser?.uid) return;
    try{
      const q=await getDocs(collection(db,'milk_subscriptions'));
      const my=q.docs.map(d=>({id:d.id,...d.data()})).filter(o=>o.userId===(user?.uid||auth.currentUser?.uid));
      setMilkSubs(my);
    }catch(e){console.log(e);}
  };

  const saveProfile=async()=>{
    const uid3=user?.uid||auth.currentUser?.uid;
    if(!uid3||!editName.trim()) return;
    setEditSaving(true);
    try{
      const uid4=user?.uid||auth.currentUser?.uid;
      await setDoc(doc(db,'users',uid4),{name:editName.trim(),phone:user?.phone},{merge:true});
      alert('Profile updated!');
      setShowEditProfile(false);
    }catch(e){console.log(e);}
    setEditSaving(false);
  };

  if(showEditProfile) return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={()=>setShowEditProfile(false)}/>
        <div><div style={{fontSize:18,fontWeight:800}}>✏️ Edit Profile</div></div>
      </div>
      <div style={{padding:'0 20px'}}>
        <div className="gc" style={{padding:20,marginBottom:14}}>
          <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:800,color:'#0A1A0A',margin:'0 auto 16px'}}>{editName[0]||'U'}</div>
          <div style={{fontSize:12,color:'var(--t3)',fontWeight:600,marginBottom:6}}>Full Name</div>
          <input className="dbi" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Apna naam likho" style={{marginBottom:16}}/>
          <div style={{fontSize:12,color:'var(--t3)',fontWeight:600,marginBottom:6}}>Phone Number</div>
          <input className="dbi" value={(user&&user.phone)||''} disabled style={{opacity:.5,marginBottom:16}}/>
          <div style={{fontSize:11,color:'var(--t3)',marginBottom:16}}>📱 Phone number change nahi hoga</div>
          <button className="btn rip" onClick={saveProfile} disabled={editSaving} style={{width:'100%',padding:14,fontSize:14}}>{editSaving?'Saving...':'✅ Save Profile'}</button>
        </div>
      </div>
    </div>
  );

  if(showMilkSubs) return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={()=>setShowMilkSubs(false)}/>
        <div><div style={{fontSize:18,fontWeight:800}}>🥛 Milk Subscriptions</div><div style={{fontSize:12,color:'var(--t3)'}}>{milkSubs.length} subscription{milkSubs.length!==1?'s':''}</div></div>
      </div>
      <div className="scr" style={{padding:'0 20px 20px'}}>
        {milkSubs.length===0
          ? <div style={{textAlign:'center',padding:40}}><div style={{fontSize:48,marginBottom:12}}>🥛</div><div style={{fontSize:16,fontWeight:700}}>No subscriptions yet</div><div style={{fontSize:13,color:'var(--t3)',marginTop:6}}>Crown icon se subscribe karo!</div></div>
          : milkSubs.map((s,i)=>(
            <div key={s.id} className="gc" style={{padding:16,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700}}>🥛 {s.qty}</div>
                <div style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:50,background:'rgba(61,255,122,.15)',color:'#3DFF7A',border:'1px solid rgba(61,255,122,.3)'}}>{s.status==='active'?'✅ Active':'⏳ Pending'}</div>
              </div>
              <div style={{fontSize:12,color:'var(--t3)',marginBottom:4}}>⏰ Delivery: {s.deliveryTime} AM · {s.days} days</div>
              <div style={{fontSize:12,color:'var(--t3)',marginBottom:8}}>📅 {s.createdAt?.seconds?new Date(s.createdAt.seconds*1000).toLocaleDateString('en-IN'):'Recent'}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,color:'var(--t3)'}}>₹{s.pricePerDay}/day</div>
                <div style={{fontSize:15,fontWeight:800,color:'#3DFF7A'}}>Total: ₹{s.total}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  if(showOrderTrack&&trackOrderId) return (
    <TrackScreen onBack={()=>{setShowOrderTrack(false);setTrackOrderId(null);}} lastOrderId={trackOrderId} isHi={isHi} t={t} fam={fam}/>
  );

  if(showOrders) return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={()=>setShowOrders(false)}/>
        <div><div style={{fontSize:18,fontWeight:800}}>📦 {t.myOrders}</div><div style={{fontSize:12,color:'var(--t3)'}}>{orders.length} orders</div></div>
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 20px'}}>
        {loadingOrders
          ? <div style={{textAlign:'center',padding:40,color:'var(--t3)'}}>Loading...</div>
          : orders.length===0
            ? <div style={{textAlign:'center',padding:40}}>
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <div style={{fontSize:16,fontWeight:700}}>No orders yet</div>
                <div style={{fontSize:13,color:'var(--t3)',marginTop:6}}>Start shopping!</div>
              </div>
            : orders.map((o,i)=>(
              <div key={o.id} className="gc" style={{padding:16,marginBottom:12,animation:`fadeUp .4s ease ${i*.06}s both`,cursor:o.status!=='delivered'?'pointer':'default'}}
                onClick={()=>{if(o.status!=='delivered'){setTrackOrderId(o.id);setShowOrderTrack(true);}}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:12,color:'var(--t3)'}}>
                    {o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('en-IN') : 'Recent'}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:50,
                    background:{pending:'rgba(255,140,66,.15)',confirmed:'rgba(212,175,55,.15)',packed:'rgba(0,196,79,.15)',out:'rgba(61,200,255,.15)',delivered:'rgba(61,255,122,.15)'}[o.status]||'rgba(212,175,55,.15)',
                    color:{pending:'#FF8C42',confirmed:'#D4AF37',packed:'#00C44F',out:'#3DC8FF',delivered:'#3DFF7A'}[o.status]||'#D4AF37',
                    border:`1px solid rgba(61,255,122,.2)`}}>
                    {{'pending':'🕐 Pending','confirmed':'✅ Confirmed','packed':'📦 Packed','out':'🚴 Out for Delivery','delivered':'🏠 Delivered'}[o.status]||'🚴 Processing'}
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  {o.items?.map((item,j)=>(
                    <div key={j} style={{fontSize:13,color:'var(--t2)',marginBottom:2}}>
                      • {item.name} × {item.qty} — ₹{item.price*item.qty}
                    </div>
                  ))}
                </div>
                {o.address&&<div style={{fontSize:11,color:'var(--t3)',marginBottom:8}}>📍 {o.address}</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:11,color:'var(--t3)'}}>💳 {o.payMethod==='cod'?'Cash on Delivery':'UPI'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {onReorder&&o.items?.length>0&&<button className="btn rip" onClick={e=>{e.stopPropagation();onReorder(o.items);}} style={{padding:'6px 14px',fontSize:12,borderRadius:50}}>🔁 Reorder</button>}
                      {o.status!=='delivered'&&<button onClick={e=>{e.stopPropagation();setTrackOrderId(o.id);setShowOrderTrack(true);}} style={{padding:'6px 12px',fontSize:12,borderRadius:50,background:'rgba(61,255,122,.1)',color:'#3DFF7A',border:'1px solid rgba(61,255,122,.3)',cursor:'pointer',fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>📍 Track</button>}
                      <button onClick={e=>{e.stopPropagation();window.open(`https://wa.me/916375565339?text=Hello%20Daily%20Basket!%20Order%20${o.id||''}%20mein%20help%20chahiye.%20Total%3A%20%E2%82%B9${o.total}`,'_blank');}} style={{padding:'6px 12px',fontSize:12,borderRadius:50,background:'#25D366',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',gap:4}}>
                        <span>💬</span><span>Help</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );

  const menu=[
    {i:'✏️',l:'Edit Profile',sub:'Name, photo update karo',c:'#3DFF7A',action:()=>setShowEditProfile(true)},
    {i:'📦',l:t.myOrders,sub:`${orders.length} orders`,c:'#3DFF7A',action:()=>{fetchOrders();setShowOrders(true);}},
    {i:'🥛',l:'Milk Subscription',sub:`${milkSubs.length} active plan`,c:'#00C4FF',action:()=>{fetchMilkSubs();setShowMilkSubs(true);}},
    {i:'💬',l:'WhatsApp Support',sub:'6375565339',c:'#25D366',action:()=>window.open('https://wa.me/916375565339?text=Daily%20Basket%20Support','_blank')},
    {i:'🌐',l:isHi?'भाषा':'Language',sub:lang==='hi'?'हिंदी':'English',c:'#3DFF7A',action:()=>window.location.reload()},
    {i:'⚙️',l:t.settings,sub:isHi?'सूचनाएं':'Notifications',c:'#8A9A8A',action:()=>{if(Notification.permission!=='granted')Notification.requestPermission();else alert('Notifications already enabled!');}}
  ];

  return (
    <div style={{paddingBottom:100,fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'8px 20px 18px'}}><div style={{fontSize:22,fontWeight:800}}>{t.profile}</div></div>
      <div style={{padding:'0 20px',marginBottom:14}}>
        <div style={{background:'linear-gradient(135deg,#0D2010,#1A3320)',border:'1px solid rgba(61,255,122,.2)',borderRadius:24,padding:20}}>
          <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
            <div style={{width:64,height:64,borderRadius:20,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:'#0A1A0A',boxShadow:'0 4px 20px rgba(61,255,122,.3)'}}>{(user&&user.name&&user.name[0])||'U'}</div>
            <div><div style={{fontSize:18,fontWeight:800}}>{(user&&user.name)||'User'}</div><div style={{fontSize:13,color:'var(--t2)'}}>+91 {(user&&user.phone)||'XXXXXXXXXX'}</div>
            {(()=>{const kg=orders.length*0.05+points*0.002;const ranks=[{min:0,max:1,label:'Seedling 🌱',labelHi:'अंकुर 🌱'},{min:1,max:5,label:'Sapling 🌿',labelHi:'पौधा 🌿'},{min:5,max:15,label:'Green Leaf 🍃',labelHi:'हरी पत्ती 🍃'},{min:15,max:50,label:'Tree Guardian 🌳',labelHi:'वृक्ष रक्षक 🌳'},{min:50,max:999,label:'Eco Champion 🏆',labelHi:'इको चैंपियन 🏆'}];const r=ranks.find(r=>kg>=r.min&&kg<r.max)||ranks[0];return<span style={{background:'rgba(212,175,55,.14)',border:'1px solid rgba(212,175,55,.3)',color:'#D4AF37',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:50,marginTop:5,display:'inline-block'}}>{isHi?r.labelHi:r.label}</span>;})()}
            </div>
          </div>
          <div style={{display:'flex',gap:12,padding:12,background:'rgba(0,0,0,.2)',borderRadius:14}}>
            {[{v:`${(orders.length*0.05+points*0.002).toFixed(2)}kg`,l:isHi?'बचाया':'Saved',c:'#3DFF7A'},{v:points,l:isHi?'अंक':'Points',c:'#D4AF37'},{v:orders.length||'0',l:isHi?'ऑर्डर':'Orders',c:'#3DFF7A'}].map((s,i)=>(
              <div key={i} style={{flex:1,textAlign:'center'}}><div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:'var(--t3)',fontFamily:fam}}>{s.l}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:8}}>
        {menu.map((item,i)=>(
          <div key={i} className="gc" onClick={item.action} style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',animation:`fadeUp .4s ease ${i*.06}s both`}}>
            <div style={{width:40,height:40,borderRadius:12,background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{item.i}</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,fontFamily:fam}}>{item.l}</div><div style={{fontSize:12,color:'var(--t3)',fontFamily:fam}}>{item.sub}</div></div>
            <Ic n="arrow" s={16} c="#3A4A3A"/>
          </div>
        ))}
        <button className="btng rip" onClick={()=>{if(window.confirm('Sign out karna chahte ho?')){try{localStorage.removeItem('db_cust_user');localStorage.removeItem('db_name');}catch(e){}import('firebase/auth').then(({signOut,getAuth})=>{signOut(getAuth()).catch(()=>{}).finally(()=>window.location.reload());}).catch(()=>window.location.reload());}}} style={{width:'100%',padding:'14px',fontSize:13,color:'#FF6B6B',border:'1px solid rgba(255,107,107,.2)',marginTop:4,fontFamily:fam}}>{t.signOut}</button>
      </div>
    </div>
  );
}

/* ═══════════ PORTAL APPS (Rider, Shop, Admin) ═══════════ */
function LoginForm({color,icon,role,cred,onLogin,onBack,hint}) {
  const [id,setId]=useState('');const [pass,setPass]=useState('');const [show,setShow]=useState(false);
  const [err,setErr]=useState('');const [load,setLoad]=useState(false);
  const rgb={'#3DFF7A':'61,255,122','#00C44F':'0,196,79','#D4AF37':'212,175,55','#FF8C42':'255,140,66'}[color]||'61,255,122';
  const attempt=()=>{setErr('');const ok=cred(id.trim(),pass);if(!ok){setErr('Invalid credentials or account disabled.');return;}setLoad(true);setTimeout(()=>onLogin(ok),1000);};
  return (
    <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 30% 10%,rgba(${rgb},.04),#070907)`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <SBar/><div style={{padding:'2px 20px 0'}}><div style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',padding:'6px 0'}} onClick={onBack}><Ic n="back" s={16} c="#5A6A5A"/><span style={{fontSize:13,color:'var(--t3)',fontWeight:600}}>Back</span></div></div>
      <div style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'10px 24px 30px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:`rgba(${rgb},.1)`,border:`1px solid rgba(${rgb},.25)`,borderRadius:50,padding:'7px 16px',marginBottom:22}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:13,color,fontWeight:700}}>{role} Portal</span></div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,marginBottom:6,background:`linear-gradient(135deg,#F0F4F0,${color})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Welcome back 👋</div>
        <div style={{fontSize:13,color:'var(--t3)',marginBottom:26}}>Sign in to {role.toLowerCase()} account</div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div><div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:6,letterSpacing:.8,textTransform:'uppercase'}}>{role} ID</div><input className="dbi" placeholder={`Enter ${role} ID`} value={id} onChange={e=>{setId(e.target.value);setErr('');}}/></div>
          <div><div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:6,letterSpacing:.8,textTransform:'uppercase'}}>Password</div><div style={{position:'relative'}}><input className="dbi" style={{paddingRight:44}} type={show?'text':'password'} placeholder="Enter password" value={pass} onChange={e=>{setPass(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&attempt()}/><div style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',cursor:'pointer',opacity:.5}} onClick={()=>setShow(v=>!v)}><Ic n="eye" s={16} c="#8A9A8A"/></div></div></div>
          {err&&<div style={{fontSize:12,color:'#FF6B6B',background:'rgba(255,107,107,.08)',border:'1px solid rgba(255,107,107,.2)',borderRadius:10,padding:'8px 12px'}}>{err}</div>}
          <button className="btn rip" onClick={attempt} style={{width:'100%',padding:'16px',fontSize:15,background:load?`rgba(${rgb},.1)`:`linear-gradient(135deg,${color},${color}BB)`,color:load?color:'#0A1A0A',border:load?`1px solid rgba(${rgb},.3)`:'none',marginTop:4}}>
            {load?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:14,height:14,border:`2px solid ${color}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/> Signing in…</span>:`Login as ${role} →`}
          </button>
        </div>
        {hint&&<div style={{marginTop:20,padding:'12px 14px',background:`rgba(${rgb},.06)`,border:`1px solid rgba(${rgb},.15)`,borderRadius:14}}><div style={{fontSize:12,color,fontWeight:600,marginBottom:4}}>🔑 Demo</div><div style={{fontSize:11,color:'var(--t3)'}}>{hint}</div></div>}
      </div>
    </div>
  );
}

/* ═══════════ RIDER APP ═══════════ */
function RiderApp({rider,data,setData,onBack}) {
  const [tab,setTab]=useState('dash');
  const [online,setOnline]=useState(rider.online||false);
  const [realOrders,setRealOrders]=useState([]);
  const [newOrderAlert,setNewOrderAlert]=useState(null);
  const [location,setLocation]=useState(null);
  const [todayEarn,setTodayEarn]=useState(0);
  const [todayCount,setTodayCount]=useState(0);
  const prevAvailCount=useRef(0);
  const fam="'Outfit',sans-serif";

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'orders'),snap=>{
      const orders=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      setRealOrders(orders);
      const newAvail=orders.filter(o=>o.status==='packed'&&!o.riderId);
      if(newAvail.length>prevAvailCount.current&&prevAvailCount.current>=0&&newAvail.length>0) setNewOrderAlert(newAvail[0]);
      prevAvailCount.current=newAvail.length;
      const today=new Date().toDateString();
      const myToday=orders.filter(o=>o.riderId===rider.id&&o.status==='delivered'&&o.deliveredAt?.seconds&&new Date(o.deliveredAt.seconds*1000).toDateString()===today);
      setTodayCount(myToday.length);
      setTodayEarn(myToday.reduce((s,o)=>s+(o.total?40+Math.floor((o.total/100)*5):40),0));
    });
    return()=>unsub();
  },[]);

  useEffect(()=>{
    if(!online) return;
    const watchId=navigator.geolocation?.watchPosition(
      pos=>{
        const loc={lat:pos.coords.latitude,lng:pos.coords.longitude,ts:Date.now()};
        setLocation(loc);
        updateDoc(doc(db,'riders',rider.firestoreId||rider.id),{location:loc,online:true}).catch(()=>{});
      },
      ()=>{},
      {enableHighAccuracy:true,maximumAge:10000}
    );
    return()=>navigator.geolocation?.clearWatch(watchId);
  },[online]);

  const toggleOnline=async(v)=>{
    setOnline(v);
    try{ await updateDoc(doc(db,'riders',rider.firestoreId||rider.id),{online:v}); }catch(e){}
  };

  const my=realOrders.filter(o=>o.riderId===rider.id);
  const avail=realOrders.filter(o=>o.status==='packed'&&!o.riderId);
  const active=my.filter(o=>o.status==='out');
  const done=my.filter(o=>o.status==='delivered');

  const accept=async id=>{
    if(!online){alert('⚠️ Pehle Online ho jao!');return;}
    try{
      const {runTransaction}=await import('firebase/firestore');
      await runTransaction(db,async(tx)=>{
        const oSnap=await tx.get(doc(db,'orders',id));
        if(!oSnap.exists()) throw new Error('Order not found');
        const oData=oSnap.data();
        if(oData.riderId&&oData.riderId!==rider.id) throw new Error('Yeh order kisi aur rider ne le liya!');
        tx.update(doc(db,'orders',id),{riderId:rider.id,riderName:rider.name,status:'out'});
      });
      setNewOrderAlert(null);
    }catch(e){alert('❌ '+(e.message||'Accept failed'));}
  };

  const deliver=async id=>{
    try{ await updateDoc(doc(db,'orders',id),{status:'delivered',deliveredAt:serverTimestamp()}); }catch(e){}
  };

  const callCustomer=(phone)=>{if(phone) window.location.href=`tel:+91${phone.replace(/\D/g,'')}`;};

  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam,background:'var(--bg)'}}>
      <SBar/>
      {newOrderAlert&&online&&(
        <div style={{position:'absolute',top:60,left:12,right:12,zIndex:999,background:'linear-gradient(135deg,#061506,#030D03)',border:'2px solid #3DFF7A',borderRadius:22,padding:18,boxShadow:'0 12px 48px rgba(61,255,122,.4)',animation:'fadeUp .3s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:'#3DFF7A',animation:'statusP 1s infinite'}}/>
            <div style={{fontSize:15,fontWeight:800,color:'#3DFF7A'}}>🆕 Naya Order!</div>
            <div style={{marginLeft:'auto',background:'rgba(61,255,122,.1)',borderRadius:50,padding:'2px 8px',fontSize:11,color:'#3DFF7A',fontWeight:700}}>#{newOrderAlert.id?.slice(-6).toUpperCase()}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:'var(--t)'}}>{newOrderAlert.userName||'Customer'}</div>
          <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>{newOrderAlert.items?.map(i=>i.name).join(', ')}</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:8}}>📍 {newOrderAlert.address}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900,color:'#3DFF7A'}}>₹{newOrderAlert.total}</div>
            <div style={{fontSize:12,color:'#D4AF37',fontWeight:700}}>{newOrderAlert.payMethod==='cod'?'💵 Cash on Delivery':'📱 UPI Paid'}</div>
            <div style={{fontSize:12,color:'#3DFF7A',fontWeight:600}}>💰 ~₹45 earn</div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>accept(newOrderAlert.id)} style={{flex:2,padding:'12px',borderRadius:14,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',fontFamily:fam}}>✅ Accept</button>
            <button onClick={()=>setNewOrderAlert(null)} style={{flex:1,padding:'12px',borderRadius:14,background:'rgba(255,107,107,.1)',color:'#FF6B6B',fontWeight:700,fontSize:13,border:'1px solid rgba(255,107,107,.3)',cursor:'pointer',fontFamily:fam}}>Skip</button>
          </div>
        </div>
      )}
      <div style={{padding:'4px 16px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BBtn onClick={onBack}/>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>🚲 {rider.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:5,marginTop:1}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:location?'#3DFF7A':'#FF8C42'}}/>
              <div style={{fontSize:10,color:'var(--t3)'}}>{location?'📍 GPS Active':'📍 GPS Off'}</div>
            </div>
          </div>
        </div>
        <div onClick={()=>toggleOnline(!online)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:online?'rgba(61,255,122,.1)':'rgba(255,255,255,.05)',border:`1.5px solid ${online?'rgba(61,255,122,.4)':'rgba(255,255,255,.1)'}`,borderRadius:50,cursor:'pointer',transition:'all .3s'}}>
          <div style={{width:9,height:9,borderRadius:'50%',background:online?'#3DFF7A':'#5A6A5A',animation:online?'pulseD 1.5s infinite':'none'}}/>
          <span style={{fontSize:12,fontWeight:800,color:online?'#3DFF7A':'#5A6A5A'}}>{online?'ONLINE':'OFFLINE'}</span>
          <Tog on={online} onClick={e=>{e.stopPropagation();toggleOnline(!online);}}/>
        </div>
      </div>
      {!online&&<div style={{margin:'0 16px 10px',padding:'10px 14px',borderRadius:12,background:'rgba(255,107,107,.07)',border:'1px solid rgba(255,107,107,.2)',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:16}}>⚠️</span>
        <div style={{fontSize:12,color:'#FF6B6B',fontWeight:600}}>Abhi Offline ho. Orders nahi milenge. Online ho jao!</div>
      </div>}
      {active.length>0&&active.map(o=>(
        <div key={o.id} style={{margin:'0 16px 10px',padding:'14px',borderRadius:18,background:'linear-gradient(135deg,rgba(61,255,122,.08),rgba(0,196,79,.04))',border:'2px solid rgba(61,255,122,.35)',animation:'pulseD 2s infinite'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:800,color:'#3DFF7A'}}>🚴 Delivery in Progress</div>
            <div style={{fontSize:12,fontWeight:700,color:'#D4AF37'}}>₹{o.total} · {o.payMethod==='cod'?'💵 COD':'✅ Paid'}</div>
          </div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{o.userName}</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:10}}>📍 {o.address}</div>
          <div style={{display:'flex',gap:8}}>
            <a href={o.lat&&o.lng?`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=driving`:`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.address||'Bhopalgarh,Rajasthan')}&travelmode=driving`} target="_blank" rel="noreferrer" style={{flex:1,padding:'9px',borderRadius:12,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.3)',color:'#3DFF7A',fontWeight:700,fontSize:12,textDecoration:'none',textAlign:'center'}}>🧭 Navigate</a>
            {o.userPhone&&<button onClick={()=>callCustomer(o.userPhone)} style={{flex:1,padding:'9px',borderRadius:12,background:'rgba(61,200,255,.1)',border:'1px solid rgba(61,200,255,.3)',color:'#3DC8FF',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:fam}}>📞 Call</button>}
            <button onClick={()=>deliver(o.id)} style={{flex:1,padding:'9px',borderRadius:12,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',fontWeight:800,fontSize:12,border:'none',cursor:'pointer',fontFamily:fam}}>✅ Done</button>
          </div>
        </div>
      ))}
      <div style={{padding:'0 16px 10px',display:'flex',gap:8}}>
        {[{id:'dash',l:'🏠 Dash'},{id:'pickups',l:`📦 Pickups${avail.length>0?' ('+avail.length+')':''}`},{id:'orders',l:'📋 Mine'},{id:'earn',l:'💰 Earn'}].map(t=>(
          <div key={t.id} className={`cp ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)} style={{flex:1,textAlign:'center',padding:'8px 2px',fontSize:11,fontWeight:700}}>{t.l}</div>
        ))}
      </div>
      <div className="scr" style={{position:'relative',padding:'0 16px 24px'}}>
        {tab==='dash'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{i:'🚴',v:active.length,l:'Active Now',c:'#3DFF7A'},{i:'📦',v:avail.length,l:'Awaiting Pickup',c:'#FF8C42'},{i:'✅',v:todayCount,l:'Today Done',c:'#D4AF37'},{i:'💰',v:`₹${todayEarn}`,l:'Today Earned',c:'#D4AF37'}].map((s,i)=>(
              <div key={i} className="gc" style={{padding:'16px 14px'}}>
                <div style={{fontSize:24,marginBottom:6}}>{s.i}</div>
                <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="gc" style={{padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#D4AF37,#B8962E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>⭐</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:600}}>Your Rating</div>
              <div style={{fontSize:24,fontWeight:900,color:'#D4AF37'}}>{(rider.rating||5.0).toFixed(1)}</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>{done.length} deliveries</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,color:'var(--t3)'}}>Lifetime</div>
              <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{(rider.totalEarnings||0).toLocaleString()}</div>
              <div style={{fontSize:10,color:'var(--t3)'}}>{rider.totalOrders||0} orders</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div onClick={()=>setTab('pickups')} style={{padding:'14px',borderRadius:16,background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.15)',cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:4}}>📦</div>
              <div style={{fontSize:12,fontWeight:700,color:'#3DFF7A'}}>New Pickups</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>{avail.length} waiting</div>
            </div>
            <div onClick={()=>setTab('earn')} style={{padding:'14px',borderRadius:16,background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:4}}>💰</div>
              <div style={{fontSize:12,fontWeight:700,color:'#D4AF37'}}>Earnings</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>This week</div>
            </div>
          </div>
        </>}
        {tab==='pickups'&&<>
          <div className="sh"><div className="st">Available Pickups</div><div style={{fontSize:12,color:'var(--t3)'}}>{avail.length} orders</div></div>
          {avail.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
              <div style={{fontSize:48,marginBottom:12}}>📭</div>
              <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Koi pickup nahi</div>
              <div style={{fontSize:12}}>Online raho — jaise order packed ho, yahan dikhega!</div>
            </div>
          ):avail.map(o=>(
            <div key={o.id} className="gc" style={{padding:'14px',marginBottom:12,animation:'fadeUp .3s ease both'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{o.userName||'Customer'}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginTop:1}}>#{o.id?.slice(-6).toUpperCase()}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:'#3DFF7A'}}>₹{o.total}</div>
                  <div style={{fontSize:10,color:'#D4AF37',fontWeight:600}}>{o.payMethod==='cod'?'💵 COD':'✅ Paid'}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:6}}>{o.items?.map(i=>`${i.name} ×${i.qty}`).join(', ')}</div>
              {o.address&&<div style={{fontSize:12,color:'var(--t3)',marginBottom:8}}>📍 {o.address}</div>}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'8px 12px',background:'rgba(61,255,122,.04)',borderRadius:10}}>
                <span style={{fontSize:12,color:'#3DFF7A',fontWeight:700}}>💰 ~₹45 earn</span>
                <span style={{fontSize:11,color:'var(--t3)'}}>· Base ₹40 + bonus</span>
                {o.lat&&o.lng&&<a href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=driving`} target="_blank" rel="noreferrer" style={{marginLeft:'auto',fontSize:11,color:'#3DFF7A',fontWeight:700,textDecoration:'none'}}>🗺️ Map →</a>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn rip" onClick={()=>accept(o.id)} style={{flex:2,padding:'11px',fontSize:13}}>✅ Accept Order</button>
                <button className="btng rip" onClick={()=>setNewOrderAlert(null)} style={{flex:1,padding:'11px',fontSize:12,color:'#FF6B6B',border:'1px solid rgba(255,107,107,.2)'}}>✕ Skip</button>
              </div>
            </div>
          ))}
        </>}
        {tab==='orders'&&<>
          <div className="sh"><div className="st">My Orders</div><div style={{fontSize:12,color:'var(--t3)'}}>{my.length} total</div></div>
          {my.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
              <div style={{fontSize:48,marginBottom:12}}>🚲</div>
              <div style={{fontSize:14}}>Abhi tak koi order nahi</div>
            </div>
          ):my.map((o,i)=>(
            <div key={o.id} className="gc" style={{padding:'14px',marginBottom:10,animation:`fadeUp .4s ease ${i*.06}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{o.userName||'Customer'}</div>
                  <div style={{fontSize:10,color:'var(--t3)'}}>#{o.id?.slice(-6).toUpperCase()}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <div style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:50,background:o.status==='delivered'?'rgba(61,255,122,.15)':'rgba(212,175,55,.15)',color:o.status==='delivered'?'#3DFF7A':'#D4AF37',border:`1px solid ${o.status==='delivered'?'rgba(61,255,122,.3)':'rgba(212,175,55,.3)'}`}}>
                    {o.status==='delivered'?'✅ Delivered':'🚴 Delivering'}
                  </div>
                  <div style={{fontSize:13,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>{o.items?.map(i=>i.name).join(', ')}</div>
              {o.address&&<div style={{fontSize:11,color:'var(--t3)',marginBottom:o.status==='out'?10:0}}>📍 {o.address}</div>}
              {o.status==='out'&&<div style={{display:'flex',gap:8,marginTop:8}}>
                <a href={o.lat&&o.lng?`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=driving`:`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.address||'Bhopalgarh,Rajasthan')}&travelmode=driving`} target="_blank" rel="noreferrer" style={{flex:1,padding:'8px',borderRadius:10,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',color:'#3DFF7A',fontWeight:700,fontSize:11,textDecoration:'none',textAlign:'center'}}>🧭 Navigate</a>
                {o.userPhone&&<button onClick={()=>callCustomer(o.userPhone)} style={{flex:1,padding:'8px',borderRadius:10,background:'rgba(61,200,255,.1)',border:'1px solid rgba(61,200,255,.2)',color:'#3DC8FF',fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:fam}}>📞 Call</button>}
                <button onClick={()=>deliver(o.id)} style={{flex:1,padding:'8px',borderRadius:10,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',fontWeight:800,fontSize:11,border:'none',cursor:'pointer',fontFamily:fam}}>✅ Done</button>
              </div>}
              {o.status==='delivered'&&o.deliveredAt?.seconds&&(
                <div style={{fontSize:10,color:'var(--t3)',marginTop:6}}>✅ {new Date(o.deliveredAt.seconds*1000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
              )}
            </div>
          ))}
        </>}
        {tab==='earn'&&<>
          <div style={{background:'linear-gradient(135deg,#1A3320,#0D2010)',border:'1px solid rgba(61,255,122,.2)',borderRadius:20,padding:'20px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--t3)',letterSpacing:.8}}>LIFETIME EARNINGS</div>
            <div style={{fontSize:38,fontWeight:900,color:'#3DFF7A',marginTop:4}}>₹{(rider.totalEarnings||0).toLocaleString()}</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{rider.totalOrders||0} orders delivered</div>
          </div>
          <div className="gc" style={{padding:'14px 16px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,color:'var(--t3)',fontWeight:600}}>TODAY</div>
                <div style={{fontSize:24,fontWeight:900,color:'#D4AF37'}}>₹{todayEarn}</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>{todayCount} deliveries</div>
              </div>
              <div style={{fontSize:48}}>💰</div>
            </div>
          </div>
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📅 This Week</div>
            {[{d:'Mon',e:320},{d:'Tue',e:450},{d:'Wed',e:280},{d:'Thu',e:510},{d:'Fri',e:390},{d:'Sat',e:620},{d:'Sun',e:todayEarn}].map((day,i)=>{
              const max=620;const pct=Math.round((day.e/max)*100);
              return(<div key={day.d} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:'var(--t3)',width:28}}>{day.d}</div>
                <div style={{flex:1,height:6,background:'rgba(61,255,122,.08)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#3DFF7A,#00C44F)',borderRadius:99,transition:'width .5s ease'}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:'#3DFF7A',width:36,textAlign:'right'}}>₹{day.e}</div>
              </div>);
            })}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(61,255,122,.08)'}}>
              <span style={{fontSize:12,color:'var(--t3)'}}>Week Total</span>
              <span style={{fontSize:14,fontWeight:800,color:'#D4AF37'}}>₹{320+450+280+510+390+620+todayEarn}</span>
            </div>
          </div>
          <div className="gc" style={{padding:'16px'}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>💡 Pay Structure</div>
            {[{l:'🚀 Base Pay',v:'₹40/order'},{l:'📍 Distance Bonus',v:'₹5/km'},{l:'🌙 Night Bonus (10PM+)',v:'+₹30'},{l:'⭐ Rating (4.5+)',v:'+₹10'},{l:'📅 Weekend Bonus',v:'+₹20'}].map(r=>(
              <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:10,paddingBottom:10,borderBottom:'1px solid rgba(61,255,122,.05)'}}>
                <span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:'#3DFF7A'}}>{r.v}</span>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}

function ShopApp({shop,data,setData,onBack}) {
  const [tab,setTab]=useState('orders');
  const [isOpen,setIsOpen]=useState(shop.active||true);
  const [realOrders,setRealOrders]=useState([]);
  const fam="'Outfit',sans-serif";

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'orders'),snap=>{
      setRealOrders(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
    });
    return()=>unsub();
  },[]);

  // Category-based order routing
  const shopCat=(shop.category||shop.cuisine||'').toLowerCase();
  const matchesShop=(o)=>{
    const items=o.items||[];
    if(shopCat.includes('veg')||shopCat.includes('fruit')||shopCat.includes('grocery'))
      return items.some(i=>(i.cat||'').match(/veg|fruit/i));
    if(shopCat.includes('food')||shopCat.includes('restaurant'))
      return items.some(i=>(i.cat||'').match(/food/i));
    if(shopCat.includes('dairy')||shopCat.includes('milk'))
      return items.some(i=>(i.cat||'').match(/milk|dairy/i));
    return true;
  };

  const newOrders=realOrders.filter(o=>o.status==='pending'&&matchesShop(o));
  const confirmedOrders=realOrders.filter(o=>o.status==='confirmed'&&matchesShop(o));
  const packedOrders=realOrders.filter(o=>o.status==='packed'&&matchesShop(o));
  const history=realOrders.filter(o=>['delivered','out'].includes(o.status)&&matchesShop(o));
  const pendingCount=newOrders.length+confirmedOrders.length;

  const todayRev=realOrders.filter(o=>{
    if(!o.createdAt?.seconds) return false;
    return new Date(o.createdAt.seconds*1000).toDateString()===new Date().toDateString()&&o.status==='delivered'&&matchesShop(o);
  }).reduce((s,o)=>s+(o.total||0),0);

  // Step 1: Confirm order (shop ne dekha)
  const confirmO=async id=>{
    try{ await updateDoc(doc(db,'orders',id),{status:'confirmed',confirmedAt:serverTimestamp(),shopId:shop.id,shopName:shop.name}); }
    catch(e){alert('Error: '+e.message);}
  };
  // Step 2: Mark as Packed → Rider auto-notified
  const packO=async id=>{
    try{
      await updateDoc(doc(db,'orders',id),{status:'packed',packedAt:serverTimestamp()});
      // Push to riders
      try{ await fetch('/api/sendpush',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'riders',title:'📦 Order Ready for Pickup!',body:'Ek order pack ho gaya. Abhi pickup karo!'})}); }catch(ne){}
    }
    catch(e){alert('Error: '+e.message);}
  };
  const rejectO=async id=>{
    try{ await updateDoc(doc(db,'orders',id),{status:'rejected',rejectedAt:serverTimestamp(),shopId:shop.id}); }
    catch(e){alert('Error: '+e.message);}
  };

  const OrderCard=({o,showConfirm,showPack})=>(
    <div className="gc" style={{padding:14,marginBottom:10,border:`2px solid ${o.status==='packed'?'rgba(61,255,122,.4)':o.status==='confirmed'?'rgba(212,175,55,.4)':'rgba(255,140,66,.25)'}`,animation:'fadeUp .3s ease both'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>{o.userName||'Customer'}</div>
          <div style={{fontSize:10,color:'var(--t3)'}}>#{o.id?.slice(-6).toUpperCase()} · {o.createdAt?.seconds?new Date(o.createdAt.seconds*1000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):''}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:15,fontWeight:900,color:'#3DFF7A'}}>₹{o.total}</div>
          <div style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50,background:o.status==='packed'?'rgba(61,255,122,.15)':o.status==='confirmed'?'rgba(212,175,55,.15)':'rgba(255,140,66,.15)',color:o.status==='packed'?'#3DFF7A':o.status==='confirmed'?'#D4AF37':'#FF8C42'}}>
            {o.status==='packed'?'📦 Packed':o.status==='confirmed'?'✅ Confirmed':'🆕 New'}
          </div>
        </div>
      </div>
      <div style={{marginBottom:8,padding:'8px 10px',background:'rgba(61,255,122,.03)',borderRadius:10}}>
        {o.items?.map((item,j)=><div key={j} style={{fontSize:12,color:'var(--t2)',marginBottom:2}}>• {item.name} × {item.qty} — ₹{(item.price||0)*item.qty}</div>)}
      </div>
      {o.address&&<div style={{fontSize:11,color:'var(--t3)',marginBottom:8}}>📍 {o.address}</div>}
      <div style={{fontSize:11,color:'#D4AF37',fontWeight:600,marginBottom:10}}>{o.payMethod==='cod'?'💵 Cash on Delivery':'📱 UPI Paid'}</div>
      {showConfirm&&<div style={{display:'flex',gap:8}}>
        <button className="btn rip" onClick={()=>confirmO(o.id)} style={{flex:2,padding:'10px',fontSize:12,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>✅ Confirm Order</button>
        <button onClick={()=>rejectO(o.id)} style={{flex:1,padding:'10px',fontSize:12,borderRadius:12,background:'rgba(255,107,107,.1)',color:'#FF6B6B',border:'1px solid rgba(255,107,107,.3)',cursor:'pointer',fontFamily:fam}}>❌ Reject</button>
      </div>}
      {showPack&&<button className="btn rip" onClick={()=>packO(o.id)} style={{width:'100%',padding:'11px',fontSize:13,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A'}}>📦 Mark as Packed → Rider ko bhejo</button>}
      {o.status==='packed'&&<div style={{padding:'10px',textAlign:'center',color:'#3DC8FF',fontSize:12,fontWeight:700,background:'rgba(61,200,255,.06)',borderRadius:10}}>🚴 Rider assign ho raha hai...</div>}
    </div>
  );

  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'4px 16px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BBtn onClick={onBack}/>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>🏪 {shop.name}</div>
            <div style={{fontSize:10,color:'var(--t3)'}}>{shop.cuisine} · {shop.id}</div>
          </div>
        </div>
        <div onClick={()=>setIsOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 13px',background:isOpen?'rgba(61,255,122,.1)':'rgba(255,255,255,.05)',border:`1.5px solid ${isOpen?'rgba(61,255,122,.3)':'rgba(255,255,255,.08)'}`,borderRadius:50,cursor:'pointer'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:isOpen?'#3DFF7A':'#5A6A5A'}}/>
          <span style={{fontSize:11,fontWeight:800,color:isOpen?'#3DFF7A':'#5A6A5A'}}>{isOpen?'OPEN':'CLOSED'}</span>
        </div>
      </div>

      {/* Alert banner */}
      {newOrders.length>0&&<div style={{margin:'0 16px 10px',padding:'10px 14px',borderRadius:12,background:'rgba(255,140,66,.08)',border:'1px solid rgba(255,140,66,.3)',display:'flex',alignItems:'center',gap:8,animation:'pulseD 2s infinite'}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#FF8C42',animation:'statusP 1s infinite'}}/>
        <div style={{fontSize:12,color:'#FF8C42',fontWeight:700}}>{newOrders.length} naya order aaya! Confirm karo</div>
      </div>}

      <div style={{padding:'0 16px 10px',display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none'}}>
        {[{id:'orders',l:`🆕 New${newOrders.length>0?' ('+newOrders.length+')':''}`},{id:'confirm',l:`✅ Confirmed${confirmedOrders.length>0?' ('+confirmedOrders.length+')':''}`},{id:'packed',l:`📦 Packed${packedOrders.length>0?' ('+packedOrders.length+')':''}`},{id:'history',l:'📋 History'},{id:'dash',l:'📊 Dash'}].map(t=>(
          <div key={t.id} className={`cp ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)} style={{flexShrink:0,padding:'8px 12px',fontSize:11,fontWeight:700}}>{t.l}</div>
        ))}
      </div>

      <div className="scr" style={{position:'relative',padding:'0 16px 24px'}}>
        {tab==='orders'&&<>
          <div className="sh"><div className="st">Naye Orders</div><div style={{fontSize:11,color:'#FF8C42',fontWeight:600}}>{newOrders.length} pending</div></div>
          {newOrders.length===0
            ?<div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <div style={{fontSize:14,fontWeight:700}}>Koi naya order nahi</div>
                <div style={{fontSize:12,marginTop:6}}>Jab order aayega, yahan dikhega</div>
              </div>
            :newOrders.map(o=><OrderCard key={o.id} o={o} showConfirm={true} showPack={false}/>)
          }
        </>}
        {tab==='confirm'&&<>
          <div className="sh"><div className="st">Confirmed — Pack karo</div></div>
          {confirmedOrders.length===0
            ?<div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontSize:13}}>Koi confirmed order nahi</div>
              </div>
            :confirmedOrders.map(o=><OrderCard key={o.id} o={o} showConfirm={false} showPack={true}/>)
          }
        </>}
        {tab==='packed'&&<>
          <div className="sh"><div className="st">Packed — Rider ka intezaar</div></div>
          {packedOrders.length===0
            ?<div style={{textAlign:'center',padding:'40px 20px',color:'var(--t3)'}}>
                <div style={{fontSize:48,marginBottom:12}}>📦</div>
                <div style={{fontSize:13}}>Koi packed order nahi</div>
              </div>
            :packedOrders.map(o=><OrderCard key={o.id} o={o} showConfirm={false} showPack={false}/>)
          }
        </>}
        {tab==='history'&&<>
          <div className="sh"><div className="st">History ({history.length})</div></div>
          {history.length===0?<div style={{textAlign:'center',padding:40,color:'var(--t3)'}}>No history yet</div>:history.map((o,i)=>(
            <div key={o.id} className="gc" style={{padding:'12px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:700}}>#{o.id?.slice(-6).toUpperCase()}</div>
                <div style={{fontSize:13,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div>
              </div>
              <div style={{fontSize:11,color:'var(--t2)',marginBottom:2}}>{o.items?.map(i=>i.name+' ×'+i.qty).join(', ')}</div>
              <div style={{fontSize:10,color:'var(--t3)'}}>{o.createdAt?.seconds?new Date(o.createdAt.seconds*1000).toLocaleString('en-IN'):''}</div>
            </div>
          ))}
        </>}
        {tab==='dash'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{i:'🆕',v:newOrders.length,l:'New Orders',c:'#FF8C42'},{i:'💰',v:`₹${todayRev}`,l:'Today Revenue',c:'#D4AF37'},{i:'📦',v:packedOrders.length,l:'Packed',c:'#3DFF7A'},{i:'📋',v:history.length,l:'Delivered',c:'#3DFF7A'}].map((s,i)=>(
              <div key={i} className="gc" style={{padding:'16px 14px'}}>
                <div style={{fontSize:24,marginBottom:6}}>{s.i}</div>
                <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}

function AdminModal({children,onClose}){
  const ref=React.useRef();
  React.useEffect(()=>{
    const t=setTimeout(()=>{if(ref.current)ref.current.scrollTop=0;},80);
    return()=>clearTimeout(t);
  },[]);
  return <div className="ovl" onClick={onClose} style={{alignItems:'flex-end'}}><div className="modal" ref={ref} onClick={e=>e.stopPropagation()}>{children}</div></div>;
}
function AdminApp({data,setData,onBack}) {
  const [tab,setTab]=useState('dash');
  const [pcTab,setPcTab]=useState('veg');
  const [editId,setEditId]=useState(null);
  const [addP,setAddP]=useState(false);
  const [addS,setAddS]=useState(false);
  const [addR,setAddR]=useState(false);
  const [creds,setCreds]=useState(null);
  const [realOrders,setRealOrders]=useState([]);
  const [loadingOrders,setLoadingOrders]=useState(false);
  const [orderSearch,setOrderSearch]=useState('');
  const [ordersPage,setOrdersPage]=useState(0);
  const ORDERS_PER_PAGE=20;
  const [orderStatusFilter,setOrderStatusFilter]=useState('all');
  const [orderSort,setOrderSort]=useState('newest');
  const [assignOrderId,setAssignOrderId]=useState(null);
  const [showAssignModal,setShowAssignModal]=useState(false);
  const [adminSlides,setAdminSlides]=useState([]);
  const [editSlide,setEditSlide]=useState(null);
  const [addSlide,setAddSlide]=useState(false);
  const [newSlide,setNewSlide]=useState({emoji:'🎯',chip:'New Slide',title:'',sub:'',btn:'Learn More',link:'',imgUrl:'',bg:'linear-gradient(135deg,#0D2010,#0A180A)'});
  const [npF,setNpF]=useState({name:'',nameHi:'',cat:'veg',price:'',unit:'500g',emoji:'🥦',imgUrl:'',stock:'50',about:'',nutrition:{calories:'',protein:'',carbs:'',fat:'',fiber:'',note:''}});
  const [nsF,setNsF]=useState({name:'',owner:'',phone:'',cuisine:'',imgUrl:'',emoji:'🏪',badge:'',deliveryTime:'30-40 min',rating:'4.5'});
  const [nrF,setNrF]=useState({name:'',phone:''});
  const [coupons, setCoupons]=useState([]);
  const [newCoupon, setNewCoupon]=useState({code:'',discount:'',minOrder:'0'});
  const [addCoupon, setAddCoupon]=useState(false);
  const [firestoreRiders, setFirestoreRiders]=useState([]);
  const [sendNotifOpen, setSendNotifOpen]=useState(false);
  const [mandiRates, setMandiRates]=useState([]);
  const [newRate, setNewRate]=useState({item:'',price:'',unit:'kg',emoji:'🥦'});

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'mandiRates'),snap=>{
      setMandiRates(snap.docs.map(d=>({...d.data(),fid:d.id})).sort((a,b)=>a.item?.localeCompare(b.item)));
    },()=>{});
    return()=>unsub();
  },[]);
  const [notifForm, setNotifForm]=useState({title:'',body:''});
  const [sendingNotif, setSendingNotif]=useState(false);
  useEffect(()=>{
    setLoadingOrders(true);
    const unsub=onSnapshot(collection(db,'orders'),snap=>{
      const orders=snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.createdAt?.seconds-a.createdAt?.seconds);
      setRealOrders(orders);
      setLoadingOrders(false);
    });
    return()=>unsub();
  },[]);

  useEffect(()=>{
    const unsub2=onSnapshot(collection(db,'coupons'),snap=>{
      setCoupons(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>unsub2();
  },[]);

  useEffect(()=>{
    // Realtime listener - har change turant reflect hoga
    const unsub=onSnapshot(collection(db,'adSlides'),snap=>{
      setAdminSlides(snap.docs.map(d=>({...d.data(),firestoreId:d.id})));
    },()=>{});
    return()=>unsub();
  },[]);

  useEffect(()=>{
    const unsub3=onSnapshot(collection(db,'riders'),snap=>{
      const rds=snap.docs.map(d=>({...d.data(),firestoreId:d.id}));
      setFirestoreRiders(rds);
      setData(d=>({...d,riders:rds}));
    });
    return()=>unsub3();
  },[]);

  // Admin: own live products listener (so admin always sees fresh Firestore data)
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'products'),snap=>{
      const rawP=snap.docs.map(d=>({...d.data(),id:d.data().id||d.id,firestoreId:d.id})).filter(p=>p.name);
      const seen=new Set();
      const prods=rawP.filter(p=>{const k=p.firestoreId||String(p.id);if(seen.has(k))return false;seen.add(k);return true;});
      if(prods.length>0) setData(d=>({...d,products:prods}));
    });
    return()=>unsub();
  },[]);

  const filteredOrders = realOrders
    .filter(o=>{
      const matchSearch = !orderSearch || 
        o.userName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.userPhone?.includes(orderSearch) ||
        o.id?.slice(-6).toUpperCase().includes(orderSearch.toUpperCase()) ||
        o.items?.some(i=>i.name?.toLowerCase().includes(orderSearch.toLowerCase()));
      const matchStatus = orderStatusFilter==='all' || o.status===orderStatusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a,b)=>{
      if(orderSort==='newest') return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
      if(orderSort==='oldest') return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
      if(orderSort==='highest') return (b.total||0)-(a.total||0);
      if(orderSort==='lowest') return (a.total||0)-(b.total||0);
      return 0;
    });

  const pendingCount=realOrders.filter(o=>o.status==='pending').length;
  const onlineRiders=(data.riders||[]).filter(r=>r.online).length;

  const todayOrders=realOrders.filter(o=>{
    if(!o.createdAt?.seconds) return false;
    const d=new Date(o.createdAt.seconds*1000);
    const today=new Date();
    return d.toDateString()===today.toDateString();
  });
  const todRev=todayOrders.reduce((s,o)=>s+(o.total||0),0);
  const totalRev=realOrders.reduce((s,o)=>s+(o.total||0),0);

  const toggleProd=async(id)=>{
    const prod=data.products.find(p=>p.id===id);
    if(!prod) return;
    const newActive=!prod.active;
    setData(d=>({...d,products:d.products.map(p=>p.id===id?{...p,active:newActive}:p)}));
    try{
      if(prod.firestoreId){
        await updateDoc(doc(db,'products',prod.firestoreId),{active:newActive});
      }
    }catch(e){console.log('Toggle error:',e);}
  };
  const saveProd=async(id,ch)=>{
    setData(d=>({...d,products:d.products.map(p=>p.id===id?{...p,...ch}:p)}));
    try{
      const prod=data.products.find(p=>p.id===id);
      if(prod?.firestoreId){
        await updateDoc(doc(db,'products',prod.firestoreId),ch);
      }
    }catch(e){console.log('SaveProd error:',e);}
  };
  const addNewProd=async()=>{
    if(!npF.name||!npF.price){alert('Name aur price bharein!');return;}
    const catTagMap={veg:'Fresh',fruit:'Fresh',milk:'Fresh',food:'Hot'};
    const catTagHiMap={veg:'ताजा',fruit:'ताजा',milk:'ताजा',food:'गरम'};
    const p={id:Date.now(),name:npF.name,nameHi:npF.nameHi||npF.name,price:+npF.price,unit:npF.unit,emoji:npF.emoji||'🥦',imgUrl:npF.imgUrl||'',cat:npF.cat,stock:+npF.stock,about:npF.about||'',tag:catTagMap[npF.cat]||'New',tagHi:catTagHiMap[npF.cat]||'नया',active:true,createdAt:new Date().toISOString(),nutrition:npF.nutrition||{}};
    try{
      const ref=await addDoc(collection(db,'products'),p);
      p.firestoreId=ref.id;
      alert('✅ Product saved to Firestore!');
    }catch(e){
      alert('Firestore save failed: '+e.message);
      // Only add locally if Firestore failed
      setData(d=>({...d,products:[...d.products,p]}));
    }
    // Note: onSnapshot will auto-update products list from Firestore
    setNpF({name:'',nameHi:'',cat:'veg',price:'',unit:'500g',emoji:'🥦',imgUrl:'',stock:'50',about:'',nutrition:{calories:'',protein:'',carbs:'',fat:'',fiber:'',note:''}});
    setAddP(false);
  };
  const deleteProd=async(id)=>{
    if(!window.confirm('Delete this product?')) return;
    const prod=data.products.find(p=>p.id===id);
    setData(d=>({...d,products:d.products.filter(p=>p.id!==id)}));
    try{
      if(prod?.firestoreId){
        await deleteDoc(doc(db,'products',prod.firestoreId));
      }
    }catch(e){console.log('Delete error:',e);}
  };

  const regShop=async()=>{
    if(!nsF.name||!nsF.owner||!nsF.phone){alert('Name, owner aur phone required hai!');return;}
    const idx=data.shops.length+1;
    const sid=`SHP${String(idx).padStart(3,'0')}`;
    const s={id:sid,name:nsF.name,owner:nsF.owner,phone:nsF.phone,cuisine:nsF.cuisine,imgUrl:nsF.imgUrl||'',emoji:nsF.emoji||'🏪',badge:nsF.badge||'',deliveryTime:nsF.deliveryTime||'30-40 min',rating:parseFloat(nsF.rating)||4.5,pass:`Shop@${String(idx).padStart(3,'0')}`,active:true,totalOrders:0,totalRevenue:0,todayOrders:0,todayRevenue:0};
    try{
      await setDoc(doc(db,'shops',sid),s);
      setData(d=>({...d,shops:[...d.shops,s]}));
      setCreds({type:'Shop',id:s.id,pass:s.pass});
      alert(`✅ Shop registered!\nID: ${s.id}\nPass: ${s.pass}`);
    }catch(e){
      alert('Save failed: '+e.message);
      setData(d=>({...d,shops:[...d.shops,s]}));
    }
    setNsF({name:'',owner:'',phone:'',cuisine:'',imgUrl:'',emoji:'🏪',badge:'',deliveryTime:'30-40 min',rating:'4.5'});
    setAddS(false);
  };
  const regRider=async()=>{
    const idx=(firestoreRiders.length||data.riders.length)+1;
    const rid=nrF.customId||`RDR${String(idx).padStart(3,'0')}`;
    const r={id:rid,name:nrF.name,phone:nrF.phone,pass:nrF.customPass||`Rider@${String(idx).padStart(3,'0')}`,active:true,online:false,totalOrders:0,totalEarnings:0,todayEarnings:0,todayOrders:0,rating:5.0};
    try{
      
      await setDoc(doc(db,'riders',rid),r);
      setCreds({type:'Rider',id:r.id,pass:r.pass});
      alert(`✅ Rider registered!\nID: ${r.id}\nPass: ${r.pass}`);
    }catch(e){
      alert('Save failed: '+e.message+'\n\nRider added locally only.');
      setData(d=>({...d,riders:[...d.riders.filter(x=>x.id!==rid),r]}));
    }
    setNrF({name:'',phone:'',customId:'',customPass:''});
    setAddR(false);
  };
  const toggleShop=id=>setData(d=>({...d,shops:d.shops.map(s=>s.id===id?{...s,active:!s.active}:s)}));
  const toggleRider=id=>setData(d=>({...d,riders:d.riders.map(r=>r.id===id?{...r,active:!r.active}:r)}));
  const fp=(data.products||[]).filter(p=>p&&p.cat===pcTab);
  const allFp=data.products;
  
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <SBar/>
      <div style={{padding:'4px 20px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><div><div style={{fontSize:16,fontWeight:800,color:'#FF8C42'}}>🍓 Master Control</div><div style={{fontSize:11,color:'var(--t3)'}}>Admin: {ADMIN_ID}</div></div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
  <div style={{background:'rgba(255,140,66,.1)',border:'1px solid rgba(255,140,66,.25)',borderRadius:50,padding:'4px 12px',fontSize:11,color:'#FF8C42',fontWeight:700}}>🔐 ADMIN</div>
  <div onClick={onBack} style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.25)',borderRadius:50,padding:'4px 12px',fontSize:11,color:'#FF6B6B',fontWeight:700,cursor:'pointer'}}>Logout</div>
</div>
      </div>
<div style={{display:'flex',overflowX:'auto',padding:'0 20px 10px',gap:6,scrollbarWidth:'none',WebkitOverflowScrolling:'touch',msOverflowStyle:'none',flexShrink:0}}>
        {[{id:'dash',l:'📊 Dash'},{id:'orders',l:'📦 Orders'},{id:'prods',l:'🥦 Prods'},{id:'shops',l:'🏨 Shops'},{id:'riders',l:'🚲 Riders'},{id:'coupons',l:'🏷️ Coupons'},{id:'slides',l:'🎨 Slides'},{id:'mandi',l:'🌾 Mandi'},{id:'reports',l:'📈 Reports'}].map(t=>(<div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'7px 12px',fontSize:11,fontWeight:600,flexShrink:0,borderRadius:50,cursor:'pointer',whiteSpace:'nowrap',background:tab===t.id?'linear-gradient(135deg,#FF8C42,#FF6B20)':'rgba(255,140,66,.08)',color:tab===t.id?'#fff':'#FF8C42',border:`1px solid ${tab===t.id?'transparent':'rgba(255,140,66,.2)'}`}}>{t.l}</div>))}
      </div>
      <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'0 20px 24px',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>

        {tab==='dash'&&<>
          {/* 🔴 LIVE ALERT BANNER */}
          {pendingCount>0&&<div style={{background:'linear-gradient(135deg,rgba(255,140,66,.15),rgba(255,107,32,.08))',border:'1px solid rgba(255,140,66,.4)',borderRadius:16,padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:10,animation:'statusP 2s infinite'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:'#FF8C42',animation:'statusP 1s infinite',flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:'#FF8C42'}}>{pendingCount} New Order{pendingCount>1?'s':''} Waiting!</div><div style={{fontSize:11,color:'var(--t3)'}}>Confirm karo abhi</div></div>
            <button onClick={()=>setTab('orders')} style={{padding:'6px 14px',fontSize:11,fontWeight:800,borderRadius:50,background:'#FF8C42',color:'#fff',border:'none',cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>View →</button>
          </div>}
          {/* ANIMATED STAT CARDS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[
              {i:'📦',v:todayOrders.length,l:"Today's Orders",c:'#3DFF7A',bg:'rgba(61,255,122,.06)',border:'rgba(61,255,122,.2)'},
              {i:'💰',v:`₹${todRev}`,l:"Today's Revenue",c:'#D4AF37',bg:'rgba(212,175,55,.06)',border:'rgba(212,175,55,.2)'},
              {i:'🚴',v:onlineRiders,l:'Riders Online',c:'#3DC8FF',bg:'rgba(61,200,255,.06)',border:'rgba(61,200,255,.2)'},
              {i:'📊',v:realOrders.filter(o=>o.status==='pending').length,l:'Pending Orders',c:'#FF8C42',bg:'rgba(255,140,66,.06)',border:'rgba(255,140,66,.2)'},
            ].map((s,i)=>(
              <div key={i} style={{padding:'16px',borderRadius:16,background:s.bg,border:`1px solid ${s.border}`,cursor:'pointer'}} onClick={()=>{if(i===3)setTab('orders');}}>
                <div style={{fontSize:24,marginBottom:8}}>{s.i}</div>
                <div style={{fontSize:22,fontWeight:900,color:s.c,fontFamily:"'Outfit',sans-serif"}}>{s.v}</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:3,fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* REVENUE TOTAL BANNER */}
          <div style={{background:'linear-gradient(135deg,#1A0A00,#100600)',border:'1px solid rgba(212,175,55,.2)',borderRadius:16,padding:'16px 20px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:12,color:'var(--t3)',marginBottom:4}}>💵 Total Revenue</div><div style={{fontSize:28,fontWeight:900,color:'#D4AF37'}}>₹{totalRev.toLocaleString('en-IN')}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:12,color:'var(--t3)',marginBottom:4}}>📦 Total Orders</div><div style={{fontSize:28,fontWeight:900,color:'#FF8C42'}}>{realOrders.length}</div></div>
          </div>
          {/* Weekly Revenue Chart */}
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:'#FF8C42'}}>📈 Weekly Revenue</div>
            <div style={{fontSize:11,color:'var(--t3)',marginBottom:12}}>Last 7 days</div>
            {(()=>{const days=[{d:'Mon',v:1240},{d:'Tue',v:1850},{d:'Wed',v:980},{d:'Thu',v:2100},{d:'Fri',v:1650},{d:'Sat',v:2800},{d:'Sun',v:todRev||320}];const mx=Math.max(...days.map(d=>d.v));return days.map(day=>(
              <div key={day.d} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                <div style={{fontSize:11,color:'var(--t3)',width:26}}>{day.d}</div>
                <div style={{flex:1,height:7,background:'rgba(255,140,66,.08)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{width:`${Math.round((day.v/mx)*100)}%`,height:'100%',background:'linear-gradient(90deg,#FF8C42,#FF6B20)',borderRadius:99}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:'#FF8C42',width:40,textAlign:'right'}}>₹{day.v>=1000?`${(day.v/1000).toFixed(1)}k`:day.v}</div>
              </div>
            ));})()}
          </div>
          {/* Order Status Breakdown */}
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:12,color:'#FF8C42'}}>🥧 Order Status</div>
            {(()=>{
              const delivered=realOrders.filter(o=>o.status==='delivered').length;
              const processing=realOrders.filter(o=>o.status!=='delivered').length;
              const total=realOrders.length||1;
              return(<>
                {[{l:'✅ Delivered',v:delivered,c:'#3DFF7A'},{l:'🚴 Processing',v:processing,c:'#D4AF37'}].map(s=>(
                  <div key={s.l} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'var(--t2)'}}>{s.l}</span>
                      <span style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v} ({Math.round((s.v/total)*100)}%)</span>
                    </div>
                    <div style={{height:6,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden'}}>
                      <div style={{width:`${Math.round((s.v/total)*100)}%`,height:'100%',background:s.c,borderRadius:99,transition:'width .6s ease'}}/>
                    </div>
                  </div>
                ))}
              </>);
            })()}
          </div>
          {/* Top Products */}
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:12,color:'#FF8C42'}}>🏆 Top Products</div>
            {(()=>{
              const counts={};
              realOrders.forEach(o=>o.items?.forEach(item=>{counts[item.name]=(counts[item.name]||0)+item.qty;}));
              const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
              const max=sorted[0]?.[1]||1;
              return sorted.length===0
                ?<div style={{fontSize:12,color:'var(--t3)',textAlign:'center',padding:'10px 0'}}>No orders yet</div>
                :sorted.map(([name,qty],i)=>(
                  <div key={name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#FF8C42',width:16}}>#{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:600}}>{name}</span>
                        <span style={{fontSize:11,color:'#FF8C42',fontWeight:700}}>{qty} sold</span>
                      </div>
                      <div style={{height:4,background:'rgba(255,140,66,.08)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${Math.round((qty/max)*100)}%`,height:'100%',background:'linear-gradient(90deg,#FF8C42,#FF6B20)',borderRadius:99}}/>
                      </div>
                    </div>
                  </div>
                ));
            })()}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn rip" onClick={()=>setTab('prods')} style={{flex:1,padding:'11px',fontSize:13}}>+ Product</button>
            <button className="btn rip" onClick={()=>{setTab('shops');setAddS(true);}} style={{flex:1,padding:'11px',fontSize:13,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>+ Shop</button>
            <button className="btn rip" onClick={()=>{setTab('riders');setAddR(true);}} style={{flex:1,padding:'11px',fontSize:13,background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>+ Rider</button>
          </div>
        </>}

        {tab==='orders'&&<>
          {/* SEARCH BAR */}
          <div style={{position:'relative',marginBottom:10}}>
            <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:.5}}>🔍</div>
            <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="Search name, phone, order ID..." style={{width:'100%',background:'var(--card)',border:'1px solid rgba(255,140,66,.2)',borderRadius:12,padding:'10px 12px 10px 38px',color:'var(--t)',fontSize:13,fontFamily:"'Outfit',sans-serif",outline:'none'}}/>
            {orderSearch&&<div onClick={()=>setOrderSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:16,opacity:.6}}>✕</div>}
          </div>
          {/* FILTER PILLS */}
          <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:10,scrollbarWidth:'none',paddingBottom:2}}>
            {[{s:'all',l:'All',c:'#FF8C42'},{s:'pending',l:'🕐 Pending',c:'#FF8C42'},{s:'confirmed',l:'✅ Confirmed',c:'#D4AF37'},{s:'packed',l:'📦 Packed',c:'#00C44F'},{s:'out',l:'🚴 Out',c:'#3DC8FF'},{s:'delivered',l:'🏠 Done',c:'#3DFF7A'}].map(f=>(
              <div key={f.s} onClick={()=>setOrderStatusFilter(f.s)} style={{padding:'5px 12px',borderRadius:50,flexShrink:0,cursor:'pointer',fontSize:11,fontWeight:700,background:orderStatusFilter===f.s?f.c:'rgba(255,140,66,.06)',color:orderStatusFilter===f.s?'#000':f.c,border:`1px solid ${orderStatusFilter===f.s?f.c:'rgba(255,140,66,.15)'}`}}>{f.l} {f.s!=='all'?`(${realOrders.filter(o=>o.status===f.s).length})`:''}</div>
            ))}
          </div>
          {/* SORT ROW */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:12,color:'var(--t3)'}}>{filteredOrders.length} orders <span style={{color:'#3DFF7A'}}>● Live</span></div>
            <select value={orderSort} onChange={e=>setOrderSort(e.target.value)} style={{background:'var(--card)',border:'1px solid rgba(255,140,66,.2)',borderRadius:8,padding:'5px 8px',color:'var(--t)',fontSize:11,fontFamily:"'Outfit',sans-serif",outline:'none'}}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
          {loadingOrders
            ? <div style={{textAlign:'center',padding:40,color:'var(--t3)'}}>Loading...</div>
            : filteredOrders.length===0
              ? <div style={{textAlign:'center',padding:40}}><div style={{fontSize:48}}>📭</div><div style={{fontSize:16,fontWeight:700,marginTop:12}}>{orderSearch?'No results found':'No orders yet'}</div></div>
              : filteredOrders.map((o,i)=>(
                <div key={o.id} className="gc" style={{padding:14,marginBottom:10,animation:`fadeUp .3s ease ${i*.04}s both`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#FF8C42'}}>#{o.id.slice(-6).toUpperCase()}</div>
                    <div style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:50,
                      background:{pending:'rgba(255,140,66,.15)',confirmed:'rgba(212,175,55,.15)',packed:'rgba(0,196,79,.15)',out:'rgba(61,200,255,.15)',delivered:'rgba(61,255,122,.15)'}[o.status]||'rgba(212,175,55,.15)',
                      color:{pending:'#FF8C42',confirmed:'#D4AF37',packed:'#00C44F',out:'#3DC8FF',delivered:'#3DFF7A'}[o.status]||'#D4AF37'}}>
                      {{'pending':'🕐 Pending','confirmed':'✅ Confirmed','packed':'📦 Packed','out':'🚴 Out','delivered':'🏠 Delivered'}[o.status]||o.status}
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{o.userName||'Customer'} · {o.userPhone}</div>
                  <div style={{marginBottom:6}}>
                    {o.items?.map((item,j)=>(
                      <div key={j} style={{fontSize:12,color:'var(--t2)'}}>• {item.name} × {item.qty} — ₹{item.price*item.qty}</div>
                    ))}
                  </div>
                  {o.address&&<div style={{fontSize:11,color:'var(--t3)',marginBottom:6}}>📍 {o.address}</div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,marginBottom:8}}>
                    <div style={{fontSize:11,color:'var(--t3)'}}>
                      {o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleString('en-IN') : 'Recent'}
                      {' · '}{o.payMethod==='cod'?'💵 COD':'📱 UPI'}
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div>
                  </div>
                  {o.status!=='delivered'&&<div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    {[
                      {s:'pending',   l:'🕐 Pending'},
                      {s:'packed',    l:'📦 Packed'},
                      {s:'out',       l:'🚴 Out'},
                      {s:'delivered', l:'🏠 Done'},
                    ].filter(st=>st.s!==o.status).map(st=>(
                      <button key={st.s} onClick={async()=>{
                        try{ await updateDoc(doc(db,'orders',o.id),{status:st.s}); }catch(e){console.log(e);}
                      }} style={{padding:'5px 10px',fontSize:12,fontWeight:700,borderRadius:50,background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.2)',color:'#3DFF7A',cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>
                        {st.l}
                      </button>
                    ))}
                    {!o.riderId&&o.status!=='pending'&&<button onClick={()=>{setAssignOrderId(o.id);setShowAssignModal(true);}} style={{padding:'5px 12px',fontSize:11,fontWeight:700,borderRadius:50,background:'rgba(61,200,255,.1)',border:'1px solid rgba(61,200,255,.3)',color:'#3DC8FF',cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>🚴 Assign Rider</button>}
                    {o.riderId&&<span style={{fontSize:11,color:'#3DC8FF',fontWeight:600}}>🚴 Rider Assigned</span>}
                  </div>}
                </div>
              ))
          }
        </>}

        {tab==='prods'&&<>
          <div className="sh"><div className="st">Products ({data.products.length})</div><button className="btn rip" onClick={()=>setAddP(true)} style={{padding:'7px 14px',fontSize:12}}>+ Add</button></div>
          <div className="srow" style={{marginBottom:12}}>
            {[{id:'veg',l:'🥦 Veg'},{id:'fruit',l:'🍎 Fruit'},{id:'milk',l:'🥛 Dairy'},{id:'food',l:'🍛 Food'}].map(t=>(
              <div key={t.id} className={`cp ${pcTab===t.id?'on':''}`} onClick={()=>setPcTab(t.id)} style={{flexShrink:0,fontSize:12}}>{t.l}</div>
            ))}
          </div>
          {fp.map((p,i)=>(
            <div key={p.id} className="gc" style={{padding:'12px 14px',marginBottom:10}}>
              {editId===p.id
                ? <div>
                    <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{p.emoji} Edit {p.name}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRICE (₹)</div><input className="dbi" style={{fontSize:14,padding:'9px 12px'}} defaultValue={p.price} id={`p${p.id}`}/></div>
                      <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>STOCK</div><input className="dbi" style={{fontSize:14,padding:'9px 12px'}} defaultValue={p.stock} id={`s${p.id}`}/></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn rip" onClick={()=>{saveProd(p.id,{price:+document.getElementById(`p${p.id}`).value,stock:+document.getElementById(`s${p.id}`).value});setEditId(null);}} style={{flex:1,padding:'9px',fontSize:12}}>Save ✓</button>
                      <button className="btng" onClick={()=>setEditId(null)} style={{flex:1,padding:'9px',fontSize:12}}>Cancel</button>
                    </div>
                  </div>
                : <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:46,height:46,borderRadius:14,background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:'1px solid rgba(61,255,122,.07)',flexShrink:0}}>{p.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                        <div style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                        <div style={{width:7,height:7,borderRadius:'50%',background:p.active?'#3DFF7A':'#5A6A5A',flexShrink:0}}/>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <span style={{fontSize:13,fontWeight:800,color:'#3DFF7A'}}>₹{p.price}</span>
                        <span style={{fontSize:11,color:'var(--t3)'}}>{p.unit}</span>
                        <span style={{fontSize:11,color:p.stock<20?'#FF6B6B':'var(--t3)',fontWeight:p.stock<20?700:400}}>Stock:{p.stock}{p.stock<20?' ⚠️':''}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <Tog on={p.active} onClick={()=>toggleProd(p.id)}/>
                      <div onClick={()=>setEditId(p.id)} style={{width:30,height:30,borderRadius:8,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="edit" s={14} c="#3DFF7A"/></div>
                      <div onClick={()=>deleteProd(p.id)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>🗑️</div>
                    </div>
                  </div>
              }
            </div>
          ))}
          {addP&&<AdminModal onClose={()=>setAddP(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>🥦 Add New Product</div>
            {/* Image Upload */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>PRODUCT IMAGE (Gallery se upload karo)</div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:64,height:64,borderRadius:14,background:'var(--card)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                  {npF.imgUrl
                    ? <img src={npF.imgUrl} alt="product" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontSize:32}}>{npF.emoji||'🥦'}</span>
                  }
                </div>
                <div style={{flex:1}}>
                  <label style={{display:'block',padding:'9px 14px',borderRadius:12,background:'rgba(61,255,122,.08)',border:'1.5px solid rgba(61,255,122,.3)',color:'#3DFF7A',fontWeight:700,fontSize:12,cursor:'pointer',textAlign:'center',marginBottom:6}}>
                    📷 Gallery se Upload
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setNpF(p=>({...p,imgUrl:ev.target.result}));r.readAsDataURL(f);}}}/>
                  </label>
                  <input className="dbi" style={{fontSize:20,padding:'6px 10px',textAlign:'center'}} placeholder="या Emoji 🥦" value={npF.emoji} onChange={e=>setNpF(p=>({...p,emoji:e.target.value,imgUrl:''}))}/>
                </div>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRICE (₹)</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="50" value={npF.price} onChange={e=>setNpF(p=>({...p,price:e.target.value}))}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRODUCT NAME (ENGLISH)</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. Broccoli" value={npF.name} onChange={e=>setNpF(p=>({...p,name:e.target.value}))}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRODUCT NAME (HINDI)</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. ब्रोकली" value={npF.nameHi} onChange={e=>setNpF(p=>({...p,nameHi:e.target.value}))}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>UNIT</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="500g" value={npF.unit} onChange={e=>setNpF(p=>({...p,unit:e.target.value}))}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>STOCK</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="100" value={npF.stock} onChange={e=>setNpF(p=>({...p,stock:e.target.value}))}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>CATEGORY</div>
              <div style={{display:'flex',gap:6}}>
                {['veg','fruit','milk','food'].map(c=>(<div key={c} className={`cp ${npF.cat===c?'on':''}`} onClick={()=>setNpF(p=>({...p,cat:c}))} style={{fontSize:11,padding:'6px 12px',textTransform:'capitalize'}}>{c}</div>))}
              </div>
            </div>
            {/* About Description */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>📝 ABOUT (Optional · max 5 lines)</div>
              <textarea className="dbi" placeholder="e.g. Fresh onion from local Bhopalgarh farm. Rich in antioxidants." value={npF.about||''} onChange={e=>{const lines=e.target.value.split('\n');if(lines.length<=5)setNpF(p=>({...p,about:e.target.value}));}} style={{resize:'none',height:80,fontSize:12,lineHeight:1.6,fontFamily:"'Outfit',sans-serif"}} maxLength={300}/>
              <div style={{fontSize:10,color:'var(--t3)',textAlign:'right',marginTop:2}}>{(npF.about||'').length}/300</div>
            </div>
            {/* Nutrition - Optional */}
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:14,border:'1px solid rgba(61,255,122,.1)',background:'rgba(61,255,122,.03)'}}>
              <div style={{fontSize:11,color:'#3DFF7A',fontWeight:700,marginBottom:10}}>🥗 Nutrition Info (Optional) — per 100g</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                {[{k:'calories',l:'🔥 Calories (kcal)',ph:'e.g. 34'},{k:'protein',l:'💪 Protein (g)',ph:'e.g. 1.2'},{k:'carbs',l:'🌾 Carbs (g)',ph:'e.g. 7.9'},{k:'fat',l:'🥑 Fat (g)',ph:'e.g. 0.2'},{k:'fiber',l:'🌿 Fiber (g)',ph:'e.g. 2.1'}].map(f=>(
                  <div key={f.k}>
                    <div style={{fontSize:9,color:'var(--t3)',marginBottom:3}}>{f.l}</div>
                    <input className="dbi" style={{fontSize:13,padding:'7px 10px'}} placeholder={f.ph} value={npF.nutrition?.[f.k]||''} onChange={e=>{const v=e.target.value;setNpF(p=>({...p,nutrition:{...(p.nutrition||{}),[f.k]:v}}));}}/>
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,color:'var(--t3)',marginBottom:3}}>📝 Note (optional)</div>
              <input className="dbi" style={{fontSize:12,padding:'7px 10px'}} placeholder="e.g. Rich in Vitamin C" value={npF.nutrition?.note||''} onChange={e=>{const v=e.target.value;setNpF(p=>({...p,nutrition:{...(p.nutrition||{}),note:v}}));}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" onClick={addNewProd} style={{flex:1,padding:'12px'}}>Add Product ✓</button>
              <button className="btng" onClick={()=>setAddP(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
        </>}

        {tab==='shops'&&<>
          <div className="sh"><div className="st">Shops ({data.shops.length})</div><button className="btn rip" onClick={()=>setAddS(true)} style={{padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>+ Register</button></div>
          {data.shops.map((s,i)=>(
            <div key={s.id} className="gc" style={{padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:14,background:'rgba(212,175,55,.1)',border:'1px solid rgba(212,175,55,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏨</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                    <div style={{fontSize:14,fontWeight:700}}>{s.name}</div>
                    <div style={{width:7,height:7,borderRadius:'50%',background:s.active?'#3DFF7A':'#5A6A5A',flexShrink:0}}/>
                  </div>
                  <div style={{fontSize:11,color:'var(--t3)',marginBottom:6}}>{s.owner} · {s.cuisine}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                    <span style={{background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>ID: {s.id}</span>
                    <span style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.15)',color:'#D4AF37',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>Pass: {s.pass}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,color:'var(--t3)'}}>Orders:{s.totalOrders||0} · ₹{(s.totalRevenue||0).toLocaleString()}</span>
                    <Tog on={s.active} onClick={()=>toggleShop(s.id)}/>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {addS&&<AdminModal onClose={()=>setAddS(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>🏪 Register New Shop</div>
            {/* Image Upload */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>SHOP BANNER IMAGE</div>
              <div onClick={()=>document.getElementById('shopImgUp').click()} style={{border:'2px dashed rgba(61,255,122,.25)',borderRadius:12,overflow:'hidden',cursor:'pointer',background:'rgba(61,255,122,.02)',marginBottom:6,height:80,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {nsF.imgUrl?<img src={nsF.imgUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center'}}><div style={{fontSize:22}}>🖼️</div><div style={{fontSize:11,color:'var(--t3)'}}>Tap to upload banner</div></div>}
              </div>
              {nsF.imgUrl&&<div onClick={()=>setNsF(p=>({...p,imgUrl:''}))} style={{fontSize:11,color:'#FF6B6B',cursor:'pointer',textAlign:'center',marginBottom:4}}>✕ Remove</div>}
              <input id="shopImgUp" type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setNsF(p=>({...p,imgUrl:ev.target.result}));r.readAsDataURL(f);}}}/>
            </div>
            {[{l:'Shop Name',k:'name',ph:'e.g. Fresh Corner'},{l:'Owner Name',k:'owner',ph:'Full name'},{l:'Phone',k:'phone',ph:'10-digit'},{l:'Badge (optional)',k:'badge',ph:'e.g. Top Rated'},{l:'Delivery Time',k:'deliveryTime',ph:'e.g. 30-40 min'},{l:'Rating',k:'rating',ph:'e.g. 4.5'},{l:'Emoji (if no image)',k:'emoji',ph:'🏪'}].map(f=>(
              <div key={f.k} style={{marginBottom:10}}>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div>
                <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={f.ph} value={nsF[f.k]||''} onChange={e=>setNsF(p=>({...p,[f.k]:e.target.value}))}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>SHOP CATEGORY <span style={{color:'#FF6B6B'}}>*</span></div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[{id:'veggies',l:'🥦 Veggies+Fruits'},{id:'food',l:'🍱 Food'},{id:'dairy',l:'🥛 Dairy'}].map(c=>(
                  <div key={c.id} onClick={()=>setNsF(p=>({...p,category:c.id}))} style={{padding:'8px 12px',borderRadius:50,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${(nsF.category||'')==c.id?'rgba(212,175,55,.6)':'rgba(212,175,55,.2)'}`,background:(nsF.category||'')==c.id?'rgba(212,175,55,.15)':'transparent',color:(nsF.category||'')==c.id?'#D4AF37':'var(--t3)'}}>{c.l}</div>
                ))}
              </div>
            </div>
            <div style={{background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',borderRadius:12,padding:'10px 12px',marginBottom:14}}>
              <div style={{fontSize:11,color:'#D4AF37',fontWeight:600,marginBottom:2}}>Auto Credentials:</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>ID: SHP{String(data.shops.length+1).padStart(3,'0')} · Pass: Shop@{String(data.shops.length+1).padStart(3,'0')}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" onClick={regShop} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>Register Shop</button>
              <button className="btng" onClick={()=>setAddS(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
        </>}

        {tab==='riders'&&<>
          <div className="sh"><div className="st">Riders ({firestoreRiders.length||data.riders.length})</div><button className="btn rip" onClick={()=>setAddR(true)} style={{padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>+ Register</button></div>
          <div style={{padding:'10px 14px',borderRadius:12,marginBottom:12,background:'rgba(255,140,66,.06)',border:'1px solid rgba(255,140,66,.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:12,color:'#FF8C42',fontWeight:600}}>📢 Send Notification to all users</div>
            <button onClick={()=>setSendNotifOpen(true)} style={{padding:'6px 12px',borderRadius:50,background:'linear-gradient(135deg,#FF8C42,#FF6B20)',color:'#fff',fontWeight:700,fontSize:11,border:'none',cursor:'pointer'}}>Send 📤</button>
          </div>
          {(firestoreRiders.length>0?firestoreRiders:data.riders).map((r,i)=>(
            <div key={r.id} className="gc" style={{padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:14,background:'rgba(0,196,79,.1)',border:'1px solid rgba(0,196,79,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🚲</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                    <div style={{fontSize:14,fontWeight:700}}>{r.name}</div>
                    <div style={{width:7,height:7,borderRadius:'50%',background:r.online?'#3DFF7A':r.active?'#5A6A5A':'#FF6B6B',flexShrink:0}}/>
                    <span style={{fontSize:10,color:r.online?'#3DFF7A':'var(--t3)',fontWeight:600}}>{r.online?'Online':r.active?'Offline':'Disabled'}</span>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    <span style={{background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>ID: {r.id}</span>
                    <span style={{background:'rgba(0,196,79,.08)',border:'1px solid rgba(0,196,79,.15)',color:'#00C44F',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>Pass: {r.pass}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,color:'var(--t3)'}}>⭐{r.rating} · {r.totalOrders} orders</span>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <Tog on={r.active} onClick={()=>toggleRider(r.id)}/>
                      <div onClick={async()=>{if(window.confirm(`Delete rider ${r.name}?`)){try{await deleteDoc(doc(db,'riders',r.id||r.firestoreId));setData(d=>({...d,riders:d.riders.filter(x=>x.id!==r.id)}));}catch(e){alert('Delete failed: '+e.message);}}}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:13}}>🗑️</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(firestoreRiders.length===0&&data.riders.length===0)&&<div style={{textAlign:'center',padding:'30px 0'}}><div style={{fontSize:48}}>🚲</div><div style={{fontSize:14,fontWeight:700,marginTop:10,color:'var(--t3)'}}>No riders yet. Register one!</div></div>}
          {addR&&<AdminModal onClose={()=>setAddR(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>🚲 Register New Rider</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>FULL NAME</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="Rider full name" value={nrF.name} onChange={e=>setNrF(p=>({...p,name:e.target.value}))}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PHONE</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="10-digit mobile" value={nrF.phone} onChange={e=>setNrF(p=>({...p,phone:e.target.value}))}/>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>CUSTOM ID (optional)</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={`Auto: RDR${String((firestoreRiders.length||data.riders.length)+1).padStart(3,'0')}`} value={nrF.customId||''} onChange={e=>setNrF(p=>({...p,customId:e.target.value}))}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>CUSTOM PASSWORD (optional)</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={`Auto: Rider@${String((firestoreRiders.length||data.riders.length)+1).padStart(3,'0')}`} value={nrF.customPass||''} onChange={e=>setNrF(p=>({...p,customPass:e.target.value}))}/>
            </div>
            <div style={{background:'rgba(0,196,79,.06)',border:'1px solid rgba(0,196,79,.15)',borderRadius:12,padding:'12px',marginBottom:14}}>
              <div style={{fontSize:11,color:'#00C44F',fontWeight:700,marginBottom:6}}>🔑 Final Credentials:</div>
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1,background:'rgba(0,0,0,.3)',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'var(--t3)'}}>LOGIN ID</div>
                  <div style={{fontSize:14,fontWeight:800,color:'#3DFF7A'}}>{nrF.customId||`RDR${String((firestoreRiders.length||data.riders.length)+1).padStart(3,'0')}`}</div>
                </div>
                <div style={{flex:1,background:'rgba(0,0,0,.3)',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'var(--t3)'}}>PASSWORD</div>
                  <div style={{fontSize:14,fontWeight:800,color:'#D4AF37'}}>{nrF.customPass||`Rider@${String((firestoreRiders.length||data.riders.length)+1).padStart(3,'0')}`}</div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" onClick={regRider} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>Register Rider ✓</button>
              <button className="btng" onClick={()=>setAddR(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
          {sendNotifOpen&&<AdminModal onClose={()=>setSendNotifOpen(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>📢 Send Notification</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>TITLE</div>
              <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. 🎉 Special Offer!" value={notifForm.title} onChange={e=>{const v=e.target.value;setNotifForm(p=>({...p,title:v}));}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>MESSAGE</div>
              <textarea className="dbi" style={{fontSize:14,padding:'10px 12px',minHeight:80,resize:'none'}} placeholder="Notification message..." value={notifForm.body} onChange={e=>{const v=e.target.value;setNotifForm(p=>({...p,body:v}));}}/>
            </div>
            <div style={{background:'rgba(255,140,66,.06)',border:'1px solid rgba(255,140,66,.15)',borderRadius:12,padding:'10px 12px',marginBottom:14}}>
              <div style={{fontSize:11,color:'#FF8C42'}}>📌 Yeh notification sabhi customers ke app mein dikhegi jab woh bell icon tap karenge.</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" disabled={sendingNotif} onClick={async()=>{
                const title=notifForm.title.trim();
                const body=notifForm.body.trim();
                if(!title||!body){alert('Title aur message daalo!');return;}
                setSendingNotif(true);
                try{
                  // Send to all registered users
                  const usersSnap=await getDocs(collection(db,'users'));
                  const userIds=usersSnap.docs.map(d=>d.id);
                  if(userIds.length===0){
                    // Broadcast without userId (client will show to all)
                    await addDoc(collection(db,'notifications'),{title,body,broadcast:true,read:false,createdAt:serverTimestamp()});
                  } else {
                    await Promise.all(userIds.map(uid=>
                      addDoc(collection(db,'notifications'),{userId:uid,title,body,broadcast:true,read:false,createdAt:serverTimestamp()})
                    ));
                  }
                  setNotifForm({title:'',body:''});
                  setSendNotifOpen(false);
                  alert('✅ Notification sent to '+(userIds.length||'all')+' users!');
                }catch(e){alert('Error: '+e.message);}
                setSendingNotif(false);
              }} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#FF8C42,#FF6B20)',color:'#fff'}}>
                {sendingNotif?'Sending...':'📤 Send Now'}
              </button>
              <button className="btng" onClick={()=>setSendNotifOpen(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
        </>}

        {tab==='mandi'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div className="st">🌾 Mandi Rate Today</div>
            <div style={{fontSize:11,color:'var(--t3)'}}>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
          </div>
          {/* Add new rate */}
          <div className="gc" style={{padding:14,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#FF8C42',marginBottom:10}}>+ Naya Rate Add Karo</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>Sabzi/Fal</div>
                <input className="dbi" style={{fontSize:13,padding:'8px 10px'}} placeholder="e.g. Tomato" value={newRate.item} onChange={e=>setNewRate(r=>({...r,item:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>Emoji</div>
                <input className="dbi" style={{fontSize:18,padding:'6px 10px',textAlign:'center'}} placeholder="🥦" value={newRate.emoji} onChange={e=>setNewRate(r=>({...r,emoji:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>Rate (₹)</div>
                <input className="dbi" style={{fontSize:13,padding:'8px 10px'}} placeholder="e.g. 40" type="number" value={newRate.price} onChange={e=>setNewRate(r=>({...r,price:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>Unit</div>
                <select className="dbi" style={{fontSize:13,padding:'8px 10px',background:'var(--card)',color:'var(--t)',border:'1px solid rgba(61,255,122,.15)'}} value={newRate.unit} onChange={e=>setNewRate(r=>({...r,unit:e.target.value}))}>
                  {['kg','250g','500g','piece','dozen','bundle'].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button className="btn rip" onClick={async()=>{
              if(!newRate.item||!newRate.price){alert('Item aur rate daalo!');return;}
              await addDoc(collection(db,'mandiRates'),{...newRate,price:+newRate.price,date:new Date().toDateString(),updatedAt:serverTimestamp()});
              setNewRate({item:'',price:'',unit:'kg',emoji:'🥦'});
            }} style={{width:'100%',padding:'10px',fontSize:13}}>✅ Rate Save Karo</button>
          </div>
          {/* Today's rates list */}
          {mandiRates.length===0
            ?<div style={{textAlign:'center',padding:'30px',color:'var(--t3)'}}>Koi rate nahi add hua</div>
            :mandiRates.map(r=>(
              <div key={r.fid} className="gc" style={{padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:26}}>{r.emoji||'🥦'}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{r.item}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>per {r.unit}</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:'#3DFF7A'}}>₹{r.price}</div>
                <button onClick={async()=>{try{await deleteDoc(doc(db,'mandiRates',r.fid));}catch(e){}}} style={{width:32,height:32,borderRadius:10,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.2)',color:'#FF6B6B',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🗑</button>
              </div>
            ))
          }
        </>}
        {tab==='reports'&&<>
          <div className="sh"><div className="st">Sales Reports 📈</div></div>
          <div style={{background:'linear-gradient(135deg,rgba(255,140,66,.08),rgba(255,140,66,.04))',border:'1px solid rgba(255,140,66,.2)',borderRadius:20,padding:'20px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--t3)'}}>Total Platform Revenue</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,color:'#FF8C42',marginTop:4}}>₹{totalRev.toLocaleString()}</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{realOrders.length} total orders</div>
          </div>
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Today's Summary</div>
            {[
              {l:'Orders Today',v:todayOrders.length,c:'#3DFF7A'},
              {l:'Revenue Today',v:`₹${todRev}`,c:'#D4AF37'},
              {l:'Avg Order Value',v:`₹${realOrders.length>0?Math.round(totalRev/realOrders.length):0}`,c:'#FF8C42'},
            ].map(r=>(
              <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span>
                <span style={{fontSize:14,fontWeight:800,color:r.c}}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Payment Methods</div>
            {[
              {l:'Cash on Delivery',v:realOrders.filter(o=>o.payMethod==='cod').length,c:'#3DFF7A'},
              {l:'UPI',v:realOrders.filter(o=>o.payMethod==='upi').length,c:'#D4AF37'},
            ].map(r=>(
              <div key={r.l} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'var(--t2)'}}>{r.l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:r.c}}>{r.v} orders</span>
                </div>
                <div className="pbar">
                  <div className="pfill" style={{width:`${realOrders.length>0?(r.v/realOrders.length*100):0}%`,background:`linear-gradient(90deg,${r.c},${r.c}88)`}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="gc" style={{padding:'16px'}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Stock Alert ⚠️</div>
            {data.products.filter(p=>p.stock<20).length===0
              ? <div style={{textAlign:'center',color:'#3DFF7A',fontSize:13}}>✅ All products well stocked!</div>
              : data.products.filter(p=>p.stock<20).map(p=>(
                <div key={p.id} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:13}}>{p.emoji} {p.name}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#FF6B6B'}}>Stock: {p.stock} ⚠️</span>
                </div>
              ))
            }
          </div>
        </>}

        {tab==='coupons'&&<>
  <div className="sh">
    <div className="st">Coupons 🏷️ ({coupons.length})</div>
    <button className="btn rip" onClick={()=>{setAddCoupon(true);setTimeout(()=>document.querySelector('.modal')?.scrollTo(0,0),100);}} style={{padding:'7px 14px',fontSize:12}}>+ Add</button>
  </div>
  {coupons.length===0
    ? <div style={{textAlign:'center',padding:40}}><div style={{fontSize:48}}>🏷️</div><div style={{fontSize:14,fontWeight:700,marginTop:12}}>No coupons yet</div></div>
    : coupons.map((c,i)=>(
      <div key={c.id} className="gc" style={{padding:14,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A',letterSpacing:1}}>{c.code}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:16,fontWeight:800,color:'#D4AF37'}}>₹{c.discount} off</div>
            <div onClick={async()=>{if(window.confirm('Delete this coupon?')){await deleteDoc(doc(db,'coupons',c.id));}}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>🗑️</div>
          </div>
        </div>
        <div style={{fontSize:12,color:'var(--t3)'}}>Min order: ₹{c.minOrder||0} · Max uses: {c.maxUses||'∞'}</div>
        <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>Used: {c.usedCount||0} times</div>
      </div>
    ))
  }
{addCoupon&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setAddCoupon(false)}>
    <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:360,background:'linear-gradient(180deg,#0E160E,#070907)',borderRadius:20,border:'1px solid rgba(61,255,122,.15)',padding:'22px 20px'}}>
      <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>🏷️ Add New Coupon</div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>COUPON CODE</div>
        <input className="dbi" style={{fontSize:14,padding:'10px 12px',textTransform:'uppercase'}} placeholder="e.g. SAVE50" value={newCoupon.code} onChange={e=>setNewCoupon(p=>({...p,code:e.target.value.toUpperCase()}))}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>DISCOUNT AMOUNT (₹)</div>
        <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. 50" type="number" value={newCoupon.discount} onChange={e=>setNewCoupon(p=>({...p,discount:e.target.value}))}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>MIN ORDER AMOUNT (₹)</div>
        <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. 100" type="number" value={newCoupon.minOrder} onChange={e=>setNewCoupon(p=>({...p,minOrder:e.target.value}))}/>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>MAX USES (0 = unlimited)</div>
        <input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="e.g. 10" type="number" value={newCoupon.maxUses||''} onChange={e=>setNewCoupon(p=>({...p,maxUses:e.target.value}))}/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn rip" onClick={async()=>{
          if(!newCoupon.code||!newCoupon.discount){alert('Code aur discount daalo!');return;}
          await addDoc(collection(db,'coupons'),{code:newCoupon.code,discount:+newCoupon.discount,minOrder:+newCoupon.minOrder,maxUses:+newCoupon.maxUses||0,usedCount:0,createdAt:serverTimestamp()});
          setNewCoupon({code:'',discount:'',minOrder:'0'});
          setAddCoupon(false);
        }} style={{flex:1,padding:'12px'}}>Add Coupon ✓</button>
        <button className="btng" onClick={()=>setAddCoupon(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
      </div>
    </div>
  </div>}
        </>}
        {tab==='slides'&&<>
          <div className="sh">
            <div className="st">Ad Slides ({adminSlides.length})</div>
            <button className="btn rip" onClick={()=>{if(adminSlides.length>=6){alert('Max 6 slides allowed! Delete one first.');return;}setAddSlide(true);}} style={{padding:'7px 14px',fontSize:12}}>+ Add Slide</button>
          </div>
          {adminSlides.map((sl,i)=>(
            <div key={sl.id||i} style={{marginBottom:10,borderRadius:16,overflow:'hidden',border:'1px solid rgba(61,255,122,.15)'}}>
              <div style={{background:sl.bg,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:32}}>{sl.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginBottom:2}}>{sl.chip}</div>
                  <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{sl.title}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{sl.sub}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <div onClick={()=>setEditSlide({...sl})} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>✏️</div>
                  <div onClick={async()=>{
                    if(!window.confirm('Delete this slide?')) return;
                    if(sl.firestoreId){try{await deleteDoc(doc(db,'adSlides',sl.firestoreId));}catch(e){}}
                    setAdminSlides(p=>p.filter((_,j)=>j!==i));
                  }} style={{width:32,height:32,borderRadius:10,background:'rgba(255,107,107,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>🗑️</div>
                </div>
              </div>
              <div style={{background:'var(--card)',padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:11,color:'var(--t3)'}}>🔗 {sl.link||'No link'}</span>
                <span style={{fontSize:11,fontWeight:700,color:'#3DFF7A'}}>Btn: {sl.btn}</span>
              </div>
            </div>
          ))}
          {addSlide&&<AdminModal onClose={()=>setAddSlide(false)}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>🎨 Add New Slide</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>SLIDE IMAGE (optional)</div>
              <div onClick={()=>document.getElementById('slideImgUp').click()} style={{border:'2px dashed rgba(61,255,122,.25)',borderRadius:12,padding:'14px',textAlign:'center',cursor:'pointer',background:newSlide.imgUrl?'rgba(61,255,122,.04)':'transparent',marginBottom:6}}>
                {newSlide.imgUrl==='uploading...'
                  ? <div style={{padding:20,color:'#3DFF7A',fontSize:12}}>⏳ Processing...</div>
                  : newSlide.imgUrl
                    ? <img src={newSlide.imgUrl} style={{width:'100%',aspectRatio:'16/9',objectFit:'cover',borderRadius:8}}/>
                    : <div><div style={{fontSize:28,marginBottom:4}}>📷</div><div style={{fontSize:12,color:'var(--t3)'}}>16:9 image upload karo</div></div>}
              </div>
              <input id="slideImgUp" type="file" accept="image/*,image/gif" style={{display:'none'}} onChange={async e=>{
                const file=e.target.files[0];if(!file)return;
                if(file.size>8*1024*1024){alert('8MB se chhota image choose karo!');return;}
                setNewSlide(p=>({...p,imgUrl:'uploading...'}));
                try{
                  const bmp=await createImageBitmap(file);
                  const cvs=document.createElement('canvas');
                  cvs.width=960;cvs.height=540; // 16:9
                  cvs.getContext('2d').drawImage(bmp,0,0,960,540);
                  const compressed=cvs.toDataURL('image/jpeg',0.65);
                  setNewSlide(p=>({...p,imgUrl:compressed,emoji:''}));
                }catch(e){alert('Image error: '+e.message);setNewSlide(p=>({...p,imgUrl:''}));}
              }}/>
            </div>
            {[{l:'Emoji (if no image)',k:'emoji',ph:'🎯'},{l:'Badge Text',k:'chip',ph:'e.g. 🔥 Hot Deal'},{l:'Title',k:'title',ph:'Main heading'},{l:'Subtitle',k:'sub',ph:'Short description'},{l:'Button Text',k:'btn',ph:'e.g. Shop Now'},{l:'Link (URL / milk / bulk)',k:'link',ph:'URL ya milk ya bulk ya blank'}].map(f=>(
              <div key={f.k} style={{marginBottom:10}}>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div>
                <input className="dbi" placeholder={f.ph} value={newSlide[f.k]} onChange={e=>setNewSlide(p=>({...p,[f.k]:e.target.value}))} style={{fontSize:13,padding:'9px 12px'}}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>BACKGROUND COLOR</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['linear-gradient(135deg,#0D2010,#0A180A)','linear-gradient(135deg,#1A0A00,#100600)','linear-gradient(135deg,#0A0D1A,#060710)','linear-gradient(135deg,#1A001A,#100010)','linear-gradient(135deg,#001A0A,#000E05)','linear-gradient(135deg,#1A1000,#0A0800)'].map(bg=>(
                  <div key={bg} onClick={()=>setNewSlide(p=>({...p,bg}))} style={{width:44,height:30,borderRadius:8,background:bg,border:newSlide.bg===bg?'2px solid #3DFF7A':'2px solid transparent',cursor:'pointer'}}/>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" onClick={async()=>{
                if(!newSlide.title){alert('Title daalo!');return;}
                if(newSlide.imgUrl==='uploading...'){alert('Image abhi process ho rahi hai, wait karo!');return;}
                const sl={...newSlide,id:Date.now()};
                // Check image size - Firestore 1MB limit
                if(sl.imgUrl&&sl.imgUrl.length>900000){
                  alert('❌ Image bahut badi hai! Chhoti image use karo ya sirf emoji rakho.');return;
                }
                try{
                  const ref=await addDoc(collection(db,'adSlides'),sl);
                  sl.firestoreId=ref.id;
                  setAdminSlides(p=>[...p,sl]);
                  setAddSlide(false);
                  setNewSlide({emoji:'🎯',chip:'New Slide',title:'',sub:'',btn:'Learn More',link:'',imgUrl:'',bg:'linear-gradient(135deg,#0D2010,#0A180A)'});
                  alert('✅ Slide saved to cloud!');
                }catch(e){
                  alert('❌ Save failed: '+e.message+'. Image bahut badi hai, emoji use karo ya chhoti image lo.');
                }
              }} style={{flex:1,padding:'12px'}}>Save ✓</button>
              <button className="btng" onClick={()=>setAddSlide(false)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
          {editSlide&&<AdminModal onClose={()=>setEditSlide(null)}>
            <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>✏️ Edit Slide</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>SLIDE IMAGE / GIF (16:9)</div>
              <div onClick={()=>document.getElementById('editSlideImg').click()} style={{border:'2px dashed rgba(61,255,122,.25)',borderRadius:12,overflow:'hidden',cursor:'pointer',background:'rgba(61,255,122,.02)',marginBottom:6,aspectRatio:'16/9',display:'flex',alignItems:'center',justifyContent:'center',minHeight:80}}>
                {editSlide.imgUrl
                  ? <img src={editSlide.imgUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <div style={{textAlign:'center'}}><div style={{fontSize:26,marginBottom:4}}>🖼️</div><div style={{fontSize:11,color:'var(--t3)'}}>Tap to upload image / GIF</div></div>}
              </div>
              {editSlide.imgUrl&&<div onClick={()=>setEditSlide(p=>({...p,imgUrl:''}))} style={{fontSize:11,color:'#FF6B6B',cursor:'pointer',textAlign:'center',marginBottom:6}}>✕ Remove image</div>}
              <input id="editSlideImg" type="file" accept="image/*,.gif" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setEditSlide(p=>({...p,imgUrl:ev.target.result}));r.readAsDataURL(f);}}}/>
            </div>
            {[{l:'Emoji (if no image)',k:'emoji'},{l:'Badge Text',k:'chip'},{l:'Title',k:'title'},{l:'Subtitle',k:'sub'},{l:'Button Text',k:'btn'},{l:'Link',k:'link'}].map(f=>(
              <div key={f.k} style={{marginBottom:10}}>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div>
                <input className="dbi" value={editSlide[f.k]||''} onChange={e=>setEditSlide(p=>({...p,[f.k]:e.target.value}))} style={{fontSize:13,padding:'9px 12px'}}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>BACKGROUND</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['linear-gradient(135deg,#0D2010,#0A180A)','linear-gradient(135deg,#1A0A00,#100600)','linear-gradient(135deg,#0A0D1A,#060710)','linear-gradient(135deg,#1A001A,#100010)','linear-gradient(135deg,#001A0A,#000E05)','linear-gradient(135deg,#1A1000,#0A0800)'].map(bg=>(
                  <div key={bg} onClick={()=>setEditSlide(p=>({...p,bg}))} style={{width:44,height:30,borderRadius:8,background:bg,border:editSlide.bg===bg?'2px solid #3DFF7A':'2px solid transparent',cursor:'pointer'}}/>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn rip" onClick={async()=>{
                try{if(editSlide.firestoreId)await updateDoc(doc(db,'adSlides',editSlide.firestoreId),editSlide);}catch(e){}
                setAdminSlides(p=>p.map(s=>(s.firestoreId&&s.firestoreId===editSlide.firestoreId)||s.id===editSlide.id?editSlide:s));
                setEditSlide(null);alert('✅ Updated!');
              }} style={{flex:1,padding:'12px'}}>Update ✓</button>
              <button className="btng" onClick={()=>setEditSlide(null)} style={{flex:1,padding:'12px'}}>Cancel</button>
            </div>
          </AdminModal>}
        </>}
        {creds&&<div className="ovl" onClick={()=>setCreds(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>🎉</div>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{creds.type} Registered!</div>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:18}}>Share these credentials</div>
            <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.2)',borderRadius:14,padding:'16px',marginBottom:14}}>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>Login ID</div>
              <div style={{fontSize:22,fontWeight:800,color:'#3DFF7A'}}>{creds.id}</div>
              <div className="divr"/>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>Password</div>
              <div style={{fontSize:20,fontWeight:800,color:'#D4AF37'}}>{creds.pass}</div>
            </div>
            <button className="btn rip" onClick={()=>setCreds(null)} style={{width:'100%',padding:'14px',fontSize:14}}>Done ✓</button>
          </div>
        </div></div>}
      </div>
    </div>
  );
}

/* ═══════════ ROOT APP ═══════════ */
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  componentDidCatch(e,info){console.error('App crash:',e,info);}
  render(){
    if(this.state.hasError){
      return <div style={{position:'fixed',inset:0,background:'#060906',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{fontSize:48,marginBottom:16}}>🧺</div>
        <div style={{color:'#3DFF7A',fontSize:18,fontWeight:800,marginBottom:8}}>Daily Basket</div>
        <div style={{color:'#8A9A8A',fontSize:13,marginBottom:24,textAlign:'center'}}>Something went wrong. Please refresh.</div>
        <button onClick={()=>window.location.reload()} style={{padding:'12px 32px',background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer'}}>🔄 Refresh App</button>
      </div>;
    }
    return this.props.children;
  }
}

export default function DailyBasket() {
  // phases: splash → login → otp → location → language → app
const [phase,  setPhase ] = useState(()=>{
  try{
    const isAdmin=localStorage.getItem('db_admin')==='true';
    const hasRider=!!localStorage.getItem('db_rider');
    const hasShop=!!localStorage.getItem('db_shop');
    const hasCust=!!localStorage.getItem('db_cust_user');
    if(isAdmin||hasRider||hasShop||hasCust) return 'app';
    return 'splash';
  }catch(e){return 'splash';}
});
const [user,   setUser  ] = useState(null);
const [authReady, setAuthReady] = useState(false);
  useEffect(()=>{
  let unsub=()=>{};
  try {
    unsub=onAuthStateChanged(auth,u=>{
      try {
        // Admin portal mein hain to phase/portal override mat karo
        const currentPortal=localStorage.getItem('db_portal')||'customer';
        const isAdminPortal=currentPortal==='admin'||localStorage.getItem('db_admin')==='true';
        if(u && !isAdminPortal){
          let savedName='User';
          try { savedName=localStorage.getItem('db_name')||'User'; } catch(e) {}
          const uData={name:u.displayName||savedName, phone:u.phoneNumber||'', uid:u.uid};
          setUser(uData);
          setPhase('app');
          setDoc(doc(db,'users',u.uid),{name:uData.name,phone:uData.phone,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
        } else if(!u && !isAdminPortal) {
          // Custom OTP login session restore
          try {
            const saved=localStorage.getItem('db_cust_user');
            if(saved){const u2=JSON.parse(saved);setUser(u2);setPhase('app');}
          } catch(e){}
        }
      } catch(e){ console.log('Auth user error:',e); }
      setAuthReady(true);
    });
  } catch(e) {
    console.log('Auth init error:',e);
    setAuthReady(true);
  }
  return()=>{ try{ unsub(); }catch(e){} };
},[]);
  const [lang,   setLang  ] = useState('en');
  const [data,   setData  ] = useState(mkData());
  const [portal, setPortal] = useState(()=>{try{return localStorage.getItem('db_portal')||'customer';}catch(e){return 'customer';}});
  const [riderU, setRiderU] = useState(()=>{try{const r=localStorage.getItem('db_rider');return r?JSON.parse(r):null;}catch(e){return null;}});
  const [shopU,  setShopU ] = useState(()=>{try{const s=localStorage.getItem('db_shop');return s?JSON.parse(s):null;}catch(e){return null;}});
  const [adminA, setAdminA] = useState(()=>{try{return localStorage.getItem('db_admin')==='true';}catch(e){return false;}});

  // Save portal sessions to localStorage
  useEffect(()=>{try{localStorage.setItem('db_portal',portal);}catch(e){}}, [portal]);
  useEffect(()=>{try{if(riderU)localStorage.setItem('db_rider',JSON.stringify(riderU));else localStorage.removeItem('db_rider');}catch(e){}}, [riderU]);
  useEffect(()=>{try{if(shopU)localStorage.setItem('db_shop',JSON.stringify(shopU));else localStorage.removeItem('db_shop');}catch(e){}}, [shopU]);
  useEffect(()=>{try{localStorage.setItem('db_admin',adminA?'true':'false');}catch(e){}}, [adminA]);
  const [theme, setTheme] = useState(()=>{ try{return localStorage.getItem('db_theme')||'eco';}catch(e){return 'eco';} });
  useEffect(()=>{ try{localStorage.setItem('db_theme',theme);}catch(e){} },[theme]);

 const handleCapSelect = id => {
  if(id==='help') {
    setPortal('help');
    setPhase('app');
  } else if(id==='admin'||id==='rider'||id==='shop') {
    setPortal(id);
    setPhase('app');
  } else {
    setPortal(id);
  }
};
  const renderContent = () => {
    if(!authReady) return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,animation:'statusP 1.5s infinite'}}>🧺</div>
      <div style={{color:'#3DFF7A',fontSize:14,fontWeight:600}}>Loading...</div>
    </div>;
    if(phase==='splash') return <Splash onDone={()=>setPhase('login')} onCapSelect={handleCapSelect}/>;
    if(phase==='login')  return <CustomerLogin onLogin={u=>{setUser(u);setPhase('location');}}/>;
    if(phase==='location') return <LocationScreen user={user} onAllow={()=>setPhase('language')} onSkip={()=>setPhase('language')}/>;
    if(phase==='language') return <LanguageScreen user={user} onSelect={l=>{setLang(l);setPhase('app');}}/>;
    if(phase==='app') {
      if(portal==='customer') return <CustomerApp user={user} lang={lang} setLang={setLang} data={data} setData={setData} theme={theme} setTheme={setTheme}/>;
      if(portal==='rider') return (!riderU?<LoginForm color="#00C44F" icon="🚲" role="Rider" cred={(id,p)=>data.riders.find(r=>r.id===id&&r.pass===p&&r.active)||null} onLogin={r=>setRiderU(r)} onBack={()=>{setRiderU(null);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_rider');localStorage.removeItem('db_portal');}catch(e){}}} hint={null}/>:<RiderApp rider={riderU} data={data} setData={setData} onBack={()=>{setRiderU(null);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_rider');localStorage.removeItem('db_portal');}catch(e){}}}/>);
      if(portal==='shop') return (!shopU?<LoginForm color="#D4AF37" icon="🏨" role="Shop" cred={(id,p)=>data.shops.find(s=>s.id===id&&s.pass===p&&s.active)||null} onLogin={s=>setShopU(s)} onBack={()=>{setShopU(null);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_shop');localStorage.removeItem('db_portal');}catch(e){}}} hint={null}/>:<ShopApp shop={shopU} data={data} setData={setData} onBack={()=>{setShopU(null);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_shop');localStorage.removeItem('db_portal');}catch(e){}}}/>);
      if(portal==='admin') {
        if(!adminA) return <LoginForm color="#FF8C42" icon="🍓" role="Admin" cred={(id,p)=>(id===ADMIN_ID&&p===ADMIN_PASS)?true:null} onLogin={()=>setAdminA(true)} onBack={()=>{setAdminA(false);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_admin');localStorage.removeItem('db_portal');}catch(e){}}} hint={null}/>;
        return <AdminApp data={data} setData={setData} onBack={()=>{setAdminA(false);setPortal('customer');setPhase('splash');try{localStorage.removeItem('db_admin');localStorage.removeItem('db_portal');}catch(e){}}}/>;
      }
      if(portal==='help') return (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
          <SBar/>
          <div style={{padding:'4px 20px 14px',display:'flex',alignItems:'center',gap:12}}><BBtn onClick={()=>{setPortal('customer');if(!user)setPhase('splash');}}/><span style={{fontSize:17,fontWeight:800}}>How to Use 📖</span></div>
          <div className="scr" style={{position:'relative',padding:'0 20px 30px'}}>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:18}}>New to Daily Basket? Follow these steps.</div>
            {[{icon:'📱',title:'Open Daily Basket',body:"You're on the Customer home screen by default."},{icon:'🛒',title:'Browse & Add Items',body:'Browse veggies, fruits, milk and food. Tap + to add.'},{icon:'🧺',title:'View Basket',body:'A floating cart bar appears. Tap it to checkout.'},{icon:'✅',title:'Place Order',body:'Confirm and tap "Place Order".'},{icon:'🚴',title:'Track Delivery',body:'Watch: Confirmed → Packed → On the way → Delivered!'},{icon:'🌱',title:'Eco Points',body:'Every order earns Green Points & saves plastic.'}].map((s,i)=>(
              <div key={i} style={{display:'flex',gap:14,marginBottom:14,animation:`fadeUp .4s ease ${i*.08}s both`}}>
                <div style={{width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,#1A3320,#0E2318)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{s.icon}</div>
                <div className="gc" style={{flex:1,padding:'12px 14px'}}><div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{s.title}</div><div style={{fontSize:12,color:'var(--t2)',lineHeight:1.6}}>{s.body}</div></div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const sc=window.innerWidth/390;
  const vh=Math.ceil(window.innerHeight/sc);
  let safeContent;
  try {
    safeContent = renderContent();
  } catch(e) {
    console.error('Render crash:', e);
    safeContent = (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:16}}>
        <div style={{fontSize:48}}>🧺</div>
        <div style={{color:'#3DFF7A',fontSize:18,fontWeight:800}}>Daily Basket</div>
        <div style={{color:'#8A9A8A',fontSize:13,textAlign:'center'}}>Kuch problem aayi. Refresh karo.</div>
        <button onClick={()=>window.location.reload()} style={{padding:'12px 32px',background:'linear-gradient(135deg,#3DFF7A,#00C44F)',color:'#0A1A0A',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer'}}>🔄 Refresh</button>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <div style={{width:'100vw',height:'100dvh',background:'#070907',overflow:'hidden',position:'fixed',top:0,left:0}}>
        <style>{CSS}</style>
        <div className="phone" style={{width:390,height:vh,transform:`scale(${sc})`,transformOrigin:'top left',...getThemeStyle(theme)}}>
          {safeContent}
        </div>
      </div>
    </ErrorBoundary>
  );
  }
