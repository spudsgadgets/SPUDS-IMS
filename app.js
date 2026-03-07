import InventoryModule from './js/modules/inventory.js';
import VendorModule from './js/modules/vendor.js';
import CustomerModule from './js/modules/customer.js';
import PurchaseOrderModule from './js/modules/purchase_order.js';
import SalesModule from './js/modules/sales.js';
import SettingsModule from './js/modules/settings.js';
import Store from './js/store.js';
import { makeZip, toUint8, saveBlob } from './js/utils.js';

const content = document.getElementById('content');
const links = document.querySelectorAll('.nav-links a');
const topbar = document.querySelector('.topbar');
const menuToggle = document.getElementById('menu-toggle');
const mobileModeBtn = document.getElementById('mobile-mode');
const themeToggleBtn = document.getElementById('theme-toggle');
const setLogoBtn = document.getElementById('set-logo'); // may not exist
const resetLogoBtn = document.getElementById('reset-logo'); // may not exist
const logoFileInput = document.getElementById('logo-file');
const brandLogoBtn = document.getElementById('brand-logo-btn'); // removed from UI; kept for safety if present
const brandLogoEl = document.querySelector('.topbar .brand .logo');

const modules = {
  inventory: InventoryModule,
  vendor: VendorModule,
  customer: CustomerModule,
  po: PurchaseOrderModule,
  sales: SalesModule,
  settings: SettingsModule
};

function loadModule(name) {
  // Clear content
  content.innerHTML = '';
  
  // Update active state in sidebar
  links.forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-links a[data-module="${name}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Load module
  const moduleFn = modules[name];
  if (moduleFn) {
    try {
      moduleFn(content);
    } catch (e) {
      console.error(e);
      content.innerHTML = `<div class="error">Error loading module ${name}: ${e.message}</div>`;
    }
  } else {
    content.innerHTML = `<div class="error">Module ${name} not found</div>`;
  }
}

// Bind navigation
links.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const name = e.target.dataset.module;
    loadModule(name);
    if (topbar.classList.contains('open')) {
      topbar.classList.remove('open');
    }
  });
});

// Topbar controls
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    topbar.classList.toggle('open');
  });
}

function setMobileMode(enabled) {
  document.body.classList.toggle('mobile', enabled);
  if (mobileModeBtn) {
    mobileModeBtn.textContent = enabled ? 'Desktop Mode' : 'Mobile Mode';
  }
}

function setTheme(mode) {
  const isLight = mode === 'light';
  document.body.classList.toggle('theme-light', isLight);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isLight ? 'Dark Mode' : 'Light Mode';
  }
  try {
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  } catch {}
}

function applyLogo(url) {
  const brand = document.querySelector('.topbar .brand');
  if (!brand) return;
  const svg = brand.querySelector('svg.logo');
  let img = brand.querySelector('img.logo-img');
  if (url) {
    if (!img) {
      img = document.createElement('img');
      img.className = 'logo-img logo';
      brand.insertBefore(img, brand.querySelector('span'));
    }
    img.src = url;
    img.style.display = '';
    if (svg) svg.style.display = 'none';
  } else {
    if (img) {
      img.remove();
    }
    if (svg) svg.style.display = '';
  }
}

function loadLogo() {
  try {
    const url = localStorage.getItem('logo');
    applyLogo(url || '');
  } catch {
    applyLogo('');
  }
}

if (mobileModeBtn) {
  mobileModeBtn.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('mobile');
    setMobileMode(enabled);
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.contains('theme-light');
    setTheme(isLight ? 'dark' : 'light');
  });
}


if (setLogoBtn && logoFileInput) {
  setLogoBtn.addEventListener('click', () => {
    const url = prompt('Paste image URL or leave blank to choose a file:', '');
    if (url && url.trim()) {
      try {
        localStorage.setItem('logo', url.trim());
      } catch {}
      applyLogo(url.trim());
    } else {
      logoFileInput.click();
    }
  });
}

if (logoFileInput) {
  logoFileInput.addEventListener('change', () => {
    const file = logoFileInput.files && logoFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      try {
        localStorage.setItem('logo', dataUrl);
      } catch {}
      applyLogo(dataUrl);
      logoFileInput.value = '';
    };
    reader.readAsDataURL(file);
  });
}

if (brandLogoEl && logoFileInput) {
  brandLogoEl.style.cursor = 'pointer';
  brandLogoEl.addEventListener('click', () => {
    logoFileInput.click();
  });
  brandLogoEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!confirm('Reset logo?')) return;
    try { localStorage.removeItem('logo'); } catch {}
    applyLogo('');
  });
}

// resetLogoBtn removed from UI; context menu on logo handles reset

try {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') setTheme('light');
} catch {}

// Initial load
loadLogo();
loadModule('vendor');

function setupAutoBackup() {
  function createZip() {
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
    const data = toUint8(JSON.stringify(payload));
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const blob = makeZip(`SPUDS-MMS-Backup-${ts}.json`, data);
    saveBlob(blob, `SPUDS-MMS-AutoBackup-${ts}.zip`);
  }
  function mark(h) {
    try {
      const d = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`auto_backup_last_${h}`, d);
    } catch {}
  }
  function shouldRun(h) {
    try {
      const d = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem(`auto_backup_last_${h}`);
      return last !== d;
    } catch {
      return true;
    }
  }
  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (m !== 0) return;
    if (h === 12 && shouldRun(12)) {
      createZip();
      mark(12);
    } else if (h === 18 && shouldRun(18)) {
      createZip();
      mark(18);
    }
  }
  tick();
  setInterval(tick, 30000);
}
setupAutoBackup();
