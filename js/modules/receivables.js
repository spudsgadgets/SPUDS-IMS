import Store from '../store.js'
import { renderTable } from '../utils.js'
export default function(container){
  const cData = Store.getData('customer')
  const sData = Store.getData('sales')
  const rData = Store.getData('ar')
  const cSch = Store.getSchema('customer')
  const sSch = Store.getSchema('sales')
  const rSch = Store.getSchema('ar')
  const map = Store.getMap('receivables')
  const find = (arr, cands) => {
    const low = arr.map(s => String(s).toLowerCase())
    for (let c of cands) {
      const i = low.indexOf(String(c).toLowerCase())
      if (i >= 0) return arr[i]
    }
    return null
  }
  const source = map.source || 'SO'
  const custIdKey = map.customerId || find(cSch, ['CustomerID','Customer Id','Customer Code','Customer'])
  const custNameKey = map.customerName || find(cSch, ['CustomerName','Customer','Name'])
  const custTermsKey = map.customerTerms || find(cSch, ['Terms','PaymentTerms'])
  const soCustIdKey = map.soCustomerId || find(sSch, ['CustomerID','Customer Id','Customer Code','Customer'])
  const soCustNameKey = map.soCustomerName || find(sSch, ['CustomerName','Customer','Name'])
  const soNumKey = map.soNumber || find(sSch, ['SONumber','SO Number','SO','OrderNumber'])
  const orderDateKey = map.orderDate || find(sSch, ['OrderDate','Order Date','Date'])
  const expectedDateKey = map.expectedDate || find(sSch, ['ExpectedDate','ShipDate','DueDate'])
  const statusKey = map.status || find(sSch, ['Status'])
  const totalKey = map.total || find(sSch, ['Total','Amount','GrandTotal'])
  const subtotalKey = map.subtotal || find(sSch, ['Subtotal'])
  const taxKey = map.tax || find(sSch, ['Tax'])
  const freightKey = map.freight || find(sSch, ['Freight','Shipping'])
  const paidKey = map.paid || find(sSch, ['Paid','AmountPaid','Payments','PaidAmount'])
  const arInvKey = map.arInvoiceNumber || find(rSch, ['InvoiceNumber','Invoice #','Invoice'])
  const arCustIdKey = map.arCustomerId || find(rSch, ['CustomerID','Customer Id','Customer Code','Customer'])
  const arCustNameKey = map.arCustomerName || find(rSch, ['CustomerName','Customer','Name'])
  const arDateKey = map.arInvoiceDate || find(rSch, ['InvoiceDate','Date'])
  const arDueKey = map.arDueDate || find(rSch, ['DueDate','Due'])
  const arTotalKey = map.arTotal || find(rSch, ['Total','Amount'])
  const arPaidKey = map.arPaid || find(rSch, ['Paid','AmountPaid','Payments'])
  const num = v => {
    const s = String(v || '').replace(/[^0-9.\-]/g,'')
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }
  const parseTerms = t => {
    const m = /net\s*(\d+)/i.exec(String(t || ''))
    return m ? parseInt(m[1],10) : null
  }
  const addDays = (ds, d) => {
    const base = new Date(ds)
    if (isNaN(base)) return ''
    const out = new Date(base.getTime() + (d || 0) * 86400000)
    return out.toISOString().slice(0,10)
  }
  const dpd = ds => {
    const d = new Date(ds)
    if (isNaN(d)) return 0
    const t = new Date()
    const a = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.floor((a - b) / 86400000)
  }
  const cIndex = {}
  cData.forEach(c => {
    const key = custIdKey ? c[custIdKey] : (custNameKey ? c[custNameKey] : null)
    if (key != null) cIndex[String(key).toLowerCase()] = c
  })
  const rows = []
  if (source === 'AR' && rData.length) {
    rData.forEach(inv => {
      const key = arCustIdKey ? inv[arCustIdKey] : (arCustNameKey ? inv[arCustNameKey] : null)
      const vk = key != null ? String(key).toLowerCase() : null
      const c = vk ? cIndex[vk] : null
      const cn = custNameKey && c ? c[custNameKey] : (arCustNameKey ? inv[arCustNameKey] : '')
      const orderDate = arDateKey ? inv[arDateKey] : ''
      const terms = custTermsKey && c ? c[custTermsKey] : ''
      const ndays = parseTerms(terms)
      const dueDate = ndays ? addDays(orderDate, ndays) : (arDueKey ? inv[arDueKey] : '')
      const total = arTotalKey ? num(inv[arTotalKey]) : 0
      const paid = arPaidKey ? num(inv[arPaidKey]) : 0
      const outstanding = Math.max(0, total - paid)
      const age = dpd(dueDate)
      const cur = age < 0 ? outstanding : 0
      const dt = age === 0 ? outstanding : 0
      const b30 = age > 0 && age <= 30 ? outstanding : 0
      const b60 = age >= 31 && age <= 60 ? outstanding : 0
      const b90 = age >= 61 && age <= 90 ? outstanding : 0
      const b90p = age > 90 ? outstanding : 0
      const aged = b30 + b60 + b90 + b90p
      const agedPct = outstanding > 0 ? (aged / outstanding) * 100 : 0
      rows.push({
        ARInvoiceNumber: arInvKey ? inv[arInvKey] : '',
        CustomerName: cn,
        OrderDate: orderDate,
        DueDate: dueDate,
        Total: String(total),
        Paid: String(paid),
        Outstanding: String(outstanding),
        Status: '',
        Current: String(cur),
        'Due Today': String(dt),
        '0-30': String(b30),
        '31-60': String(b60),
        '61-90': String(b90),
        '90+': String(b90p),
        'Aged Total': String(aged),
        'Aged %': String(agedPct.toFixed(1))
      })
    })
  } else {
    sData.forEach(so => {
      const key = soCustIdKey ? so[soCustIdKey] : (soCustNameKey ? so[soCustNameKey] : null)
      const vk = key != null ? String(key).toLowerCase() : null
      const c = vk ? cIndex[vk] : null
      const soNum = soNumKey ? so[soNumKey] : ''
      const cn = custNameKey && c ? c[custNameKey] : (soCustNameKey ? so[soCustNameKey] : '')
      const orderDate = orderDateKey ? so[orderDateKey] : ''
      const terms = custTermsKey && c ? c[custTermsKey] : ''
      const ndays = parseTerms(terms)
      const dueDate = ndays ? addDays(orderDate, ndays) : (expectedDateKey ? so[expectedDateKey] : '')
      const subtotal = subtotalKey ? num(so[subtotalKey]) : 0
      const tax = taxKey ? num(so[taxKey]) : 0
      const freight = freightKey ? num(so[freightKey]) : 0
      const total = totalKey ? num(so[totalKey]) : (subtotal + tax + freight)
      const paid = paidKey ? num(so[paidKey]) : 0
      const outstanding = Math.max(0, total - paid)
      const status = statusKey ? so[statusKey] : ''
      const age = dpd(dueDate)
      const cur = age < 0 ? outstanding : 0
      const dt = age === 0 ? outstanding : 0
      const b30 = age > 0 && age <= 30 ? outstanding : 0
      const b60 = age >= 31 && age <= 60 ? outstanding : 0
      const b90 = age >= 61 && age <= 90 ? outstanding : 0
      const b90p = age > 90 ? outstanding : 0
      const aged = b30 + b60 + b90 + b90p
      const agedPct = outstanding > 0 ? (aged / outstanding) * 100 : 0
      rows.push({
        SONumber: soNum,
        CustomerName: cn,
        OrderDate: orderDate,
        DueDate: dueDate,
        Total: String(total),
        Paid: String(paid),
        Outstanding: String(outstanding),
        Status: status,
        Current: String(cur),
        'Due Today': String(dt),
        '0-30': String(b30),
        '31-60': String(b60),
        '61-90': String(b90),
        '90+': String(b90p),
        'Aged Total': String(aged),
        'Aged %': String(agedPct.toFixed(1))
      })
    })
  }
  const groupBy = map.groupBy || ''
  let outRows = rows
  if (groupBy === 'Customer') {
    const agg = {}
    rows.forEach(r => {
      const k = r.CustomerName || ''
      if (!agg[k]) agg[k] = { CustomerName: k, Total: 0, Paid: 0, Outstanding: 0, Current: 0, 'Due Today': 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, 'Aged Total': 0 }
      agg[k].Total += num(r.Total)
      agg[k].Paid += num(r.Paid)
      agg[k].Outstanding += num(r.Outstanding)
      agg[k].Current += num(r.Current || 0)
      agg[k]['Due Today'] += num(r['Due Today'] || 0)
      agg[k]['0-30'] += num(r['0-30'])
      agg[k]['31-60'] += num(r['31-60'])
      agg[k]['61-90'] += num(r['61-90'])
      agg[k]['90+'] += num(r['90+'])
      agg[k]['Aged Total'] += num(r['Aged Total'] || 0)
    })
    outRows = Object.values(agg).map(a => ({
      CustomerName: a.CustomerName,
      Total: String(a.Total),
      Paid: String(a.Paid),
      Outstanding: String(a.Outstanding),
      Current: String(a.Current),
      'Due Today': String(a['Due Today']),
      '0-30': String(a['0-30']),
      '31-60': String(a['31-60']),
      '61-90': String(a['61-90']),
      '90+': String(a['90+']),
      'Aged Total': String(a['Aged Total']),
      'Aged %': String((a.Outstanding ? (a['Aged Total'] / a.Outstanding) * 100 : 0).toFixed(1))
    }))
  }
  const sumTotal = outRows.reduce((acc, r) => acc + num(r.Total), 0)
  const sumPaid = outRows.reduce((acc, r) => acc + num(r.Paid), 0)
  const sumOutstanding = outRows.reduce((acc, r) => acc + num(r.Outstanding), 0)
  const sumCur = outRows.reduce((acc, r) => acc + num(r.Current || 0), 0)
  const sumOut = outRows.reduce((acc, r) => acc + num(r.Outstanding || 0), 0)
  const sumDT = outRows.reduce((acc, r) => acc + num(r['Due Today'] || 0), 0)
  const sumB30 = outRows.reduce((acc, r) => acc + num(r['0-30'] || 0), 0)
  const sumB60 = outRows.reduce((acc, r) => acc + num(r['31-60'] || 0), 0)
  const sumB90 = outRows.reduce((acc, r) => acc + num(r['61-90'] || 0), 0)
  const sumB90p = outRows.reduce((acc, r) => acc + num(r['90+'] || 0), 0)
  const sumAged = outRows.reduce((acc, r) => acc + num(r['Aged Total'] || 0), 0)
  const sumAgedPct = sumOut ? ((sumAged / sumOut) * 100) : 0
  let schema = []
  if (groupBy === 'Customer') {
    schema = ['CustomerName','Total','Paid','Outstanding','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
  } else if (source === 'AR' && rData.length) {
    schema = ['ARInvoiceNumber','CustomerName','OrderDate','DueDate','Total','Paid','Outstanding','Status','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
  } else {
    schema = ['SONumber','CustomerName','OrderDate','DueDate','Total','Paid','Outstanding','Status','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
  }
  Store.setSchema('receivables', schema)
  Store.setData('receivables', outRows)
  const summary = document.createElement('div')
  summary.className = 'panel'
  const s1 = document.createElement('div')
  s1.textContent = 'Rows: ' + String(outRows.length)
  const s2 = document.createElement('div')
  s2.textContent = 'Total: ' + String(sumTotal)
  const s3 = document.createElement('div')
  s3.textContent = 'Paid: ' + String(sumPaid)
  const s4 = document.createElement('div')
  s4.textContent = 'Outstanding: ' + String(sumOutstanding)
  const sc = document.createElement('div')
  sc.textContent = 'Current: ' + String(sumCur)
  const sdt = document.createElement('div')
  sdt.textContent = 'Due Today: ' + String(sumDT)
  const s5 = document.createElement('div')
  s5.textContent = '0-30: ' + String(sumB30)
  const s6 = document.createElement('div')
  s6.textContent = '31-60: ' + String(sumB60)
  const s7 = document.createElement('div')
  s7.textContent = '61-90: ' + String(sumB90)
  const s8 = document.createElement('div')
  s8.textContent = '90+: ' + String(sumB90p)
  const s9 = document.createElement('div')
  s9.textContent = 'Aged Total: ' + String(sumAged)
  const s10 = document.createElement('div')
  s10.textContent = 'Aged %: ' + String(sumAgedPct.toFixed(1))
  ;(() => {
    const v = sumAgedPct
    const cls = v < 20 ? 'risk-low' : (v <= 50 ? 'risk-med' : 'risk-high')
    s10.classList.add(cls)
  })()
  summary.appendChild(s1)
  summary.appendChild(s2)
  summary.appendChild(s3)
  summary.appendChild(s4)
  summary.appendChild(sc)
  summary.appendChild(sdt)
  summary.appendChild(s5)
  summary.appendChild(s6)
  summary.appendChild(s7)
  summary.appendChild(s8)
  summary.appendChild(s9)
  summary.appendChild(s10)
  container.appendChild(summary)
  const custAgg = {}
  rows.forEach(r => {
    const k = r.CustomerName || ''
    if (!custAgg[k]) custAgg[k] = { CustomerName: k, Outstanding: 0, AgedTotal: 0 }
    custAgg[k].Outstanding += num(r.Outstanding)
    custAgg[k].AgedTotal += num(r['Aged Total'] || 0)
  })
  const top = Object.values(custAgg).sort((a,b) => b.Outstanding - a.Outstanding).slice(0,5)
  if (top.length) {
    const topPanel = document.createElement('div')
    topPanel.className = 'panel'
    const t = document.createElement('div')
    t.textContent = 'Top Customers by Outstanding'
    topPanel.appendChild(t)
    top.forEach(a => {
      const item = document.createElement('div')
      item.textContent = (a.CustomerName || '') + ': ' + String(a.Outstanding)
      const pct = a.Outstanding ? (a.AgedTotal / a.Outstanding) * 100 : 0
      const sp = document.createElement('span')
      sp.textContent = ' • Aged %: ' + String(pct.toFixed(1))
      const cls = pct < 20 ? 'risk-low' : (pct <= 50 ? 'risk-med' : 'risk-high')
      sp.classList.add(cls)
      item.appendChild(sp)
      item.style.cursor = 'pointer'
      item.addEventListener('click', () => {
        const filt = rows.filter(r => (r.CustomerName || '') === (a.CustomerName || ''))
        let schemaF = []
        let dataF = []
        if (groupBy === 'Customer') {
          const tot = filt.reduce((acc, r) => acc + num(r.Total), 0)
          const pd = filt.reduce((acc, r) => acc + num(r.Paid), 0)
          const out = filt.reduce((acc, r) => acc + num(r.Outstanding), 0)
          const curf = filt.reduce((acc, r) => acc + num(r.Current || 0), 0)
          const dtf = filt.reduce((acc, r) => acc + num(r['Due Today'] || 0), 0)
          const b30f = filt.reduce((acc, r) => acc + num(r['0-30'] || 0), 0)
          const b60f = filt.reduce((acc, r) => acc + num(r['31-60'] || 0), 0)
          const b90f = filt.reduce((acc, r) => acc + num(r['61-90'] || 0), 0)
          const b90pf = filt.reduce((acc, r) => acc + num(r['90+'] || 0), 0)
          const agedf = b30f + b60f + b90f + b90pf
          const agedpf = out ? (agedf / out) * 100 : 0
          schemaF = ['CustomerName','Total','Paid','Outstanding','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
          dataF = [{ CustomerName: a.CustomerName || '', Total: String(tot), Paid: String(pd), Outstanding: String(out), Current: String(curf), 'Due Today': String(dtf), '0-30': String(b30f), '31-60': String(b60f), '61-90': String(b90f), '90+': String(b90pf), 'Aged Total': String(agedf), 'Aged %': String(agedpf.toFixed(1)) }]
        } else {
          if (source === 'AR' && rData.length) {
            schemaF = ['ARInvoiceNumber','CustomerName','OrderDate','DueDate','Total','Paid','Outstanding','Status','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
          } else {
            schemaF = ['SONumber','CustomerName','OrderDate','DueDate','Total','Paid','Outstanding','Status','Current','Due Today','0-30','31-60','61-90','90+','Aged Total','Aged %']
          }
          dataF = filt
        }
        Store.setSchema('receivables', schemaF)
        Store.setData('receivables', dataF)
        container.innerHTML = ''
        const ft = dataF.reduce((acc, r) => acc + num(r.Total), 0)
        const fp = dataF.reduce((acc, r) => acc + num(r.Paid), 0)
        const fo = dataF.reduce((acc, r) => acc + num(r.Outstanding), 0)
        const fcur = dataF.reduce((acc, r) => acc + num(r.Current || 0), 0)
        const fdt = dataF.reduce((acc, r) => acc + num(r['Due Today'] || 0), 0)
        const fb30 = dataF.reduce((acc, r) => acc + num(r['0-30'] || 0), 0)
        const fb60 = dataF.reduce((acc, r) => acc + num(r['31-60'] || 0), 0)
        const fb90 = dataF.reduce((acc, r) => acc + num(r['61-90'] || 0), 0)
        const fb90p = dataF.reduce((acc, r) => acc + num(r['90+'] || 0), 0)
        const faged = dataF.reduce((acc, r) => acc + num(r['Aged Total'] || 0), 0)
        const fout = dataF.reduce((acc, r) => acc + num(r.Outstanding || 0), 0)
        const fagedPct = fout ? (faged / fout) * 100 : 0
        const summaryF = document.createElement('div')
        summaryF.className = 'panel'
        const f1 = document.createElement('div')
        f1.textContent = 'Filter: ' + (a.CustomerName || '')
        const f2 = document.createElement('div')
        f2.textContent = 'Rows: ' + String(dataF.length)
        const f3 = document.createElement('div')
        f3.textContent = 'Total: ' + String(ft)
        const f4 = document.createElement('div')
        f4.textContent = 'Paid: ' + String(fp)
        const f5 = document.createElement('div')
        f5.textContent = 'Outstanding: ' + String(fo)
        const fc = document.createElement('div')
        fc.textContent = 'Current: ' + String(fcur)
        const fdtDiv = document.createElement('div')
        fdtDiv.textContent = 'Due Today: ' + String(fdt)
        const f6 = document.createElement('div')
        f6.textContent = '0-30: ' + String(fb30)
        const f7 = document.createElement('div')
        f7.textContent = '31-60: ' + String(fb60)
        const f8 = document.createElement('div')
        f8.textContent = '61-90: ' + String(fb90)
        const f9 = document.createElement('div')
        f9.textContent = '90+: ' + String(fb90p)
        const f10 = document.createElement('div')
        f10.textContent = 'Aged Total: ' + String(faged)
        const f11 = document.createElement('div')
        f11.textContent = 'Aged %: ' + String(fagedPct.toFixed(1))
  ;(() => {
    const v = fagedPct
    const cls = v < 20 ? 'risk-low' : (v <= 50 ? 'risk-med' : 'risk-high')
    f11.classList.add(cls)
  })()
        const clearBtn = document.createElement('button')
        clearBtn.textContent = 'Clear Filter'
        clearBtn.addEventListener('click', () => {
          Store.setSchema('receivables', schema)
          Store.setData('receivables', outRows)
          container.innerHTML = ''
          const s1b = document.createElement('div')
          s1b.textContent = 'Rows: ' + String(outRows.length)
          const s2b = document.createElement('div')
          s2b.textContent = 'Total: ' + String(sumTotal)
          const s3b = document.createElement('div')
          s3b.textContent = 'Paid: ' + String(sumPaid)
          const s4b = document.createElement('div')
          s4b.textContent = 'Outstanding: ' + String(sumOutstanding)
          const scb = document.createElement('div')
          scb.textContent = 'Current: ' + String(sumCur)
          const sdTb = document.createElement('div')
          sdTb.textContent = 'Due Today: ' + String(sumDT)
          const s5b = document.createElement('div')
          s5b.textContent = '0-30: ' + String(sumB30)
          const s6b = document.createElement('div')
          s6b.textContent = '31-60: ' + String(sumB60)
          const s7b = document.createElement('div')
          s7b.textContent = '61-90: ' + String(sumB90)
          const s8b = document.createElement('div')
          s8b.textContent = '90+: ' + String(sumB90p)
          const s9b = document.createElement('div')
          s9b.textContent = 'Aged Total: ' + String(sumAged)
          const s10b = document.createElement('div')
          s10b.textContent = 'Aged %: ' + String(sumAgedPct.toFixed(1))
  ;(() => {
    const v = sumAgedPct
    const cls = v < 20 ? 'risk-low' : (v <= 50 ? 'risk-med' : 'risk-high')
    s10b.classList.add(cls)
  })()
          const summaryB = document.createElement('div')
          summaryB.className = 'panel'
          summaryB.appendChild(s1b)
          summaryB.appendChild(s2b)
          summaryB.appendChild(s3b)
          summaryB.appendChild(s4b)
          summaryB.appendChild(scb)
          summaryB.appendChild(sdTb)
          summaryB.appendChild(s5b)
          summaryB.appendChild(s6b)
          summaryB.appendChild(s7b)
          summaryB.appendChild(s8b)
          summaryB.appendChild(s9b)
          summaryB.appendChild(s10b)
          container.appendChild(summaryB)
          const custAggB = {}
          rows.forEach(r => {
            const k = r.CustomerName || ''
            if (!custAggB[k]) custAggB[k] = { CustomerName: k, Outstanding: 0, AgedTotal: 0 }
            custAggB[k].Outstanding += num(r.Outstanding)
            custAggB[k].AgedTotal += num(r['Aged Total'] || 0)
          })
          const topB = Object.values(custAggB).sort((a2,b2) => b2.Outstanding - a2.Outstanding).slice(0,5)
          if (topB.length) {
            const topPanelB = document.createElement('div')
            topPanelB.className = 'panel'
            const tb = document.createElement('div')
            tb.textContent = 'Top Customers by Outstanding'
            topPanelB.appendChild(tb)
            topB.forEach(ab => {
              const it = document.createElement('div')
              it.textContent = (ab.CustomerName || '') + ': ' + String(ab.Outstanding)
              const p2 = ab.Outstanding ? (ab.AgedTotal / ab.Outstanding) * 100 : 0
              const s2 = document.createElement('span')
              s2.textContent = ' • Aged %: ' + String(p2.toFixed(1))
              const cl2 = p2 < 20 ? 'risk-low' : (p2 <= 50 ? 'risk-med' : 'risk-high')
              s2.classList.add(cl2)
              it.appendChild(s2)
              topPanelB.appendChild(it)
            })
            container.appendChild(topPanelB)
          }
          renderTable('receivables', container, Store)
        })
        summaryF.appendChild(f1)
        summaryF.appendChild(f2)
        summaryF.appendChild(f3)
        summaryF.appendChild(f4)
        summaryF.appendChild(f5)
        summaryF.appendChild(fc)
        summaryF.appendChild(fdtDiv)
        summaryF.appendChild(f6)
        summaryF.appendChild(f7)
        summaryF.appendChild(f8)
        summaryF.appendChild(f9)
        summaryF.appendChild(f10)
        summaryF.appendChild(f11)
        summaryF.appendChild(clearBtn)
        container.appendChild(summaryF)
        renderTable('receivables', container, Store)
      })
      topPanel.appendChild(item)
    })
    container.appendChild(topPanel)
  }
  renderTable('receivables', container, Store)
}
