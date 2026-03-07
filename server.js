const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 3200;
const ROOT = process.env.ROOT || process.cwd();
const DEBUG = process.argv.includes('--debug') || process.env.DEBUG === '1';
function dlog() {
  if (!DEBUG) return;
  const args = Array.prototype.slice.call(arguments);
  try { console.log(new Date().toISOString(), ...args); } catch { console.log.apply(console, args); }
}

function contentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.csv':
      return 'text/csv; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}

function safeResolve(p) {
  const base = path.resolve(ROOT);
  const resolved = path.resolve(base, p);
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    if (req.method === 'GET' && parsed.pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end('ok');
      dlog(req.method, parsed.pathname, 200);
      return;
    }
    if (req.method === 'GET' && parsed.pathname === '/__debug') {
      const body = JSON.stringify({ port: PORT, root: ROOT, cwd: process.cwd(), pid: process.pid, now: new Date().toISOString() });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(body);
      dlog(req.method, parsed.pathname, 200);
      return;
    }
    if (req.method === 'POST' && parsed.pathname === '/api/backup') {
      let chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          let obj;
          try {
            obj = JSON.parse(raw);
          } catch {
            const qs = require('querystring');
            const parsedBody = qs.parse(raw);
            if (parsedBody && parsedBody.json) {
              obj = JSON.parse(parsedBody.json);
            } else {
              throw new Error('bad');
            }
          }
          const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
          const filename = `SPUDS-MMS-Backup-${ts}.json`;
          const zip = makeZip(filename, Buffer.from(JSON.stringify(obj), 'utf8'));
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="SPUDS-MMS-Backup-${ts}.zip"`);
          res.writeHead(200);
          res.end(zip);
          dlog(req.method, parsed.pathname, 200, `${filename}.zip`);
        } catch {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('bad request');
          dlog(req.method, parsed.pathname, 400);
        }
      });
      return;
    }
    let rel = decodeURIComponent(parsed.pathname || '/');
    rel = rel.replace(/^\/+/, '');
    if (rel === '') rel = 'index.html';
    const target = safeResolve(rel);

    let filePath = target;
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      filePath = fs.existsSync(indexPath) ? indexPath : null;
    }

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const data = fs.readFileSync(filePath);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', contentType(filePath));
      res.writeHead(200);
      res.end(data);
      dlog(req.method, parsed.pathname, 200, filePath);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404');
      dlog(req.method, parsed.pathname, 404, rel);
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500');
    dlog('ERR', e && e.message ? e.message : String(e));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} on http://0.0.0.0:${PORT}/`);
  dlog('debug', 'enabled');
});

function crcTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
}
const CRC_TABLE = crcTable();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function dosDateTime(date) {
  const dt = new Date(date);
  const time = ((dt.getHours() << 11) | (dt.getMinutes() << 5) | (Math.floor(dt.getSeconds() / 2))) & 0xFFFF;
  const dte = (((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | (dt.getDate())) & 0xFFFF;
  return { time, date: dte };
}
function makeZip(name, dataBuf) {
  const nameBuf = Buffer.from(name, 'utf8');
  const { time, date } = dosDateTime(Date.now());
  const crc = crc32(dataBuf);
  const localSize = 30 + nameBuf.length + dataBuf.length;
  const centralSize = 46 + nameBuf.length;
  const endSize = 22;
  const total = localSize + centralSize + endSize;
  const u8 = Buffer.alloc(total);
  let p = 0;
  u8.writeUInt32LE(0x04034b50, p); p += 4;
  u8.writeUInt16LE(20, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(time, p); p += 2;
  u8.writeUInt16LE(date, p); p += 2;
  u8.writeUInt32LE(crc, p); p += 4;
  u8.writeUInt32LE(dataBuf.length, p); p += 4;
  u8.writeUInt32LE(dataBuf.length, p); p += 4;
  u8.writeUInt16LE(nameBuf.length, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  nameBuf.copy(u8, p); p += nameBuf.length;
  dataBuf.copy(u8, p); p += dataBuf.length;
  const centralOffset = localSize;
  u8.writeUInt32LE(0x02014b50, p); p += 4;
  u8.writeUInt16LE(20, p); p += 2;
  u8.writeUInt16LE(20, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(time, p); p += 2;
  u8.writeUInt16LE(date, p); p += 2;
  u8.writeUInt32LE(crc, p); p += 4;
  u8.writeUInt32LE(dataBuf.length, p); p += 4;
  u8.writeUInt32LE(dataBuf.length, p); p += 4;
  u8.writeUInt16LE(nameBuf.length, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt32LE(0, p); p += 4;
  u8.writeUInt32LE(0, p); p += 4;
  u8.writeUInt32LE(0, p); p += 4;
  u8.writeUInt32LE(centralOffset - 0, p); p += 4;
  nameBuf.copy(u8, p); p += nameBuf.length;
  u8.writeUInt32LE(0x06054b50, p); p += 4;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(0, p); p += 2;
  u8.writeUInt16LE(1, p); p += 2;
  u8.writeUInt16LE(1, p); p += 2;
  u8.writeUInt32LE(centralSize, p); p += 4;
  u8.writeUInt32LE(centralOffset, p); p += 4;
  u8.writeUInt16LE(0, p); p += 2;
  return u8;
}
