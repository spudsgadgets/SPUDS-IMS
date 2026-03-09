const themeBtn=document.getElementById('theme-btn')
const modeBtn=document.getElementById('mode-btn')
function applyTheme(t){document.body.classList.toggle('dark',t==='dark');try{localStorage.setItem('theme',t)}catch{};if(themeBtn)themeBtn.textContent=t==='dark'?'Light':'Dark'}
function applyMode(m){document.body.classList.remove('mobile','desktop');if(m==='mobile')document.body.classList.add('mobile');else if(m==='desktop')document.body.classList.add('desktop');try{localStorage.setItem('mode',m)}catch{};if(modeBtn)modeBtn.textContent=m==='mobile'?'Desktop':'Mobile'}
let mSaved=null;try{mSaved=localStorage.getItem('mode')}catch{};applyMode(mSaved||(window.innerWidth<=768?'mobile':'desktop'))
let tSaved=null;try{tSaved=localStorage.getItem('theme')}catch{};applyTheme(tSaved||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'))
if(modeBtn)modeBtn.addEventListener('click',()=>{applyMode(document.body.classList.contains('mobile')?'desktop':'mobile')})
if(themeBtn)themeBtn.addEventListener('click',()=>{applyTheme(document.body.classList.contains('dark')?'light':'dark')})
// navigation
const navButtons=[...document.querySelectorAll('.nav-btn')]
const sections=[...document.querySelectorAll('.section')]
function showSection(id){sections.forEach(s=>s.classList.toggle('section-active',s.id===('section-'+id)));navButtons.forEach(b=>b.classList.toggle('active',b.dataset.section===id));if(id==='vendor')loadTableInto('vendor','tbl-vendor');if(id==='purchase-order')loadTableInto('purchase_order','tbl-po');if(id==='sales-order')loadTableInto('sales_order','tbl-so');if(id==='customer')loadTableInto('customer','tbl-customer')}
navButtons.forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.section)))
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
const logoImg=document.getElementById('brand-logo')
const logoUrlInput=document.getElementById('logo-url')
const logoFileInput=document.getElementById('logo-file')
const logoSetBtn=document.getElementById('logo-set')
const logoClearBtn=document.getElementById('logo-clear')
if(file){file.addEventListener('change',()=>{if(file.files&&file.files[0]&&!tbl.value){const n=file.files[0].name.replace(/\\.csv$/i,'').replace(/[^a-z0-9_]+/ig,'_');tbl.value=n||'inventory'}})}
async function importCSV(){const name=(tbl.value||'').trim();if(!name){statusEl.textContent='Enter table name';return}if(!file.files||!file.files[0]){statusEl.textContent='Choose a CSV file';return}const text=await file.files[0].text();statusEl.textContent='Uploading...';const r=await fetch('/api/import?table='+encodeURIComponent(name),{method:'PUT',headers:{'Content-Type':'text/plain'},body:text});const j=await r.json().catch(()=>({}));statusEl.textContent=r.ok?('Imported '+(j.rows||0)+' rows into '+name):('Error: '+(j.error||r.status)) ;browseTable.value=name;loadData()}
if(btn)btn.addEventListener('click',importCSV)
async function loadData(){const name=(browseTable.value||'').trim();if(!name){schemaEl.textContent='';dataEl.textContent='';return}const s=await fetch('/api/schema?table='+encodeURIComponent(name));const sj=await s.json().catch(()=>({}));schemaEl.textContent=s.ok?('Columns: '+(sj.schema||[]).join(', ')):('Schema error: '+(sj.error||s.status));const d=await fetch('/api/data?table='+encodeURIComponent(name)+'&limit=200');const dj=await d.json().catch(()=>({}));if(!d.ok){dataEl.textContent='Data error: '+(dj.error||d.status);return}const rows=dj.rows||[];if(!rows.length){dataEl.textContent='No rows';return}const cols=Object.keys(rows[0]||{});const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');cols.forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(k=>{const td=document.createElement('td');td.textContent=String(r[k]??'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);dataEl.innerHTML='';dataEl.appendChild(table)}
if(loadBtn)loadBtn.addEventListener('click',loadData)
// reusable table renderer and counts
async function loadTableInto(table,hostId){const host=document.getElementById(hostId);if(!host)return;host.textContent='Loading...';try{const s=await fetch('/api/schema?table='+encodeURIComponent(table));const sj=await s.json().catch(()=>({}));if(!s.ok){host.textContent='Schema error: '+(sj.error||s.status);return}const d=await fetch('/api/data?table='+encodeURIComponent(table)+'&limit=200');const dj=await d.json().catch(()=>({}));if(!d.ok){host.textContent='Data error: '+(dj.error||d.status);return}const rows=dj.rows||[];if(!rows.length){host.textContent='No rows';return}const cols=sj.schema||Object.keys(rows[0]||{});const tableEl=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');cols.forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);tableEl.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(k=>{const td=document.createElement('td');td.textContent=String(r[k]??'');tr.appendChild(td)});tbody.appendChild(tr)});tableEl.appendChild(tbody);host.innerHTML='';host.appendChild(tableEl)}catch(e){host.textContent='Error: '+(e&&e.message||e)}}
async function quickCount(table,elId){try{const r=await fetch('/api/count?table='+encodeURIComponent(table));const j=await r.json().catch(()=>({}));const el=document.getElementById(elId);if(!el)return;if(r.ok)el.textContent=String(j.count||0);else el.textContent='—'}catch{const el=document.getElementById(elId);if(el)el.textContent='—'}}
quickCount('inventory','dash-inventory')
quickCount('vendor','dash-vendor')
quickCount('customer','dash-customer')
quickCount('sales_order','dash-orders')
function applyLogo(src){if(!logoImg)return;if(src){logoImg.src=src;logoImg.style.display='inline-block'}else{logoImg.removeAttribute('src');logoImg.style.display='none'}}
let savedLogo=null;try{savedLogo=localStorage.getItem('logoSrc')}catch{};if(savedLogo)applyLogo(savedLogo)
if(logoSetBtn)logoSetBtn.addEventListener('click',async()=>{if(logoFileInput&&logoFileInput.files&&logoFileInput.files[0]){const f=logoFileInput.files[0];const reader=new FileReader();reader.onload=e=>{const src=e.target.result;applyLogo(src);try{localStorage.setItem('logoSrc',src)}catch{}};reader.readAsDataURL(f);return}const url=(logoUrlInput&&logoUrlInput.value||'').trim();if(url){applyLogo(url);try{localStorage.setItem('logoSrc',url)}catch{}}})
if(logoClearBtn)logoClearBtn.addEventListener('click',()=>{applyLogo('');try{localStorage.removeItem('logoSrc')}catch{}})
