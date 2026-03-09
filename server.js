import http from 'http'
import { readFile, stat, readdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
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
async function handleAPI(req,res){
cors(res);
const url=new URL(req.url,'http://localhost');
if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
if(url.pathname==='/api/health'){
  try{const pool=await ensurePool();const [r]=await pool.query('SELECT 1 AS ok');ok(res,{ok:true,db:Boolean(r&&r.length)})}
  catch(e){ok(res,{ok:false,error:String(e&&e.message||e)})}
  return
}
if(url.pathname.replace(/\/+$/,'')==='/api/backup'&&(req.method==='GET'||req.method==='HEAD')){
  try{
    const cfg={host:process.env.MYSQL_HOST||'127.0.0.1',port:String(parseInt(process.env.MYSQL_PORT||'3307',10)),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'ims'}
    const cand=[path.join(__dirname,'mariadb','bin','mariadb-dump.exe'),path.join(__dirname,'mariadb','bin','mysqldump.exe'),'mariadb-dump.exe','mysqldump.exe']
    let dump=null;for(const p of cand){try{await stat(p);dump=p;break}catch{}}
    if(!dump){bad(res,'dump tool not found');return}
    const args=['--host='+cfg.host,'--port='+cfg.port,'--user='+cfg.user,'--single-transaction','--quick','--routines','--events','--default-character-set=utf8mb4','--databases',cfg.database]
    if(cfg.password){args.unshift('--password='+cfg.password)}
    const ts=new Date();const pad=n=>String(n).padStart(2,'0');const fn=`${cfg.database}-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.sql`
    if(req.method==='HEAD'){res.writeHead(200,{'Content-Type':'application/sql','Content-Disposition':'attachment; filename="'+fn+'"'});res.end();return}
    execFile(dump,args,{windowsHide:true,maxBuffer:1024*1024*200},(err,stdout,stderr)=>{
      if(err){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(err&&err.message||err),detail:stderr}));return}
      res.writeHead(200,{'Content-Type':'application/sql','Content-Disposition':'attachment; filename="'+fn+'"'});
      res.end(stdout)
    })
  }catch(e){json(res,500,{error:String(e&&e.message||e)})}
  return
}
if(url.pathname==='/api/restore'&&req.method==='POST'){
  let body='';req.on('data',ch=>{body+=ch});req.on('end',async()=>{
    try{
      if(!body)return bad(res,'empty');
      const cfg={host:process.env.MYSQL_HOST||'127.0.0.1',port:String(parseInt(process.env.MYSQL_PORT||'3307',10)),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'ims'}
      const cand=[path.join(__dirname,'mariadb','bin','mariadb.exe'),path.join(__dirname,'mariadb','bin','mysql.exe'),'mariadb.exe','mysql.exe']
      let mysqlExe=null;for(const p of cand){try{await stat(p);mysqlExe=p;break}catch{}}
      if(!mysqlExe){bad(res,'mysql client not found');return}
      const tmp=path.join(os.tmpdir(),`spuds-restore-${Date.now()}.sql`)
      await writeFile(tmp,body,'utf8')
      const src=tmp.replace(/\\\\/g,'/').replace(/\\/g,'/')
      const args=['--host='+cfg.host,'--port='+cfg.port,'--user='+cfg.user]
      if(cfg.password){args.unshift('--password='+cfg.password)}
      args.push('--execute=source "'+src+'"')
      execFile(mysqlExe,args,{windowsHide:true,maxBuffer:1024*1024*200},(err,stdout,stderr)=>{
        try{require('fs').unlinkSync(tmp)}catch{}
        if(err){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(err&&err.message||err),detail:stderr}));return}
        ok(res,{ok:true})
      })
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
notFound(res)
}
async function serveStatic(req,res){let fp=PUBLIC+decodeURIComponent(new URL(req.url,'http://localhost').pathname);try{let st=await stat(fp);if(st.isDirectory()){const index=path.join(fp,'index.html');st=await stat(index);fp=index}const data=await readFile(fp);const ext=path.extname(fp).toLowerCase();const map={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};res.writeHead(200,{'Content-Type':map[ext]||'application/octet-stream'});res.end(data)}catch{notFound(res)}}
const server=http.createServer(async (req,res)=>{try{if(req.url.startsWith('/api/')){await handleAPI(req,res)}else{await serveStatic(req,res)}}catch(e){json(res,500,{error:String(e&&e.message||e)})}})
server.listen(PORT,()=>{})
