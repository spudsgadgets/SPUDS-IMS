// store.js - Centralized data management
const LS_KEYS = {
  // Inventory
  schema: 'inv_schema_v1',
  qtyField: 'inv_qty_field_v1',
  items: 'inv_rows_v1',
  
  // New Modules
  vendors: 'inv_vendors_v1',
  customers: 'inv_customers_v1',
  pos: 'inv_pos_v1',
  sales: 'inv_sales_v1'
};

const CACHE = new Map();
const PENDING = new Map();

function writeNow(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function scheduleWrite(key, val) {
  const existing = PENDING.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    PENDING.delete(key);
    try {
      writeNow(key, val);
    } catch (e) {
      console.error(`Error saving ${key}`, e);
    }
  }, 200);
  PENDING.set(key, timer);
}

const Store = {
  // Generic Helpers
  get(key, defaultVal = []) {
    try {
      if (CACHE.has(key)) return CACHE.get(key);
      const data = localStorage.getItem(key);
      const val = data ? JSON.parse(data) : defaultVal;
      CACHE.set(key, val);
      return val;
    } catch (e) {
      console.warn(`Error loading ${key}`, e);
      return defaultVal;
    }
  },
  
  set(key, val) {
    CACHE.set(key, val);
    scheduleWrite(key, val);
  },

  flush(key) {
    if (key) {
      const val = CACHE.get(key);
      if (val === undefined) return;
      const existing = PENDING.get(key);
      if (existing) clearTimeout(existing);
      PENDING.delete(key);
      try {
        writeNow(key, val);
      } catch (e) {
        console.error(`Error saving ${key}`, e);
      }
      return;
    }
    for (const [k, timer] of PENDING.entries()) {
      clearTimeout(timer);
      PENDING.delete(k);
      const val = CACHE.get(k);
      if (val !== undefined) {
        try {
          writeNow(k, val);
        } catch (e) {
          console.error(`Error saving ${k}`, e);
        }
      }
    }
  },

  // Specific Accessors
  getSchema: () => Store.get(LS_KEYS.schema, []),
  setSchema: (v) => Store.set(LS_KEYS.schema, v),
  
  getQtyField: () => Store.get(LS_KEYS.qtyField, null),
  setQtyField: (v) => Store.set(LS_KEYS.qtyField, v),

  getItems: () => Store.get(LS_KEYS.items, []),
  setItems: (v) => Store.set(LS_KEYS.items, v),

  getVendors: () => Store.get(LS_KEYS.vendors, []),
  setVendors: (v) => Store.set(LS_KEYS.vendors, v),

  getCustomers: () => Store.get(LS_KEYS.customers, []),
  setCustomers: (v) => Store.set(LS_KEYS.customers, v),

  getPOs: () => Store.get(LS_KEYS.pos, []),
  setPOs: (v) => Store.set(LS_KEYS.pos, v),

  getSales: () => Store.get(LS_KEYS.sales, []),
  setSales: (v) => Store.set(LS_KEYS.sales, v),
  
  // Utility
  uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      Store.flush();
    } catch (e) {}
  });
}

export default Store;
