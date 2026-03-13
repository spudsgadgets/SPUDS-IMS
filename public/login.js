window.API_BASE=(location.protocol==='file:'? 'http://localhost:3200' : '')
function api(path){return window.API_BASE+path}
const u=document.getElementById('login-username')
const p=document.getElementById('login-password')
const btn=document.getElementById('login-submit')
const remember=document.getElementById('login-remember')
const logoutBtn=document.getElementById('login-logout')
const statusEl=document.getElementById('login-status')
const brandLogo=document.getElementById('brand-logo')
const verEl=document.getElementById('login-ver')
function applyLogo(src){if(!brandLogo)return;if(src){brandLogo.src=src;brandLogo.style.display='inline-block'}else{brandLogo.removeAttribute('src');brandLogo.style.display='none'}}
let savedLogo=null;try{savedLogo=localStorage.getItem('logoSrc')}catch{};applyLogo(savedLogo||'')
async function ensureVersion(){try{if(!verEl)return;const cur=(verEl.textContent||'').trim();if(cur)return;const m=/\bIMS\s+v([0-9][^\s]*)/i.exec(document.title||'');if(m&&m[1]){verEl.textContent='v'+m[1];return}const r=await fetch(api('/api/version'));const j=await r.json().catch(()=>({}));const ver=j&&j.version;if(ver){verEl.textContent='v'+ver;if(!/\bIMS\s+v/i.test(document.title||''))document.title='IMS v'+ver}}catch{}}
ensureVersion()
async function doLogin(){
  if(statusEl)statusEl.textContent='Logging in...'
  try{
    const username=String(u?.value||'').trim()
    const password=String(p?.value||'')
    const payload={username,password,remember:!!(remember&&remember.checked)}
    const r=await fetch(api('/api/auth/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'include'})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(statusEl)statusEl.textContent='Login error: '+(j.error||r.status);return}
    try{if(j&&j.token){localStorage.setItem('ims_token',String(j.token))}}catch{}
    if(statusEl)statusEl.textContent='Logged in'
    location.href='./index.html'
  }catch(e){if(statusEl)statusEl.textContent='Login error: '+(e&&e.message||e)}
}
window.doLogin=doLogin
if(btn)btn.addEventListener('click',doLogin)
document.addEventListener('keydown',(e)=>{if(e.key==='Enter')doLogin()})
function getAuthHeaders(){let h={};try{const t=localStorage.getItem('ims_token');if(t)h['Authorization']='Bearer '+t}catch{};return h}
async function checkMe(){try{const r=await fetch(api('/api/auth/me'),{credentials:'include',headers:getAuthHeaders()});const j=await r.json().catch(()=>({}));if(r.ok&&j.user){location.href='./index.html'}}catch{}}
;(function(){try{const q=new URLSearchParams(location.search);const skip=q.has('stay')||q.has('force')||q.get('noredirect')==='1';if(!skip)checkMe()}catch{}})()
if(logoutBtn)logoutBtn.addEventListener('click',async()=>{
  if(statusEl)statusEl.textContent='Logging out...'
  try{
    const r=await fetch(api('/api/auth/logout'),{method:'POST',credentials:'include',headers:getAuthHeaders()})
    const j=await r.json().catch(()=>({}))
    if(!r.ok){if(statusEl)statusEl.textContent='Logout error: '+(j.error||r.status);return}
    if(statusEl)statusEl.textContent='Logged out'
  }catch(e){if(statusEl)statusEl.textContent='Logout error: '+(e&&e.message||e)}
})
