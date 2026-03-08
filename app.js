import Store from './js/store.js'
import { renderTable, renderSettings } from './js/utils.js'
import VendorModule from './js/modules/vendor.js'
import PurchaseOrderModule from './js/modules/purchase_order.js'
import InventoryModule from './js/modules/inventory.js'
import SalesModule from './js/modules/sales.js'
import CustomerModule from './js/modules/customer.js'
import SettingsModule from './js/modules/settings.js'

const content = document.getElementById('content')
const links = document.querySelectorAll('.nav-links a')

const modules = {
  vendor: VendorModule,
  po: PurchaseOrderModule,
  inventory: InventoryModule,
  sales: SalesModule,
  customer: CustomerModule,
  settings: SettingsModule
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
  })
})

Store.init()
loadModule('settings')
