const themeBtn=document.getElementById('theme-btn')
const modeBtn=document.getElementById('mode-btn')
function applyTheme(t){document.body.classList.toggle('dark',t==='dark');try{localStorage.setItem('theme',t)}catch{};if(themeBtn)themeBtn.textContent=t==='dark'?'Light':'Dark'}
function applyMode(m){document.body.classList.remove('mobile','desktop');if(m==='mobile')document.body.classList.add('mobile');else if(m==='desktop')document.body.classList.add('desktop');try{localStorage.setItem('mode',m)}catch{};if(modeBtn)modeBtn.textContent=m==='mobile'?'Desktop':'Mobile'}
let mSaved=null;try{mSaved=localStorage.getItem('mode')}catch{};applyMode(mSaved||(window.innerWidth<=768?'mobile':'desktop'))
let tSaved=null;try{tSaved=localStorage.getItem('theme')}catch{};applyTheme(tSaved||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'))
if(modeBtn)modeBtn.addEventListener('click',()=>{applyMode(document.body.classList.contains('mobile')?'desktop':'mobile')})
if(themeBtn)themeBtn.addEventListener('click',()=>{applyTheme(document.body.classList.contains('dark')?'light':'dark')})
const tbl=document.getElementById('table')
const file=document.getElementById('file')
const btn=document.getElementById('import')
const statusEl=document.getElementById('import-status')
const browseTable=document.getElementById('browse-table')
const loadBtn=document.getElementById('load')
const schemaEl=document.getElementById('schema')
const dataEl=document.getElementById('data')
if(file){file.addEventListener('change',()=>{if(file.files&&file.files[0]&&!tbl.value){const n=file.files[0].name.replace(/\\.csv$/i,'').replace(/[^a-z0-9_]+/ig,'_');tbl.value=n||'inventory'}})}
async function importCSV(){const name=(tbl.value||'').trim();if(!name){statusEl.textContent='Enter table name';return}if(!file.files||!file.files[0]){statusEl.textContent='Choose a CSV file';return}const text=await file.files[0].text();statusEl.textContent='Uploading...';const r=await fetch('/api/import?table='+encodeURIComponent(name),{method:'PUT',headers:{'Content-Type':'text/plain'},body:text});const j=await r.json().catch(()=>({}));statusEl.textContent=r.ok?('Imported '+(j.rows||0)+' rows into '+name):('Error: '+(j.error||r.status)) ;browseTable.value=name;loadData()}
if(btn)btn.addEventListener('click',importCSV)
async function loadData(){const name=(browseTable.value||'').trim();if(!name){schemaEl.textContent='';dataEl.textContent='';return}const s=await fetch('/api/schema?table='+encodeURIComponent(name));const sj=await s.json().catch(()=>({}));schemaEl.textContent=s.ok?('Columns: '+(sj.schema||[]).join(', ')):('Schema error: '+(sj.error||s.status));const d=await fetch('/api/data?table='+encodeURIComponent(name)+'&limit=200');const dj=await d.json().catch(()=>({}));if(!d.ok){dataEl.textContent='Data error: '+(dj.error||d.status);return}const rows=dj.rows||[];if(!rows.length){dataEl.textContent='No rows';return}const cols=Object.keys(rows[0]||{});const table=document.createElement('table');const thead=document.createElement('thead');const trh=document.createElement('tr');cols.forEach(k=>{const th=document.createElement('th');th.textContent=k;trh.appendChild(th)});thead.appendChild(trh);table.appendChild(thead);const tbody=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(k=>{const td=document.createElement('td');td.textContent=String(r[k]??'');tr.appendChild(td)});tbody.appendChild(tr)});table.appendChild(tbody);dataEl.innerHTML='';dataEl.appendChild(table)}
if(loadBtn)loadBtn.addEventListener('click',loadData)
