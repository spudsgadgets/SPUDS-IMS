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
function showSection(id){sections.forEach(s=>s.classList.toggle('section-active',s.id===('section-'+id)));navButtons.forEach(b=>b.classList.toggle('active',b.dataset.section===id));if(id==='inventory')loadTableInto('inventory','data');if(id==='vendor')loadTableInto('vendor','tbl-vendor');if(id==='purchase-order')loadTableInto('purchase_order','tbl-po');if(id==='sales-order')loadTableInto('sales_order','tbl-so');if(id==='customer')loadTableInto('customer','tbl-customer')}
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
const logoSelectBtn=document.getElementById('logo-select')
const logoSelectText=document.getElementById('logo-select-text')
const logoSelectIcon=document.getElementById('logo-select-icon')
const logoClearBtn=document.getElementById('logo-clear')
const logoPreview=document.getElementById('logo-preview')
const logoStatus=document.getElementById('logo-status')
if(file){file.addEventListener('change',()=>{if(file.files&&file.files[0]&&!tbl.value){const n=file.files[0].name.replace(/\.csv$/i,'').replace(/[^a-z0-9_]+/ig,'_');tbl.value=n||'inventory'}})}
const API_BASE=(location.protocol==='file:'? 'http://localhost:3200' : '');
function api(path){return API_BASE+path}
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
quickCount('sales_order','dash-orders')
function applyLogo(src){if(!logoImg)return;if(src){logoImg.src=src;logoImg.style.display='inline-block'}else{logoImg.removeAttribute('src');logoImg.style.display='none'};if(logoPreview){if(src){logoPreview.src=src;logoPreview.style.display='inline-block'}else{logoPreview.removeAttribute('src');logoPreview.style.display='none'}};if(logoStatus){logoStatus.textContent=src?'Logo set':'No logo'}}
let savedLogo=null;try{savedLogo=localStorage.getItem('logoSrc')}catch{};applyLogo(savedLogo||'')
if(savedLogo){if(logoSelectIcon){logoSelectIcon.src=savedLogo;logoSelectIcon.style.display='inline-block'};if(logoSelectText)logoSelectText.textContent='Change Logo'}
if(logoSelectBtn)logoSelectBtn.addEventListener('click',()=>{const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.style.display='none';picker.addEventListener('change',()=>{if(picker.files&&picker.files[0]){const f=picker.files[0];const reader=new FileReader();reader.onload=e=>{const src=e.target.result;applyLogo(src);if(logoSelectIcon){logoSelectIcon.src=src;logoSelectIcon.style.display='inline-block'};if(logoSelectText)logoSelectText.textContent='Change Logo';try{localStorage.setItem('logoSrc',src)}catch{}};reader.readAsDataURL(f)}});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)})
if(logoClearBtn)logoClearBtn.addEventListener('click',()=>{applyLogo('');if(logoSelectIcon){logoSelectIcon.removeAttribute('src');logoSelectIcon.style.display='none'};if(logoSelectText)logoSelectText.textContent='Select Logo';try{localStorage.removeItem('logoSrc')}catch{}})
const backupBtn=document.getElementById('db-backup')
const restoreBtn=document.getElementById('db-restore')
const restoreStatus=document.getElementById('db-restore-status')
if(backupBtn)backupBtn.addEventListener('click',async()=>{try{if(restoreStatus)restoreStatus.textContent='Creating backup...';const r=await fetch(api('/api/backup'));if(!r.ok){const j=await r.json().catch(()=>({}));if(restoreStatus)restoreStatus.textContent='Backup error: '+(j.error||r.status);return}const disp=r.headers.get('Content-Disposition')||'';const m=/filename=\"?([^\";]+)\"?/i.exec(disp);const name=m?m[1]:'backup.zip';const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);try{document.body.removeChild(a)}catch{}},1000);if(restoreStatus)restoreStatus.textContent='Backup downloaded'}catch(e){if(restoreStatus){const hint=(location.protocol==='file:'?' (open http://localhost:3200/ instead of the file)':'');restoreStatus.textContent='Backup error: '+(e&&e.message||e)+hint}}})
if(restoreBtn)restoreBtn.addEventListener('click',async()=>{const picker=document.createElement('input');picker.type='file';picker.accept='.sql,.zip';picker.style.display='none';picker.addEventListener('change',async()=>{if(!picker.files||!picker.files[0]){if(restoreStatus)restoreStatus.textContent='Choose a file';return}const f=picker.files[0];if(restoreStatus)restoreStatus.textContent='Restoring...';const isZip=(/\.zip$/i.test(f.name))||f.type==='application/zip';let r;if(isZip){const buf=await f.arrayBuffer();r=await fetch(api('/api/restore'),{method:'POST',headers:{'Content-Type':'application/zip'},body:new Uint8Array(buf)})}else{const text=await f.text();r=await fetch(api('/api/restore'),{method:'POST',headers:{'Content-Type':'text/plain'},body:text})}const j=await r.json().catch(()=>({}));if(restoreStatus)restoreStatus.textContent=r.ok?'Restore completed':('Restore error: '+(j.error||r.status))});document.body.appendChild(picker);picker.click();setTimeout(()=>{try{document.body.removeChild(picker)}catch{}},1000)})
