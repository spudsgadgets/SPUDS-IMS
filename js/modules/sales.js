import Store from '../store.js';
import { readFile, toCSV } from '../utils.js';

export default function SalesModule(container) {
  let sales = Store.getSales();
  let customers = Store.getCustomers();
  let items = Store.getItems();
  let schema = Store.getSchema();
  let qtyField = Store.getQtyField();
  const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const safeDateISO = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  };
  const isYes = (v) => String(v).toLowerCase() === 'yes' || v === true;
  const isExpired = (v) => {
    if (!v) return false;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  };
  const pickFEFOBatch = (baseItem) => {
    if (!baseItem) return null;
    const baseName = norm(baseItem[displayField] || baseItem.Name || baseItem.Item || '');
    if (!baseName) return null;
    const candidates = items.filter(i => {
      const n = norm(i[displayField] || i.Name || i.Item || '');
      const hasExp = Boolean(i.Expiration);
      const stock = Number(i?.[qtyField] || 0);
      return n === baseName && hasExp && !isExpired(i.Expiration) && stock > 0;
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => new Date(a.Expiration) - new Date(b.Expiration));
    return candidates[0];
  };
  const levelPriceFields = {
    A: 'PriceA',
    B: 'PriceB',
    C: 'PriceC',
    D: 'PriceD',
    E: 'PriceE'
  };
  const luPerSU = (item) => {
    const n = Number(item?.LUPerSU || 1);
    return n > 0 ? n : 1;
  };
  const luPerPU = (item) => {
    const n = Number(item?.LUPerPU || 1);
    return n > 0 ? n : 1;
  };
  const luPerUnit = (item, unit) => {
    if (unit === 'SU') return luPerSU(item);
    if (unit === 'PU') return luPerPU(item);
    return 1; // LU
  };

  const normalizeSale = (s) => {
    const base = (s && typeof s === 'object') ? s : {};
    const id = base.id ? String(base.id) : Store.uid();
    const orderNumber = base.orderNumber != null && String(base.orderNumber).trim() !== '' ? String(base.orderNumber) : '';
    const date = safeDateISO(base.date) || new Date().toISOString();
    const status = base.status ? String(base.status) : 'Draft';
    const customerId = base.customerId ? String(base.customerId) : '';
    const customerName = base.customerName ? String(base.customerName) : '';
    const lines = Array.isArray(base.items) ? base.items : [];
    const itemsNorm = lines
      .filter(Boolean)
      .map(l => ({
        itemId: l.itemId ? String(l.itemId) : '',
        itemName: l.itemName ? String(l.itemName) : '',
        qty: Number(l.qty || 0),
        unitPrice: Number(l.unitPrice || 0),
        unit: (l.unit ? String(l.unit) : ''),
        lot: l.lot ? String(l.lot) : '',
        serial: l.serial ? String(l.serial) : '',
        exp: l.exp ? String(l.exp) : ''
      }))
      .filter(l => l.qty > 0);
    return { ...base, id, orderNumber, date, status, customerId, customerName, items: itemsNorm };
  };
  const buildTrackingText = (lot, serial, exp) => {
    const parts = [];
    if (lot) parts.push(`Lot: ${lot}`);
    if (serial) parts.push(`SN: ${serial}`);
    if (exp) parts.push(`Exp: ${exp}`);
    return parts.length ? parts.join(', ') : '';
  };
  const findInventoryMatch = ({ itemName, lot = '', serial = '', exp = '' }) => {
    const name = norm(itemName);
    if (!name) return null;
    const wantsTracking = Boolean(norm(lot) || norm(serial) || norm(exp));
    const byName = (i) => {
      const a = norm(i[displayField]);
      const b = norm(i.Name);
      const c = norm(i.Item);
      const d = norm(i.Barcode);
      return a === name || b === name || c === name || d === name;
    };
    if (wantsTracking) {
      const matchWithTracking = items.find(i => {
        if (!byName(i)) return false;
        return norm(i.Lot) === norm(lot) && norm(i.Serial) === norm(serial) && norm(i.Expiration) === norm(exp);
      });
      if (matchWithTracking) return matchWithTracking;
    }
    return items.find(byName) || null;
  };
  
  // Try to find a good display field for items
  let displayField = 'id';
  if (schema && schema.length) {
    displayField = schema.find(f => /name|desc|item|title/i.test(f)) || schema[0];
  }

  let currentView = 'list'; 
  let activeSale = null;
  let itemPickerQuery = '';
  let itemPickerTimer = null;

  function render() {
    // Refresh data
    sales = Store.getSales();
    customers = Store.getCustomers();
    items = Store.getItems();
    schema = Store.getSchema();
    qtyField = Store.getQtyField();
    if (!Array.isArray(sales)) sales = [];
    if (!Array.isArray(customers)) customers = [];
    if (!Array.isArray(items)) items = [];
    sales = sales.filter(Boolean).map(normalizeSale);
    if (schema && schema.length) {
      displayField = schema.find(f => /name|desc|item|title/i.test(f)) || schema[0];
    }

    container.innerHTML = '';
    if (currentView === 'detail') {
      renderDetail();
    } else {
      renderList();
    }
    bindEvents();
  }

  function renderList() {
    const safeSales = Array.isArray(sales) ? sales : [];
    const html = `
      <div class="toolbar">
        <h2>Sales Orders</h2>
        <div class="actions">
          <input type="file" id="file-input" accept=".csv, .xlsx, .xls" style="display: none">
          <button id="import-btn" class="button">Import</button>
          <button id="export-btn" class="button" ${!safeSales.length ? 'disabled' : ''}>Export</button>
          <button id="create-sale-btn" class="button">New Sale</button>
        </div>
      </div>
      <div class="table-container">
        <table class="w-full">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total Items</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${safeSales.length ? safeSales.map(s => {
              const lines = Array.isArray(s.items) ? s.items : [];
              const cust = customers.find(c => c.id === s.customerId) || { name: s.customerName || 'Unknown' };
              const totalQty = lines.reduce((acc, i) => acc + Number(i?.qty || 0), 0);
              const totalAmount = lines.reduce((acc, i) => acc + (Number(i?.qty || 0) * Number(i?.unitPrice || 0)), 0);
              const d = s.date ? new Date(s.date) : null;
              const dateText = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : '-';
              return `
                <tr>
                  <td>${s.orderNumber || s.id.slice(-6)}</td>
                  <td>${dateText}</td>
                  <td>${cust.name}</td>
                  <td><span class="pill ${s.status === 'Completed' ? 'success' : 'warning'}">${s.status}</span></td>
                  <td>${totalQty}</td>
                  <td>${totalAmount.toFixed(2)}</td>
                  <td>
                    <button class="icon-btn edit-btn" data-id="${s.id}">Open</button>
                    ${s.status === 'Draft' ? `<button class="icon-btn delete-btn" data-id="${s.id}">Delete</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" style="color: var(--muted)">No sales orders loaded yet. Click Import to load inFlow_SalesOrder.csv.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  }

  function getCustomerLevel(customerId) {
    const c = customers.find(x => x.id === customerId);
    const lvl = String(c?.level || 'A').trim().toUpperCase();
    return ['A','B','C','D','E'].includes(lvl) ? lvl : 'A';
  }

  function getItemPriceForLevel(item, level) {
    if (!item) return 0;
    const field = levelPriceFields[level] || levelPriceFields.A;
    const raw = item[field];
    if (raw != null && raw !== '') return Number(raw) || 0;
    const fallback = item.UnitPrice ?? item.Price ?? 0;
    return Number(fallback) || 0;
  }
  function getItemPriceForLevelPerUnit(item, level, unit) {
    const pricePerSU = getItemPriceForLevel(item, level);
    const s = luPerSU(item);
    const p = luPerPU(item);
    if (unit === 'LU') {
      return s > 0 ? (pricePerSU / s) : pricePerSU;
    }
    if (unit === 'PU') {
      return s > 0 ? pricePerSU * (p / s) : pricePerSU * p;
    }
    return pricePerSU; // SU
  }

  function renderDetail() {
    if (!activeSale) {
      currentView = 'list';
      renderList();
      return;
    }
    activeSale = normalizeSale(activeSale);
    const isDraft = activeSale.status === 'Draft';
    const level = getCustomerLevel(activeSale.customerId);
    
    const custOptions = customers.map(c => {
      const lvl = String(c.level || 'A').toUpperCase();
      const label = ['A','B','C','D','E'].includes(lvl) ? `${c.name} (${lvl})` : c.name;
      return `<option value="${c.id}" ${c.id === activeSale.customerId ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const q = norm(itemPickerQuery);
    const allPickerItems = items;
    const pickerLimit = 300;

    const baseNameOf = (it) => norm(it?.[displayField] || it?.Name || it?.Item || '');
    const expDateOnly = (v) => {
      if (!v) return '';
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    };
    const nextExpByBase = (() => {
      const next = new Map();
      for (const it of allPickerItems) {
        const exp = it?.Expiration;
        if (!exp || isExpired(exp)) continue;
        const stock = Number(it?.[qtyField] || 0);
        if (stock <= 0) continue;
        const key = baseNameOf(it);
        if (!key) continue;
        const iso = expDateOnly(exp);
        if (!iso) continue;
        const prev = next.get(key);
        if (!prev || iso < prev) next.set(key, iso);
      }
      return next;
    })();

    const shownPickerItems = (() => {
      if (!q) {
        const hasStock = [];
        const noStock = [];
        for (const it of allPickerItems) {
          const stock = Number(it?.[qtyField] || 0);
          if (stock > 0) hasStock.push(it);
          else noStock.push(it);
          if (hasStock.length >= pickerLimit) break;
        }
        if (hasStock.length >= pickerLimit) return hasStock.slice(0, pickerLimit);
        const needed = pickerLimit - hasStock.length;
        return hasStock.concat(noStock.slice(0, needed));
      }

      let filtered = allPickerItems.filter(i => {
        const a = norm(i[displayField]);
        const b = norm(i.Name);
        const c = norm(i.Item);
        const d = norm(i.Barcode);
        return a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q);
      });

      if (filtered.length > 2000) filtered = filtered.slice(0, 2000);

      filtered.sort((a, b) => {
        const aStock = Number(a?.[qtyField] || 0);
        const bStock = Number(b?.[qtyField] || 0);
        if (aStock !== bStock) return bStock - aStock;
        const aName = String(a?.[displayField] || a?.Name || a?.Item || '');
        const bName = String(b?.[displayField] || b?.Name || b?.Item || '');
        return aName.localeCompare(bName);
      });
      return filtered.slice(0, pickerLimit);
    })();
    const itemOptions = shownPickerItems.map(i => {
      const stock = Number(i?.[qtyField] || 0);
      let label = i[displayField] || i.Name || i.Item || ('Item ' + i.id);
      
      const trackingParts = [];
      if (i.Lot) trackingParts.push(`Lot: ${i.Lot}`);
      if (i.Serial) trackingParts.push(`SN: ${i.Serial}`);
      if (i.Expiration) trackingParts.push(`Exp: ${expDateOnly(i.Expiration) || i.Expiration}`);
      
      if (trackingParts.length > 0) {
          label += ` [${trackingParts.join(', ')}]`;
          if (i.Expiration && isExpired(i.Expiration)) label += ' [EXPIRED]';
      } else {
          const nextExp = nextExpByBase.get(baseNameOf(i));
          if (nextExp) label += ` [Next Exp: ${nextExp}]`;
      }

      return `<option value="${i.id}">${label} (Stock: ${stock})</option>`;
    }).join('');

    const html = `
      <div class="toolbar">
        <button id="back-btn" class="button">Back</button>
        <h2>Sale: ${activeSale.orderNumber || activeSale.id.slice(-6)}</h2>
        ${isDraft ? `<button id="complete-btn" class="button button-primary">Complete Sale</button>` : ''}
      </div>
      
      <div class="form-grid">
        <div class="field">
          <label>Order Number</label>
          <input type="text" id="sale-number" value="${activeSale.orderNumber || ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="sale-date" value="${activeSale.date ? String(activeSale.date).split('T')[0] : ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Customer</label>
          <select id="sale-cust" ${!isDraft ? 'disabled' : ''}>
            <option value="">Select Customer</option>
            ${custOptions}
          </select>
        </div>
        <div class="field">
          <label>Customer Level</label>
          <input type="text" id="sale-level" value="${level}" disabled>
        </div>
        <div class="field">
          <label>Status</label>
          <input disabled value="${activeSale.status}">
        </div>
      </div>

      <h3>Items</h3>
      ${isDraft ? `
      <div class="add-line">
        <input type="text" id="item-filter" placeholder="Filter items..." value="${itemPickerQuery}" style="min-width: 220px">
        <select id="new-item-select" style="min-width: 300px">${itemOptions}</select>
        <input type="number" id="new-item-qty" placeholder="Qty" value="1" min="1" style="width: 80px">
        <select id="new-item-unit" style="width: 90px"></select>
        <input type="number" id="new-item-price" placeholder="Price" min="0" step="0.01" style="width: 100px">
        <input type="text" id="new-item-lot" placeholder="Lot #" style="width: 80px">
        <input type="date" id="new-item-exp" placeholder="Exp Date" style="width: 110px">
        <input type="text" id="new-item-serial" placeholder="Serial(s)" style="width: 120px">
        <button id="multi-serial-btn" class="button" title="Add multiple serials at once">Multi SN</button>
        <button id="add-line-btn" class="button">Add</button>
      </div>` : ''}

      <table class="w-full">
        <thead>
          <tr>
            <th>Item</th>
            <th>Tracking</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
            ${isDraft ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${activeSale.items.map((line, idx) => {
            const item = items.find(i => i.id === line.itemId);
            const subtotal = (Number(line.qty) * Number(line.unitPrice || 0)).toFixed(2);
            
            let trackingInfo = '-';
            const lineTracking = buildTrackingText(line.lot, line.serial, line.exp);
            if (lineTracking) {
              trackingInfo = lineTracking;
              if (line.exp && isExpired(line.exp)) trackingInfo += ' [EXPIRED]';
            } else if (item) {
              const itemTracking = buildTrackingText(item.Lot, item.Serial, item.Expiration);
              if (itemTracking) {
                trackingInfo = itemTracking;
                if (item.Expiration && isExpired(item.Expiration)) trackingInfo += ' [EXPIRED]';
              }
            }

            return `
              <tr>
                <td>${item ? (item[displayField] || item.id) : (line.itemName || 'Unknown Item')}</td>
                <td><small>${trackingInfo}</small></td>
                <td>${line.qty}</td>
                <td>${line.unit || ''}</td>
                <td>${line.unitPrice || 0}</td>
                <td>${subtotal}</td>
                ${isDraft ? `<td><button class="icon-btn remove-line-btn" data-idx="${idx}">Remove</button></td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  }

  function bindEvents() {
    if (currentView === 'list') {
      container.querySelector('#create-sale-btn').addEventListener('click', () => {
        activeSale = {
          id: Store.uid(),
          orderNumber: 'SO-' + Date.now().toString().slice(-6),
          date: new Date().toISOString(),
          customerId: customers[0]?.id || '',
          status: 'Draft',
          items: [] 
        };
        currentView = 'detail';
        render();
      });

      container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          // Clone to avoid direct mutation until save
          const found = sales.find(s => s.id === id);
          if (!found) return;
          activeSale = JSON.parse(JSON.stringify(found));
          currentView = 'detail';
          render();
        });
      });

      container.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const id = e.target.dataset.id;
              if(confirm('Delete this Sale?')) {
                  sales = sales.filter(s => s.id !== id);
                  Store.setSales(sales);
                  render();
              }
          });
      });

      // Import/Export
      const fileInput = container.querySelector('#file-input');
      if (fileInput) {
          container.querySelector('#import-btn').addEventListener('click', () => fileInput.click());
          fileInput.addEventListener('change', async (e) => {
              if (e.target.files.length) {
                  await handleImport(e.target.files[0]);
                  e.target.value = '';
              }
          });
          container.querySelector('#export-btn').addEventListener('click', exportSales);
      }

    } else {
      // Detail view events
      container.querySelector('#back-btn').addEventListener('click', () => {
          if (activeSale.status === 'Draft') saveSale();
          currentView = 'list';
          render();
      });

      if (activeSale.status === 'Draft') {
          container.querySelector('#sale-number').addEventListener('change', (e) => activeSale.orderNumber = e.target.value);
          container.querySelector('#sale-date').addEventListener('change', (e) => activeSale.date = e.target.value);
          container.querySelector('#sale-cust').addEventListener('change', (e) => {
            activeSale.customerId = e.target.value;
            const lvl = getCustomerLevel(activeSale.customerId);
            const lvlEl = container.querySelector('#sale-level');
            if (lvlEl) lvlEl.value = lvl;
            const sel = container.querySelector('#new-item-select');
            const priceEl = container.querySelector('#new-item-price');
            const unitEl = container.querySelector('#new-item-unit');
            if (sel && priceEl) {
              const it = items.find(i => i.id === sel.value);
              const unit = unitEl ? unitEl.value : 'SU';
              priceEl.value = it ? String(getItemPriceForLevelPerUnit(it, lvl, unit)) : '';
            }
          });
          const itemFilterEl = container.querySelector('#item-filter');
          if (itemFilterEl) {
            itemFilterEl.addEventListener('input', (e) => {
              itemPickerQuery = e.target.value;
              if (itemPickerTimer) clearTimeout(itemPickerTimer);
              itemPickerTimer = setTimeout(() => {
                itemPickerTimer = null;
                render();
              }, 150);
            });
          }
          const selEl = container.querySelector('#new-item-select');
          if (selEl) {
            selEl.addEventListener('change', (e) => {
              const itemId = e.target.value;
              let it = items.find(i => i.id === itemId);
              const lotEl = container.querySelector('#new-item-lot');
              const expEl = container.querySelector('#new-item-exp');
              const serialEl = container.querySelector('#new-item-serial');
              const multiBtn = container.querySelector('#multi-serial-btn');
              const applyTrackingVisibility = (x) => {
                const showLot = isYes(x?.TrackLot);
                const showExp = isYes(x?.TrackExpiration);
                const showSerial = isYes(x?.TrackSerial);
                if (lotEl) lotEl.style.display = showLot ? '' : 'none';
                if (expEl) expEl.style.display = showExp ? '' : 'none';
                if (serialEl) serialEl.style.display = showSerial ? '' : 'none';
                if (multiBtn) multiBtn.style.display = showSerial ? '' : 'none';
                const qtyEl = container.querySelector('#new-item-qty');
                if (qtyEl && showSerial) {
                  qtyEl.value = '1';
                  qtyEl.min = '1';
                  qtyEl.step = '1';
                }
              };
              if (it) {
                if (it.Expiration && isExpired(it.Expiration)) {
                  const alt = pickFEFOBatch(it);
                  if (alt) {
                    selEl.value = alt.id;
                    it = alt;
                  } else {
                    alert('Selected batch is expired and no non-expired batch found.');
                  }
                } else if (!it.Lot && !it.Serial && !it.Expiration) {
                  const alt = pickFEFOBatch(it);
                  if (alt) {
                    selEl.value = alt.id;
                    it = alt;
                  }
                }
              }
              const lvl = getCustomerLevel(activeSale.customerId);
              const priceEl = container.querySelector('#new-item-price');
              const unitEl = container.querySelector('#new-item-unit');
              // Build unit options for the item
              if (unitEl) {
                const labelLU = (it?.LooseUnit || 'LU');
                const labelSU = (it?.SalesUnit || 'SU');
                const labelPU = (it?.PurchaseUnit || 'PU');
                unitEl.innerHTML = [
                  `<option value="SU">${labelSU}</option>`,
                  `<option value="LU">${labelLU}</option>`,
                  `<option value="PU">${labelPU}</option>`
                ].join('');
                unitEl.value = (it && it.SalesUnit) ? 'SU' : 'LU';
              }
              if (priceEl) {
                const unit = (unitEl ? unitEl.value : 'SU');
                priceEl.value = it ? String(getItemPriceForLevelPerUnit(it, lvl, unit)) : '';
              }
              applyTrackingVisibility(it);
            });
            // Initialize price for current selection
            const initItem = items.find(i => i.id === selEl.value);
            const initLvl = getCustomerLevel(activeSale.customerId);
            const initPriceEl = container.querySelector('#new-item-price');
            const unitEl = container.querySelector('#new-item-unit');
            const lotEl = container.querySelector('#new-item-lot');
            const expEl = container.querySelector('#new-item-exp');
            const serialEl = container.querySelector('#new-item-serial');
            const multiBtn = container.querySelector('#multi-serial-btn');
            const applyTrackingVisibility = (x) => {
              const showLot = isYes(x?.TrackLot);
              const showExp = isYes(x?.TrackExpiration);
              const showSerial = isYes(x?.TrackSerial);
              if (lotEl) lotEl.style.display = showLot ? '' : 'none';
              if (expEl) expEl.style.display = showExp ? '' : 'none';
              if (serialEl) serialEl.style.display = showSerial ? '' : 'none';
              if (multiBtn) multiBtn.style.display = showSerial ? '' : 'none';
              const qtyEl = container.querySelector('#new-item-qty');
              if (qtyEl && showSerial) {
                qtyEl.value = '1';
                qtyEl.min = '1';
                qtyEl.step = '1';
              }
            };
            if (unitEl) {
              const labelLU = (initItem?.LooseUnit || 'LU');
              const labelSU = (initItem?.SalesUnit || 'SU');
              const labelPU = (initItem?.PurchaseUnit || 'PU');
              unitEl.innerHTML = [
                `<option value="SU">${labelSU}</option>`,
                `<option value="LU">${labelLU}</option>`,
                `<option value="PU">${labelPU}</option>`
              ].join('');
              unitEl.value = (initItem && initItem.SalesUnit) ? 'SU' : 'LU';
            }
            if (initPriceEl) {
              const unit = (unitEl ? unitEl.value : 'SU');
              initPriceEl.value = initItem ? String(getItemPriceForLevelPerUnit(initItem, initLvl, unit)) : '';
            }
            applyTrackingVisibility(initItem);
          }
          const unitEl = container.querySelector('#new-item-unit');
          if (unitEl) {
            unitEl.addEventListener('change', () => {
              const itemId = container.querySelector('#new-item-select').value;
              const it = items.find(i => i.id === itemId);
              const lvl = getCustomerLevel(activeSale.customerId);
              const unit = unitEl.value;
              const priceEl = container.querySelector('#new-item-price');
              if (priceEl) {
                priceEl.value = it ? String(getItemPriceForLevelPerUnit(it, lvl, unit)) : '';
              }
            });
          }
          const multiBtn = container.querySelector('#multi-serial-btn');
          if (multiBtn) {
            multiBtn.addEventListener('click', () => {
              const itemId = container.querySelector('#new-item-select').value;
              const unitEl2 = container.querySelector('#new-item-unit');
              const unit = (unitEl2 ? unitEl2.value : 'SU');
              const item = items.find(i => i.id === itemId);
              if (!item) return;
              if (!isYes(item?.TrackSerial)) {
                alert('This item is not set to Track by Serial.');
                return;
              }
              const lvl = getCustomerLevel(activeSale.customerId);
              const unitPrice = getItemPriceForLevelPerUnit(item, lvl, unit);
              const lot = (container.querySelector('#new-item-lot')?.value || '').trim();
              const exp = (container.querySelector('#new-item-exp')?.value || '');
              const input = prompt('Enter serial numbers (comma or newline separated):','');
              if (!input) return;
              const list = input.split(/[\n,]+/).map(s => String(s).trim()).filter(Boolean);
              if (!list.length) return;
              list.forEach(sn => {
                const itemName = item[displayField] || item.Name || 'Unknown';
                activeSale.items.push({ itemId, qty: 1, unitPrice, unit, itemName, lot, exp, serial: sn });
              });
              render();
            });
          }
          
          container.querySelector('#add-line-btn').addEventListener('click', () => {
              let itemId = container.querySelector('#new-item-select').value;
              const qty = Number(container.querySelector('#new-item-qty').value);
              const unitPrice = Number(container.querySelector('#new-item-price').value);
              const unit = (container.querySelector('#new-item-unit')?.value) || 'SU';
              const lot = (container.querySelector('#new-item-lot')?.value || '').trim();
              const exp = (container.querySelector('#new-item-exp')?.value || '');
              const serial = (container.querySelector('#new-item-serial')?.value || '').trim();

              if (itemId && qty > 0) {
                  let item = items.find(i => i.id === itemId);
                  if (item && item.Expiration && isExpired(item.Expiration)) {
                      const alt = pickFEFOBatch(item);
                      if (alt) {
                          itemId = alt.id;
                          item = alt;
                          const lvl = getCustomerLevel(activeSale.customerId);
                          const priceEl = container.querySelector('#new-item-price');
                          const unitEl2 = container.querySelector('#new-item-unit');
                          if (priceEl) {
                            const unit2 = (unitEl2 ? unitEl2.value : 'SU');
                            priceEl.value = String(getItemPriceForLevelPerUnit(item, lvl, unit2));
                          }
                        } else {
                          alert('Cannot add expired batch and no non-expired batch found.');
                          return;
                        }
                  }
                  if (isYes(item?.TrackSerial) && qty !== 1 && !serial) {
                      alert('Serial-tracked items require qty = 1 per line or use Multi SN.');
                      return;
                  }
                  const currentStock = Number(item[qtyField] || 0);
                  if (currentStock < qty) {
                      if (!confirm(`Warning: Not enough stock (Current: ${currentStock}). Add anyway?`)) return;
                  }
                  
                  // Store itemName for fallback
                  const itemName = item[displayField] || item.Name || 'Unknown';
                  activeSale.items.push({ itemId, qty, unitPrice, unit, itemName, lot, exp, serial });
                  render();
              }
          });

          container.querySelectorAll('.remove-line-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                  const idx = Number(e.target.dataset.idx);
                  activeSale.items.splice(idx, 1);
                  render();
              });
          });

          container.querySelector('#complete-btn').addEventListener('click', () => {
              if (confirm('Complete this sale? Stock will be deducted.')) {
                  completeSale();
              }
          });
      }
    }
  }

  function saveSale() {
    const idx = sales.findIndex(s => s.id === activeSale.id);
    if (idx >= 0) {
        sales[idx] = activeSale;
    } else {
        sales.push(activeSale);
    }
    Store.setSales(sales);
  }

  function completeSale() {
    activeSale.status = 'Completed';
    saveSale();

    // Update Inventory
    items = Store.getItems(); // reload
    activeSale.items.forEach(line => {
        const wantsTracking = Boolean(norm(line.lot) || norm(line.serial) || norm(line.exp));
        let item = line.itemId ? items.find(i => i.id === line.itemId) : null;
        if (wantsTracking) {
          const match = findInventoryMatch({ itemName: line.itemName, lot: line.lot, serial: line.serial, exp: line.exp });
          if (match) item = match;
        } else if (!item && line.itemName) {
          const match = findInventoryMatch({ itemName: line.itemName });
          if (match) item = match;
        }
        if (item) {
            const currentQty = Number(item[qtyField] || 0);
            const luFactor = luPerUnit(item, (line.unit || 'LU'));
            const luQty = Number(line.qty) * luFactor;
            item[qtyField] = Math.max(0, currentQty - luQty);
        }
    });
    Store.setItems(items);

    currentView = 'list';
    render();
  }

  async function handleImport(file) {
    try {
        const rows = await readFile(file);
        if (!rows || rows.length < 2) return;
        
        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const data = rows.slice(1);
        
        // Group by OrderNumber
        const groups = new Map();
        const orderNumIdx = headers.findIndex(h => h.includes('ordernumber') || h === 'so' || h === 'order');
        if (orderNumIdx === -1) {
            alert('Could not find OrderNumber column');
            return;
        }

        data.forEach(row => {
            const orderNumRaw = row[orderNumIdx];
            const orderNumKey = norm(orderNumRaw);
            if (!orderNumKey) return;
            const entry = groups.get(orderNumKey) || { orderNumber: String(orderNumRaw).trim(), rows: [] };
            entry.rows.push(row);
            groups.set(orderNumKey, entry);
        });

        let count = 0;
        for (const entry of groups.values()) {
            const orderNum = entry.orderNumber;
            const groupRows = entry.rows;
            const firstRow = groupRows[0];
            
            // Customer
            const custNameIdx = headers.findIndex(h => h.includes('customer'));
            const custName = custNameIdx >= 0 ? firstRow[custNameIdx] : 'Unknown';
            let customer = customers.find(c => c.name === custName);
            if (!customer && custName) {
                customer = { id: Store.uid(), name: custName };
                customers.push(customer);
                Store.setCustomers(customers);
            }

            // Date
            const dateIdx = headers.findIndex(h => h.includes('date') && !h.includes('due') && !h.includes('ship'));
            const dateStr = dateIdx >= 0 ? firstRow[dateIdx] : new Date().toISOString();
            
            // Status
            const statusIdx = headers.findIndex(h => h.includes('status'));
            const status = statusIdx >= 0 ? firstRow[statusIdx] : 'Draft';

            const newSale = {
                id: Store.uid(),
                orderNumber: orderNum,
                date: new Date(dateStr).toISOString(),
                customerId: customer ? customer.id : '',
                customerName: custName,
                status: status,
                items: []
            };

            // Items
            const itemIdx = headers.findIndex(h => h.includes('itemname') || h.includes('item'));
            const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
            const priceIdx = headers.findIndex(h => h.includes('unitprice') || h.includes('price'));
            
            // Tracking headers
            const lotIdx = headers.findIndex(h => h.includes('lot'));
            const serialIdx = headers.findIndex(h => h.includes('serial') || h.includes('sn'));
            const expIdx = headers.findIndex(h => h.includes('exp') || h.includes('expiration'));

            groupRows.forEach(row => {
                const itemName = itemIdx >= 0 ? row[itemIdx] : 'Unknown Item';
                const qty = qtyIdx >= 0 ? Number(row[qtyIdx]) : 0;
                const price = priceIdx >= 0 ? Number(row[priceIdx]) : 0;
                
                // Tracking
                const lot = lotIdx >= 0 ? (row[lotIdx] || '') : '';
                const serial = serialIdx >= 0 ? (row[serialIdx] || '') : '';
                const exp = expIdx >= 0 ? (row[expIdx] || '') : '';

                const match = findInventoryMatch({ itemName, lot, serial, exp });
                
                if (qty > 0) {
                    newSale.items.push({
                        itemId: match ? match.id : '',
                        itemName: itemName,
                        qty: qty,
                        unitPrice: price,
                        lot: lot,
                        serial: serial,
                        exp: exp
                    });
                }
            });

            const existingIdx = sales.findIndex(s => norm(s.orderNumber) === norm(orderNum));
            if (existingIdx >= 0) {
                const keepId = sales[existingIdx].id;
                sales[existingIdx] = { ...newSale, id: keepId };
            } else {
                sales.push(newSale);
                count++;
            }
        }

        Store.setSales(sales);
        render();
        alert(`Imported ${count} Sales Orders`);

    } catch (e) {
        console.error(e);
        alert('Error importing Sales: ' + e.message);
    }
  }

  function exportSales() {
      const rows = [];
      const headers = ['OrderNumber', 'Customer', 'Status', 'Date', 'ItemName', 'Tracking', 'Quantity', 'Unit', 'UnitPrice', 'Subtotal'];
      
      sales.forEach(s => {
          const cust = customers.find(c => c.id === s.customerId) || { name: s.customerName || '' };
          s.items.forEach(item => {
              const itemObj = items.find(i => i.id === item.itemId);
              const name = itemObj ? (itemObj[displayField] || itemObj.Name) : (item.itemName || '');
              
              let trackingInfo = '';
              const lineTracking = buildTrackingText(item.lot, item.serial, item.exp);
              if (lineTracking) {
                trackingInfo = lineTracking;
              } else if (itemObj) {
                const itemTracking = buildTrackingText(itemObj.Lot, itemObj.Serial, itemObj.Expiration);
                if (itemTracking) trackingInfo = itemTracking;
              }

              rows.push({
                  'OrderNumber': s.orderNumber || s.id,
                  'Customer': cust.name,
                  'Status': s.status,
                  'Date': new Date(s.date).toLocaleDateString(),
                  'ItemName': name,
                  'Tracking': trackingInfo,
                  'Quantity': item.qty,
                  'Unit': item.unit || '',
                  'UnitPrice': item.unitPrice || 0,
                  'Subtotal': ((item.qty) * (item.unitPrice || 0)).toFixed(2)
              });
          });
      });
      
      const csv = toCSV({ headers, rows });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales_orders.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }

  render();
}
