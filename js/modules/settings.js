import Store from '../store.js';
import { makeZip, extractFirstFile, toUint8, fromUint8, saveBlob } from '../utils.js';

export default function SettingsModule(container) {
  container.innerHTML = `
    <div class="toolbar">
      <h2>Settings</h2>
    </div>
    <div class="settings-content">
      <div class="actions">
        <button id="backup-btn" class="button">Backup Database</button>
        <button id="restore-btn" class="button">Restore Database</button>
        <input id="restore-file" type="file" accept=".json" style="display:none">
      </div>
      <div class="note">Backup includes Inventory, Vendors, Customers, Purchase Orders, Sales Orders, schema, and quantity field.</div>
    </div>
  `;

  const backupBtn = container.querySelector('#backup-btn');
  const restoreBtn = container.querySelector('#restore-btn');
  const restoreInput = container.querySelector('#restore-file');
  const actions = container.querySelector('.actions');

  function backupData() {
    const payload = {
      app: 'SPUDS-MMS',
      version: 1,
      ts: Date.now(),
      data: {
        schema: Store.getSchema(),
        qtyField: Store.getQtyField(),
        items: Store.getItems(),
        vendors: Store.getVendors(),
        customers: Store.getCustomers(),
        pos: Store.getPOs(),
        sales: Store.getSales()
      }
    };
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/backup';
      form.target = '_blank';
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'json';
      input.value = JSON.stringify(payload);
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      setTimeout(() => form.remove(), 1000);
    } catch {
      const data = toUint8(JSON.stringify(payload));
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const zipBlob = makeZip(`SPUDS-MMS-Backup-${ts}.json`, data);
      const filename = `SPUDS-MMS-Backup-${ts}.zip`;
      saveBlob(zipBlob, filename);
      if (actions) {
        const linkId = 'backup-fallback-link';
        let link = actions.querySelector(`#${linkId}`);
        if (!link) {
          link = document.createElement('a');
          link.id = linkId;
          link.className = 'button';
          link.style.marginLeft = '8px';
          link.textContent = 'Download backup';
          actions.appendChild(link);
        }
        link.href = URL.createObjectURL(zipBlob);
        link.download = filename;
        setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      }
    }
  }

  function restoreData(obj) {
    const d = obj && obj.data ? obj.data : obj;
    if (!d) return;
    if (!confirm('Restore database? This will replace current data.')) return;
    Store.setSchema(Array.isArray(d.schema) ? d.schema : []);
    Store.setQtyField(d.qtyField || null);
    Store.setItems(Array.isArray(d.items) ? d.items : []);
    Store.setVendors(Array.isArray(d.vendors) ? d.vendors : []);
    Store.setCustomers(Array.isArray(d.customers) ? d.customers : []);
    Store.setPOs(Array.isArray(d.pos) ? d.pos : []);
    Store.setSales(Array.isArray(d.sales) ? d.sales : []);
    Store.flush();
    alert('Restore complete');
  }

  if (backupBtn) {
    backupBtn.addEventListener('click', () => backupData());
  }
  if (restoreBtn && restoreInput) {
    restoreBtn.addEventListener('click', () => {
      restoreInput.value = '';
      restoreInput.click();
    });
    restoreInput.addEventListener('change', () => {
      const file = restoreInput.files && restoreInput.files[0];
      if (!file) return;
      const isZip = file.name && /\.zip$/i.test(file.name);
      const reader = new FileReader();
      if (isZip) {
        reader.onload = () => {
          try {
            const u8 = new Uint8Array(reader.result);
            const jsonText = fromUint8(extractFirstFile(u8));
            const json = JSON.parse(jsonText);
            restoreData(json);
          } catch {
            alert('Invalid backup file');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result);
            restoreData(json);
          } catch {
            alert('Invalid backup file');
          }
        };
        reader.readAsText(file);
      }
    });
  }
}
