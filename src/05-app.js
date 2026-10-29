(function(){
'use strict';

/* ------------------------------------------------------------
   Product data (indicative, from wireframe v0.5)
   ------------------------------------------------------------ */
var PLANS = {
  '5gb':  {kind:'data', size:'5',   price:8,  for:'Dash cam or a single camera', net:'4G'},
  '10gb': {kind:'data', size:'10',  price:14, for:'Security camera, continuous recording', net:'4G'},
  '20gb': {kind:'data', size:'20',  price:22, for:'Two or three devices', net:'4G'},
  '25gb': {kind:'data', size:'25',  price:25, for:'Hotspot, phone or tablet', net:'4G and 5G', year:249},
  '45gb': {kind:'data', size:'45',  price:34, for:'Hotspot, phone or tablet', net:'4G and 5G', pop:true},
  '120gb':{kind:'data', size:'120', price:60, for:'Heavy use, caravan, site', net:'4G and 5G'},
  'tt-s': {kind:'tt', word:'Small',  price:30, data:'10 GB'},
  'tt-m': {kind:'tt', word:'Medium', price:40, data:'30 GB', pop:true},
  'tt-l': {kind:'tt', word:'Large',  price:55, data:'60 GB'}
};
var DATA_IDS = ['5gb','10gb','20gb','25gb','45gb','120gb'];
var TT_IDS = ['tt-s','tt-m','tt-l'];
var DEVICES = {
  dashcam: {label:'Dash cam', lc:'dash cam', icon:'i-dashcam', rec:'5gb'},
  seccam:  {label:'Security camera', lc:'security camera', icon:'i-seccam', rec:'10gb'},
  hotspot: {label:'Wi-Fi hotspot', lc:'Wi-Fi hotspot', icon:'i-hotspot', rec:'45gb'},
  phone:   {label:'Phone or tablet', lc:'phone or tablet', icon:'i-phone', rec:'25gb'},
  other:   {label:'Not a Uniden device', lc:'device', icon:'i-anydevice', rec:'45gb'}
};
var DEV_ORDER = ['dashcam','seccam','hotspot','phone','other'];
var SVCS = [
  {id:'backgate', name:'Mercedes cam 🚗', dev:'dashcam', ref:'SIM ending 7781', started:'4 Jul 2026', plan:'45 GB, 30 days', total:45, used:45, status:'red', label:'Out of data', ends:'3 Sep', endsFull:'3 Sep 2026', price:'$34.00', auto:false, rate:1.5},
  {id:'frontdoor', name:'Farm gate cam 🐄', dev:'seccam', ref:'SIM ending 2345', started:'26 Aug 2026', plan:'25 GB, 30 days', total:25, used:13.6, status:'amber', label:'12 days left', ends:'25 Sep', endsFull:'25 Sep 2026', daysLeft:12, elapsed:18, price:'$25.00', auto:false, rate:.76},
  {id:'caravan', name:'Mikey’s Hotspot ✌️', dev:'hotspot', ref:'SIM ending 9014', started:'12 Jun 2026', plan:'120 GB, 365 days', extra:'auto renew on', total:120, used:38.2, status:'green', label:'Active', ends:'12 Jun', endsFull:'12 Jun 2027', price:null, auto:true, rate:.41},
  {id:'phone', name:'Cielo’s phone 🧒', dev:'phone', ref:'0412 … 678', started:'1 Dec 2026', plan:'Medium talk and text, 30 days', extra:'unlimited calls and text', total:30, used:8.1, status:'green', label:'Active', ends:'31 Dec', endsFull:'31 Dec 2026', price:'$40.00', auto:false, rate:.45, voice:true}
];
var FRONT_SERIES = [.77,.95,.59,1.14,.86,.45,.68,1.36,1.05,.73,.55,1.23,.91,.64,.82,.41,1.09,.73];
var PACKS = [{gb:5,price:12},{gb:15,price:25,best:true},{gb:30,price:40}];

/* ------------------------------------------------------------
   State (per viewer, session only)
   ------------------------------------------------------------ */
var S = {
  term:30, device:null, plan:null, fromLanding:false, pickDev:'seccam',
  email:'', mobile:'', iccidRest:'', iccidFull:'', fullIccid:false, devName:'', portNum:'',
  numOpt:'port', idOpt:'licence', autoRenew:false, ack:false,
  mode:'guide', usageSvc:'frontdoor', topSvc:'backgate', planSvc:'frontdoor', pack:15, names:{}, topped:{}, autoSvc:{}
};
try { var saved = JSON.parse(sessionStorage.getItem('um-state')||'null'); if (saved) for (var k in saved) S[k]=saved[k]; } catch(e){}
function save(){ try { sessionStorage.setItem('um-state', JSON.stringify(S)); } catch(e){} }
/* deep links for demos: ?plan=tt-m&device=seccam&term=365 */
try {
  var q = new URLSearchParams(location.search);
  if (PLANS[q.get('plan')]){ S.plan = q.get('plan'); S.fromLanding = true; }
  if (DEVICES[q.get('device')]) S.device = q.get('device');
  if (q.get('term')==='365' || q.get('term')==='30') S.term = +q.get('term');
  var h0 = location.hash.slice(1);
  if ((!h0 || h0==='home' || h0==='plans') && !DEVICES[q.get('device')]){ S.device = null; S.lenPicked = false; save(); }
} catch(e){}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function money(n){ return '$'+n.toFixed(2); }
function icon(id,cls){ return '<svg class="ic'+(cls?' '+cls:'')+'" aria-hidden="true"><use href="#'+id+'"/></svg>'; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function priceOf(id){ var p=PLANS[id]; return S.term===30 ? p.price : (p.year||null); }
function isTT(){ return !!(S.plan && PLANS[S.plan] && PLANS[S.plan].kind==='tt'); }
function planName(id){ var p=PLANS[id]; return p.kind==='data' ? p.size+' GB' : p.word; }
function planLong(id){ var p=PLANS[id]; return p.kind==='data' ? p.size+' GB data' : p.word+' talk and text'; }
function currentPlan(){ return S.plan || DEVICES[S.pickDev].rec; }
function devName(){ return (S.devName||'').trim() || (isTT() ? 'My phone' : 'Front door camera'); }
function svcName(s){ return S.names[s.id] || s.name; }
function svcById(id){ for (var i=0;i<SVCS.length;i++) if (SVCS[i].id===id) return SVCS[i]; return SVCS[0]; }
function fmt(n){ return (Math.round(n*10)/10).toString(); }
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

var toastT;
function toast(msg){
  var t=$('#toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); }, 2600);
}
function sweep(root){
  $$('.meter > i[data-w]', root).forEach(function(i){
    i.style.clipPath='inset(0 100% 0 0 round 999px)';
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ i.style.clipPath='inset(0 '+(100-i.getAttribute('data-w'))+'% 0 0 round 999px)'; }); });
  });
}
function meterHTML(pct, status, labels){
  var cls = status==='red' ? ' red' : '';
  return '<span class="meter'+cls+'" aria-hidden="true"><i data-w="'+Math.min(100,pct).toFixed(1)+'"></i><span class="tk" style="left:50%"></span><span class="tk" style="left:75%"></span><span class="tk" style="left:85%"></span></span>'
    + (labels ? '<span class="ticks" aria-hidden="true"><span style="left:50%">50%</span><span style="left:75%">75%</span><span style="left:85%">85%</span><span style="left:100%">100%</span></span>' : '');
}

/* ------------------------------------------------------------
   Plan cards
   ------------------------------------------------------------ */
function priceBlock(id){
  var v = priceOf(id);
  return v!=null ? money(v) : '<span class="pending">Price to be confirmed</span>';
}
function planCard(id, mode, recId, recDev){
  var p=PLANS[id], data=p.kind==='data', isRec=id===recId, pick=mode==='pick';
  var badge = isRec ? '<span class="pill brand">Recommended'+(recDev && recDev!=='other' ? ' for your '+DEVICES[recDev].lc : '')+'</span>'
            : (p.pop ? '<span class="pill ink">Most popular</span>' : '');
  var feat = data ? ['Data only', p.net, 'Usage alerts by text and email'] : ['Unlimited standard calls and text', p.data+' data', 'Keep your number or get a new one'];
  var name = data ? p.size+'<small> GB</small>' : p.word;
  var forLine = data ? esc(p.for)+' · '+p.net : p.data+' data · Unlimited calls and text';
  var choose = data ? 'Choose '+p.size+' GB' : 'Choose '+p.word+' plan', rest = data ? p.size+' GB' : p.word+' plan';
  var tag = pick ? 'article role="radio" tabindex="0" aria-checked="'+(id===currentPlan())+'"' : 'article';
  return '<'+tag+' class="plan'+(data?'':' tt')+(isRec?' is-rec':'')+(pick?' pickable':'')+'" data-plan="'+id+'" aria-label="'+esc(planLong(id))+'">'
    + '<span class="badge">'+badge+'</span>'
    + '<h4 class="p-name">'+name+'</h4>'
    + '<p class="p-for">'+(data ? esc(p.for) : p.data+' data')+'</p>'
    + '<p class="p-price">'+priceBlock(id)+'</p>'
    + '<p class="p-per">per '+S.term+' days, inc GST</p>'
    + '<ul class="p-feat">'+feat.map(function(t){ return '<li>'+icon('i-check')+'<span>'+esc(t)+'</span></li>'; }).join('')+'</ul>'
    + '<span class="p-line"></span>'
    + '<div class="p-foot"><a class="lnk" href="#" data-todo>Critical information summary</a>'
    + (pick ? '<span class="pick">'+icon('i-check')+'</span>' : '<button type="button" class="btn btn-sm '+(isRec?'btn-primary':'btn-secondary')+'" data-choose="'+id+'" aria-label="'+choose+'">Choose<span class="more">'+rest+'</span></button>')
    + '</div></'+(pick?'article':'article')+'>';
}
function renderPlans(box, mode){
  var recDev = mode==='pick' ? S.pickDev : (S.lenPicked ? S.device : null);
  var recId = recDev ? DEVICES[recDev].rec : null;
  box.innerHTML =
      '<div class="group"><div class="group-head"><h4>Data plans</h4><p>For cameras, hotspots and tablets. Data only.</p></div>'
    + '<div class="plan-grid"'+(mode==='pick'?' role="radiogroup" aria-label="Data plans"':'')+'>'+DATA_IDS.map(function(id){ return planCard(id,mode,recId,recDev); }).join('')+'</div>'
    + '<div class="notice"><span class="icircle red">'+icon('i-nocall')+'</span><div><b>Data plans are data only.</b><p>They cannot make or receive calls or text messages, including calls to 000. Keep another phone available for emergencies.</p></div></div></div>'
    + '<div class="group tt-group" id="tt"><div class="group-head"><h4>Talk and text plans</h4><p>Available from 30 November</p></div>'
    + '<div class="plan-grid"'+(mode==='pick'?' role="radiogroup" aria-label="Talk and text plans"':'')+'>'+TT_IDS.map(function(id){ return planCard(id,mode,recId,recDev); }).join('')+'</div></div>';
}

/* ------------------------------------------------------------
   Landing: device chooser and recommendation
   ------------------------------------------------------------ */
function devArt(dev){ var el = document.querySelector('#devgrid [data-dev="'+dev+'"] .dev-art'); return el ? el.innerHTML : icon(DEVICES[dev].icon); }
function recoHTML(dev){
  var d=DEVICES[dev], id=d.rec, p=PLANS[id], pr=priceOf(id), other=dev==='other';
  var feats=['Data only', p.net, 'Usage alerts by text and email', 'No lock-in contract'];
  return '<article class="rb">'
    + '<div class="rb-stage rx-stage"><div class="rx-art">'+devArt(dev)+'</div></div>'
    + '<div class="rb-body">'
    +   '<span class="pill brand rb-badge">'+icon('i-check','ic-xs')+(other ? 'Our most popular plan' : 'Recommended for your '+d.lc)+'</span>'
    +   '<p class="rb-big" aria-label="'+p.size+' GB"><span data-count="'+p.size+'">'+p.size+'</span><small>GB</small></p>'
    +   '<p class="rb-for">'+esc(other ? 'Not a Uniden device? Any plan is yours to choose.' : p.for)+'</p>'
    +   '<p class="rb-price">'+(pr!=null ? '<b>'+money(pr)+'</b><span>per '+S.term+' days, inc GST</span>' : '<span>365 day price to be confirmed</span>')+'<a class="lnk rb-cis" href="#" data-todo>Critical information summary</a></p>'
    +   '<ul class="rb-feat">'+feats.map(function(t){ return '<li>'+icon('i-check')+'<span>'+esc(t)+'</span></li>'; }).join('')+'</ul>'
    +   '<div class="rb-act"><button type="button" class="btn btn-primary btn-lg" data-choose="'+id+'">Choose '+p.size+' GB</button>'
    +     '<a class="rb-more" href="#plans-home" data-mode="guide" data-go="spot">Compare it with every plan'+icon('i-chev-r')+'</a></div>'
    +   (dev==='phone' ? '<p class="rb-extra">Using it as your phone? <a class="lnk" href="#tt" data-mode="all" data-go="tt">Talk and text plans</a> are in all plans.</p>' : '')
    +   '<p class="rb-warn">'+icon('i-nocall')+'<span>Data plans are data only. They cannot make or receive calls or text messages, including calls to 000.</span></p>'
        + '</div>'
    + '</article>';
}
function countUp(root){
  var el = root && root.querySelector('[data-count]'); if (!el) return;
  var to = +el.getAttribute('data-count'); if (reduce){ el.textContent = to; return; }
  var t0 = performance.now(), dur = 900;
  el.textContent = '0';
  (function step(t){ var k=Math.min(1,(t-t0)/dur), e=1-Math.pow(2,-10*k); el.textContent = Math.round(to*e); if (k<1) requestAnimationFrame(step); else el.textContent = to; })(t0);
  setTimeout(function(){ el.textContent = to; }, dur + 200);
}
function rxTilt(){
  if (reduce || !window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', function(e){
    var st = e.target.closest && e.target.closest('.rx-stage'); if (!st) return;
    var r = st.getBoundingClientRect();
    st.style.setProperty('--tx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    st.style.setProperty('--ty', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  });
  document.addEventListener('pointerout', function(e){
    var st = e.target.closest && e.target.closest('.rx-stage'); if (!st || st.contains(e.relatedTarget)) return;
    st.style.setProperty('--tx', 0); st.style.setProperty('--ty', 0);
  });
}
rxTilt();
function howDemo(){
  var sec = document.getElementById('how'); if (!sec || reduce) return;
  var tiles = [].slice.call(sec.querySelectorAll('[data-how]')); if (!tiles.length) return;
  var wide = window.matchMedia && matchMedia('(min-width: 860px)').matches, started = false;
  tiles.forEach(function(t){
    [].forEach.call(t.querySelectorAll('[data-type]'), function(el){ el._full = el.textContent; el.textContent = ''; });
    [].forEach.call(t.querySelectorAll('[data-pend]'), function(el){ el.classList.add('pend'); });
  });
  function un(el){ if (el) el.classList.remove('pend'); }
  function type(el, ms, cb){
    var str = el._full, i = 0, tn = document.createTextNode(''), c = document.createElement('i');
    c.className = 'hs-caret'; el.textContent = ''; el.appendChild(tn); el.appendChild(c);
    var iv = setInterval(function(){ i++; tn.data = str.slice(0, i);
      if (i >= str.length){ clearInterval(iv); setTimeout(function(){ c.remove(); if (cb) cb(); }, 280); } }, ms);
  }
  var plays = {
    1: function(t){ var f = t.querySelectorAll('[data-type]'), b = t.querySelector('.hs-btn');
      type(f[0], 42, function(){ type(f[1], 62, function(){ b.classList.add('press'); setTimeout(function(){ b.classList.remove('press'); }, 360); }); }); },
    2: function(t){ var sc = t.querySelector('.hs-scan'); sc.classList.add('run');
      setTimeout(function(){ sc.classList.remove('run'); un(t.querySelector('.hs-frame'));
        type(t.querySelector('[data-type]'), 38, function(){ un(t.querySelector('.hs-ok')); }); }, 2100); },
    3: function(t){ var rows = t.querySelectorAll('.hs-row');
      [].forEach.call(rows, function(r, i){ setTimeout(function(){ un(r); }, 150 + i * 480); });
      setTimeout(function(){ un(t.querySelector('.hs-done')); }, 350 + rows.length * 480); }
  };
  function check(){
    var vh = window.innerHeight;
    if (window.matchMedia && matchMedia('(min-width: 1000px)').matches){
      var a = (document.querySelector('.steps.how') || {}).getAttribute ? document.querySelector('.steps.how').getAttribute('data-active') : '1';
      var st = tiles[0].closest('.steps').getBoundingClientRect(); if (st.top > vh * .7 || st.bottom < 0) return;
      tiles.forEach(function(t){ if (!t._played && t.getAttribute('data-how')===a){ t._played = true; setTimeout(function(){ plays[a](t); }, 420); } });
      return;
    }
    if (wide){
      if (started) return;
      var r = tiles[0].querySelector('.step-stage').getBoundingClientRect();
      if (r.height && r.top < vh * .86 && r.bottom > 0){ started = true;
        tiles.forEach(function(t, i){ setTimeout(function(){ plays[t.getAttribute('data-how')](t); }, [250, 2750, 5800][i]); }); }
    } else tiles.forEach(function(t){
      if (t._played) return; var r = t.querySelector('.step-stage').getBoundingClientRect();
      if (r.height && r.top < vh * .82 && r.bottom > 0){ t._played = true; setTimeout(function(){ plays[t.getAttribute('data-how')](t); }, 250); }
    });
  }
  window.addEventListener('scroll', check, {passive:true});
  window.addEventListener('hashchange', function(){ setTimeout(check, 450); });
  check();
}
howDemo();
function renderReco(){
  var rb = $('#reco'); if (!rb) return;
  var ready = !!(S.device && S.lenPicked), key = ready ? S.device + '|' + S.term : '', was = rb.getAttribute('data-shown') || '';
  if (!ready){
    var msg = !S.device && !S.lenPicked ? 'Choose your device and plan length, and your recommended plan appears here.'
      : !S.device ? 'Now choose your device to see your recommended plan.'
      : 'Now choose a plan length to see your recommended plan.';
    rb.innerHTML = '<div class="rb rb-empty"><div class="rc-ghosts" aria-hidden="true">'+DEV_ORDER.map(function(k){ return '<span'+(k===S.device ? ' class="on"' : '')+'>'+devArt(k)+'</span>'; }).join('')+'</div><p>'+msg+'</p></div>';
    rb.removeAttribute('data-shown');
    return;
  }
  rb.innerHTML = recoHTML(S.device);
  rb.setAttribute('data-shown', key);
  var card = rb.firstElementChild;
  if (!was){
    card.classList.add('rb-reveal');
    if (current==='home' && window.innerWidth >= 1000) setTimeout(function(){
      var r = card.getBoundingClientRect(), d = Math.min(r.bottom - (window.innerHeight - 24), r.top - 84);
      if (d > 0) window.scrollBy({ top: d, behavior: reduce ? 'auto' : 'smooth' });
    }, 160);
  } else if (was !== key) card.classList.add('rb-swap');
}
function selectDevice(dev){
  S.device = (S.device===dev) ? null : dev;
  save();
  $$('#devgrid .dev').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-dev')===S.device)); });
  renderReco();
  if (S.device && current==='home') goStep(S.lenPicked ? 'step-rec' : 'step-len');
  renderPlans($('#plans-home'),'home'); journeyState(); recoSeen();
}
/* the two journeys */
function setMode(m, o){
  o = o || {};
  recoSeen();
  if (!o.scroll) return;
  setTimeout(function(){
    var box = document.getElementById('pane-guide');
    var spot = o.scroll==='spot', t = spot ? document.querySelector('#plans-home .plan.is-rec') : document.getElementById(o.scroll);
    if (!t){ t = box; spot = false; }
    var r = t.getBoundingClientRect();
    var top = spot ? r.top + window.scrollY - Math.max(96, (window.innerHeight - r.height) / 2) : r.top + window.scrollY - 84;
    if (spot){ var ah = document.querySelector('#pane-all .all-head'); if (ah){ var t0 = ah.getBoundingClientRect().top + window.scrollY - 84; if (r.bottom + window.scrollY - t0 <= window.innerHeight - 24) top = t0; } }
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    if (spot){ t.classList.remove('spot'); void t.offsetWidth; t.classList.add('spot'); }
  }, 80);
}
function choosePlan(id){ S.plan=id; S.fromLanding=true; S.ack=false; save(); location.hash='#start'; }
/* the plans journey */
function goStep(id){
  if (window.innerWidth >= 1000) return; // the whole journey is in view on wide screens
  setTimeout(function(){
    var el = document.getElementById(id); if (!el || current!=='home') return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: reduce ? 'auto' : 'smooth' });
  }, 380);
}
function journeyState(){
  var d = document.getElementById('step-dev'); if (!d) return;
  d.classList.toggle('is-complete', !!S.device);
  $('#jv-dev').textContent = S.device ? DEVICES[S.device].label : '';
  $('#step-len').classList.toggle('is-complete', !!S.lenPicked);
  $('#jv-len').textContent = S.lenPicked ? S.term + ' days' : '';
  $('#jv-rec').textContent = 'Prices per ' + S.term + ' days, inc GST';
  var jl = document.getElementById('jl-rec'); if (jl) jl.setAttribute('data-go', S.device ? 'spot' : 'pane-all');
  var ctx = document.getElementById('all-ctx');
  if (ctx) ctx.innerHTML = (S.device && S.lenPicked)
    ? (S.device==='other' ? 'Our most popular plan: <b>45 GB</b>. ' : 'Recommended for your '+DEVICES[S.device].lc+': <b>'+planName(DEVICES[S.device].rec)+'</b>. ')+'<a class="lnk" href="#plans" data-mode="guide" data-go="step-rec">Back to my recommendation</a>'
    : 'Not sure which plan suits you? <a class="lnk" href="#plans" data-mode="guide" data-go="pane-guide">Help me choose</a>';
}
function priceFlip(){
  var box = document.getElementById('plans-home'); if (!box || reduce) return;
  box.classList.remove('flip'); void box.offsetWidth; box.classList.add('flip');
  clearTimeout(priceFlip.t); priceFlip.t = setTimeout(function(){ box.classList.remove('flip'); }, 900);
}
function recoSeen(){
  var r = document.getElementById('reco'), rx = r && r.querySelector('.rb:not(.rb-empty)');
  if (!rx || rx.classList.contains('seen') || !S.device || !S.lenPicked) return;
  var b = r.getBoundingClientRect();
  if (b.height && b.top < window.innerHeight * .85 && b.bottom > 0){ rx.classList.add('seen'); countUp(r); }
}
function termTo(v){
  S.term=v; save();
  $$('[data-termctl] [data-term]').forEach(function(b){ b.setAttribute('aria-pressed', String((!b.closest('.lengths') || !!S.lenPicked) && +b.getAttribute('data-term')===v)); });
  journeyState();
  if (current==='home'){ renderPlans($('#plans-home'),'home'); renderReco(); priceFlip(); recoSeen(); }
  if (current==='plan') renderPick();
}
function renderHome(){
  journeyState();
  $$('[data-termctl] [data-term]').forEach(function(b){ b.setAttribute('aria-pressed', String((!b.closest('.lengths') || !!S.lenPicked) && +b.getAttribute('data-term')===S.term)); });
  $$('#devgrid .dev').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-dev')===S.device)); });
  renderReco();
  setMode(S.mode || 'guide', { instant:true, force:true });
  renderPlans($('#plans-home'),'home');
}

/* ------------------------------------------------------------
   Activation flow
   ------------------------------------------------------------ */
function steps(){ return isTT() ? ['start','sim','plan','details','number','review','pay','verify'] : ['start','sim','plan','details','review','pay','verify']; }
function nextOf(step){ var s=steps(), i=s.indexOf(step); return i>=0 && i<s.length-1 ? s[i+1] : 'done'; }
function prevOf(step){ var s=steps(), i=s.indexOf(step); return i>0 ? s[i-1] : 'home'; }

function syncPickBar(){
  var id=currentPlan(), pr=priceOf(id);
  $('#pick-continue').textContent = 'Continue with '+(PLANS[id].kind==='data' ? planName(id) : PLANS[id].word+' talk and text');
  $('#pick-today').innerHTML = pr!=null ? money(pr)+' today' : 'Price to be confirmed';
  $('#pick-sum-l').textContent = planLong(id)+', '+S.term+' days';
  $$('[data-step="plan"] [data-next]').forEach(function(a){ a.setAttribute('href','#'+nextOf('plan')); });
}
function renderPick(){
  $('#pick-devs').innerHTML = DEV_ORDER.map(function(k){
    var d=DEVICES[k];
    return '<button type="button" class="pk" data-pickdev="'+k+'" aria-pressed="'+(k===S.pickDev)+'"><span class="icircle'+(k===S.pickDev?' brand':'')+'">'+icon(d.icon)+'</span>'+d.label+'</button>';
  }).join('');
  renderPlans($('#plans-pick'),'pick');
  var dev = '<span class="tbc">Uniden App Cam Solo+</span>';
  $('#plan-note p').innerHTML = S.fromLanding && S.plan
    ? '<b>You chose '+esc(isTT()? 'the '+PLANS[S.plan].word+' talk and text plan' : planName(S.plan))+' on the plans page.</b> It is selected below. This SIM shipped with a '+dev+', and the recommended plan for it is flagged if you would rather switch.'
    : '<b>SIM recognised.</b> This SIM shipped with a '+dev+'. We have recommended the plan that suits how that device records. You can choose any plan.';
  syncPickBar();
}
function pickPlan(id){
  S.plan=id; S.ack=false; save();
  $$('#plans-pick .plan').forEach(function(c){ c.setAttribute('aria-checked', String(c.getAttribute('data-plan')===id)); });
  syncPickBar();
}

function renderReview(){
  var id=currentPlan(), pr=priceOf(id);
  var iccid = S.fullIccid ? (S.iccidFull||'8961 0234 5678 9012 345') : '8961 0234 '+(S.iccidRest||'5678 9012 345');
  var rows = [
    ['SIM serial', iccid, '', 'sim'],
    ['Device name', devName(), '', 'sim'],
    ['Plan', planLong(id)+', '+S.term+' days, '+(pr!=null?money(pr):'price to be confirmed'), '', 'plan']
  ];
  if (isTT()) rows.push(S.numOpt==='port'
    ? ['Your number', 'Bring '+(S.portNum||'my number')+' across', 'Usually within a business day after activation', 'number']
    : ['Your number', 'A new number', 'We will show it on the next screen and in your account.', 'number']);
  rows.push(['Account holder', 'Alex Nguyen', S.email||'alex.nguyen@example.com', 'details']);
  rows.push(['Alerts to', S.mobile||'0412 345 678', 'Not the SIM you are activating', 'details']);
  $('#review-list').innerHTML = rows.map(function(r){
    return '<div class="row"><div><p class="k">'+r[0]+'</p><p class="v num">'+esc(r[1])+'</p>'+(r[2]?'<p class="s">'+esc(r[2])+'</p>':'')+'</div><a class="edit" href="#'+r[3]+'">Change</a></div>';
  }).join('')
  + '<div class="row"><div><p class="k">Identity check</p><p class="v">After payment</p><p class="s">Driver licence, passport or Medicare card</p></div><span class="pill brand">Next</span></div>';
  var base = 'I have read the <a class="lnk-ink" href="#" data-todo>critical information summary</a>, the <a class="lnk-ink" href="#" data-todo>terms of service</a> and the <a class="lnk-ink" href="#" data-todo>privacy policy</a>';
  $('#ack-text').innerHTML = isTT() ? base+'.' : base+', and I understand this is a data only service that cannot call 000.';
  $('#ack').checked = !!S.ack;
  $('#to-pay').setAttribute('aria-disabled', String(!S.ack));
}
function renderPay(){
  var id=currentPlan(), pr=priceOf(id), txt = pr!=null ? money(pr) : null;
  $('#pay-btn').textContent = txt ? 'Pay '+txt : 'Pay now';
  $('#pay-total-bar').textContent = txt || 'To be confirmed';
  $('#sum-plan').textContent = (PLANS[id].kind==='data' ? planName(id)+' data plan' : PLANS[id].word+' talk and text plan')+', '+S.term+' days';
  $('#sum-price').textContent = txt || 'TBC';
  $('#sum-total').textContent = txt || 'TBC';
  $('#sum-runs').textContent = 'Your plan runs for '+S.term+' days from activation, not from the day you bought the SIM.';
  $('#renew-l').textContent = 'Renew automatically every '+S.term+' days';
  $('[data-autorenew]').setAttribute('aria-checked', String(!!S.autoRenew));
}
function renderVerify(){
  $$('[data-idopt]').forEach(function(b){ b.setAttribute('aria-checked', String(b.getAttribute('data-idopt')===S.idOpt)); });
  $('#verify-btn').textContent = 'Verify with '+{licence:'driver licence', passport:'passport', medicare:'Medicare card'}[S.idOpt]+' and activate';
}
function renderDone(){
  var id=currentPlan(), p=PLANS[id], name=devName(), tt=isTT();
  var dev = tt ? 'phone' : (S.device && S.device!=='other' ? S.device : (S.pickDev||'seccam'));
  $('#done-ic').innerHTML = icon(DEVICES[dev].icon);
  $('#done-name').textContent = name;
  $('#done-plan').textContent = planLong(id)+', '+S.term+' days';
  var mark = $('.done-mark'); mark.style.animation='none'; void mark.offsetWidth; mark.style.animation='';
  var path = $('.done-mark path'); path.style.animation='none'; void path.offsetWidth; path.style.animation='';
  var gb = p.kind==='data' ? p.size+' GB' : p.data;
  if (tt){
    var port = S.numOpt==='port';
    $('#h-done').textContent = 'Your number is '+(port && S.portNum ? S.portNum : '0412 … 678');
    $('#done-lede').textContent = port
      ? 'Your '+p.word+' plan is active. Your number will move across within a business day, we will text you when it is done.'
      : 'Your '+p.word+' plan is active. We have emailed your receipt and critical information summary.';
  } else {
    $('#h-done').textContent = name+' is online';
    $('#done-lede').textContent = 'Your '+gb+' plan is active. Your device should connect within a couple of minutes. We have emailed your receipt and critical information summary.';
  }
  var ends = S.term===30 ? ['17 Oct','30 days from today'] : ['17 Sep','365 days from today'];
  $('#done-facts').innerHTML =
      '<div><p class="k">Data</p><p class="v">'+gb+'</p><p class="s">Full allowance</p></div>'
    + '<div><p class="k">Plan ends</p><p class="v">'+ends[0]+'</p><p class="s">'+ends[1]+'</p></div>'
    + '<div><p class="k">Auto renew</p><p class="v">'+(S.autoRenew?'On':'Off')+'</p><p class="s">'+(S.autoRenew?'Turn off any time':'Turn on any time')+'</p></div>';
}
function syncNumOpt(){
  $$('[data-numopt]').forEach(function(b){ b.setAttribute('aria-checked', String(b.getAttribute('data-numopt')===S.numOpt)); });
  $('#port-more').hidden = S.numOpt!=='port';
}
function renderFlow(step){
  var s = steps(), idx = s.indexOf(step), isDone = step==='done';
  $$('[data-step]').forEach(function(sec){ sec.hidden = sec.getAttribute('data-step')!==step; });
  $('[data-back]').style.visibility = isDone ? 'hidden' : 'visible';
  $('#stepct').textContent = isDone ? 'Activated' : 'Step '+(idx+1)+' of '+s.length;
  $('#progbar').style.transform = 'scaleX('+(isDone ? 1 : (idx+1)/s.length)+')';
  $('#flowfoot').textContent = step==='number' ? 'Uniden Mobile. Talk and text plans can call 000.' : 'Uniden Mobile. Data plans are data only, no voice or SMS, including 000. Talk and text plans can call 000.';
  $$('[data-step="'+step+'"] [data-next]').forEach(function(a){ a.setAttribute('href','#'+nextOf(step)); });
  $$('[data-bind]').forEach(function(inp){ var k=inp.getAttribute('data-bind'); if (S[k] && inp.value!==S[k]) inp.value=S[k]; });
  $('#iccid-split').hidden = !!S.fullIccid; $('#iccid-full').hidden = !S.fullIccid;
  if (step==='plan') renderPick();
  if (step==='number') syncNumOpt();
  if (step==='review') renderReview();
  if (step==='pay') renderPay();
  if (step==='verify') renderVerify();
  if (step==='done') renderDone();
  if (step==='details') sweep($('[data-step="details"]'));
}

/* ------------------------------------------------------------
   My account
   ------------------------------------------------------------ */
function svcState(s){
  var t = S.topped[s.id]; if (!t) return s;
  var c = {}; for (var k in s) c[k]=s[k];
  c.total = s.total + t; c.status='green'; c.label='Active'; return c;
}
function svcCard(raw){
  var s = svcState(raw), off = s.status==='red', left = Math.max(0, s.total-s.used), name = svcName(s);
  var when = off ? 'Offline' : s.status==='amber' ? s.label : 'Ends '+s.ends;
  return '<article class="svc'+(off?' attn':'')+'" data-svc="'+s.id+'">'
    + '<div class="svc-art'+(off?' off':'')+'" aria-hidden="true">'+devArt(s.art||s.dev)+(off ? '<span class="focus-badge">'+icon('i-offline')+'</span>' : '')+'</div>'
    + '<div class="svc-id"><p class="svc-name"><span>'+esc(name)+'</span><button type="button" class="svc-edit" data-rename="'+s.id+'" aria-label="Rename '+esc(name)+'" title="Rename">'+icon('i-pencil')+'</button></p><p class="svc-sub">'+esc(s.plan)+'</p></div>'
    + '<div class="svc-use"><div class="svc-head"><p class="svc-left"><b>'+fmt(s.used)+'</b><span>/ '+s.total+' GB used</span></p>'
    + '<p class="svc-when'+(s.status==='green' ? '' : ' '+s.status)+'">'+esc(when)+'</p></div>'
    + meterHTML(s.used/s.total*100, s.status, false)+'</div>'
    + '<div class="svc-acts"><a class="btn btn-sm '+(off ? 'btn-primary' : 'btn-secondary')+'" href="#topup" data-svc-go="topSvc" data-id="'+s.id+'">Top up</a></div>'
    + '<a class="svc-open" href="#myplan" data-svc-go="planSvc" data-id="'+s.id+'" aria-label="View plan for '+esc(name)+'">'+icon('i-chev-r')+'</a>'
    + '</article>';
}
function renderDash(){
  var list = SVCS.map(svcState), attn = list.filter(function(s){ return s.status==='red'; });
  var f = attn[0];
  $('#dash-alert').innerHTML = f
    ? '<div class="focus">'
      + '<div class="focus-art" aria-hidden="true">'+devArt(f.art||f.dev)+'<span class="focus-badge">'+icon('i-offline')+'</span></div>'
      + '<div class="focus-copy"><p class="focus-t">'+esc(svcName(f))+' has run out of data and is offline.</p>'
      + '<p class="focus-s">Buy a top up to bring it straight back online.</p>'
      + '<div class="focus-use">'+meterHTML(100, 'red', false)+'<span>'+fmt(f.used)+' of '+f.total+' GB used</span></div></div>'
      + '<div class="focus-act"><a class="btn btn-primary" href="#topup" data-svc-go="topSvc" data-id="'+f.id+'">Top up data</a>'
      + '<a class="go" href="#usage" data-svc-go="usageSvc" data-id="'+f.id+'">See usage'+icon('i-chev-r')+'</a></div>'
      + '</div>'
    : '';
  $('#dash-stats').innerHTML =
      '<span><b>'+SVCS.length+'</b> services, all on one account</span>'
    + (attn.length ? '<span class="red"><b>'+attn.length+'</b> needs attention</span>' : '<span>Nothing needs attention</span>')
    + '<span>Next to expire: <b>'+esc(svcName(svcById('frontdoor')))+'</b>, <span class="nw">25 Sep (12 days)</span></span>';
  var order={red:0,amber:1,green:2};
  $('#svc-list').innerHTML = SVCS.slice().sort(function(a,b){ return order[svcState(a).status]-order[svcState(b).status]; }).map(svcCard).join('')
    + '<a class="svc-add" href="#start" data-fresh><span class="svc-art add">'+icon('i-plus')+'</span><span><b>Activate another SIM</b></span>'+icon('i-chev-r','chev')+'</a>';
  sweep($('#svc-list')); sweep($('#dash-alert'));
}
function pickerHTML(key){
  return SVCS.map(function(raw){
    var s=svcState(raw);
    return '<button type="button" class="pk" data-sw="'+key+'" data-id="'+s.id+'" aria-pressed="'+(S[key]===s.id)+'"><span class="pk-art">'+devArt(s.art||s.dev)+'<span class="pk-badge '+s.status+'">'+icon(s.status==='red' ? 'i-offline' : s.status==='amber' ? 'i-bell' : 'i-check')+'</span></span><span class="pk-t"><b>'+esc(svcName(s))+'</b><span class="pk-s'+(s.status==='green' ? '' : ' '+s.status)+'">'+(s.status==='green' ? fmt(Math.max(0, s.total-s.used))+' GB left' : esc(s.label))+'</span></span>'+icon('i-check','pk-on')+'</button>';
  }).join('');
}
function seriesFor(s){
  var k = s.rate/.76, out = FRONT_SERIES.map(function(v){ return +(v*k).toFixed(2); });
  if (s.status==='red' && !S.topped[s.id]){ out[16]=0; out[17]=0; }
  return out;
}
function chartSVG(series, pace, width){
  var W = Math.max(300, Math.round(width||640)), H = 200, L = 48, R = 6, T = 14, B = 30;
  var max = Math.max(1.5, Math.ceil(Math.max.apply(null, series.concat([pace||0]))*2)/2);
  var n = series.length, bw = (W-L-R)/n, w = Math.max(6, Math.min(26, bw*.62));
  function y(v){ return T+(H-T-B)*(1-v/max); }
  var g = '';
  [0, max/2, max].forEach(function(v,i){
    g += '<line class="'+(i?'gl':'base')+'" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'"/>'
       + '<text class="lbl" x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+String(+v.toFixed(2))+(i===2?' GB':'')+'</text>';
  });
  var bars = series.map(function(v,i){
    var x = L + i*bw + (bw-w)/2, h = Math.max(v>0?3:0, (H-T-B)*v/max);
    return '<rect class="bar'+(!pace || v > pace ? ' over' : '')+'" x="'+x.toFixed(1)+'" y="'+(y(0)-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+Math.min(5,w/2)+'"><title>Day '+(i+1)+', '+v+' GB</title></rect>';
  }).join('');
  var pl = pace ? '<line class="pace-line" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(pace)+'" y2="'+y(pace)+'"/>' : '';
  var xl = [[0,'27 Aug'],[Math.floor(n/2)-1,'4 Sep'],[n-1,'13 Sep']].map(function(a){
    var x = L + a[0]*bw + bw/2;
    return '<text class="lbl" x="'+x+'" y="'+(H-8)+'" text-anchor="'+(a[0]===0?'start':a[0]===n-1?'end':'middle')+'">'+a[1]+'</text>';
  }).join('');
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Daily data use for the last 18 days">'+g+pl+bars+xl+'</svg>';
}
function cardHead(s, sub){
  var off = s.status==='red';
  return '<div class="ch-top">'
    + '<div class="svc-art'+(off?' off':'')+'" aria-hidden="true">'+devArt(s.art||s.dev)+(off ? '<span class="focus-badge">'+icon('i-offline')+'</span>' : '')+'</div>'
    + '<div class="ch-id"><p class="ch-name">'+esc(svcName(s))+'</p><p class="ch-sub">'+esc(sub)+'</p></div>'
    + '</div>';
}
function cardWhen(s){
  var w = s.status==='red' ? 'Offline' : s.status==='amber' ? s.label : '';
  return w ? '<p class="svc-when '+s.status+'">'+esc(w)+'</p>' : '';
}
function tiles(list){
  return '<dl class="pb-stats">' + list.map(function(t){ return '<div><dt>'+t[0]+'</dt><dd'+(t[2] ? ' class="'+t[2]+'"' : '')+'>'+t[1]+'</dd></div>'; }).join('') + '</dl>';
}
function renderUsage(){
  $('[data-switch="usageSvc"]').innerHTML = pickerHTML('usageSvc');
  var s = svcState(svcById(S.usageSvc)), series = seriesFor(s), off = s.status==='red', left = Math.max(0, s.total-s.used);
  var pace = /30 days/.test(s.plan) ? s.total/30 : null;
  var paceMsg = s.id==='frontdoor'
    ? '<p class="u-note amber">'+icon('i-info')+'<span>At this rate, data runs out <b>3 days early</b>.</span></p>'
    : (off ? '<p class="u-note red">'+icon('i-offline')+'<span><b>Out of data.</b> Buy a top up to bring it straight back online.</span></p>' : '');
  var card = $('#usage-card');
  card.innerHTML = cardHead(s, s.plan)
    + '<div class="uc-head"><p class="uc-fig'+(off?' red':'')+'"><b>'+fmt(s.used)+'</b><span>/ '+s.total+' GB used</span></p>'+cardWhen(s)+'</div>'
    + meterHTML(s.used/s.total*100, s.status, true)
    + tiles([['Left', fmt(left)+' GB', off ? 'red' : ''], ['Daily average', s.rate.toFixed(2)+' GB'], ['Plan ends', s.ends]])
    + paceMsg;
  var key = $('#pace-key'), box = $('#usage-chart .chart-box');
  key.innerHTML = pace ? '<i></i>Even pace, '+pace.toFixed(2)+' GB a day uses your '+s.total+' GB in exactly 30 days' : '';
  key.hidden = !pace;
  box.innerHTML = chartSVG(series, pace, box.clientWidth || card.clientWidth - 48);
  sweep(card);
  var alerts = {frontdoor:[['75% of your data used','11 Sep, text and email'],['50% of your data used','7 Sep, text and email']], backgate:[['100% of your data used','Yesterday, text and email']]}[s.id];
  $('#alerts-list').innerHTML = alerts
    ? alerts.map(function(a){ return '<div class="row"><span class="lead">'+icon('i-bell')+'<span class="v">'+a[0]+'</span></span><span class="t-xs mut" style="text-align:right">'+a[1]+'</span></div>'; }).join('')
    : '<div class="row"><span class="t-s mut">No alerts this period.</span></div>';
}
function renderTopup(){
  $('[data-switch="topSvc"]').innerHTML = pickerHTML('topSvc');
  var s = svcState(svcById(S.topSvc)), name = svcName(s), off = s.status==='red';
  $('#topup-alert').innerHTML = off
    ? '<div class="focus compact"><div class="focus-off" aria-hidden="true">'+icon('i-offline')+'</div><div class="focus-copy"><p class="focus-t">'+esc(name)+' has run out of data and is offline.</p><p class="focus-s">Buy a top up to bring it straight back online. Nothing else needs to happen and you do not need to wait for your plan to renew.</p></div></div>' : '';
  $('#topup-h').textContent = 'Add data to '+name;
  $('#topup-sub').textContent = s.plan+'. Top up data goes to this service only and lasts until its plan ends on '+s.ends+'. Your other services are not affected.';
  $('#packs').innerHTML = PACKS.map(function(p){
    return '<button type="button" class="pack" role="radio" aria-checked="'+(S.pack===p.gb)+'" data-pack="'+p.gb+'">'
      + (p.best ? '<span class="pill brand">Best value</span>' : '')
      + '<span class="size">'+p.gb+'<small> GB</small></span><span class="pr">'+money(p.price)+'<span>inc GST</span></span></button>';
  }).join('');
  var pk = PACKS.filter(function(p){ return p.gb===S.pack; })[0];
  $('#tu-line').textContent = pk.gb+' GB top up';
  $('#tu-price').textContent = money(pk.price);
  $('#tu-total').textContent = money(pk.price);
  $('#tu-after').textContent = off ? 'Your device comes back online within a couple of minutes.' : 'Add data now and it is available straight away. Your plan end date does not change.';
}
function renewCopy(s, auto){
  return auto ? '<b>Auto renew is on</b><p>On '+s.ends+' we will charge your saved card and keep you running. You can turn it off any time.</p>'
              : '<b>Auto renew is off</b><p>On '+s.ends+' your plan will end and your device will go offline until you buy more data. Turn auto renew on and we will charge your saved card and keep you running.</p>';
}
function renderMyPlan(){
  $('[data-switch="planSvc"]').innerHTML = pickerHTML('planSvc');
  var s = svcState(svcById(S.planSvc)), auto = S.autoSvc[s.id]!=null ? S.autoSvc[s.id] : s.auto;
  var meta = [s.price ? s.price+' inc GST' : '', s.extra ? s.extra.charAt(0).toUpperCase()+s.extra.slice(1) : ''].filter(Boolean).join(' · ');
  $('#myplan-hero').innerHTML = '<div class="planbox pb2">'
    + cardHead(s, s.ref)
    + '<div class="uc-head pb-head"><h2>'+esc(s.plan)+'</h2>'+cardWhen(s)+'</div>'
    + (meta ? '<p class="pb-meta">'+esc(meta)+'</p>' : '')
    + tiles([['Started', s.started], ['Ends', s.endsFull], ['Data used', fmt(s.used)+'<small> / '+s.total+' GB</small>', s.status==='red' ? 'red' : '']])
    + '</div>';
  $('#myplan-renew').innerHTML = '<div class="renew rn '+(auto?'on':'off')+'"><div class="rn-copy">'+renewCopy(s, auto)+'</div>'
    + '<button class="switch" type="button" role="switch" aria-checked="'+auto+'" aria-label="Auto renew" data-svc-auto="'+s.id+'"></button></div>';
  var opts = [['45 GB, 30 days','More data each period','$34.00'],['120 GB, 30 days','Heavy continuous recording','$60.00'],['25 GB, 365 days','Pay once for the year','$249.00']].filter(function(o){ return o[0]!==s.plan; });
  $('#change-list').innerHTML = opts.map(function(o){
    return '<button type="button" class="row tap" data-todo="A plan change takes effect at your next renewal"><span><span class="ttl">'+o[0]+'</span><span class="s block">'+o[1]+'</span></span><span class="lead"><b class="num">'+o[2]+'</b>'+icon('i-chev-r','chev')+'</span></button>';
  }).join('');
  var idRow = s.voice ? ['Number','0412 … 678'] : ['SIM serial','8961 … '+s.ref.slice(-4)];
  $('#svc-details').innerHTML =
      '<div class="row"><span class="k t-s">Name</span><span class="lead"><b class="t-s">'+esc(svcName(s))+'</b><button class="edit" type="button" data-rename-plan="'+s.id+'">Rename</button></span></div>'
    + '<div class="row"><span class="k t-s">Started</span><b class="t-s">'+s.started+'</b></div>'
    + '<div class="row"><span class="k t-s">'+idRow[0]+'</span><b class="t-s num">'+idRow[1]+'</b></div>'
    + '<div class="row"><span class="k t-s">Critical information summary</span><a class="edit" href="#" data-todo>View</a></div>'
    + '<div class="row"><span class="k t-s">Network status</span><span class="lead t-s"><span class="dot green"></span>No known outages</span></div>';
}
function renderAccount(sub){
  $$('[data-acct]').forEach(function(sec){ sec.hidden = sec.getAttribute('data-acct')!==sub; });
  $$('.side [data-nav], .tabbar [data-nav]').forEach(function(a){
    if (a.getAttribute('data-nav')===sub) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  $('#crumb').textContent = {account:'Dashboard',usage:'Usage',topup:'Top up',myplan:'My plan',payments:'Payments and receipts',help:'Help'}[sub];
  if (sub==='account') renderDash();
  if (sub==='usage') renderUsage();
  if (sub==='topup') renderTopup();
  if (sub==='myplan') renderMyPlan();
}

/* ------------------------------------------------------------
   Router
   ------------------------------------------------------------ */
var FLOW = ['start','sim','plan','details','number','review','pay','verify','done'];
var ACCT = ['account','usage','topup','myplan','payments','help'];
var TITLES = {start:'Get started', sim:'SIM serial', plan:'Choose your plan', details:'Your details', number:'Your number', review:'Check and confirm', pay:'Payment', verify:'Verify your identity', done:'Activated', account:'Dashboard', usage:'Usage', topup:'Top up', myplan:'My plan', payments:'Payments and receipts', help:'Help'};
var current = null, navs = 0, ticking = false, heroCta = $('.hero-cta');
function stuckHeads(){ document.querySelectorAll('#pane-all .group-head').forEach(function(g){ var t = g.getBoundingClientRect().top; g.classList.toggle('is-stuck', t <= 58 && t > -g.offsetHeight); }); }
function heroScene(){
  var st = document.querySelector('.hero > .stage'); if (!st) return;
  var on = window.innerWidth >= 1000 && !reduce && current==='home';
  document.documentElement.classList.toggle('hero-scene', on);
  if (!on) return;
  var r = st.getBoundingClientRect(), c = (r.top + r.height / 2) / window.innerHeight;
  st.querySelectorAll('.notif').forEach(function(n, i){ n.classList.toggle('in', c < [.9, .74, .58][i]); });
}
window.addEventListener('resize', function(){ requestAnimationFrame(heroScene); });
function navState(){ ticking=false; stuckHeads(); heroScene(); document.body.classList.toggle('at-top', current==='home' && window.scrollY < 8); document.body.classList.toggle('past-hero', current==='home' && heroCta.getBoundingClientRect().bottom < 0); }
window.addEventListener('scroll', function(){ if (!ticking){ ticking=true; requestAnimationFrame(navState); } }, {passive:true});
$$('.phone [data-art], .notif [data-art]').forEach(function(el){ el.insertAdjacentHTML('afterbegin', devArt(el.getAttribute('data-art'))); });
document.addEventListener('click', function(e){
  if (!e.target.closest('[data-top]')) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0, behavior: still ? 'instant' : 'smooth'});
  var logo = document.querySelector('.nav .logo'); if (logo) logo.focus({preventScroll:true});
});
window.addEventListener('hashchange', function(){ setTimeout(navState, 60); });
setTimeout(navState, 0);
window.addEventListener('scroll', recoSeen, {passive:true});

function route(){
  var h = (location.hash||'').slice(1) || 'home';
  if (h!=='home' && FLOW.indexOf(h)<0 && ACCT.indexOf(h)<0) h='home';
  if (h==='number' && !isTT()) h='review';
  var group = h==='home' ? 'home' : FLOW.indexOf(h)>=0 ? 'flow' : 'account';
  $$('[data-route]').forEach(function(el){
    var on = el.getAttribute('data-route')===group;
    if (on && el.hidden){ el.hidden=false; el.classList.remove('scr'); void el.offsetWidth; el.classList.add('scr'); }
    else if (!on) el.hidden=true;
  });
  var prev = current; current = h;
  document.title = h==='home' ? 'Uniden Mobile' : TITLES[h]+' · Uniden Mobile';
  if (group==='home') renderHome();
  if (group==='flow') renderFlow(h);
  if (group==='account') renderAccount(h);
  if (prev!==null){
    window.scrollTo(0,0);
    var h1 = document.querySelector(group==='home' ? '#h-hero' : group==='flow' ? '[data-step="'+h+'"] h1' : '[data-acct="'+h+'"] h1');
    if (h1){ h1.setAttribute('tabindex','-1'); h1.focus({preventScroll:true}); }
  }
  navState();
}

/* ------------------------------------------------------------
   Events
   ------------------------------------------------------------ */
document.addEventListener('click', function(e){
  var el;
  if ((el = e.target.closest('[data-mode]'))){ e.preventDefault(); setMode(el.getAttribute('data-mode'), { scroll: el.getAttribute('data-go') }); return; }
  if ((el = e.target.closest('[data-todo]'))){ e.preventDefault(); toast(el.getAttribute('data-todo') || 'Not part of this prototype'); return; }
  if ((el = e.target.closest('[data-scroll]'))){
    var target = document.getElementById(el.getAttribute('data-scroll'));
    if (target && !target.closest('[hidden]')){ e.preventDefault(); target.scrollIntoView({behavior: reduce?'auto':'smooth', block:'start'}); return; }
  }
  if ((el = e.target.closest('[data-fresh]'))){
    S.plan=null; S.fromLanding=false; S.ack=false; S.devName=''; S.iccidRest=''; S.iccidFull=''; S.fullIccid=false; save();
  }
  if ((el = e.target.closest('[data-back]'))){ if (navs>0) history.back(); else location.hash = '#'+prevOf(current); return; }
  if ((el = e.target.closest('#devgrid .dev'))){ selectDevice(el.getAttribute('data-dev')); return; }
  if ((el = e.target.closest('[data-choose]'))){ choosePlan(el.getAttribute('data-choose')); return; }
  if ((el = e.target.closest('[data-term]'))){ var inJ = !!el.closest('.lengths'); if (inJ){ S.lenPicked = true; save(); } termTo(+el.getAttribute('data-term')); if (inJ && current==='home') goStep('step-rec'); return; }
  if ((el = e.target.closest('.plan.pickable'))){ pickPlan(el.getAttribute('data-plan')); return; }
  if ((el = e.target.closest('[data-pickdev]'))){ S.pickDev = el.getAttribute('data-pickdev'); save(); renderPick(); return; }
  if ((el = e.target.closest('[data-iccid-full]'))){
    S.fullIccid = true; save(); $('#iccid-split').hidden=true; $('#iccid-full').hidden=false; $('#f-iccid-full').focus();
    $('#iccid-hint').textContent = 'Type all of the digits printed under the barcode on your sleeve.';
    return;
  }
  if ((el = e.target.closest('[data-numopt]'))){ S.numOpt = el.getAttribute('data-numopt'); save(); syncNumOpt(); return; }
  if ((el = e.target.closest('[data-idopt]'))){ S.idOpt = el.getAttribute('data-idopt'); save(); renderVerify(); return; }
  if ((el = e.target.closest('[data-autorenew]'))){ S.autoRenew=!S.autoRenew; save(); el.setAttribute('aria-checked', String(S.autoRenew)); return; }
  if ((el = e.target.closest('#to-pay')) && !S.ack){ e.preventDefault(); toast('Tick the box to confirm you have read these'); return; }
  if ((el = e.target.closest('[data-svc-go]'))){ S[el.getAttribute('data-svc-go')] = el.getAttribute('data-id'); save(); return; }
  if ((el = e.target.closest('[data-topup-from]'))){ S.topSvc = S.usageSvc; save(); return; }
  if ((el = e.target.closest('[data-sw]'))){ S[el.getAttribute('data-sw')] = el.getAttribute('data-id'); save(); renderAccount(current); return; }
  if ((el = e.target.closest('[data-pack]'))){ S.pack = +el.getAttribute('data-pack'); save(); renderTopup(); return; }
  if ((el = e.target.closest('[data-cardopt]'))){
    $$('[data-cardopt]').forEach(function(b){ b.setAttribute('aria-checked', String(b===el)); });
    if (el.getAttribute('data-cardopt')==='new') toast('Not part of this prototype');
    return;
  }
  if ((el = e.target.closest('#tu-pay'))){
    var s = svcById(S.topSvc), wasOff = svcState(s).status==='red';
    S.topped[s.id] = (S.topped[s.id]||0) + S.pack; save();
    toast(wasOff ? svcName(s)+' is coming back online' : S.pack+' GB added to '+svcName(s));
    location.hash = '#account'; return;
  }
  if ((el = e.target.closest('[data-svc-auto]'))){
    var sid = el.getAttribute('data-svc-auto'), cur = S.autoSvc[sid]!=null ? S.autoSvc[sid] : svcById(sid).auto;
    S.autoSvc[sid] = !cur; save();
    var box = el.closest('.renew.rn');
    if (box){
      box.classList.toggle('on', !cur); box.classList.toggle('off', cur);
      $('.rn-copy', box).innerHTML = renewCopy(svcState(svcById(sid)), !cur);
      el.setAttribute('aria-checked', String(!cur));
    } else renderMyPlan();
    return;
  }
  if ((el = e.target.closest('[data-rename]')) || (el = e.target.closest('[data-rename-plan]'))){
    startRename(el.getAttribute('data-rename') || el.getAttribute('data-rename-plan'), el); return;
  }
});
document.addEventListener('keydown', function(e){
  var tb = e.target.closest && e.target.closest('#paths .path');
  if (tb && (e.key==='ArrowLeft' || e.key==='ArrowRight')){ e.preventDefault(); var nx = tb.getAttribute('data-mode')==='guide' ? 'all' : 'guide'; setMode(nx); document.getElementById('tab-'+nx).focus(); return; }
  var el = e.target;
  if ((e.key==='Enter' || e.key===' ') && el.matches && el.matches('.plan.pickable')){ e.preventDefault(); pickPlan(el.getAttribute('data-plan')); }
});
function inlineRename(id, btn){
  var s = svcById(id), nm = btn.parentNode, span = nm.querySelector('span');
  if (!span || nm.classList.contains('editing')) return;
  nm.classList.add('editing');
  var inp = document.createElement('input');
  inp.className = 'svc-name-in'; inp.value = svcName(s); inp.maxLength = 40; inp.setAttribute('aria-label', 'Service name');
  span.replaceWith(inp);
  btn.innerHTML = icon('i-check'); btn.removeAttribute('data-rename'); btn.setAttribute('aria-label', 'Save name'); btn.setAttribute('title', 'Save');
  var done = false;
  function finish(commit){
    if (done) return; done = true;
    var v = inp.value.trim();
    if (commit && v && v !== svcName(s)){ S.names[id] = v; save(); toast('Renamed to ' + v); }
    renderAccount(current);
  }
  inp.addEventListener('keydown', function(ev){ if (ev.key === 'Enter'){ ev.preventDefault(); finish(true); } else if (ev.key === 'Escape'){ ev.preventDefault(); finish(false); } });
  inp.addEventListener('blur', function(){ finish(true); });
  btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); finish(true); });
  btn.addEventListener('click', function(ev){ ev.preventDefault(); finish(true); });
  inp.focus(); inp.select();
}
function startRename(id, from){
  if (from.classList && from.classList.contains('svc-edit')) return inlineRename(id, from);
  var s = svcById(id), host = from.closest('.svc') || from.closest('.row');
  if (!host || $('.rename', host.parentNode)) return;
  var row = document.createElement('form');
  row.className = 'rename';
  row.innerHTML = '<label class="sr" for="rn-'+id+'">New name</label><input id="rn-'+id+'" value="'+esc(svcName(s))+'"><button class="btn btn-primary btn-sm" type="submit">Save</button>';
  if (host.classList.contains('row')){ row.style.padding='0 var(--s5) var(--s4)'; host.insertAdjacentElement('afterend', row); }
  else host.insertBefore(row, $('.svc-acts', host));
  var inp = $('input', row); inp.focus(); inp.select();
  row.addEventListener('submit', function(ev){
    ev.preventDefault();
    var v = inp.value.trim(); if (v){ S.names[id]=v; save(); }
    renderAccount(current);
    toast('Renamed to '+(S.names[id]||s.name));
  });
}
document.addEventListener('input', function(e){ var k = e.target.getAttribute && e.target.getAttribute('data-bind'); if (k){ S[k]=e.target.value; save(); } });
document.addEventListener('change', function(e){ if (e.target.id==='ack'){ S.ack=e.target.checked; save(); $('#to-pay').setAttribute('aria-disabled', String(!S.ack)); } });
var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz=setTimeout(function(){ if (current==='usage') renderUsage(); }, 150); });
var THEME_KEY = 'um-theme';
function themeGet(){ try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch(err){ return 'light'; } }
function themeApply(t){
  document.documentElement.setAttribute('data-acct-theme', t);
  document.querySelectorAll('[data-theme-toggle]').forEach(function(b){ b.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false'); });
}
themeApply(themeGet());
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-theme-toggle]'); if (!b) return;
  var next = document.documentElement.getAttribute('data-acct-theme') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch(err){}
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || still){ themeApply(next); return; }
  var root = document.documentElement; root.classList.add('vt-theme');
  var vt = document.startViewTransition(function(){ themeApply(next); });
  vt.finished.then(function(){ root.classList.remove('vt-theme'); }, function(){ root.classList.remove('vt-theme'); });
});
function placePlates(){
  document.querySelectorAll('.ch-track').forEach(function(tr){
    var pl = tr.querySelector('.ch-plate'), on = tr.querySelector('[aria-pressed="true"]');
    if (!pl) return;
    if (!on || !on.offsetWidth){ tr.classList.remove('has-sel'); return; }
    var fresh = !tr.classList.contains('has-sel');
    if (fresh) pl.style.transition = 'none';
    pl.style.width = on.offsetWidth + 'px'; pl.style.height = on.offsetHeight + 'px';
    pl.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
    if (fresh){ void pl.offsetWidth; pl.style.transition = ''; tr.classList.add('has-sel'); }
  });
}
(function(){
  var box = document.getElementById('pane-guide'); if (!box) return;
  new MutationObserver(placePlates).observe(box, {attributes:true, subtree:true, attributeFilter:['aria-pressed']});
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(placePlates, 100); });
  window.addEventListener('load', placePlates);
  requestAnimationFrame(function(){ placePlates(); requestAnimationFrame(function(){ box.classList.add('ch-ready'); }); });
})();
function howStory(){
  var wrap = document.querySelector('.how-scroll'), box = wrap && wrap.querySelector('.steps.how'); if (!box) return;
  var on = window.matchMedia && matchMedia('(min-width: 1000px)').matches;
  var copies = [].slice.call(box.querySelectorAll('.step-copy'));
  if (!on || !copies.length || !wrap.offsetParent) return;
  var r = wrap.getBoundingClientRect(), run = Math.max(1, wrap.offsetHeight - (window.innerHeight - 57));
  var p = Math.max(0, Math.min(1, (57 - r.top) / run)), act = Math.min(3, Math.floor(p * 3) + 1);
  if (box.getAttribute('data-active') !== String(act)){ box.setAttribute('data-active', act); copies.forEach(function(c, i){ c.classList.toggle('on', i + 1 === act); }); }
  copies.forEach(function(c, i){ c.style.setProperty('--f', i + 1 === act ? Math.max(0, Math.min(1, p * 3 - i)).toFixed(3) : 0); });
}
document.addEventListener('click', function(e){
  var c = e.target.closest && e.target.closest('.how-scroll .step-copy'); if (!c || !(window.matchMedia && matchMedia('(min-width: 1000px)').matches)) return;
  var wrap = c.closest('.how-scroll'), i = [].indexOf.call(wrap.querySelectorAll('.step-copy'), c);
  var run = wrap.offsetHeight - (window.innerHeight - 57), top = wrap.getBoundingClientRect().top + window.scrollY - 57;
  window.scrollTo({ top: top + run * (i / 3 + .06), behavior: reduce ? 'auto' : 'smooth' });
});
window.addEventListener('scroll', function(){ requestAnimationFrame(howStory); }, {passive:true});
window.addEventListener('resize', function(){ requestAnimationFrame(howStory); });
window.addEventListener('hashchange', function(){ setTimeout(howStory, 120); });
(function(){ var c = document.querySelector('.steps.how .step-copy'); if (c) c.classList.add('on'); requestAnimationFrame(howStory); })();
window.addEventListener('hashchange', function(){ navs++; route(); });
// a refresh always opens at the top: the clear nav over the sky, never a restored mid-page frosted bar
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
route();
requestAnimationFrame(function(){ requestAnimationFrame(function(){ document.body.classList.add('nav-ready'); }); });
})();
