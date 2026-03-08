import Store from '../store.js'
import { renderTable, parseCSV } from '../utils.js'
import MaterialsModule from './materials.js'
export default function(container){
  const panel = document.createElement('div')
  panel.className = 'panel section'
  const h = document.createElement('h3')
  h.textContent = 'Import CSV'
  const row = document.createElement('div')
  row.className = 'row'
  const makeImp = (label, key) => {
    const wrap = document.createElement('div')
    const lab = document.createElement('div')
    lab.textContent = label
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.csv,text/csv'
    const status = document.createElement('div')
    status.style.marginTop = '8px'
    wrap.appendChild(lab)
    wrap.appendChild(inp)
    wrap.appendChild(status)
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result
        const parsed = parseCSV(text)
        Store.setSchema(key, parsed.header)
        Store.setData(key, parsed.data)
        status.textContent = 'Loaded ' + parsed.data.length + ' rows'
        materialsWrap.innerHTML = ''
        MaterialsModule(materialsWrap)
      }
      reader.readAsText(f)
    })
    return wrap
  }
  const inv = makeImp('Inventory CSV', 'inventory')
  const prod = makeImp('Products CSV', 'products')
  const bom = makeImp('BOM CSV', 'bom')
  panel.appendChild(h)
  row.appendChild(inv)
  row.appendChild(prod)
  row.appendChild(bom)
  panel.appendChild(row)
  container.appendChild(panel)
  renderTable('inventory', container, Store)
  const materialsWrap = document.createElement('div')
  container.appendChild(materialsWrap)
  MaterialsModule(materialsWrap)
}
