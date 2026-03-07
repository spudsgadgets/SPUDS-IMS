import Store from '../store.js';
import { readFile, toCSV } from '../utils.js';

export default function CustomerModule(container) {
  let customers = Store.getCustomers();

  function render() {
    container.innerHTML = `
      <div class="toolbar">
        <h2>Customers</h2>
        <div class="actions">
          <input type="file" id="file-input" accept=".csv, .xlsx, .xls" style="display: none">
          <button id="import-btn" class="button">Import</button>
          <button id="export-btn" class="button" ${!customers.length ? 'disabled' : ''}>Export</button>
          <button id="template-btn" class="button">Download Template</button>
          <button id="add-customer-btn" class="button">Add Customer</button>
        </div>
      </div>
      <div class="table-container">
        <table id="customer-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr data-id="${c.id}">
                <td><input class="edit-input" data-field="name" value="${c.name || ''}"></td>
                <td><input class="edit-input" data-field="contact" value="${c.contact || ''}"></td>
                <td><input class="edit-input" data-field="phone" value="${c.phone || ''}"></td>
                <td><input class="edit-input" data-field="email" value="${c.email || ''}"></td>
                <td><input class="edit-input" data-field="address1" value="${c.address1 || ''}" title="${formatAddress(c)}"></td>
                <td>
                  <select class="edit-input" data-field="level">
                    ${['A','B','C','D','E'].map(l => `<option value="${l}" ${String(c.level || 'A') === l ? 'selected' : ''}>${l}</option>`).join('')}
                  </select>
                </td>
                <td>
                  <button class="icon-btn delete-btn">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    bindEvents();
  }

  function formatAddress(c) {
    return [c.address1, c.address2, c.city, c.state, c.country, c.postalCode].filter(Boolean).join(', ');
  }

  function bindEvents() {
    container.querySelector('#add-customer-btn').addEventListener('click', addCustomer);
    
    container.querySelectorAll('.edit-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const field = e.target.dataset.field;
        updateCustomer(id, field, e.target.value);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        deleteCustomer(id);
      });
    });

    // Import/Export
    const fileInput = container.querySelector('#file-input');
    container.querySelector('#import-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length) {
        await handleImport(e.target.files[0]);
        e.target.value = '';
      }
    });

    container.querySelector('#export-btn').addEventListener('click', exportCustomers);
    container.querySelector('#template-btn').addEventListener('click', downloadTemplate);
  }

  function addCustomer() {
    const c = {
      id: Store.uid(),
      name: 'New Customer',
      contact: '',
      phone: '',
      email: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      level: 'A'
    };
    customers.push(c);
    Store.setCustomers(customers);
    render();
  }

  function updateCustomer(id, field, value) {
    const c = customers.find(x => x.id === id);
    if (c) {
      c[field] = value;
      Store.setCustomers(customers);
    }
  }

  function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return;
    customers = customers.filter(c => c.id !== id);
    Store.setCustomers(customers);
    render();
  }

  async function handleImport(file) {
    try {
      const rows = await readFile(file);
      if (!rows || rows.length < 2) {
        alert('File is empty or missing headers');
        return;
      }
      
      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      const data = rows.slice(1);
      
      let count = 0;
      data.forEach(row => {
        if (!row.some(c => c)) return; // skip empty rows
        
        const c = { id: Store.uid() };
        // Map by header index
        headers.forEach((h, idx) => {
          const val = row[idx] || '';
          // Flexible mapping
          if (h === 'name') c.name = val;
          else if (h.includes('contactname') || h === 'contact') c.contact = val;
          else if (h.includes('phone')) c.phone = val;
          else if (h.includes('email')) c.email = val;
          else if (h === 'address1' || h === 'address') c.address1 = val;
          else if (h === 'address2') c.address2 = val;
          else if (h === 'city') c.city = val;
          else if (h === 'state') c.state = val;
          else if (h === 'country') c.country = val;
          else if (h === 'postalcode' || h === 'zip') c.postalCode = val;
          else if (h === 'level' || h === 'pricelevel' || h === 'customerlevel') {
            const lvl = String(val || '').trim().toUpperCase();
            c.level = ['A','B','C','D','E'].includes(lvl) ? lvl : 'A';
          }
        });
        
        if (!c.name) c.name = 'Unknown Customer';
        if (!c.level) c.level = 'A';
        
        customers.push(c);
        count++;
      });
      
      Store.setCustomers(customers);
      render();
      alert(`Imported ${count} customers`);
      
    } catch (e) {
      console.error(e);
      alert('Error importing file: ' + e.message);
    }
  }

  function exportCustomers() {
    const headers = ['Name', 'ContactName', 'Phone', 'Email', 'Address1', 'Address2', 'City', 'State', 'Country', 'PostalCode', 'Level'];
    const rows = customers.map(c => ({
      'Name': c.name,
      'ContactName': c.contact,
      'Phone': c.phone,
      'Email': c.email,
      'Address1': c.address1,
      'Address2': c.address2,
      'City': c.city,
      'State': c.state,
      'Country': c.country,
      'PostalCode': c.postalCode,
      'Level': c.level || 'A'
    }));
    
    const csv = toCSV({ headers, rows });
    downloadCSV(csv, 'customers.csv');
  }

  function downloadTemplate() {
    const headers = ['Name', 'ContactName', 'Phone', 'Email', 'Address1', 'Address2', 'City', 'State', 'Country', 'PostalCode', 'Level'];
    const rows = [];
    const csv = toCSV({ headers, rows });
    downloadCSV(csv, 'customer_template.csv');
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  render();
}
