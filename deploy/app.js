import Store from './js/store.js'
import { renderTable, renderSettings } from './js/utils.js'
import VendorModule from './js/modules/vendor.js'
import PurchaseOrderModule from './js/modules/purchase_order.js'
import InventoryModule from './js/modules/inventory.js'
import SalesModule from './js/modules/sales.js'
import CustomerModule from './js/modules/customer.js'
import SettingsModule from './js/modules/settings.js'
import ProductsModule from './js/modules/products.js'
import BOMModule from './js/modules/bom.js'
import MaterialsModule from './js/modules/materials.js'

const content = document.getElementById('content')
const links = document.querySelectorAll('.nav-links a')
const body = document.body
const themeBtn = document.getElementById('theme-btn')
const modeBtn = document.getElementById('mode-btn')
const navLinks = document.querySelector('.nav-links')
const brandLogo = document.getElementById('brand-logo')
const logoFile = document.getElementById('logo-file')

const modules = {
  vendor: VendorModule,
  po: PurchaseOrderModule,
  inventory: InventoryModule,
  products: ProductsModule,
  bom: BOMModule,
  materials: MaterialsModule,
  sales: SalesModule,
  customer: CustomerModule,
  settings: SettingsModule
}

function applyTheme(t) {
  body.classList.toggle('dark', t === 'dark')
  try { localStorage.setItem('theme', t) } catch {}
  if (themeBtn) themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark'
}

function loadModule(name) {
  content.innerHTML = ''
  links.forEach(l => l.classList.remove('active'))
  const active = document.querySelector(`.nav-links a[data-module="${name}"]`)
  if (active) active.classList.add('active')
  const fn = modules[name]
  if (fn) fn(content)
}

links.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    loadModule(e.currentTarget.dataset.module)
    if (navLinks) navLinks.classList.remove('show')
  })
})

function applyMode(m) {
  body.classList.remove('mobile','desktop')
  if (m === 'mobile') body.classList.add('mobile')
  else if (m === 'desktop') body.classList.add('desktop')
  try { localStorage.setItem('mode', m) } catch {}
  if (modeBtn) modeBtn.textContent = m === 'mobile' ? 'Desktop' : 'Mobile'
}

if (modeBtn) {
  let savedMode = null
  try { savedMode = localStorage.getItem('mode') } catch {}
  const initialMode = savedMode || (window.innerWidth <= 768 ? 'mobile' : 'desktop')
  applyMode(initialMode)
  modeBtn.addEventListener('click', () => {
    const next = body.classList.contains('mobile') ? 'desktop' : 'mobile'
    applyMode(next)
  })
}

if (themeBtn) {
  let saved = null
  try { saved = localStorage.getItem('theme') } catch {}
  const initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  applyTheme(initial)
  themeBtn.addEventListener('click', () => {
    const next = body.classList.contains('dark') ? 'light' : 'dark'
    applyTheme(next)
  })
}

function setLogo(url) {
  if (brandLogo) brandLogo.innerHTML = '<img src="'+url+'" width="20" height="20" alt="">'
}
if (brandLogo && logoFile) {
  let savedLogo = null
  try { savedLogo = localStorage.getItem('logoImage') } catch {}
  if (savedLogo) setLogo(savedLogo)
  brandLogo.addEventListener('click', () => {
    logoFile.value = ''
    logoFile.click()
  })
  logoFile.addEventListener('change', () => {
    const f = logoFile.files && logoFile.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      setLogo(url)
      try { localStorage.setItem('logoImage', url) } catch {}
    }
    reader.readAsDataURL(f)
  })
}

Store.init()
loadModule('settings')
