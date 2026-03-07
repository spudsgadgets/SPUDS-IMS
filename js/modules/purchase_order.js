import Store from '../store.js';
import { readFile, toCSV } from '../utils.js';

export default function PurchaseOrderModule(container) {
  let pos = Store.getPOs();
  let vendors = Store.getVendors();
  let items = Store.getItems();
  let schema = Store.getSchema();
  let qtyField = Store.getQtyField();
  
  // Try to find a good display field for items
  const displayField = schema.find(f => /name|desc|item|title/i.test(f)) || (schema.length ? schema[0] : 'id');
  const isYes = (v) => String(v).toLowerCase() === 'yes' || v === true;
  const isExpired = (v) => {
    if (!v) return false;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
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
    return 1;
  };
  const getCostPerUnit = (item, unit) => {
    const costPerLU = Number(item?.Cost || item?.StandardCost || 0) || 0;
    if (unit === 'SU') return costPerLU * luPerSU(item);
    if (unit === 'PU') return costPerLU * luPerPU(item);
    return costPerLU;
  };

  let currentView = 'list'; // 'list' or 'detail'
  let activePO = null;

  function render() {
    // Refresh data
    pos = Store.getPOs();
    vendors = Store.getVendors();
    items = Store.getItems();
    
    container.innerHTML = '';
    if (currentView === 'detail') {
      renderDetail();
    } else {
      renderList();
    }
    bindEvents();
  }

  function renderList() {
    container.innerHTML = `
      <div class="toolbar">
        <h2>Purchase Orders</h2>
        <div class="actions">
          <input type="file" id="file-input" accept=".csv, .xlsx, .xls" style="display: none">
          <button id="import-btn" class="button">Import</button>
          <button id="export-btn" class="button" ${!pos.length ? 'disabled' : ''}>Export</button>
          <button id="create-po-btn" class="button">Create PO</button>
        </div>
      </div>
      <div class="table-container">
        <table class="w-full">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pos.map(po => {
              const vendor = vendors.find(v => v.id === po.vendorId) || { name: po.vendorName || 'Unknown' };
              const total = po.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice || 0)), 0);
              return `
                <tr>
                  <td>${po.orderNumber || po.id}</td>
                  <td>${new Date(po.date).toLocaleDateString()}</td>
                  <td>${vendor.name}</td>
                  <td><span class="pill ${po.status === 'Received' || po.status === 'Paid' ? 'success' : 'warning'}">${po.status}</span></td>
                  <td>${total.toFixed(2)}</td>
                  <td>
                    <button class="icon-btn edit-btn" data-id="${po.id}">Open</button>
                    <button class="icon-btn delete-btn" data-id="${po.id}">Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDetail() {
    const isDraft = activePO.status !== 'Received' && activePO.status !== 'Paid'; // Allow editing unless final
    
    const vendorOptions = vendors.map(v => 
      `<option value="${v.id}" ${v.id === activePO.vendorId ? 'selected' : ''}>${v.name}</option>`
    ).join('');

    const itemOptions = items.map(i => 
      `<option value="${i.id}">${i[displayField] || i.Name || 'Item ' + i.id}</option>`
    ).join('');

    container.innerHTML = `
      <div class="toolbar">
        <button id="back-btn" class="button">Back</button>
        <h2>PO: ${activePO.orderNumber || activePO.id}</h2>
        ${isDraft ? `<button id="receive-btn" class="button button-primary">Receive PO</button>` : ''}
      </div>
      
      <div class="form-grid">
        <div class="field">
          <label>Order Number</label>
          <input type="text" id="po-number" value="${activePO.orderNumber || ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="po-date" value="${activePO.date ? activePO.date.split('T')[0] : ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Vendor</label>
          <select id="po-vendor" ${!isDraft ? 'disabled' : ''}>
            <option value="">Select Vendor</option>
            ${vendorOptions}
          </select>
        </div>
        <div class="field">
          <label>Status</label>
          <input disabled value="${activePO.status}">
        </div>
        <div class="field">
          <label>Payment Terms</label>
          <input type="text" id="po-terms" value="${activePO.paymentTerms || ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Vendor Order #</label>
          <input type="text" id="po-vendor-ref" value="${activePO.vendorOrderNumber || ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>Freight</label>
          <input type="text" id="po-freight" value="${activePO.freight || ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
        <div class="field">
            <label>Due Date</label>
            <input type="date" id="po-due-date" value="${activePO.dueDate ? activePO.dueDate.split('T')[0] : ''}" ${!isDraft ? 'disabled' : ''}>
        </div>
      </div>
      
      <div class="field" style="margin-bottom: 1rem;">
        <label>Remarks</label>
        <textarea id="po-remarks" class="w-full" rows="2" ${!isDraft ? 'disabled' : ''}>${activePO.remarks || ''}</textarea>
      </div>

      <h3>Items</h3>
      ${isDraft ? `
      <div class="add-line">
        <select id="new-item-select" style="width: 200px">${itemOptions}</select>
        <input type="number" id="new-item-qty" placeholder="Qty" value="1" min="1" style="width: 60px">
        <select id="new-item-unit" style="width: 90px"></select>
        <input type="number" id="new-item-price" placeholder="Price" min="0" step="0.01" style="width: 80px">
        <input type="text" id="new-item-lot" placeholder="Lot #" style="width: 80px">
        <input type="date" id="new-item-exp" placeholder="Exp Date" style="width: 110px">
        <input type="text" id="new-item-serial" placeholder="Serial(s)" style="width: 100px">
        <button id="multi-serial-btn" class="button" title="Add multiple serials at once">Multi SN</button>
        <button id="add-line-btn" class="button">Add</button>
      </div>` : ''}

      <table class="w-full">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Tracking</th>
            <th>Subtotal</th>
            ${isDraft ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${activePO.items.map((line, idx) => {
            const item = items.find(i => i.id === line.itemId) || { [displayField]: line.itemName || 'Unknown Item' };
            const subtotal = (Number(line.qty) * Number(line.unitPrice || 0)).toFixed(2);
            
            let trackingInfo = [];
            if (line.lot) trackingInfo.push(`Lot: ${line.lot}`);
            if (line.exp) trackingInfo.push(`Exp: ${line.exp}`);
            if (line.serial) trackingInfo.push(`SN: ${line.serial}`);
            if (line.exp && isExpired(line.exp)) trackingInfo.push(`<span style="color: var(--danger); font-weight: 600;">EXPIRED</span>`);
            
            return `
              <tr>
                <td>${item[displayField] || item.Name || 'Unknown'}</td>
                <td>${line.qty}</td>
                <td>${line.unit || ''}</td>
                <td>${line.unitPrice || 0}</td>
                <td><small>${trackingInfo.join('<br>')}</small></td>
                <td>${subtotal}</td>
                ${isDraft ? `<td><button class="icon-btn remove-line-btn" data-idx="${idx}">Remove</button></td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function bindEvents() {
    if (currentView === 'list') {
        container.querySelector('#create-po-btn').addEventListener('click', () => {
            activePO = {
                id: Store.uid(),
                orderNumber: 'PO-' + Date.now().toString().slice(-6),
                date: new Date().toISOString(),
                vendorId: vendors[0]?.id || '',
                status: 'Draft',
                items: [] 
            };
            currentView = 'detail';
            render();
        });

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const found = pos.find(p => p.id === id);
                if (found) {
                    activePO = JSON.parse(JSON.stringify(found));
                    currentView = 'detail';
                    render();
                }
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if(confirm('Delete this PO?')) {
                    pos = pos.filter(p => p.id !== id);
                    Store.setPOs(pos);
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
            container.querySelector('#export-btn').addEventListener('click', exportPOs);
        }

    } else {
        // Detail view events
        container.querySelector('#back-btn').addEventListener('click', () => {
            savePO();
            currentView = 'list';
            render();
        });

        const isDraft = activePO.status !== 'Received' && activePO.status !== 'Paid';
        if (isDraft) {
            container.querySelector('#po-number').addEventListener('change', e => activePO.orderNumber = e.target.value);
            container.querySelector('#po-date').addEventListener('change', e => activePO.date = e.target.value);
            container.querySelector('#po-vendor').addEventListener('change', e => activePO.vendorId = e.target.value);
            container.querySelector('#po-terms').addEventListener('change', e => activePO.paymentTerms = e.target.value);
            container.querySelector('#po-vendor-ref').addEventListener('change', e => activePO.vendorOrderNumber = e.target.value);
            container.querySelector('#po-freight').addEventListener('change', e => activePO.freight = e.target.value);
            container.querySelector('#po-due-date').addEventListener('change', e => activePO.dueDate = e.target.value);
            container.querySelector('#po-remarks').addEventListener('change', e => activePO.remarks = e.target.value);
            
            const selEl = container.querySelector('#new-item-select');
            if (selEl) {
              const unitEl = container.querySelector('#new-item-unit');
              const priceEl = container.querySelector('#new-item-price');
              const initItem = items.find(i => i.id === selEl.value);
              const lotEl = container.querySelector('#new-item-lot');
              const expEl = container.querySelector('#new-item-exp');
              const serialEl = container.querySelector('#new-item-serial');
              const multiBtn = container.querySelector('#multi-serial-btn');
              const applyTrackingVisibility = (it) => {
                const showLot = isYes(it?.TrackLot);
                const showExp = isYes(it?.TrackExpiration);
                const showSerial = isYes(it?.TrackSerial);
                if (lotEl) lotEl.style.display = showLot ? '' : 'none';
                if (expEl) expEl.style.display = showExp ? '' : 'none';
                if (serialEl) serialEl.style.display = showSerial ? '' : 'none';
                if (multiBtn) multiBtn.style.display = showSerial ? '' : 'none';
              };
              if (unitEl) {
                const labelLU = (initItem?.LooseUnit || 'LU');
                const labelSU = (initItem?.SalesUnit || 'SU');
                const labelPU = (initItem?.PurchaseUnit || 'PU');
                unitEl.innerHTML = [
                  `<option value="PU">${labelPU}</option>`,
                  `<option value="SU">${labelSU}</option>`,
                  `<option value="LU">${labelLU}</option>`
                ].join('');
                unitEl.value = (initItem && initItem.PurchaseUnit) ? 'PU' : 'LU';
              }
              if (priceEl) {
                const unit = (unitEl ? unitEl.value : 'PU');
                priceEl.value = initItem ? String(getCostPerUnit(initItem, unit)) : '';
              }
              applyTrackingVisibility(initItem);
              selEl.addEventListener('change', (e) => {
                const itemId = e.target.value;
                const it = items.find(i => i.id === itemId);
                if (unitEl) {
                  const labelLU2 = (it?.LooseUnit || 'LU');
                  const labelSU2 = (it?.SalesUnit || 'SU');
                  const labelPU2 = (it?.PurchaseUnit || 'PU');
                  unitEl.innerHTML = [
                    `<option value="PU">${labelPU2}</option>`,
                    `<option value="SU">${labelSU2}</option>`,
                    `<option value="LU">${labelLU2}</option>`
                  ].join('');
                  unitEl.value = (it && it.PurchaseUnit) ? 'PU' : 'LU';
                }
                if (priceEl) {
                  const unit = (unitEl ? unitEl.value : 'PU');
                  priceEl.value = it ? String(getCostPerUnit(it, unit)) : '';
                }
                applyTrackingVisibility(it);
              });
              if (unitEl) {
                unitEl.addEventListener('change', () => {
                  const itemId = selEl.value;
                  const it = items.find(i => i.id === itemId);
                  if (priceEl) {
                    const unit = unitEl.value;
                    priceEl.value = it ? String(getCostPerUnit(it, unit)) : '';
                  }
                });
              }
            }

            const multiBtn = container.querySelector('#multi-serial-btn');
            if (multiBtn) {
              multiBtn.addEventListener('click', () => {
                const itemId = container.querySelector('#new-item-select').value;
                const unitEl = container.querySelector('#new-item-unit');
                const unit = (unitEl ? unitEl.value : 'PU');
                const lot = container.querySelector('#new-item-lot').value.trim();
                const exp = container.querySelector('#new-item-exp').value;
                const itemObj = items.find(i => i.id === itemId);
                const itemName = itemObj ? (itemObj[displayField] || itemObj.Name) : 'Unknown';
                const unitPrice = itemObj ? Number(getCostPerUnit(itemObj, unit)) : 0;
                const input = prompt('Enter serial numbers (comma or newline separated):','');
                if (!input) return;
                const list = input.split(/[\n,]+/).map(s => String(s).trim()).filter(Boolean);
                if (!list.length) return;
                list.forEach(sn => {
                  activePO.items.push({ itemId, qty: 1, unitPrice, unit, itemName, lot, exp, serial: sn });
                });
                render();
              });
            }

            container.querySelector('#add-line-btn').addEventListener('click', () => {
                const itemId = container.querySelector('#new-item-select').value;
                const qty = Number(container.querySelector('#new-item-qty').value);
                const unitPrice = Number(container.querySelector('#new-item-price').value);
                const unit = (container.querySelector('#new-item-unit')?.value) || 'PU';
                const lot = container.querySelector('#new-item-lot').value.trim();
                const exp = container.querySelector('#new-item-exp').value;
                const serial = container.querySelector('#new-item-serial').value.trim();
                
                // Find item name for fallback
                const itemObj = items.find(i => i.id === itemId);
                const itemName = itemObj ? (itemObj[displayField] || itemObj.Name) : 'Unknown';

                if (qty > 0) {
                    activePO.items.push({ itemId, qty, unitPrice, unit, itemName, lot, exp, serial });
                    render();
                }
            });

            container.querySelectorAll('.remove-line-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.target.dataset.idx);
                    activePO.items.splice(idx, 1);
                    render();
                });
            });

            container.querySelector('#receive-btn').addEventListener('click', () => {
                if (confirm('Receive this PO? This will update inventory stock.')) {
                    receivePO();
                }
            });
        }
    }
  }

  function savePO() {
    const idx = pos.findIndex(p => p.id === activePO.id);
    if (idx >= 0) {
        pos[idx] = activePO;
    } else {
        pos.push(activePO);
    }
    Store.setPOs(pos);
  }

  function receivePO() {
    activePO.status = 'Received';
    savePO();

    // Update Inventory
    items = Store.getItems();
    activePO.items.forEach(line => {
        const item = items.find(i => i.id === line.itemId);
        
        // If we have specific tracking info, we might need to create a new inventory row
        if (line.lot || line.serial || line.exp) {
            // Check if there is already an item with same Name/Item code AND same lot/serial
            // Note: linking by ID is tricky if we split.
            // Strategy: Create a NEW item row that copies the base item's details but adds tracking info.
            
            if (item) {
                // Check if we already have this specific batch in inventory
                const batchItem = items.find(i => 
                    (i.Name === item.Name || i.Item === item.Item) &&
                    (i.Lot === line.lot || (!i.Lot && !line.lot)) &&
                    (i.Serial === line.serial || (!i.Serial && !line.serial)) &&
                    (i.Expiration === line.exp || (!i.Expiration && !line.exp))
                );

                if (batchItem) {
                    // Update existing batch
                     if (qtyField) {
                        const currentQty = Number(batchItem[qtyField] || 0);
                        const luQty = Number(line.qty) * luPerUnit(item || batchItem, (line.unit || 'PU'));
                        batchItem[qtyField] = currentQty + luQty;
                    }
                } else {
                    // Create new batch
                    const newItem = { ...item }; // clone base
                    newItem.id = Store.uid(); // new unique ID
                    newItem.Lot = line.lot || '';
                    newItem.Serial = line.serial || '';
                    newItem.Expiration = line.exp || '';
                    if (qtyField) {
                      const luQty = Number(line.qty) * luPerUnit(item, (line.unit || 'PU'));
                      newItem[qtyField] = luQty;
                    }
                    items.push(newItem);
                }
            }
        } else {
            // Standard update (no tracking info provided)
            if (item && qtyField) {
                const currentQty = Number(item[qtyField] || 0);
                const luQty = Number(line.qty) * luPerUnit(item, (line.unit || 'PU'));
                item[qtyField] = currentQty + luQty;
            }
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
        const groups = {};
        const orderNumIdx = headers.findIndex(h => h.includes('ordernumber') || h === 'po');
        if (orderNumIdx === -1) {
            alert('Could not find OrderNumber column');
            return;
        }

        data.forEach(row => {
            const orderNum = row[orderNumIdx];
            if (!orderNum) return;
            if (!groups[orderNum]) groups[orderNum] = [];
            groups[orderNum].push(row);
        });

        let count = 0;
        for (const [orderNum, groupRows] of Object.entries(groups)) {
            // Header info from first row
            const firstRow = groupRows[0];
            
            // Vendor
            const vendorNameIdx = headers.findIndex(h => h === 'vendor');
            const vendorName = vendorNameIdx >= 0 ? firstRow[vendorNameIdx] : 'Unknown';
            let vendor = vendors.find(v => v.name === vendorName);
            if (!vendor && vendorName) {
                // Auto-create vendor with details if available
                vendor = { id: Store.uid(), name: vendorName };
                
                // Try to find address/contact info in PO headers
                const contactIdx = headers.findIndex(h => h.includes('contactname'));
                const phoneIdx = headers.findIndex(h => h.includes('phone'));
                const addr1Idx = headers.findIndex(h => h.includes('vendoraddress1'));
                const addr2Idx = headers.findIndex(h => h.includes('vendoraddress2'));
                const cityIdx = headers.findIndex(h => h.includes('vendorcity'));
                const stateIdx = headers.findIndex(h => h.includes('vendorstate'));
                const countryIdx = headers.findIndex(h => h.includes('vendorcountry'));
                const zipIdx = headers.findIndex(h => h.includes('vendorpostalcode'));

                if (contactIdx >= 0) vendor.contact = firstRow[contactIdx];
                if (phoneIdx >= 0) vendor.phone = firstRow[phoneIdx];
                if (addr1Idx >= 0) vendor.address1 = firstRow[addr1Idx];
                if (addr2Idx >= 0) vendor.address2 = firstRow[addr2Idx];
                if (cityIdx >= 0) vendor.city = firstRow[cityIdx];
                if (stateIdx >= 0) vendor.state = firstRow[stateIdx];
                if (countryIdx >= 0) vendor.country = firstRow[countryIdx];
                if (zipIdx >= 0) vendor.postalCode = firstRow[zipIdx];

                vendors.push(vendor);
                Store.setVendors(vendors);
            }

            // Date
            const dateIdx = headers.findIndex(h => h.includes('orderdate') || (h.includes('date') && !h.includes('due') && !h.includes('ship')));
            let dateStr = dateIdx >= 0 ? firstRow[dateIdx] : new Date().toISOString();
            
            // Safe Date Parse
            try {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString();
                } else {
                    dateStr = new Date().toISOString(); // Fallback
                }
            } catch (e) {
                dateStr = new Date().toISOString();
            }

            // Status
            const statusIdx = headers.findIndex(h => h.includes('orderstatus') || h.includes('status'));
            const status = statusIdx >= 0 ? firstRow[statusIdx] : 'Draft';

            // Additional Fields
            const freightIdx = headers.findIndex(h => h.includes('freight'));
            const termsIdx = headers.findIndex(h => h.includes('paymentterms'));
            const remarksIdx = headers.findIndex(h => h.includes('orderremarks') || h.includes('remarks'));
            const vendorOrderIdx = headers.findIndex(h => h.includes('vendorordernumber'));
            const dueDateIdx = headers.findIndex(h => h.includes('duedate'));

            const newPO = {
                id: Store.uid(),
                orderNumber: orderNum,
                date: dateStr,
                vendorId: vendor ? vendor.id : '',
                vendorName: vendorName,
                status: status,
                freight: freightIdx >= 0 ? (firstRow[freightIdx] || '') : '',
                paymentTerms: termsIdx >= 0 ? (firstRow[termsIdx] || '') : '',
                remarks: remarksIdx >= 0 ? (firstRow[remarksIdx] || '') : '',
                vendorOrderNumber: vendorOrderIdx >= 0 ? (firstRow[vendorOrderIdx] || '') : '',
                dueDate: dueDateIdx >= 0 && firstRow[dueDateIdx] && !isNaN(new Date(firstRow[dueDateIdx]).getTime()) ? new Date(firstRow[dueDateIdx]).toISOString() : '',
                items: []
            };

            // Items
            const itemIdx = headers.findIndex(h => h.includes('itemname') || h.includes('item'));
            const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
            const priceIdx = headers.findIndex(h => h.includes('unitprice') || h.includes('price'));
            
            // Tracking columns
            const lotIdx = headers.findIndex(h => h === 'lot' || h.includes('lot number'));
            const serialIdx = headers.findIndex(h => h === 'serial' || h === 'sn' || h.includes('serial number'));
            const expIdx = headers.findIndex(h => h === 'expiration' || h === 'exp' || h.includes('expiry'));

            groupRows.forEach(row => {
                const itemName = itemIdx >= 0 ? row[itemIdx] : 'Unknown Item';
                const qty = qtyIdx >= 0 ? Number(row[qtyIdx]) : 0;
                const price = priceIdx >= 0 ? Number(row[priceIdx]) : 0;
                
                const lot = lotIdx >= 0 ? (row[lotIdx] || '') : '';
                const serial = serialIdx >= 0 ? (row[serialIdx] || '') : '';
                const exp = expIdx >= 0 ? (row[expIdx] || '') : '';

                // Find item
                let item = items.find(i => i[displayField] === itemName || i.Name === itemName);
                if (!item && itemName) {
                     // Warning: item not found, maybe create partial?
                     // For now just store name
                }
                
                if (qty > 0) {
                    newPO.items.push({
                        itemId: item ? item.id : '',
                        itemName: itemName,
                        qty: qty,
                        unitPrice: price,
                        lot: lot,
                        serial: serial,
                        exp: exp
                    });
                }
            });

            pos.push(newPO);
            count++;
        }

        Store.setPOs(pos);
        render();
        alert(`Imported ${count} Purchase Orders`);

    } catch (e) {
        console.error(e);
        alert('Error importing POs: ' + e.message);
    }
  }

  function exportPOs() {
      // Flatten items
      const rows = [];
      const headers = ['OrderNumber', 'Vendor', 'Status', 'Date', 'DueDate', 'VendorOrderNumber', 'PaymentTerms', 'Freight', 'Remarks', 'ItemName', 'Tracking', 'Quantity', 'Unit', 'UnitPrice', 'Subtotal'];
      
      pos.forEach(po => {
          const vendor = vendors.find(v => v.id === po.vendorId) || { name: po.vendorName || '' };
          po.items.forEach(item => {
              const itemObj = items.find(i => i.id === item.itemId);
              const name = itemObj ? (itemObj[displayField] || itemObj.Name) : (item.itemName || '');
              
              let trackingInfo = [];
              if (item.lot) trackingInfo.push(`Lot: ${item.lot}`);
              if (item.serial) trackingInfo.push(`SN: ${item.serial}`);
              if (item.exp) trackingInfo.push(`Exp: ${item.exp}`);

              rows.push({
                  'OrderNumber': po.orderNumber,
                  'Vendor': vendor.name,
                  'Status': po.status,
                  'Date': new Date(po.date).toLocaleDateString(),
                  'DueDate': po.dueDate ? new Date(po.dueDate).toLocaleDateString() : '',
                  'VendorOrderNumber': po.vendorOrderNumber || '',
                  'PaymentTerms': po.paymentTerms || '',
                  'Freight': po.freight || '',
                  'Remarks': po.remarks || '',
                  'ItemName': name,
                  'Tracking': trackingInfo.join(', '),
                  'Quantity': item.qty,
                  'Unit': item.unit || '',
                  'UnitPrice': item.unitPrice,
                  'Subtotal': (item.qty * item.unitPrice).toFixed(2)
              });
          });
      });
      
      const csv = toCSV({ headers, rows });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchase_orders.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }

  render();
}
