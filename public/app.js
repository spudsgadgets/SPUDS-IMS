let API_BASE=(location.protocol==='file:'? 'http://localhost:3200' : '')
function api(path){return API_BASE+path}
if(location.protocol==='file:'){
  ;(async()=>{
    const tryBase=async(base)=>{
      try{
        const r=await fetch(base+'/api/health',{cache:'no-store'})
        if(r&&r.ok){API_BASE=base;return true}
      }catch{}
      return false
    }
    const ok=await tryBase('http://localhost:3200') || await tryBase('http://localhost:3201')
    if(!ok)try{toast('Cannot connect to API server on localhost (ports 3200/3201)','warn')}catch{}
  })()
}
let __toastHost=null
function __ensureToastHost(){
  if(__toastHost&&document.body.contains(__toastHost))return __toastHost
  const host=document.createElement('div')
  host.className='toast-host'
  host.id='toast-host'
  document.body.appendChild(host)
  __toastHost=host
  return host
}
function toast(message,type){
  const msg=String(message||'').trim()
  if(!msg)return
  const host=__ensureToastHost()
  const el=document.createElement('div')
  el.className='toast'+(type?(' toast-'+type):'')
  const text=document.createElement('div')
  text.className='toast-msg'
  text.textContent=msg
  const x=document.createElement('button')
  x.type='button'
  x.className='icon-btn toast-x'
  x.textContent='×'
  x.setAttribute('aria-label','Dismiss')
  x.addEventListener('click',()=>{try{el.remove()}catch{}})
  el.addEventListener('click',e=>{if(e&&e.target===x)return;try{el.remove()}catch{}})
  el.appendChild(text)
  el.appendChild(x)
  host.appendChild(el)
  const ttl=(type==='error'?7000:(type==='warn'?5500:4000))
  setTimeout(()=>{try{el.remove()}catch{}},ttl)
}
function applyTheme(t){document.body.classList.toggle('dark',t==='dark');try{localStorage.setItem('theme',t)}catch{};const themeBtn=document.getElementById('theme-btn');if(themeBtn)themeBtn.textContent=t==='dark'?'Light':'Dark'}
function applyMode(m){
  document.body.classList.remove('mobile','desktop')
  if(m==='mobile'){
    document.body.classList.add('mobile')
  }else if(m==='desktop'){
    document.body.classList.add('desktop')
  }
  try{localStorage.setItem('mode',m)}catch{}
  const modeBtn=document.getElementById('mode-btn');if(modeBtn)modeBtn.textContent=m==='mobile'?'Desktop':'Mobile'
  updateStickyTop()
}
document.addEventListener('DOMContentLoaded',()=>{
  const themeBtn=document.getElementById('theme-btn')
  const modeBtn=document.getElementById('mode-btn')
  if(modeBtn)modeBtn.addEventListener('click',()=>{applyMode(document.body.classList.contains('mobile')?'desktop':'mobile')})
  if(themeBtn)themeBtn.addEventListener('click',()=>{applyTheme(document.body.classList.contains('dark')?'light':'dark');updateStickyTop()})
})
let mSaved=null;try{mSaved=localStorage.getItem('mode')}catch{};applyMode(mSaved||(window.innerWidth<=768?'mobile':'desktop'))
let tSaved=null;try{tSaved=localStorage.getItem('theme')}catch{};applyTheme(tSaved||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'))
document.body.classList.remove('focus-strong');try{localStorage.removeItem('focus')}catch{}
function __toUpperField(el){if(!el)return;const t=String(el.value||'');const u=t.toUpperCase();if(t!==u){const s=el.selectionStart;const e=el.selectionEnd;el.value=u;if(s!=null&&e!=null){try{el.setSelectionRange(s,e)}catch{}}}}
function __normalizeAllInputs(){document.querySelectorAll('.inp').forEach(el=>{if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')__toUpperField(el)})}
document.addEventListener('input',e=>{const el=e&&e.target;if(!el||!el.classList||!el.classList.contains('inp'))return;if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')__toUpperField(el)},true)
window.addEventListener('load',__normalizeAllInputs)
function updateStickyTop(){
  const a=document.querySelector('.appbar');
  const h=a&&a.offsetHeight?a.offsetHeight:60;
  const m=document.querySelector('.menubar');
  const mh=m&&m.offsetHeight?m.offsetHeight:0;
  const t=Math.max(0,h+mh);
  try{
    document.documentElement.style.setProperty('--appbar-height',h+'px');
    document.documentElement.style.setProperty('--menubar-height',mh+'px');
    document.documentElement.style.setProperty('--sticky-vendor-top',t+'px');
  }catch{}
  try{
    document.querySelectorAll('.panel.section').forEach(sec=>{
      const tb=sec.querySelector('.vendor-toolbar');
      const vh=tb&&tb.offsetHeight?tb.offsetHeight:52;
      sec.style.setProperty('--section-toolbar-height',vh+'px')
    })
  }catch{}
  try{
    const sec=document.getElementById('section-vendor');
    if(sec){
      const r=sec.getBoundingClientRect();
      const left=Math.floor(r.left+window.scrollX);
      const width=Math.max(320,Math.floor(r.width));
      document.documentElement.style.setProperty('--vendor-left',left+'px');
      document.documentElement.style.setProperty('--vendor-width',width+'px');
      const tb=sec.querySelector('.vendor-toolbar');
      if(tb){
        const vh=tb.offsetHeight||52;
        document.documentElement.style.setProperty('--vendor-toolbar-height',vh+'px');
      }
    }
  }catch{}
}
window.addEventListener('load',updateStickyTop)
window.addEventListener('resize',updateStickyTop)
let __poToolbarTick=0
function __applyPOToolbarFix(){
  if(__currentSection!=='purchase-order')return
  const sec=document.getElementById('section-purchase-order')
  if(!sec)return
  const tb=sec.querySelector('.vendor-toolbar')
  if(!tb)return
  const cs=getComputedStyle(document.documentElement)
  let top=parseInt(String(cs.getPropertyValue('--sticky-vendor-top')||'60').trim(),10)
  if(!Number.isFinite(top)||top<=0)top=60
  const r=sec.getBoundingClientRect()
  const left=Math.floor(r.left+window.scrollX)+2
  const width=Math.max(320,Math.floor(r.width)-4)
  tb.style.position='fixed'
  tb.style.top=top+'px'
  tb.style.left=left+'px'
  tb.style.width=width+'px'
  tb.style.zIndex='892'
  let sp=document.getElementById('po-toolbar-spacer')
  if(!sp){sp=document.createElement('div');sp.id='po-toolbar-spacer';tb.parentNode.insertBefore(sp,tb.nextSibling)}
  sp.style.height=(tb.offsetHeight||48)+'px'
}
function __clearPOToolbarFix(){
  const sec=document.getElementById('section-purchase-order')
  if(!sec)return
  const tb=sec.querySelector('.vendor-toolbar')
  const sp=document.getElementById('po-toolbar-spacer')
  if(tb){tb.style.position='';tb.style.top='';tb.style.left='';tb.style.width='';tb.style.zIndex=''}
  if(sp)try{sp.remove()}catch{}
}
function __updatePOToolbarFix(){
  if(__currentSection!=='purchase-order'){__clearPOToolbarFix();return}
  const now=Date.now()
  if(now-__poToolbarTick<60)return
  __poToolbarTick=now
  __applyPOToolbarFix()
}
window.addEventListener('load',__updatePOToolbarFix)
window.addEventListener('resize',__updatePOToolbarFix)
window.addEventListener('scroll',__updatePOToolbarFix)
let __vendorToolbarTick=0
function __applyVendorToolbarFix(){
  if(__currentSection!=='vendor')return
  const sec=document.getElementById('section-vendor')
  if(!sec)return
  const tb=sec.querySelector('.vendor-toolbar')
  if(!tb)return
  try{updateStickyTop()}catch{}
  const cs=getComputedStyle(document.documentElement)
  let top=parseInt(String(cs.getPropertyValue('--sticky-vendor-top')||'60').trim(),10)
  if(!Number.isFinite(top)||top<=0)top=60
  const r=sec.getBoundingClientRect()
  const left=Math.floor(r.left+window.scrollX)
  const width=Math.max(320,Math.floor(r.width))
  tb.style.position='fixed'
  tb.style.top=top+'px'
  tb.style.left=left+'px'
  tb.style.width=width+'px'
  tb.style.zIndex='910'
  let sp=document.getElementById('vendor-toolbar-spacer')
  if(!sp){sp=document.createElement('div');sp.id='vendor-toolbar-spacer';tb.parentNode.insertBefore(sp,tb.nextSibling)}
  sp.style.height=(tb.offsetHeight||52)+'px'
}
function __clearVendorToolbarFix(){
  const sec=document.getElementById('section-vendor')
  if(!sec)return
  const tb=sec.querySelector('.vendor-toolbar')
  const sp=document.getElementById('vendor-toolbar-spacer')
  if(tb){tb.style.position='';tb.style.top='';tb.style.left='';tb.style.width='';tb.style.zIndex=''}
  if(sp)try{sp.remove()}catch{}
}
function __updateVendorToolbarFix(){
  if(__currentSection!=='vendor'){__clearVendorToolbarFix();return}
  const now=Date.now()
  if(now-__vendorToolbarTick<60)return
  __vendorToolbarTick=now
  __applyVendorToolbarFix()
}
window.addEventListener('load',__updateVendorToolbarFix)
window.addEventListener('resize',__updateVendorToolbarFix)
window.addEventListener('scroll',__updateVendorToolbarFix)
function __formatMoneyInputs(ids){
  const fmt=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''))||0;return n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}
  ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.value=fmt(el.value)})
}
window.addEventListener('load',()=>{__formatMoneyInputs(['po-subtotal','po-freight','po-total','po-paid','po-balance'])})

// enable horizontal top navigation to maximize content width
try{document.body.classList.add('nav-top')}catch{}
// navigation
const navButtons=[...document.querySelectorAll('.nav-btn')]
const sections=[...document.querySelectorAll('.section')]
let __currentSection='dashboard'
function __ensurePOFooter(){const receiveBtn=document.getElementById('po-receive-pay');const foot=document.getElementById('sticky-footer');const sect=document.getElementById('section-purchase-order');if(receiveBtn&&foot){try{if(receiveBtn.parentElement!==foot){foot.innerHTML='';foot.appendChild(receiveBtn)}foot.style.display='flex';const fh=foot.offsetHeight||0;try{document.documentElement.style.setProperty('--footer-height',fh+'px')}catch{};if(sect)sect.style.paddingBottom=(fh+12)+'px';if(typeof __poFitToScreen==='function')setTimeout(__poFitToScreen,0)}catch{}}}
function showSection(id){__currentSection=id;sections.forEach(s=>s.classList.toggle('section-active',s.id===('section-'+id)));navButtons.forEach(b=>b.classList.toggle('active',b.dataset.section===id));try{history.replaceState(null,'','#section-'+id)}catch{};const foot=document.getElementById('sticky-footer');if(foot)foot.style.display=(id==='purchase-order'?'flex':'none');if(id==='inventory')initInventoryPage();if(id==='vendor'){initVendorPage();setTimeout(__updateVendorToolbarFix,0);setTimeout(__lockVendorTitle,0)}else{__clearVendorToolbarFix()}if(id==='purchase-order'){initPurchaseOrderPage();__ensurePOFooter();setTimeout(__updatePOToolbarFix,0)}else{__clearPOToolbarFix()}if(id==='sales-order')initSalesOrderPage();if(id==='customer')initCustomerPage();const gs=document.getElementById('global-search');if(gs&&gs.value)applyGlobalSearch(gs.value)}
navButtons.forEach(b=>b.addEventListener('click',(e)=>{e.preventDefault();showSection(b.dataset.section)}))
function __afterSectionChange(id){
  try{localStorage.setItem('lastSection',id)}catch{}
  const label=(navButtons.find(b=>b.dataset.section===id)?.textContent||'IMS').trim()
  try{document.title='IMS — '+label}catch{}
  try{
    navButtons.forEach(b=>{
      const active=b.dataset.section===id
      if(active)b.setAttribute('aria-current','page')
      else b.removeAttribute('aria-current')
    })
  }catch{}
  const main=document.getElementById('main-content')
  if(main)try{main.focus({preventScroll:true})}catch{try{main.focus()}catch{}}
}
const __origShowSection=showSection
showSection=function(id){
  __origShowSection(id)
  try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{try{window.scrollTo(0,0)}catch{}}
  __afterSectionChange(id)
}
function __resolveInitialSection(){
  let id='dashboard'
  try{
    const h=String(location.hash||'')
    const m=/^#section-([a-z0-9-]+)/i.exec(h)
    if(m&&m[1])id=m[1]
    else{
      const saved=localStorage.getItem('lastSection')
      if(saved)id=saved
    }
  }catch{}
  if(!sections.some(s=>s.id===('section-'+id)))id='dashboard'
  return id
}
showSection(__resolveInitialSection())
window.addEventListener('hashchange',()=>{
  const id=__resolveInitialSection()
  if(id!==__currentSection)showSection(id)
})
const tbl=document.getElementById('table')
const file=document.getElementById('file')
const btn=document.getElementById('import')
const statusEl=document.getElementById('import-status')
const browseTable=document.getElementById('browse-table')
const loadBtn=document.getElementById('load')
const schemaEl=document.getElementById('schema')
const dataEl=document.getElementById('data')
const helpPrintBtn=document.getElementById('help-print')
const helpManual=document.getElementById('help-manual')
const logoImg=document.getElementById('brand-logo')
const logoSelectBtn=document.getElementById('logo-select')
const openReleaseNotesBtn=document.getElementById('open-release-notes')
const logoSelectText=document.getElementById('logo-select-text')
const logoSelectIcon=document.getElementById('logo-select-icon')
const logoClearBtn=document.getElementById('logo-clear')
const logoPreview=document.getElementById('logo-preview')
const logoStatus=document.getElementById('logo-status')
async function ensureVersionBadge(){
  try{
    const brandVers=[...document.querySelectorAll('.brand-ver')];
    if(!brandVers.length)return;
    const anySet=brandVers.some(el=>String(el.textContent||'').trim());
    if(anySet)return;
    const m=/\\bIMS\\s+v([0-9][^\\s]*)/i.exec(document.title||'');
    if(m&&m[1]){ brandVers.forEach(el=>el.textContent='v'+m[1]); return; }
    const r=await fetch(api('/api/version'));
    const j=await r.json().catch(()=>({}));
    const ver=j&&j.version;
    if(ver){
      brandVers.forEach(el=>el.textContent='v'+ver);
      if(!/\\bIMS\\s+v/i.test(document.title||''))document.title='IMS v'+ver;
    }
  }catch{}
}
ensureVersionBadge()
function printUserManual(){
  if(!helpManual)return
  const title='SPUDS IMS — User Manual'
  const base=String(location.href||'').split('#')[0]
  const html=`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="${__escHtml(base)}">
  <title>${__escHtml(title)}</title>
  <link rel="stylesheet" href="./styles.css">
  <style>
    body{background:#fff;color:#000}
    a{color:#000}
    #print-root{max-width:900px;margin:24px auto;padding:0 12px}
    @media print{
      body{background:#fff;color:#000}
      .panel{border:none}
      .section-title{color:#000}
    }
  </style>
</head>
<body>
  <div id="print-root" class="panel">
    <div>${helpManual.innerHTML}</div>
  </div>
</body>
</html>`
  try{__poShowPrintOverlay(html)}catch{}
}
async function openReleaseNotes(){
  try{
    let v=null
    try{
      const r=await fetch(api('/api/version'))
      const j=await r.json().catch(()=>({}))
      v=j&&j.version?('v'+j.version):null
    }catch{}
    const url=(API_BASE||'')+'/statement/release-notes'+(v?('?v='+encodeURIComponent(v)):'')
    const w=window.open(url,'_blank','noopener,noreferrer')
    if(!w){location.href=url}
  }catch{
    const url=(API_BASE||'')+'/statement/release-notes'
    const w=window.open(url,'_blank','noopener,noreferrer')
    if(!w){location.href=url}
  }
}
function __escHtml(s){
  return String(s??'').replace(/[&<>"]/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch]||ch))
}
function __fmtMoney(v){
  const n=Number(v)
  if(!isFinite(n))return ''
  return n.toFixed(2)
}
function __fmtYmd(d){
  const dt=d instanceof Date?d:new Date(d)
  if(!(dt instanceof Date)||isNaN(dt))return ''
  const pad=n=>String(n).padStart(2,'0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
}
function __printStatement(stmt,targetWindow){
  const partyType=String(stmt&&stmt.partyType||'').toLowerCase()
  const isCustomer=partyType==='customer'
  const title='SPUDS IMS — '+(isCustomer?'Customer':'Vendor')+' Statement of Account'
  const name=String(stmt&&stmt.name||'').trim()
  const from=stmt&&stmt.from?String(stmt.from):''
  const to=stmt&&stmt.to?String(stmt.to):''
  const openOnly=Boolean(stmt&&stmt.openOnly)
  const totals=stmt&&stmt.totals||{}
  const lines=Array.isArray(stmt&&stmt.lines)?stmt.lines:[]
  const rangeLabel=from||to?(`${from||'…'} to ${to||'…'}`):'All dates'
  const gen=__fmtYmd(new Date())
  const base=String(location.href||'').split('#')[0]
  const rowsHtml=lines.map(l=>{
    const date=__escHtml(l&&l.date||'')
    const doc=__escHtml(l&&l.docNo||'')
    const status=__escHtml(l&&l.status||'')
    const due=__escHtml(l&&l.dueDate||'')
    const total=__fmtMoney(l&&l.total)
    const paid=__fmtMoney(l&&l.paid)
    const bal=__fmtMoney(l&&l.balance)
    return `<tr><td>${date}</td><td>${doc}</td><td>${status}</td><td>${due}</td><td style="text-align:right">${total}</td><td style="text-align:right">${paid}</td><td style="text-align:right">${bal}</td></tr>`
  }).join('')
  const html=`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="${__escHtml(base)}">
  <title>${__escHtml(title)}</title>
  <link rel="stylesheet" href="./styles.css">
  <style>
    body{background:#fff;color:#000}
    a{color:#000}
    #print-root{max-width:980px;margin:24px auto;padding:0 12px}
    @media print{
      body{background:#fff;color:#000}
      .panel{border:none}
      .section-title{color:#000}
    }
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #ddd;padding:6px 8px;font-size:12px;vertical-align:top}
    th{text-align:left;font-weight:600}
    tfoot td{font-weight:600}
  </style>
</head>
<body>
  <div id="print-root" class="panel">
    <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:18px;font-weight:700">${__escHtml(name||'(no name)')}</div>
        <div class="muted">${__escHtml(rangeLabel)}${openOnly?' • Open items only':''}</div>
      </div>
      <div class="muted">Generated ${__escHtml(gen)}</div>
    </div>
    <div style="margin-top:14px">
      <table>
        <thead>
          <tr>
            <th style="width:110px">Date</th>
            <th style="width:140px">Doc #</th>
            <th>Status</th>
            <th style="width:120px">Due</th>
            <th style="width:110px;text-align:right">Total</th>
            <th style="width:110px;text-align:right">Paid</th>
            <th style="width:110px;text-align:right">Balance</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="4">Totals</td>
            <td style="text-align:right">${__fmtMoney(totals&&totals.total)}</td>
            <td style="text-align:right">${__fmtMoney(totals&&totals.paid)}</td>
            <td style="text-align:right">${__fmtMoney(totals&&totals.balance)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="status" style="margin-top:10px">Documents: ${String(lines.length)}</div>
  </div>
</body>
</html>`
  try{__poShowPrintOverlay(html)}catch{}
}
async function openStatementOfAccount(partyType,name){
  const cleanName=String(name||'').trim()
  if(!cleanName){toast('Select a '+(partyType==='customer'?'customer':'vendor')+' first','warn');return}
  const toDefault=__fmtYmd(new Date())
  const fromDt=new Date();fromDt.setDate(fromDt.getDate()-90)
  const fromDefault=__fmtYmd(fromDt)
  const from=String(prompt('From date (YYYY-MM-DD), blank for all:',fromDefault)||'').trim()
  const to=String(prompt('To date (YYYY-MM-DD), blank for all:',toDefault)||'').trim()
  const openOnly=confirm('Open items only?')
  const qs=[
    'name='+encodeURIComponent(cleanName),
    from?('from='+encodeURIComponent(from)):'',
    to?('to='+encodeURIComponent(to)):'',
    'openOnly='+(openOnly?1:0)
  ].filter(Boolean).join('&')
  const url=api('/statement/'+encodeURIComponent(partyType)+'?'+qs)
  try{
    const r=await fetch(url,{credentials:'include',headers:(typeof getAuthHeaders==='function'?getAuthHeaders():{})})
    const ct=String(r.headers.get('content-type')||'').toLowerCase()
    if(ct.includes('application/pdf')){
      const blob=await r.blob()
      const obj=URL.createObjectURL(blob)
      const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Statement</title><style>html,body{height:100%;margin:0}embed{width:100%;height:100%}</style></head><body><embed src="${__escHtml(obj)}" type="application/pdf"></body></html>`
      try{__poShowPrintOverlay(html)}catch{}
      return
    }
    const txt=await r.text()
    const looksJson=/^\s*[\[{]/.test(txt)
    if(ct.includes('application/json')||looksJson){
      try{
        const j=JSON.parse(txt)
        if(j&&typeof j==='object'){
          if(!j.partyType)j.partyType=partyType
          if(!j.name)j.name=cleanName
          if(j.from==null)j.from=from
          if(j.to==null)j.to=to
          if(j.openOnly==null)j.openOnly=openOnly
          __printStatement(j)
          return
        }
      }catch{}
    }
    const base=String(location.href||'').split('#')[0]
    let html=txt
    if(/<head[\s>]/i.test(html))html=html.replace(/<head(\s[^>]*)?>/i,m=>m+`<base href="${__escHtml(base)}">`)
    else if(!/<html[\s>]/i.test(html))html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${__escHtml(base)}"><title>Statement</title></head><body>${html}</body></html>`
    try{__poShowPrintOverlay(html)}catch{}
  }catch{
    try{toast('Unable to load statement preview.','warn')}catch{}
  }
}
if(helpPrintBtn)helpPrintBtn.addEventListener('click',printUserManual)
if(openReleaseNotesBtn)openReleaseNotesBtn.addEventListener('click',openReleaseNotes)
if(file){file.addEventListener('change',()=>{if(file.files&&file.files[0]&&!tbl.value){const n=file.files[0].name.replace(/\.csv$/i,'').replace(/[^a-z0-9_]+/ig,'_');tbl.value=n||'inventory'}})}
function getAuthHeaders(){let h={};try{const t=localStorage.getItem('ims_token');if(t)h['Authorization']='Bearer '+t}catch{};return h}
const authUserEl=document.getElementById('auth-user')
const authBtnEl=document.getElementById('auth-btn')
let __authName=''
async function refreshAuthUI(){
  try{
    const r=await fetch(api('/api/auth/me'),{credentials:'include',headers:getAuthHeaders()})
    const j=await r.json().catch(()=>({}))
    if(r.ok&&j&&j.user&&j.user.name){
      __authName=String(j.user.name||'').trim()
      if(authUserEl){
        const u=__authName
        authUserEl.textContent=u?((u.toUpperCase())+' ('+(u.toLowerCase())+')'):''
      }
      if(authBtnEl)authBtnEl.textContent='Logout'
      return
    }
  }catch{}
  __authName=''
  if(authUserEl)authUserEl.textContent=''
  if(authBtnEl)authBtnEl.textContent='Login'
}
async function doLogout(){
  try{await fetch(api('/api/auth/logout'),{method:'POST',credentials:'include',headers:getAuthHeaders()})}catch{}
  try{localStorage.removeItem('ims_token')}catch{}
  await refreshAuthUI()
}
if(authBtnEl)authBtnEl.addEventListener('click',async()=>{
  if(__authName){await doLogout();location.href='./login.html';return}
  location.href='./login.html'
})
refreshAuthUI()
const globalSearchEl=document.getElementById('global-search')
const globalSearchClearBtn=document.getElementById('global-search-clear')
function __syncGlobalSearchClear(){
  if(!globalSearchClearBtn)return
  globalSearchClearBtn.hidden=!(globalSearchEl&&String(globalSearchEl.value||'').length>0)
}
function applyGlobalSearch(q){
  const v=String(q||'')
  function setInput(id,val){
    const el=document.getElementById(id)
    if(!el)return
    el.value=val
    try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch{}
    try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
  }
  if(__currentSection==='inventory'){setInput('inv-q-code',v);setInput('inv-q-desc','');setInput('inv-q-cat','');return}
  if(__currentSection==='vendor'){setInput('vendor-q-name',v);setInput('vendor-q-contact','');setInput('vendor-q-phone','');return}
  if(__currentSection==='purchase-order'){setInput('po-q-num',v);return}
  if(__currentSection==='sales-order'){setInput('so-q-num',v);return}
  if(__currentSection==='customer'){setInput('c-q-name',v);return}
}
if(globalSearchEl){
  globalSearchEl.addEventListener('input',()=>applyGlobalSearch(globalSearchEl.value))
  globalSearchEl.addEventListener('keydown',(e)=>{if(e.key==='Escape'){globalSearchEl.value='';applyGlobalSearch('')}})
  __syncGlobalSearchClear()
  globalSearchEl.addEventListener('input',__syncGlobalSearchClear)
}
if(globalSearchClearBtn){
  globalSearchClearBtn.addEventListener('click',()=>{
    if(!globalSearchEl)return
    globalSearchEl.value=''
    try{globalSearchEl.dispatchEvent(new Event('input',{bubbles:true}))}catch{}
    try{globalSearchEl.focus()}catch{}
  })
}
function __isTypingTarget(el){
  if(!el)return false
  if(el.isContentEditable)return true
  const t=String(el.tagName||'').toUpperCase()
  return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'
}
document.addEventListener('keydown',e=>{
  if(!e)return
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&String(e.key||'').toLowerCase()==='k'){
    if(globalSearchEl){e.preventDefault();try{globalSearchEl.focus()}catch{}}
    return
  }
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!__isTypingTarget(e.target)){
    if(globalSearchEl){e.preventDefault();try{globalSearchEl.focus()}catch{}}
    return
  }
  if(e.key==='Escape'&&globalSearchEl&&document.activeElement===globalSearchEl){
    globalSearchEl.value=''
    applyGlobalSearch('')
    __syncGlobalSearchClear()
    return
  }
  if(e.key==='F1'){
    e.preventDefault()
    showSection('help')
    return
  }
})
async function importCSV(){const name=(tbl.value||'').trim();if(!name){statusEl.textContent='Enter table name';return}if(!file.files||!file.files[0]){statusEl.textContent='Choose a CSV file';return}const text=await file.files[0].text();statusEl.textContent='Uploading...';const r=await fetch(api('/api/import?table='+encodeURIComponent(name)),{method:'PUT',headers:{'Content-Type':'text/plain'},body:text});const j=await r.json().catch(()=>({}));statusEl.textContent=r.ok?('Imported '+(j.rows||0)+' rows into '+name):('Error: '+(j.error||r.status)) ;browseTable.value=name;loadData()}
if(btn)btn.addEventListener('click',importCSV)
async function loadData(){const name=(browseTable.value||'').trim();if(!name){schemaEl.textContent='';dataEl.textContent='';return}const s=await fetch(api('/api/schema?table='+encodeURIComponent(name)));const sj=await s.json().catch(()=>({}));schemaEl.textContent=s.ok?('Columns: '+(sj.schema||[]).join(', ')):('Schema error: '+(sj.error||s.status));const d=await fetch(api('/api/data?table='+encodeURIComponent(name)+'&limit=200'));const dj=await d.json().catch(()=>({}));if(!d.ok){dataEl.textContent='Data error: '+(dj.error||d.status);return}const rows=dj.rows||[];if(!rows.length){dataEl.textContent='No rows';return}const cols=Object.keys(rows[0]||{});const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');cols.forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(k=>{const td=document.createElement('td');td.textContent=String(r[k]??'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);dataEl.innerHTML='';dataEl.appendChild(table)}
if(loadBtn)loadBtn.addEventListener('click',loadData)
// reusable table renderer and counts
async function loadTableInto(table,hostId){const host=document.getElementById(hostId);if(!host)return;host.textContent='Loading...';try{const s=await fetch(api('/api/schema?table='+encodeURIComponent(table)));const sj=await s.json().catch(()=>({}));if(!s.ok){host.textContent='Schema error: '+(sj.error||s.status);return}const d=await fetch(api('/api/data?table='+encodeURIComponent(table)+'&limit=200'));const dj=await d.json().catch(()=>({}));if(!d.ok){host.textContent='Data error: '+(dj.error||d.status);return}const rows=dj.rows||[];if(!rows.length){host.textContent='No rows';return}const cols=sj.schema||Object.keys(rows[0]||{});const tableEl=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');cols.forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);tableEl.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(k=>{const td=document.createElement('td');td.textContent=String(r[k]??'');tr.appendChild(td)});tbody.appendChild(tr)});tableEl.appendChild(tbody);host.innerHTML='';host.appendChild(tableEl)}catch(e){host.textContent='Error: '+(e&&e.message||e)}}
async function quickCount(table,elId){try{const r=await fetch(api('/api/count?table='+encodeURIComponent(table)));const j=await r.json().catch(()=>({}));const el=document.getElementById(elId);if(!el)return;if(r.ok)el.textContent=String(j.count||0);else el.textContent='—'}catch{const el=document.getElementById(elId);if(el)el.textContent='—'}}
quickCount('inventory','dash-inventory')
quickCount('vendor','dash-vendor')
quickCount('customer','dash-customer')
quickCount('sales_order','dash-so-count')
quickCount('purchase_order','dash-po-count')

const dashLinesEl=document.getElementById('dash-lines')
const dashRangeEl=document.getElementById('dash-range')
const dashGroupEl=document.getElementById('dash-group')
const dashTop5ModeEl=document.getElementById('dash-top5-mode')
const dashTop5ListEl=document.getElementById('dash-top5-list')
const dashTop5StatusEl=document.getElementById('dash-top5-status')
const dashTimelineChartEl=document.getElementById('dash-timeline-chart')
const dashZoomInBtn=document.getElementById('dash-zoom-in')
const dashZoomOutBtn=document.getElementById('dash-zoom-out')
const dashChartTypeBtn=document.getElementById('dash-chart-type')
const dashTasksHost=document.getElementById('dash-tasks')
const dashTasksStatusEl=document.getElementById('dash-tasks-status')
const dashTasksRefreshBtn=document.getElementById('dash-tasks-refresh')
const dashReportSales90Btn=document.getElementById('dash-report-sales-90')
const dashReportPurchases90Btn=document.getElementById('dash-report-purchases-90')
const dashReportCustomerDueBtn=document.getElementById('dash-report-customer-due')
const dashReportVendorDueBtn=document.getElementById('dash-report-vendor-due')
const dashOpenSoBtn=document.getElementById('dash-open-so')
const dashOpenPoBtn=document.getElementById('dash-open-po')

let __dashZoom=1
let __dashChartType='bars'
const __dashCache=new Map()
let __dashTasksLoaded=false
function normalizeKey(k){return String(k||'').replace(/[^a-z0-9]+/ig,'').toLowerCase()}
function pickField(obj,candidates){
  if(!obj)return null
  const keys=Object.keys(obj)
  const map=new Map(keys.map(k=>[normalizeKey(k),k]))
  for(const c of candidates){
    const hit=map.get(normalizeKey(c))
    if(hit!=null)return hit
  }
  return null
}
function toNumber(v){
  if(v==null)return null
  if(typeof v==='number'&&Number.isFinite(v))return v
  const s=String(v).trim()
  if(!s)return null
  const cleaned=s.replace(/[^0-9.\-]+/g,'')
  const n=Number(cleaned)
  return Number.isFinite(n)?n:null
}
function toDate(v){
  if(!v)return null
  const d=new Date(v)
  return Number.isFinite(d.getTime())?d:null
}
function fmtMoney(n){
  if(n==null||!Number.isFinite(n))return ''
  try{return n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}catch{return String(Math.round(n*100)/100)}
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function startOfWeek(d){
  const x=new Date(d)
  const day=(x.getDay()+6)%7
  x.setHours(0,0,0,0)
  x.setDate(x.getDate()-day)
  return x
}
function startOfMonth(d){
  const x=new Date(d)
  x.setHours(0,0,0,0)
  x.setDate(1)
  return x
}
function fmtBucketLabel(d,group){
  const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if(group==='weeks'){
    return m[d.getMonth()]+' '+String(d.getDate())
  }
  return m[d.getMonth()]+' '+String(d.getFullYear())
}
function svgBars(series,{height=200,width=920}={}){
  const padL=46,padR=12,padT=10,padB=26
  const innerW=width-padL-padR
  const innerH=height-padT-padB
  const max=Math.max(1,...series.map(s=>Math.abs(s.value||0)))
  const barW=series.length?Math.max(8,Math.floor(innerW/series.length*0.7)):10
  const gap=series.length?Math.floor((innerW-(barW*series.length))/Math.max(1,series.length-1)):0
  let x=padL
  const lines=[]
  for(let i=0;i<=4;i++){
    const y=padT+Math.round(innerH*(i/4))
    lines.push(`<line x1="${padL}" y1="${y}" x2="${width-padR}" y2="${y}" stroke="rgba(0,0,0,.12)" stroke-width="1" />`)
    const val=Math.round((max*(1-(i/4)))*100)/100
    lines.push(`<text x="${padL-8}" y="${y+4}" text-anchor="end" font-size="11" fill="rgba(0,0,0,.65)">${val}</text>`)
  }
  const bars=[]
  const labels=[]
  for(const s of series){
    const v=Number(s.value)||0
    const h=Math.round((Math.abs(v)/max)*innerH)
    const y=padT+(innerH-h)
    bars.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="rgba(31,111,235,.85)"></rect>`)
    labels.push(`<text x="${x+barW/2}" y="${height-8}" text-anchor="middle" font-size="11" fill="rgba(0,0,0,.65)">${String(s.label||'')}</text>`)
    x+=barW+gap
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>${lines.join('')}${bars.join('')}${labels.join('')}</svg>`
}
function svgLine(series,{height=200,width=920}={}){
  const padL=46,padR=12,padT=10,padB=26
  const innerW=width-padL-padR
  const innerH=height-padT-padB
  const max=Math.max(1,...series.map(s=>Math.abs(s.value||0)))
  const lines=[]
  for(let i=0;i<=4;i++){
    const y=padT+Math.round(innerH*(i/4))
    lines.push(`<line x1="${padL}" y1="${y}" x2="${width-padR}" y2="${y}" stroke="rgba(0,0,0,.12)" stroke-width="1" />`)
    const val=Math.round((max*(1-(i/4)))*100)/100
    lines.push(`<text x="${padL-8}" y="${y+4}" text-anchor="end" font-size="11" fill="rgba(0,0,0,.65)">${val}</text>`)
  }
  const step=series.length>1?(innerW/(series.length-1)):0
  const pts=[]
  const labels=[]
  for(let i=0;i<series.length;i++){
    const s=series[i]
    const v=Number(s.value)||0
    const x=padL+(step*i)
    const y=padT+(innerH-(Math.abs(v)/max)*innerH)
    pts.push([x,y])
    labels.push(`<text x="${x}" y="${height-8}" text-anchor="middle" font-size="11" fill="rgba(0,0,0,.65)">${String(s.label||'')}</text>`)
  }
  const poly=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')
  const dots=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="rgba(31,111,235,.95)"></circle>`).join('')
  const path=`<polyline points="${poly}" fill="none" stroke="rgba(31,111,235,.85)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>${lines.join('')}${path}${dots}${labels.join('')}</svg>`
}
function renderTimeline(series){
  if(!dashTimelineChartEl)return
  if(!series||!series.length){dashTimelineChartEl.innerHTML='<div class="muted">No timeline data</div>';return}
  const w=Math.round(920*__dashZoom)
  const h=220
  const svg=(__dashChartType==='line'?svgLine(series,{width:w,height:h}):svgBars(series,{width:w,height:h}))
  dashTimelineChartEl.innerHTML=svg
}
async function fetchCount(table){
  const r=await fetch(api('/api/count?table='+encodeURIComponent(table)))
  const j=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(j.error||String(r.status))
  return Number(j&&j.count||0)||0
}
async function fetchAllRows(table){
  const now=Date.now()
  const cached=__dashCache.get(table)
  if(cached && (now-cached.ts)<15000)return cached.rows
  const total=await fetchCount(table).catch(()=>0)
  if(!total){__dashCache.set(table,{ts:now,rows:[]});return []}
  const limit=1000
  const all=[]
  for(let offset=0;offset<total;offset+=limit){
    const r=await fetch(api('/api/data?table='+encodeURIComponent(table)+'&limit='+limit+'&offset='+offset))
    const j=await r.json().catch(()=>({}))
    if(!r.ok)throw new Error(j.error||String(r.status))
    const rows=Array.isArray(j.rows)?j.rows:[]
    all.push(...rows)
    if(rows.length<limit)break
  }
  __dashCache.set(table,{ts:now,rows:all})
  return all
}
function renderTop5(items){
  if(!dashTop5ListEl)return
  dashTop5ListEl.innerHTML=''
  for(const it of items){
    const li=document.createElement('li')
    li.className='dash-top5-item'
    const left=document.createElement('div')
    left.className='dash-top5-left'
    const num=document.createElement('div')
    num.className='dash-top5-num'
    num.textContent=it.title||'—'
    const sub=document.createElement('div')
    sub.className='dash-top5-sub'
    sub.textContent=it.sub||''
    left.appendChild(num)
    left.appendChild(sub)
    const amt=document.createElement('div')
    amt.className='dash-top5-amt'
    amt.textContent=it.amount||''
    li.appendChild(left)
    li.appendChild(amt)
    dashTop5ListEl.appendChild(li)
  }
}
async function loadTop5SalesOrders(rows){
  if(!dashTop5ListEl)return
  if(dashTop5StatusEl)dashTop5StatusEl.textContent='Loading…'
  try{
    const mode=(dashTop5ModeEl&&dashTop5ModeEl.value)||'highest_sales'
    const noKey=pickField(rows[0],['order_no','orderno','order','order#','so','salesorder','sales_order','number','docno','doc_no','invoice','invoice_no'])
    const amtKey=pickField(rows[0],['total','grandtotal','grand_total','amount','totalamount','total_amount','balance','subtotal','sub_total'])
    const dateKey=pickField(rows[0],['date','orderdate','order_date','docdate','doc_date','createdat','created_at','timestamp'])
    const mapped=rows.map((r,idx)=>{
      const title=noKey?String(r[noKey]??'').trim():('Order #'+String(idx+1))
      const amt=amtKey?toNumber(r[amtKey]):null
      const dt=dateKey?toDate(r[dateKey]):null
      const sub=dt?dt.toLocaleDateString():((amtKey&&amt!=null)?(amtKey+': '+fmtMoney(amt)):'')
      return {title,amt,dt,sub}
    })
    const sorted=[...mapped].sort((a,b)=>{
      if(mode==='recent'){
        const at=a.dt?a.dt.getTime():0
        const bt=b.dt?b.dt.getTime():0
        return bt-at
      }
      const av=a.amt??-Infinity
      const bv=b.amt??-Infinity
      return bv-av
    })
    const items=sorted.slice(0,5).map(it=>({title:it.title||'—',sub:it.sub||'',amount:(it.amt!=null?fmtMoney(it.amt):'')}))
    renderTop5(items)
    if(dashTop5StatusEl)dashTop5StatusEl.textContent=items.length?'':'No sales orders'
  }catch(e){
    if(dashTop5StatusEl)dashTop5StatusEl.textContent='Top 5 error: '+(e&&e.message||e)
  }
}
function __buildTimelineSeriesFromRows(rows,{dateCandidates,amountCandidates,onlyPositive=false}){
  const group=(dashGroupEl&&dashGroupEl.value)||'months'
  const rangeDays=Number((dashRangeEl&&dashRangeEl.value)||90)||90
  const dateKey=pickField(rows[0],dateCandidates||['date','orderdate','order_date','docdate','doc_date','createdat','created_at','timestamp'])
  const amtKey=pickField(rows[0],amountCandidates||['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'])
  if(!dateKey||!amtKey)return []
  const now=new Date()
  const since=new Date(now.getTime()-rangeDays*24*60*60*1000)
  const buckets=new Map()
  for(const r of rows){
    const d=toDate(r[dateKey])
    if(!d||d<since||d>now)continue
    const key=(group==='weeks'?startOfWeek(d):startOfMonth(d)).toISOString().slice(0,10)
    const v=toNumber(r[amtKey])
    if(v==null)continue
    if(onlyPositive && !(v>0))continue
    buckets.set(key,(buckets.get(key)||0)+v)
  }
  const keys=[...buckets.keys()].sort()
  const maxPoints=clamp(Math.floor(14*__dashZoom),6,40)
  const trimmed=keys.slice(Math.max(0,keys.length-maxPoints))
  return trimmed.map(k=>{
    const d=new Date(k+'T00:00:00')
    return {label:fmtBucketLabel(d,group),value:buckets.get(k)||0}
  })
}
function buildTimelineSeries(mode,{salesRows,purchaseRows}){
  if(mode==='customer_payments'){
    const rows=salesRows||[]
    return __buildTimelineSeriesFromRows(rows,{dateCandidates:['duedate','due_date','paymentduedate','payment_due_date','due','duedate1','termsduedate'],amountCandidates:['balance','amountdue','amount_due','dueamount','due_amount','remaining','openbalance','open_balance','totaldue','total_due'],onlyPositive:true})
  }
  if(mode==='vendor_payments'){
    const rows=purchaseRows||[]
    return __buildTimelineSeriesFromRows(rows,{dateCandidates:['duedate','due_date','paymentduedate','payment_due_date','due','duedate1','termsduedate'],amountCandidates:['balance','amountdue','amount_due','dueamount','due_amount','remaining','openbalance','open_balance','totaldue','total_due'],onlyPositive:true})
  }
  if(mode==='purchases'){
    const rows=purchaseRows||[]
    return __buildTimelineSeriesFromRows(rows,{dateCandidates:['date','orderdate','order_date','docdate','doc_date','createdat','created_at','timestamp'],amountCandidates:['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'],onlyPositive:true})
  }
  const rows=salesRows||[]
  return __buildTimelineSeriesFromRows(rows,{dateCandidates:['date','orderdate','order_date','docdate','doc_date','createdat','created_at','timestamp'],amountCandidates:['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'],onlyPositive:true})
}
function __startOfToday(){
  const d=new Date()
  d.setHours(0,0,0,0)
  return d
}
function __isClosedStatus(v){
  const s=String(v||'').trim().toLowerCase()
  if(!s)return false
  return s.includes('complete')||s.includes('closed')||s.includes('paid')
}
function __renderTaskGroups(groups){
  if(!dashTasksHost)return
  dashTasksHost.innerHTML=''
  const nonEmpty=(groups||[]).filter(g=>g&&g.items&&g.items.length)
  if(!nonEmpty.length){
    dashTasksHost.innerHTML='<div class="muted">No pending tasks</div>'
    return
  }
  for(const g of nonEmpty){
    const wrap=document.createElement('div')
    wrap.className='dash-task-group'
    const head=document.createElement('div')
    head.className='dash-task-group-head'
    const title=document.createElement('div')
    title.className='dash-task-group-title'
    title.textContent=g.title||'Tasks'
    const count=document.createElement('div')
    count.className='dash-task-group-count'
    count.textContent=String(g.items.length)
    head.appendChild(title)
    head.appendChild(count)
    wrap.appendChild(head)
    const items=document.createElement('div')
    items.className='dash-task-items'
    for(const it of g.items){
      const row=document.createElement('div')
      row.className='dash-task-item'
      if(it.section)row.dataset.section=it.section
      if(it.query!=null)row.dataset.query=String(it.query)
      const left=document.createElement('div')
      left.className='dash-task-left'
      const t=document.createElement('div')
      t.className='dash-task-title'
      t.textContent=it.title||'—'
      const sub=document.createElement('div')
      sub.className='dash-task-sub'
      sub.textContent=it.sub||''
      left.appendChild(t)
      left.appendChild(sub)
      const right=document.createElement('div')
      right.className='dash-task-right'
      right.textContent=it.amount||''
      row.appendChild(left)
      row.appendChild(right)
      row.addEventListener('click',()=>{
        const section=row.dataset.section||''
        const q=row.dataset.query||''
        if(section==='sales-order'){
          showSection('sales-order')
          const el=document.getElementById('so-q-num')
          if(el){el.value=q;try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch{};try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch{}}
          return
        }
        if(section==='purchase-order'){
          showSection('purchase-order')
          const el=document.getElementById('po-q-num')
          if(el){el.value=q;try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch{};try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch{}}
          return
        }
        if(section==='inventory'){
          showSection('inventory')
          const el=document.getElementById('inv-q-code')
          if(el){el.value=q;try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch{};try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch{}}
          return
        }
      })
      items.appendChild(row)
    }
    wrap.appendChild(items)
    dashTasksHost.appendChild(wrap)
  }
}
async function loadDashboardTasks({force=false}={}){
  if(!dashTasksHost)return
  if(dashTasksStatusEl)dashTasksStatusEl.textContent='Loading…'
  if(force)__dashCache.clear()
  try{
    const today=__startOfToday()
    const [salesRows,purchaseRows,products,invRows,extraRows,trackRows]=await Promise.all([
      fetchAllRows('sales_order').catch(()=>[]),
      fetchAllRows('purchase_order').catch(()=>[]),
      fetchAllRows('inflow_product').catch(()=>[]),
      fetchAllRows('inflow_inventory').catch(()=>[]),
      fetchAllRows('inventory_extra').catch(()=>[]),
      fetchAllRows('inventory_tracking').catch(()=>[])
    ])
    const tasks=[]
    const soNoKey=pickField(salesRows[0],['order_no','orderno','order','order#','so','salesorder','sales_order','number','docno','doc_no','invoice','invoice_no'])
    const soCustKey=pickField(salesRows[0],['customer','customername','customer_name','billto','bill_to','shipto','ship_to','name','company'])
    const soDueKey=pickField(salesRows[0],['duedate','due_date','paymentduedate','payment_due_date','due','termsduedate'])
    const soBalKey=pickField(salesRows[0],['balance','amountdue','amount_due','dueamount','due_amount','remaining','openbalance','open_balance','totaldue','total_due'])
    const soTotalKey=pickField(salesRows[0],['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'])
    const soStatusKey=pickField(salesRows[0],['status','orderstatus','order_status','state'])
    const soOverdue=[]
    const soDue=[]
    for(const r of salesRows||[]){
      const bal=toNumber(soBalKey?r[soBalKey]:null)
      const total=toNumber(soTotalKey?r[soTotalKey]:null)
      const amt=(bal!=null?bal:(total!=null?total:null))
      if(!(amt>0))continue
      const status=soStatusKey?String(r[soStatusKey]||''):''
      if(status && __isClosedStatus(status))continue
      const due=toDate(soDueKey?r[soDueKey]:null)
      const orderNo=soNoKey?String(r[soNoKey]??'').trim():''
      const cust=soCustKey?String(r[soCustKey]??'').trim():''
      const title=(orderNo?('SO '+orderNo):'Sales Order')+(cust?(' — '+cust):'')
      const sub=(due?('Due '+due.toLocaleDateString()):'Payment due')+(status?(' · '+status):'')
      const item={section:'sales-order',query:orderNo||'',title,sub,amount:fmtMoney(amt)}
      if(due && due<today)soOverdue.push(item)
      else soDue.push(item)
    }
    const poNoKey=pickField(purchaseRows[0],['order_no','orderno','order','order#','po','purchaseorder','purchase_order','number','docno','doc_no','bill','billno','bill_no'])
    const poVendKey=pickField(purchaseRows[0],['vendor','vendorname','vendor_name','supplier','suppliername','supplier_name','name','company'])
    const poDueKey=pickField(purchaseRows[0],['duedate','due_date','paymentduedate','payment_due_date','due','termsduedate'])
    const poBalKey=pickField(purchaseRows[0],['balance','amountdue','amount_due','dueamount','due_amount','remaining','openbalance','open_balance','totaldue','total_due'])
    const poTotalKey=pickField(purchaseRows[0],['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'])
    const poStatusKey=pickField(purchaseRows[0],['status','orderstatus','order_status','state'])
    const poOverdue=[]
    const poDue=[]
    for(const r of purchaseRows||[]){
      const bal=toNumber(poBalKey?r[poBalKey]:null)
      const total=toNumber(poTotalKey?r[poTotalKey]:null)
      const amt=(bal!=null?bal:(total!=null?total:null))
      if(!(amt>0))continue
      const status=poStatusKey?String(r[poStatusKey]||''):''
      if(status && __isClosedStatus(status))continue
      const due=toDate(poDueKey?r[poDueKey]:null)
      const orderNo=poNoKey?String(r[poNoKey]??'').trim():''
      const vend=poVendKey?String(r[poVendKey]??'').trim():''
      const title=(orderNo?('PO '+orderNo):'Purchase Order')+(vend?(' — '+vend):'')
      const sub=(due?('Due '+due.toLocaleDateString()):'Payment due')+(status?(' · '+status):'')
      const item={section:'purchase-order',query:orderNo||'',title,sub,amount:fmtMoney(amt)}
      if(due && due<today)poOverdue.push(item)
      else poDue.push(item)
    }
    const qohByItem=new Map()
    for(const r of invRows||[]){
      const item=String(r.Item||r.item||'').trim()
      if(!item)continue
      const q=toNumber(r.Quantity??r.quantity)
      if(q==null)continue
      qohByItem.set(item,(qohByItem.get(item)||0)+q)
    }
    const extraByKey=new Map()
    for(const r of extraRows||[]){
      const k=String(r.ItemKey||r.itemkey||r.item_key||'').trim()
      if(!k)continue
      extraByKey.set(k,r)
    }
    const lowStock=[]
    for(const p of products||[]){
      const name=String(p.Name||p.name||'').trim()
      if(!name)continue
      const qoh=qohByItem.get(name)||0
      const ex=extraByKey.get(name)||null
      const rp=toNumber(ex?ex.ReorderPoint:null)
      if(rp==null)continue
      if(qoh<=rp){
        const sub=`On hand ${qoh} · Reorder point ${rp}`
        lowStock.push({section:'inventory',query:name,title:name,sub,amount:''})
      }
    }
    const expired=[]
    const expSoon=[]
    const now=new Date()
    const soonMs=30*24*60*60*1000
    for(const r of trackRows||[]){
      const key=String(r.ItemKey||r.itemkey||r.item_key||'').trim()
      if(!key)continue
      const expRaw=r.Expiration||r.expiration
      if(!expRaw)continue
      const exp=toDate(String(expRaw).slice(0,10))
      if(!exp)continue
      const diff=exp.getTime()-now.getTime()
      const qty=toNumber(r.Quantity??r.quantity) || 0
      const lot=String(r.Lot||r.lot||'').trim()
      const serial=String(r.Serial||r.serial||'').trim()
      const ident=serial?('Serial '+serial):(lot?('Lot '+lot):'')
      const sub=(ident?ident+' · ':'')+'Exp '+exp.toLocaleDateString()+' · Qty '+qty
      const item={section:'inventory',query:key,title:key,sub,amount:''}
      if(diff<0)expired.push(item)
      else if(diff<=soonMs)expSoon.push(item)
    }
    tasks.push({title:'Customer Payments Overdue',items:soOverdue})
    tasks.push({title:'Customer Payments Due',items:soDue})
    tasks.push({title:'Vendor Payments Overdue',items:poOverdue})
    tasks.push({title:'Vendor Payments Due',items:poDue})
    tasks.push({title:'Low Stock / Reorder',items:lowStock})
    tasks.push({title:'Expired Inventory',items:expired})
    tasks.push({title:'Expiring Soon (30 Days)',items:expSoon})
    __renderTaskGroups(tasks)
    if(dashTasksStatusEl)dashTasksStatusEl.textContent=''
  }catch(e){
    if(dashTasksStatusEl)dashTasksStatusEl.textContent='Pending tasks unavailable'
    dashTasksHost.innerHTML='<div class="muted">Pending tasks unavailable</div>'
  }
}
async function loadDashboard(){
  if(!dashTimelineChartEl&&!dashTop5ListEl)return
  try{
    const mode=(dashLinesEl&&dashLinesEl.value)||'sales'
    const needsSales=(mode==='sales'||mode==='customer_payments'||Boolean(dashTop5ListEl))
    const needsPo=(mode==='purchases'||mode==='vendor_payments')
    const [salesRows,purchaseRows]=await Promise.all([
      needsSales?fetchAllRows('sales_order').catch(()=>[]):Promise.resolve([]),
      needsPo?fetchAllRows('purchase_order').catch(()=>[]):Promise.resolve([])
    ])
    renderTimeline(buildTimelineSeries(mode,{salesRows,purchaseRows}))
    if(dashTop5ListEl){
      const sr=salesRows.length?salesRows:await fetchAllRows('sales_order').catch(()=>[])
      await loadTop5SalesOrders(sr)
    }
  }catch(e){
    if(dashTimelineChartEl)dashTimelineChartEl.innerHTML='<div class="muted">Timeline unavailable</div>'
    if(dashTop5StatusEl)dashTop5StatusEl.textContent='Top 5 unavailable'
  }
}
function reloadDashboard(){
  if(dashTimelineChartEl)dashTimelineChartEl.innerHTML='<div class="muted">Loading timeline…</div>'
  if(dashTop5StatusEl)dashTop5StatusEl.textContent=''
  loadDashboard()
  if(!__dashTasksLoaded){
    __dashTasksLoaded=true
    loadDashboardTasks({force:false})
  }
}
if(dashLinesEl)dashLinesEl.addEventListener('change',reloadDashboard)
if(dashRangeEl)dashRangeEl.addEventListener('change',reloadDashboard)
if(dashGroupEl)dashGroupEl.addEventListener('change',reloadDashboard)
if(dashTop5ModeEl)dashTop5ModeEl.addEventListener('change',reloadDashboard)
if(dashZoomInBtn)dashZoomInBtn.addEventListener('click',()=>{__dashZoom=clamp(__dashZoom+0.25,1,2.5);reloadDashboard()})
if(dashZoomOutBtn)dashZoomOutBtn.addEventListener('click',()=>{__dashZoom=clamp(__dashZoom-0.25,0.75,2.5);reloadDashboard()})
if(dashChartTypeBtn){
  dashChartTypeBtn.textContent=__dashChartType==='line'?'Line':'Bars'
  dashChartTypeBtn.addEventListener('click',()=>{
    __dashChartType=(__dashChartType==='bars'?'line':'bars')
    dashChartTypeBtn.textContent=__dashChartType==='line'?'Line':'Bars'
    reloadDashboard()
  })
}
if(dashTasksRefreshBtn)dashTasksRefreshBtn.addEventListener('click',()=>{loadDashboardTasks({force:true})})
function __setDashReport(mode,rangeDays){
  if(dashLinesEl)dashLinesEl.value=mode
  if(dashRangeEl && rangeDays!=null)dashRangeEl.value=String(rangeDays)
  if(dashGroupEl)dashGroupEl.value='months'
  reloadDashboard()
  try{dashTimelineChartEl&&dashTimelineChartEl.scrollIntoView({behavior:'smooth',block:'start'})}catch{}
}
if(dashReportSales90Btn)dashReportSales90Btn.addEventListener('click',()=>__setDashReport('sales',90))
if(dashReportPurchases90Btn)dashReportPurchases90Btn.addEventListener('click',()=>__setDashReport('purchases',90))
if(dashReportCustomerDueBtn)dashReportCustomerDueBtn.addEventListener('click',()=>__setDashReport('customer_payments',90))
if(dashReportVendorDueBtn)dashReportVendorDueBtn.addEventListener('click',()=>__setDashReport('vendor_payments',90))
if(dashOpenSoBtn)dashOpenSoBtn.addEventListener('click',()=>showSection('sales-order'))
if(dashOpenPoBtn)dashOpenPoBtn.addEventListener('click',()=>showSection('purchase-order'))
reloadDashboard()
function applyLogo(src){const imgs=[...document.querySelectorAll('.brand-logo')];imgs.forEach(img=>{if(src){img.src=src;img.style.display='inline-block'}else{img.removeAttribute('src');img.style.display='none'}});if(logoPreview){if(src){logoPreview.src=src;logoPreview.style.display='inline-block'}else{logoPreview.removeAttribute('src');logoPreview.style.display='none'}};if(logoStatus){logoStatus.textContent=src?'Logo set':'No logo'}}
let savedLogo=null;try{savedLogo=localStorage.getItem('logoSrc')}catch{};applyLogo(savedLogo||'')
if(savedLogo){if(logoSelectIcon){logoSelectIcon.src=savedLogo;logoSelectIcon.style.display='inline-block'};if(logoSelectText)logoSelectText.textContent='Change Logo'}
if(logoSelectBtn)logoSelectBtn.addEventListener('click',()=>{const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.style.display='none';picker.addEventListener('change',()=>{if(picker.files&&picker.files[0]){const f=picker.files[0];const reader=new FileReader();reader.onload=e=>{const src=e.target.result;applyLogo(src);if(logoSelectIcon){logoSelectIcon.src=src;logoSelectIcon.style.display='inline-block'};if(logoSelectText)logoSelectText.textContent='Change Logo';try{localStorage.setItem('logoSrc',src)}catch{}};reader.readAsDataURL(f)}});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)})
if(logoClearBtn)logoClearBtn.addEventListener('click',()=>{applyLogo('');if(logoSelectIcon){logoSelectIcon.removeAttribute('src');logoSelectIcon.style.display='none'};if(logoSelectText)logoSelectText.textContent='Select Logo';try{localStorage.removeItem('logoSrc')}catch{}})
const backupBtn=document.getElementById('db-backup')
const restoreBtn=document.getElementById('db-restore')
const restoreStatus=document.getElementById('db-restore-status')
const normalizeBtn=document.getElementById('db-normalize')
const normalizeStatus=document.getElementById('db-normalize-status')
const dedupeBtn=document.getElementById('db-dedupe')
const dedupeStatus=document.getElementById('db-dedupe-status')
const clearDbBtn=document.getElementById('db-clear')
const clearDbStatus=document.getElementById('db-clear-status')
const clearSoBtn=document.getElementById('db-clear-so')
const clearSoStatus=document.getElementById('db-clear-so-status')
const archiveBtn=document.getElementById('db-archive')
const archiveRebalanceBtn=document.getElementById('db-archive-rebalance')
const archiveStatus=document.getElementById('db-archive-status')
const selftestBtn=document.getElementById('run-selftest')
const selftestHost=document.getElementById('selftest-result')
function __fmtDur(ms){
  const s=Math.max(0,Math.floor((Number(ms)||0)/1000))
  const m=Math.floor(s/60)
  const r=s%60
  return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0')
}
let __restorePollTimer=null
async function __pollRestoreJob(jobId){
  if(__restorePollTimer){try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null}
  const startedAt=Date.now()
  __restorePollTimer=setInterval(async()=>{
    try{
      const r=await fetch(api('/api/restore/status?id='+encodeURIComponent(jobId)))
      const j=await r.json().catch(()=>({}))
      if(!r.ok){
        if(restoreStatus)restoreStatus.textContent='Restore status error: '+(j.error||r.status)
        try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null
        return
      }
      const elapsed=__fmtDur(j&&j.elapsedMs||0)
      const pct=(j&&j.percent!=null)?(' '+String(j.percent)+'%'):''
      const step=String(j&&j.step||'restoring')
      const msg=String(j&&j.message||'')
      if(j&&j.state==='done'){
        if(restoreStatus)restoreStatus.textContent='Restore completed'
        try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null
        setTimeout(()=>{try{location.reload()}catch{}},500)
        return
      }
      if(j&&j.state==='error'){
        let outMsg=(msg||'error')
        if(/ERROR\s*2002|HY000|10061|ECONNREFUSED|Can('|’)t connect to (server|MySQL server)/i.test(outMsg)){
          outMsg='Database not running (can’t connect to MariaDB). Run Start-IMS.cmd, then try Restore again.'
        }
        if(restoreStatus)restoreStatus.textContent='Restore error: '+outMsg
        try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null
        return
      }
      if(restoreStatus)restoreStatus.textContent='Restoring… '+step+pct+' • '+elapsed+(msg?(' • '+msg):'')
      if(Date.now()-startedAt>1000*60*45){
        if(restoreStatus)restoreStatus.textContent='Restore is taking a long time ('+elapsed+'). Check logs/node-err.log for errors.'
        try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null
      }
    }catch(e){
      if(restoreStatus)restoreStatus.textContent='Restore status error: '+(e&&e.message||e)
      try{clearInterval(__restorePollTimer)}catch{};__restorePollTimer=null
    }
  },1000)
}
async function __restoreDatabaseFile(f){
  if(!f)return
  try{
    if(restoreStatus)restoreStatus.textContent='Starting database…'
    try{
      const ctrl=new AbortController()
      const t=setTimeout(()=>{try{ctrl.abort()}catch{}},3000)
      await fetch(api('/api/db/start'),{method:'POST',signal:ctrl.signal}).catch(()=>{})
      try{clearTimeout(t)}catch{}
    }catch{}
    const mb=(Number(f.size||0)/1024/1024)
    if(restoreStatus)restoreStatus.textContent='Uploading… '+(mb?mb.toFixed(1)+' MB':'')
    const buf=await f.arrayBuffer()
    const r=await fetch(api('/api/restore?async=1'),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array(buf)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){
      let msg=String(j.error||r.status||'error')
      if(/ERROR\s*2002|HY000|10061|ECONNREFUSED|Can('|’)t connect to (server|MySQL server)/i.test(msg)){
        msg='Database not running (can’t connect to MariaDB). Run Start-IMS.cmd, then try Restore again.'
      }
      if(restoreStatus)restoreStatus.textContent='Restore error: '+msg
      return
    }
    const jobId=String(j&&j.jobId||'').trim()
    if(!jobId){
      if(restoreStatus)restoreStatus.textContent='Restore error: missing job id'
      return
    }
    if(restoreStatus)restoreStatus.textContent='Restoring…'
    await __pollRestoreJob(jobId)
  }catch(e){
    if(restoreStatus)restoreStatus.textContent='Restore error: '+(e&&e.message||e)
  }
}
if(restoreBtn)restoreBtn.addEventListener('click',async()=>{const picker=document.createElement('input');picker.type='file';picker.accept='.sql,.zip';picker.style.display='none';picker.addEventListener('change',async()=>{if(!picker.files||!picker.files[0]){if(restoreStatus)restoreStatus.textContent='Choose a file';return}await __restoreDatabaseFile(picker.files[0])});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)})
function defaultBackupName(){
  const ts=new Date()
  const pad=n=>String(n).padStart(2,'0')
  return 'spuds-ims-backup-'+ts.getFullYear()+'-'+pad(ts.getMonth()+1)+'-'+pad(ts.getDate())+'-'+pad(ts.getHours())+pad(ts.getMinutes())+'.zip'
}
async function downloadBackup(){try{if(restoreStatus)restoreStatus.textContent='Creating backup...';const r=await fetch(api('/api/backup'));if(!r.ok){const j=await r.json().catch(()=>({}));if(restoreStatus)restoreStatus.textContent='Backup error: '+(j.error||r.status);return}const disp=r.headers.get('Content-Disposition')||'';const m=/filename=\"?([^\";]+)\"?/i.exec(disp);const name=m?m[1]:defaultBackupName();const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);try{document.body.removeChild(a)}catch{}},1000);if(restoreStatus)restoreStatus.textContent='Backup downloaded'}catch(e){if(restoreStatus){const hint=(location.protocol==='file:'?' (open http://localhost:3200/ instead of the file)':'');restoreStatus.textContent='Backup error: '+(e&&e.message||e)+hint}}}
if(backupBtn)backupBtn.addEventListener('click',downloadBackup)
async function normalizeCollationsAction(){if(normalizeStatus)normalizeStatus.textContent='Normalizing...';try{const r=await fetch(api('/api/normalize-collations'),{method:'POST'});const j=await r.json().catch(()=>({}));if(!r.ok){if(normalizeStatus)normalizeStatus.textContent='Normalize error: '+(j.error||r.status);return}const changed=Array.isArray(j.changed)?j.changed.length:0;const failed=Array.isArray(j.failed)?j.failed.length:0;if(normalizeStatus)normalizeStatus.textContent='Updated '+changed+' tables'+(failed?(' • Failed: '+failed):'')+'.';if(!failed){await downloadBackup()}}catch(e){if(normalizeStatus)normalizeStatus.textContent='Normalize error: '+(e&&e.message||e)}}
if(normalizeBtn)normalizeBtn.addEventListener('click',normalizeCollationsAction)
async function fixDuplicateRecordsAction(){
  try{
    if(dedupeStatus)dedupeStatus.textContent=''
    const ok1=confirm('This will remove exact duplicate rows from the database (keeps one copy). Continue?')
    if(!ok1){if(dedupeStatus)dedupeStatus.textContent='Cancelled';return}
    const pw=prompt('Enter admin password to fix duplicates:','')||''
    if(dedupeStatus)dedupeStatus.textContent='Fixing duplicates...'
    const r=await fetch(api('/api/db/fix-duplicates'),{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},credentials:'include',body:JSON.stringify({password:pw})})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(dedupeStatus)dedupeStatus.textContent='Fix duplicates error: '+(j.error||r.status);return}
    const total=Number(j.deletedTotal)||0
    if(dedupeStatus)dedupeStatus.textContent='Removed '+total+' duplicate row'+(total===1?'':'s')
  }catch(e){if(dedupeStatus)dedupeStatus.textContent='Fix duplicates error: '+(e&&e.message||e)}
}
if(dedupeBtn)dedupeBtn.addEventListener('click',fixDuplicateRecordsAction)
async function clearDatabaseAction(){
  try{
    if(clearDbStatus)clearDbStatus.textContent=''
    const ok1=confirm('This will permanently erase ALL data in the database. Continue?')
    if(!ok1){if(clearDbStatus)clearDbStatus.textContent='Cancelled';return}
    const phrase=prompt('Type CLEAR to confirm database erase:','')
    if(String(phrase||'').trim().toUpperCase()!=='CLEAR'){if(clearDbStatus)clearDbStatus.textContent='Cancelled';return}
    const pw=prompt('Enter admin password to clear database:','')||''
    if(clearDbStatus)clearDbStatus.textContent='Clearing...'
    const r=await fetch(api('/api/db/clear'),{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},credentials:'include',body:JSON.stringify({confirm:'CLEAR',password:pw})})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(clearDbStatus)clearDbStatus.textContent='Clear error: '+(j.error||r.status);return}
    if(clearDbStatus)clearDbStatus.textContent='Database cleared'
    setTimeout(()=>{try{location.reload()}catch{}},500)
  }catch(e){if(clearDbStatus)clearDbStatus.textContent='Clear error: '+(e&&e.message||e)}
}
if(clearDbBtn)clearDbBtn.addEventListener('click',clearDatabaseAction)
async function clearSalesOrdersAction(){
  try{
    if(clearSoStatus)clearSoStatus.textContent=''
    const ok1=confirm('This will permanently erase ALL Sales Orders. Continue?')
    if(!ok1){if(clearSoStatus)clearSoStatus.textContent='Cancelled';return}
    const phrase=prompt('Type CLEAR SO to confirm:','')
    if(String(phrase||'').trim().toUpperCase()!=='CLEAR SO'){if(clearSoStatus)clearSoStatus.textContent='Cancelled';return}
    const pw=prompt('Enter admin password to clear sales orders:','')||''
    if(clearSoStatus)clearSoStatus.textContent='Clearing sales orders...'
    const r=await fetch(api('/api/db/clear-sales-orders'),{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},credentials:'include',body:JSON.stringify({confirm:'CLEAR SO',password:pw})})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(clearSoStatus)clearSoStatus.textContent='Clear sales orders error: '+(j.error||r.status);return}
    const deleted=Number(j.deleted)||0
    if(clearSoStatus)clearSoStatus.textContent='Sales orders cleared ('+deleted+' rows)'
    __soLoaded=false
    try{showSection('sales-order')}catch{}
  }catch(e){if(clearSoStatus)clearSoStatus.textContent='Clear sales orders error: '+(e&&e.message||e)}
}
if(clearSoBtn)clearSoBtn.addEventListener('click',clearSalesOrdersAction)
async function runSelftest(){if(selftestHost)selftestHost.textContent='Running...';try{const r=await fetch(api('/api/selftest'));const j=await r.json().catch(()=>({}));if(!r.ok){if(selftestHost)selftestHost.textContent='Diagnostics error: '+(j.error||r.status);return}if(selftestHost)selftestHost.innerHTML='';const container=document.createElement('div');const table=document.createElement('table');table.className='diag-table';const tbody=document.createElement('tbody');function addStatusRow(label,ok,extra){const tr=document.createElement('tr');const td1=document.createElement('td');td1.textContent=label;const td2=document.createElement('td');const span=document.createElement('span');span.className=ok?'status-ok':'status-bad';span.textContent=ok?'OK':'Issue';td2.appendChild(span);if(extra){const sp=document.createElement('span');sp.style.marginLeft='8px';sp.textContent=extra;td2.appendChild(sp)}tr.appendChild(td1);tr.appendChild(td2);tbody.appendChild(tr)}const views=j.views||{};const tables=j.tables||{};const viewsMissing=Object.keys(views).filter(k=>!views[k]);const tablesMissing=Object.keys(tables).filter(k=>!tables[k]);const viewsOk=viewsMissing.length===0;const tablesOk=tablesMissing.length===0;addStatusRow('Database',!!j.db);addStatusRow('Views',viewsOk,viewsOk?'':('missing: '+viewsMissing.join(', ')));addStatusRow('Tables',tablesOk,tablesOk?'':('missing: '+tablesMissing.join(', ')));addStatusRow('API Port',!!j.apiPort,String(j.apiPort||''));addStatusRow('MySQL Port',!!j.mysqlPort,String(j.mysqlPort||''));const ipsRow=document.createElement('tr');const ipsK=document.createElement('td');ipsK.textContent='IPs';const ipsV=document.createElement('td');ipsV.className='diag-ips';const ips=Array.isArray(j.ips)?j.ips:[];if(ips.length){ips.forEach(ip=>{const a=document.createElement('a');a.href='http://'+ip+':'+(j.apiPort||3200)+'/';a.textContent=ip;ipsV.appendChild(a)})}else{const span=document.createElement('span');span.className='status-bad';span.textContent='No non-local IPv4s detected';ipsV.appendChild(span)}ipsRow.appendChild(ipsK);ipsRow.appendChild(ipsV);tbody.appendChild(ipsRow);table.appendChild(tbody);container.appendChild(table);const hints=[];if(!j.db)hints.push('Database connection failed. Start MariaDB and ensure the configured port is reachable.');if(!viewsOk)hints.push('Missing views: '+viewsMissing.join(', ')+'. Ensure base tables exist and the DB user can CREATE VIEW.');if(!tablesOk)hints.push('Missing tables: '+tablesMissing.join(', ')+'. Save a Customer or Inventory item to auto-create, or restart the app.');if(!ips.length)hints.push('No reachable IPv4 address. Check NIC configuration and firewall.');const fwHint='Allow inbound TCP '+(j.apiPort||3200)+' on Windows Firewall and any third-party firewall.';hints.push(fwHint);if(hints.length){const hTitle=document.createElement('div');hTitle.className='section-title';hTitle.textContent='Fix Hints';container.appendChild(hTitle);const ul=document.createElement('ul');hints.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});container.appendChild(ul)}if(selftestHost)selftestHost.appendChild(container)}catch(e){if(selftestHost)selftestHost.textContent='Diagnostics error: '+(e&&e.message||e)}}
if(selftestBtn)selftestBtn.addEventListener('click',runSelftest)
async function archivePriorYearsAction(){
  try{
    if(archiveStatus)archiveStatus.textContent=''
    const year=new Date().getFullYear()
    const ok1=confirm('This will move ALL Purchase Orders and Sales Orders before '+year+' into the archive database. Continue?')
    if(!ok1){if(archiveStatus)archiveStatus.textContent='Cancelled';return}
    const phrase=prompt('Type ARCHIVE to confirm:','')
    if(String(phrase||'').trim().toUpperCase()!=='ARCHIVE'){if(archiveStatus)archiveStatus.textContent='Cancelled';return}
    const pw=prompt('Enter admin password to archive:','')||''
    if(archiveStatus)archiveStatus.textContent='Archiving...'
    const r=await fetch(api('/api/archive/move'),{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},credentials:'include',body:JSON.stringify({confirm:'ARCHIVE',password:pw,year})})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(archiveStatus)archiveStatus.textContent='Archive error: '+(j.error||r.status);return}
    const moved=j&&j.moved||{}
    const parts=Object.keys(moved).map(k=>k+': '+String(moved[k]||0))
    if(archiveStatus)archiveStatus.textContent='Archived • '+(parts.length?parts.join(' • '):'done')
  }catch(e){if(archiveStatus)archiveStatus.textContent='Archive error: '+(e&&e.message||e)}
}
if(archiveBtn)archiveBtn.addEventListener('click',archivePriorYearsAction)
async function archiveRebalanceAction(){
  try{
    if(archiveStatus)archiveStatus.textContent=''
    const year=new Date().getFullYear()
    const ok1=confirm('This will ensure orders before '+year+' are in the archive, and orders from '+year+' onward are in the current database. Continue?')
    if(!ok1){if(archiveStatus)archiveStatus.textContent='Cancelled';return}
    const phrase=prompt('Type REBALANCE to confirm:','')
    if(String(phrase||'').trim().toUpperCase()!=='REBALANCE'){if(archiveStatus)archiveStatus.textContent='Cancelled';return}
    const pw=prompt('Enter admin password to rebalance archive:','')||''
    if(archiveStatus)archiveStatus.textContent='Rebalancing...'
    const r=await fetch(api('/api/archive/rebalance'),{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},credentials:'include',body:JSON.stringify({confirm:'REBALANCE',password:pw,year})})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(archiveStatus)archiveStatus.textContent='Rebalance error: '+(j.error||r.status);return}
    const toArchive=j&&j.movedToArchive||{}
    const toCurrent=j&&j.movedToCurrent||{}
    const parts=[]
    const mk=(obj,prefix)=>Object.keys(obj||{}).forEach(k=>parts.push(prefix+k+': '+String(obj[k]||0)))
    mk(toArchive,'to archive • ')
    mk(toCurrent,'to current • ')
    if(archiveStatus)archiveStatus.textContent='Rebalanced • '+(parts.length?parts.join(' • '):'done')
  }catch(e){if(archiveStatus)archiveStatus.textContent='Rebalance error: '+(e&&e.message||e)}
}
if(archiveRebalanceBtn)archiveRebalanceBtn.addEventListener('click',archiveRebalanceAction)
// Vendor page logic
let __vendorLoaded=false;let __vendors=[];let __vendorSchema=[];let __vendorSource='vendor';
function pick(row,names){for(const n of names){if(n in row && row[n]!=null && row[n]!=='' )return row[n]}return ''}
function parseCols(el){const v=(el.getAttribute('data-cols')||'').split(',').map(s=>s.trim()).filter(Boolean);return v}
function __dlSet(id,values,limit){
  const dl=document.getElementById(id)
  if(!dl)return
  dl.innerHTML=''
  ;[...values].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,limit||500).forEach(v=>{
    const opt=document.createElement('option')
    opt.value=String(v)
    dl.appendChild(opt)
  })
}
async function __refreshSharedDatalists(){
  try{await __poEnsureVendorsForPO()}catch{}
  try{await __soEnsureCustomersForSO()}catch{}
  try{await __poEnsureInventory()}catch{}
  try{
    const vSet=new Set()
    ;(__vendors||[]).forEach(r=>{const n=String(pick(r,['Name','Vendor','Company'])||'').trim();if(n)vSet.add(n)})
    __dlSet('dl-vendors',vSet,600)
  }catch{}
  try{
    const cSet=new Set()
    ;(__customers||[]).forEach(r=>{const n=String(pick(r,['Name','Customer','Company'])||'').trim();if(n)cSet.add(n)})
    __dlSet('dl-customers',cSet,800)
  }catch{}
  try{
    const iSet=new Set()
    ;(__invRows||[]).forEach(r=>{
      const n=String(pick(r,['Name','ItemName','Item'])||'').trim()
      const code=String(pick(r,['Code','ItemCode','SKU'])||'').trim()
      if(n)iSet.add(n)
      if(code)iSet.add(code)
    })
    __dlSet('dl-items',iSet,1500)
  }catch{}
}
function bindVendor(row){
  const fields=[ 'v-name','v-balance','v-address','v-contact','v-phone','v-fax','v-email','v-website','v-terms','v-tax','v-carrier','v-currency','v-remarks' ];
  fields.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)});
  const name=pick(row,['Name','Vendor','Company']);
  renderVendorOrdersForName(name);
  renderVendorProductsForName(name);
}
async function renderVendorOrdersForName(name){const host=document.getElementById('vendor-orders');if(!host)return;const vend=String(name||'').trim().toLowerCase();if(!vend){host.textContent='Select a vendor to view order history';return}host.textContent='Loading...';try{const r=await fetch(api('/api/data?table=purchase_order&limit=1000'));const j=await r.json().catch(()=>({}));if(!r.ok){host.textContent='Error loading orders';return}const rows=(j.rows||[]).filter(ro=>String(pick(ro,['Vendor','VendorName','Supplier','Company','Name'])||'').trim().toLowerCase()===vend);if(!rows.length){host.textContent='No orders for this vendor';return}const cols=['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo','Date','OrderDate','Status','Total','GrandTotal','Paid','PaidAmount','AmountPaid','Balance','BalanceDue','AmountDue'];const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['','Order #','Order Date','Status','Total','Amount Paid','Balance Due'].forEach(h=>{const th=document.createElement('th');th.textContent=h;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');let sum=0,paidSum=0,balanceSum=0;rows.forEach(ro=>{const tr=document.createElement('tr');const num=pick(ro,cols.slice(0,5));const date=pick(ro,['Date','OrderDate']);const status=pick(ro,['Status']);const total=pick(ro,['Total','GrandTotal','Subtotal','SubTotal']);const paid=pick(ro,['Paid','PaidAmount','AmountPaid']);let balance=pick(ro,['Balance','BalanceDue','AmountDue']);const tnum=Number(String(total||'').replace(/[^0-9.+-]/g,''));const pnum=Number(String(paid||'').replace(/[^0-9.+-]/g,''));let bnum=Number(String(balance||'').replace(/[^0-9.+-]/g,''));if(!isNaN(tnum))sum+=tnum;if(!isNaN(pnum))paidSum+=pnum;if(isNaN(bnum)&&!isNaN(tnum)&&!isNaN(pnum))bnum=Math.max(0,tnum-pnum);if(!isNaN(bnum))balanceSum+=bnum;balance=(isNaN(bnum)?'':bnum.toFixed(2));const lead=document.createElement('td');lead.textContent='';tr.appendChild(lead);[num,date,status,total,paid,balance].forEach(v=>{const td=document.createElement('td');td.textContent=String(v||'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);host.innerHTML='';host.appendChild(table);const summary=document.createElement('div');summary.className='status';summary.textContent='Orders: '+rows.length+' • Total: '+sum.toFixed(2)+' • Paid: '+paidSum.toFixed(2)+' • Balance: '+balanceSum.toFixed(2);host.appendChild(summary)}catch(e){host.textContent='Error: '+(e&&e.message||e)}}
async function renderVendorProductsForName(name){const host=document.getElementById('vendor-products');if(!host)return;const vend=String(name||'').trim().toLowerCase();if(!vend){host.textContent='Select a vendor to view products';return}host.textContent='Loading...';try{const r=await fetch(api('/api/data?table=inventory&limit=2000'));const j=await r.json().catch(()=>({}));if(!r.ok){host.textContent='Error loading products';return}const rows=(j.rows||[]).filter(ro=>{const v=String(pick(ro,['LastVendor','Last Vendor','Vendor','PreferredVendor','VendorName','Supplier'])||'').trim().toLowerCase();return v===vend});if(!rows.length){host.textContent='No products for this vendor';return}const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['','Item','Description','Vendor Product Code','Cost'].forEach(h=>{const th=document.createElement('th');th.textContent=h;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(ro=>{const tr=document.createElement('tr');const item=pick(ro,['Name','ItemName','Item','Code','ItemCode','SKU']);const desc=pick(ro,['Description','ItemDescription']);const vcode=pick(ro,['VendorProductCode','Vendor Product Code','VendorCode','Vendor Item Code','VendorItemCode','VendorSKU','VendorSku','VendorProduct','VendorPart','VendorPartNo']);const cost=pick(ro,['VendorPrice','Cost','LastCost','Price']);const lead=document.createElement('td');lead.textContent='';tr.appendChild(lead);[item,desc,vcode,cost].forEach(v=>{const td=document.createElement('td');td.textContent=String(v||'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);host.innerHTML='';host.appendChild(table)}catch(e){host.textContent='Error: '+(e&&e.message||e)}}
// Customer page logic
let __customerLoaded=false;let __customers=[];let __customerSchema=[];
let __cAddr={business:'',shipping:''};
function renderCustomerList(items){const list=document.getElementById('c-list');const count=document.getElementById('c-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No customers';if(count)count.textContent='0';return}const keyNames=['Name','Customer','Company'];items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';const n=String(pick(row,keyNames)||'(no name)');div.textContent=n;div.addEventListener('click',()=>{document.querySelectorAll('#c-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindCustomerAndOrders(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindCustomerAndOrders(row)}});if(count)count.textContent=String(items.length)}
function filterCustomer(){const q=(document.getElementById('c-q-name')?.value||'').toLowerCase();const items=__customers.filter(r=>String(pick(r,['Name','Customer','Company'])).toLowerCase().includes(q));renderCustomerList(items)}
function bindCustomer(row){const map=['c-name','c-balance','c-address','c-contact','c-phone','c-fax','c-email','c-website','c-currency','c-discount','c-terms','c-tax','c-tax-exempt','c-remarks'];map.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)});const kv=document.getElementById('c-kv');if(kv){kv.innerHTML='';const cols=Object.keys(row||{});cols.forEach(k=>{const kEl=document.createElement('div');kEl.className='k';kEl.textContent=k;const vEl=document.createElement('div');vEl.className='v';vEl.textContent=String(row[k]??'');kv.appendChild(kEl);kv.appendChild(vEl)})}}
async function renderCustomerOrdersForName(name){const host=document.getElementById('c-orders');if(!host)return;host.textContent='Loading...';const cust=String(name||'').trim().toLowerCase();try{const r=await fetch(api('/api/data?table=sales_order&limit=1000'));const j=await r.json().catch(()=>({}));if(!r.ok){host.textContent='Error loading orders';return}const rows=(j.rows||[]).filter(ro=>String(pick(ro,['Customer','CustomerName','Company','Name'])||'').trim().toLowerCase()===cust);if(!rows.length){host.textContent='No orders for this customer';return}const cols=['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo','Date','OrderDate','Status','Total','GrandTotal'];const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Order #','Date','Status','Total'].forEach(h=>{const th=document.createElement('th');th.textContent=h;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');let sum=0;rows.forEach(ro=>{const tr=document.createElement('tr');const num=pick(ro,cols.slice(0,5));const date=pick(ro,['Date','OrderDate']);const status=pick(ro,['Status']);const total=pick(ro,['Total','GrandTotal','Subtotal','SubTotal']);const tnum=Number(String(total||'').replace(/[^0-9.+-]/g,''));if(!isNaN(tnum))sum+=tnum;[num,date,status,total].forEach(v=>{const td=document.createElement('td');td.textContent=String(v||'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);host.innerHTML='';host.appendChild(table);const summary=document.createElement('div');summary.className='status';summary.textContent='Orders: '+rows.length+' • Total: '+sum.toFixed(2);host.appendChild(summary)}catch(e){host.textContent='Error: '+(e&&e.message||e)}}
function bindCustomerAndOrders(row){bindCustomer(row);const name=pick(row,['Name','Customer','Company']);renderCustomerOrdersForName(name);loadCustomerExtended(name)}
function syncCustomerAddressUI(){const sel=document.getElementById('c-address-type');const ta=document.getElementById('c-address');if(!sel||!ta)return;const type=(sel.value||sel.options[sel.selectedIndex]?.text||'Business Address').toLowerCase();if(type.startsWith('shipping'))ta.value=__cAddr.shipping||'';else ta.value=__cAddr.business||''}
async function loadCustomerExtended(name){if(!name)return;try{const r=await fetch(api('/api/customer/extended?name='+encodeURIComponent(name)));const j=await r.json().catch(()=>({}));if(j&&j.extra){const x=j.extra;__cAddr.business=String((x.BusinessAddress??x.Address??'')||'');__cAddr.shipping=String((x.ShipToAddress??'')||'');[['c-contact','Contact'],['c-phone','Phone'],['c-fax','Fax'],['c-email','Email'],['c-website','Website'],['c-currency','Currency'],['c-discount','Discount'],['c-terms','PaymentTerms'],['c-tax','TaxingScheme'],['c-tax-exempt','TaxExempt'],['c-remarks','Remarks']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=(x[key]!=null?String(x[key]):el.value)});syncCustomerAddressUI()}}catch{}}
function gatherCustomerPayload(){const sel=document.getElementById('c-address-type');const ta=document.getElementById('c-address');if(sel&&ta){const type=(sel.value||sel.options[sel.selectedIndex]?.text||'Business Address').toLowerCase();if(type.startsWith('shipping'))__cAddr.shipping=ta.value;else __cAddr.business=ta.value}return {extra:{BusinessAddress:__cAddr.business||null,ShipToAddress:__cAddr.shipping||null,Address:__cAddr.business||null,Contact:document.getElementById('c-contact')?.value||null,Phone:document.getElementById('c-phone')?.value||null,Fax:document.getElementById('c-fax')?.value||null,Email:document.getElementById('c-email')?.value||null,Website:document.getElementById('c-website')?.value||null,Currency:document.getElementById('c-currency')?.value||null,Discount:document.getElementById('c-discount')?.value||null,PaymentTerms:document.getElementById('c-terms')?.value||null,TaxingScheme:document.getElementById('c-tax')?.value||null,TaxExempt:document.getElementById('c-tax-exempt')?.value||null,Remarks:document.getElementById('c-remarks')?.value||null}}}
async function saveCustomer(){const name=document.getElementById('c-name')?.value||'';if(!name)return;const payload=gatherCustomerPayload();const r=await fetch(api('/api/customer/extended?name='+encodeURIComponent(name)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const jr=await r.json().catch(()=>({}));if(!r.ok||(jr&&jr.ok===false&&jr.error)){toast(String(jr&&jr.error||'Unable to save customer'),'error');return}toast('Customer saved','success')}
async function initCustomerPage(){
  const sec=document.getElementById('section-customer')
  if(sec && !sec.dataset.bound){
    sec.dataset.bound='1'
    const stmt=document.getElementById('customer-statement')
    if(stmt)stmt.addEventListener('click',()=>openStatementOfAccount('customer',document.getElementById('c-name')?.value||''))
    const qn=document.getElementById('c-q-name')
    if(qn)qn.addEventListener('input',filterCustomer)
    const ref=document.getElementById('c-refresh')
    if(ref)ref.addEventListener('click',async()=>{__customerLoaded=false;await initCustomerPage()})
    const save=document.getElementById('c-save')
    if(save)save.addEventListener('click',saveCustomer)
    const sel=document.getElementById('c-address-type')
    const ta=document.getElementById('c-address')
    if(sel)sel.addEventListener('change',syncCustomerAddressUI)
    if(ta)ta.addEventListener('input',()=>{
      const type=(sel&& (sel.value||sel.options[sel.selectedIndex]?.text)||'Business Address').toLowerCase()
      if(type.startsWith('shipping'))__cAddr.shipping=ta.value
      else __cAddr.business=ta.value
    })
    document.querySelectorAll('#section-customer .tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('#section-customer .tab').forEach(b=>b.classList.toggle('active',b===btn))
        document.querySelectorAll('#section-customer .tabpane').forEach(p=>p.classList.toggle('active',p.id==='c-tab-'+btn.dataset.tab))
      })
    })
  }
  if(__customerLoaded){try{__refreshSharedDatalists()}catch{}filterCustomer();return}
  try{
    const s=await fetch(api('/api/schema?table=customer'))
    const sj=await s.json().catch(()=>({}))
    __customerSchema=sj.schema||[]
    const d=await fetch(api('/api/data?table=customer&limit=1000'))
    const dj=await d.json().catch(()=>({}))
    __customers=dj.rows||[]
    __customerLoaded=true
    try{__refreshSharedDatalists()}catch{}
    filterCustomer()
  }catch(e){
    const list=document.getElementById('c-list')
    if(list)list.textContent='Error: '+(e&&e.message||e)
  }
}
// Purchase Order page logic
let __poLoaded=false;let __poRows=[];let __poSchema=[];
let __poArchiveQuery=null;let __poArchiveRows=[];
async function fetchArchiveOrders(type,num){
  try{
    const r=await fetch(api('/api/archive/orders?type='+encodeURIComponent(type)+'&num='+encodeURIComponent(num)));
    const j=await r.json().catch(()=>({}))
    return Array.isArray(j.rows)?j.rows:[]
  }catch{return []}
}
const __poItemMap=new Map();let __poCurrentKey=null;let __poSelectedIndex=-1;
let __poVendorAutofillBound=false;
let __poVendorExtraMerged=false;
let __poLastAutofilledVendor=''
function __poLc(v){return String(v||'').trim().toLowerCase()}
function __poVendorNameFromRow(r){return String(pick(r,['Name','Vendor','Company'])||'').trim()}
function __poDelay(ms){return new Promise(r=>setTimeout(r,ms))}
function __poVendorRowForName(name,opts){
  const want=__poLc(name)
  if(!want)return null
  const exact=!!(opts&&opts.exact)
  let row=(__vendors||[]).find(r=>__poLc(__poVendorNameFromRow(r))===want)||null
  if(row||exact)return row
  const prefix=(__vendors||[]).filter(r=>__poLc(__poVendorNameFromRow(r)).startsWith(want))
  if(prefix.length===1)return prefix[0]
  return null
}
function __poSetDL(id,values,limit){
  const dl=document.getElementById(id)
  if(!dl)return
  dl.innerHTML=''
  ;[...values].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,limit||500).forEach(v=>{
    const opt=document.createElement('option')
    opt.value=String(v)
    dl.appendChild(opt)
  })
}
async function __poEnsureVendorsForPO(){
  const mergeExtra=async()=>{
    if(__poVendorExtraMerged)return
    try{
      const r=await fetch(api('/api/data?table=vendor_extra&limit=2000'))
      if(!r || !r.ok)return
      const j=await r.json().catch(()=>({}))
      const rows=j&&Array.isArray(j.rows)?j.rows:[]
      __poVendorExtraMerged=true
      if(!rows.length)return
      const map=new Map()
      rows.forEach(x=>{
        const n=String((x&&x.Name)||'').trim()
        if(n)map.set(__poLc(n),x)
      })
      const existing=new Set()
      ;(__vendors||[]).forEach(v=>{const nm=__poVendorNameFromRow(v);if(nm)existing.add(__poLc(nm))})
      ;(__vendors||[]).forEach(v=>{
        const nm=__poVendorNameFromRow(v)
        if(!nm)return
        const x=map.get(__poLc(nm))
        if(!x)return
        const setIfEmpty=(k,val)=>{
          if(val==null)return
          if(v[k]==null || String(v[k]).trim()==='')v[k]=val
        }
        const addr=(x.BusinessAddress??x.Address)
        setIfEmpty('Address',addr)
        setIfEmpty('BusinessAddress',addr)
        setIfEmpty('Contact',x.Contact)
        setIfEmpty('Phone',x.Phone)
        setIfEmpty('Fax',x.Fax)
        setIfEmpty('Email',x.Email)
        setIfEmpty('Website',x.Website)
        setIfEmpty('Currency',x.Currency)
        setIfEmpty('PaymentTerms',x.PaymentTerms)
        setIfEmpty('Terms',x.PaymentTerms)
        setIfEmpty('TaxingScheme',x.TaxingScheme)
        setIfEmpty('TaxCode',x.TaxingScheme)
        setIfEmpty('Carrier',x.Carrier)
        setIfEmpty('Remarks',x.Remarks)
      })
      for(const [lc,x] of map.entries()){
        if(existing.has(lc))continue
        const addr=(x.BusinessAddress??x.Address)
        __vendors.push({Name:x.Name,Address:addr,BusinessAddress:addr,Contact:x.Contact,Phone:x.Phone,Fax:x.Fax,Email:x.Email,Website:x.Website,Currency:x.Currency,PaymentTerms:x.PaymentTerms,Terms:x.PaymentTerms,TaxingScheme:x.TaxingScheme,TaxCode:x.TaxingScheme,Carrier:x.Carrier,Remarks:x.Remarks})
      }
    }catch{}
  }
  if(__vendorLoaded && Array.isArray(__vendors) && __vendors.length){await mergeExtra();return}
  try{
    let source='vendor_derived'
    let d=await fetch(api('/api/data?table='+source+'&limit=2000'))
    let dj=await d.json().catch(()=>({}))
    if(!d.ok || !(dj.rows||[]).length){
      source='vendor'
      d=await fetch(api('/api/data?table='+source+'&limit=2000'))
      dj=await d.json().catch(()=>({}))
    }
    __vendors=dj.rows||[]
    __vendorSource=source
    __vendorLoaded=true
    await mergeExtra()
  }catch{}
}
async function __poRefreshVendorDatalist(){
  await __poEnsureVendorsForPO()
  const set=new Set()
  ;(__vendors||[]).forEach(r=>{const n=__poVendorNameFromRow(r);if(n)set.add(n)})
  __poSetDL('po-vendor-list',set,500)
}
async function __poEnsureVendorDatalistReady(){
  const dl=document.getElementById('po-vendor-list')
  if(!dl)return false
  for(let i=0;i<6;i++){
    if(dl.children && dl.children.length>0)return true
    try{await __poRefreshVendorDatalist()}catch{}
    if(dl.children && dl.children.length>0)return true
    await __poDelay(120*(i+1))
  }
  return !!(dl.children && dl.children.length>0)
}
async function __poQuickAddVendor(){
  const btn=document.getElementById('po-vendor-add')
  const prev=btn?String(btn.textContent||'Add Vendor'):'Add Vendor'
  const nm=String(document.getElementById('po-vendor')?.value||'').trim()
  if(!nm){toast('Enter a vendor name first','warn');return}
  const address=String(document.getElementById('po-vendor-address')?.value||'')||null
  const payload={name:nm,extra:{Address:address,BusinessAddress:address,Contact:document.getElementById('po-contact')?.value||null,Phone:document.getElementById('po-phone')?.value||null,Currency:document.getElementById('po-currency')?.value||null,PaymentTerms:document.getElementById('po-terms')?.value||null,TaxingScheme:document.getElementById('po-tax')?.value||null,Active:1}}
  if(btn){btn.disabled=true;btn.textContent='Saving...'}
  try{
    const r=await fetch(api('/api/vendor/extended?name='+encodeURIComponent(nm)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok || (j&&j.ok===false&&j.error)){toast(String(j&&j.error||'Unable to save vendor'),'error');return}
    let row=__poVendorRowForName(nm,{exact:true})
    if(!row){row={Name:nm};__vendors.push(row)}
    row.Name=nm
    row.Contact=payload.extra.Contact
    row.Phone=payload.extra.Phone
    row.Address=address
    row.BusinessAddress=address
    row.PaymentTerms=payload.extra.PaymentTerms
    row.Terms=payload.extra.PaymentTerms
    row.TaxingScheme=payload.extra.TaxingScheme
    row.TaxCode=payload.extra.TaxingScheme
    row.Currency=payload.extra.Currency
    __poLastAutofilledVendor=nm
    toast('Vendor saved','success')
    __poVendorExtraMerged=false
    await __poRefreshVendorDatalist()
    await __poAutofillVendorFields({force:true,exact:true})
  }catch(e){
    toast(String(e&&e.message||e||'Save failed'),'error')
  }finally{
    if(btn){btn.disabled=false;btn.textContent=prev}
  }
}
async function __poQuickAddProduct(){
  const btn=document.getElementById('po-product-add')
  const prev=btn?String(btn.textContent||'Add Product'):'Add Product'
  const items=__poItemMap.get(__poCurrentKey)||[]
  const idx=(__poSelectedIndex>=0&&__poSelectedIndex<items.length)?__poSelectedIndex:0
  const it=items[idx]
  const name=String(it&&it.item||'').trim()
  if(!name){toast('Select an item (product name/code) first','warn');return}
  const rawPrice=(it&&it.price!=null)?Number(it.price):null
  const unitPrice=(rawPrice!=null && Number.isFinite(rawPrice))?rawPrice:null
  const payload={product:{Name:name,Description:(it&&it.desc?String(it.desc):null),UnitPrice:unitPrice}}
  if(btn){btn.disabled=true;btn.textContent='Saving...'}
  try{
    const r=await fetch(api('/api/product/derived?name='+encodeURIComponent(name)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok || (j&&j.ok===false&&j.error)){toast(String(j&&j.error||'Unable to save product'),'error');return}
    toast('Product saved','success')
    __invLoaded=false
    await __poEnsureInventory()
    try{await __refreshSharedDatalists()}catch{}
    try{await __poAutofillItemFromInventory(it,document.querySelector(`#po-items tbody tr[data-index="${idx}"]`),null)}catch{}
  }catch(e){
    toast(String(e&&e.message||e||'Save failed'),'error')
  }finally{
    if(btn){btn.disabled=false;btn.textContent=prev}
  }
}
async function __poAutofillVendorFields(opts){
  const force=!!(opts&&opts.force)
  await __poEnsureVendorsForPO()
  const venEl=document.getElementById('po-vendor')
  if(!venEl)return
  const name=venEl.value||''
  const row=__poVendorRowForName(name,opts)
  if(!row)return
  const canonical=__poVendorNameFromRow(row)
  if(canonical && __poLc(canonical)===__poLc(name))venEl.value=canonical
  __poLastAutofilledVendor=canonical||name
  const fill=(id,keys)=>{
    const el=document.getElementById(id)
    if(!el)return
    if(!force && String(el.value||'').trim())return
    const v=pick(row,keys)
    if(v!=null && String(v).trim()!=='')el.value=String(v)
  }
  fill('po-contact',['Contact','ContactName','Attn'])
  fill('po-phone',['Phone','Telephone','Mobile'])
  fill('po-vendor-address',['VendorAddress','Address','BusinessAddress','BillToAddress','Address1'])
  fill('po-terms',['PaymentTerms','Terms'])
  fill('po-tax',['TaxingScheme','TaxCode','Tax'])
  fill('po-currency',['Currency'])
}
function __poDatalistHasValue(id,value){
  const dl=document.getElementById(id)
  if(!dl)return false
  const want=__poLc(value)
  if(!want)return false
  const kids=dl.children||[]
  for(let i=0;i<kids.length;i++){
    const opt=kids[i]
    const v=opt && opt.value!=null ? String(opt.value) : ''
    if(__poLc(v)===want)return true
  }
  return false
}
function __poBindVendorAutofill(){
  if(__poVendorAutofillBound)return
  __poVendorAutofillBound=true
  const venEl=document.getElementById('po-vendor')
  if(!venEl)return
  const prime=()=>{
    const dl=document.getElementById('po-vendor-list')
    if(dl && dl.children && dl.children.length>0)return
    try{__poEnsureVendorDatalistReady().catch(()=>{})}catch{}
  }
  const runInput=()=>{
    const nm=String(venEl.value||'')
    if(!nm.trim())return
    const selected=__poDatalistHasValue('po-vendor-list',nm)
    const force=selected && (__poLc(__poLastAutofilledVendor)!==__poLc(nm))
    if(selected){
      __poAutofillVendorFields({force,exact:true})
      return
    }
    if(nm.trim().length<2)return
    __poAutofillVendorFields({force:false,exact:false})
  }
  const runCommit=()=>{__poAutofillVendorFields({force:true,exact:false})}
  venEl.addEventListener('input',runInput)
  venEl.addEventListener('change',runCommit)
  venEl.addEventListener('blur',runCommit)
  venEl.addEventListener('keydown',e=>{if(e.key==='Enter'){runCommit()}})
  venEl.addEventListener('focus',prime)
}
function __extractPONumber(row){const keys=['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo','order_no','orderno','po','purchaseorder','purchase_order','docno','doc_no','bill','billno','bill_no'];const vals=[];for(const k of keys){if(k in row&&row[k]!=null&&row[k]!=='')vals.push(String(row[k]))}let all=vals.join(' ');all=all.replace(/^\uFEFF+/,'').replace(/^ï»¿/,'');let m=all.match(/PO[\s-]*([0-9]{3,})\b/i);if(m)return m[1];m=all.match(/^\s*([0-9]{3,})\b/);if(m)return m[1];m=all.match(/[0-9]{3,}/);if(m)return m[0];return ''}
function __poDisplayNumber(row){try{const num=__extractPONumber(row)||'';const dv=pick(row,['Date','OrderDate']);const d=dv?new Date(dv):null;const y=(d&&d.toString()!=='Invalid Date')?String(d.getFullYear()):String(new Date().getFullYear());return num?('PO-'+y+'-'+num):'PO'}catch{return 'PO'}}
function __poItemsForRow(row){
  try{
    const key=String(pick(row,['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo'])||'').trim()
    if(!key)return []
    const rows=(__poRows||[]).filter(r=>String(pick(r,['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo'])||'').trim()===key)
    const items=[]
    for(const r of rows){
      const name=String(pick(r,['Item','ItemName','Product','ProductName','Name'])||'').trim()
      const desc=String(pick(r,['Description','ItemDescription','Desc'])||'').trim()
      const vcode=String(pick(r,['VendorItemCode','VendorProductCode','VendorCode'])||'').trim()
      const qty=String(pick(r,['ItemQuantity','Quantity','Qty'])??'').trim()
      const price=String(pick(r,['ItemUnitPrice','UnitPrice','Price'])??'').trim()
      const discount=String(pick(r,['ItemDiscount','Discount'])??'').trim()
      if(!name && !desc && !vcode && !qty && !price && !discount)continue
      items.push({item:name,barcode:'',desc:desc,vcode:vcode,qty:qty||'0',price:price||'0.00',discount:discount||'0.00',track:{type:'None',serials:[],lots:[]}})
    }
    return items
  }catch{return []}
}
function renderPOList(items){const list=document.getElementById('po-list');const count=document.getElementById('po-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No orders';if(count)count.textContent='0';return}const filtered=items.map(r=>({row:r,num:__extractPONumber(r)})).filter(x=>x.num);filtered.forEach(({row,num},idx)=>{const div=document.createElement('div');div.className='vendor-item';const display=/^\\s*po[\\s-]/i.test(num)?num:('PO '+num);div.textContent=display;div.addEventListener('click',()=>{document.querySelectorAll('#po-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindPO(row,__poItemsForRow(row))});list.appendChild(div);if(idx===0){div.classList.add('active');bindPO(row,__poItemsForRow(row))}});if(count)count.textContent=String(filtered.length)}
function filterPO(){
  const qn=(document.getElementById('po-q-num')?.value||'').toLowerCase()
  const qs=(document.getElementById('po-q-status')?.value||'').toLowerCase()
  const qv=(document.getElementById('po-q-vendor')?.value||'').toLowerCase()
  const qf=(document.getElementById('po-q-from')?.value||'').trim()
  const qt=(document.getElementById('po-q-to')?.value||'').trim()
  const from=qf?new Date(qf):null
  const to=qt?new Date(qt):null
  const matches=(r)=>{
    const num=(String(__extractPONumber(r))).toLowerCase()
    const stat=(String(pick(r,['Status','OrderStatus']))).toLowerCase()
    const ven=(String(pick(r,['Vendor','VendorName','Supplier','Company','Name']))).toLowerCase()
    let pass=(!!num)&&(!qn||num.includes(qn))&&(!qs||stat===qs)&&(!qv||ven===qv)
    if(pass&&(from||to)){
      const dv=pick(r,['Date','OrderDate'])
      const d=dv?new Date(dv):null
      if(d&&d.toString()!=='Invalid Date'){
        if(from&&d<from)pass=false
        if(to){
          const td=new Date(to)
          td.setHours(23,59,59,999)
          if(d>td)pass=false
        }
      }
    }
    return pass
  }
  const items=__poRows.filter(matches)
  if(document.getElementById('po-active-filters'))updatePOFilterChips()
  if(!items.length&&qn){
    if(__poArchiveQuery===qn){
      const a=(__poArchiveRows||[]).filter(matches)
      if(a.length){renderPOList(a);return}
    }else{
      __poArchiveQuery=qn
      __poArchiveRows=[]
      const list=document.getElementById('po-list');if(list)list.textContent='Searching archive...'
      const count=document.getElementById('po-count');if(count)count.textContent='0'
      fetchArchiveOrders('purchase',qn).then(rows=>{if(__poArchiveQuery===qn){__poArchiveRows=rows||[];filterPO()}})
      return
    }
  }
  renderPOList(items)
  if(typeof __poFitToScreen==='function')setTimeout(__poFitToScreen,0)
}
let __poFilterTimer=null
function scheduleFilterPO(){if(__poFilterTimer)clearTimeout(__poFilterTimer);__poFilterTimer=setTimeout(filterPO,250)}
function updatePOFilterChips(){const host=document.getElementById('po-active-filters');if(!host)return;const getSelText=(el)=>{if(!el)return'';if(el.tagName==='SELECT'){const opt=el.options[el.selectedIndex];return opt&&opt.textContent||''}return el.value||''};const chips=[];const qnEl=document.getElementById('po-q-num');if(qnEl&&qnEl.value)chips.push({id:'po-q-num',label:'Order #',val:qnEl.value});const qsEl=document.getElementById('po-q-status');if(qsEl&&qsEl.value)chips.push({id:'po-q-status',label:'Status',val:getSelText(qsEl)});const qvEl=document.getElementById('po-q-vendor');if(qvEl&&qvEl.value)chips.push({id:'po-q-vendor',label:'Vendor',val:getSelText(qvEl)});const qfEl=document.getElementById('po-q-from');if(qfEl&&qfEl.value)chips.push({id:'po-q-from',label:'From',val:qfEl.value});const qtEl=document.getElementById('po-q-to');if(qtEl&&qtEl.value)chips.push({id:'po-q-to',label:'To',val:qtEl.value});host.innerHTML='';chips.forEach(c=>{const el=document.createElement('span');el.className='chip';el.innerHTML='<span>'+__escHtml(c.label+': '+c.val)+'</span><span class=\"x\">×</span>';el.addEventListener('click',()=>{const inp=document.getElementById(c.id);if(!inp)return;inp.value='';if(inp.tagName==='SELECT'){try{inp.selectedIndex=0}catch{}}scheduleFilterPO()});host.appendChild(el)})}
function parseNum(v){if(v==null||v==='')return 0;const n=Number(String(v).replace(/[^0-9.+-]/g,''));return isNaN(n)?0:n}
function calcTotals(items){const freightEl=document.getElementById('po-freight');const paidEl=document.getElementById('po-paid');let subtotal=0;items.forEach(it=>{const qty=parseNum(it.qty);const price=parseNum(it.price);const disc=parseNum(it.discount);subtotal+=Math.max(0,(qty*price)-disc)});const freight=parseNum(freightEl&&freightEl.value);const paid=parseNum(paidEl&&paidEl.value);const total=subtotal+freight;const balance=Math.max(0,total-paid);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val.toFixed(2)};set('po-subtotal',subtotal);set('po-total',total);set('po-balance',balance);try{__syncPOAdvancedFromMain()}catch{}}
function __syncPOAdvancedFromMain(){try{const copy=(srcId,dstId)=>{const s=document.getElementById(srcId);const d=document.getElementById(dstId);if(s&&d){d.value=s.value}};copy('po-due','po-adv-due');copy('po-remarks','po-adv-remarks');copy('po-due','po-adv-pay-due');const m=(id,val)=>{const el=document.getElementById(id);if(el)el.value=String(val)};const subtotal=document.getElementById('po-subtotal')?.value||'0';const freight=document.getElementById('po-freight')?.value||'0';const total=document.getElementById('po-total')?.value||'0';const paid=document.getElementById('po-paid')?.value||'0';const balance=document.getElementById('po-balance')?.value||'0';m('po-adv-subtotal',subtotal);m('po-adv-freight',freight);m('po-adv-total',total);m('po-adv-paid',paid);m('po-adv-balance',balance);const items=__poItemMap.get(__poCurrentKey)||[];let q=0;items.forEach(it=>{const qty=parseNum(it.qty);if(!Number.isNaN(qty))q+=qty});const qo=document.getElementById('po-adv-q-ordered');if(qo)qo.textContent=String(q);const qr=document.getElementById('po-adv-q-received');if(qr)qr.textContent='0'}catch{}}
function __wirePOAdvancedMirrors(){try{const link=(srcId,dstId)=>{const s=document.getElementById(srcId);const d=document.getElementById(dstId);if(s&&d){d.addEventListener('input',()=>{s.value=d.value})}};link('po-due','po-adv-due');link('po-remarks','po-adv-remarks');link('po-due','po-adv-pay-due')}catch{}}
function ensurePOFooterSingleToggle(){try{const footer=document.getElementById('sticky-footer');if(!footer)return;const bottomTabs=document.querySelector('#section-purchase-order .vendor-tabs.tabs-bottom');if(bottomTabs)bottomTabs.style.display='none';const doReplace=()=>{const tabs=document.getElementById('po-foot-tabs');if(tabs&&!document.getElementById('po-foot-toggle')){const btn=document.createElement('button');btn.id='po-foot-toggle';btn.className='btn';const isAdv=!!document.querySelector('#po-tab-advanced.tabpane.active');btn.textContent=isAdv?'Simple':'Advanced';const switchTo=(mode)=>{document.querySelectorAll('#section-purchase-order .vendor-tabpanes>.tabpane').forEach(p=>p.classList.toggle('active',p.id==='po-tab-'+mode));document.querySelectorAll('#section-purchase-order .vendor-tabs.tabs-bottom .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===mode));btn.textContent=(mode==='advanced')?'Simple':'Advanced'};btn.addEventListener('click',()=>{const advActive=!!document.querySelector('#po-tab-advanced.tabpane.active');switchTo(advActive?'purchasing':'advanced')});tabs.replaceWith(btn)}};doReplace();try{const mo=new MutationObserver(()=>doReplace());mo.observe(footer,{childList:true,subtree:true})}catch{}}catch{}}
function renderItems(){const itemsHost=document.getElementById('po-items');if(!itemsHost)return;const items=__poItemMap.get(__poCurrentKey)||[];if(items.length===0){items.push({item:'',barcode:'',desc:'',vcode:'',qty:'0',price:'0.00',discount:'0.00',track:{type:'None',serials:[],lots:[]}});__poItemMap.set(__poCurrentKey,items)}itemsHost.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['','Item','Barcode','Description','Vendor Product Code','Quantity','Unit Price','Discount','Sub-Total'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach((it,idx)=>{if(!it.track)it.track={type:'None',serials:[],lots:[]};const tr=document.createElement('tr');tr.dataset.index=String(idx);function cellInput(value,placeholder,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(placeholder)inp.placeholder=placeholder;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value)});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next){next.focus()}else{addItemRow()}}});td.appendChild(inp);return td}
  const tdStub=document.createElement('td');tdStub.className='po-stub';tdStub.textContent=(String(it.item||'').trim()?'' : '*');tr.appendChild(tdStub)
  const tdItem=cellInput(it.item,'Item',v=>{it.item=v});tr.appendChild(tdItem)
  const tdBarcode=cellInput(it.barcode,'Barcode',v=>{it.barcode=v});tr.appendChild(tdBarcode)
  const tdDesc=cellInput(it.desc,'Description',v=>{it.desc=v});tr.appendChild(tdDesc)
  tr.appendChild(cellInput(it.vcode,'Vendor Code',v=>{it.vcode=v}))
  tr.appendChild(cellInput(it.qty,'0',v=>{it.qty=v;updateRowSubtotal(tr,idx)},{type:'number',step:'1',min:'0'}))
  tr.appendChild(cellInput(it.price,'0.00',v=>{it.price=v;updateRowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(cellInput(it.discount,'0.00',v=>{it.discount=v;updateRowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  const tdSub=document.createElement('td');tdSub.textContent=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount)).toFixed(2);tdSub.className='po-row-subtotal';tr.appendChild(tdSub)
  try{
    const itemInp=tdItem&&tdItem.querySelector('input.inp')
    if(itemInp){
      itemInp.setAttribute('list','dl-items')
      itemInp.addEventListener('change',()=>{__poAutofillItemFromInventory(it,tr,tdStub)})
      itemInp.addEventListener('blur',()=>{__poAutofillItemFromInventory(it,tr,tdStub)})
    }
    const barInp=tdBarcode&&tdBarcode.querySelector('input.inp')
    if(barInp){
      barInp.addEventListener('change',()=>{__poAutofillItemFromInventory(it,tr,tdStub)})
      barInp.addEventListener('blur',()=>{__poAutofillItemFromInventory(it,tr,tdStub)})
    }
  }catch{}
  tr.addEventListener('click',()=>{document.querySelectorAll('#po-items tbody tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');__poSelectedIndex=idx;renderReceiveTrackingPanel()})
  tbody.appendChild(tr)
}); // insert controls row under the first editable row (index 0)
const toolbar=document.getElementById('po-item-toolbar');const addBtn=document.getElementById('po-item-add');const delBtn=document.getElementById('po-item-del');const prodBtn=document.getElementById('po-product-add');if(toolbar&&addBtn&&delBtn){const ctr=document.createElement('tr');const c0=document.createElement('td');c0.textContent='';ctr.appendChild(c0);const c1=document.createElement('td');c1.style.padding='6px 4px';c1.style.display='inline-flex';c1.style.gap='8px';c1.style.alignItems='center';c1.appendChild(addBtn);if(delBtn){delBtn.style.marginLeft='0';c1.appendChild(delBtn)}if(prodBtn){prodBtn.style.marginLeft='0';c1.appendChild(prodBtn)}ctr.appendChild(c1);const blanks=6;for(let i=0;i<blanks;i++){const td=document.createElement('td');td.textContent='';ctr.appendChild(td)}const firstRow=tbody.querySelector('tr');if(firstRow&&firstRow.nextSibling){tbody.insertBefore(ctr,firstRow.nextSibling)}else{tbody.appendChild(ctr)};toolbar.style.display='none'}
table.appendChild(tbody);itemsHost.appendChild(table);calcTotals(items);if(typeof __poFitToScreen==='function')setTimeout(__poFitToScreen,0)}
function updateRowSubtotal(tr,idx){const items=__poItemMap.get(__poCurrentKey)||[];const it=items[idx];const sub=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount));const td=tr.querySelector('.po-row-subtotal');if(td)td.textContent=sub.toFixed(2);calcTotals(items);renderPOAdvOrderItems();renderPOAdvReceiveItems();renderPOAdvReturnItems()}
function addItemRow(){const items=__poItemMap.get(__poCurrentKey)||[];items.push({item:'',barcode:'',desc:'',vcode:'',qty:'0',price:'0.00',discount:'0.00',track:{type:'None',serials:[],lots:[]}});__poItemMap.set(__poCurrentKey,items);renderItems();const last=document.querySelector('#po-items tbody tr:last-child input');if(last)last.focus()}
function deleteItemRow(){const items=__poItemMap.get(__poCurrentKey)||[];if(__poSelectedIndex>=0&&__poSelectedIndex<items.length){items.splice(__poSelectedIndex,1);__poSelectedIndex=-1;renderItems()}}
function renderPOAdvOrderItems(){const host=document.getElementById('po-adv-order-items');if(!host)return;const items=__poItemMap.get(__poCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Barcode','Description','Quantity','Location','Sublocation','Unstocked?'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach(it=>{const tr=document.createElement('tr');const td1=document.createElement('td');td1.textContent=it.item||'';tr.appendChild(td1);const tdB=document.createElement('td');tdB.textContent=it.barcode||'';tr.appendChild(tdB);const td2=document.createElement('td');td2.textContent=it.desc||'';tr.appendChild(td2);const td3=document.createElement('td');td3.textContent=String(parseNum(it.qty));tr.appendChild(td3);const td4=document.createElement('td');td4.textContent='';tr.appendChild(td4);const td5=document.createElement('td');td5.textContent='';tr.appendChild(td5);const td6=document.createElement('td');td6.textContent='';tr.appendChild(td6);tbody.appendChild(tr)});table.appendChild(tbody);host.appendChild(table)}
function renderPOAdvReceiveItems(){const host=document.getElementById('po-adv-receive-items');if(!host)return;const items=__poItemMap.get(__poCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Barcode','Description','Quantity','Location','Sublocation','Receive Date','Received'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach(it=>{const tr=document.createElement('tr');const td1=document.createElement('td');td1.textContent=it.item||'';tr.appendChild(td1);const tdB=document.createElement('td');tdB.textContent=it.barcode||'';tr.appendChild(tdB);const td2=document.createElement('td');td2.textContent=it.desc||'';tr.appendChild(td2);const td3=document.createElement('td');td3.textContent=String(parseNum(it.qty));tr.appendChild(td3);const td4=document.createElement('td');td4.textContent='';tr.appendChild(td4);const td5=document.createElement('td');td5.textContent='';tr.appendChild(td5);const td6=document.createElement('td');td6.textContent='';tr.appendChild(td6);const td7=document.createElement('td');td7.textContent='0';tr.appendChild(td7);tbody.appendChild(tr)});table.appendChild(tbody);host.appendChild(table)}
async function __poEnsureInventory(){try{if(__invLoaded)return;const s=await fetch(api('/api/schema?table=inventory'));const sj=await s.json().catch(()=>({}));__invSchema=sj.schema||[];const d=await fetch(api('/api/data?table=inventory&limit=1000'));const dj=await d.json().catch(()=>({}));__invRows=dj.rows||[];__invLoaded=true}catch{}}
function __poFindInvRowBy(item,barcode){const lc=(s)=>String(s||'').trim().toLowerCase();const fieldsName=['Name','ItemName','Item','Code','ItemCode','SKU'];const fieldsBarcode=['Barcode','UPC','EAN'];let row=null;if(barcode){const b=lc(barcode);row=(__invRows||[]).find(r=>fieldsBarcode.some(k=>lc(r[k])===b))||null;if(row)return row}const n=lc(item);row=(__invRows||[]).find(r=>fieldsName.some(k=>lc(r[k])===n))||null;return row}
async function __poAutofillItemFromInventory(it,tr,stubEl){
  try{
    await __poEnsureInventory()
    const invRow=__poFindInvRowBy(it&&it.item,it&&it.barcode)
    if(!invRow)return
    const inputs=tr&&tr.querySelectorAll?tr.querySelectorAll('input.inp'):[]
    if(it && (!it.barcode || !String(it.barcode).trim())){
      const b=pick(invRow,['Barcode','UPC','EAN'])
      if(b!=null && String(b).trim()!==''){
        it.barcode=String(b)
        if(inputs&&inputs[1])inputs[1].value=it.barcode
      }
    }
    if(it && (!it.desc || !String(it.desc).trim())){
      const d=pick(invRow,['Description','ItemDescription','Desc'])
      if(d!=null && String(d).trim()!==''){
        it.desc=String(d)
        if(inputs&&inputs[2])inputs[2].value=it.desc
      }
    }
    try{
      ensureTrack(it)
      if((it.track.type||'None')==='None'){
        const t=__poInferTrackingType(invRow)
        it.track.type=t||'None'
      }
    }catch{}
    if(stubEl)stubEl.textContent=(String(it&&it.item||'').trim()?'' : '*')
  }catch{}
}
function __poInferTrackingType(invRow){if(!invRow)return 'None';const lc=(s)=>String(s||'').trim().toLowerCase();const cands=['TrackingType','TrackType','Tracking','Track'];for(const k of cands){const v=invRow[k];if(v){const t=lc(v);if(t.startsWith('ser'))return 'Serial';if(t.startsWith('lot'))return 'Lot'}}return 'None'}
function __poIsNonStock(invRow){try{const lc=(s)=>String(s||'').trim().toLowerCase();const t=lc(invRow&&(invRow.Type||invRow.ItemType));if(!t)return false;return t.includes('non')||t.includes('service')}catch{return false}}
function __poInvRequiresExpiration(invRow){try{const lc=(s)=>String(s||'').trim().toLowerCase();const keys=['ExpirationRequired','Expire','Expiration','Expiry','ShelfLife','ShelfLifeDays'];for(const k of keys){const v=invRow&&invRow[k];if(v==null)continue;const s=lc(v);if(['y','yes','true','t','1'].includes(s))return true;const n=Number(v);if(!Number.isNaN(n)&&n>0)return true}return false}catch{return false}}
function __poNextNumber(){try{let width=6;const now=new Date();let scope='all';const reset='year';if(reset==='year')scope=String(now.getFullYear());else if(reset==='month')scope=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');const key='spuds.po.seq.'+scope;let last=0;try{const sv=localStorage.getItem(key);if(sv){const n=Number(sv);if(!isNaN(n))last=n}}catch{}if(!last){const nums=[];(__poRows||[]).forEach(r=>{let ok=true;if(reset!=='never'){const dv=pick(r,['Date','OrderDate']);const d=dv?new Date(dv):null;if(d&&d.toString()!=='Invalid Date'){if(reset==='year')ok=d.getFullYear()===now.getFullYear();else if(reset==='month')ok=d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}}if(!ok)return;const s=__extractPONumber(r);if(s){const n=Number(s.replace(/^0+/,''));if(!isNaN(n))nums.push({n,len:s.length})}});const max=nums.length?nums.reduce((a,b)=>a.n>b.n?a:b):{n:0,len:width};last=max.n;width=Math.max(width,max.len||width)}const next=last+1;try{localStorage.setItem(key,String(next))}catch{}return String(next).padStart(width,'0')}catch{return String(Date.now()).slice(-6)}}
function __poCreateNew(){try{const num=__poNextNumber();__poCurrentKey=num;if(!__poItemMap.has(num))__poItemMap.set(num,[{item:'',barcode:'',desc:'',vcode:'',qty:'0',price:'0.00',discount:'0.00',track:{type:'None',serials:[],lots:[]}}]);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val};['po-vendor','po-contact','po-phone','po-vendor-address','po-terms','po-vendor-order','po-location','po-forwarder','po-wb','po-date','po-status','po-shipto','po-due','po-remarks','po-tax','po-nonvendor','po-currency','po-subtotal','po-freight','po-total','po-paid','po-balance'].forEach(id=>set(id,''));const today=(new Date()).toISOString().slice(0,10);set('po-number',num);set('po-date',today);renderItems();__syncPOAdvancedFromMain();__wirePOAdvancedMirrors()}catch{}}
function __bindPONewButton(){try{const act=document.querySelector('#section-purchase-order .vendor-actions');if(!act)return;const btn=[...act.querySelectorAll('button')].find(b=>/^\s*New\s*$/i.test(b.textContent||''));if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',e=>{e.preventDefault();__poCreateNew()})}}catch{}}
function ensureTrack(it){if(!it.track)it.track={type:'None',serials:[],lots:[]}}
function qtyReceivedFromTrack(it){ensureTrack(it);if(it.track.type==='Serial'){return (it.track.serials||[]).length}else if(it.track.type==='Lot'){return (it.track.lots||[]).reduce((s,x)=>s+parseNum(x.qty),0)}return 0}
function updatePOReceiveTotals(){const items=__poItemMap.get(__poCurrentKey)||[];let recv=0;items.forEach(it=>{recv+=qtyReceivedFromTrack(it)});const el=document.getElementById('po-adv-q-received');if(el)el.textContent=String(recv)}
async function renderReceiveTrackingPanel(){const items=__poItemMap.get(__poCurrentKey)||[];const idx=__poSelectedIndex>=0?__poSelectedIndex:0;const it=items[idx];if(!it)return;ensureTrack(it);await __poEnsureInventory();try{if((it.track.type||'None')==='None'){const invRow=__poFindInvRowBy(it.item,it.barcode);const t=__poInferTrackingType(invRow);it.track.type=t||'None'}}catch{}const typeSel=document.getElementById('po-adv-track-type');const serialPanel=document.getElementById('po-adv-serial-panel');const lotPanel=document.getElementById('po-adv-lot-panel');if(typeSel){typeSel.value=it.track.type||'None';typeSel.onchange=()=>{it.track.type=typeSel.value;serialPanel.style.display=(it.track.type==='Serial')?'block':'none';lotPanel.style.display=(it.track.type==='Lot')?'block':'none';updatePOReceiveTotals()};serialPanel.style.display=(it.track.type==='Serial')?'block':'none';lotPanel.style.display=(it.track.type==='Lot')?'block':'none'}const sAdd=document.getElementById('po-adv-serial-add');const sDel=document.getElementById('po-adv-serial-del');const sScan=document.getElementById('po-adv-serial-scan');const sList=document.getElementById('po-adv-serial-list');const renderSerials=()=>{if(!sList)return;sList.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Serial'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');(it.track.serials||[]).forEach((sn,i)=>{const tr=document.createElement('tr');tr.dataset.index=String(i);const td=document.createElement('td');td.textContent=sn;tr.appendChild(td);tr.addEventListener('click',()=>{document.querySelectorAll('#po-adv-serial-list tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');sList.dataset.sel=String(i)});tbody.appendChild(tr)});table.appendChild(tbody);sList.appendChild(table)};if(sAdd)sAdd.onclick=()=>{const v=(sScan&&sScan.value||'').trim();if(v){if(!it.track.serials.includes(v))it.track.serials.push(v);sScan.value='';renderSerials();updatePOReceiveTotals()}};if(sScan)sScan.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sAdd&&sAdd.click()}});if(sDel)sDel.onclick=()=>{const sel=Number(sList&&sList.dataset.sel||'-1');if(sel>=0){it.track.serials.splice(sel,1);delete sList.dataset.sel;renderSerials();updatePOReceiveTotals()}};renderSerials();const lotTable=document.getElementById('po-adv-lot-table');const lotAdd=document.getElementById('po-adv-lot-add');const lotDel=document.getElementById('po-adv-lot-del');const lotFefo=document.getElementById('po-adv-lot-fefo');const fefoStatus=document.getElementById('po-adv-fefo');const renderLots=()=>{if(!lotTable)return;lotTable.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Lot','MFG Date','EXP Date','Qty (PU)','Selected'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');let expCount=0,soonCount=0;(it.track.lots||[]).forEach((x,i)=>{const tr=document.createElement('tr');tr.dataset.index=String(i);function tdInput(val,ph,cb,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=val||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{cb(inp.value);highlight()});td.appendChild(inp);return td}const highlight=()=>{try{const now=new Date();const soonMs=30*24*60*60*1000;const expDate=x.exp?new Date(x.exp):null;if(expDate instanceof Date&&!isNaN(expDate)){const diff=expDate.getTime()-now.getTime();if(diff<0){tr.style.background='#ffe6e6';expCount++}else if(diff<=soonMs){tr.style.background='#fff5e6';soonCount++}else{tr.style.background=''}}}catch{}};tr.appendChild(tdInput(x.lot||'','LOT',v=>{x.lot=v}));tr.appendChild(tdInput(x.mfg||'','YYYY-MM-DD',v=>{x.mfg=v},{type:'date'}));tr.appendChild(tdInput(x.exp||'','YYYY-MM-DD',v=>{x.exp=v;highlight()},{type:'date'}));tr.appendChild(tdInput(String(x.qty||'0'),'0',v=>{x.qty=v},{type:'number',min:'0',step:'1'}));const tdSel=document.createElement('td');tdSel.textContent='';tr.appendChild(tdSel);tr.addEventListener('click',()=>{document.querySelectorAll('#po-adv-lot-table tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');lotTable.dataset.sel=String(i)});highlight();tbody.appendChild(tr)});table.appendChild(tbody);lotTable.appendChild(table);fefoStatus.textContent=(expCount||soonCount)?(`Warnings — Expired: ${expCount}, Expiring soon (≤30d): ${soonCount}`):'';updatePOReceiveTotals()};if(lotAdd)lotAdd.onclick=()=>{it.track.lots.push({lot:'',mfg:'',exp:'',qty:'0'});renderLots()};if(lotDel)lotDel.onclick=()=>{const sel=Number(lotTable&&lotTable.dataset.sel||'-1');if(sel>=0){it.track.lots.splice(sel,1);delete lotTable.dataset.sel;renderLots()}};if(lotFefo)lotFefo.onclick=()=>{const lots=[...(it.track.lots||[])];lots.sort((a,b)=>{const da=a.exp?new Date(a.exp):null;const db=b.exp?new Date(b.exp):null;const na=da?da.getTime():Number.MAX_SAFE_INTEGER;const nb=db?db.getTime():Number.MAX_SAFE_INTEGER;return na-nb});const first=lots[0];fefoStatus.textContent=first&&first.exp?('Suggest pick oldest EXP: '+first.lot+' (exp '+first.exp+')'):'No EXP dates set';};renderLots()}
let __poLotObs=null;function __bindPOLotObserver(){try{const host=document.getElementById('po-adv-lot-table');if(!host){setTimeout(__bindPOLotObserver,300);return}if(__poLotObs){try{__poLotObs.disconnect()}catch{};__poLotObs=null}const attach=()=>{try{host.querySelectorAll('tbody tr').forEach(tr=>{if(tr.dataset.enforced)return;tr.dataset.enforced='1';const expInp=tr.querySelector('td:nth-child(3) input.inp');const qtyInp=tr.querySelector('td:nth-child(4) input.inp');const enforce=()=>{try{const items=__poItemMap.get(__poCurrentKey)||[];const idx=__poSelectedIndex>=0?__poSelectedIndex:0;const it=items[idx];const invRow=it?__poFindInvRowBy(it.item,it.barcode):null;const requireExp=invRow&&__poInvRequiresExpiration(invRow);const expVal=expInp&&expInp.value;const qtyVal=qtyInp&&qtyInp.value;const qv=qtyVal?Number(qtyVal):0;if(requireExp){const d=expVal?new Date(expVal):null;if(!(d instanceof Date)||isNaN(d)){if(qv>0){toast('Expiration date is required for this item.','warn');qtyInp.value='0';qtyInp.dispatchEvent(new Event('input',{bubbles:true}));return}}}if(!expVal)return;const expDate=new Date(expVal);if(!(expDate instanceof Date)||isNaN(expDate))return;const now=new Date();if(expDate.getTime()<now.getTime()){if(qv>0){const ok=confirm('Selected lot is past expiration. Keep the quantity anyway?');if(!ok){qtyInp.value='0';qtyInp.dispatchEvent(new Event('input',{bubbles:true}))}}}}catch{}};if(expInp)expInp.addEventListener('blur',enforce);if(qtyInp)qtyInp.addEventListener('blur',enforce);enforce()})}catch{}};__poLotObs=new MutationObserver(()=>attach());__poLotObs.observe(host,{childList:true,subtree:true});attach()}catch{}}
let __poSerialObs=null;function __bindPOSerialObserver(){try{const host=document.getElementById('po-adv-serial-panel');if(!host){setTimeout(__bindPOSerialObserver,300);return}if(__poSerialObs){try{__poSerialObs.disconnect()}catch{};__poSerialObs=null}const attach=()=>{try{const sAdd=document.getElementById('po-adv-serial-add');const sScan=document.getElementById('po-adv-serial-scan');if(!sAdd)return;sAdd.onclick=()=>{try{const items=__poItemMap.get(__poCurrentKey)||[];const idx=__poSelectedIndex>=0?__poSelectedIndex:0;const it=items[idx];if(!it)return;ensureTrack(it);const v=(sScan&&sScan.value||'').trim();if(!v)return;const exists=(it.track.serials||[]).some(s=>String(s||'').trim().toLowerCase()===v.toLowerCase());if(exists){toast('Duplicate serial: '+v,'warn');sScan.value='';return}const ordered=parseNum(it.qty);const current=(it.track.serials||[]).length;const will=current+1;if(ordered&&will>ordered){const ok=confirm('Serial count exceeds ordered quantity. Continue?');if(!ok){sScan.value='';return}}it.track.serials.push(v);sScan.value='';try{updatePOReceiveTotals()}catch{};const sList=document.getElementById('po-adv-serial-list');if(sList){sList.innerHTML=''}try{renderReceiveTrackingPanel()}catch{}}catch{}}}catch{}};__poSerialObs=new MutationObserver(()=>attach());__poSerialObs.observe(host,{childList:true,subtree:true});attach()}catch{}}
function __poNumberExists(y,num){try{if(!num)return false;const year=String(y);return (__poRows||[]).some(r=>{const n=__extractPONumber(r);if(!n)return false;const dv=pick(r,['Date','OrderDate']);const d=dv?new Date(dv):null;const ry=(d&&d.toString()!=='Invalid Date')?String(d.getFullYear()):'';return n===num && ry===year})}catch{return false}}
function __bindPOSaveButton(){try{const act=document.querySelector('#section-purchase-order .vendor-actions');if(!act)return;const btn=[...act.querySelectorAll('button')].find(b=>/^\s*Save\s*$/i.test(b.textContent||''));if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',e=>{try{const numEl=document.getElementById('po-number');const dateEl=document.getElementById('po-date');const y=(dateEl&&dateEl.value)?(new Date(dateEl.value)).getFullYear():new Date().getFullYear();let num=(numEl&&numEl.value||'').trim();if(!num){num=__poNextNumber()}else{if(__poNumberExists(y,num)){const keep=confirm('Duplicate PO number exists this year. Keep anyway?');if(!keep){let candidate=num;let guard=0;do{candidate=__poNextNumber();guard++}while(__poNumberExists(y,candidate)&&guard<50);num=candidate}}}if(numEl)numEl.value=num;toast('PO number set to '+num,'success')}catch{}})}}catch{}}
function __bindPOCopyNumber(){try{const el=document.getElementById('po-number');if(!el||el.dataset.copybound)return;el.dataset.copybound='1';el.addEventListener('dblclick',async()=>{const s=el.value||'';try{await navigator.clipboard.writeText(s);el.title='Copied!';setTimeout(()=>{el.title=''},1000)}catch{try{el.select();document.execCommand('copy');el.blur();el.title='Copied!';setTimeout(()=>{el.title=''},1000)}catch{}}})}catch{}}

function __poGetVal(id){const el=document.getElementById(id);return el?(el.value||''):""}
let __poPrintOverlay=null
function __poShowPrintOverlay(html){
  try{
    if(!__poPrintOverlay){
      const overlay=document.createElement('div')
      overlay.style.position='fixed'
      overlay.style.inset='0'
      overlay.style.background='rgba(0,0,0,.55)'
      overlay.style.zIndex='99999'
      overlay.style.display='none'
      overlay.style.flexDirection='column'
      const bar=document.createElement('div')
      bar.style.display='flex'
      bar.style.gap='8px'
      bar.style.alignItems='center'
      bar.style.justifyContent='flex-end'
      bar.style.padding='10px 12px'
      bar.style.background='#f7f7f7'
      bar.style.borderBottom='1px solid #ddd'
      const btnPrint=document.createElement('button')
      btnPrint.className='btn'
      btnPrint.type='button'
      btnPrint.textContent='Print / Save as PDF'
      const btnClose=document.createElement('button')
      btnClose.className='btn'
      btnClose.type='button'
      btnClose.textContent='Close'
      bar.appendChild(btnPrint)
      bar.appendChild(btnClose)
      const frame=document.createElement('iframe')
      frame.style.border='0'
      frame.style.width='100%'
      frame.style.height='100%'
      frame.style.background='#fff'
      overlay.appendChild(bar)
      overlay.appendChild(frame)
      document.body.appendChild(overlay)
      btnClose.addEventListener('click',()=>{overlay.style.display='none'})
      btnPrint.addEventListener('click',()=>{
        try{frame.contentWindow&&frame.contentWindow.focus&&frame.contentWindow.focus()}catch{}
        try{frame.contentWindow&&frame.contentWindow.print&&frame.contentWindow.print()}catch{}
      })
      __poPrintOverlay={overlay,frame}
    }
    const {overlay,frame}=__poPrintOverlay
    overlay.style.display='flex'
    const doc=frame.contentDocument
    if(!doc)return
    doc.open()
    doc.write(html)
    doc.close()
  }catch{}
}

function __poPrintCurrent(opts){
  try{
    const autoPrint=!!(opts&&opts.autoPrint)
    const esc=(s)=>{try{if(typeof __escHtml==='function')return __escHtml(String(s==null?'':s));}catch{};return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
    const fmt=(n)=>{const x=Number(n);if(!isFinite(x))return '0.00';return x.toFixed(2)}
    let logoSrc=''
    try{logoSrc=localStorage.getItem('logoSrc')||''}catch{}
    if(!logoSrc){
      try{logoSrc=document.querySelector('.brand-logo[src]')?.getAttribute('src')||''}catch{}
    }
    const brand=(document.querySelector('.appbar-title')?.textContent||document.title||'IMS').trim()||'IMS'
    const vendor=__poGetVal('po-vendor').trim()
    const contact=__poGetVal('po-contact').trim()
    const phone=__poGetVal('po-phone').trim()
    const vendorAddr=__poGetVal('po-vendor-address').trim()
    const poNumber=__poGetVal('po-number').trim()
    const poDate=__poGetVal('po-date').trim()
    const status=__poGetVal('po-status').trim()
    const terms=__poGetVal('po-terms').trim()
    const vendorOrder=__poGetVal('po-vendor-order').trim()
    const location=__poGetVal('po-location').trim()
    const forwarder=__poGetVal('po-forwarder').trim()
    const wb=__poGetVal('po-wb').trim()
    const shipTo=__poGetVal('po-shipto').trim()
    const remarks=__poGetVal('po-remarks').trim()
    const taxScheme=__poGetVal('po-tax').trim()
    const currency=__poGetVal('po-currency').trim()
    const nonVendor=parseNum(__poGetVal('po-nonvendor'))
    const freight=parseNum(__poGetVal('po-freight'))
    const items=(__poItemMap.get(__poCurrentKey)||[]).filter(it=>{
      const hasText=String(it.item||'').trim()||String(it.desc||'').trim()||String(it.barcode||'').trim()||String(it.vcode||'').trim()
      const hasAmt=parseNum(it.qty)||parseNum(it.price)||parseNum(it.discount)
      return !!(hasText||hasAmt)
    })
    let subtotal=0
    let taxTotal=0
    const rows=items.map((it,i)=>{
      const code=String(it.item||'').trim()
      const desc=String(it.desc||'').trim()
      const uom=''
      const qty=parseNum(it.qty)
      const unit=parseNum(it.price)
      const disc=parseNum(it.discount)
      const lineSub=Math.max(0,(qty*unit)-disc)
      const lineTax=0
      const lineTotal=lineSub+lineTax
      subtotal+=lineSub
      taxTotal+=lineTax
      return `<tr>
        <td class="c">${i+1}</td>
        <td>${esc(code)}</td>
        <td>${esc(desc)}</td>
        <td class="c">${esc(uom)}</td>
        <td class="r">${fmt(qty)}</td>
        <td class="r">${fmt(unit)}</td>
        <td class="r">${fmt(disc)}</td>
        <td class="r">${fmt(lineTax)}</td>
        <td class="r">${fmt(lineTotal)}</td>
      </tr>`
    }).join('')
    const grand=subtotal+freight+nonVendor+taxTotal
    const html=`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PO ${esc(poNumber||'')}</title>
  <style>
    @page{size:Letter portrait;margin:0.5in}
    *{box-sizing:border-box}
    body{margin:0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;background:#9aa0a6}
    .no-print{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;border-bottom:1px solid #ddd;background:#f7f7f7}
    .btn{padding:6px 10px;border:1px solid #bbb;background:#fff;border-radius:6px;font:inherit;cursor:pointer}
    .sheet{background:#fff;max-width:8.5in;margin:18px auto;padding:0.5in;box-shadow:0 0 0 1px #e5e5e5,0 10px 30px rgba(0,0,0,.25)}
    .page{padding:0}
    .header{display:flex;justify-content:space-between;gap:12px;padding:0 0 10px 0;border-bottom:2px solid #111;margin-bottom:10px}
    .brand{display:flex;gap:12px;align-items:center}
    .logo{width:72px;height:72px;object-fit:contain}
    .brand-name{font-weight:700;font-size:16px;line-height:1.1}
    .doc{font-weight:800;font-size:18px;text-align:right}
    .meta{margin-top:4px;text-align:right}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .box{border:1px solid #bbb;padding:8px;border-radius:8px}
    .box h3{margin:0 0 6px 0;font-size:12px;letter-spacing:.02em;text-transform:uppercase}
    .row{display:flex;gap:8px;margin:2px 0}
    .k{min-width:105px;color:#444}
    .v{flex:1;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #999;padding:6px 6px;vertical-align:top}
    th{background:#efefef}
    .r{text-align:right}
    .c{text-align:center}
    .totals{display:grid;grid-template-columns:1fr 280px;gap:10px;margin-top:10px;align-items:start}
    .totals .sum table{width:100%}
    .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:18px}
    .sig .line{border-top:1px solid #111;padding-top:6px}
    .sig .cap{color:#444;margin-top:2px}
    @media print{
      body{background:#fff}
      .no-print{display:none}
      .sheet{margin:0;max-width:none;padding:0;box-shadow:none}
      .box{break-inside:avoid}
      table{break-inside:auto}
      tr{break-inside:avoid;break-after:auto}
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">Save as PDF</button>
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
  <div class="page">
    <div class="header">
      <div class="brand">
        ${logoSrc?`<img class="logo" src="${esc(logoSrc)}" alt="">`:''}
        <div>
          <div class="brand-name">${esc(brand)}</div>
          <div>${currency?esc(currency):''}</div>
        </div>
      </div>
      <div>
        <div class="doc">PURCHASE ORDER</div>
        <div class="meta">
          <div><b>PO No:</b> ${esc(poNumber)}</div>
          <div><b>Date:</b> ${esc(poDate)}</div>
          <div><b>Status:</b> ${esc(status)}</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <h3>Vendor</h3>
        <div class="row"><div class="k">Vendor</div><div class="v">${esc(vendor)}</div></div>
        <div class="row"><div class="k">Contact</div><div class="v">${esc(contact)}</div></div>
        <div class="row"><div class="k">Phone</div><div class="v">${esc(phone)}</div></div>
        <div class="row"><div class="k">Address</div><div class="v">${esc(vendorAddr)}</div></div>
      </div>
      <div class="box">
        <h3>Order Info</h3>
        <div class="row"><div class="k">Terms</div><div class="v">${esc(terms)}</div></div>
        <div class="row"><div class="k">Vendor Order #</div><div class="v">${esc(vendorOrder)}</div></div>
        <div class="row"><div class="k">Location</div><div class="v">${esc(location)}</div></div>
        <div class="row"><div class="k">Forwarder</div><div class="v">${esc(forwarder)}</div></div>
        <div class="row"><div class="k">WB#</div><div class="v">${esc(wb)}</div></div>
      </div>
    </div>

    <div class="box">
      <h3>Ship To</h3>
      <div class="v">${esc(shipTo)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px"></th>
          <th style="width:120px">Item Code</th>
          <th>Description</th>
          <th style="width:60px">UoM</th>
          <th style="width:72px">Qty</th>
          <th style="width:92px">Unit Cost</th>
          <th style="width:92px">Discount</th>
          <th style="width:92px">Tax</th>
          <th style="width:110px">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows||''}
      </tbody>
    </table>

    <div class="totals">
      <div class="box">
        <h3>Remarks</h3>
        <div class="v">${esc(remarks)}</div>
      </div>
      <div class="box sum">
        <h3>Totals</h3>
        <table>
          <tbody>
            <tr><td>Sub-Total</td><td class="r">${fmt(subtotal)}</td></tr>
            <tr><td>Freight</td><td class="r">${fmt(freight)}</td></tr>
            <tr><td>Non-Vendor Costs</td><td class="r">${fmt(nonVendor)}</td></tr>
            <tr><td>Tax</td><td class="r">${fmt(taxTotal)}</td></tr>
            <tr><td><b>Grand Total</b></td><td class="r"><b>${fmt(grand)}</b></td></tr>
          </tbody>
        </table>
        ${taxScheme?`<div style="margin-top:6px"><b>Taxing Scheme:</b> ${esc(taxScheme)}</div>`:''}
      </div>
    </div>

    <div class="sig">
      <div>
        <div class="line"></div>
        <div class="cap">Prepared by / Date</div>
      </div>
      <div>
        <div class="line"></div>
        <div class="cap">Approved by / Date</div>
      </div>
      <div>
        <div class="line"></div>
        <div class="cap">Received by / Date</div>
      </div>
    </div>
  </div>
  </div>
  ${autoPrint?`<script>window.addEventListener('load',()=>{setTimeout(()=>{try{window.print()}catch{}},250)})</script>`:''}
</body>
</html>`
    __poShowPrintOverlay(html)
  }catch(e){
    try{toast('Print failed: '+(e&&e.message||e),'warn')}catch{}
  }
}

function __bindPOPrintButton(){
  try{
    const btn=document.getElementById('po-print')||[...document.querySelectorAll('#section-purchase-order .vendor-actions button')].find(b=>/^\s*Print\s*$/i.test(b.textContent||''))
    if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',e=>{e.preventDefault();__poPrintCurrent({autoPrint:false})})}
  }catch{}
}

try{
  document.addEventListener('click',(e)=>{
    const t=e&&e.target
    if(!t||!t.closest)return
    const el=t.closest('#po-print')
    if(!el)return
    e.preventDefault()
    __poPrintCurrent({autoPrint:false})
  })
}catch{}

function __applyPOTrackingFromInventory(){try{const typeSel=document.getElementById('po-adv-track-type');const serialPanel=document.getElementById('po-adv-serial-panel');const lotPanel=document.getElementById('po-adv-lot-panel');if(!typeSel||!serialPanel||!lotPanel){setTimeout(__applyPOTrackingFromInventory,300);return}const items=__poItemMap.get(__poCurrentKey)||[];const idx=__poSelectedIndex>=0?__poSelectedIndex:0;const it=items[idx];if(!it){setTimeout(__applyPOTrackingFromInventory,300);return}ensureTrack(it);const invRow=__poFindInvRowBy(it.item,it.barcode);const isNS=__poIsNonStock(invRow);if(isNS){typeSel.value='None';typeSel.disabled=true;serialPanel.style.display='none';lotPanel.style.display='none';typeSel.title='Non-stock/service item — tracking disabled'}else{typeSel.disabled=false;typeSel.title='';const t=it.track.type||'None';typeSel.value=t;serialPanel.style.display=(t==='Serial')?'block':'none';lotPanel.style.display=(t==='Lot')?'block':'none'}}catch{}}
function renderPOAdvReturnItems(){const host=document.getElementById('po-adv-return-items');if(!host)return;const items=__poItemMap.get(__poCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Description','Barcode','Quantity','Unit Price','Discount','Sub-Total'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);let subtotal=0;const tbody=document.createElement('tbody');items.forEach(it=>{const tr=document.createElement('tr');const td1=document.createElement('td');td1.textContent=it.item||'';tr.appendChild(td1);const td2=document.createElement('td');td2.textContent=it.desc||'';tr.appendChild(td2);const tdB=document.createElement('td');tdB.textContent=it.barcode||'';tr.appendChild(tdB);const q=parseNum(it.qty);const p=parseNum(it.price);const d=parseNum(it.discount);const sub=Math.max(0,(q*p)-d);subtotal+=sub;const td3=document.createElement('td');td3.textContent=String(q);tr.appendChild(td3);const td4=document.createElement('td');td4.textContent=p.toFixed(2);tr.appendChild(td4);const td5=document.createElement('td');td5.textContent=d.toFixed(2);tr.appendChild(td5);const td6=document.createElement('td');td6.textContent=sub.toFixed(2);tr.appendChild(td6);tbody.appendChild(tr)});table.appendChild(tbody);host.appendChild(table);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val.toFixed(2)};set('po-adv-return-subtotal',subtotal);const feeEl=document.getElementById('po-adv-return-fee');const refundedEl=document.getElementById('po-adv-return-refunded');const fee=parseNum(feeEl&&feeEl.value);const refunded=parseNum(refundedEl&&refundedEl.value);const credit=Math.max(0,subtotal-fee-refunded);const credEl=document.getElementById('po-adv-return-credit');if(credEl)credEl.value=credit.toFixed(2)}
function bindPO(row,itemsFromDb){
  const map=['po-vendor','po-contact','po-phone','po-vendor-address','po-number','po-date','po-status','po-shipto','po-terms','po-due','po-req-ship','po-remarks','po-tax','po-nonvendor','po-currency','po-subtotal','po-freight','po-total','po-paid','po-balance']
  map.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)})
  try{
    const joinLines=(arr)=>arr.map(v=>String(v||'').trim()).filter(Boolean).join('\n').trim()
    const vendorAddr=joinLines([
      row.VendorAddress1,row.VendorAddress2,
      [row.VendorCity,row.VendorState,row.VendorPostalCode].map(v=>String(v||'').trim()).filter(Boolean).join(', '),
      row.VendorCountry,row.VendorAddressRemarks
    ])
    const shipToAddr=joinLines([
      row.ShipToCompanyName,row.ShipToAddress1,row.ShipToAddress2,
      [row.ShipToCity,row.ShipToState,row.ShipToPostalCode].map(v=>String(v||'').trim()).filter(Boolean).join(', '),
      row.ShipToCountry,row.ShipToAddressRemarks
    ])
    const vEl=document.getElementById('po-vendor-address');if(vEl&&vendorAddr)vEl.value=vendorAddr
    const sEl=document.getElementById('po-shipto');if(sEl&&shipToAddr)sEl.value=shipToAddr
  }catch{}
  __poAutofillVendorFields({force:false})
  const key=String(pick(row,['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo'])||'')
  __poCurrentKey=key||('__new__'+Date.now())
  if(Array.isArray(itemsFromDb)&&itemsFromDb.length){
    __poItemMap.set(__poCurrentKey,itemsFromDb)
  }else{
    if(!__poItemMap.has(__poCurrentKey))__poItemMap.set(__poCurrentKey,[])
  }
  renderItems()
  __syncPOAdvancedFromMain()
  __wirePOAdvancedMirrors()
  const freightEl=document.getElementById('po-freight')
  const paidEl=document.getElementById('po-paid')
  if(freightEl)freightEl.addEventListener('input',()=>{calcTotals(__poItemMap.get(__poCurrentKey)||[]);__syncPOAdvancedFromMain()})
  if(paidEl)paidEl.addEventListener('input',()=>{calcTotals(__poItemMap.get(__poCurrentKey)||[]);__syncPOAdvancedFromMain()})
}
async function initPurchaseOrderPage(){
  try{
    const sec=document.getElementById('section-purchase-order')
    if(sec && !sec.dataset.vendorAddBound){
      sec.dataset.vendorAddBound='1'
      const addBtn=document.getElementById('po-vendor-add')
      if(addBtn)addBtn.addEventListener('click',__poQuickAddVendor)
      const prodBtn=document.getElementById('po-product-add')
      if(prodBtn)prodBtn.addEventListener('click',__poQuickAddProduct)
    }
  }catch{}
  try{__poBindVendorAutofill()}catch{}
  try{__poEnsureVendorDatalistReady().catch(()=>{})}catch{}
  if(__poLoaded){
    try{__bindPOPrintButton()}catch{}
    try{__poBindVendorAutofill();await __poRefreshVendorDatalist()}catch{}
    try{await __refreshSharedDatalists()}catch{}
    filterPO()
    return
  }
  try{
    const list=document.getElementById('po-list');if(list)list.textContent='Loading...'
    const s=await fetch(api('/api/schema?table=purchase_order'));const sj=await s.json().catch(()=>({}));__poSchema=sj.schema||[]
    const d=await fetch(api('/api/data?table=purchase_order&limit=1000'));const dj=await d.json().catch(()=>({}));__poRows=dj.rows||[]
    __poLoaded=true
    ;['po-q-num'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',scheduleFilterPO)})
    const ref=document.getElementById('po-refresh');if(ref)ref.addEventListener('click',async()=>{__poLoaded=false;await initPurchaseOrderPage()})
    const statusSel=document.getElementById('po-q-status');const vendorSel=document.getElementById('po-q-vendor')
    if(statusSel){const set=new Set();__poRows.forEach(r=>{const v=String(pick(r,['Status','OrderStatus'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;statusSel.appendChild(opt)});statusSel.addEventListener('change',scheduleFilterPO)}
    if(vendorSel){const set=new Set();__poRows.forEach(r=>{const v=String(pick(r,['Vendor','VendorName','Supplier','Company','Name'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;vendorSel.appendChild(opt)});vendorSel.addEventListener('change',scheduleFilterPO)}
    document.querySelectorAll('#section-purchase-order .vendor-tabs.tabs-bottom .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-purchase-order .vendor-tabs.tabs-bottom .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-purchase-order .vendor-tabpanes>.tabpane').forEach(p=>p.classList.toggle('active',p.id==='po-tab-'+btn.dataset.tab))})})
    const advTabs=document.querySelectorAll('#po-adv-tabs .tab')
    if(advTabs&&advTabs.length){advTabs.forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#po-adv-tabs .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#po-adv-panes .tabpane').forEach(p=>p.classList.toggle('active',p.id==='po-adv-tab-'+btn.dataset.tab));renderPOAdvOrderItems();renderPOAdvReceiveItems();renderPOAdvReturnItems()})})}
    ;['po-q-from','po-q-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',scheduleFilterPO)})
    const tgl=document.getElementById('po-toggle-filters');const more=document.getElementById('po-more-filters')
    if(tgl&&more){tgl.addEventListener('click',()=>{more.classList.toggle('open');updatePOFilterChips()})}
    const addBtn=document.getElementById('po-item-add');const delBtn=document.getElementById('po-item-del')
    if(addBtn)addBtn.addEventListener('click',()=>{addItemRow();renderPOAdvOrderItems();renderPOAdvReceiveItems();renderPOAdvReturnItems()})
    if(delBtn)delBtn.addEventListener('click',()=>{deleteItemRow();renderPOAdvOrderItems();renderPOAdvReceiveItems();renderPOAdvReturnItems()})
    const receiveBtn=document.getElementById('po-receive-pay');const footer=document.getElementById('sticky-footer')
    if(receiveBtn&&footer){try{footer.innerHTML='';const left=document.createElement('div');left.className='foot-left';const right=document.createElement('div');right.className='foot-right';if(!document.getElementById('po-foot-tabs')){const footTabs=document.createElement('div');footTabs.id='po-foot-tabs';footTabs.className='foot-tabs';const bSimple=document.createElement('button');bSimple.className='tab active';bSimple.textContent='Simple';bSimple.dataset.tab='purchasing';const bAdv=document.createElement('button');bAdv.className='tab';bAdv.textContent='Advanced';bAdv.dataset.tab='advanced';const onClick=(btn)=>{document.querySelectorAll('#section-purchase-order .vendor-tabpanes>.tabpane').forEach(p=>p.classList.toggle('active',p.id==='po-tab-'+btn.dataset.tab));document.querySelectorAll('#section-purchase-order .vendor-tabs.tabs-bottom .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===btn.dataset.tab));bSimple.classList.toggle('active',btn===bSimple);bAdv.classList.toggle('active',btn===bAdv)};bSimple.addEventListener('click',()=>onClick(bSimple));bAdv.addEventListener('click',()=>onClick(bAdv));footTabs.appendChild(bSimple);footTabs.appendChild(bAdv);left.appendChild(footTabs);const bottomTabs=document.querySelector('#section-purchase-order .vendor-tabs.tabs-bottom');if(bottomTabs)bottomTabs.style.display='none'}right.appendChild(receiveBtn);footer.appendChild(left);footer.appendChild(right);footer.style.display='flex';setTimeout(()=>{document.getElementById('section-purchase-order').style.paddingBottom=(footer.offsetHeight+12)+'px';if(typeof __poFitToScreen==='function')__poFitToScreen()},0)}catch{}}
    const setDL=(id,values)=>{const dl=document.getElementById(id);if(!dl)return;dl.innerHTML='';[...values].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,200).forEach(v=>{const opt=document.createElement('option');opt.value=String(v);dl.appendChild(opt)})}
    const sTerms=new Set(),sTax=new Set(),sCurr=new Set()
    __poRows.forEach(r=>{const t=String(pick(r,['Terms','PaymentTerms'])||'').trim();if(t)sTerms.add(t);const tx=String(pick(r,['TaxingScheme','TaxCode','Tax'])||'').trim();if(tx)sTax.add(tx);const cu=String(pick(r,['Currency'])||'').trim();if(cu)sCurr.add(cu)})
    if(!sCurr.size){['Philippine Peso (Php)','US Dollar (USD)'].forEach(v=>sCurr.add(v))}
    setDL('po-terms-list',sTerms);setDL('po-tax-list',sTax);setDL('po-currency-list',sCurr)
    __poBindVendorAutofill()
    await __poRefreshVendorDatalist()
    try{await __refreshSharedDatalists()}catch{}
    __bindPOPrintButton()
    filterPO()
    try{
      const itemsHost=document.getElementById('po-items')
      if(itemsHost && !itemsHost.children.length)__poCreateNew()
    }catch{}
    renderPOAdvOrderItems()
    renderPOAdvReceiveItems()
    renderPOAdvReturnItems()
  }catch(e){
    const list=document.getElementById('po-list');if(list)list.textContent='Error: '+(e&&e.message||e)
  }
}

let __poAutoFit=false
function __poFitToScreen(){
  const foot=document.getElementById('sticky-footer');const fh=foot&&foot.offsetHeight?foot.offsetHeight:0;
  try{document.documentElement.style.setProperty('--footer-height',fh+'px')}catch{}
  const sect=document.getElementById('section-purchase-order');if(sect)sect.style.paddingBottom=(fh+12)+'px';
  const wrap=sect&&sect.querySelector('.vendor-wrap');
  if(wrap){wrap.style.transform='';wrap.style.height=''}
}
window.addEventListener('resize',__poFitToScreen)
try{setTimeout(ensurePOFooterSingleToggle,0)}catch{}
try{setTimeout(__bindPONewButton,0)}catch{}
try{setTimeout(__bindPOSaveButton,0)}catch{}
try{setTimeout(__bindPOPrintButton,0)}catch{}
try{setTimeout(__bindPOCopyNumber,0)}catch{}
try{setTimeout(__bindPOSerialObserver,0)}catch{}
try{setTimeout(__bindPOLotObserver,0)}catch{}
try{setTimeout(__applyPOTrackingFromInventory,0)}catch{}

// Sales Order page logic
let __soLoaded=false;let __soRows=[];let __soSchema=[];
let __soCustomerAutofillBound=false;
function __soLc(v){return String(v||'').trim().toLowerCase()}
function __soCustomerNameFromRow(r){return String(pick(r,['Name','Customer','Company'])||'').trim()}
function __soCustomerRowForName(name){
  const want=__soLc(name)
  if(!want)return null
  let row=(__customers||[]).find(r=>__soLc(__soCustomerNameFromRow(r))===want)||null
  if(row)return row
  row=(__customers||[]).find(r=>__soLc(__soCustomerNameFromRow(r)).startsWith(want))||null
  return row
}
function __soSetDL(id,values,limit){
  const dl=document.getElementById(id)
  if(!dl)return
  dl.innerHTML=''
  ;[...values].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,limit||500).forEach(v=>{
    const opt=document.createElement('option')
    opt.value=String(v)
    dl.appendChild(opt)
  })
}
async function __soEnsureCustomersForSO(){
  if(__customerLoaded && Array.isArray(__customers) && __customers.length)return
  try{
    const d=await fetch(api('/api/data?table=customer&limit=2000'))
    const dj=await d.json().catch(()=>({}))
    __customers=dj.rows||[]
    __customerLoaded=true
  }catch{}
}
async function __soRefreshCustomerDatalist(){
  await __soEnsureCustomersForSO()
  const set=new Set()
  ;(__customers||[]).forEach(r=>{const n=__soCustomerNameFromRow(r);if(n)set.add(n)})
  __soSetDL('so-customer-list',set,500)
}
async function __soAutofillCustomerFields(opts){
  const force=!!(opts&&opts.force)
  await __soEnsureCustomersForSO()
  const custEl=document.getElementById('so-customer')
  if(!custEl)return
  const name=custEl.value||''
  const row=__soCustomerRowForName(name)
  if(!row)return
  const canonical=__soCustomerNameFromRow(row)
  if(canonical && __soLc(canonical)===__soLc(name))custEl.value=canonical
  const fill=(id,keys)=>{
    const el=document.getElementById(id)
    if(!el)return
    if(!force && String(el.value||'').trim())return
    const v=pick(row,keys)
    if(v!=null && String(v).trim()!=='')el.value=String(v)
  }
  fill('so-contact',['Contact','ContactName','Attn'])
  fill('so-phone',['Phone','Telephone','Mobile'])
  fill('so-address',['Address','BusinessAddress','BillToAddress','BillingAddress','Address1'])
  fill('so-shipto',['ShipToAddress','ShipTo','ShippingAddress','ShipToAddr'])
  fill('so-terms',['PaymentTerms','Terms'])
  fill('so-tax',['TaxingScheme','TaxCode','Tax'])
  fill('so-currency',['Currency'])
  try{
    const want=String(custEl.value||'').trim()
    if(want){
      const needAddr=!!document.getElementById('so-address') && !String(document.getElementById('so-address')?.value||'').trim()
      const needShip=!!document.getElementById('so-shipto') && !String(document.getElementById('so-shipto')?.value||'').trim()
      if(needAddr||needShip){
        const r=await fetch(api('/api/customer/extended?name='+encodeURIComponent(want)))
        const j=await r.json().catch(()=>({}))
        const x=j&&j.extra||null
        if(x){
          if(needAddr){
            const v=String((x.BusinessAddress??x.Address??x.BillToAddress??'')||'')
            if(v.trim())document.getElementById('so-address').value=v
          }
          if(needShip){
            const v=String((x.ShipToAddress??x.ShipTo??'')||'')
            if(v.trim())document.getElementById('so-shipto').value=v
          }
          if(force || !String(document.getElementById('so-contact')?.value||'').trim()){const v=x.Contact!=null?String(x.Contact):'';if(v.trim())document.getElementById('so-contact').value=v}
          if(force || !String(document.getElementById('so-phone')?.value||'').trim()){const v=x.Phone!=null?String(x.Phone):'';if(v.trim())document.getElementById('so-phone').value=v}
          if(force || !String(document.getElementById('so-terms')?.value||'').trim()){const v=x.PaymentTerms!=null?String(x.PaymentTerms):'';if(v.trim())document.getElementById('so-terms').value=v}
          if(force || !String(document.getElementById('so-tax')?.value||'').trim()){const v=x.TaxingScheme!=null?String(x.TaxingScheme):'';if(v.trim())document.getElementById('so-tax').value=v}
          if(force || !String(document.getElementById('so-currency')?.value||'').trim()){const v=x.Currency!=null?String(x.Currency):'';if(v.trim())document.getElementById('so-currency').value=v}
        }
      }
    }
  }catch{}
}
function __soBindCustomerAutofill(){
  if(__soCustomerAutofillBound)return
  __soCustomerAutofillBound=true
  const custEl=document.getElementById('so-customer')
  if(!custEl)return
  custEl.addEventListener('change',()=>{__soAutofillCustomerFields({force:false})})
  custEl.addEventListener('blur',()=>{__soAutofillCustomerFields({force:false})})
  custEl.addEventListener('keydown',e=>{if(e.key==='Enter'){__soAutofillCustomerFields({force:false})}})
}
async function __soQuickAddCustomer(){
  const btn=document.getElementById('so-customer-add')
  const prev=btn?String(btn.textContent||'Add Customer'):'Add Customer'
  const nm=String(document.getElementById('so-customer')?.value||'').trim()
  if(!nm){toast('Enter a customer name first','warn');return}
  const address=String(document.getElementById('so-address')?.value||'')||null
  const shipTo=String(document.getElementById('so-shipto')?.value||'')||null
  const payload={name:nm,extra:{Address:address,BusinessAddress:address,ShipToAddress:shipTo,Contact:document.getElementById('so-contact')?.value||null,Phone:document.getElementById('so-phone')?.value||null,Currency:document.getElementById('so-currency')?.value||null,PaymentTerms:document.getElementById('so-terms')?.value||null,TaxingScheme:document.getElementById('so-tax')?.value||null}}
  if(btn){btn.disabled=true;btn.textContent='Saving...'}
  try{
    const r=await fetch(api('/api/customer/extended?name='+encodeURIComponent(nm)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok || (j&&j.ok===false&&j.error)){toast(String(j&&j.error||'Unable to save customer'),'error');return}
    toast('Customer saved','success')
    __customerLoaded=false
    await __soRefreshCustomerDatalist()
    await __soAutofillCustomerFields({force:true})
  }catch(e){
    toast(String(e&&e.message||e||'Save failed'),'error')
  }finally{
    if(btn){btn.disabled=false;btn.textContent=prev}
  }
}
async function __soQuickAddProduct(){
  const btn=document.getElementById('so-product-add')
  const prev=btn?String(btn.textContent||'Add Product'):'Add Product'
  const items=__soItemMap.get(__soCurrentKey)||[]
  const idx=(__soSelectedIndex>=0&&__soSelectedIndex<items.length)?__soSelectedIndex:0
  const it=items[idx]
  const name=String(it&&it.item||'').trim()
  if(!name){toast('Select an item (product name/code) first','warn');return}
  const rawPrice=(it&&it.price!=null)?Number(it.price):null
  const unitPrice=(rawPrice!=null && Number.isFinite(rawPrice))?rawPrice:null
  const payload={product:{Name:name,Description:(it&&it.desc?String(it.desc):null),UnitPrice:unitPrice}}
  if(btn){btn.disabled=true;btn.textContent='Saving...'}
  try{
    const r=await fetch(api('/api/product/derived?name='+encodeURIComponent(name)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok || (j&&j.ok===false&&j.error)){toast(String(j&&j.error||'Unable to save product'),'error');return}
    toast('Product saved','success')
    __invLoaded=false
    await __poEnsureInventory()
    try{await __refreshSharedDatalists()}catch{}
    try{await __soAutofillItemFromInventory(it,document.querySelector(`#so-items tbody tr[data-index="${idx}"]`))}catch{}
  }catch(e){
    toast(String(e&&e.message||e||'Save failed'),'error')
  }finally{
    if(btn){btn.disabled=false;btn.textContent=prev}
  }
}
let __soArchiveQuery=null;let __soArchiveRows=[];
const __soItemMap=new Map();let __soCurrentKey=null;let __soSelectedIndex=-1;
function __soGetVal(id){const el=document.getElementById(id);return el?(el.value||''):""}
function __soPrintCurrent(opts){
  try{
    const autoPrint=!!(opts&&opts.autoPrint)
    const esc=(s)=>{try{if(typeof __escHtml==='function')return __escHtml(String(s==null?'':s));}catch{};return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
    const fmt=(n)=>{const x=Number(n);if(!isFinite(x))return '0.00';return x.toFixed(2)}
    let logoSrc=''
    try{logoSrc=localStorage.getItem('logoSrc')||''}catch{}
    if(!logoSrc){
      try{logoSrc=document.querySelector('.brand-logo[src]')?.getAttribute('src')||''}catch{}
    }
    const brand=(document.querySelector('.appbar-title')?.textContent||document.title||'IMS').trim()||'IMS'
    const customer=__soGetVal('so-customer').trim()
    const contact=__soGetVal('so-contact').trim()
    const phone=__soGetVal('so-phone').trim()
    const address=__soGetVal('so-address').trim()
    const soNumber=__soGetVal('so-number').trim()
    const soDate=__soGetVal('so-date').trim()
    const status=__soGetVal('so-status').trim()
    const shipTo=__soGetVal('so-shipto').trim()
    const terms=__soGetVal('so-terms').trim()
    const due=__soGetVal('so-due').trim()
    const reqShip=__soGetVal('so-req-ship').trim()
    const remarks=__soGetVal('so-remarks').trim()
    const taxScheme=__soGetVal('so-tax').trim()
    const currency=__soGetVal('so-currency').trim()
    const items=(__soItemMap.get(__soCurrentKey)||[]).filter(it=>{
      const hasText=String(it.item||'').trim()||String(it.desc||'').trim()
      const hasAmt=parseNum(it.qty)||parseNum(it.price)||parseNum(it.discount)
      return !!(hasText||hasAmt)
    })
    let subtotal=0
    const rows=items.map((it,i)=>{
      const code=String(it.item||'').trim()
      const desc=String(it.desc||'').trim()
      const qty=parseNum(it.qty)
      const unit=parseNum(it.price)
      const disc=parseNum(it.discount)
      const lineSub=Math.max(0,(qty*unit)-disc)
      subtotal+=lineSub
      return `<tr>
        <td class="c">${i+1}</td>
        <td>${esc(code)}</td>
        <td>${esc(desc)}</td>
        <td class="r">${fmt(qty)}</td>
        <td class="r">${fmt(unit)}</td>
        <td class="r">${fmt(disc)}</td>
        <td class="r">${fmt(lineSub)}</td>
      </tr>`
    }).join('')
    const total=subtotal
    const paid=parseNum(__soGetVal('so-paid'))
    const balance=Math.max(0,total-paid)
    const html=`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SO ${esc(soNumber||'')}</title>
  <style>
    @page{size:Letter portrait;margin:0.5in}
    *{box-sizing:border-box}
    body{margin:0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;background:#9aa0a6}
    .no-print{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;border-bottom:1px solid #ddd;background:#f7f7f7}
    .btn{padding:6px 10px;border:1px solid #bbb;background:#fff;border-radius:6px;font:inherit;cursor:pointer}
    .sheet{background:#fff;max-width:8.5in;margin:18px auto;padding:0.5in;box-shadow:0 0 0 1px #e5e5e5,0 10px 30px rgba(0,0,0,.25)}
    .header{display:flex;justify-content:space-between;gap:12px;padding:0 0 10px 0;border-bottom:2px solid #111;margin-bottom:10px}
    .brand{display:flex;gap:12px;align-items:center}
    .logo{width:72px;height:72px;object-fit:contain}
    .brand-name{font-weight:700;font-size:16px;line-height:1.1}
    .doc{font-weight:800;font-size:18px;text-align:right}
    .meta{margin-top:4px;text-align:right}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .box{border:1px solid #bbb;padding:8px;border-radius:8px}
    .box h3{margin:0 0 6px 0;font-size:12px;letter-spacing:.02em;text-transform:uppercase}
    .row{display:flex;gap:8px;margin:2px 0}
    .k{min-width:105px;color:#444}
    .v{flex:1;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #999;padding:6px 6px;vertical-align:top}
    th{background:#efefef}
    .r{text-align:right}
    .c{text-align:center}
    .totals{display:grid;grid-template-columns:1fr 280px;gap:10px;margin-top:10px;align-items:start}
    .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:18px}
    .sig .line{border-top:1px solid #111;padding-top:6px}
    .sig .cap{color:#444;margin-top:2px}
    @media print{
      body{background:#fff}
      .no-print{display:none}
      .sheet{margin:0;max-width:none;padding:0;box-shadow:none}
      .box{break-inside:avoid}
      table{break-inside:auto}
      tr{break-inside:avoid;break-after:auto}
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">Save as PDF</button>
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        ${logoSrc?`<img class="logo" src="${esc(logoSrc)}" alt="">`:''}
        <div>
          <div class="brand-name">${esc(brand)}</div>
          <div>${currency?esc(currency):''}</div>
        </div>
      </div>
      <div>
        <div class="doc">SALES ORDER</div>
        <div class="meta">
          <div><b>SO No:</b> ${esc(soNumber)}</div>
          <div><b>Date:</b> ${esc(soDate)}</div>
          <div><b>Status:</b> ${esc(status)}</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <h3>Customer</h3>
        <div class="row"><div class="k">Customer</div><div class="v">${esc(customer)}</div></div>
        <div class="row"><div class="k">Contact</div><div class="v">${esc(contact)}</div></div>
        <div class="row"><div class="k">Phone</div><div class="v">${esc(phone)}</div></div>
        <div class="row"><div class="k">Address</div><div class="v">${esc(address)}</div></div>
      </div>
      <div class="box">
        <h3>Order Info</h3>
        <div class="row"><div class="k">Terms</div><div class="v">${esc(terms)}</div></div>
        <div class="row"><div class="k">Due Date</div><div class="v">${esc(due)}</div></div>
        <div class="row"><div class="k">Req. Ship</div><div class="v">${esc(reqShip)}</div></div>
        ${taxScheme?`<div class="row"><div class="k">Tax</div><div class="v">${esc(taxScheme)}</div></div>`:''}
      </div>
    </div>

    <div class="box">
      <h3>Ship To</h3>
      <div class="v">${esc(shipTo)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px"></th>
          <th style="width:140px">Item</th>
          <th>Description</th>
          <th style="width:72px">Qty</th>
          <th style="width:92px">Unit Price</th>
          <th style="width:92px">Discount</th>
          <th style="width:110px">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows||''}
      </tbody>
    </table>

    <div class="totals">
      <div class="box">
        <h3>Remarks</h3>
        <div class="v">${esc(remarks)}</div>
      </div>
      <div class="box">
        <h3>Totals</h3>
        <table>
          <tbody>
            <tr><td>Sub-Total</td><td class="r">${fmt(subtotal)}</td></tr>
            <tr><td>Total</td><td class="r">${fmt(total)}</td></tr>
            <tr><td>Paid</td><td class="r">${fmt(paid)}</td></tr>
            <tr><td><b>Balance</b></td><td class="r"><b>${fmt(balance)}</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="sig">
      <div>
        <div class="line"></div>
        <div class="cap">Prepared by / Date</div>
      </div>
      <div>
        <div class="line"></div>
        <div class="cap">Approved by / Date</div>
      </div>
      <div>
        <div class="line"></div>
        <div class="cap">Received by / Date</div>
      </div>
    </div>
  </div>
  ${autoPrint?`<script>window.addEventListener('load',()=>{setTimeout(()=>{try{window.print()}catch{}},250)})</script>`:''}
</body>
</html>`
    try{__poShowPrintOverlay(html)}catch{}
  }catch(e){
    try{toast('Print failed: '+(e&&e.message||e),'warn')}catch{}
  }
}
function __bindSOPrintButton(){
  try{
    const btn=document.getElementById('so-print')||[...document.querySelectorAll('#section-sales-order .vendor-actions button')].find(b=>/^\s*Print\s*$/i.test(b.textContent||''))
    if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',e=>{e.preventDefault();__soPrintCurrent({autoPrint:false})})}
  }catch{}
}
try{
  document.addEventListener('click',(e)=>{
    const t=e&&e.target
    if(!t||!t.closest)return
    const el=t.closest('#so-print')
    if(!el)return
    e.preventDefault()
    __soPrintCurrent({autoPrint:false})
  })
}catch{}
function renderSOList(items){const list=document.getElementById('so-list');const count=document.getElementById('so-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No orders';if(count)count.textContent='0';return}const keyNames=['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo'];items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';const n=String(pick(row,keyNames)||'(no number)');const s=String(pick(row,['Status'])||'');div.textContent=n+(s?(' — '+s):'');div.addEventListener('click',()=>{document.querySelectorAll('#so-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindSO(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindSO(row)}});if(count)count.textContent=String(items.length)}
function filterSO(){
  const qn=(document.getElementById('so-q-num')?.value||'').toLowerCase()
  const qs=(document.getElementById('so-q-status')?.value||'').toLowerCase()
  const qc=(document.getElementById('so-q-customer')?.value||'').toLowerCase()
  const qf=(document.getElementById('so-q-from')?.value||'').trim()
  const qt=(document.getElementById('so-q-to')?.value||'').trim()
  const from=qf?new Date(qf):null
  const to=qt?new Date(qt):null
  const matches=(r)=>{
    const num=(String(pick(r,['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo']))).toLowerCase()
    const stat=(String(pick(r,['Status']))).toLowerCase()
    const cust=(String(pick(r,['Customer','CustomerName','Company','Name']))).toLowerCase()
    let pass=(!qn||num.includes(qn))&&(!qs||stat===qs)&&(!qc||cust===qc)
    if(pass&&(from||to)){
      const dv=pick(r,['Date','OrderDate'])
      const d=dv?new Date(dv):null
      if(d&&d.toString()!=='Invalid Date'){
        if(from&&d<from)pass=false
        if(to){
          const td=new Date(to)
          td.setHours(23,59,59,999)
          if(d>td)pass=false
        }
      }
    }
    return pass
  }
  const items=__soRows.filter(matches)
  if(!items.length&&qn){
    if(__soArchiveQuery===qn){
      const a=(__soArchiveRows||[]).filter(matches)
      if(a.length){renderSOList(a);return}
    }else{
      __soArchiveQuery=qn
      __soArchiveRows=[]
      const list=document.getElementById('so-list');if(list)list.textContent='Searching archive...'
      const count=document.getElementById('so-count');if(count)count.textContent='0'
      fetchArchiveOrders('sales',qn).then(rows=>{if(__soArchiveQuery===qn){__soArchiveRows=rows||[];filterSO()}})
      return
    }
  }
  renderSOList(items)
}
function calcSOTotals(items){let subtotal=0;items.forEach(it=>{const qty=parseNum(it.qty);const price=parseNum(it.price);const disc=parseNum(it.discount);subtotal+=Math.max(0,(qty*price)-disc)});const total=subtotal;const paid=parseNum(document.getElementById('so-paid')&&document.getElementById('so-paid').value);const balance=Math.max(0,total-paid);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val.toFixed(2)};set('so-subtotal',subtotal);set('so-total',total);set('so-balance',balance)}
async function __soAutofillItemFromInventory(it,tr){
  try{
    await __poEnsureInventory()
    const invRow=__poFindInvRowBy(it&&it.item,'')
    if(!invRow)return
    if(it && (!it.desc || !String(it.desc).trim())){
      const d=pick(invRow,['Description','ItemDescription','Desc'])
      if(d!=null && String(d).trim()!==''){
        it.desc=String(d)
        const inputs=tr&&tr.querySelectorAll?tr.querySelectorAll('input.inp'):[]
        if(inputs&&inputs[1])inputs[1].value=it.desc
      }
    }
  }catch{}
}
function renderSOItems(){const host=document.getElementById('so-items');if(!host)return;const items=__soItemMap.get(__soCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Description','Quantity','Unit Price','Discount','Sub-Total'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach((it,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function cellInput(value,placeholder,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(placeholder)inp.placeholder=placeholder;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value)});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next){next.focus()}else{addSOItemRow()}}});td.appendChild(inp);return td}
  const tdItem=cellInput(it.item,'Item',v=>{it.item=v});tr.appendChild(tdItem)
  const tdDesc=cellInput(it.desc,'Description',v=>{it.desc=v});tr.appendChild(tdDesc)
  tr.appendChild(cellInput(it.qty,'0',v=>{it.qty=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'1',min:'0'}))
  tr.appendChild(cellInput(it.price,'0.00',v=>{it.price=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(cellInput(it.discount,'0.00',v=>{it.discount=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  const tdSub=document.createElement('td');tdSub.textContent=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount)).toFixed(2);tdSub.className='so-row-subtotal';tr.appendChild(tdSub)
  try{
    const itemInp=tdItem&&tdItem.querySelector('input.inp')
    if(itemInp){
      itemInp.setAttribute('list','dl-items')
      itemInp.addEventListener('change',()=>{__soAutofillItemFromInventory(it,tr)})
      itemInp.addEventListener('blur',()=>{__soAutofillItemFromInventory(it,tr)})
    }
  }catch{}
  tr.addEventListener('click',()=>{document.querySelectorAll('#so-items tbody tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');__soSelectedIndex=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table);calcSOTotals(items)}
function updateSORowSubtotal(tr,idx){const items=__soItemMap.get(__soCurrentKey)||[];const it=items[idx];const sub=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount));const td=tr.querySelector('.so-row-subtotal');if(td)td.textContent=sub.toFixed(2);calcSOTotals(items)}
function addSOItemRow(){const items=__soItemMap.get(__soCurrentKey)||[];items.push({item:'',desc:'',qty:'0',price:'0.00',discount:'0.00'});__soItemMap.set(__soCurrentKey,items);renderSOItems();const last=document.querySelector('#so-items tbody tr:last-child input');if(last)last.focus()}
function deleteSOItemRow(){const items=__soItemMap.get(__soCurrentKey)||[];if(__soSelectedIndex>=0&&__soSelectedIndex<items.length){items.splice(__soSelectedIndex,1);__soSelectedIndex=-1;renderSOItems()}}
function bindSO(row){
  const map=['so-customer','so-contact','so-phone','so-address','so-number','so-date','so-status','so-shipto','so-terms','so-due','so-req-ship','so-remarks','so-tax','so-currency','so-subtotal','so-total','so-paid','so-balance']
  map.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)})
  __soAutofillCustomerFields({force:false})
  const key=String(pick(row,['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo'])||'')
  __soCurrentKey=key||('__new__'+Date.now())
  if(!__soItemMap.has(__soCurrentKey))__soItemMap.set(__soCurrentKey,[])
  renderSOItems()
  const paidEl=document.getElementById('so-paid')
  if(paidEl)paidEl.addEventListener('input',()=>calcSOTotals(__soItemMap.get(__soCurrentKey)||[]))
}
async function initSalesOrderPage(){
  try{
    const sec=document.getElementById('section-sales-order')
    if(sec && !sec.dataset.quickAddBound){
      sec.dataset.quickAddBound='1'
      const cbtn=document.getElementById('so-customer-add')
      if(cbtn)cbtn.addEventListener('click',__soQuickAddCustomer)
      const pbtn=document.getElementById('so-product-add')
      if(pbtn)pbtn.addEventListener('click',__soQuickAddProduct)
    }
  }catch{}
  if(__soLoaded){
    __bindSOPrintButton()
    try{__soBindCustomerAutofill();await __soRefreshCustomerDatalist()}catch{}
    try{await __refreshSharedDatalists()}catch{}
    filterSO()
    return
  }
  try{
    const s=await fetch(api('/api/schema?table=sales_order'));const sj=await s.json().catch(()=>({}));__soSchema=sj.schema||[]
    const d=await fetch(api('/api/data?table=sales_order&limit=1000'));const dj=await d.json().catch(()=>({}));__soRows=dj.rows||[]
    __soLoaded=true
    ;['so-q-num'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterSO)})
    const ref=document.getElementById('so-refresh');if(ref)ref.addEventListener('click',async()=>{__soLoaded=false;await initSalesOrderPage()})
    const statusSel=document.getElementById('so-q-status');const custSel=document.getElementById('so-q-customer')
    if(statusSel){const set=new Set();__soRows.forEach(r=>{const v=String(pick(r,['Status'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;statusSel.appendChild(opt)});statusSel.addEventListener('change',filterSO)}
    if(custSel){const set=new Set();__soRows.forEach(r=>{const v=String(pick(r,['Customer','CustomerName','Company','Name'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;custSel.appendChild(opt)});custSel.addEventListener('change',filterSO)}
    document.querySelectorAll('#section-sales-order .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-sales-order .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-sales-order .tabpane').forEach(p=>p.classList.toggle('active',p.id==='so-tab-'+btn.dataset.tab))})})
    ;['so-q-from','so-q-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',filterSO)})
    const addBtn=document.getElementById('so-item-add');const delBtn=document.getElementById('so-item-del')
    if(addBtn)addBtn.addEventListener('click',addSOItemRow)
    if(delBtn)delBtn.addEventListener('click',deleteSOItemRow)
    __soBindCustomerAutofill()
    await __soRefreshCustomerDatalist()
    try{await __refreshSharedDatalists()}catch{}
    __bindSOPrintButton()
    filterSO()
  }catch(e){
    const list=document.getElementById('so-list');if(list)list.textContent='Error: '+(e&&e.message||e)
  }
}
function renderVendorList(items){
  const list=document.getElementById('vendor-list');const count=document.getElementById('vendor-count');if(!list)return;
  list.innerHTML='';if(!items.length){list.textContent='No vendors';if(count)count.textContent='0';return}
  const nameKeys=['Name','Vendor','Company'];
  items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';div.textContent=String(pick(row,nameKeys)||'(unnamed)');div.addEventListener('click',()=>{document.querySelectorAll('.vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindVendor(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindVendor(row)}})
  if(count)count.textContent=String(items.length)
}
function filterVendors(){
  const qn=(document.getElementById('vendor-q-name')?.value||'').toLowerCase();
  const qc=(document.getElementById('vendor-q-contact')?.value||'').toLowerCase();
  const qp=(document.getElementById('vendor-q-phone')?.value||'').toLowerCase();
  const items=__vendors.filter(r=>{
    const name=(String(pick(r,['Name','Vendor','Company']))).toLowerCase();
    const contact=(String(pick(r,['Contact','ContactName','Attn']))).toLowerCase();
    const phone=(String(pick(r,['Phone','Telephone','Mobile']))).toLowerCase();
    return (!qn||name.includes(qn)) && (!qc||contact.includes(qc)) && (!qp||phone.includes(qp));
  });
  renderVendorList(items);
}
async function initVendorPage(){
  const sec=document.getElementById('section-vendor')
  if(sec&&!sec.dataset.tabsBound){
    sec.dataset.tabsBound='1'
    document.querySelectorAll('#section-vendor .tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('#section-vendor .tab').forEach(b=>b.classList.toggle('active',b===btn));
        document.querySelectorAll('#section-vendor .tabpane').forEach(p=>p.classList.toggle('active',p.id==='vendor-tab-'+btn.dataset.tab));
      })
    })
  }
  const stmt=document.getElementById('vendor-statement')
  if(stmt&&!stmt.dataset.bound){
    stmt.dataset.bound='1'
    stmt.addEventListener('click',()=>openStatementOfAccount('vendor',document.getElementById('v-name')?.value||''))
  }
  if(sec&&!sec.dataset.filtersBound){
    sec.dataset.filtersBound='1'
    ;['vendor-q-name','vendor-q-contact','vendor-q-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterVendors)})
    const ref=document.getElementById('vendor-refresh');if(ref)ref.addEventListener('click',async()=>{__vendorLoaded=false;await initVendorPage()})
    const imp=document.getElementById('vendor-import');if(imp)imp.addEventListener('click',async()=>{imp.disabled=true;imp.textContent='Importing...';try{const r=await fetch(api('/api/vendors/import-from-po'),{method:'POST'});const j=await r.json().catch(()=>({}));imp.textContent=r.ok?('Imported '+(j.added||0)):('Import Error');__vendorLoaded=false;await initVendorPage()}finally{imp.disabled=false;imp.textContent='Import From PO'}})
  }
  if(__vendorLoaded){try{__refreshSharedDatalists()}catch{}filterVendors();return}
  try{
    // prefer derived table, fall back to view
    let source='vendor_derived';
    let s=await fetch(api('/api/schema?table='+source));let sj=await s.json().catch(()=>({}));
    if(!s.ok || !(sj.schema||[]).length){ source='vendor'; s=await fetch(api('/api/schema?table='+source)); sj=await s.json().catch(()=>({})) }
    __vendorSchema=sj.schema||[];
    let d=await fetch(api('/api/data?table='+source+'&limit=1000'));let dj=await d.json().catch(()=>({}));
    __vendors=dj.rows||[];
    __vendorSource=source;
    __vendorLoaded=true;
    try{__refreshSharedDatalists()}catch{}
    const setDL=(id,values)=>{const dl=document.getElementById(id);if(!dl)return;dl.innerHTML='';[...values].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,200).forEach(v=>{const opt=document.createElement('option');opt.value=String(v);dl.appendChild(opt)})}
    const sTerms=new Set(),sTax=new Set(),sCarrier=new Set(),sCurr=new Set();
    __vendors.forEach(r=>{const t=String(pick(r,['PaymentTerms','Terms'])||'').trim();if(t)sTerms.add(t);const tx=String(pick(r,['TaxingScheme','TaxCode'])||'').trim();if(tx)sTax.add(tx);const c=String(pick(r,['Carrier','ShippingCarrier'])||'').trim();if(c)sCarrier.add(c);const cu=String(pick(r,['Currency'])||'').trim();if(cu)sCurr.add(cu)});
    if(!sCurr.size){['Philippine Peso (Php)','US Dollar (USD)'].forEach(v=>sCurr.add(v))}
    setDL('v-terms-list',sTerms);setDL('v-tax-list',sTax);setDL('v-carrier-list',sCarrier);setDL('v-currency-list',sCurr);
    filterVendors();
  }catch(e){
    const list=document.getElementById('vendor-list');if(list)list.textContent='Error: '+(e&&e.message||e)
  }
}
// Inventory page logic
let __invLoaded=false;let __invRows=[];let __invSchema=[];
const __invLocMap=new Map();let __invCurrentKey=null;let __invSelectedIndex=-1;
const __invBOMMap=new Map();let __invBOMSel=-1;
const __invVendorsMap=new Map();let __invVendorSel=-1;
const __invTrackMap=new Map();let __invTrackSel=-1;let __invScanMode=false;
function renderInvList(items){const list=document.getElementById('inv-list');const count=document.getElementById('inv-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No items';if(count)count.textContent='0';return}const kItem=['Name','ItemName','Item','Code','ItemCode','SKU'];const kCat=['Category'];items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';const item=String(pick(row,kItem)||'(unnamed)');const cat=String(pick(row,kCat)||'');div.textContent=(cat?cat+' — ':'')+item;div.addEventListener('click',()=>{document.querySelectorAll('#inv-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindInventory(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindInventory(row)}});if(count)count.textContent=String(items.length)}
function filterInventory(){const qc=(document.getElementById('inv-q-code')?.value||'').toLowerCase();const qd=(document.getElementById('inv-q-desc')?.value||'').toLowerCase();const qcat=(document.getElementById('inv-q-cat')?.value||'').toLowerCase();const items=__invRows.filter(r=>{const name=(String(pick(r,['Name','ItemName','Item','Code','ItemCode','SKU']))).toLowerCase();const desc=(String(pick(r,['Description','ItemDescription']))).toLowerCase();const cat=(String(pick(r,['Category']))).toLowerCase();return (!qc||name.includes(qc))&&(!qd||desc.includes(qd))&&(!qcat||cat.includes(qcat))});renderInvList(items)}
function bindInventory(row){const ids=['inv-name','inv-category','inv-type','inv-description','inv-tax-code','inv-cash','inv-account','inv-check','inv-cost-method','inv-barcode','inv-reorder-point','inv-reorder-qty','inv-default-loc','inv-default-subloc','inv-last-vendor','inv-uom-std','inv-uom-sales','inv-uom-purch','inv-remarks','inv-len','inv-wid','inv-hei','inv-wei'];ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);if(el.tagName==='SELECT'){const v=pick(row,cols);if(v){[...el.options].forEach(o=>{o.selected=(o.textContent.toLowerCase()===String(v).toLowerCase())})}}else{el.value=pick(row,cols)}});const tsel=document.getElementById('inv-tracking-type');if(tsel){const cand=String(pick(row,['TrackingType','TrackType','Tracking','Track'])||'None');let val='None';const lc=cand.toLowerCase();if(lc.startsWith('ser'))val='Serial';else if(lc.startsWith('lot'))val='Lot';[...tsel.options].forEach(o=>{o.selected=(o.textContent===val)});}const kv=document.getElementById('inv-info');if(kv){kv.innerHTML='';Object.keys(row||{}).forEach(k=>{const kEl=document.createElement('div');kEl.className='k';kEl.textContent=k;const vEl=document.createElement('div');vEl.className='v';vEl.textContent=String(row[k]??'');kv.appendChild(kEl);kv.appendChild(vEl)})};const key=String(pick(row,['Code','ItemCode','SKU','Name','ItemName','Item'])||'');__invCurrentKey=key||('__new__'+Date.now());if(!__invLocMap.has(__invCurrentKey))__invLocMap.set(__invCurrentKey,[{location:'Default Location',sublocation:'',qty:'0'}]);if(!__invBOMMap.has(__invCurrentKey))__invBOMMap.set(__invCurrentKey,[]);if(!__invVendorsMap.has(__invCurrentKey))__invVendorsMap.set(__invCurrentKey,[]);if(!__invTrackMap.has(__invCurrentKey))__invTrackMap.set(__invCurrentKey,[]);renderInvLocations();renderInvBOM();renderInvVendors();renderInvTracking();renderInvMovement();renderInvOrders();loadInventoryPicture();loadInvExtended()}
function invNum(v){if(v==null||v==='')return 0;const n=Number(String(v).replace(/[^0-9.+-]/g,''));return isNaN(n)?0:n}
async function __invAutofillBOMRow(r,tr){
  try{
    if(!r || !String(r.item||'').trim())return
    if(r.desc && String(r.desc).trim())return
    await __poEnsureInventory()
    const invRow=__poFindInvRowBy(r.item,'')
    if(!invRow)return
    const d=pick(invRow,['Description','ItemDescription','Desc'])
    if(d!=null && String(d).trim()!==''){
      r.desc=String(d)
      const inputs=tr&&tr.querySelectorAll?tr.querySelectorAll('input.inp'):[]
      if(inputs&&inputs[1])inputs[1].value=r.desc
    }
  }catch{}
}
function renderInvBOM(){const host=document.getElementById('inv-bom');if(!host)return;const rows=__invBOMMap.get(__invCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Component Item','Description','Quantity','Cost'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value);calcInvBOMTotal()});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvBOMRow()}});td.appendChild(inp);return td}
  const tdItem=tdInput(r.item,'Item',v=>{r.item=v});tr.appendChild(tdItem)
  const tdDesc=tdInput(r.desc,'Description',v=>{r.desc=v});tr.appendChild(tdDesc)
  tr.appendChild(tdInput(r.qty,'0',v=>{r.qty=v},{type:'number',step:'1',min:'0'}))
  tr.appendChild(tdInput(r.cost,'0.00',v=>{r.cost=v},{type:'number',step:'0.01',min:'0'}))
  try{
    const itemInp=tdItem&&tdItem.querySelector('input.inp')
    if(itemInp){
      itemInp.setAttribute('list','dl-items')
      itemInp.addEventListener('change',()=>{__invAutofillBOMRow(r,tr)})
      itemInp.addEventListener('blur',()=>{__invAutofillBOMRow(r,tr)})
    }
  }catch{}
  tr.addEventListener('click',()=>{document.querySelectorAll('#inv-bom tbody tr').forEach(rr=>rr.classList.remove('active'));tr.classList.add('active');__invBOMSel=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table);calcInvBOMTotal()}
function calcInvBOMTotal(){const rows=__invBOMMap.get(__invCurrentKey)||[];let total=0;rows.forEach(r=>{total+=invNum(r.qty)*invNum(r.cost)});const el=document.getElementById('inv-bom-total');if(el)el.value=total.toFixed(2)}
function addInvBOMRow(){const rows=__invBOMMap.get(__invCurrentKey)||[];rows.push({item:'',desc:'',qty:'0',cost:'0.00'});__invBOMMap.set(__invCurrentKey,rows);renderInvBOM();const last=document.querySelector('#inv-bom tbody tr:last-child input');if(last)last.focus()}
function delInvBOMRow(){const rows=__invBOMMap.get(__invCurrentKey)||[];if(__invBOMSel>=0&&__invBOMSel<rows.length){rows.splice(__invBOMSel,1);__invBOMSel=-1;renderInvBOM()}}
function renderInvVendors(){const host=document.getElementById('inv-vendors');if(!host)return;const rows=__invVendorsMap.get(__invCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Vendor','Vendor\'s Price','Vendor Product Code'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>onchange(inp.value));inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvVendorRow()}});td.appendChild(inp);return td}
  const tdVendor=tdInput(r.vendor,'Vendor',v=>{r.vendor=v});tr.appendChild(tdVendor)
  tr.appendChild(tdInput(r.price,'0.00',v=>{r.price=v},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(tdInput(r.code,'Code',v=>{r.code=v}))
  try{
    const venInp=tdVendor&&tdVendor.querySelector('input.inp')
    if(venInp)venInp.setAttribute('list','dl-vendors')
  }catch{}
  tr.addEventListener('click',()=>{document.querySelectorAll('#inv-vendors tbody tr').forEach(rr=>rr.classList.remove('active'));tr.classList.add('active');__invVendorSel=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table)}
function addInvVendorRow(){const rows=__invVendorsMap.get(__invCurrentKey)||[];rows.push({vendor:'',price:'0.00',code:''});__invVendorsMap.set(__invCurrentKey,rows);renderInvVendors();const last=document.querySelector('#inv-vendors tbody tr:last-child input');if(last)last.focus()}
function delInvVendorRow(){const rows=__invVendorsMap.get(__invCurrentKey)||[];if(__invVendorSel>=0&&__invVendorSel<rows.length){rows.splice(__invVendorSel,1);__invVendorSel=-1;renderInvVendors()}}
function currentTrackingType(){const el=document.getElementById('inv-tracking-type');return (el&&el.value)||'None'}
function renderInvTracking(){const host=document.getElementById('inv-tracking');if(!host)return;const addBtn=document.getElementById('inv-track-add');const delBtn=document.getElementById('inv-track-del');const scanBtn=document.getElementById('inv-track-scan');const scanInp=document.getElementById('inv-track-scan-input');const rows=__invTrackMap.get(__invCurrentKey)||[];host.innerHTML='';const ttype=(currentTrackingType()||'').toLowerCase();if(!ttype||ttype==='none'){if(addBtn)addBtn.disabled=true;if(delBtn)addBtn.disabled=true;if(scanBtn)scanBtn.disabled=true;if(scanInp){scanInp.style.display='none';scanInp.value=''}const div=document.createElement('div');div.className='status';div.textContent='Tracking disabled';host.appendChild(div);return}else{if(addBtn)addBtn.disabled=false;if(delBtn)delBtn.disabled=false;if(scanBtn)scanBtn.disabled=false;if(scanInp)scanInp.style.display=__invScanMode?'block':'none'}const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');const headers=(ttype==='serial'?['Serial Number','Expiration Date','Location','Sublocation','Quantity']:['Lot Number','Expiration Date','Location','Sublocation','Quantity']);headers.forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');const now=new Date();const soonMs=30*24*60*60*1000;rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value);highlightTrackingIssues()});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvTrackRow()}});td.appendChild(inp);return td}if(ttype==='serial'){tr.appendChild(tdInput(r.serial,'Serial',v=>{r.serial=v}))}else{tr.appendChild(tdInput(r.lot,'Lot',v=>{r.lot=v}))}const expTd=tdInput(r.expiration,'YYYY-MM-DD',v=>{r.expiration=v},{type:'date'});if(r.expiration){const d=new Date(r.expiration+'T00:00:00');if(!isNaN(d)){const diff=d-now;if(diff<0){expTd.firstChild.style.backgroundColor='#ffe6e6'}else if(diff<=soonMs){expTd.firstChild.style.backgroundColor='#fff5cc'}}}tr.appendChild(expTd);tr.appendChild(tdInput(r.location,'Location',v=>{r.location=v}));tr.appendChild(tdInput(r.sublocation,'Sublocation',v=>{r.sublocation=v}));const qtyOpts={type:'number',step:'1',min:'0'};if(ttype==='serial'){r.qty='1';qtyOpts.readOnly=true}tr.appendChild(tdInput(r.qty,'0',v=>{r.qty=v},qtyOpts));tr.addEventListener('click',()=>{document.querySelectorAll('#inv-tracking tbody tr').forEach(rr=>rr.classList.remove('active'));tr.classList.add('active');__invTrackSel=idx});tbody.appendChild(tr)});table.appendChild(tbody);host.appendChild(table);highlightTrackingIssues();try{renderInvMovement()}catch{}try{renderInvOrders()}catch{}}
function highlightTrackingIssues(){const ttype=(currentTrackingType()||'').toLowerCase();if(ttype!=='serial')return;const inputs=[...document.querySelectorAll('#inv-tracking tbody tr td:first-child input.inp')];const map=new Map();for(const inp of inputs){const v=(inp.value||'').trim();inp.style.borderColor='';if(!v)continue;map.set(v,(map.get(v)||0)+1)}for(const inp of inputs){const v=(inp.value||'').trim();if(v&&map.get(v)>1)inp.style.borderColor='red'}}
function toggleScanMode(){__invScanMode=!__invScanMode;const inp=document.getElementById('inv-track-scan-input');if(inp){inp.style.display=__invScanMode?'block':'none';if(__invScanMode){inp.value='';inp.focus()}}}
function handleScanEnter(e){if(e.key!=='Enter')return;const val=String(e.target.value||'').trim();if(!val)return;e.preventDefault();const ttype=(currentTrackingType()||'').toLowerCase();if(ttype!=='serial')return;const rows=__invTrackMap.get(__invCurrentKey)||[];if(rows.some(r=>String(r.serial||'').trim().toLowerCase()===val.toLowerCase())){e.target.value='';return}rows.push({serial:val,lot:'',expiration:'',location:'',sublocation:'',qty:'1'});__invTrackMap.set(__invCurrentKey,rows);renderInvTracking();e.target.value=''}
function addNTrackRows(){const n=Number(prompt('How many rows to add?')||'0')||0;if(n<=0)return;const rows=__invTrackMap.get(__invCurrentKey)||[];const ttype=(currentTrackingType()||'').toLowerCase();for(let i=0;i<n;i++){rows.push({serial:'',lot:'',expiration:'',location:'',sublocation:'',qty:(ttype==='serial'?'1':'0')})}__invTrackMap.set(__invCurrentKey,rows);renderInvTracking()}
function fefoAllocate(){const ttype=(currentTrackingType()||'').toLowerCase();const rows=__invTrackMap.get(__invCurrentKey)||[];if(ttype==='serial'){rows.sort((a,b)=>{const da=a.expiration||'';const db=b.expiration||'';if(da&&!db)return -1;if(!da&&db)return 1;return da.localeCompare(db)});}else if(ttype==='lot'){rows.sort((a,b)=>{const da=a.expiration||'';const db=b.expiration||'';if(da&&!db)return -1;if(!da&&db)return 1;return da.localeCompare(db)});}__invTrackMap.set(__invCurrentKey,rows);renderInvTracking()}
function exportTrackingCSV(){const ttype=(currentTrackingType()||'').toLowerCase();const rows=__invTrackMap.get(__invCurrentKey)||[];const headers=(ttype==='serial'?['serial','expiration','location','sublocation','qty']:['lot','expiration','location','sublocation','qty']);const lines=[headers.join(',')];for(const r of rows){const vals=(ttype==='serial'?[r.serial||'',r.expiration||'',r.location||'',r.sublocation||'',r.qty||'']:[r.lot||'',r.expiration||'',r.location||'',r.sublocation||'',r.qty||'']);lines.push(vals.map(v=>String(v||'').replace(/"/g,'""')).map(v=>/[,"]/.test(v)?`"${v}"`:v).join(','))}const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tracking_${__invCurrentKey}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{try{document.body.removeChild(a)}catch{}},500)}
function importTrackingCSV(){const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.style.display='none';input.addEventListener('change',()=>{const f=input.files&&input.files[0];if(!f)return;const reader=new FileReader();reader.onload=e=>{const text=String(e.target.result||'');applyCSVToTracking(text)};reader.readAsText(f)});document.body.appendChild(input);input.click();setTimeout(()=>{try{document.body.removeChild(input)}catch{}},1000)}
function applyCSVToTracking(text){const ttype=(currentTrackingType()||'').toLowerCase();const rows=__invTrackMap.get(__invCurrentKey)||[];const lines=text.split(/\r?\n/).filter(l=>l.trim().length>0);if(!lines.length)return;const header=lines.shift().split(',').map(h=>h.trim().toLowerCase());for(const line of lines){const cols=line.match(/("([^"]|"")*"|[^,]+)/g)||[];const get=(name)=>{const i=header.indexOf(name);if(i<0)return '';let v=(cols[i]||'').trim();if(v.startsWith('"')&&v.endsWith('"'))v=v.slice(1,-1).replace(/""/g,'"');return v};if(ttype==='serial'){rows.push({serial:get('serial'),lot:'',expiration:get('expiration'),location:get('location'),sublocation:get('sublocation'),qty:'1'})}else{rows.push({serial:'',lot:get('lot'),expiration:get('expiration'),location:get('location'),sublocation:get('sublocation'),qty:get('qty')||'0'})}}__invTrackMap.set(__invCurrentKey,rows);renderInvTracking()}
function addInvTrackRow(){const rows=__invTrackMap.get(__invCurrentKey)||[];const ttype=(currentTrackingType()||'').toLowerCase();rows.push({serial:'',lot:'',expiration:'',location:'',sublocation:'',qty:(ttype==='serial'?'1':'0')});__invTrackMap.set(__invCurrentKey,rows);renderInvTracking();const last=document.querySelector('#inv-tracking tbody tr:last-child input');if(last)last.focus()}
function delInvTrackRow(){const rows=__invTrackMap.get(__invCurrentKey)||[];if(__invTrackSel>=0&&__invTrackSel<rows.length){rows.splice(__invTrackSel,1);__invTrackSel=-1;renderInvTracking()}}
async function renderInvMovement(){const host=document.getElementById('inv-move');if(!host)return;host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Transaction Type','Date','Location','Sublocation','Remarks','Quantity','Quantity Before','Quantity After','User'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');table.appendChild(tbody);host.appendChild(table);const ttype=(currentTrackingType()||'').toLowerCase();const sumDiv=document.createElement('div');sumDiv.className='table-host';host.appendChild(sumDiv);if(!__invCurrentKey||!ttype||ttype==='none'){const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — Tracking disabled';sumDiv.appendChild(summary);return}try{const r=await fetch(api('/api/inventory/tracking/summary?key='+encodeURIComponent(__invCurrentKey)));const s=await r.json().catch(()=>({}));const rows=Array.isArray(s.list)?s.list:[];const total=Number(s.total)||0;let info='';if(ttype==='serial'){info=`Serials: ${Number(s.serials)||rows.length}, Total qty: ${total}`}else{const lotCount=Array.isArray(s.lots)?s.lots.length:0;info=`Lots: ${lotCount}, Total qty: ${total}`}const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — '+info;sumDiv.appendChild(summary);if(ttype==='serial'){const t=document.createElement('table');const th=document.createElement('thead');const thr=document.createElement('tr');['Serial','Expiration','Location','Sublocation'].forEach(h=>{const thd=document.createElement('th');thd.textContent=h;thr.appendChild(thd)});th.appendChild(thr);t.appendChild(th);const tb=document.createElement('tbody');rows.filter(r=>String(r.Serial||'').trim()).forEach(r=>{const tr=document.createElement('tr');const cells=[r.Serial||'',r.Expiration||'',r.Location||'',r.Sublocation||''];cells.forEach(c=>{const td=document.createElement('td');td.textContent=String(c||'');tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);sumDiv.appendChild(t)}else{const t=document.createElement('table');const th=document.createElement('thead');const thr=document.createElement('tr');['Lot','Earliest Expiration','Quantity'].forEach(h=>{const thd=document.createElement('th');thd.textContent=h;thr.appendChild(thd)});th.appendChild(thr);t.appendChild(th);const tb=document.createElement('tbody');(Array.isArray(s.lots)?s.lots:[]).forEach(r=>{const tr=document.createElement('tr');const cells=[r.lot||'',r.earliest||'',String(r.qty||0)];cells.forEach(c=>{const td=document.createElement('td');td.textContent=String(c||'');tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);sumDiv.appendChild(t)}}catch{const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — unavailable';sumDiv.appendChild(summary)}}
async function renderInvOrders(){const host=document.getElementById('inv-orders');if(!host)return;host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Type','Order #','Customer/Vendor Name','Order Date','Order Status','Order Total','Quantity','Unit Price','Sub-Total'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');table.appendChild(tbody);host.appendChild(table);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=String(val)};set('inv-qoh',0);set('inv-qres',0);set('inv-qord',0);set('inv-qavail',0);const ttype=(currentTrackingType()||'').toLowerCase();const sumDiv=document.createElement('div');sumDiv.className='table-host';host.appendChild(sumDiv);if(!__invCurrentKey||!ttype||ttype==='none'){const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — Tracking disabled';sumDiv.appendChild(summary);return}try{const r=await fetch(api('/api/inventory/tracking/summary?key='+encodeURIComponent(__invCurrentKey)));const s=await r.json().catch(()=>({}));const rows=Array.isArray(s.list)?s.list:[];const total=Number(s.total)||0;let info='';if(ttype==='serial'){info=`Serials: ${Number(s.serials)||rows.length}, Total qty: ${total}`}else{const lotCount=Array.isArray(s.lots)?s.lots.length:0;info=`Lots: ${lotCount}, Total qty: ${total}`}const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — '+info;sumDiv.appendChild(summary);if(ttype==='serial'){const t=document.createElement('table');const th=document.createElement('thead');const thr=document.createElement('tr');['Serial','Expiration','Location','Sublocation'].forEach(h=>{const thd=document.createElement('th');thd.textContent=h;thr.appendChild(thd)});th.appendChild(thr);t.appendChild(th);const tb=document.createElement('tbody');rows.filter(r=>String(r.Serial||'').trim()).forEach(r=>{const tr=document.createElement('tr');const cells=[r.Serial||'',r.Expiration||'',r.Location||'',r.Sublocation||''];cells.forEach(c=>{const td=document.createElement('td');td.textContent=String(c||'');tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);sumDiv.appendChild(t)}else{const t=document.createElement('table');const th=document.createElement('thead');const thr=document.createElement('tr');['Lot','Earliest Expiration','Quantity'].forEach(h=>{const thd=document.createElement('th');thd.textContent=h;thr.appendChild(thd)});th.appendChild(thr);t.appendChild(th);const tb=document.createElement('tbody');(Array.isArray(s.lots)?s.lots:[]).forEach(r=>{const tr=document.createElement('tr');const cells=[r.lot||'',r.earliest||'',String(r.qty||0)];cells.forEach(c=>{const td=document.createElement('td');td.textContent=String(c||'');tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);sumDiv.appendChild(t)}}catch{const summary=document.createElement('div');summary.className='status';summary.textContent='Tracking Summary — unavailable';sumDiv.appendChild(summary)}}
function setVal(id,v){const el=document.getElementById(id);if(!el)return;if(el.tagName==='SELECT'){[...el.options].forEach(o=>{o.selected=(o.textContent.toLowerCase()===String(v||'').toLowerCase())})}else{el.value=(v==null||v==='')?'':String(v)}}
async function loadInvExtended(){if(!__invCurrentKey)return;try{const r=await fetch(api('/api/inventory/extended?key='+encodeURIComponent(__invCurrentKey)));const j=await r.json().catch(()=>({}));const ex=j&&j.extra||null;if(ex){setVal('inv-barcode',ex.Barcode);setVal('inv-reorder-point',ex.ReorderPoint);setVal('inv-reorder-qty',ex.ReorderQty);setVal('inv-default-loc',ex.DefaultLocation);setVal('inv-default-subloc',ex.DefaultSublocation);setVal('inv-last-vendor',ex.LastVendor);setVal('inv-uom-std',ex.UomStd);setVal('inv-uom-sales',ex.UomSales);setVal('inv-uom-purch',ex.UomPurch);setVal('inv-uom-loose',ex.UomLoose);setVal('inv-pu-per-lu',ex.PuPerLu);setVal('inv-su-per-lu',ex.SuPerLu);setVal('inv-tracking-type',ex.TrackingType);setVal('inv-remarks',ex.Remarks);setVal('inv-len',ex.Length);setVal('inv-wid',ex.Width);setVal('inv-hei',ex.Height);setVal('inv-wei',ex.Weight)}
  if(Array.isArray(j.bom)){__invBOMMap.set(__invCurrentKey,(j.bom||[]).map(r=>({item:r.item||'',desc:r.desc||'',qty:String(r.qty||'0'),cost:String(r.cost||'0.00')})));renderInvBOM()}
  if(Array.isArray(j.vendors)){__invVendorsMap.set(__invCurrentKey,(j.vendors||[]).map(r=>({vendor:r.vendor||'',price:String(r.price||'0.00'),code:r.code||''})));renderInvVendors()}
  if(Array.isArray(j.tracking)){__invTrackMap.set(__invCurrentKey,(j.tracking||[]).map(r=>({serial:r.serial||'',lot:r.lot||'',expiration:r.expiration||'',location:r.location||'',sublocation:r.sublocation||'',qty:String(r.qty||'0')})));renderInvTracking()}
}catch{}}
function gatherInvPayload(){const extra={Barcode:document.getElementById('inv-barcode')?.value||null,ReorderPoint:document.getElementById('inv-reorder-point')?.value||null,ReorderQty:document.getElementById('inv-reorder-qty')?.value||null,DefaultLocation:document.getElementById('inv-default-loc')?.value||null,DefaultSublocation:document.getElementById('inv-default-subloc')?.value||null,LastVendor:document.getElementById('inv-last-vendor')?.value||null,UomStd:document.getElementById('inv-uom-std')?.value||null,UomSales:document.getElementById('inv-uom-sales')?.value||null,UomPurch:document.getElementById('inv-uom-purch')?.value||null,UomLoose:document.getElementById('inv-uom-loose')?.value||null,PuPerLu:document.getElementById('inv-pu-per-lu')?.value||null,SuPerLu:document.getElementById('inv-su-per-lu')?.value||null,TrackingType:document.getElementById('inv-tracking-type')?.value||null,Remarks:document.getElementById('inv-remarks')?.value||null,Length:document.getElementById('inv-len')?.value||null,Width:document.getElementById('inv-wid')?.value||null,Height:document.getElementById('inv-hei')?.value||null,Weight:document.getElementById('inv-wei')?.value||null};const bom=(__invBOMMap.get(__invCurrentKey)||[]).map(r=>({item:r.item,desc:r.desc,qty:r.qty,cost:r.cost}));const vendors=(__invVendorsMap.get(__invCurrentKey)||[]).map(r=>({vendor:r.vendor,price:r.price,code:r.code}));const tracking=(__invTrackMap.get(__invCurrentKey)||[]).map(r=>({serial:r.serial,lot:r.lot,expiration:r.expiration,location:r.location,sublocation:r.sublocation,qty:r.qty}));return {extra,bom,vendors,tracking}}
async function saveInvExtended(){if(!__invCurrentKey)return;const ttype=(currentTrackingType()||'').toLowerCase();if(ttype==='serial'){const rows=__invTrackMap.get(__invCurrentKey)||[];const serials=rows.map(r=>String(r.serial||'').trim()).filter(Boolean);if(serials.length!==rows.length){alert('All serial rows must have a serial and qty=1');return}const set=new Set();for(const s of serials){if(set.has(s)){alert('Duplicate serial in grid: '+s);return}set.add(s)}try{const vr=await fetch(api('/api/inventory/tracking/validate'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:__invCurrentKey,serials})});const vj=await vr.json().catch(()=>({}));if((vj.conflicts&&vj.conflicts.length)||(vj.duplicates&&vj.duplicates.length)){alert('Serial conflicts: '+[...(vj.duplicates||[]),...(vj.conflicts||[])].join(', '));return}}catch{}}const payload=gatherInvPayload();const r=await fetch(api('/api/inventory/extended?key='+encodeURIComponent(__invCurrentKey)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const jr=await r.json().catch(()=>({}));if(jr&&jr.ok===false&&jr.error){alert(jr.error)}}
function renderInvLocations(){const host=document.getElementById('inv-locations');if(!host)return;const rows=__invLocMap.get(__invCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Location','Sublocation','Quantity'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>onchange(inp.value));inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvLocRow()}});td.appendChild(inp);return td}
  tr.appendChild(tdInput(r.location,'Location',v=>{r.location=v}))
  tr.appendChild(tdInput(r.sublocation,'Sublocation',v=>{r.sublocation=v}))
  tr.appendChild(tdInput(r.qty,'0',v=>{r.qty=v},{type:'number',step:'1',min:'0'}))
  tr.addEventListener('click',()=>{document.querySelectorAll('#inv-locations tbody tr').forEach(rr=>rr.classList.remove('active'));tr.classList.add('active');__invSelectedIndex=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table)}
function addInvLocRow(){const rows=__invLocMap.get(__invCurrentKey)||[];rows.push({location:'',sublocation:'',qty:'0'});__invLocMap.set(__invCurrentKey,rows);renderInvLocations();const last=document.querySelector('#inv-locations tbody tr:last-child input');if(last)last.focus()}
function delInvLocRow(){const rows=__invLocMap.get(__invCurrentKey)||[];if(__invSelectedIndex>=0&&__invSelectedIndex<rows.length){rows.splice(__invSelectedIndex,1);__invSelectedIndex=-1;renderInvLocations()}}
function loadInventoryPicture(){const img=document.getElementById('inv-pic-preview');const empty=document.getElementById('inv-pic-empty');try{const key='inv_pic_'+__invCurrentKey;const src=localStorage.getItem(key);if(src){img.src=src;img.style.display='inline-block';if(empty)empty.style.display='none'}else{img.removeAttribute('src');img.style.display='none';if(empty)empty.style.display='block'}}catch{}}
function browseInventoryPicture(){const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.style.display='none';picker.addEventListener('change',()=>{if(picker.files&&picker.files[0]){const f=picker.files[0];const reader=new FileReader();reader.onload=e=>{try{localStorage.setItem('inv_pic_'+__invCurrentKey,e.target.result)}catch{};loadInventoryPicture()};reader.readAsDataURL(f)}});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)}
function clearInventoryPicture(){try{localStorage.removeItem('inv_pic_'+__invCurrentKey)}catch{};loadInventoryPicture()}

try{
  if(!window.__vendorUX){
    window.__vendorUX={selectedName:'',active:1,flags:new Map(),bound:false,loadedFlags:false}
  }
}catch{}
function __vendorUXLc(v){return String(v||'').trim().toLowerCase()}
function __vendorUXSetTitle(name){
  const el=document.querySelector('#section-vendor .vendor-title')
  if(!el)return
  const clean=String(name||'').trim()
  el.textContent='Vendor'
}
let __vendorTitleObserver=null
function __lockVendorTitle(){
  const el=document.querySelector('#section-vendor .vendor-title')
  if(!el)return
  el.textContent='Vendor'
  try{
    if(__vendorTitleObserver){__vendorTitleObserver.disconnect()}
    __vendorTitleObserver=new MutationObserver(()=>{if(el.textContent!=='Vendor')el.textContent='Vendor'})
    __vendorTitleObserver.observe(el,{characterData:true,childList:true,subtree:true})
  }catch{}
}
async function __vendorUXLoadFlags(){
  try{
    const r=await fetch(api('/api/vendor/flags'))
    const j=await r.json().catch(()=>({}))
    const map=new Map()
    for(const f of (j&&j.flags)||[]){
      const n=__vendorUXLc(f&&f.Name)
      if(!n)continue
      map.set(n,(f&&Number(f.Active))?1:0)
    }
    if(window.__vendorUX){window.__vendorUX.flags=map;window.__vendorUX.loadedFlags=true}
  }catch{}
}
async function loadVendorExtended(name){
  const nm=String(name||'').trim()
  if(!nm)return
  try{
    const r=await fetch(api('/api/vendor/extended?name='+encodeURIComponent(nm)))
    const j=await r.json().catch(()=>({}))
    if(j&&j.extra){
      const x=j.extra
      if(window.__vendorUX){
        window.__vendorUX.selectedName=nm
        window.__vendorUX.active=(x.Active==null?window.__vendorUX.active:(Number(x.Active)?1:0))
        window.__vendorUX.flags.set(__vendorUXLc(nm),window.__vendorUX.active?1:0)
      }
      ;[['v-address','BusinessAddress'],['v-contact','Contact'],['v-phone','Phone'],['v-fax','Fax'],['v-email','Email'],['v-website','Website'],['v-currency','Currency'],['v-terms','PaymentTerms'],['v-tax','TaxingScheme'],['v-carrier','Carrier'],['v-remarks','Remarks']].forEach(([id,key])=>{const el=document.getElementById(id);if(el&&x[key]!=null)el.value=String(x[key])})
      __vendorUXSetTitle(nm)
    }
  }catch{}
}
function __vendorUXPayload(){
  const nm=(document.getElementById('v-name')?.value||'').trim()
  const address=document.getElementById('v-address')?.value||null
  const active=(window.__vendorUX&&window.__vendorUX.active)?1:0
  return {name:nm,extra:{Address:address,BusinessAddress:address,Contact:document.getElementById('v-contact')?.value||null,Phone:document.getElementById('v-phone')?.value||null,Fax:document.getElementById('v-fax')?.value||null,Email:document.getElementById('v-email')?.value||null,Website:document.getElementById('v-website')?.value||null,Currency:document.getElementById('v-currency')?.value||null,PaymentTerms:document.getElementById('v-terms')?.value||null,TaxingScheme:document.getElementById('v-tax')?.value||null,Carrier:document.getElementById('v-carrier')?.value||null,Remarks:document.getElementById('v-remarks')?.value||null,Active:active}}
}
function __vendorUXClearForm(){
  ;['v-name','v-balance','v-address','v-contact','v-phone','v-fax','v-email','v-website','v-terms','v-tax','v-carrier','v-currency','v-remarks'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='' })
  if(window.__vendorUX){window.__vendorUX.selectedName='';window.__vendorUX.active=1}
  __vendorUXSetTitle('New Vendor')
  const orders=document.getElementById('vendor-orders');if(orders)orders.textContent='Select a vendor to view order history'
  const prods=document.getElementById('vendor-products');if(prods)prods.textContent='Select a vendor to view products'
}
function __vendorUXSelectByName(name){
  const lc=__vendorUXLc(name)
  const items=[...document.querySelectorAll('#vendor-list .vendor-item')]
  const el=items.find(x=>__vendorUXLc(x.dataset.name||x.textContent||'')===lc)
  if(el){el.click();try{el.scrollIntoView({block:'nearest'})}catch{}}
}
async function saveVendor(){
  const btn=document.getElementById('vendor-save')
  const prev=btn?String(btn.textContent||'Save'):'Save'
  const payload=__vendorUXPayload()
  const nm=payload.name
  if(!nm){toast('Vendor name is required','warn');return}
  if(btn){btn.disabled=true;btn.textContent='Saving...'}
  try{
    const r=await fetch(api('/api/vendor/extended?name='+encodeURIComponent(nm)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const j=await r.json().catch(()=>({}))
    if(!r.ok||(j&&j.ok===false&&j.error)){toast(String(j&&j.error||'Unable to save vendor'),'error');return}
    if(window.__vendorUX){
      window.__vendorUX.selectedName=nm
      window.__vendorUX.flags.set(__vendorUXLc(nm),window.__vendorUX.active?1:0)
    }
    toast((window.__vendorUX&&window.__vendorUX.active)?'Vendor saved':'Vendor marked inactive','success')
    if(typeof filterVendors==='function')filterVendors()
    __vendorUXSelectByName(nm)
  }catch(e){
    toast(String(e&&e.message||e||'Save failed'),'error')
  }finally{
    if(btn){btn.disabled=false;btn.textContent=prev}
  }
}
async function deactivateVendor(){
  const nm=(document.getElementById('v-name')?.value||'').trim()
  if(!nm){toast('Select a vendor first','warn');return}
  if(window.__vendorUX){window.__vendorUX.active=0}
  await saveVendor()
  const show=document.getElementById('vendor-show-inactive')
  if(show && !show.checked){
    if(typeof filterVendors==='function')filterVendors()
    const first=document.querySelector('#vendor-list .vendor-item')
    if(first)first.click();else __vendorUXClearForm()
  }
}
function closeVendor(){try{if(typeof showSection==='function')showSection('dashboard')}catch{}}
try{
  if(!window.__bindVendorOrig && typeof bindVendor==='function')window.__bindVendorOrig=bindVendor
  if(typeof bindVendor==='function'){
    bindVendor=function(row){
      try{window.__bindVendorOrig&&window.__bindVendorOrig(row)}catch{}
      const nm=String(pick(row,['Name','Vendor','Company'])||'').trim()
      if(window.__vendorUX){
        window.__vendorUX.selectedName=nm
        const f=window.__vendorUX.flags.get(__vendorUXLc(nm))
        if(f!=null)window.__vendorUX.active=f
      }
      __vendorUXSetTitle(nm)
      loadVendorExtended(nm)
    }
  }
}catch{}
try{
  if(!window.__renderVendorListOrig && typeof renderVendorList==='function')window.__renderVendorListOrig=renderVendorList
  renderVendorList=function(items){
    const list=document.getElementById('vendor-list');const count=document.getElementById('vendor-count');if(!list)return;
    list.innerHTML=''
    if(!items||!items.length){list.textContent='No vendors match your filters';if(count)count.textContent='0';return}
    const nameKeys=['Name','Vendor','Company']
    let selectedIdx=-1
    items.forEach((row,idx)=>{
      const div=document.createElement('div')
      div.className='vendor-item'
      div.tabIndex=0
      const nm=String(pick(row,nameKeys)||'(unnamed)')
      div.dataset.name=nm
      const f=(window.__vendorUX&&window.__vendorUX.flags)?window.__vendorUX.flags.get(__vendorUXLc(nm)):null
      const isInactive=(f!=null && !f)
      div.textContent=nm+(isInactive?' (inactive)':'')
      div.addEventListener('click',()=>{
        document.querySelectorAll('#vendor-list .vendor-item').forEach(i=>i.classList.remove('active'))
        div.classList.add('active')
        bindVendor(row)
      })
      div.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();div.click();return}
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){
          e.preventDefault()
          const all=[...document.querySelectorAll('#vendor-list .vendor-item')]
          const i=all.indexOf(div)
          const next=(e.key==='ArrowDown')?Math.min(all.length-1,i+1):Math.max(0,i-1)
          const n=all[next]
          if(n){n.focus();n.click()}
        }
      })
      list.appendChild(div)
      if(window.__vendorUX && __vendorUXLc(nm)===__vendorUXLc(window.__vendorUX.selectedName))selectedIdx=idx
    })
    const els=[...document.querySelectorAll('#vendor-list .vendor-item')]
    const selEl=(selectedIdx>=0?els[selectedIdx]:els[0])
    if(selEl){
      selEl.classList.add('active')
      const row=items[selectedIdx>=0?selectedIdx:0]
      if(row)bindVendor(row)
    }
    if(count)count.textContent=String(items.length)+(items.length===1?' vendor':' vendors')
  }
}catch{}
try{
  if(!window.__filterVendorsOrig && typeof filterVendors==='function')window.__filterVendorsOrig=filterVendors
  filterVendors=function(){
    const qn=(document.getElementById('vendor-q-name')?.value||'').toLowerCase()
    const qc=(document.getElementById('vendor-q-contact')?.value||'').toLowerCase()
    const qp=(document.getElementById('vendor-q-phone')?.value||'').toLowerCase()
    const showInactive=!!(document.getElementById('vendor-show-inactive')&&document.getElementById('vendor-show-inactive').checked)
    const items=(__vendors||[]).filter(r=>{
      const nameRaw=String(pick(r,['Name','Vendor','Company'])||'')
      const name=nameRaw.toLowerCase()
      const contact=(String(pick(r,['Contact','ContactName','Attn']))).toLowerCase()
      const phone=(String(pick(r,['Phone','Telephone','Mobile']))).toLowerCase()
      const f=(window.__vendorUX&&window.__vendorUX.flags)?window.__vendorUX.flags.get(__vendorUXLc(nameRaw)):null
      const passActive=(showInactive || f==null || f)
      return passActive && (!qn||name.includes(qn)) && (!qc||contact.includes(qc)) && (!qp||phone.includes(qp))
    })
    renderVendorList(items)
  }
}catch{}
try{
  if(!window.__initVendorPageOrig && typeof initVendorPage==='function')window.__initVendorPageOrig=initVendorPage
  initVendorPage=async function(){
    await window.__initVendorPageOrig()
    if(window.__vendorUX && !window.__vendorUX.bound){
      window.__vendorUX.bound=true
      const show=document.getElementById('vendor-show-inactive');if(show)show.addEventListener('change',()=>{try{filterVendors()}catch{}})
      const clear=document.getElementById('vendor-clear');if(clear)clear.addEventListener('click',()=>{['vendor-q-name','vendor-q-contact','vendor-q-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});if(show)show.checked=false;try{filterVendors()}catch{};try{document.getElementById('vendor-q-name')?.focus()}catch{}})
      const newBtn=document.getElementById('vendor-new');if(newBtn)newBtn.addEventListener('click',()=>{__vendorUXClearForm();try{document.getElementById('v-name')?.focus()}catch{}})
      const saveBtn=document.getElementById('vendor-save');if(saveBtn)saveBtn.addEventListener('click',saveVendor)
      const deactBtn=document.getElementById('vendor-deactivate');if(deactBtn)deactBtn.addEventListener('click',deactivateVendor)
      const closeBtn=document.getElementById('vendor-close');if(closeBtn)closeBtn.addEventListener('click',closeVendor)
      ;['vendor-q-name','vendor-q-contact','vendor-q-phone'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('keydown',e=>{if(e.key==='Escape'){if(el.value){el.value='';try{filterVendors()}catch{};e.preventDefault()}return}if(e.key==='ArrowDown'){const first=document.querySelector('#vendor-list .vendor-item');if(first){e.preventDefault();first.focus();first.click()}}})})
    }
    if(window.__vendorUX && !window.__vendorUX.loadedFlags){await __vendorUXLoadFlags();try{filterVendors()}catch{}}
    __vendorUXSetTitle(window.__vendorUX&&window.__vendorUX.selectedName||'')
  }
}catch{}
async function initInventoryPage(){if(__invLoaded){try{__refreshSharedDatalists()}catch{}filterInventory();return}try{const s=await fetch(api('/api/schema?table=inventory'));const sj=await s.json().catch(()=>({}));__invSchema=sj.schema||[];const d=await fetch(api('/api/data?table=inventory&limit=1000'));const dj=await d.json().catch(()=>({}));__invRows=dj.rows||[];__invLoaded=true;try{__refreshSharedDatalists()}catch{}['inv-q-code','inv-q-desc','inv-q-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterInventory)});const ref=document.getElementById('inv-refresh');if(ref)ref.addEventListener('click',async()=>{__invLoaded=false;await initInventoryPage()});document.querySelectorAll('#section-inventory .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-inventory .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-inventory .tabpane').forEach(p=>p.classList.toggle('active',p.id==='inv-tab-'+btn.dataset.tab))})});const addBtn=document.getElementById('inv-loc-add');const delBtn=document.getElementById('inv-loc-del');if(addBtn)addBtn.addEventListener('click',addInvLocRow);if(delBtn)delBtn.addEventListener('click',delInvLocRow);const picBrowse=document.getElementById('inv-pic-browse');const picClear=document.getElementById('inv-pic-clear');if(picBrowse)picBrowse.addEventListener('click',browseInventoryPicture);if(picClear)picClear.addEventListener('click',clearInventoryPicture);const bomAdd=document.getElementById('inv-bom-add');const bomDel=document.getElementById('inv-bom-del');if(bomAdd)bomAdd.addEventListener('click',addInvBOMRow);if(bomDel)bomDel.addEventListener('click',delInvBOMRow);const venAdd=document.getElementById('inv-vendor-add');const venDel=document.getElementById('inv-vendor-del');if(venAdd)venAdd.addEventListener('click',addInvVendorRow);if(venDel)venDel.addEventListener('click',delInvVendorRow);const trackAdd=document.getElementById('inv-track-add');const trackDel=document.getElementById('inv-track-del');if(trackAdd)trackAdd.addEventListener('click',addInvTrackRow);if(trackDel)trackDel.addEventListener('click',delInvTrackRow);const trackType=document.getElementById('inv-tracking-type');if(trackType)trackType.addEventListener('change',renderInvTracking);const scanBtn=document.getElementById('inv-track-scan');if(scanBtn)scanBtn.addEventListener('click',toggleScanMode);const scanInp=document.getElementById('inv-track-scan-input');if(scanInp)scanInp.addEventListener('keydown',handleScanEnter);const genBtn=document.getElementById('inv-track-gen');if(genBtn)genBtn.addEventListener('click',addNTrackRows);const fefoBtn=document.getElementById('inv-track-fefo');if(fefoBtn)fefoBtn.addEventListener('click',fefoAllocate);const expBtn=document.getElementById('inv-track-export');if(expBtn)expBtn.addEventListener('click',exportTrackingCSV);const impBtn=document.getElementById('inv-track-import');if(impBtn)impBtn.addEventListener('click',importTrackingCSV);const saveBtn=document.getElementById('inv-save');if(saveBtn)saveBtn.addEventListener('click',saveInvExtended);filterInventory();renderInvMovement();renderInvOrders()}catch(e){const list=document.getElementById('inv-list');if(list)list.textContent='Error: '+(e&&e.message||e)}}
