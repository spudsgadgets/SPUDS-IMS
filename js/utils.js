export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        cur += '"'; // Escaped quote
        i++;
      } else {
        inQuotes = !inQuotes; // Toggle quote mode
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      if (c === '\r' && next === '\n') i++; // Handle CRLF
    } else {
      cur += c;
    }
  }
  
  // Add last item if exists
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  
  return rows.filter(r => r.length > 0 && r.some(c => c.trim().length > 0));
}

export function toCSV({ headers, rows }) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => esc(r[h])).join(','));
  }
  return lines.join('\r\n');
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const isCSV = file.name && file.name.toLowerCase().endsWith('.csv');

    if (isCSV) {
      // Prefer text parsing for CSV to handle complex quoting/newlines accurately
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve(parseCSV(text));
      };
      reader.onerror = reject;
      reader.readAsText(file);
    } else if (typeof XLSX !== 'undefined') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          // header: 1 returns array of arrays
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      // Fallback to text parsing for CSV if XLSX fails or not present
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve(parseCSV(text));
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

export function makeZip(name, data) {
  const te = new TextEncoder();
  const nameBytes = te.encode(name);
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2)));
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | (now.getDate()));
  const crc = crc32(data);
  const localSize = 30 + nameBytes.length + data.length;
  const centralSize = 46 + nameBytes.length;
  const endSize = 22;
  const total = localSize + centralSize + endSize;
  const u8 = new Uint8Array(total);
  const dv = new DataView(u8.buffer);
  let p = 0;
  dv.setUint32(p, 0x04034b50, true); p += 4;
  dv.setUint16(p, 20, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, dosTime, true); p += 2;
  dv.setUint16(p, dosDate, true); p += 2;
  dv.setUint32(p, crc, true); p += 4;
  dv.setUint32(p, data.length, true); p += 4;
  dv.setUint32(p, data.length, true); p += 4;
  dv.setUint16(p, nameBytes.length, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  u8.set(nameBytes, p); p += nameBytes.length;
  u8.set(data, p); p += data.length;
  const centralOffset = localSize;
  dv.setUint32(p, 0x02014b50, true); p += 4;
  dv.setUint16(p, 20, true); p += 2;
  dv.setUint16(p, 20, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, dosTime, true); p += 2;
  dv.setUint16(p, dosDate, true); p += 2;
  dv.setUint32(p, crc, true); p += 4;
  dv.setUint32(p, data.length, true); p += 4;
  dv.setUint32(p, data.length, true); p += 4;
  dv.setUint16(p, nameBytes.length, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint32(p, 0, true); p += 4;
  dv.setUint32(p, 0, true); p += 4;
  dv.setUint32(p, 0, true); p += 4;
  dv.setUint32(p, 0, true); p += 4;
  u8.set(nameBytes, p); p += nameBytes.length;
  dv.setUint32(p, 0x06054b50, true); p += 4;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 0, true); p += 2;
  dv.setUint16(p, 1, true); p += 2;
  dv.setUint16(p, 1, true); p += 2;
  dv.setUint32(p, centralSize, true); p += 4;
  dv.setUint32(p, centralOffset, true); p += 4;
  dv.setUint16(p, 0, true); p += 2;
  return new Blob([u8], { type: 'application/zip' });
}

export function extractFirstFile(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x04034b50) throw new Error('bad zip');
  const nameLen = dv.getUint16(26, true);
  const extraLen = dv.getUint16(28, true);
  const compSize = dv.getUint32(18, true);
  const start = 30 + nameLen + extraLen;
  return u8.slice(start, start + compSize);
}

let CRC_TABLE = null;
function makeTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c >>> 0;
  }
  return t;
}
function crc32(u8) {
  if (!CRC_TABLE) CRC_TABLE = makeTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) {
    c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function toUint8(str) {
  if (typeof TextEncoder !== 'undefined') {
    const te = new TextEncoder();
    return te.encode(str);
  }
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else if (c >= 0xD800 && c <= 0xDBFF) {
      i++;
      const c2 = str.charCodeAt(i);
      const u = (((c - 0xD800) << 10) | (c2 - 0xDC00)) + 0x10000;
      out.push(0xF0 | (u >> 18), 0x80 | ((u >> 12) & 0x3F), 0x80 | ((u >> 6) & 0x3F), 0x80 | (u & 0x3F));
    } else {
      out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }
  return new Uint8Array(out);
}

export function fromUint8(u8) {
  if (typeof TextDecoder !== 'undefined') {
    const td = new TextDecoder();
    return td.decode(u8);
  }
  let out = '';
  for (let i = 0; i < u8.length; i++) {
    const c = u8[i];
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if ((c & 0xE0) === 0xC0) {
      const c2 = u8[++i];
      out += String.fromCharCode(((c & 0x1F) << 6) | (c2 & 0x3F));
    } else if ((c & 0xF0) === 0xE0) {
      const c2 = u8[++i];
      const c3 = u8[++i];
      out += String.fromCharCode(((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F));
    } else {
      const c2 = u8[++i];
      const c3 = u8[++i];
      const c4 = u8[++i];
      const u = (((c & 0x07) << 18) | ((c2 & 0x3F) << 12) | ((c3 & 0x3F) << 6) | (c4 & 0x3F)) - 0x10000;
      out += String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3FF));
    }
  }
  return out;
}

export function saveBlob(blob, filename) {
  const n = typeof window !== 'undefined' && window.navigator;
  try {
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      const opts = {
        suggestedName: filename,
        types: [
          {
            description: 'ZIP File',
            accept: { 'application/zip': ['.zip'] }
          }
        ]
      };
      // Use the native save dialog when available
      // Not awaited to preserve click gesture chain
      window.showSaveFilePicker(opts)
        .then(handle => handle.createWritable()
          .then(w => w.write(blob).then(() => w.close())))
        .catch(() => {
          // Fallback to anchor method if user cancels or API fails
          const a = document.createElement('a');
          a.style.display = 'none';
          document.body.appendChild(a);
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 1000);
        });
      return;
    }
  } catch {}
  if (n && n.msSaveOrOpenBlob) {
    n.msSaveOrOpenBlob(blob, filename);
    return;
  }
  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
