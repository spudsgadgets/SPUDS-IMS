import http from 'http'
import { readFile, stat, readdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile, spawn } from 'child_process'
import os from 'os'
const __dirname=path.dirname(fileURLToPath(import.meta.url))
const PUBLIC=path.join(__dirname,'public')
const PORT=parseInt(process.env.PORT||'3200',10)
let mysql
try{mysql=await import('mysql2/promise')}catch{}
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type')}
function json(res,code,obj){res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(obj))}
function ok(res,obj){json(res,200,obj)}
function bad(res,msg){json(res,400,{error:msg})}
function notFound(res){json(res,404,{error:'Not found'})}
function isValidName(n){return /^[a-zA-Z0-9_]+$/.test(n||'')}
function toCols(headers){const seen={};return headers.map(h=>{let base=String(h).trim().slice(0,64).replace(/[^a-zA-Z0-9_]/g,'_')||'col';let name=base;let i=1;while(seen[name]){i++;name=base+'_'+i}seen[name]=true;return {name}})}
function sniff(values){let t='TEXT';let int=true;let float=true;let date=true;for(const v of values){if(v===''||v==null)continue;const s=String(v).trim();if(!/^-?\d+$/.test(s))int=false;if(!/^-?\\d*(\\.\\d+)?$/.test(s))float=false;const d=new Date(s);if(!(d instanceof Date)&&isNaN(d))date=false;else if(isNaN(d))date=false}if(int)return 'BIGINT';if(float)return 'DOUBLE';if(date)return 'DATETIME';return t}
function parseCSV(text){const out=[];let i=0;let cur='';let row=[];let q=false;while(i<text.length){const ch=text[i];if(q){if(ch==='\"'&&text[i+1]==='\"'){cur+='\"';i+=2;continue}else if(ch==='\"'){q=false;i++;continue}else{cur+=ch;i++;continue}}else{if(ch==='\"'){q=true;i++;continue}else if(ch===','){row.push(cur);cur='';i++;continue}else if(ch==='\r'){i++;continue}else if(ch==='\n'){row.push(cur);out.push(row);row=[];cur='';i++;continue}else{cur+=ch;i++;continue}}}row.push(cur);out.push(row);return out}
async function ensurePool(){
  if(!mysql)throw new Error('mysql2 not installed')
  if(!global.__pool){
    const cfg={host:process.env.MYSQL_HOST||'127.0.0.1',port:parseInt(process.env.MYSQL_PORT||'3307',10),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'ims',waitForConnections:true,connectionLimit:10,queueLimit:0}
    global.__pool=mysql.createPool(cfg)
    try{
      await global.__pool.query('SELECT 1')
    }catch(e){
      const msg=String(e&&e.message||'')
      const code=String(e&&e.code||'')
      if(code==='ER_BAD_DB_ERROR'||/Unknown database/i.test(msg)){
        const cfg2={...cfg}; delete cfg2.database
        const bootstrap=mysql.createPool(cfg2)
        try{
          await bootstrap.query('CREATE DATABASE IF NOT EXISTS `'+(cfg.database)+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        }finally{
          await bootstrap.end()
        }
        global.__pool=mysql.createPool(cfg)
      }else{
        throw e
      }
    }
  }
  return global.__pool
}
async function ensureInventoryView(){const pool=await ensurePool();const sql="CREATE OR REPLACE VIEW `inventory` AS SELECT p.`Name` AS product_name,p.`Category` AS category,p.`Description` AS description,p.`UnitPrice` AS unit_price,i.`Location` AS location,i.`Sublocation` AS sublocation,i.`Quantity` AS quantity,IFNULL(b.bom_lines,0) AS bom_lines FROM inflow_product p LEFT JOIN inflow_inventory i ON i.`Item`=p.`Name` LEFT JOIN (SELECT `FinishedItem`,COUNT(*) AS bom_lines FROM inflow_bom GROUP BY `FinishedItem`) b ON b.`FinishedItem`=p.`Name`;";await pool.query(sql)}
async function ensureVendorView(){const pool=await ensurePool();const sql="CREATE OR REPLACE VIEW `vendor` AS SELECT * FROM inflow_vendor;";await pool.query(sql)}
async function ensurePurchaseOrderView(){const pool=await ensurePool();const sql="CREATE OR REPLACE VIEW `purchase_order` AS SELECT * FROM inflow_purchaseorder;";await pool.query(sql)}
async function ensureSalesOrderView(){const pool=await ensurePool();const sql="CREATE OR REPLACE VIEW `sales_order` AS SELECT * FROM inflow_salesorder;";await pool.query(sql)}
async function ensureCustomerView(){const pool=await ensurePool();const sql="CREATE OR REPLACE VIEW `customer` AS SELECT * FROM inflow_customer;";await pool.query(sql)}
async function ensureTable(name,headers,rows){const pool=await ensurePool();const cols=toCols(headers);const sample=rows.slice(0,1000);const colTypes={};for(let c=0;c<cols.length;c++){const vals=sample.map(r=>r[c]).filter(v=>v!=null);const t=sniff(vals);colTypes[cols[c].name]=(t==='DATETIME'?'DATETIME':'TEXT')}const table=name;const conn=await pool.getConnection();try{await conn.query('CREATE TABLE IF NOT EXISTS `'+table+'` (id BIGINT AUTO_INCREMENT PRIMARY KEY)');const [existing]=await conn.query('SHOW COLUMNS FROM `'+table+'`');const set=new Set(existing.map(r=>r.Field));for(const col of cols){if(!set.has(col.name)){await conn.query('ALTER TABLE `'+table+'` ADD COLUMN `'+col.name+'` '+colTypes[col.name])}}return cols.map(c=>({name:c.name,type:colTypes[c.name]}))}finally{conn.release()}}
function __fmtDate(v){const d=new Date(v);if(!(d instanceof Date)||isNaN(d))return null;const pad=n=>String(n).padStart(2,'0');const Y=d.getFullYear();const M=pad(d.getMonth()+1);const D=pad(d.getDate());const h=pad(d.getHours());const m=pad(d.getMinutes());const s=pad(d.getSeconds());return `${Y}-${M}-${D} ${h}:${m}:${s}`}
async function replaceData(name,headers,rows,colDefs){const pool=await ensurePool();const conn=await pool.getConnection();const table=name;const colNames=toCols(headers).map(c=>c.name);const types=colDefs&&colDefs.map(c=>c.type)||null;try{await conn.beginTransaction();await conn.query('DELETE FROM `'+table+'`');if(rows.length){const colsSql=colNames.map(c=>'`'+c+'`').join(',');const placeholders='('+colNames.map(()=>'?').join(',')+')';const chunk=500;for(let i=0;i<rows.length;i+=chunk){const part=rows.slice(i,i+chunk);const flat=[];for(const r of part){for(let c=0;c<colNames.length;c++){let val=r[c];if(val===undefined||val===null||val===''){flat.push(null)}else if(types&&types[c]==='DATETIME'){flat.push(__fmtDate(val))}else{flat.push(val)}}}const sql='INSERT INTO `'+table+'` ('+colsSql+') VALUES '+part.map(()=>placeholders).join(',');await conn.query(sql,flat)}}await conn.commit()}catch(e){try{await conn.rollback()}catch{}throw e}finally{conn.release()}}
async function normalizeCollations(database){
  try{
    const pool=await ensurePool();
    try{await pool.query('ALTER DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')}catch{}
    try{await pool.query('SET GLOBAL character_set_server=utf8mb4')}catch{}
    try{await pool.query('SET GLOBAL collation_server=utf8mb4_unicode_ci')}catch{}
    const [tables]=await pool.query('SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[database]);
    if(tables&&tables.length){
      for(const r of tables){
        const name=r&&r.TABLE_NAME;const type=String(r&&r.TABLE_TYPE||'').toUpperCase();
        if(!name)continue;
        if(type==='VIEW'){continue}
        try{
          await pool.query('ALTER TABLE `'+name+'` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        }catch{}
      }
    }
  }catch{}
}
function __sqlEsc(v){if(v===null||v===undefined)return 'NULL';if(typeof v==='number')return String(v);if(v instanceof Date){const pad=n=>String(n).padStart(2,'0');const Y=v.getFullYear();const M=pad(v.getMonth()+1);const D=pad(v.getDate());const h=pad(v.getHours());const m=pad(v.getMinutes());const s=pad(v.getSeconds());return `'${Y}-${M}-${D} ${h}:${m}:${s}'`};let s=String(v);s=s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r\n/g,'\\n').replace(/\n/g,'\\n');return `'${s}'`}
async function nodeDumpDatabase(database){
  const pool=await ensurePool();
  let out=[];
  out.push('SET NAMES utf8mb4;');
  out.push('SET FOREIGN_KEY_CHECKS=0;');
  out.push('CREATE DATABASE IF NOT EXISTS `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  out.push('USE `'+database+'`;');
  const [tables]=await pool.query('SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[database]);
  for(const r of tables||[]){
    const name=r&&r.TABLE_NAME;const type=String(r&&r.TABLE_TYPE||'').toUpperCase();
    if(!name)continue;
    if(type==='VIEW')continue;
    try{
      const [cols]=await pool.query('SHOW COLUMNS FROM `'+name+'`');
      const defs=[];const colNames=[];
      for(const c of cols||[]){const fname=String(c.Field);let t=String(c.Type||'TEXT');defs.push('`'+fname+'` '+t);colNames.push('`'+fname+'`')}
      out.push('DROP TABLE IF EXISTS `'+name+'`;');
      out.push('CREATE TABLE `'+name+'` ('+defs.join(',')+') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
      const [rows]=await pool.query('SELECT * FROM `'+name+'`');
      if(rows&&rows.length){
        const chunk=500;for(let i=0;i<rows.length;i+=chunk){const part=rows.slice(i,i+chunk);const values=part.map(obj=>'('+colNames.map(k=>__sqlEsc(obj[k.replace(/`/g,'')])).join(',')+')');out.push('INSERT INTO `'+name+'` ('+colNames.join(',')+') VALUES '+values.join(',')+';')}
      }
    }catch(e){}
  }
  out.push('SET FOREIGN_KEY_CHECKS=1;');
  return out.join('\n')
}
async function handleAPI(req,res){
cors(res);
const url=new URL(req.url,'http://localhost');
if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
if(url.pathname==='/api/health'){
  try{const pool=await ensurePool();const [r]=await pool.query('SELECT 1 AS ok');ok(res,{ok:true,db:Boolean(r&&r.length)})}
  catch(e){ok(res,{ok:false,error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/version'&&req.method==='GET'){
  try{
    const pkgPath=path.join(__dirname,'package.json');
    const text=await readFile(pkgPath,'utf8');
    const pkg=JSON.parse(text||'{}');
    ok(res,{version:pkg&&pkg.version||null,name:'IMS'})
  }catch(e){
    ok(res,{version:null,name:'IMS'})
  }
  return
}
if(url.pathname==='/api/inventory/extended'&&req.method==='GET'){
  try{
    const key=url.searchParams.get('key')||'';
    if(!key)return bad(res,'missing key');
    const pool=await ensurePool();
    await pool.query('CREATE TABLE IF NOT EXISTS `inventory_extra` ( `ItemKey` VARCHAR(255) PRIMARY KEY, `Barcode` TEXT, `ReorderPoint` DOUBLE NULL, `ReorderQty` DOUBLE NULL, `DefaultLocation` TEXT, `DefaultSublocation` TEXT, `LastVendor` TEXT, `UomStd` TEXT, `UomSales` TEXT, `UomPurch` TEXT, `UomLoose` TEXT, `PuPerLu` DOUBLE NULL, `SuPerLu` DOUBLE NULL, `TrackingType` TEXT, `Remarks` TEXT, `Length` DOUBLE NULL, `Width` DOUBLE NULL, `Height` DOUBLE NULL, `Weight` DOUBLE NULL ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    try{const [cols]=await pool.query('SHOW COLUMNS FROM `inventory_extra`');const names=new Set((cols||[]).map(c=>c.Field));const adds=[];if(!names.has('UomLoose'))adds.push('ADD COLUMN `UomLoose` TEXT');if(!names.has('PuPerLu'))adds.push('ADD COLUMN `PuPerLu` DOUBLE NULL');if(!names.has('SuPerLu'))adds.push('ADD COLUMN `SuPerLu` DOUBLE NULL');if(!names.has('TrackingType'))adds.push('ADD COLUMN `TrackingType` TEXT');if(adds.length)await pool.query('ALTER TABLE `inventory_extra` '+adds.join(', '))}catch{}
    await pool.query('CREATE TABLE IF NOT EXISTS `inventory_bom` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `ComponentItem` TEXT, `Description` TEXT, `Quantity` DOUBLE NULL, `Cost` DOUBLE NULL, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await pool.query('CREATE TABLE IF NOT EXISTS `inventory_vendor` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Vendor` TEXT, `Price` DOUBLE NULL, `Code` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await pool.query('CREATE TABLE IF NOT EXISTS `inventory_tracking` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Serial` VARCHAR(255) NULL, `Lot` VARCHAR(255) NULL, `Expiration` DATE NULL, `Location` TEXT, `Sublocation` TEXT, `Quantity` DOUBLE NULL, `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP, `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, `User` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    try{const [cols]=await pool.query('SHOW COLUMNS FROM `inventory_tracking`');const names=new Set((cols||[]).map(c=>c.Field));const types=Object.fromEntries((cols||[]).map(c=>[c.Field,String(c.Type||'').toLowerCase()]));const alters=[];if(names.has('Serial')&&types['Serial']&&!types['Serial'].startsWith('varchar'))alters.push('MODIFY `Serial` VARCHAR(255) NULL');if(names.has('Lot')&&types['Lot']&&!types['Lot'].startsWith('varchar'))alters.push('MODIFY `Lot` VARCHAR(255) NULL');if(!names.has('CreatedAt'))alters.push('ADD COLUMN `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP');if(!names.has('UpdatedAt'))alters.push('ADD COLUMN `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');if(!names.has('User'))alters.push('ADD COLUMN `User` TEXT');if(alters.length)await pool.query('ALTER TABLE `inventory_tracking` '+alters.join(', '));const [idx]=await pool.query('SHOW INDEX FROM `inventory_tracking`');const inames=new Set((idx||[]).map(i=>i.Key_name));if(!inames.has('idx_it_item'))await pool.query('CREATE INDEX `idx_it_item` ON `inventory_tracking` (`ItemKey`)');if(!inames.has('idx_it_item_lot'))await pool.query('CREATE INDEX `idx_it_item_lot` ON `inventory_tracking` (`ItemKey`,`Lot`)');if(!inames.has('idx_it_item_exp'))await pool.query('CREATE INDEX `idx_it_item_exp` ON `inventory_tracking` (`ItemKey`,`Expiration`)');if(!inames.has('uniq_it_item_serial'))await pool.query('CREATE UNIQUE INDEX `uniq_it_item_serial` ON `inventory_tracking` (`ItemKey`,`Serial`)')}catch{}
    const [extraRows]=await pool.query('SELECT * FROM `inventory_extra` WHERE `ItemKey`=?',[key]);
    const [bomRows]=await pool.query('SELECT `ComponentItem` AS item, `Description` AS `desc`, `Quantity` AS qty, `Cost` AS cost FROM `inventory_bom` WHERE `ItemKey`=? ORDER BY id',[key]);
    const [vendorRows]=await pool.query('SELECT `Vendor` AS vendor, `Price` AS price, `Code` AS code FROM `inventory_vendor` WHERE `ItemKey`=? ORDER BY id',[key]);
    const [trackRows]=await pool.query('SELECT `Serial` AS serial, `Lot` AS lot, DATE_FORMAT(`Expiration`,"%Y-%m-%d") AS expiration, `Location` AS location, `Sublocation` AS sublocation, `Quantity` AS qty FROM `inventory_tracking` WHERE `ItemKey`=? ORDER BY id',[key]);
    ok(res,{key,extra:(extraRows&&extraRows[0])||null,bom:bomRows||[],vendors:vendorRows||[],tracking:trackRows||[]})
  }catch(e){
    json(res,500,{error:String(e&&e.message||e)})
  }
  return
}
if(url.pathname==='/api/inventory/tracking/summary'&&req.method==='GET'){
  try{
    const key=url.searchParams.get('key')||'';
    if(!key)return bad(res,'missing key');
    const pool=await ensurePool();
    await pool.query('CREATE TABLE IF NOT EXISTS `inventory_tracking` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Serial` VARCHAR(255) NULL, `Lot` VARCHAR(255) NULL, `Expiration` DATE NULL, `Location` TEXT, `Sublocation` TEXT, `Quantity` DOUBLE NULL, `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP, `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, `User` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    const [rows]=await pool.query('SELECT `Serial`,`Lot`,DATE_FORMAT(`Expiration`,"%Y-%m-%d") AS `Expiration`,`Location`,`Sublocation`,`Quantity` FROM `inventory_tracking` WHERE `ItemKey`=?',[key]);
    const list=rows||[];
    const total=list.reduce((a,r)=>a+(Number(r.Quantity)||0),0);
    const lots={};
    let serials=0;
    for(const r of list){
      const s=(r.Serial||'').trim();
      if(s)serials++;
      const lot=(r.Lot||'').trim()||'(no lot)';
      if(!lots[lot])lots[lot]={lot,qty:0,earliest:null};
      lots[lot].qty+=Number(r.Quantity)||0;
      if(r.Expiration){
        if(!lots[lot].earliest||r.Expiration<lots[lot].earliest)lots[lot].earliest=r.Expiration;
      }
    }
    const lotList=Object.values(lots);
    lotList.sort((a,b)=>{
      if(a.earliest&&!b.earliest)return -1;
      if(!a.earliest&&b.earliest)return 1;
      if(a.earliest&&b.earliest&&a.earliest!==b.earliest)return a.earliest<b.earliest?-1:1;
      return a.lot.localeCompare(b.lot);
    });
    ok(res,{total,serials,lots:lotList,list});
  }catch(e){
    json(res,500,{error:String(e&&e.message||e)})
  }
  return
}
if(url.pathname==='/api/normalize-collations'&&req.method==='POST'){
  try{
    const db=process.env.MYSQL_DATABASE||'ims';
    const pool=await ensurePool();
    let changed=[];let failed=[];
    try{await pool.query('ALTER DATABASE `'+db+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')}catch{}
    try{await pool.query('SET GLOBAL character_set_server=utf8mb4')}catch{}
    try{await pool.query('SET GLOBAL collation_server=utf8mb4_unicode_ci')}catch{}
    const [rows]=await pool.query('SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[db]);
    for(const r of rows||[]){
      const name=r&&r.TABLE_NAME;const type=String(r&&r.TABLE_TYPE||'').toUpperCase();
      if(!name)continue;
      if(type==='VIEW')continue;
      try{await pool.query('ALTER TABLE `'+name+'` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');changed.push(name)}catch{failed.push(name)}
    }
    ok(res,{ok:true,database:db,changed,failed})
  }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/inventory/tracking/validate'&&req.method==='POST'){
  const chunks=[];req.on('data',ch=>chunks.push(ch));req.on('end',async()=>{
    try{
      const body=Buffer.concat(chunks).toString('utf8')||'{}';
      const payload=JSON.parse(body||'{}');
      const key=String(payload&&payload.key||'');
      if(!key)return bad(res,'missing key');
      const serials=Array.isArray(payload&&payload.serials)?payload.serials:[];
      const clean=Array.from(new Set(serials.map(s=>String(s||'').trim()).filter(Boolean)));
      if(!clean.length){ok(res,{duplicates:[],conflicts:[]});return}
      const pool=await ensurePool();
      await pool.query('CREATE TABLE IF NOT EXISTS `inventory_tracking` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Serial` VARCHAR(255) NULL, `Lot` VARCHAR(255) NULL, `Expiration` DATE NULL, `Location` TEXT, `Sublocation` TEXT, `Quantity` DOUBLE NULL, `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP, `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, `User` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      const [rows]=await pool.query('SELECT `Serial` FROM `inventory_tracking` WHERE `ItemKey`=? AND `Serial` IN ('+clean.map(()=>'?').join(',')+')',[key,...clean]);
      const conflicts=new Set((rows||[]).map(r=>String(r.Serial||'').trim()).filter(Boolean));
      const seen=new Set();const dupSet=new Set();
      for(const s of clean){if(seen.has(s))dupSet.add(s);seen.add(s)}
      ok(res,{duplicates:Array.from(dupSet),conflicts:Array.from(conflicts)});
    }catch(e){
      json(res,400,{error:String(e&&e.message||e)})
    }
  });
  return
}
if(url.pathname==='/api/inventory/extended'&&req.method==='PUT'){
  const key=url.searchParams.get('key')||'';
  if(!key)return bad(res,'missing key');
  const chunks=[];req.on('data',ch=>chunks.push(ch));req.on('end',async()=>{
    try{
      const body=Buffer.concat(chunks).toString('utf8')||'{}';
      const payload=JSON.parse(body||'{}');
      const extra=payload&&payload.extra||{};
      const bom=Array.isArray(payload&&payload.bom)?payload.bom:[];
      const vendors=Array.isArray(payload&&payload.vendors)?payload.vendors:[];
      const tracking=Array.isArray(payload&&payload.tracking)?payload.tracking:[];
      const pool=await ensurePool();
      await pool.query('CREATE TABLE IF NOT EXISTS `inventory_extra` ( `ItemKey` VARCHAR(255) PRIMARY KEY, `Barcode` TEXT, `ReorderPoint` DOUBLE NULL, `ReorderQty` DOUBLE NULL, `DefaultLocation` TEXT, `DefaultSublocation` TEXT, `LastVendor` TEXT, `UomStd` TEXT, `UomSales` TEXT, `UomPurch` TEXT, `UomLoose` TEXT, `PuPerLu` DOUBLE NULL, `SuPerLu` DOUBLE NULL, `TrackingType` TEXT, `Remarks` TEXT, `Length` DOUBLE NULL, `Width` DOUBLE NULL, `Height` DOUBLE NULL, `Weight` DOUBLE NULL ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      try{const [cols]=await pool.query('SHOW COLUMNS FROM `inventory_extra`');const names=new Set((cols||[]).map(c=>c.Field));const adds=[];if(!names.has('UomLoose'))adds.push('ADD COLUMN `UomLoose` TEXT');if(!names.has('PuPerLu'))adds.push('ADD COLUMN `PuPerLu` DOUBLE NULL');if(!names.has('SuPerLu'))adds.push('ADD COLUMN `SuPerLu` DOUBLE NULL');if(!names.has('TrackingType'))adds.push('ADD COLUMN `TrackingType` TEXT');if(adds.length)await pool.query('ALTER TABLE `inventory_extra` '+adds.join(', '))}catch{}
      await pool.query('CREATE TABLE IF NOT EXISTS `inventory_bom` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `ComponentItem` TEXT, `Description` TEXT, `Quantity` DOUBLE NULL, `Cost` DOUBLE NULL, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      await pool.query('CREATE TABLE IF NOT EXISTS `inventory_vendor` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Vendor` TEXT, `Price` DOUBLE NULL, `Code` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      await pool.query('CREATE TABLE IF NOT EXISTS `inventory_tracking` ( `id` BIGINT AUTO_INCREMENT PRIMARY KEY, `ItemKey` VARCHAR(255) NOT NULL, `Serial` VARCHAR(255) NULL, `Lot` VARCHAR(255) NULL, `Expiration` DATE NULL, `Location` TEXT, `Sublocation` TEXT, `Quantity` DOUBLE NULL, `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP, `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, `User` TEXT, KEY(`ItemKey`) ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      try{const [cols]=await pool.query('SHOW COLUMNS FROM `inventory_tracking`');const names=new Set((cols||[]).map(c=>c.Field));const types=Object.fromEntries((cols||[]).map(c=>[c.Field,String(c.Type||'').toLowerCase()]));const alters=[];if(names.has('Serial')&&types['Serial']&&!types['Serial'].startsWith('varchar'))alters.push('MODIFY `Serial` VARCHAR(255) NULL');if(names.has('Lot')&&types['Lot']&&!types['Lot'].startsWith('varchar'))alters.push('MODIFY `Lot` VARCHAR(255) NULL');if(!names.has('CreatedAt'))alters.push('ADD COLUMN `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP');if(!names.has('UpdatedAt'))alters.push('ADD COLUMN `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');if(!names.has('User'))alters.push('ADD COLUMN `User` TEXT');if(alters.length)await pool.query('ALTER TABLE `inventory_tracking` '+alters.join(', '));const [idx]=await pool.query('SHOW INDEX FROM `inventory_tracking`');const inames=new Set((idx||[]).map(i=>i.Key_name));if(!inames.has('idx_it_item'))await pool.query('CREATE INDEX `idx_it_item` ON `inventory_tracking` (`ItemKey`)');if(!inames.has('idx_it_item_lot'))await pool.query('CREATE INDEX `idx_it_item_lot` ON `inventory_tracking` (`ItemKey`,`Lot`)');if(!inames.has('idx_it_item_exp'))await pool.query('CREATE INDEX `idx_it_item_exp` ON `inventory_tracking` (`ItemKey`,`Expiration`)');if(!inames.has('uniq_it_item_serial'))await pool.query('CREATE UNIQUE INDEX `uniq_it_item_serial` ON `inventory_tracking` (`ItemKey`,`Serial`)')}catch{}
      const conn=await pool.getConnection();
      try{
        await conn.beginTransaction();
        const ttype=String(extra&&extra.TrackingType||'').toLowerCase();
        if(ttype==='serial'){
          for(const r of tracking){if(r&&String(r.qty||'')!=='1')throw new Error('Serial tracking requires qty=1');if(!String(r.serial||'').trim())throw new Error('Serial is required for serial tracking')}
          const serials=tracking.map(r=>String(r.serial||'').trim()).filter(Boolean);
          if(serials.length){const set=new Set();for(const s of serials){if(set.has(s))throw new Error('Duplicate serial in payload: '+s);set.add(s)}const [rows]=await conn.query('SELECT `Serial` FROM `inventory_tracking` WHERE `ItemKey`=? AND `Serial` IN ('+serials.map(()=>'?').join(',')+')',[key,...serials]);if(rows&&rows.length){throw new Error('Serial already exists: '+String(rows[0].Serial))}}
        }
        await conn.query('INSERT INTO `inventory_extra` (`ItemKey`,`Barcode`,`ReorderPoint`,`ReorderQty`,`DefaultLocation`,`DefaultSublocation`,`LastVendor`,`UomStd`,`UomSales`,`UomPurch`,`UomLoose`,`PuPerLu`,`SuPerLu`,`TrackingType`,`Remarks`,`Length`,`Width`,`Height`,`Weight`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE `Barcode`=VALUES(`Barcode`),`ReorderPoint`=VALUES(`ReorderPoint`),`ReorderQty`=VALUES(`ReorderQty`),`DefaultLocation`=VALUES(`DefaultLocation`),`DefaultSublocation`=VALUES(`DefaultSublocation`),`LastVendor`=VALUES(`LastVendor`),`UomStd`=VALUES(`UomStd`),`UomSales`=VALUES(`UomSales`),`UomPurch`=VALUES(`UomPurch`),`UomLoose`=VALUES(`UomLoose`),`PuPerLu`=VALUES(`PuPerLu`),`SuPerLu`=VALUES(`SuPerLu`),`TrackingType`=VALUES(`TrackingType`),`Remarks`=VALUES(`Remarks`),`Length`=VALUES(`Length`),`Width`=VALUES(`Width`),`Height`=VALUES(`Height`),`Weight`=VALUES(`Weight`)',[
          key,extra.Barcode||null,extra.ReorderPoint||null,extra.ReorderQty||null,extra.DefaultLocation||null,extra.DefaultSublocation||null,extra.LastVendor||null,extra.UomStd||null,extra.UomSales||null,extra.UomPurch||null,extra.UomLoose||null,extra.PuPerLu||null,extra.SuPerLu||null,(extra.TrackingType||null),extra.Remarks||null,extra.Length||null,extra.Width||null,extra.Height||null,extra.Weight||null
        ]);
        await conn.query('DELETE FROM `inventory_bom` WHERE `ItemKey`=?',[key]);
        if(bom&&bom.length){
          const values=[];const placeholders=[];
          for(const r of bom){placeholders.push('(?,?,?,?,?)');values.push(key,r.item||null,r.desc||null,Number(r.qty)||0,Number(r.cost)||0)}
          await conn.query('INSERT INTO `inventory_bom` (`ItemKey`,`ComponentItem`,`Description`,`Quantity`,`Cost`) VALUES '+placeholders.join(','),values)
        }
        await conn.query('DELETE FROM `inventory_vendor` WHERE `ItemKey`=?',[key]);
        if(vendors&&vendors.length){
          const values=[];const placeholders=[];
          for(const r of vendors){placeholders.push('(?,?,?,?)');values.push(key,r.vendor||null,Number(r.price)||0,r.code||null)}
          await conn.query('INSERT INTO `inventory_vendor` (`ItemKey`,`Vendor`,`Price`,`Code`) VALUES '+placeholders.join(','),values)
        }
        await conn.query('DELETE FROM `inventory_tracking` WHERE `ItemKey`=?',[key]);
        if(tracking&&tracking.length){
          const values=[];const placeholders=[];
          for(const r of tracking){placeholders.push('(?,?,?,?,?,?,?)');values.push(key,r.serial||null,r.lot||null,(r.expiration||null),r.location||null,r.sublocation||null,Number(r.qty)||0)}
          await conn.query('INSERT INTO `inventory_tracking` (`ItemKey`,`Serial`,`Lot`,`Expiration`,`Location`,`Sublocation`,`Quantity`) VALUES '+placeholders.join(','),values)
        }
        await conn.commit();
        ok(res,{ok:true})
      }catch(e){
        try{await conn.rollback()}catch{}
        throw e
      }finally{
        conn.release()
      }
    }catch(e){
      json(res,400,{error:String(e&&e.message||e)})
    }
  });
  return
}
const p=url.pathname.replace(/\/+$/,'')
if((p==='/api/backup'||p.startsWith('/api/backup'))&&(req.method==='GET'||req.method==='HEAD')){
  try{
    const cfg={host:process.env.MYSQL_HOST||'127.0.0.1',port:String(parseInt(process.env.MYSQL_PORT||'3307',10)),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'ims'}
    const charsetDir=path.join(__dirname,'mariadb','share','charsets')
    const candRaw=[path.join(__dirname,'mariadb','bin','mysqldump.exe'),path.join(__dirname,'mariadb','bin','mariadb-dump.exe'),'mysqldump.exe','mariadb-dump.exe']
    const cand=[];for(const p of candRaw){try{await stat(p);cand.push(p)}catch{}}
    if(!cand.length){bad(res,'dump tool not found');return}
    const baseArgs=['--host='+cfg.host,'--port='+cfg.port,'--user='+cfg.user,'--single-transaction','--quick','--routines','--events','--default-character-set=utf8mb4','--set-charset','--skip-tz-utc','--databases',cfg.database]
    if(cfg.password){baseArgs.unshift('--password='+cfg.password)}
    try{await stat(charsetDir);baseArgs.push('--character-sets-dir='+charsetDir.replace(/\\/g,'/'))}catch{}
    async function runDump(tool){
      return await new Promise((resolve,reject)=>{
        execFile(tool,baseArgs,{windowsHide:true,maxBuffer:1024*1024*200},(err,stdout,stderr)=>{
          if(err){reject(new Error('['+tool+'] '+String(err&&err.message||err)+' :: '+stderr));return}
          resolve(stdout)
        })
      })
    }
    const ts=new Date();const pad=n=>String(n).padStart(2,'0');const base=`${cfg.database}-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;const fnSql=base+'.sql';const fnZip=base+'.zip'
    if(req.method==='HEAD'){res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+fnZip+'"'});res.end();return}
    let dumpOut=null;let lastErr=null
    const preferNode=(process.env.SPUDS_BACKUP_MODE||'node').toLowerCase()==='node';
    if(preferNode){
      try{dumpOut=await nodeDumpDatabase(cfg.database)}catch(e){lastErr=e}
    }else{
      for(const tool of cand){
        try{dumpOut=await runDump(tool);lastErr=null;break}catch(e){lastErr=e}
      }
      const errMsg=String(lastErr&&lastErr.message||'')
      if(!dumpOut && /Character set|compiled character set|#255|0900/i.test(errMsg)){
        try{await normalizeCollations(cfg.database)}catch{}
        try{const pool=await ensurePool();await pool.query('FLUSH TABLES')}catch{}
        lastErr=null
        for(const tool of cand){
          try{dumpOut=await runDump(tool);lastErr=null;break}catch(e){lastErr=e}
        }
      }
      if(!dumpOut){
        try{
          dumpOut=await nodeDumpDatabase(cfg.database)
        }catch(e){}
      }
    }
    if(!dumpOut){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(lastErr&&lastErr.message||lastErr)}));return}
    const tmpSql=path.join(os.tmpdir(),'spuds-backup-'+Date.now()+'.sql')
    await writeFile(tmpSql,dumpOut,'utf8')
    const tmpZip=path.join(os.tmpdir(),'spuds-backup-'+Date.now()+'.zip')
    const cmd='Compress-Archive -Path \"'+tmpSql.replace(/\\/g,'/')+'\" -DestinationPath \"'+tmpZip.replace(/\\/g,'/')+'\" -Force'
    execFile('powershell.exe',['-NoProfile','-Command',cmd],{windowsHide:true},(perr,pout,perrStr)=>{
      try{require('fs').unlinkSync(tmpSql)}catch{}
      if(perr){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(perr&&perr.message||perr),detail:perrStr}));return}
      readFile(tmpZip).then(data=>{
        res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename=\"'+fnZip+'\"'})
        res.end(data)
        try{require('fs').unlinkSync(tmpZip)}catch{}
      }).catch(e=>{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(e&&e.message||e)}))})
    })
  }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/vendors/import-from-po'&&req.method==='POST'){
  try{
    const pool=await ensurePool();
    await ensurePurchaseOrderView();
    let vendorCol=null;
    try{
      const [cols]=await pool.query('SHOW COLUMNS FROM `purchase_order`');
      const candidates=['Vendor','VendorName','Supplier','Company','Name'];
      for(const c of candidates){if(cols.find(x=>String(x.Field).toLowerCase()===c.toLowerCase())){vendorCol=c;break}}
    }catch{}
    if(!vendorCol){bad(res,'Could not detect vendor column from purchase_order');return}
    await pool.query('CREATE TABLE IF NOT EXISTS `vendor_derived` (id BIGINT AUTO_INCREMENT PRIMARY KEY, `Name` VARCHAR(255) NOT NULL, `Contact` TEXT, `Phone` TEXT, `Email` TEXT, `Website` TEXT, `Remarks` TEXT, UNIQUE KEY `uniq_name` (`Name`)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    const [before]=await pool.query('SELECT COUNT(*) AS c FROM `vendor_derived`');const cBefore=Number(before&&before[0]&&before[0].c||0);
    await pool.query('INSERT IGNORE INTO `vendor_derived` (`Name`) SELECT DISTINCT `' + vendorCol + '` AS `Name` FROM `purchase_order` WHERE `' + vendorCol + '` IS NOT NULL AND `' + vendorCol + '`<>""');
    const [after]=await pool.query('SELECT COUNT(*) AS c FROM `vendor_derived`');const cAfter=Number(after&&after[0]&&after[0].c||0);
    ok(res,{ok:true,added:Math.max(0,cAfter-cBefore),total:cAfter,sourceColumn:vendorCol})
  }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/customer/extended'&&req.method==='GET'){
  try{
    const name=(url.searchParams.get('name')||'').trim();
    if(!name)return bad(res,'missing name');
    const pool=await ensurePool();
    await pool.query('CREATE TABLE IF NOT EXISTS `customer_extra` ( `Name` VARCHAR(255) PRIMARY KEY, `Address` TEXT, `BusinessAddress` TEXT, `ShipToAddress` TEXT, `Contact` TEXT, `Phone` TEXT, `Fax` TEXT, `Email` TEXT, `Website` TEXT, `Currency` TEXT, `Discount` DOUBLE NULL, `PaymentTerms` TEXT, `TaxingScheme` TEXT, `TaxExempt` TEXT, `Remarks` TEXT ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    try{const [cols]=await pool.query('SHOW COLUMNS FROM `customer_extra`');const names=new Set((cols||[]).map(c=>c.Field));const adds=[];if(!names.has('BusinessAddress'))adds.push('ADD COLUMN `BusinessAddress` TEXT');if(!names.has('ShipToAddress'))adds.push('ADD COLUMN `ShipToAddress` TEXT');if(adds.length)await pool.query('ALTER TABLE `customer_extra` '+adds.join(', '))}catch{}
    const [rows]=await pool.query('SELECT * FROM `customer_extra` WHERE `Name`=?',[name]);
    ok(res,{name,extra:(rows&&rows[0])||null})
  }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/customer/extended'&&req.method==='PUT'){
  const name=(url.searchParams.get('name')||'').trim();
  if(!name)return bad(res,'missing name');
  const chunks=[];req.on('data',ch=>chunks.push(ch));req.on('end',async()=>{
    try{
      const body=Buffer.concat(chunks).toString('utf8')||'{}';
      const payload=JSON.parse(body||'{}');
      const extra=payload&&payload.extra||{};
      const pool=await ensurePool();
      await pool.query('CREATE TABLE IF NOT EXISTS `customer_extra` ( `Name` VARCHAR(255) PRIMARY KEY, `Address` TEXT, `BusinessAddress` TEXT, `ShipToAddress` TEXT, `Contact` TEXT, `Phone` TEXT, `Fax` TEXT, `Email` TEXT, `Website` TEXT, `Currency` TEXT, `Discount` DOUBLE NULL, `PaymentTerms` TEXT, `TaxingScheme` TEXT, `TaxExempt` TEXT, `Remarks` TEXT ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      try{const [cols]=await pool.query('SHOW COLUMNS FROM `customer_extra`');const names=new Set((cols||[]).map(c=>c.Field));const adds=[];if(!names.has('BusinessAddress'))adds.push('ADD COLUMN `BusinessAddress` TEXT');if(!names.has('ShipToAddress'))adds.push('ADD COLUMN `ShipToAddress` TEXT');if(adds.length)await pool.query('ALTER TABLE `customer_extra` '+adds.join(', '))}catch{}
      const cols=['Address','BusinessAddress','ShipToAddress','Contact','Phone','Fax','Email','Website','Currency','Discount','PaymentTerms','TaxingScheme','TaxExempt','Remarks'];
      const vals=cols.map(k=>extra[k]??null);
      const placeholders=cols.map(()=>'?').join(',');
      const updates=cols.map(k=>'`'+k+'`=VALUES(`'+k+'`)').join(',');
      await pool.query('INSERT INTO `customer_extra` (`Name`,'+cols.map(c=>'`'+c+'`').join(',')+') VALUES (?, '+placeholders+') ON DUPLICATE KEY UPDATE '+updates,[name,...vals]);
      ok(res,{ok:true})
    }catch(e){json(res,400,{error:String(e&&e.message||e)})}
  });
  return
}
if(url.pathname==='/api/restore'&&req.method==='POST'){
  const chunks=[];req.on('data',ch=>{chunks.push(ch)});req.on('end',async()=>{
    try{
      if(!chunks.length)return bad(res,'empty');
      const buf=Buffer.concat(chunks);
      const isZip=buf.length>=4&&buf[0]===0x50&&buf[1]===0x4b&&buf[2]===0x03&&buf[3]===0x04
      const cfg={host:process.env.MYSQL_HOST||'127.0.0.1',port:String(parseInt(process.env.MYSQL_PORT||'3307',10)),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'ims'}
      const cand=[path.join(__dirname,'mariadb','bin','mariadb.exe'),path.join(__dirname,'mariadb','bin','mysql.exe'),'mariadb.exe','mysql.exe']
      let mysqlExe=null;for(const p of cand){try{await stat(p);mysqlExe=p;break}catch{}}
      if(!mysqlExe){bad(res,'mysql client not found');return}
      const runWithText=async(text)=>{
        return await new Promise((resolve,reject)=>{
          const args=['--host='+cfg.host,'--port='+cfg.port,'--user='+cfg.user,'--database='+cfg.database];if(cfg.password){args.unshift('--password='+cfg.password)}
          const cp=spawn(mysqlExe,args,{windowsHide:true})
          let stderr='';cp.stderr.on('data',d=>{stderr+=String(d||'')});cp.on('error',reject);cp.on('close',code=>{if(code!==0){reject(new Error(stderr||('exit '+code)))}else{resolve()}})
          try{cp.stdin.write(text)}catch(e){reject(e)}finally{try{cp.stdin.end()}catch{}}
        })
      }
      if(isZip){
        const zipPath=path.join(os.tmpdir(),'spuds-restore-'+Date.now()+'.zip')
        await writeFile(zipPath,buf)
        const dest=path.join(os.tmpdir(),'spuds-restore-dir-'+Date.now())
        const cmd='Expand-Archive -Path \"'+zipPath.replace(/\\/g,'/')+'\" -DestinationPath \"'+dest.replace(/\\/g,'/')+'\" -Force'
        await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-Command',cmd],{windowsHide:true},(e)=>e?reject(e):resolve()))
        let files=await readdir(dest);const sqlFile=files.find(f=>/\.sql$/i.test(f))
        if(!sqlFile){bad(res,'no .sql in zip');try{require('fs').unlinkSync(zipPath)}catch{};return}
        const srcWin=path.join(dest,sqlFile)
        const text=await readFile(srcWin,'utf8')
        try{await runWithText(text);ok(res,{ok:true})}
        catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(e&&e.message||e)}))}
        finally{try{require('fs').unlinkSync(zipPath)}catch{};try{require('fs').unlinkSync(srcWin)}catch{}}
      }else{
        const tmp=path.join(os.tmpdir(),`spuds-restore-${Date.now()}.sql`)
        await writeFile(tmp,buf.toString('utf8'),'utf8')
        const text=await readFile(tmp,'utf8')
        try{await runWithText(text);ok(res,{ok:true})}
        catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(e&&e.message||e)}))}
        finally{try{require('fs').unlinkSync(tmp)}catch{}}
      }
    }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  })
  return
}
if(url.pathname==='/api/schema'){
  const t=url.searchParams.get('table')||'';
  if(!isValidName(t))return bad(res,'invalid table');
  try{
    if(t==='inventory')await ensureInventoryView();
    if(t==='vendor')await ensureVendorView();
    if(t==='purchase_order')await ensurePurchaseOrderView();
    if(t==='sales_order')await ensureSalesOrderView();
    if(t==='customer')await ensureCustomerView();
    const pool=await ensurePool();
    const [rows]=await pool.query('SHOW COLUMNS FROM `'+t+'`');
    ok(res,{table:t,schema:rows.map(r=>r.Field)})
  }catch(e){
    ok(res,{table:t,schema:[]})
  }
  return
}
if(url.pathname==='/api/data'){
  const t=url.searchParams.get('table')||'';
  if(!isValidName(t))return bad(res,'invalid table');
  const limit=Math.min(1000,parseInt(url.searchParams.get('limit')||'200',10)||200);
  const offset=Math.max(0,parseInt(url.searchParams.get('offset')||'0',10)||0);
  try{
    if(t==='inventory')await ensureInventoryView();
    if(t==='vendor')await ensureVendorView();
    if(t==='purchase_order')await ensurePurchaseOrderView();
    if(t==='sales_order')await ensureSalesOrderView();
    if(t==='customer')await ensureCustomerView();
    const pool=await ensurePool();
    const [rows]=await pool.query('SELECT * FROM `'+t+'` LIMIT ? OFFSET ?',[limit,offset]);
    ok(res,{table:t,rows})
  }catch(e){
    ok(res,{table:t,rows:[]})
  }
  return
}
if(url.pathname==='/api/count'){
  const t=url.searchParams.get('table')||'';
  if(!isValidName(t))return bad(res,'invalid table');
  try{
    if(t==='inventory')await ensureInventoryView();
    if(t==='vendor')await ensureVendorView();
    if(t==='purchase_order')await ensurePurchaseOrderView();
    if(t==='sales_order')await ensureSalesOrderView();
    if(t==='customer')await ensureCustomerView();
    const pool=await ensurePool();
    const [rows]=await pool.query('SELECT COUNT(*) AS c FROM `'+t+'`');
    ok(res,{table:t,count:Number(rows&&rows[0]&&rows[0].c||0)})
  }catch(e){
    ok(res,{table:t,count:0})
  }
  return
}
if(url.pathname==='/api/import2'&&req.method==='PUT'){
  const t=url.searchParams.get('table')||'';
  if(!isValidName(t)){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'invalid table'}));return}
  let body='';req.on('data',ch=>{body+=ch});req.on('end',async()=>{
    try{
      if(!body){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'empty'}));return}
      const grid=parseCSV(body).filter(r=>r&&r.length);
      if(!grid.length){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'no rows'}));return}
      const headers=grid[0];const rows=grid.slice(1);
    const cols=await ensureTable(t,headers,rows);
    await replaceData(t,headers,rows,cols);
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true,table:t,columns:cols.map(c=>c.name),rows:rows.length}))
    }catch(e){
      res.writeHead(400,{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:String(e&&e.message||e),code:e&&e.code,detail:(e&&e.stack)||(e&&e.sqlMessage)}))
    }
  });
  return
}
if(url.pathname==='/api/import'&&req.method==='PUT'){
  const t=url.searchParams.get('table')||'';
  if(!isValidName(t))return bad(res,'invalid table');
  let body='';req.on('data',ch=>{body+=ch});req.on('end',async()=>{
    try{
      if(!body)return bad(res,'empty');
      const grid=parseCSV(body).filter(r=>r&&r.length);
      if(!grid.length)return bad(res,'no rows');
      const headers=grid[0];const rows=grid.slice(1);
      const cols=await ensureTable(t,headers,rows);
      await replaceData(t,headers,rows,cols);
      ok(res,{ok:true,table:t,columns:cols.map(c=>c.name),rows:rows.length})
    }catch(e){
      res.writeHead(400,{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:String(e&&e.message||e),code:e&&e.code,detail:(e&&e.stack)||(e&&e.sqlMessage)}))
    }
  });
  return
}
if(url.pathname==='/api/selftest'&&req.method==='GET'){
  try{
    const pool=await ensurePool();
    let dbOk=false;try{const [r]=await pool.query('SELECT 1 AS ok');dbOk=Boolean(r&&r.length)}catch{}
    let views={inventory:false,vendor:false,purchase_order:false,sales_order:false,customer:false};
    try{
      await ensureInventoryView();await ensureVendorView();await ensurePurchaseOrderView();await ensureSalesOrderView();await ensureCustomerView();
      const [vrows]=await pool.query('SHOW FULL TABLES WHERE Table_type="VIEW"');
      const set=new Set((vrows||[]).map(r=>Object.values(r)[0]));
      views.inventory=set.has('inventory');views.vendor=set.has('vendor');views.purchase_order=set.has('purchase_order');views.sales_order=set.has('sales_order');views.customer=set.has('customer');
    }catch{}
    let tables={inventory_extra:false,inventory_tracking:false,customer_extra:false};
    try{
      const [trows]=await pool.query('SHOW TABLES');
      const tset=new Set((trows||[]).map(r=>Object.values(r)[0]));
      tables.inventory_extra=tset.has('inventory_extra');
      tables.inventory_tracking=tset.has('inventory_tracking');
      tables.customer_extra=tset.has('customer_extra');
    }catch{}
    const nets=os.networkInterfaces();const ips=[];for(const k of Object.keys(nets||{})){for(const ni of (nets[k]||[])){if(ni&&ni.family==='IPv4'&&ni.address!=='127.0.0.1'&&!String(ni.address||'').startsWith('169.254.'))ips.push(ni.address)}}ips.sort();
    ok(res,{db:dbOk,views,tables,ips,apiPort:PORT,mysqlPort:process.env.MYSQL_PORT||null})
  }catch(e){
    json(res,500,{error:String(e&&e.message||e)})
  }
  return
}
notFound(res)
}
async function serveStatic(req,res){let fp=PUBLIC+decodeURIComponent(new URL(req.url,'http://localhost').pathname);try{let st=await stat(fp);if(st.isDirectory()){const index=path.join(fp,'index.html');st=await stat(index);fp=index}const data=await readFile(fp);const ext=path.extname(fp).toLowerCase();const map={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};res.writeHead(200,{'Content-Type':map[ext]||'application/octet-stream'});res.end(data)}catch{notFound(res)}}
const server=http.createServer(async (req,res)=>{try{if(req.url.startsWith('/api/')){await handleAPI(req,res)}else{await serveStatic(req,res)}}catch(e){json(res,500,{error:String(e&&e.message||e)})}})
server.listen(PORT,'0.0.0.0',()=>{})
