import Store from '../store.js';
import { readFile, toCSV } from '../utils.js';

export default function VendorModule(container) {
  let vendors = Store.getVendors();

  function render() {
    container.innerHTML = `
      <div class="toolbar">
        <h2>Vendors</h2>
        <div class="actions">
          <input type="file" id="file-input" accept=".csv, .xlsx, .xls" style="display: none">
          <button id="import-btn" class="button">Import</button>
          <button id="export-btn" class="button" ${!vendors.length ? 'disabled' : ''}>Export</button>
          <button id="template-btn" class="button">Download Template</button>
          <button id="add-vendor-btn" class="button">Add Vendor</button>
        </div>
      </div>
      <div class="table-container">
        <table id="vendor-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City/State</th>
              <th>Payment Terms</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(v => `
              <tr data-id="${v.id}">
                <td><input class="edit-input" data-field="name" value="${v.name || ''}"></td>
                <td><input class="edit-input" data-field="contact" value="${v.contact || ''}"></td>
                <td><input class="edit-input" data-field="email" value="${v.email || ''}"></td>
                <td><input class="edit-input" data-field="phone" value="${v.phone || ''}"></td>
                <td>${v.city || ''} ${v.state || ''}</td>
                <td><input class="edit-input" data-field="paymentTerms" value="${v.paymentTerms || ''}"></td>
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

  function bindEvents() {
    container.querySelector('#add-vendor-btn').addEventListener('click', addVendor);
    
    container.querySelectorAll('.edit-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const field = e.target.dataset.field;
        updateVendor(id, field, e.target.value);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        deleteVendor(id);
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

    container.querySelector('#export-btn').addEventListener('click', exportVendors);
    container.querySelector('#template-btn').addEventListener('click', downloadTemplate);
  }

  function addVendor() {
    const v = {
      id: Store.uid(),
      name: 'New Vendor',
      contact: '',
      email: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      paymentTerms: '',
      taxingScheme: '',
      currency: ''
    };
    vendors.push(v);
    Store.setVendors(vendors);
    render();
  }

  function updateVendor(id, field, value) {
    const v = vendors.find(x => x.id === id);
    if (v) {
      v[field] = value;
      Store.setVendors(vendors);
    }
  }

  function deleteVendor(id) {
    if (!confirm('Delete this vendor?')) return;
    vendors = vendors.filter(v => v.id !== id);
    Store.setVendors(vendors);
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
        
        // Map by header index
        let name = '';
        let contact = '';
        let email = '';
        let phone = '';
        let address1 = '';
        let address2 = '';
        let city = '';
        let state = '';
        let country = '';
        let postalCode = '';
        let paymentTerms = '';
        let taxingScheme = '';
        let currency = '';

        headers.forEach((h, idx) => {
          const val = row[idx] || '';
          
          if (h === 'vendor' || h === 'name') name = val;
          else if (h.includes('contact')) contact = val;
          else if (h.includes('email')) email = val;
          else if (h === 'phone') phone = val;
          
          // Detailed Address
          else if (h.includes('address1') || h === 'address') address1 = val;
          else if (h.includes('address2')) address2 = val;
          else if (h.includes('city')) city = val;
          else if (h.includes('state') || h.includes('province')) state = val;
          else if (h.includes('country')) country = val;
          else if (h.includes('postal') || h.includes('zip')) postalCode = val;
          
          // Financials
          else if (h.includes('paymentterms')) paymentTerms = val;
          else if (h.includes('taxing') || h.includes('taxscheme')) taxingScheme = val;
          else if (h.includes('currency')) currency = val;
        });

        if (!name) return;

        // Check if exists
        let v = vendors.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!v) {
            v = { id: Store.uid(), name };
            vendors.push(v);
            count++;
        }

        // Update fields if present
        if (contact) v.contact = contact;
        if (email) v.email = email;
        if (phone) v.phone = phone;
        if (address1) v.address1 = address1;
        if (address2) v.address2 = address2;
        if (city) v.city = city;
        if (state) v.state = state;
        if (country) v.country = country;
        if (postalCode) v.postalCode = postalCode;
        if (paymentTerms) v.paymentTerms = paymentTerms;
        if (taxingScheme) v.taxingScheme = taxingScheme;
        if (currency) v.currency = currency;
      });
      
      Store.setVendors(vendors);
      render();
      alert(`Imported/Updated ${count} vendors`);
      
    } catch (e) {
      console.error(e);
      alert('Error importing file: ' + e.message);
    }
  }

  function exportVendors() {
    const headers = ['Name', 'Contact', 'Email', 'Phone', 'Address1', 'Address2', 'City', 'State', 'Country', 'PostalCode', 'PaymentTerms', 'TaxingScheme', 'Currency'];
    const rows = vendors.map(v => ({
      'Name': v.name,
      'Contact': v.contact,
      'Email': v.email,
      'Phone': v.phone,
      'Address1': v.address1,
      'Address2': v.address2,
      'City': v.city,
      'State': v.state,
      'Country': v.country,
      'PostalCode': v.postalCode,
      'PaymentTerms': v.paymentTerms,
      'TaxingScheme': v.taxingScheme,
      'Currency': v.currency
    }));
    
    const csv = toCSV({ headers, rows });
    downloadCSV(csv, 'vendors.csv');
  }

  function downloadTemplate() {
    const headers = ['Name', 'Contact', 'Email', 'Phone', 'Address1', 'Address2', 'City', 'State', 'Country', 'PostalCode', 'PaymentTerms', 'TaxingScheme', 'Currency'];
    const rows = []; // empty
    const csv = toCSV({ headers, rows });
    downloadCSV(csv, 'vendor_template.csv');
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
