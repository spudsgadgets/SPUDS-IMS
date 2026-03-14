const themeBtn=document.getElementById('theme-btn')
const modeBtn=document.getElementById('mode-btn')
const API_BASE=(location.protocol==='file:'? 'http://localhost:3200' : '')
function api(path){return API_BASE+path}
function applyTheme(t){document.body.classList.toggle('dark',t==='dark');try{localStorage.setItem('theme',t)}catch{};if(themeBtn)themeBtn.textContent=t==='dark'?'Light':'Dark'}
function applyMode(m){document.body.classList.remove('mobile','desktop');if(m==='mobile')document.body.classList.add('mobile');else if(m==='desktop')document.body.classList.add('desktop');try{localStorage.setItem('mode',m)}catch{};if(modeBtn)modeBtn.textContent=m==='mobile'?'Desktop':'Mobile'}
let mSaved=null;try{mSaved=localStorage.getItem('mode')}catch{};applyMode(mSaved||(window.innerWidth<=768?'mobile':'desktop'))
let tSaved=null;try{tSaved=localStorage.getItem('theme')}catch{};applyTheme(tSaved||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'))
if(modeBtn)modeBtn.addEventListener('click',()=>{applyMode(document.body.classList.contains('mobile')?'desktop':'mobile')})
if(themeBtn)themeBtn.addEventListener('click',()=>{applyTheme(document.body.classList.contains('dark')?'light':'dark')})
function __toUpperField(el){if(!el)return;const t=String(el.value||'');const u=t.toUpperCase();if(t!==u){const s=el.selectionStart;const e=el.selectionEnd;el.value=u;if(s!=null&&e!=null){try{el.setSelectionRange(s,e)}catch{}}}}
function __normalizeAllInputs(){document.querySelectorAll('.inp').forEach(el=>{if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')__toUpperField(el)})}
document.addEventListener('input',e=>{const el=e&&e.target;if(!el||!el.classList||!el.classList.contains('inp'))return;if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')__toUpperField(el)},true)
window.addEventListener('load',__normalizeAllInputs)
// navigation
const navButtons=[...document.querySelectorAll('.nav-btn')]
const sections=[...document.querySelectorAll('.section')]
let __currentSection='dashboard'
function showSection(id){__currentSection=id;sections.forEach(s=>s.classList.toggle('section-active',s.id===('section-'+id)));navButtons.forEach(b=>b.classList.toggle('active',b.dataset.section===id));try{history.replaceState(null,'','#section-'+id)}catch{};if(id==='inventory')initInventoryPage();if(id==='vendor')initVendorPage();if(id==='purchase-order')initPurchaseOrderPage();if(id==='sales-order')initSalesOrderPage();if(id==='customer')initCustomerPage();const gs=document.getElementById('global-search');if(gs&&gs.value)applyGlobalSearch(gs.value)}
navButtons.forEach(b=>b.addEventListener('click',(e)=>{e.preventDefault();showSection(b.dataset.section)}))
// default to dashboard
showSection('dashboard')
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
const logoSelectText=document.getElementById('logo-select-text')
const logoSelectIcon=document.getElementById('logo-select-icon')
const logoClearBtn=document.getElementById('logo-clear')
const logoPreview=document.getElementById('logo-preview')
const logoStatus=document.getElementById('logo-status')
const brandVer=document.querySelector('.brand-ver')
async function ensureVersionBadge(){
  try{
    if(!brandVer)return;
    const cur=(brandVer.textContent||'').trim();
    if(cur)return;
    const m=/\\bIMS\\s+v([0-9][^\\s]*)/i.exec(document.title||'');
    if(m&&m[1]){
      brandVer.textContent='v'+m[1];
      return;
    }
    const r=await fetch(api('/api/version'));
    const j=await r.json().catch(()=>({}));
    const ver=j&&j.version;
    if(ver){
      brandVer.textContent='v'+ver;
      if(!/\\bIMS\\s+v/i.test(document.title||''))document.title='IMS v'+ver;
    }
  }catch{}
}
ensureVersionBadge()
function printUserManual(){
  if(!helpManual)return
  const w=window.open('','_blank','noopener,noreferrer')
  if(!w)return
  const title='SPUDS IMS — User Manual'
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+'</title><link rel="stylesheet" href="./styles.css"><style>body{background:#fff;color:#000}a{color:#000}#print-root{max-width:900px;margin:24px auto;padding:0 12px}@media print{.no-print{display:none!important}body{background:#fff;color:#000}.panel{border:none}.section-title{color:#000}}</style></head><body><div class="no-print" style="display:flex;gap:10px;align-items:center;justify-content:space-between;max-width:900px;margin:16px auto 0;padding:0 12px"><div style="font-weight:600">'+title+'</div><button id="doPrint" class="btn">Print</button></div><div id="print-root" class="panel"><div>'+helpManual.innerHTML+'</div></div><script>document.getElementById("doPrint").addEventListener("click",()=>window.print());window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>'
  w.document.open()
  w.document.write(html)
  w.document.close()
}
if(helpPrintBtn)helpPrintBtn.addEventListener('click',printUserManual)
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
}
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

let __dashZoom=1
let __dashChartType='bars'
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
async function fetchSalesOrders(){
  const r=await fetch(api('/api/data?table=sales_order&limit=200'))
  const j=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(j.error||String(r.status))
  return Array.isArray(j.rows)?j.rows:[]
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
function buildTimelineSeries(rows){
  const group=(dashGroupEl&&dashGroupEl.value)||'months'
  const rangeDays=Number((dashRangeEl&&dashRangeEl.value)||90)||90
  const dateKey=pickField(rows[0],['date','orderdate','order_date','docdate','doc_date','createdat','created_at','timestamp'])
  const amtKey=pickField(rows[0],['total','grandtotal','grand_total','amount','totalamount','total_amount','subtotal','sub_total'])
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
async function loadDashboard(){
  if(!dashTimelineChartEl&&!dashTop5ListEl)return
  try{
    const rows=await fetchSalesOrders()
    renderTimeline(buildTimelineSeries(rows))
    await loadTop5SalesOrders(rows)
  }catch(e){
    if(dashTimelineChartEl)dashTimelineChartEl.innerHTML='<div class="muted">Timeline unavailable</div>'
    if(dashTop5StatusEl)dashTop5StatusEl.textContent='Top 5 unavailable'
  }
}
function reloadDashboard(){
  if(dashTimelineChartEl)dashTimelineChartEl.innerHTML='<div class="muted">Loading timeline…</div>'
  if(dashTop5StatusEl)dashTop5StatusEl.textContent=''
  loadDashboard()
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
reloadDashboard()
function applyLogo(src){if(!logoImg)return;if(src){logoImg.src=src;logoImg.style.display='inline-block'}else{logoImg.removeAttribute('src');logoImg.style.display='none'};if(logoPreview){if(src){logoPreview.src=src;logoPreview.style.display='inline-block'}else{logoPreview.removeAttribute('src');logoPreview.style.display='none'}};if(logoStatus){logoStatus.textContent=src?'Logo set':'No logo'}}
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
const selftestBtn=document.getElementById('run-selftest')
const selftestHost=document.getElementById('selftest-result')
if(restoreBtn)restoreBtn.addEventListener('click',async()=>{const picker=document.createElement('input');picker.type='file';picker.accept='.sql,.zip';picker.style.display='none';picker.addEventListener('change',async()=>{if(!picker.files||!picker.files[0]){if(restoreStatus)restoreStatus.textContent='Choose a file';return}const f=picker.files[0];if(restoreStatus)restoreStatus.textContent='Restoring...';const isZip=(/\.zip$/i.test(f.name))||f.type==='application/zip';let r;if(isZip){const buf=await f.arrayBuffer();r=await fetch(api('/api/restore'),{method:'POST',headers:{'Content-Type':'application/zip'},body:new Uint8Array(buf)})}else{const text=await f.text();r=await fetch(api('/api/restore'),{method:'POST',headers:{'Content-Type':'text/plain'},body:text})}const j=await r.json().catch(()=>({}));if(restoreStatus)restoreStatus.textContent=r.ok?'Restore completed':('Restore error: '+(j.error||r.status))});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)})
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
async function runSelftest(){if(selftestHost)selftestHost.textContent='Running...';try{const r=await fetch(api('/api/selftest'));const j=await r.json().catch(()=>({}));if(!r.ok){if(selftestHost)selftestHost.textContent='Diagnostics error: '+(j.error||r.status);return}if(selftestHost)selftestHost.innerHTML='';const container=document.createElement('div');const table=document.createElement('table');table.className='diag-table';const tbody=document.createElement('tbody');function addStatusRow(label,ok,extra){const tr=document.createElement('tr');const td1=document.createElement('td');td1.textContent=label;const td2=document.createElement('td');const span=document.createElement('span');span.className=ok?'status-ok':'status-bad';span.textContent=ok?'OK':'Issue';td2.appendChild(span);if(extra){const sp=document.createElement('span');sp.style.marginLeft='8px';sp.textContent=extra;td2.appendChild(sp)}tr.appendChild(td1);tr.appendChild(td2);tbody.appendChild(tr)}const views=j.views||{};const tables=j.tables||{};const viewsMissing=Object.keys(views).filter(k=>!views[k]);const tablesMissing=Object.keys(tables).filter(k=>!tables[k]);const viewsOk=viewsMissing.length===0;const tablesOk=tablesMissing.length===0;addStatusRow('Database',!!j.db);addStatusRow('Views',viewsOk,viewsOk?'':('missing: '+viewsMissing.join(', ')));addStatusRow('Tables',tablesOk,tablesOk?'':('missing: '+tablesMissing.join(', ')));addStatusRow('API Port',!!j.apiPort,String(j.apiPort||''));addStatusRow('MySQL Port',!!j.mysqlPort,String(j.mysqlPort||''));const ipsRow=document.createElement('tr');const ipsK=document.createElement('td');ipsK.textContent='IPs';const ipsV=document.createElement('td');ipsV.className='diag-ips';const ips=Array.isArray(j.ips)?j.ips:[];if(ips.length){ips.forEach(ip=>{const a=document.createElement('a');a.href='http://'+ip+':'+(j.apiPort||3200)+'/';a.textContent=ip;ipsV.appendChild(a)})}else{const span=document.createElement('span');span.className='status-bad';span.textContent='No non-local IPv4s detected';ipsV.appendChild(span)}ipsRow.appendChild(ipsK);ipsRow.appendChild(ipsV);tbody.appendChild(ipsRow);table.appendChild(tbody);container.appendChild(table);const hints=[];if(!j.db)hints.push('Database connection failed. Start MariaDB and ensure the configured port is reachable.');if(!viewsOk)hints.push('Missing views: '+viewsMissing.join(', ')+'. Ensure base tables exist and the DB user can CREATE VIEW.');if(!tablesOk)hints.push('Missing tables: '+tablesMissing.join(', ')+'. Save a Customer or Inventory item to auto-create, or restart the app.');if(!ips.length)hints.push('No reachable IPv4 address. Check NIC configuration and firewall.');const fwHint='Allow inbound TCP '+(j.apiPort||3200)+' on Windows Firewall and any third-party firewall.';hints.push(fwHint);if(hints.length){const hTitle=document.createElement('div');hTitle.className='section-title';hTitle.textContent='Fix Hints';container.appendChild(hTitle);const ul=document.createElement('ul');hints.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});container.appendChild(ul)}if(selftestHost)selftestHost.appendChild(container)}catch(e){if(selftestHost)selftestHost.textContent='Diagnostics error: '+(e&&e.message||e)}}
if(selftestBtn)selftestBtn.addEventListener('click',runSelftest)
// Vendor page logic
let __vendorLoaded=false;let __vendors=[];let __vendorSchema=[];let __vendorSource='vendor';
function pick(row,names){for(const n of names){if(n in row && row[n]!=null && row[n]!=='' )return row[n]}return ''}
function parseCols(el){const v=(el.getAttribute('data-cols')||'').split(',').map(s=>s.trim()).filter(Boolean);return v}
function bindVendor(row){
  const fields=[ 'v-name','v-balance','v-address','v-contact','v-phone','v-fax','v-email','v-website','v-terms','v-tax','v-carrier','v-currency','v-remarks' ];
  fields.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)});
  const kv=document.getElementById('vendor-kv');if(kv){kv.innerHTML='';const cols=Object.keys(row||{});cols.forEach(k=>{const kEl=document.createElement('div');kEl.className='k';kEl.textContent=k;const vEl=document.createElement('div');vEl.className='v';vEl.textContent=String(row[k]??'');kv.appendChild(kEl);kv.appendChild(vEl)})}
}
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
async function saveCustomer(){const name=document.getElementById('c-name')?.value||'';if(!name)return;const payload=gatherCustomerPayload();const r=await fetch(api('/api/customer/extended?name='+encodeURIComponent(name)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const jr=await r.json().catch(()=>({}));if(jr&&jr.ok===false&&jr.error){alert(jr.error)}}
async function initCustomerPage(){if(__customerLoaded){filterCustomer();return}try{const s=await fetch(api('/api/schema?table=customer'));const sj=await s.json().catch(()=>({}));__customerSchema=sj.schema||[];const d=await fetch(api('/api/data?table=customer&limit=1000'));const dj=await d.json().catch(()=>({}));__customers=dj.rows||[];__customerLoaded=true;const qn=document.getElementById('c-q-name');if(qn)qn.addEventListener('input',filterCustomer);const ref=document.getElementById('c-refresh');if(ref)ref.addEventListener('click',async()=>{__customerLoaded=false;await initCustomerPage()});const save=document.getElementById('c-save');if(save)save.addEventListener('click',saveCustomer);const sel=document.getElementById('c-address-type');const ta=document.getElementById('c-address');if(sel)sel.addEventListener('change',syncCustomerAddressUI);if(ta)ta.addEventListener('input',()=>{const type=(sel&& (sel.value||sel.options[sel.selectedIndex]?.text)||'Business Address').toLowerCase();if(type.startsWith('shipping'))__cAddr.shipping=ta.value;else __cAddr.business=ta.value});document.querySelectorAll('#section-customer .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-customer .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-customer .tabpane').forEach(p=>p.classList.toggle('active',p.id==='c-tab-'+btn.dataset.tab))})});filterCustomer()}catch(e){const list=document.getElementById('c-list');if(list)list.textContent='Error: '+(e&&e.message||e)}}
// Purchase Order page logic
let __poLoaded=false;let __poRows=[];let __poSchema=[];
const __poItemMap=new Map();let __poCurrentKey=null;let __poSelectedIndex=-1;
function renderPOList(items){const list=document.getElementById('po-list');const count=document.getElementById('po-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No orders';if(count)count.textContent='0';return}const keyNames=['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo'];items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';const n=String(pick(row,keyNames)||'(no number)');const s=String(pick(row,['Status'])||'');div.textContent=n+(s?(' — '+s):'');div.addEventListener('click',()=>{document.querySelectorAll('#po-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindPO(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindPO(row)}});if(count)count.textContent=String(items.length)}
function filterPO(){const qn=(document.getElementById('po-q-num')?.value||'').toLowerCase();const qs=(document.getElementById('po-q-status')?.value||'').toLowerCase();const qv=(document.getElementById('po-q-vendor')?.value||'').toLowerCase();const qf=(document.getElementById('po-q-from')?.value||'').trim();const qt=(document.getElementById('po-q-to')?.value||'').trim();const from=qf?new Date(qf):null;const to=qt?new Date(qt):null;const items=__poRows.filter(r=>{const num=(String(pick(r,['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo']))).toLowerCase();const stat=(String(pick(r,['Status']))).toLowerCase();const ven=(String(pick(r,['Vendor','VendorName','Supplier','Company','Name']))).toLowerCase();let pass=(!qn||num.includes(qn))&&(!qs||stat===qs)&&(!qv||ven===qv);if(pass&&(from||to)){const dv=pick(r,['Date','OrderDate']);const d=dv?new Date(dv):null;if(d&&d.toString()!=='Invalid Date'){if(from&&d<from)pass=false;if(to){const td=new Date(to);td.setHours(23,59,59,999);if(d>td)pass=false}}}return pass});renderPOList(items)}
function parseNum(v){if(v==null||v==='')return 0;const n=Number(String(v).replace(/[^0-9.+-]/g,''));return isNaN(n)?0:n}
function calcTotals(items){const freightEl=document.getElementById('po-freight');const paidEl=document.getElementById('po-paid');let subtotal=0;items.forEach(it=>{const qty=parseNum(it.qty);const price=parseNum(it.price);const disc=parseNum(it.discount);subtotal+=Math.max(0,(qty*price)-disc)});const freight=parseNum(freightEl&&freightEl.value);const paid=parseNum(paidEl&&paidEl.value);const total=subtotal+freight;const balance=Math.max(0,total-paid);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val.toFixed(2)};set('po-subtotal',subtotal);set('po-total',total);set('po-balance',balance)}
function renderItems(){const itemsHost=document.getElementById('po-items');if(!itemsHost)return;const items=__poItemMap.get(__poCurrentKey)||[];itemsHost.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Description','Vendor Product Code','Quantity','Unit Price','Discount','Sub-Total'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach((it,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function cellInput(value,placeholder,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(placeholder)inp.placeholder=placeholder;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value)});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next){next.focus()}else{addItemRow()}}});td.appendChild(inp);return td}
  tr.appendChild(cellInput(it.item,'Item',v=>{it.item=v}))
  tr.appendChild(cellInput(it.desc,'Description',v=>{it.desc=v}))
  tr.appendChild(cellInput(it.vcode,'Vendor Code',v=>{it.vcode=v}))
  tr.appendChild(cellInput(it.qty,'0',v=>{it.qty=v;updateRowSubtotal(tr,idx)},{type:'number',step:'1',min:'0'}))
  tr.appendChild(cellInput(it.price,'0.00',v=>{it.price=v;updateRowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(cellInput(it.discount,'0.00',v=>{it.discount=v;updateRowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  const tdSub=document.createElement('td');tdSub.textContent=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount)).toFixed(2);tdSub.className='po-row-subtotal';tr.appendChild(tdSub)
  tr.addEventListener('click',()=>{document.querySelectorAll('#po-items tbody tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');__poSelectedIndex=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);itemsHost.appendChild(table);calcTotals(items)}
function updateRowSubtotal(tr,idx){const items=__poItemMap.get(__poCurrentKey)||[];const it=items[idx];const sub=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount));const td=tr.querySelector('.po-row-subtotal');if(td)td.textContent=sub.toFixed(2);calcTotals(items)}
function addItemRow(){const items=__poItemMap.get(__poCurrentKey)||[];items.push({item:'',desc:'',vcode:'',qty:'0',price:'0.00',discount:'0.00'});__poItemMap.set(__poCurrentKey,items);renderItems();const last=document.querySelector('#po-items tbody tr:last-child input');if(last)last.focus()}
function deleteItemRow(){const items=__poItemMap.get(__poCurrentKey)||[];if(__poSelectedIndex>=0&&__poSelectedIndex<items.length){items.splice(__poSelectedIndex,1);__poSelectedIndex=-1;renderItems()}}
function bindPO(row){const map=['po-vendor','po-contact','po-phone','po-vendor-address','po-number','po-date','po-status','po-shipto','po-terms','po-due','po-req-ship','po-remarks','po-tax','po-nonvendor','po-currency','po-subtotal','po-freight','po-total','po-paid','po-balance'];map.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)});const key=String(pick(row,['OrderNo','OrderNumber','PO','PurchaseOrderNo','DocumentNo'])||'');__poCurrentKey=key||('__new__'+Date.now());if(!__poItemMap.has(__poCurrentKey))__poItemMap.set(__poCurrentKey,[]);renderItems();const freightEl=document.getElementById('po-freight');const paidEl=document.getElementById('po-paid');if(freightEl)freightEl.addEventListener('input',()=>calcTotals(__poItemMap.get(__poCurrentKey)||[]));if(paidEl)paidEl.addEventListener('input',()=>calcTotals(__poItemMap.get(__poCurrentKey)||[]))}
async function initPurchaseOrderPage(){if(__poLoaded){filterPO();return}try{const s=await fetch(api('/api/schema?table=purchase_order'));const sj=await s.json().catch(()=>({}));__poSchema=sj.schema||[];const d=await fetch(api('/api/data?table=purchase_order&limit=1000'));const dj=await d.json().catch(()=>({}));__poRows=dj.rows||[];__poLoaded=true;['po-q-num'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterPO)});const ref=document.getElementById('po-refresh');if(ref)ref.addEventListener('click',async()=>{__poLoaded=false;await initPurchaseOrderPage()});const statusSel=document.getElementById('po-q-status');const vendorSel=document.getElementById('po-q-vendor');if(statusSel){const set=new Set();__poRows.forEach(r=>{const v=String(pick(r,['Status'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;statusSel.appendChild(opt)});statusSel.addEventListener('change',filterPO)}if(vendorSel){const set=new Set();__poRows.forEach(r=>{const v=String(pick(r,['Vendor','VendorName','Supplier','Company','Name'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;vendorSel.appendChild(opt)});vendorSel.addEventListener('change',filterPO)}document.querySelectorAll('#section-purchase-order .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-purchase-order .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-purchase-order .tabpane').forEach(p=>p.classList.toggle('active',p.id==='po-tab-'+btn.dataset.tab))})});['po-q-from','po-q-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',filterPO)});const addBtn=document.getElementById('po-item-add');const delBtn=document.getElementById('po-item-del');if(addBtn)addBtn.addEventListener('click',addItemRow);if(delBtn)delBtn.addEventListener('click',deleteItemRow);filterPO()}catch(e){const list=document.getElementById('po-list');if(list)list.textContent='Error: '+(e&&e.message||e)}}

// Sales Order page logic
let __soLoaded=false;let __soRows=[];let __soSchema=[];
const __soItemMap=new Map();let __soCurrentKey=null;let __soSelectedIndex=-1;
function renderSOList(items){const list=document.getElementById('so-list');const count=document.getElementById('so-count');if(!list)return;list.innerHTML='';if(!items.length){list.textContent='No orders';if(count)count.textContent='0';return}const keyNames=['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo'];items.forEach((row,idx)=>{const div=document.createElement('div');div.className='vendor-item';const n=String(pick(row,keyNames)||'(no number)');const s=String(pick(row,['Status'])||'');div.textContent=n+(s?(' — '+s):'');div.addEventListener('click',()=>{document.querySelectorAll('#so-list .vendor-item').forEach(i=>i.classList.remove('active'));div.classList.add('active');bindSO(row)});list.appendChild(div);if(idx===0){div.classList.add('active');bindSO(row)}});if(count)count.textContent=String(items.length)}
function filterSO(){const qn=(document.getElementById('so-q-num')?.value||'').toLowerCase();const qs=(document.getElementById('so-q-status')?.value||'').toLowerCase();const qc=(document.getElementById('so-q-customer')?.value||'').toLowerCase();const qf=(document.getElementById('so-q-from')?.value||'').trim();const qt=(document.getElementById('so-q-to')?.value||'').trim();const from=qf?new Date(qf):null;const to=qt?new Date(qt):null;const items=__soRows.filter(r=>{const num=(String(pick(r,['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo']))).toLowerCase();const stat=(String(pick(r,['Status']))).toLowerCase();const cust=(String(pick(r,['Customer','CustomerName','Company','Name']))).toLowerCase();let pass=(!qn||num.includes(qn))&&(!qs||stat===qs)&&(!qc||cust===qc);if(pass&&(from||to)){const dv=pick(r,['Date','OrderDate']);const d=dv?new Date(dv):null;if(d&&d.toString()!=='Invalid Date'){if(from&&d<from)pass=false;if(to){const td=new Date(to);td.setHours(23,59,59,999);if(d>td)pass=false}}}return pass});renderSOList(items)}
function calcSOTotals(items){let subtotal=0;items.forEach(it=>{const qty=parseNum(it.qty);const price=parseNum(it.price);const disc=parseNum(it.discount);subtotal+=Math.max(0,(qty*price)-disc)});const total=subtotal;const paid=parseNum(document.getElementById('so-paid')&&document.getElementById('so-paid').value);const balance=Math.max(0,total-paid);const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val.toFixed(2)};set('so-subtotal',subtotal);set('so-total',total);set('so-balance',balance)}
function renderSOItems(){const host=document.getElementById('so-items');if(!host)return;const items=__soItemMap.get(__soCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Item','Description','Quantity','Unit Price','Discount','Sub-Total'].forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');items.forEach((it,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function cellInput(value,placeholder,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(placeholder)inp.placeholder=placeholder;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value)});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next){next.focus()}else{addSOItemRow()}}});td.appendChild(inp);return td}
  tr.appendChild(cellInput(it.item,'Item',v=>{it.item=v}))
  tr.appendChild(cellInput(it.desc,'Description',v=>{it.desc=v}))
  tr.appendChild(cellInput(it.qty,'0',v=>{it.qty=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'1',min:'0'}))
  tr.appendChild(cellInput(it.price,'0.00',v=>{it.price=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(cellInput(it.discount,'0.00',v=>{it.discount=v;updateSORowSubtotal(tr,idx)},{type:'number',step:'0.01',min:'0'}))
  const tdSub=document.createElement('td');tdSub.textContent=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount)).toFixed(2);tdSub.className='so-row-subtotal';tr.appendChild(tdSub)
  tr.addEventListener('click',()=>{document.querySelectorAll('#so-items tbody tr').forEach(r=>r.classList.remove('active'));tr.classList.add('active');__soSelectedIndex=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table);calcSOTotals(items)}
function updateSORowSubtotal(tr,idx){const items=__soItemMap.get(__soCurrentKey)||[];const it=items[idx];const sub=((parseNum(it.qty)*parseNum(it.price))-parseNum(it.discount));const td=tr.querySelector('.so-row-subtotal');if(td)td.textContent=sub.toFixed(2);calcSOTotals(items)}
function addSOItemRow(){const items=__soItemMap.get(__soCurrentKey)||[];items.push({item:'',desc:'',qty:'0',price:'0.00',discount:'0.00'});__soItemMap.set(__soCurrentKey,items);renderSOItems();const last=document.querySelector('#so-items tbody tr:last-child input');if(last)last.focus()}
function deleteSOItemRow(){const items=__soItemMap.get(__soCurrentKey)||[];if(__soSelectedIndex>=0&&__soSelectedIndex<items.length){items.splice(__soSelectedIndex,1);__soSelectedIndex=-1;renderSOItems()}}
function bindSO(row){const map=['so-customer','so-contact','so-phone','so-address','so-number','so-date','so-status','so-shipto','so-terms','so-due','so-req-ship','so-remarks','so-tax','so-currency','so-subtotal','so-total','so-paid','so-balance'];map.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);el.value=pick(row,cols)});const key=String(pick(row,['OrderNo','OrderNumber','SO','SalesOrderNo','DocumentNo'])||'');__soCurrentKey=key||('__new__'+Date.now());if(!__soItemMap.has(__soCurrentKey))__soItemMap.set(__soCurrentKey,[]);renderSOItems();const paidEl=document.getElementById('so-paid');if(paidEl)paidEl.addEventListener('input',()=>calcSOTotals(__soItemMap.get(__soCurrentKey)||[]))}
async function initSalesOrderPage(){if(__soLoaded){filterSO();return}try{const s=await fetch(api('/api/schema?table=sales_order'));const sj=await s.json().catch(()=>({}));__soSchema=sj.schema||[];const d=await fetch(api('/api/data?table=sales_order&limit=1000'));const dj=await d.json().catch(()=>({}));__soRows=dj.rows||[];__soLoaded=true;['so-q-num'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterSO)});const ref=document.getElementById('so-refresh');if(ref)ref.addEventListener('click',async()=>{__soLoaded=false;await initSalesOrderPage()});const statusSel=document.getElementById('so-q-status');const custSel=document.getElementById('so-q-customer');if(statusSel){const set=new Set();__soRows.forEach(r=>{const v=String(pick(r,['Status'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;statusSel.appendChild(opt)});statusSel.addEventListener('change',filterSO)}if(custSel){const set=new Set();__soRows.forEach(r=>{const v=String(pick(r,['Customer','CustomerName','Company','Name'])||'').trim();if(v)set.add(v)});[...set].sort().forEach(v=>{const opt=document.createElement('option');opt.value=v.toLowerCase();opt.textContent=v;custSel.appendChild(opt)});custSel.addEventListener('change',filterSO)}document.querySelectorAll('#section-sales-order .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-sales-order .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-sales-order .tabpane').forEach(p=>p.classList.toggle('active',p.id==='so-tab-'+btn.dataset.tab))})});['so-q-from','so-q-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',filterSO)});const addBtn=document.getElementById('so-item-add');const delBtn=document.getElementById('so-item-del');if(addBtn)addBtn.addEventListener('click',addSOItemRow);if(delBtn)delBtn.addEventListener('click',deleteSOItemRow);filterSO()}catch(e){const list=document.getElementById('so-list');if(list)list.textContent='Error: '+(e&&e.message||e)}}
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
  // tabs
  document.querySelectorAll('#section-vendor .tab').forEach(btn=>{
    btn.addEventListener('click',()=>{document.querySelectorAll('#section-vendor .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-vendor .tabpane').forEach(p=>p.classList.toggle('active',p.id==='vendor-tab-'+btn.dataset.tab))})
  })
  if(__vendorLoaded){filterVendors();return}
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
    // wire filters
    ['vendor-q-name','vendor-q-contact','vendor-q-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterVendors)})
    const ref=document.getElementById('vendor-refresh');if(ref)ref.addEventListener('click',async()=>{__vendorLoaded=false;await initVendorPage()})
    const imp=document.getElementById('vendor-import');if(imp)imp.addEventListener('click',async()=>{imp.disabled=true;imp.textContent='Importing...';try{const r=await fetch(api('/api/vendors/import-from-po'),{method:'POST'});const j=await r.json().catch(()=>({}));imp.textContent=r.ok?('Imported '+(j.added||0)):('Import Error');await initVendorPage()}finally{imp.disabled=false;imp.textContent='Import From PO'}})
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
function bindInventory(row){const ids=['inv-name','inv-category','inv-type','inv-description','inv-tax-code','inv-cash','inv-account','inv-check','inv-cost-method','inv-barcode','inv-reorder-point','inv-reorder-qty','inv-default-loc','inv-default-subloc','inv-last-vendor','inv-uom-std','inv-uom-sales','inv-uom-purch','inv-remarks','inv-len','inv-wid','inv-hei','inv-wei'];ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;const cols=parseCols(el);if(el.tagName==='SELECT'){const v=pick(row,cols);if(v){[...el.options].forEach(o=>{o.selected=(o.textContent.toLowerCase()===String(v).toLowerCase())})}}else{el.value=pick(row,cols)}});const kv=document.getElementById('inv-info');if(kv){kv.innerHTML='';Object.keys(row||{}).forEach(k=>{const kEl=document.createElement('div');kEl.className='k';kEl.textContent=k;const vEl=document.createElement('div');vEl.className='v';vEl.textContent=String(row[k]??'');kv.appendChild(kEl);kv.appendChild(vEl)})};const key=String(pick(row,['Code','ItemCode','SKU','Name','ItemName','Item'])||'');__invCurrentKey=key||('__new__'+Date.now());if(!__invLocMap.has(__invCurrentKey))__invLocMap.set(__invCurrentKey,[{location:'Default Location',sublocation:'',qty:'0'}]);if(!__invBOMMap.has(__invCurrentKey))__invBOMMap.set(__invCurrentKey,[]);if(!__invVendorsMap.has(__invCurrentKey))__invVendorsMap.set(__invCurrentKey,[]);if(!__invTrackMap.has(__invCurrentKey))__invTrackMap.set(__invCurrentKey,[]);renderInvLocations();renderInvBOM();renderInvVendors();renderInvTracking();renderInvMovement();renderInvOrders();loadInventoryPicture();loadInvExtended()}
function invNum(v){if(v==null||v==='')return 0;const n=Number(String(v).replace(/[^0-9.+-]/g,''));return isNaN(n)?0:n}
function renderInvBOM(){const host=document.getElementById('inv-bom');if(!host)return;const rows=__invBOMMap.get(__invCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Component Item','Description','Quantity','Cost'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>{onchange(inp.value);calcInvBOMTotal()});inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvBOMRow()}});td.appendChild(inp);return td}
  tr.appendChild(tdInput(r.item,'Item',v=>{r.item=v}))
  tr.appendChild(tdInput(r.desc,'Description',v=>{r.desc=v}))
  tr.appendChild(tdInput(r.qty,'0',v=>{r.qty=v},{type:'number',step:'1',min:'0'}))
  tr.appendChild(tdInput(r.cost,'0.00',v=>{r.cost=v},{type:'number',step:'0.01',min:'0'}))
  tr.addEventListener('click',()=>{document.querySelectorAll('#inv-bom tbody tr').forEach(rr=>rr.classList.remove('active'));tr.classList.add('active');__invBOMSel=idx})
  tbody.appendChild(tr)
});table.appendChild(tbody);host.appendChild(table);calcInvBOMTotal()}
function calcInvBOMTotal(){const rows=__invBOMMap.get(__invCurrentKey)||[];let total=0;rows.forEach(r=>{total+=invNum(r.qty)*invNum(r.cost)});const el=document.getElementById('inv-bom-total');if(el)el.value=total.toFixed(2)}
function addInvBOMRow(){const rows=__invBOMMap.get(__invCurrentKey)||[];rows.push({item:'',desc:'',qty:'0',cost:'0.00'});__invBOMMap.set(__invCurrentKey,rows);renderInvBOM();const last=document.querySelector('#inv-bom tbody tr:last-child input');if(last)last.focus()}
function delInvBOMRow(){const rows=__invBOMMap.get(__invCurrentKey)||[];if(__invBOMSel>=0&&__invBOMSel<rows.length){rows.splice(__invBOMSel,1);__invBOMSel=-1;renderInvBOM()}}
function renderInvVendors(){const host=document.getElementById('inv-vendors');if(!host)return;const rows=__invVendorsMap.get(__invCurrentKey)||[];host.innerHTML='';const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');['Vendor','Vendor\'s Price','Vendor Product Code'].forEach(t=>{const th=document.createElement('th');th.textContent=t;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach((r,idx)=>{const tr=document.createElement('tr');tr.dataset.index=String(idx);function tdInput(value,ph,onchange,opts){const td=document.createElement('td');const inp=document.createElement('input');inp.className='inp';inp.value=value||'';if(ph)inp.placeholder=ph;Object.assign(inp,opts||{});inp.addEventListener('input',()=>onchange(inp.value));inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=inp.closest('td').nextElementSibling?.querySelector('input');if(next)next.focus();else addInvVendorRow()}});td.appendChild(inp);return td}
  tr.appendChild(tdInput(r.vendor,'Vendor',v=>{r.vendor=v}))
  tr.appendChild(tdInput(r.price,'0.00',v=>{r.price=v},{type:'number',step:'0.01',min:'0'}))
  tr.appendChild(tdInput(r.code,'Code',v=>{r.code=v}))
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
async function initInventoryPage(){if(__invLoaded){filterInventory();return}try{const s=await fetch(api('/api/schema?table=inventory'));const sj=await s.json().catch(()=>({}));__invSchema=sj.schema||[];const d=await fetch(api('/api/data?table=inventory&limit=1000'));const dj=await d.json().catch(()=>({}));__invRows=dj.rows||[];__invLoaded=true;['inv-q-code','inv-q-desc','inv-q-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',filterInventory)});const ref=document.getElementById('inv-refresh');if(ref)ref.addEventListener('click',async()=>{__invLoaded=false;await initInventoryPage()});document.querySelectorAll('#section-inventory .tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#section-inventory .tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#section-inventory .tabpane').forEach(p=>p.classList.toggle('active',p.id==='inv-tab-'+btn.dataset.tab))})});const addBtn=document.getElementById('inv-loc-add');const delBtn=document.getElementById('inv-loc-del');if(addBtn)addBtn.addEventListener('click',addInvLocRow);if(delBtn)delBtn.addEventListener('click',delInvLocRow);const picBrowse=document.getElementById('inv-pic-browse');const picClear=document.getElementById('inv-pic-clear');if(picBrowse)picBrowse.addEventListener('click',browseInventoryPicture);if(picClear)picClear.addEventListener('click',clearInventoryPicture);const bomAdd=document.getElementById('inv-bom-add');const bomDel=document.getElementById('inv-bom-del');if(bomAdd)bomAdd.addEventListener('click',addInvBOMRow);if(bomDel)bomDel.addEventListener('click',delInvBOMRow);const venAdd=document.getElementById('inv-vendor-add');const venDel=document.getElementById('inv-vendor-del');if(venAdd)venAdd.addEventListener('click',addInvVendorRow);if(venDel)venDel.addEventListener('click',delInvVendorRow);const trackAdd=document.getElementById('inv-track-add');const trackDel=document.getElementById('inv-track-del');if(trackAdd)trackAdd.addEventListener('click',addInvTrackRow);if(trackDel)trackDel.addEventListener('click',delInvTrackRow);const trackType=document.getElementById('inv-tracking-type');if(trackType)trackType.addEventListener('change',renderInvTracking);const scanBtn=document.getElementById('inv-track-scan');if(scanBtn)scanBtn.addEventListener('click',toggleScanMode);const scanInp=document.getElementById('inv-track-scan-input');if(scanInp)scanInp.addEventListener('keydown',handleScanEnter);const genBtn=document.getElementById('inv-track-gen');if(genBtn)genBtn.addEventListener('click',addNTrackRows);const fefoBtn=document.getElementById('inv-track-fefo');if(fefoBtn)fefoBtn.addEventListener('click',fefoAllocate);const expBtn=document.getElementById('inv-track-export');if(expBtn)expBtn.addEventListener('click',exportTrackingCSV);const impBtn=document.getElementById('inv-track-import');if(impBtn)impBtn.addEventListener('click',importTrackingCSV);const saveBtn=document.getElementById('inv-save');if(saveBtn)saveBtn.addEventListener('click',saveInvExtended);filterInventory();renderInvMovement();renderInvOrders()}catch(e){const list=document.getElementById('inv-list');if(list)list.textContent='Error: '+(e&&e.message||e)}}
