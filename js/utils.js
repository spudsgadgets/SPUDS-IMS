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
    { key:'customer', label:'Customers' },
    { key:'ap', label:'AP Invoices' },
    { key:'ar', label:'AR Invoices' }
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
    const fields = document.createElement('div')
    const updateFields = () => {
      const sch = store.getSchema(m.key)
      fields.textContent = sch.length ? ('Fields: ' + sch.join(', ')) : 'Fields: (none)'
    }
    sec.appendChild(h)
    sec.appendChild(inp)
    sec.appendChild(status)
    sec.appendChild(fields)
    updateFields()
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
        updateFields()
      }
      reader.readAsText(f)
    })
    wrap.appendChild(sec)
  })
  const paySec = document.createElement('div')
  paySec.className = 'panel section'
  const h2 = document.createElement('h3')
  h2.textContent = 'Payables Mapping'
  paySec.appendChild(h2)
  const row = document.createElement('div')
  row.className = 'row'
  const map = store.getMap('payables')
  const srcWrap = document.createElement('div')
  const srcLab = document.createElement('div')
  srcLab.textContent = 'Source'
  const srcSel = document.createElement('select')
  ;['PO','AP'].forEach(s => {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s
    srcSel.appendChild(opt)
  })
  srcSel.value = map.source || 'PO'
  srcWrap.appendChild(srcLab)
  srcWrap.appendChild(srcSel)
  row.appendChild(srcWrap)
  const grpWrap = document.createElement('div')
  const grpLab = document.createElement('div')
  grpLab.textContent = 'Group By'
  const grpSel = document.createElement('select')
  ;['','Vendor','PO'].forEach(s => {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s === '' ? '(none)' : s
    grpSel.appendChild(opt)
  })
  grpSel.value = map.groupBy || ''
  grpWrap.appendChild(grpLab)
  grpWrap.appendChild(grpSel)
  row.appendChild(grpWrap)
  const vSch = store.getSchema('vendor')
  const pSch = store.getSchema('po')
  const aSch = store.getSchema('ap')
  const addSelect = (label, opts, val) => {
    const wrap = document.createElement('div')
    const lab = document.createElement('div')
    lab.textContent = label
    const sel = document.createElement('select')
    const none = document.createElement('option')
    none.value = ''
    none.textContent = '(none)'
    sel.appendChild(none)
    opts.forEach(o => {
      const opt = document.createElement('option')
      opt.value = o
      opt.textContent = o
      sel.appendChild(opt)
    })
    sel.value = val || ''
    wrap.appendChild(lab)
    wrap.appendChild(sel)
    row.appendChild(wrap)
    return sel
  }
  const s_vendorId = addSelect('VendorID', vSch, map.vendorId)
  const s_vendorName = addSelect('VendorName', vSch, map.vendorName)
  const s_vendorTerms = addSelect('Vendor Terms', vSch, map.vendorTerms)
  const s_poNumber = addSelect('PO Number', pSch, map.poNumber)
  const s_poVendorId = addSelect('PO VendorID', pSch, map.poVendorId)
  const s_poVendorName = addSelect('PO VendorName', pSch, map.poVendorName)
  const s_orderDate = addSelect('Order Date', pSch, map.orderDate)
  const s_expectedDate = addSelect('Expected/Due Date', pSch, map.expectedDate)
  const s_status = addSelect('Status', pSch, map.status)
  const s_subtotal = addSelect('Subtotal', pSch, map.subtotal)
  const s_tax = addSelect('Tax', pSch, map.tax)
  const s_freight = addSelect('Freight', pSch, map.freight)
  const s_total = addSelect('Total', pSch, map.total)
  const s_paid = addSelect('Paid', pSch, map.paid)
  const s_apInvNumber = addSelect('AP Invoice #', aSch, map.apInvoiceNumber)
  const s_apVendorId = addSelect('AP VendorID', aSch, map.apVendorId)
  const s_apVendorName = addSelect('AP VendorName', aSch, map.apVendorName)
  const s_apInvDate = addSelect('AP Invoice Date', aSch, map.apInvoiceDate)
  const s_apDueDate = addSelect('AP Due Date', aSch, map.apDueDate)
  const s_apTotal = addSelect('AP Total', aSch, map.apTotal)
  const s_apPaid = addSelect('AP Paid', aSch, map.apPaid)
  paySec.appendChild(row)
  const saveMapBtn = document.createElement('button')
  saveMapBtn.textContent = 'Save Mapping'
  paySec.appendChild(saveMapBtn)
  saveMapBtn.addEventListener('click', () => {
    const m = {
      source: srcSel.value || 'PO',
      groupBy: grpSel.value || '',
      vendorId: s_vendorId.value || null,
      vendorName: s_vendorName.value || null,
      vendorTerms: s_vendorTerms.value || null,
      poNumber: s_poNumber.value || null,
      poVendorId: s_poVendorId.value || null,
      poVendorName: s_poVendorName.value || null,
      orderDate: s_orderDate.value || null,
      expectedDate: s_expectedDate.value || null,
      status: s_status.value || null,
      subtotal: s_subtotal.value || null,
      tax: s_tax.value || null,
      freight: s_freight.value || null,
      total: s_total.value || null,
      paid: s_paid.value || null,
      apInvoiceNumber: s_apInvNumber.value || null,
      apVendorId: s_apVendorId.value || null,
      apVendorName: s_apVendorName.value || null,
      apInvoiceDate: s_apInvDate.value || null,
      apDueDate: s_apDueDate.value || null,
      apTotal: s_apTotal.value || null,
      apPaid: s_apPaid.value || null
    }
    store.setMap('payables', m)
  })
  wrap.appendChild(paySec)
  const recSec = document.createElement('div')
  recSec.className = 'panel section'
  const h3 = document.createElement('h3')
  h3.textContent = 'Receivables Mapping'
  recSec.appendChild(h3)
  const rowR = document.createElement('div')
  rowR.className = 'row'
  const mapR = store.getMap('receivables')
  const srcWrapR = document.createElement('div')
  const srcLabR = document.createElement('div')
  srcLabR.textContent = 'Source'
  const srcSelR = document.createElement('select')
  ;['SO','AR'].forEach(s => {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s
    srcSelR.appendChild(opt)
  })
  srcSelR.value = mapR.source || 'SO'
  srcWrapR.appendChild(srcLabR)
  srcWrapR.appendChild(srcSelR)
  rowR.appendChild(srcWrapR)
  const grpWrapR = document.createElement('div')
  const grpLabR = document.createElement('div')
  grpLabR.textContent = 'Group By'
  const grpSelR = document.createElement('select')
  ;['','Customer','SO'].forEach(s => {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s === '' ? '(none)' : s
    grpSelR.appendChild(opt)
  })
  grpSelR.value = mapR.groupBy || ''
  grpWrapR.appendChild(grpLabR)
  grpWrapR.appendChild(grpSelR)
  rowR.appendChild(grpWrapR)
  const cSch = store.getSchema('customer')
  const sSch = store.getSchema('sales')
  const rSch = store.getSchema('ar')
  const addSelectR = (label, opts, val) => {
    const wrap = document.createElement('div')
    const lab = document.createElement('div')
    lab.textContent = label
    const sel = document.createElement('select')
    const none = document.createElement('option')
    none.value = ''
    none.textContent = '(none)'
    sel.appendChild(none)
    opts.forEach(o => {
      const opt = document.createElement('option')
      opt.value = o
      opt.textContent = o
      sel.appendChild(opt)
    })
    sel.value = val || ''
    wrap.appendChild(lab)
    wrap.appendChild(sel)
    rowR.appendChild(wrap)
    return sel
  }
  const s_customerId = addSelectR('CustomerID', cSch, mapR.customerId)
  const s_customerName = addSelectR('CustomerName', cSch, mapR.customerName)
  const s_customerTerms = addSelectR('Customer Terms', cSch, mapR.customerTerms)
  const s_soNumber = addSelectR('SO Number', sSch, mapR.soNumber)
  const s_soCustomerId = addSelectR('SO CustomerID', sSch, mapR.soCustomerId)
  const s_soCustomerName = addSelectR('SO CustomerName', sSch, mapR.soCustomerName)
  const s_soOrderDate = addSelectR('Order Date', sSch, mapR.orderDate)
  const s_soDueDate = addSelectR('Expected/Due Date', sSch, mapR.expectedDate)
  const s_soStatus = addSelectR('Status', sSch, mapR.status)
  const s_soSubtotal = addSelectR('Subtotal', sSch, mapR.subtotal)
  const s_soTax = addSelectR('Tax', sSch, mapR.tax)
  const s_soFreight = addSelectR('Freight', sSch, mapR.freight)
  const s_soTotal = addSelectR('Total', sSch, mapR.total)
  const s_soPaid = addSelectR('Paid', sSch, mapR.paid)
  const s_arInvNumber = addSelectR('AR Invoice #', rSch, mapR.arInvoiceNumber)
  const s_arCustomerId = addSelectR('AR CustomerID', rSch, mapR.arCustomerId)
  const s_arCustomerName = addSelectR('AR CustomerName', rSch, mapR.arCustomerName)
  const s_arInvDate = addSelectR('AR Invoice Date', rSch, mapR.arInvoiceDate)
  const s_arDueDate = addSelectR('AR Due Date', rSch, mapR.arDueDate)
  const s_arTotal = addSelectR('AR Total', rSch, mapR.arTotal)
  const s_arPaid = addSelectR('AR Paid', rSch, mapR.arPaid)
  recSec.appendChild(rowR)
  const saveRecBtn = document.createElement('button')
  saveRecBtn.textContent = 'Save Mapping'
  recSec.appendChild(saveRecBtn)
  saveRecBtn.addEventListener('click', () => {
    const m = {
      source: srcSelR.value || 'SO',
      groupBy: grpSelR.value || '',
      customerId: s_customerId.value || null,
      customerName: s_customerName.value || null,
      customerTerms: s_customerTerms.value || null,
      soNumber: s_soNumber.value || null,
      soCustomerId: s_soCustomerId.value || null,
      soCustomerName: s_soCustomerName.value || null,
      orderDate: s_soOrderDate.value || null,
      expectedDate: s_soDueDate.value || null,
      status: s_soStatus.value || null,
      subtotal: s_soSubtotal.value || null,
      tax: s_soTax.value || null,
      freight: s_soFreight.value || null,
      total: s_soTotal.value || null,
      paid: s_soPaid.value || null,
      arInvoiceNumber: s_arInvNumber.value || null,
      arCustomerId: s_arCustomerId.value || null,
      arCustomerName: s_arCustomerName.value || null,
      arInvoiceDate: s_arInvDate.value || null,
      arDueDate: s_arDueDate.value || null,
      arTotal: s_arTotal.value || null,
      arPaid: s_arPaid.value || null
    }
    store.setMap('receivables', m)
  })
  wrap.appendChild(recSec)
  container.appendChild(wrap)
}

export { parseCSV, toCSV, renderTable, renderSettings }
