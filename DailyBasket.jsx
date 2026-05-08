import { useState, useEffect } from "react";
import { auth, db, messaging, requestNotificationPermission, onMessage } from "./firebase";
import { collection, addDoc, getDocs, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
/* ═══════════ GLOBAL CSS ═══════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
:root{--bg:#070907;--card:#0F160F;--green:#3DFF7A;--g2:#00C44F;--gdim:#1A3320;--gold:#D4AF37;--glass:rgba(255,255,255,.04);--gb:rgba(61,255,122,.12);--t:#F0F4F0;--t2:#8A9A8A;--t3:#5A6A5A;}
body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--t);overflow:hidden;}
.btn{background:linear-gradient(135deg,var(--btn1),var(--btn2)) !important;color:var(--btnTxt) !important;box-shadow:0 4px 20px var(--shadow) !important;}
.phone{width:390px;height:844px;background:var(--bg);border-radius:44px;overflow:hidden;position:relative;
  box-shadow:0 0 0 8px #1A1A1A,0 0 0 10px #222,0 30px 80px rgba(0,0,0,.9),0 0 80px rgba(61,255,122,.08);}
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
.sbar{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;font-size:12px;font-weight:600;}
.bnav{position:absolute;bottom:0;left:0;right:0;height:80px;background:rgba(7,9,7,.95);backdrop-filter:blur(30px);border-top:1px solid rgba(61,255,122,.08);display:flex;align-items:flex-start;justify-content:space-around;padding-top:12px;z-index:100;}
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
.modal{width:100%;background:linear-gradient(180deg,#0E160E,#070907);border-radius:28px 28px 0 0;border-top:1px solid rgba(61,255,122,.15);padding:22px 20px 44px;animation:modalUp .32s cubic-bezier(.34,1.2,.64,1) both;}
`;


/* ═══════════ THEMES ═══════════ */
const THEMES = {
  eco:     {
    name:'Eco Friendly', nameHi:'इको फ्रेंडली', icon:'🌿',
    desc:'Default green theme', descHi:'डिफ़ॉल्ट हरी थीम',
    vars:{'--bg':'#070907','--card':'#0F160F','--green':'#3DFF7A','--g2':'#00C44F','--gdim':'#1A3320','--gold':'#D4AF37','--glass':'rgba(255,255,255,.04)','--gb':'rgba(61,255,122,.12)','--t':'#F0F4F0','--t2':'#8A9A8A','--t3':'#5A6A5A','--btn1':'#3DFF7A','--btn2':'#00C44F','--btnTxt':'#0A1A0A','--shadow':'rgba(61,255,122,.35)'},
  },
  premium: {
    name:'Premium', nameHi:'प्रीमियम', icon:'👑',
    desc:'Black & Gold luxury', descHi:'ब्लैक गोल्ड लक्ज़री',
    vars:{'--bg':'#080808','--card':'#0E0E0E','--green':'#D4AF37','--g2':'#C49A20','--gdim':'#1C1600','--gold':'#D4AF37','--glass':'rgba(212,175,55,.06)','--gb':'rgba(212,175,55,.22)','--t':'#F5F0E8','--t2':'#9A8A6A','--t3':'#6A5A4A','--btn1':'#D4AF37','--btn2':'#C49A20','--btnTxt':'#0A0800','--shadow':'rgba(212,175,55,.4)'},
  },
  light:   {
    name:'Light', nameHi:'लाइट', icon:'☀️',
    desc:'Clean white theme', descHi:'सफेद लाइट थीम',
    vars:{'--bg':'#F2F5F2','--card':'#FFFFFF','--green':'#00A843','--g2':'#007830','--gdim':'#E8F5EC','--gold':'#C49A20','--glass':'rgba(0,168,67,.06)','--gb':'rgba(0,168,67,.16)','--t':'#1A2A1A','--t2':'#4A6A4A','--t3':'#8A9A8A','--btn1':'#00A843','--btn2':'#007830','--btnTxt':'#FFFFFF','--shadow':'rgba(0,168,67,.3)'},
  },
};

function getThemeStyle(th) {
  const v = THEMES[th].vars;
  return Object.fromEntries(Object.entries(v).map(([k,val])=>[k,val]));
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
  riders:[
    {id:'RDR001',name:'Ramesh Kumar',phone:'9876540001',pass:'Rider@001',active:true,online:false,totalOrders:47,totalEarnings:8450,todayEarnings:280,todayOrders:3,rating:4.9},
    {id:'RDR002',name:'Suresh Meena',phone:'9876540002',pass:'Rider@002',active:true,online:true, totalOrders:32,totalEarnings:5800,todayEarnings:150,todayOrders:2,rating:4.7},
  ],
  shops:[
    {id:'SHP001',name:'Green Leaf Kitchen',owner:'Ravi Sharma', phone:'9876541001',pass:'Shop@001',active:true,cuisine:'Healthy Food',totalOrders:124,totalRevenue:45600,todayOrders:8,todayRevenue:2800},
    {id:'SHP002',name:'Spice Garden',      owner:'Mohit Patel', phone:'9876541002',pass:'Shop@002',active:true,cuisine:'Indian Food', totalOrders:89, totalRevenue:32400,todayOrders:5,todayRevenue:1850},
  ],
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

const SBar = () => <div className="sbar"><span>9:41</span><div style={{display:'flex',gap:5,alignItems:'center'}}><span>●●●</span><span>WiFi</span><span>⚡</span></div></div>;
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
      <div style={{marginBottom:36,animation:'floatY 3s ease-in-out infinite',filter:'drop-shadow(0 0 40px rgba(61,255,122,.35))'}}>
        <div style={{fontSize:110,lineHeight:1,textAlign:'center'}}>🧺</div>
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
function AddressScreen({onBack, onConfirm, userId}) {
  const [flat, setFlat]=useState('');
  const [area, setArea]=useState('');
  const [city, setCity]=useState('Bhopalgarh');
  const [type, setType]=useState('home');
  const [loading, setLoading]=useState(false);
  const [gpsLoading, setGpsLoading]=useState(false);

  const getGPS=()=>{
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const {latitude,longitude}=pos.coords;
        const res=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data=await res.json();
        const addr=data.address;
        setFlat(addr.road||addr.suburb||'');
        setArea(addr.suburb||addr.neighbourhood||addr.village||'');
        setCity(addr.city||addr.town||addr.village||'Bhopalgarh');
      }catch(e){alert('Location fetch failed');}
      setGpsLoading(false);
    },err=>{alert('GPS permission denied');setGpsLoading(false);});
  };

  const save=async()=>{
    if(!flat.trim()){alert('Flat/House number daalo');return;}
    if(!area.trim()){alert('Area/Mohalla daalo');return;}
    setLoading(true);
    const addrObj={flat,area,city,type,full:`${flat}, ${area}, ${city}`};
    try{
      if(userId) await addDoc(collection(db,'users',userId,'addresses'),{...addrObj,createdAt:serverTimestamp()});
    }catch(e){console.log('Address save error:',e);}
    setLoading(false);
    onConfirm(addrObj.full);
  };

  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <SBar/>
      <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <BBtn onClick={onBack}/>
        <div><div style={{fontSize:18,fontWeight:800}}>🗺️ Delivery Address</div><div style={{fontSize:12,color:'var(--t3)'}}>Where should we deliver?</div></div>
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 100px'}}>
        <button onClick={getGPS} disabled={gpsLoading} style={{width:'100%',padding:'14px',borderRadius:14,background:'rgba(61,255,122,.08)',border:'1.5px solid rgba(61,255,122,.3)',color:'#3DFF7A',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {gpsLoading?'📡 Getting location...':'📍 Use Current Location (GPS)'}
        </button>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:8,letterSpacing:.8,textTransform:'uppercase'}}>Address Type</div>
          <div style={{display:'flex',gap:8}}>
            {[{id:'home',icon:'🏠',label:'Home'},{id:'work',icon:'💼',label:'Work'},{id:'other',icon:'📍',label:'Other'}].map(tp=>(
              <div key={tp.id} onClick={()=>setType(tp.id)} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${type===tp.id?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:type===tp.id?'rgba(61,255,122,.08)':'transparent',cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:18}}>{tp.icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:type===tp.id?'#3DFF7A':'var(--t3)',marginTop:4}}>{tp.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Flat / House No.</div>
          <input className="dbi" placeholder="e.g. House No. 12, Near Temple" value={flat} onChange={e=>setFlat(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Area / Mohalla</div>
          <input className="dbi" placeholder="e.g. Shastri Nagar" value={area} onChange={e=>setArea(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>City</div>
          <input className="dbi" placeholder="e.g. Bhopalgarh" value={city} onChange={e=>setCity(e.target.value)}/>
        </div>
        {flat&&area&&(
          <div style={{padding:'12px 14px',borderRadius:12,background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.15)',marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--t3)',marginBottom:4}}>📦 Delivery to:</div>
            <div style={{fontSize:13,fontWeight:600,color:'#3DFF7A'}}>{flat}, {area}, {city}</div>
          </div>
        )}
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 30px',background:'rgba(7,9,7,.95)',backdropFilter:'blur(20px)'}}>
        <button className="btn rip" onClick={save} disabled={loading} style={{width:'100%',padding:17,fontSize:16}}>
          {loading?'Saving...':'✅ Confirm Address & Place Order'}
        </button>
      </div>
    </div>
  );
}
function CustomerLogin({onLogin}) {
  const [name,  setName ] = useState('');
  const [phone, setPhone] = useState('');
  const [otp,   setOtp  ] = useState('');
  const [step,  setStep ] = useState('phone');
  const [confirmObj, setConfirmObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,   setErr  ] = useState('');

  const sendOTP = async () => {
    if(!name.trim()){setErr('Please enter your name');return;}
    if(phone.length!==10){setErr('Enter a valid 10-digit mobile number');return;}
    setErr('');
    setLoading(true);
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, 'recaptcha-container', {size:'invisible'}
      );
      const result = await signInWithPhoneNumber(
        auth, '+91'+phone, window.recaptchaVerifier
      );
      setConfirmObj(result);
      setStep('otp');
    } catch(e) {
      setErr('OTP send nahi hua: '+e.message);
      if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if(otp.length!==6){setErr('6 digit OTP daalo');return;}
    setLoading(true);
    setErr('');
    try {
      const result = await confirmObj.confirm(otp);
      const uid = result.user.uid;
      try {
        await addDoc(collection(db,'users'), {
          uid,
          name: name.trim(),
          phone,
          createdAt: serverTimestamp()
        });
      } catch(e) { console.log('Profile save:',e); }
      onLogin({name:name.trim(), phone, uid});
    } catch(e) {
      setErr('Galat OTP! Dobara try karo.');
      setLoading(false);
    }
  };

  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 20%,#0C1C0C,#070907)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <SBar/>
      <div style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'10px 28px 40px'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 0 30px',animation:'fadeUp .6s ease both'}}>
          <div style={{fontSize:60,marginBottom:16,animation:'floatY 3s ease-in-out infinite'}}>🧺</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:800,textAlign:'center',background:'linear-gradient(135deg,#F0F4F0,#3DFF7A)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Daily Basket</div>
          <div style={{fontSize:14,color:'var(--t3)',marginTop:6,textAlign:'center'}}>Fresh groceries delivered to your door</div>
        </div>

        {step==='phone' ? (
          <div style={{animation:'fadeUp .6s ease .15s both'}}>
            <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Let's get started!</div>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:28}}>Enter your details to continue</div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Your Name</div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><Ic n="user" s={16} c="#5A6A5A"/></div>
                <input className="dbi" style={{paddingLeft:42}} placeholder="Enter your full name" value={name} onChange={e=>{setName(e.target.value);setErr('');}}/>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:'var(--t3)',fontWeight:700,marginBottom:7,letterSpacing:.8,textTransform:'uppercase'}}>Mobile Number</div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:6}}>
                  <Ic n="phone" s={16} c="#5A6A5A"/>
                  <span style={{fontSize:13,color:'#5A6A5A',fontWeight:600,borderRight:'1px solid rgba(255,255,255,.1)',paddingRight:8}}>+91</span>
                </div>
                <input className="dbi" style={{paddingLeft:78}} type="tel" maxLength={10} placeholder="10-digit mobile" value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,''));setErr('');}}/>
              </div>
            </div>

            <div id="recaptcha-container"></div>

            {err&&<div style={{fontSize:12,color:'#FF6B6B',background:'rgba(255,107,107,.08)',padding:'10px 14px',borderRadius:10,marginBottom:16}}>{err}</div>}

            <button className="btn rip" onClick={sendOTP} disabled={loading} style={{width:'100%',padding:'17px',fontSize:16,marginTop:8}}>
              {loading ? 'Sending OTP...' : 'Next — Get OTP →'}
            </button>
          </div>
        ) : (
          <div style={{animation:'fadeUp .6s ease both'}}>
            <div onClick={()=>setStep('phone')} style={{display:'flex',alignItems:'center',gap:8,marginBottom:24,cursor:'pointer'}}>
              <Ic n="back" s={18} c="#8A9A8A"/>
              <span style={{fontSize:14,color:'var(--t3)'}}>Back</span>
            </div>
            <div style={{textAlign:'center',marginBottom:28}}>
              <div style={{fontSize:40,marginBottom:12}}>📱</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Verify OTP</div>
              <div style={{fontSize:13,color:'var(--t3)'}}>We sent a 6-digit OTP to</div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--green)',marginTop:4}}>+91 {phone}</div>
            </div>

            <input className="dbi" type="tel" maxLength={6} placeholder="Enter 6-digit OTP" value={otp}
              onChange={e=>{setOtp(e.target.value.replace(/\D/g,''));setErr('');}}
              style={{textAlign:'center',fontSize:24,letterSpacing:12,marginBottom:16}}/>

            {err&&<div style={{fontSize:12,color:'#FF6B6B',background:'rgba(255,107,107,.08)',padding:'10px 14px',borderRadius:10,marginBottom:16}}>{err}</div>}

            <button className="btn rip" onClick={verifyOTP} disabled={loading} style={{width:'100%',padding:'17px',fontSize:16}}>
              {loading ? 'Verifying...' : 'Verify & Login ✓'}
            </button>
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
function CustomerApp({user, lang, data, theme, setTheme}) {
  const t = T[lang]||T.en;
  const isHi = lang==='hi';
  const fam = isHi?"'Noto Sans Devanagari','Outfit',sans-serif":"'Outfit',sans-serif";

  const [scr,    setScr   ]=useState('home');
  const [nav,    setNav   ]=useState('home');
  const [cart,   setCart  ]=useState([]);
  const [selP,   setSelP  ]=useState(null);
  const [shCart, setShCart]=useState(false);
  const [track,  setTrack ]=useState(false);
  const [catF,   setCatF  ]=useState('all');
  const [themeOpen, setThemeOpen]=useState(false);
  const [payMethod, setPayMethod]=useState('cod');
  const [coupon, setCoupon]=useState('');
const [discount, setDiscount]=useState(0);
const [couponMsg, setCouponMsg]=useState('');

const COUPONS = {
  'FRESH20': 20,
  'SAVE30':  30,
  'FIRST50': 50,
  'DB10':    10,
};

const applyCoupon=()=>{
  const code=coupon.trim().toUpperCase();
  if(COUPONS[code]){
    setDiscount(COUPONS[code]);
    setCouponMsg(`✅ ₹${COUPONS[code]} off applied!`);
  } else {
    setDiscount(0);
    setCouponMsg('❌ Invalid coupon code');
  }
};
const [showAddr, setShowAddr]=useState(false);
const [address, setAddress]=useState(null);

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
  const addC=p=>setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}];});
  const remC=id=>setCart(prev=>{const it=prev.find(i=>i.id===id);return it&&it.qty>1?prev.map(i=>i.id===id?{...i,qty:i.qty-1}:i):prev.filter(i=>i.id!==id);});
const place=async(addr)=>{
  const finalAddr=addr||address;
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const del=sub>299?0:25;
  try{
    await addDoc(collection(db,'orders'),{
      userId:auth.currentUser?.uid,
      userName:user?.name||'Customer',
      userPhone:user?.phone||'',
      items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),
      subtotal:sub,delivery:del,total:sub+del,
      payMethod:payMethod,
      address:finalAddr||'Not provided',
      status:'confirmed',
      createdAt:serverTimestamp()
    });
  }catch(e){console.log('Order error:',e);}
  setCart([]);setShCart(false);setTrack(true);
};
  const goNav=n=>{setNav(n);setScr(n);setShCart(false);setSelP(null);};

  const navScrs=['home','combos','food','eco','profile'];
  const totalQ = cart.reduce((s,i)=>s+i.qty,0);
  const activeProds = data.products.filter(p=>p.active);
  const filtP = catF==='all'?activeProds.slice(0,10):activeProds.filter(p=>p.cat===catF);

  const pName=p=>isHi?p.nameHi:p.name;
  const pTag=p=>isHi?p.tagHi:p.tag;

  const showNav = navScrs.includes(scr)&&!shCart&&!track&&!selP;
  const showFC  = cart.length>0&&navScrs.includes(scr)&&!shCart&&!track&&!selP;

  const renderScr=()=>{
    if(showAddr) return <AddressScreen onBack={()=>setShowAddr(false)} onConfirm={addr=>{setAddress(addr);setShowAddr(false);place(addr);}} userId={auth.currentUser?.uid}/>;
    if(shCart) return (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
        <SBar/>
        <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
          <BBtn onClick={()=>setShCart(false)}/>
          <div><div style={{fontSize:18,fontWeight:800}}>{t.myBasket}</div><div style={{fontSize:12,color:'var(--t3)'}}>{cart.reduce((s,i)=>s+i.qty,0)} {t.items}</div></div>
        </div>
        <div className="scr" style={{position:'relative',padding:'0 20px 10px'}}>
          {cart.length===0
            ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60%',gap:14}}><div style={{fontSize:64}}>🧺</div><div style={{fontSize:18,fontWeight:700}}>{isHi?'टोकरी खाली है':'Basket is empty'}</div></div>
            :<>
              {cart.map((item,i)=>(
                <div key={`${item.id}${i}`} className="gc" style={{padding:14,display:'flex',gap:12,alignItems:'center',marginBottom:10,animation:`fadeIn .3s ease ${i*.05}s both`}}>
                  <div style={{width:52,height:52,borderRadius:14,background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,border:'1px solid rgba(61,255,122,.07)'}}>{item.emoji}</div>
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
              {(()=>{const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);const del=sub>299?0:25;const tot=sub+del;return(
                <>
                  <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.14)',borderRadius:14,padding:'12px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                    <Ic n="truck" s={16} c="#3DFF7A"/>
                    <div style={{fontSize:12,color:'#3DFF7A',fontWeight:600}}>{del===0?'🎉 '+t.free:`${t.addFreeDelivery}${299-sub}${t.forFreeDelivery}`}</div>
                  </div>
                  <div className="gc" style={{padding:16,marginBottom:80}}>
                    <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>{t.priceDetails}</div>
                    {[{l:t.subtotal,v:`₹${sub}`},{l:t.delivery,v:del===0?t.free:`₹${del}`},{l:t.ecoPackaging,v:t.included},...(discount>0?[{l:'🏷️ Discount',v:`-₹${discount}`}]:[])].map(r=>(
                      <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span><span style={{fontSize:13,fontWeight:600,color:r.v.includes('FREE')||r.v.includes('मुफ्त')||r.v.includes('♻️')?'#3DFF7A':'#fff'}}>{r.v}</span></div>
                    ))}
                    <div className="divr"/>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:16,fontWeight:800}}>{t.total}</span><span style={{fontSize:18,fontWeight:900,color:'#3DFF7A'}}>₹{tot}</span></div>
                  </div>
                </>
              );})()}
            </>
          }
        </div>
        {cart.length>0&&<div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 30px',background:'rgba(7,9,7,.95)',backdropFilter:'blur(20px)'}}>
  {/* Payment Method */}
  <div style={{marginBottom:12}}>
    <div style={{fontSize:12,color:'var(--t3)',fontWeight:600,marginBottom:8}}>💳 Payment Method</div>
    <div style={{display:'flex',gap:8}}>
      <div onClick={()=>setPayMethod('cod')} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${payMethod==='cod'?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:payMethod==='cod'?'rgba(61,255,122,.08)':'transparent',cursor:'pointer',textAlign:'center'}}>
        <div style={{fontSize:16}}>💵</div>
        <div style={{fontSize:11,fontWeight:600,color:payMethod==='cod'?'#3DFF7A':'var(--t3)'}}>Cash on Delivery</div>
      </div>
      <div onClick={()=>setPayMethod('upi')} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${payMethod==='upi'?'rgba(61,255,122,.5)':'rgba(61,255,122,.1)'}`,background:payMethod==='upi'?'rgba(61,255,122,.08)':'transparent',cursor:'pointer',textAlign:'center'}}>
        <div style={{fontSize:16}}>📱</div>
        <div style={{fontSize:11,fontWeight:600,color:payMethod==='upi'?'#3DFF7A':'var(--t3)'}}>UPI</div>
      </div>
    </div>
  </div>
  <button className="btn rip" onClick={()=>setShowAddr(true)} style={{width:'100%',padding:17,fontSize:16,fontFamily:fam}}>🛍️ {t.placeOrder} — ₹{cart.reduce((s,i)=>s+i.price*i.qty,0)+(cart.reduce((s,i)=>s+i.price*i.qty,0)>299?0:25)}</button>
        </div>}
      </div>
    );

    if(track) return (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
        <SBar/>
        <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}><BBtn onClick={()=>{setTrack(false);setScr('home');setNav('home');}}/><div><div style={{fontSize:18,fontWeight:800}}>{t.orderTracking}</div><div style={{fontSize:12,color:'var(--t3)'}}>#DB-20260505-001</div></div></div>
        <div className="scr" style={{position:'relative',padding:'0 20px 20px'}}>
          <div style={{height:170,borderRadius:20,background:'linear-gradient(135deg,#0D1A0D,#111C11)',border:'1px solid rgba(61,255,122,.1)',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(61,255,122,.05) 1px,transparent 1px)',backgroundSize:'24px 24px'}}/>
            <div style={{position:'absolute',width:8,height:8,borderRadius:'50%',background:'#3DFF7A',animation:'statusP 1.5s infinite',top:'55%',left:'48%'}}/>
            <div style={{textAlign:'center',position:'relative'}}><div style={{fontSize:36,marginBottom:6,animation:'floatY 2s ease-in-out infinite'}}>🚴‍♂️</div><div style={{fontSize:12,color:'#3DFF7A',fontWeight:600}}>{t.riderOnWay}</div><div style={{fontSize:11,color:'var(--t3)'}}>~25 {isHi?'मिनट':'min'}</div></div>
          </div>
          <div className="gc" style={{padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#1A3320,#0E2318)',border:'2px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>👨‍🍳</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Ramesh Kumar</div><div style={{fontSize:11,color:'var(--t3)'}}>⭐ 4.9</div></div>
            <div style={{background:'linear-gradient(135deg,#3DFF7A,#00C44F)',borderRadius:10,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#0A1A0A',cursor:'pointer'}}>📞</div>
          </div>
          <div className="gc" style={{padding:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>{t.orderStatus}</div>
            {[{l:isHi?'ऑर्डर कन्फर्म':'Order Confirmed',t:'9:41 AM',done:true,icon:'✅'},{l:isHi?'पैक किया जा रहा':'Being Packed',t:'9:55 AM',done:true,icon:'📦'},{l:isHi?'डिलीवरी पर':'Out for Delivery',t:'10:10 AM',active:true,icon:'🚴'},{l:isHi?'डिलीवर हो गया':'Delivered',t:'~10:35 AM',icon:'🏠'}].map((step,i)=>(
              <div key={i} style={{display:'flex',gap:12}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:36,height:36,borderRadius:12,background:step.done||step.active?'linear-gradient(135deg,#1A3320,#0E2318)':'var(--card)',border:step.done||step.active?'1.5px solid rgba(61,255,122,.4)':'1px solid rgba(61,255,122,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,animation:step.active?'statusP 1.5s infinite':'none'}}>{step.icon}</div>
                  {i<3&&<div style={{width:2,height:26,background:step.done?'linear-gradient(to bottom,#3DFF7A,#00C44F)':'rgba(255,255,255,.06)',margin:'4px 0',borderRadius:1}}/>}
                </div>
                <div style={{flex:1,paddingTop:6}}>
                  <div style={{fontSize:14,fontWeight:step.active?700:600,color:step.done||step.active?'#fff':'#5A6A5A'}}>{step.l}</div>
                  <div style={{fontSize:11,color:step.active?'#3DFF7A':'#5A6A5A',marginBottom:6}}>{step.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if(selP) return (
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',fontFamily:fam}}>
        <SBar/>
        <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',gap:12}}><BBtn onClick={()=>setSelP(null)}/><span style={{fontSize:17,fontWeight:800}}>{t.productDetails}</span></div>
        <div className="scr" style={{position:'relative'}}>
          <div style={{margin:'0 20px',height:220,borderRadius:24,background:'linear-gradient(135deg,#0D1F0D,#111A11)',border:'1px solid rgba(61,255,122,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:106,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 50%,rgba(61,255,122,.05),transparent 70%)'}}/>
            <span style={{animation:'floatY 3s ease-in-out infinite'}}>{selP.emoji}</span>
            <div className="chip" style={{position:'absolute',top:14,right:14}}>{pTag(selP)}</div>
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
            {/* Theme switcher button */}
            <div onClick={()=>setThemeOpen(true)} style={{width:40,height:40,borderRadius:12,background:'var(--glass)',backdropFilter:'blur(10px)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,transition:'all .2s',boxShadow:theme!=='eco'?'0 0 12px var(--shadow)':'none'}}>
              {THEMES[theme].icon}
            </div>
            {[{n:'search'},{n:'bell'}].map(({n},i)=>(
              <div key={i} style={{width:40,height:40,borderRadius:12,background:'var(--glass)',backdropFilter:'blur(10px)',border:'1px solid var(--gb)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
                <Ic n={n} s={18} c="var(--t3)"/>
                {n==='bell'&&<span style={{position:'absolute',top:8,right:8,width:8,height:8,borderRadius:'50%',background:'var(--green)',border:'2px solid var(--bg)'}}/>}
              </div>
            ))}
          </div>
          {themeOpen&&<ThemePicker theme={theme} setTheme={setTheme} onClose={()=>setThemeOpen(false)} isHi={isHi}/>}
        </div>
        {/* Banner */}
        <div style={{margin:'0 20px 20px'}}>
          <div className="gc" style={{background:'linear-gradient(135deg,#0D2010,#0A180A)',padding:20,position:'relative',overflow:'hidden',minHeight:136,animation:'glowPulse 3s ease-in-out infinite'}}>
            <div style={{position:'absolute',right:-10,top:0,bottom:0,fontSize:88,display:'flex',alignItems:'center',opacity:.4}}>🥦</div>
            <div style={{position:'relative',zIndex:1}}>
              <div className="chip" style={{marginBottom:10}}>🌱 {t.ecoFriendly}</div>
              <div style={{fontSize:18,fontWeight:800,lineHeight:1.3,maxWidth:200,fontFamily:fam,whiteSpace:'pre-line'}}>{t.freshVeggies}</div>
              <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{t.byShopping}</div>
              <button className="btn rip" onClick={()=>setCatF('veg')} style={{marginTop:12,padding:'9px 20px',fontSize:13,fontFamily:fam}}>{t.shopNow}</button>
            </div>
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
          <div className="sh"><div className="st">{t.bestSellers}</div><div className="sl">{t.seeAll}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {filtP.map((p,i)=>(
              <div key={p.id} className="pc" style={{animation:`fadeUp .5s ease ${i*.05}s both`}} onClick={()=>setSelP(p)}>
                <div style={{height:100,background:'linear-gradient(135deg,#111A11,#0D160D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:50,position:'relative'}}>
                  {p.emoji}
                  <div className="chip" style={{position:'absolute',top:8,left:8,fontSize:10,padding:'2px 7px',fontFamily:fam}}>{pTag(p)}</div>
                </div>
                <div style={{padding:'10px 10px 12px'}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:2,fontFamily:fam}}>{pName(p)}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginBottom:8}}>{p.unit}</div>
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
    if(scr==='eco')    return <EcoScr t={t} fam={fam} isHi={isHi}/>;
    if(scr==='profile')return <ProfileScr user={user} t={t} fam={fam} lang={lang} isHi={isHi}/>;
    return null;
  };

  return (
    <div style={{position:'absolute',inset:0}}>
      <div className="scr">{renderScr()}</div>
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
      <div style={{marginBottom:20}}><div style={{fontSize:15,fontWeight:700,marginBottom:8}}>{t.about}</div><div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7}}>Farm-fresh {pName(prod).toLowerCase()} from local farmers in Bhopalgarh. Delivered within 24 hours.</div></div>
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
  const R=[{name:'Green Leaf Kitchen',nameHi:'ग्रीन लीफ किचन',cuisine:'Healthy · Salads',cuisineHi:'हेल्दी · सलाद',rating:4.8,time:'20-25 min',emoji:'🥗',badge:'Top Rated',badgeHi:'टॉप रेटेड'},{name:'Spice Garden',nameHi:'स्पाइस गार्डन',cuisine:'Indian · Curry',cuisineHi:'भारतीय · करी',rating:4.6,time:'30-35 min',emoji:'🍛',badge:'Popular',badgeHi:'लोकप्रिय'},{name:'Fresh Bakes',nameHi:'फ्रेश बेक्स',cuisine:'Bakery · Coffee',cuisineHi:'बेकरी · कॉफी',rating:4.7,time:'15-20 min',emoji:'☕',badge:'Fast',badgeHi:'तेज'}];
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
        {R.map((r,i)=>(
          <div key={i} className="gc" style={{padding:16,marginBottom:12,cursor:'pointer',animation:`fadeUp .5s ease ${i*.1}s both`}}>
            <div style={{display:'flex',gap:14,alignItems:'center'}}>
              <div style={{width:68,height:68,borderRadius:18,flexShrink:0,background:'linear-gradient(135deg,#111A11,#0D160D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,border:'1px solid rgba(61,255,122,.08)'}}>{r.emoji}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <div style={{fontSize:15,fontWeight:700}}>{isHi?r.nameHi:r.name}</div>
                  <span style={{background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:50}}>{isHi?r.badgeHi:r.badge}</span>
                </div>
                <div style={{fontSize:12,color:'var(--t3)',marginBottom:5}}>{isHi?r.cuisineHi:r.cuisine}</div>
                <div style={{display:'flex',gap:12}}><span style={{fontSize:12,color:'#D4AF37',fontWeight:600}}>★ {r.rating}</span><span style={{fontSize:12,color:'var(--t3)'}}>🕐 {r.time}</span><span style={{fontSize:12,color:'#3DFF7A'}}>{t.freeDelivery}</span></div>
              </div>
              <Ic n="arrow" s={18} c="#5A6A5A"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EcoScr({t,fam,isHi}) {
  const stats=[{v:'2.45 kg',l:t.plasticSaved,i:'♻️',c:'#3DFF7A'},{v:'1.8 kg',l:isHi?'CO₂ कम किया':'CO₂ Reduced',i:'🌿',c:'#00C44F'},{v:'49',l:isHi?'बैग बदले':'Bags Replaced',i:'🛍️',c:'#D4AF37'},{v:'0.3',l:isHi?'पेड़ फंड किए':'Trees Funded',i:'🌳',c:'#2ECC60'}];
  return (
    <div style={{paddingBottom:100,fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'8px 20px 14px'}}><div style={{fontSize:22,fontWeight:800}}>{t.ecoImpact}</div><div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>{t.contribution}</div></div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 20px 22px'}}>
        <div style={{position:'relative',width:200,height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {[160,180,200].map((sz,i)=><div key={i} style={{position:'absolute',width:sz,height:sz,borderRadius:'50%',border:`1px solid rgba(61,255,122,${.14-i*.04})`}}/>)}
          <div style={{position:'absolute',width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(61,255,122,.2),transparent 70%)'}}/>
          <div style={{width:120,height:120,borderRadius:'50%',background:'linear-gradient(135deg,#1A3320,#0D2010)',border:'2px solid rgba(61,255,122,.4)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'0 0 40px rgba(61,255,122,.3)',animation:'glowPulse 2.5s ease-in-out infinite'}}>
            <div style={{fontSize:36,animation:'treeG 2.5s ease-in-out infinite',}}>🌳</div>
            <div style={{fontSize:11,color:'#3DFF7A',fontWeight:700,marginTop:2}}>{isHi?'ग्रीन रैंक':'Green Rank'}</div>
          </div>
        </div>
        <div style={{textAlign:'center',marginTop:14}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:800,background:'linear-gradient(135deg,#3DFF7A,#D4AF37)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>2.45 kg</div>
          <div style={{fontSize:16,fontWeight:700,fontFamily:fam}}>{t.plasticSaved}</div>
          <div style={{fontSize:13,color:'var(--t3)',marginTop:4}}>{isHi?'49 प्लास्टिक बैग के बराबर':'Equivalent to 49 plastic bags'}</div>
        </div>
      </div>
      <div style={{padding:'0 20px 20px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{stats.map((s,i)=><div key={i} className="gc" style={{padding:16,animation:`fadeUp .5s ease ${i*.1}s both`}}><div style={{fontSize:26,marginBottom:6}}>{s.i}</div><div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:fam}}>{s.v}</div><div style={{fontSize:11,color:'var(--t3)',marginTop:2,fontFamily:fam}}>{s.l}</div></div>)}</div></div>
    </div>
  );
}

function ProfileScr({user,t,fam,lang,isHi}) {
  const [showOrders, setShowOrders]=useState(false);
  const [orders, setOrders]=useState([]);
  const [loadingOrders, setLoadingOrders]=useState(false);

  const fetchOrders=async()=>{
    if(!auth.currentUser) return;
    setLoadingOrders(true);
    try{
      const q=await getDocs(collection(db,'orders'));
      const myOrders=q.docs
        .map(d=>({id:d.id,...d.data()}))
        .filter(o=>o.userId===auth.currentUser.uid)
        .sort((a,b)=>b.createdAt?.seconds-a.createdAt?.seconds);
      setOrders(myOrders);
    }catch(e){console.log('Orders fetch error:',e);}
    setLoadingOrders(false);
  };

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
              <div key={o.id} className="gc" style={{padding:16,marginBottom:12,animation:`fadeUp .4s ease ${i*.06}s both`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:12,color:'var(--t3)'}}>
                    {o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('en-IN') : 'Recent'}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:50,
                    background:o.status==='delivered'?'rgba(61,255,122,.15)':'rgba(212,175,55,.15)',
                    color:o.status==='delivered'?'#3DFF7A':'#D4AF37',
                    border:`1px solid ${o.status==='delivered'?'rgba(61,255,122,.3)':'rgba(212,175,55,.3)'}`}}>
                    {o.status==='delivered'?'✅ Delivered':'🚴 Processing'}
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
                  <div style={{fontSize:16,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );

  const menu=[
    {i:'📦',l:t.myOrders,sub:`${orders.length||0} orders`,c:'#3DFF7A',action:()=>{fetchOrders();setShowOrders(true);}},
    {i:'🧺',l:t.myCombos,sub:isHi?'2 सक्रिय कॉम्बो':'2 active combos',c:'#00C44F'},
    {i:'📅',l:t.subscription,sub:isHi?'डेली प्लान · सक्रिय':'Daily plan · Active',c:'#D4AF37'},
    {i:'📍',l:t.addresses,sub:isHi?'2 सहेजे गए':'2 saved',c:'#3DFF7A'},
    {i:'💳',l:t.payment,sub:'UPI · Card',c:'#00C44F'},
    {i:'🌐',l:isHi?'भाषा':'Language',sub:lang==='hi'?'हिंदी':'English',c:'#3DFF7A'},
    {i:'⚙️',l:t.settings,sub:isHi?'सूचनाएं':'Notifications',c:'#8A9A8A'}
  ];

  return (
    <div style={{paddingBottom:100,fontFamily:fam}}>
      <SBar/>
      <div style={{padding:'8px 20px 18px'}}><div style={{fontSize:22,fontWeight:800}}>{t.profile}</div></div>
      <div style={{padding:'0 20px',marginBottom:14}}>
        <div style={{background:'linear-gradient(135deg,#0D2010,#1A3320)',border:'1px solid rgba(61,255,122,.2)',borderRadius:24,padding:20}}>
          <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
            <div style={{width:64,height:64,borderRadius:20,background:'linear-gradient(135deg,#3DFF7A,#00C44F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:'#0A1A0A',boxShadow:'0 4px 20px rgba(61,255,122,.3)'}}>{(user&&user.name&&user.name[0])||'U'}</div>
            <div><div style={{fontSize:18,fontWeight:800}}>{(user&&user.name)||'User'}</div><div style={{fontSize:13,color:'var(--t2)'}}>+91 {(user&&user.phone)||'XXXXXXXXXX'}</div><span style={{background:'rgba(212,175,55,.14)',border:'1px solid rgba(212,175,55,.3)',color:'#D4AF37',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:50,marginTop:5,display:'inline-block'}}>🥈 {isHi?'सिल्वर सदस्य':'Silver Member'}</span></div>
          </div>
          <div style={{display:'flex',gap:12,padding:12,background:'rgba(0,0,0,.2)',borderRadius:14}}>
            {[{v:'2.45kg',l:isHi?'बचाया':'Saved',c:'#3DFF7A'},{v:'312',l:isHi?'अंक':'Points',c:'#D4AF37'},{v:orders.length||'0',l:isHi?'ऑर्डर':'Orders',c:'#3DFF7A'}].map((s,i)=>(
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
        <button className="btng rip" style={{width:'100%',padding:'14px',fontSize:13,color:'#FF6B6B',border:'1px solid rgba(255,107,107,.2)',marginTop:4,fontFamily:fam}}>{t.signOut}</button>
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

/* Simple Rider & Shop apps (abbreviated for space) */
function RiderApp({rider,data,setData,onBack}) {
  const [tab,setTab]=useState('dash');const [online,setOnline]=useState(rider.online);
  const my=data.orders.filter(o=>o.riderId===rider.id);
  const avail=data.orders.filter(o=>o.status==='confirmed'&&!o.riderId);
  const accept=id=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,riderId:rider.id,status:'out_for_delivery'}:o)}));
  const deliver=id=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,status:'delivered'}:o)}));
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
      <SBar/>
      <div style={{padding:'4px 20px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><BBtn onClick={onBack}/><div><div style={{fontSize:16,fontWeight:800}}>🚲 {rider.name}</div><div style={{fontSize:11,color:'var(--t3)'}}>ID: {rider.id}</div></div></div>
        <div style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',background:online?'rgba(61,255,122,.1)':'rgba(255,255,255,.05)',border:`1px solid ${online?'rgba(61,255,122,.3)':'rgba(255,255,255,.08)'}`,borderRadius:50}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:online?'#3DFF7A':'#5A6A5A',animation:online?'pulseD 1.5s infinite':'none'}}/>
          <span style={{fontSize:11,fontWeight:700,color:online?'#3DFF7A':'#5A6A5A'}}>{online?'Online':'Offline'}</span>
          <Tog on={online} onClick={()=>setOnline(v=>!v)}/>
        </div>
      </div>
      <div style={{padding:'0 20px 10px',display:'flex',gap:8}}>
        {[{id:'dash',l:'Dashboard'},{id:'orders',l:'Orders'},{id:'earn',l:'Earnings'}].map(t=>(<div key={t.id} className={`cp ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)} style={{flex:1,textAlign:'center',padding:'8px 0',fontSize:12}}>{t.l}</div>))}
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 20px'}}>
        {tab==='dash'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{i:'📦',v:rider.todayOrders,l:"Today's Deliveries"},{i:'💰',v:`₹${rider.todayEarnings}`,l:"Today's Earnings",c:'#D4AF37'},{i:'⭐',v:rider.rating,l:'Rating',c:'#D4AF37'},{i:'🏆',v:rider.totalOrders,l:'Total Orders'}].map((s,i)=>(
              <div key={i} className="gc" style={{padding:'14px 16px'}}><div style={{fontSize:22,marginBottom:6}}>{s.i}</div><div style={{fontSize:20,fontWeight:800,color:s.c||'#3DFF7A'}}>{s.v}</div><div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.l}</div></div>
            ))}
          </div>
          <div className="sh"><div className="st">New Pickups {avail.length>0&&`(${avail.length})`}</div></div>
          {avail.length===0?<div style={{textAlign:'center',padding:'20px',color:'var(--t3)',fontSize:13}}>No new pickups. Stay online! 🟢</div>:avail.map(o=>(
            <div key={o.id} className="gc" style={{padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontSize:14,fontWeight:700}}>{o.cust}</div><div style={{fontSize:14,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div></div>
              <div style={{fontSize:12,color:'var(--t3)',marginBottom:10}}>{o.items.map(i=>i.name).join(', ')}</div>
              <button className="btn rip" onClick={()=>accept(o.id)} style={{width:'100%',padding:'10px',fontSize:13}}>Accept Pickup →</button>
            </div>
          ))}
        </>}
        {tab==='orders'&&<>
          <div className="sh"><div className="st">My Orders</div></div>
          {my.length===0?<div style={{textAlign:'center',padding:'20px',color:'var(--t3)'}}>No orders yet</div>:my.map((o,i)=>(
            <div key={o.id} className="gc" style={{padding:'14px',marginBottom:10,animation:`fadeUp .4s ease ${i*.06}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{fontSize:14,fontWeight:700}}>{o.cust}</div><div style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:50,background:o.status==='delivered'?'rgba(61,255,122,.15)':'rgba(212,175,55,.15)',color:o.status==='delivered'?'#3DFF7A':'#D4AF37',border:`1px solid ${o.status==='delivered'?'rgba(61,255,122,.3)':'rgba(212,175,55,.3)'}`}}>{o.status==='delivered'?'✅ Delivered':'🚴 Delivering'}</div></div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:o.status==='out_for_delivery'?10:0}}>{o.items.map(i=>i.name).join(', ')} · ₹{o.total}</div>
              {o.status==='out_for_delivery'&&<button className="btn rip" onClick={()=>deliver(o.id)} style={{width:'100%',padding:'9px',fontSize:13}}>Mark as Delivered ✓</button>}
            </div>
          ))}
        </>}
        {tab==='earn'&&<>
          <div style={{background:'linear-gradient(135deg,#1A3320,#0D2010)',border:'1px solid rgba(61,255,122,.2)',borderRadius:20,padding:'20px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--t3)'}}>Total Lifetime Earnings</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:38,fontWeight:800,color:'#3DFF7A',marginTop:4}}>₹{rider.totalEarnings.toLocaleString()}</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{rider.totalOrders} orders delivered</div>
          </div>
          <div className="gc" style={{padding:'16px'}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>Per Delivery Rates</div>
            {[{l:'Base Pay',v:'₹40/order'},{l:'Distance Bonus',v:'₹5/km'},{l:'Weekend Bonus',v:'₹20'},{l:'Rating Bonus (4.5+)',v:'₹10'},{l:'Late Night (10PM+)',v:'₹30'}].map(r=>(<div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span><span style={{fontSize:13,fontWeight:600,color:'#3DFF7A'}}>{r.v}</span></div>))}
          </div>
        </>}
      </div>
    </div>
  );
}

function ShopApp({shop,data,setData,onBack}) {
  const [tab,setTab]=useState('dash');const [isOpen,setIsOpen]=useState(true);
  const shopOrds=data.orders.filter(o=>o.shopId===shop.id);
  const pending=shopOrds.filter(o=>['pending','preparing'].includes(o.status));
  const upd=(id,s)=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,status:s}:o)}));
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
      <SBar/>
      <div style={{padding:'4px 20px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><BBtn onClick={onBack}/><div><div style={{fontSize:15,fontWeight:800}}>🏨 {shop.name}</div><div style={{fontSize:11,color:'var(--t3)'}}>{shop.cuisine} · {shop.id}</div></div></div>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 11px',background:isOpen?'rgba(61,255,122,.1)':'rgba(255,255,255,.05)',border:`1px solid ${isOpen?'rgba(61,255,122,.3)':'rgba(255,255,255,.08)'}`,borderRadius:50}}>
          <span style={{fontSize:11,fontWeight:700,color:isOpen?'#3DFF7A':'#5A6A5A'}}>{isOpen?'Open':'Closed'}</span><Tog on={isOpen} onClick={()=>setIsOpen(v=>!v)}/>
        </div>
      </div>
      <div style={{padding:'0 20px 10px',display:'flex',gap:8}}>
        {[{id:'dash',l:'Dashboard'},{id:'orders',l:`Orders${pending.length>0?` (${pending.length})`:''}`},{id:'history',l:'History'}].map(t=>(<div key={t.id} className={`cp ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)} style={{flex:1,textAlign:'center',padding:'8px 0',fontSize:12}}>{t.l}</div>))}
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 20px'}}>
        {tab==='dash'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{i:'📦',v:shop.todayOrders,l:"Today's Orders"},{i:'💰',v:`₹${shop.todayRevenue.toLocaleString()}`,l:"Today Revenue",c:'#D4AF37'},{i:'📊',v:shop.totalOrders,l:'Total Orders'},{i:'🏆',v:`₹${(shop.totalRevenue/1000).toFixed(1)}K`,l:'Total Revenue',c:'#D4AF37'}].map((s,i)=>(<div key={i} className="gc" style={{padding:'14px 16px'}}><div style={{fontSize:22,marginBottom:6}}>{s.i}</div><div style={{fontSize:20,fontWeight:800,color:s.c||'#3DFF7A'}}>{s.v}</div><div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.l}</div></div>))}
          </div>
          {pending.length>0&&<div style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.25)',borderRadius:16,padding:'14px 16px',marginBottom:14}}><div style={{fontSize:14,fontWeight:700,color:'#D4AF37'}}>⚡ {pending.length} Order{pending.length>1?'s':''} Needs Attention</div></div>}
        </>}
        {tab==='orders'&&<>
          <div className="sh"><div className="st">Active Orders</div></div>
          {pending.length===0?<div style={{textAlign:'center',padding:'30px',color:'var(--t3)'}}>No pending orders</div>:pending.map((o,i)=>(
            <div key={o.id} className="gc" style={{padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{fontSize:14,fontWeight:700}}>{o.cust}</div><div style={{fontSize:14,fontWeight:800,color:'#D4AF37'}}>₹{o.total}</div></div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:10}}>{o.items.map(i=>i.name+' x'+i.qty).join(', ')}</div>
              <div style={{display:'flex',gap:8}}>
                {o.status==='pending'&&<button className="btn rip" onClick={()=>upd(o.id,'preparing')} style={{flex:1,padding:'9px',fontSize:12}}>Accept & Prepare</button>}
                {o.status==='preparing'&&<button className="btn rip" onClick={()=>upd(o.id,'ready')} style={{flex:1,padding:'9px',fontSize:12,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>Mark Ready 🍽️</button>}
              </div>
            </div>
          ))}
        </>}
        {tab==='history'&&shopOrds.filter(o=>['delivered','ready'].includes(o.status)).map((o,i)=>(
          <div key={o.id} className="gc" style={{padding:'14px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{fontSize:14,fontWeight:700}}>{o.cust}</div><div style={{fontSize:14,fontWeight:800,color:'#3DFF7A'}}>₹{o.total}</div></div>
            <div style={{fontSize:11,color:'var(--t3)'}}>{o.time} · {o.items.map(i=>i.name).join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminApp({data,setData,onBack}) {
  const [tab,setTab]=useState('dash');const [pcTab,setPcTab]=useState('veg');const [editId,setEditId]=useState(null);const [addP,setAddP]=useState(false);const [addS,setAddS]=useState(false);const [addR,setAddR]=useState(false);const [creds,setCreds]=useState(null);
  const [npF,setNpF]=useState({name:'',nameHi:'',cat:'veg',price:'',unit:'500g',emoji:'🥦',stock:'50'});
  const [nsF,setNsF]=useState({name:'',owner:'',phone:'',cuisine:''});
  const [nrF,setNrF]=useState({name:'',phone:''});
  const todOrds=data.orders.filter(o=>o.date==='Today');
  const todRev=todOrds.reduce((s,o)=>s+o.total,0);
  const toggleProd=id=>setData(d=>({...d,products:d.products.map(p=>p.id===id?{...p,active:!p.active}:p)}));
  const saveProd=(id,ch)=>setData(d=>({...d,products:d.products.map(p=>p.id===id?{...p,...ch}:p)}));
  const addNewProd=()=>{const p={id:Date.now(),name:npF.name,nameHi:npF.nameHi||npF.name,price:+npF.price,unit:npF.unit,emoji:npF.emoji,cat:npF.cat,stock:+npF.stock,tag:'New',tagHi:'नया',active:true};setData(d=>({...d,products:[...d.products,p]}));setNpF({name:'',nameHi:'',cat:'veg',price:'',unit:'500g',emoji:'🥦',stock:'50'});setAddP(false);};
  const regShop=()=>{const idx=data.shops.length+1;const s={id:`SHP${String(idx).padStart(3,'0')}`,name:nsF.name,owner:nsF.owner,phone:nsF.phone,cuisine:nsF.cuisine,pass:`Shop@${String(idx).padStart(3,'0')}`,active:true,totalOrders:0,totalRevenue:0,todayOrders:0,todayRevenue:0};setData(d=>({...d,shops:[...d.shops,s]}));setCreds({type:'Shop',id:s.id,pass:s.pass});setNsF({name:'',owner:'',phone:'',cuisine:''});setAddS(false);};
  const regRider=()=>{const idx=data.riders.length+1;const r={id:`RDR${String(idx).padStart(3,'0')}`,name:nrF.name,phone:nrF.phone,pass:`Rider@${String(idx).padStart(3,'0')}`,active:true,online:false,totalOrders:0,totalEarnings:0,todayEarnings:0,todayOrders:0,rating:5.0};setData(d=>({...d,riders:[...d.riders,r]}));setCreds({type:'Rider',id:r.id,pass:r.pass});setNrF({name:'',phone:''});setAddR(false);};
  const toggleShop=id=>setData(d=>({...d,shops:d.shops.map(s=>s.id===id?{...s,active:!s.active}:s)}));
  const toggleRider=id=>setData(d=>({...d,riders:d.riders.map(r=>r.id===id?{...r,active:!r.active}:r)}));
  const fp=data.products.filter(p=>p.cat===pcTab);
  const Modal=({children,onClose})=><div className="ovl" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>{children}</div></div>;
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
      <SBar/>
      <div style={{padding:'4px 20px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><BBtn onClick={onBack}/><div><div style={{fontSize:16,fontWeight:800,color:'#FF8C42'}}>🍓 Master Control</div><div style={{fontSize:11,color:'var(--t3)'}}>Admin: {ADMIN_ID}</div></div></div>
        <div style={{background:'rgba(255,140,66,.1)',border:'1px solid rgba(255,140,66,.25)',borderRadius:50,padding:'4px 12px',fontSize:11,color:'#FF8C42',fontWeight:700}}>🔐 ADMIN</div>
      </div>
      <div className="srow" style={{padding:'0 20px 10px',gap:6}}>
        {[{id:'dash',l:'📊 Dash'},{id:'prods',l:'🥦 Products'},{id:'shops',l:'🏨 Shops'},{id:'riders',l:'🚲 Riders'},{id:'reports',l:'📈 Reports'}].map(t=>(<div key={t.id} className={`cp ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)} style={{padding:'7px 14px',fontSize:12,flexShrink:0}}>{t.l}</div>))}
      </div>
      <div className="scr" style={{position:'relative',padding:'0 20px 24px'}}>
        {tab==='dash'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{i:'📦',v:todOrds.length,l:'Orders Today'},{i:'💰',v:`₹${todRev}`,l:'Today Revenue',c:'#D4AF37'},{i:'🚲',v:data.riders.filter(r=>r.active).length,l:'Active Riders',c:'#00C44F'},{i:'🏨',v:data.shops.filter(s=>s.active).length,l:'Active Shops',c:'#FF8C42'}].map((s,i)=>(<div key={i} className="gc" style={{padding:'14px 16px'}}><div style={{fontSize:22,marginBottom:6}}>{s.i}</div><div style={{fontSize:20,fontWeight:800,color:s.c||'#3DFF7A'}}>{s.v}</div><div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.l}</div></div>))}
          </div>
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>Platform Overview</div>
            {[{l:'Total Products',v:data.products.length},{l:'Total Riders',v:data.riders.length},{l:'Total Shops',v:data.shops.length},{l:'Total Orders',v:data.orders.length}].map(r=>(<div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,color:'var(--t2)'}}>{r.l}</span><span style={{fontSize:14,fontWeight:800,color:'#FF8C42'}}>{r.v}</span></div>))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn rip" onClick={()=>setTab('prods')} style={{flex:1,padding:'11px',fontSize:13}}>+ Product</button>
            <button className="btn rip" onClick={()=>{setTab('shops');setAddS(true);}} style={{flex:1,padding:'11px',fontSize:13,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>+ Shop</button>
            <button className="btn rip" onClick={()=>{setTab('riders');setAddR(true);}} style={{flex:1,padding:'11px',fontSize:13,background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>+ Rider</button>
          </div>
        </>}
        {tab==='prods'&&<>
          <div className="sh"><div className="st">Products ({data.products.length})</div><button className="btn rip" onClick={()=>setAddP(true)} style={{padding:'7px 14px',fontSize:12}}>+ Add</button></div>
          <div className="srow" style={{marginBottom:12}}>{[{id:'veg',l:'🥦 Veg'},{id:'fruit',l:'🍎 Fruit'},{id:'milk',l:'🥛 Dairy'},{id:'food',l:'🍛 Food'}].map(t=>(<div key={t.id} className={`cp ${pcTab===t.id?'on':''}`} onClick={()=>setPcTab(t.id)} style={{flexShrink:0,fontSize:12}}>{t.l}</div>))}</div>
          {fp.map((p,i)=>(
            <div key={p.id} className="gc" style={{padding:'12px 14px',marginBottom:10}}>
              {editId===p.id
                ?<div><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{p.emoji} Edit {p.name}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}><div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRICE (₹)</div><input className="dbi" style={{fontSize:14,padding:'9px 12px'}} defaultValue={p.price} id={`p${p.id}`}/></div><div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>STOCK</div><input className="dbi" style={{fontSize:14,padding:'9px 12px'}} defaultValue={p.stock} id={`s${p.id}`}/></div></div><div style={{display:'flex',gap:8}}><button className="btn rip" onClick={()=>{saveProd(p.id,{price:+document.getElementById(`p${p.id}`).value,stock:+document.getElementById(`s${p.id}`).value});setEditId(null);}} style={{flex:1,padding:'9px',fontSize:12}}>Save ✓</button><button className="btng" onClick={()=>setEditId(null)} style={{flex:1,padding:'9px',fontSize:12}}>Cancel</button></div></div>
                :<div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:46,height:46,borderRadius:14,background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:'1px solid rgba(61,255,122,.07)',flexShrink:0}}>{p.emoji}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}><div style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div><div style={{width:7,height:7,borderRadius:'50%',background:p.active?'#3DFF7A':'#5A6A5A',flexShrink:0}}/></div><div style={{display:'flex',gap:8}}><span style={{fontSize:13,fontWeight:800,color:'#3DFF7A'}}>₹{p.price}</span><span style={{fontSize:11,color:'var(--t3)'}}>{p.unit}</span><span style={{fontSize:11,color:'var(--t3)'}}>Stock:{p.stock}</span></div></div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <Tog on={p.active} onClick={()=>toggleProd(p.id)}/>
                    <div onClick={()=>setEditId(p.id)} style={{width:30,height:30,borderRadius:8,background:'rgba(61,255,122,.1)',border:'1px solid rgba(61,255,122,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="edit" s={14} c="#3DFF7A"/></div>
                  </div>
                </div>
              }
            </div>
          ))}
          {addP&&<Modal onClose={()=>setAddP(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>Add New Product</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>EMOJI</div><input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="🥦" value={npF.emoji} onChange={e=>setNpF(p=>({...p,emoji:e.target.value}))}/></div>
              <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>PRICE (₹)</div><input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder="50" value={npF.price} onChange={e=>setNpF(p=>({...p,price:e.target.value}))}/></div>
            </div>
            {[{l:'Product Name (English)',k:'name',ph:'e.g. Broccoli'},{l:'Product Name (Hindi)',k:'nameHi',ph:'e.g. ब्रोकली'},{l:'Unit',k:'unit',ph:'500g'},{l:'Stock',k:'stock',ph:'100'}].map(f=>(<div key={f.k} style={{marginBottom:10}}><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div><input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={f.ph} value={npF[f.k]} onChange={e=>setNpF(p=>({...p,[f.k]:e.target.value}))}/></div>))}
            <div style={{marginBottom:14}}><div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>CATEGORY</div><div style={{display:'flex',gap:6}}>{['veg','fruit','milk','food'].map(c=>(<div key={c} className={`cp ${npF.cat===c?'on':''}`} onClick={()=>setNpF(p=>({...p,cat:c}))} style={{fontSize:11,padding:'6px 12px',textTransform:'capitalize'}}>{c}</div>))}</div></div>
            <div style={{display:'flex',gap:8}}><button className="btn rip" onClick={addNewProd} style={{flex:1,padding:'12px'}}>Add Product</button><button className="btng" onClick={()=>setAddP(false)} style={{flex:1,padding:'12px'}}>Cancel</button></div>
          </Modal>}
        </>}
        {tab==='shops'&&<>
          <div className="sh"><div className="st">Shops ({data.shops.length})</div><button className="btn rip" onClick={()=>setAddS(true)} style={{padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>+ Register</button></div>
          {data.shops.map((s,i)=>(<div key={s.id} className="gc" style={{padding:'14px',marginBottom:10}}><div style={{display:'flex',gap:12,alignItems:'flex-start'}}><div style={{width:46,height:46,borderRadius:14,background:'rgba(212,175,55,.1)',border:'1px solid rgba(212,175,55,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏨</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}><div style={{fontSize:14,fontWeight:700}}>{s.name}</div><div style={{width:7,height:7,borderRadius:'50%',background:s.active?'#3DFF7A':'#5A6A5A',flexShrink:0}}/></div><div style={{fontSize:11,color:'var(--t3)',marginBottom:6}}>{s.owner} · {s.cuisine}</div><div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}><span style={{background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>ID: {s.id}</span><span style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.15)',color:'#D4AF37',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>Pass: {s.pass}</span></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,color:'var(--t3)'}}>Orders:{s.totalOrders} · ₹{s.totalRevenue.toLocaleString()}</span><Tog on={s.active} onClick={()=>toggleShop(s.id)}/></div></div></div></div>))}
          {addS&&<Modal onClose={()=>setAddS(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>Register New Shop</div>
            {[{l:'Shop Name',k:'name',ph:'e.g. Fresh Corner'},{l:'Owner Name',k:'owner',ph:'Full name'},{l:'Phone',k:'phone',ph:'10-digit'},{l:'Cuisine Type',k:'cuisine',ph:'e.g. Indian Food'}].map(f=>(<div key={f.k} style={{marginBottom:10}}><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div><input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={f.ph} value={nsF[f.k]} onChange={e=>setNsF(p=>({...p,[f.k]:e.target.value}))}/></div>))}
            <div style={{background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',borderRadius:12,padding:'10px 12px',marginBottom:14}}><div style={{fontSize:11,color:'#D4AF37',fontWeight:600,marginBottom:2}}>Auto Credentials:</div><div style={{fontSize:11,color:'var(--t3)'}}>ID: SHP{String(data.shops.length+1).padStart(3,'0')} · Pass: Shop@{String(data.shops.length+1).padStart(3,'0')}</div></div>
            <div style={{display:'flex',gap:8}}><button className="btn rip" onClick={regShop} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#D4AF37,#B8962E)',color:'#0A1A0A'}}>Register Shop</button><button className="btng" onClick={()=>setAddS(false)} style={{flex:1,padding:'12px'}}>Cancel</button></div>
          </Modal>}
        </>}
        {tab==='riders'&&<>
          <div className="sh"><div className="st">Riders ({data.riders.length})</div><button className="btn rip" onClick={()=>setAddR(true)} style={{padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>+ Register</button></div>
          {data.riders.map((r,i)=>(<div key={r.id} className="gc" style={{padding:'14px',marginBottom:10}}><div style={{display:'flex',gap:12,alignItems:'flex-start'}}><div style={{width:46,height:46,borderRadius:14,background:'rgba(0,196,79,.1)',border:'1px solid rgba(0,196,79,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🚲</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}><div style={{fontSize:14,fontWeight:700}}>{r.name}</div><div style={{width:7,height:7,borderRadius:'50%',background:r.online?'#3DFF7A':r.active?'#5A6A5A':'#FF6B6B',flexShrink:0}}/><span style={{fontSize:10,color:r.online?'#3DFF7A':'var(--t3)',fontWeight:600}}>{r.online?'Online':r.active?'Offline':'Disabled'}</span></div><div style={{display:'flex',gap:6,marginBottom:8}}><span style={{background:'rgba(61,255,122,.08)',border:'1px solid rgba(61,255,122,.15)',color:'#3DFF7A',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>ID: {r.id}</span><span style={{background:'rgba(0,196,79,.08)',border:'1px solid rgba(0,196,79,.15)',color:'#00C44F',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:50}}>Pass: {r.pass}</span></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,color:'var(--t3)'}}>⭐{r.rating} · {r.totalOrders} orders</span><Tog on={r.active} onClick={()=>toggleRider(r.id)}/></div></div></div></div>))}
          {addR&&<Modal onClose={()=>setAddR(false)}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:14}}>Register New Rider</div>
            {[{l:'Full Name',k:'name',ph:'Rider full name'},{l:'Phone',k:'phone',ph:'10-digit mobile'}].map(f=>(<div key={f.k} style={{marginBottom:10}}><div style={{fontSize:10,color:'var(--t3)',marginBottom:4}}>{f.l.toUpperCase()}</div><input className="dbi" style={{fontSize:14,padding:'10px 12px'}} placeholder={f.ph} value={nrF[f.k]} onChange={e=>setNrF(p=>({...p,[f.k]:e.target.value}))}/></div>))}
            <div style={{background:'rgba(0,196,79,.06)',border:'1px solid rgba(0,196,79,.15)',borderRadius:12,padding:'10px 12px',marginBottom:14}}><div style={{fontSize:11,color:'#00C44F',fontWeight:600,marginBottom:2}}>Auto Credentials:</div><div style={{fontSize:11,color:'var(--t3)'}}>ID: RDR{String(data.riders.length+1).padStart(3,'0')} · Pass: Rider@{String(data.riders.length+1).padStart(3,'0')}</div></div>
            <div style={{display:'flex',gap:8}}><button className="btn rip" onClick={regRider} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#00C44F,#008835)',color:'#0A1A0A'}}>Register Rider</button><button className="btng" onClick={()=>setAddR(false)} style={{flex:1,padding:'12px'}}>Cancel</button></div>
          </Modal>}
        </>}
        {tab==='reports'&&<>
          <div className="sh"><div className="st">Sales Reports 📈</div></div>
          <div style={{background:'linear-gradient(135deg,rgba(255,140,66,.08),rgba(255,140,66,.04))',border:'1px solid rgba(255,140,66,.2)',borderRadius:20,padding:'20px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--t3)'}}>Total Platform Revenue</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,color:'#FF8C42',marginTop:4}}>₹{(data.shops.reduce((s,sh)=>s+sh.totalRevenue,0)+84200).toLocaleString()}</div>
            <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{data.orders.length} total orders</div>
          </div>
          <div className="gc" style={{padding:'16px',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Category Sales</div>
            {[{c:'Vegetables',v:42,col:'#3DFF7A'},{c:'Fruits',v:28,col:'#00C44F'},{c:'Dairy',v:18,col:'#D4AF37'},{c:'Food',v:12,col:'#FF8C42'}].map(r=>(<div key={r.c} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,color:'var(--t2)'}}>{r.c}</span><span style={{fontSize:12,fontWeight:700,color:r.col}}>{r.v}%</span></div><div className="pbar"><div className="pfill" style={{width:`${r.v}%`,background:`linear-gradient(90deg,${r.col},${r.col}88)`}}/></div></div>))}
          </div>
        </>}
      </div>
      {creds&&<div className="ovl" onClick={()=>setCreds(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:'center'}}><div style={{fontSize:28,marginBottom:8}}>🎉</div><div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{creds.type} Registered!</div><div style={{fontSize:13,color:'var(--t3)',marginBottom:18}}>Share these credentials</div>
        <div style={{background:'rgba(61,255,122,.06)',border:'1px solid rgba(61,255,122,.2)',borderRadius:14,padding:'16px',marginBottom:14}}>
          <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>Login ID</div><div style={{fontSize:22,fontWeight:800,color:'#3DFF7A'}}>{creds.id}</div>
          <div className="divr"/>
          <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>Password</div><div style={{fontSize:20,fontWeight:800,color:'#D4AF37'}}>{creds.pass}</div>
        </div>
        <button className="btn rip" onClick={()=>setCreds(null)} style={{width:'100%',padding:'14px',fontSize:14}}>Done ✓</button></div>
      </div></div>}
    </div>
  );
}

/* ═══════════ ROOT APP ═══════════ */
export default function DailyBasket() {
  // phases: splash → login → otp → location → language → app
  const [phase,  setPhase ] = useState('splash');
  const [user,   setUser  ] = useState(null);
  const [lang,   setLang  ] = useState('en');
  const [data,   setData  ] = useState(mkData());
  const [portal, setPortal] = useState('customer');
  const [riderU, setRiderU] = useState(null);
  const [shopU,  setShopU ] = useState(null);
  const [adminA, setAdminA] = useState(false);
  const [theme,  setTheme ] = useState('eco');

  const handleCapSelect = id => { setPortal(id); };

  const AdminPortal = () => {
    if(!adminA) return <LoginForm color="#FF8C42" icon="🍓" role="Admin" cred={(id,p)=>(id===ADMIN_ID&&p===ADMIN_PASS)?true:null} onLogin={()=>setAdminA(true)} onBack={()=>setPortal('customer')} hint={null}/>;
    return <AdminApp data={data} setData={setData} onBack={()=>{setAdminA(false);setPortal('customer');}}/>;
  };

  const renderContent = () => {
    if(phase==='splash') return <Splash onDone={()=>setPhase('login')} onCapSelect={handleCapSelect}/>;
    if(phase==='login') return <CustomerLogin onLogin={u=>{setUser(u);setPhase('location');}}/>;
    if(phase==='otp')    return <OTPScreen phone={user&&user.phone} name={user&&user.name} onVerify={u=>{setUser(u);setPhase('location');}} onBack={()=>setPhase('login')}/>;
    if(phase==='location') return <LocationScreen user={user} onAllow={()=>setPhase('language')} onSkip={()=>setPhase('language')}/>;
    if(phase==='language') return <LanguageScreen user={user} onSelect={l=>{setLang(l);setPhase('app');}}/>;

    // APP
    if(phase==='app') {
      if(portal==='customer') return <CustomerApp user={user} lang={lang} data={data} theme={theme} setTheme={setTheme}/>;
      if(portal==='rider')    return (!riderU?<LoginForm color="#00C44F" icon="🚲" role="Rider" cred={(id,p)=>data.riders.find(r=>r.id===id&&r.pass===p&&r.active)||null} onLogin={r=>setRiderU(r)} onBack={()=>setPortal('customer')} hint="ID: RDR001 · Pass: Rider@001"/>:<RiderApp rider={riderU} data={data} setData={setData} onBack={()=>{setRiderU(null);setPortal('customer');}}/>);
      if(portal==='shop')     return (!shopU?<LoginForm color="#D4AF37" icon="🏨" role="Shop" cred={(id,p)=>data.shops.find(s=>s.id===id&&s.pass===p&&s.active)||null} onLogin={s=>setShopU(s)} onBack={()=>setPortal('customer')} hint="ID: SHP001 · Pass: Shop@001"/>:<ShopApp shop={shopU} data={data} setData={setData} onBack={()=>{setShopU(null);setPortal('customer');}}/>);
      if(portal==='admin')    return <AdminPortal/>;
      if(portal==='help') return (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
          <SBar/>
          <div style={{padding:'4px 20px 14px',display:'flex',alignItems:'center',gap:12}}><BBtn onClick={()=>setPortal('customer')}/><span style={{fontSize:17,fontWeight:800}}>How to Use 📖</span></div>
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

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#050705,#070907,#060806)',fontFamily:"'Outfit',sans-serif"}}>
      <style>{CSS}</style>
      <div className="phone" style={getThemeStyle(theme)}>{renderContent()}</div>
      <div style={{position:'fixed',right:32,top:'50%',transform:'translateY(-50%)',writingMode:'vertical-lr',fontSize:10,color:'rgba(61,255,122,.1)',fontWeight:600,letterSpacing:3,textTransform:'uppercase',pointerEvents:'none'}}>Daily Basket · v4.0</div>
    </div>
  );
}
