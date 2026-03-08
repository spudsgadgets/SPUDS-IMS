function parseCSV(text) {
  const rows = []
  let i = 0, cur = '', inq = false
  const res = []
  for (let c of text.replace(/\r/g,'')) {
    if (c === '"') { inq = !inq; continue }
    if (c === ',' && !inq) { res.push(cur); cur = ''; continue }
    if (c === '\n' && !inq) { res.push(cur); rows.push(res.slice()); res.length = 0; cur = ''; continue }
    cur += c
  }
  if (cur.length || res.length) { res.push(cur); rows.push(res.slice()) }
  const header = rows[0] || []
  const data = rows.slice(1).map(r => {
    const o = {}
    header.forEach((h, idx) => { o[h] = r[idx] || '' })
    return o
  })
  return { header, data }
}

function toCSV(header, data) {
  const esc = v => {
    const s = String(v ?? '')
    const need = /[",\n]/.test(s)
    return need ? '"' + s.replace(/"/g,'""') + '"' : s
  }
  const lines = []
  lines.push(header.map(esc).join(','))
  data.forEach(row => {
    lines.push(header.map(h => esc(row[h])).join(','))
  })
  return lines.join('\n')
}

function renderTable(name, container, store) {
  const schema = store.getSchema(name)
  const data = store.getData(name)
  const panel = document.createElement('div')
  panel.className = 'panel'
  const controls = document.createElement('div')
  controls.className = 'controls'
  const addBtn = document.createElement('button')
  addBtn.textContent = 'Add Row'
  const exportBtn = document.createElement('button')
  exportBtn.textContent = 'Export CSV'
  controls.appendChild(addBtn)
  controls.appendChild(exportBtn)
  panel.appendChild(controls)
  const table = document.createElement('table')
  table.className = 'table'
  const thead = document.createElement('thead')
  const trh = document.createElement('tr')
  schema.forEach(h => {
    const th = document.createElement('th')
    th.textContent = h
    trh.appendChild(th)
  })
  thead.appendChild(trh)
  table.appendChild(thead)
  const tbody = document.createElement('tbody')
  data.forEach(row => {
    const tr = document.createElement('tr')
    schema.forEach(h => {
      const td = document.createElement('td')
      td.textContent = row[h] || ''
      if (h === 'Aged %') {
        const v = parseFloat(row[h])
        if (!isNaN(v)) {
          if (v < 20) td.classList.add('risk-low')
          else if (v <= 50) td.classList.add('risk-med')
          else td.classList.add('risk-high')
        }
      }
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  panel.appendChild(table)
  const form = document.createElement('div')
  form.className = 'row'
  const inputs = {}
  schema.forEach(h => {
    const inp = document.createElement('input')
    inp.placeholder = h
    inputs[h] = inp
    form.appendChild(inp)
  })
  const saveBtn = document.createElement('button')
  saveBtn.textContent = 'Save'
  form.appendChild(saveBtn)
  panel.appendChild(form)
  addBtn.addEventListener('click', () => {
    const tr = document.createElement('tr')
    schema.forEach(h => {
      const td = document.createElement('td')
      td.textContent = ''
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })
  saveBtn.addEventListener('click', () => {
    const obj = {}
    schema.forEach(h => { obj[h] = inputs[h].value })
    store.addRow(name, obj)
    const tr = document.createElement('tr')
    schema.forEach(h => {
      const td = document.createElement('td')
      td.textContent = obj[h] || ''
      if (h === 'Aged %') {
        const v = parseFloat(obj[h])
        if (!isNaN(v)) {
          if (v < 20) td.classList.add('risk-low')
          else if (v <= 50) td.classList.add('risk-med')
          else td.classList.add('risk-high')
        }
      }
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
    schema.forEach(h => { inputs[h].value = '' })
  })
  exportBtn.addEventListener('click', () => {
    const hdr = store.getSchema(name)
    const dat = store.getData(name)
    const csv = toCSV(hdr, dat)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name + '.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })
  container.appendChild(panel)
}

function renderSettings(container, store) {
  const modules = [
    { key:'vendor', label:'Vendors' },
    { key:'po', label:'Purchase Orders' },
    { key:'inventory', label:'Inventory' },
    { key:'products', label:'Products' },
    { key:'bom', label:'BOM' },
    { key:'sales', label:'Sales Orders' },
    { key:'customer', label:'Customers' }
  ]
  const wrap = document.createElement('div')
  modules.forEach(m => {
    const sec = document.createElement('div')
    sec.className = 'panel section'
    const h = document.createElement('h3')
    h.textContent = m.label
    const info = document.createElement('div')
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.csv,text/csv'
    const status = document.createElement('div')
    status.style.marginTop = '8px'
    sec.appendChild(h)
    sec.appendChild(inp)
    sec.appendChild(status)
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result
        const parsed = parseCSV(text)
        store.setSchema(m.key, parsed.header)
        store.setData(m.key, parsed.data)
        status.textContent = 'Loaded ' + parsed.data.length + ' rows'
      }
      reader.readAsText(f)
    })
    wrap.appendChild(sec)
  })
  container.appendChild(wrap)
}

export { parseCSV, toCSV, renderTable, renderSettings }
