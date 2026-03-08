import Store from '../store.js'
import { renderTable } from '../utils.js'
export default function(container){
  const pSch = Store.getSchema('products')
  const iSch = Store.getSchema('inventory')
  const bSch = Store.getSchema('bom')
  const pData = Store.getData('products')
  const iData = Store.getData('inventory')
  const bData = Store.getData('bom')
  const find = (arr, cands) => {
    const low = arr.map(s => String(s).toLowerCase())
    for (let c of cands) {
      const i = low.indexOf(String(c).toLowerCase())
      if (i >= 0) return arr[i]
    }
    return null
  }
  const num = v => {
    const s = String(v || '').replace(/[^0-9.\-]/g,'')
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }
  const prodSkuKey = find(pSch, ['SKU','ProductID','Product Id','Item','ItemCode','Product Code','Product'])
  const prodNameKey = find(pSch, ['Name','ProductName','Description'])
  const invSkuKey = find(iSch, ['SKU','Item','ItemCode','Product','ProductID'])
  const invQtyKey = find(iSch, ['QtyOnHand','OnHand','QOH','Quantity','Qty','Stock'])
  const bomParentKey = find(bSch, ['ParentSKU','Parent','SKU','Product','Assembly','Item'])
  const bomCompKey = find(bSch, ['ComponentSKU','Component','Child','SKU','Item','Part'])
  const bomQtyKey = find(bSch, ['QtyPer','Quantity','Per','UnitsPer','Qty'])
  const invIndex = {}
  iData.forEach(r => {
    const k = invSkuKey ? r[invSkuKey] : null
    if (k != null) invIndex[String(k).toLowerCase()] = num(invQtyKey ? r[invQtyKey] : 0)
  })
  const bomIndex = {}
  bData.forEach(r => {
    const p = bomParentKey ? r[bomParentKey] : null
    if (p == null) return
    const key = String(p).toLowerCase()
    if (!bomIndex[key]) bomIndex[key] = []
    bomIndex[key].push({
      comp: bomCompKey ? r[bomCompKey] : '',
      qty: num(bomQtyKey ? r[bomQtyKey] : 0)
    })
  })
  const rows = []
  pData.forEach(pr => {
    const sku = prodSkuKey ? pr[prodSkuKey] : ''
    const name = prodNameKey ? pr[prodNameKey] : ''
    const onHand = sku ? (invIndex[String(sku).toLowerCase()] || 0) : 0
    const bomList = sku ? (bomIndex[String(sku).toLowerCase()] || []) : []
    let buildable = null
    let shortages = 0
    if (bomList.length) {
      buildable = Infinity
      bomList.forEach(bi => {
        const csku = bi.comp || ''
        const have = csku ? (invIndex[String(csku).toLowerCase()] || 0) : 0
        const need = bi.qty || 0
        const can = need > 0 ? Math.floor(have / need) : Infinity
        if (need > 0 && have < need) shortages += 1
        buildable = Math.min(buildable, can)
      })
      if (!isFinite(buildable)) buildable = 0
    } else {
      buildable = onHand
    }
    rows.push({
      SKU: String(sku),
      Name: String(name),
      'On Hand': String(onHand),
      'Buildable': String(buildable),
      'BOM Components': String(bomList.length),
      'Shortage Components': String(shortages)
    })
  })
  const schema = ['SKU','Name','On Hand','Buildable','BOM Components','Shortage Components']
  Store.setSchema('materials', schema)
  Store.setData('materials', rows)
  const sumProducts = rows.length
  const sumOnHand = rows.reduce((acc, r) => acc + num(r['On Hand']), 0)
  const sumBuildable = rows.reduce((acc, r) => acc + num(r['Buildable']), 0)
  const summary = document.createElement('div')
  summary.className = 'panel'
  const s1 = document.createElement('div')
  s1.textContent = 'Products: ' + String(sumProducts)
  const s2 = document.createElement('div')
  s2.textContent = 'Total On Hand: ' + String(sumOnHand)
  const s3 = document.createElement('div')
  s3.textContent = 'Total Buildable: ' + String(sumBuildable)
  summary.appendChild(s1)
  summary.appendChild(s2)
  summary.appendChild(s3)
  container.appendChild(summary)
  renderTable('materials', container, Store)
}
