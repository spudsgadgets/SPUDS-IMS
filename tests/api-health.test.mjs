import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'

const TEST_PORT=process.env.TEST_PORT||'3205'
function getFreePort(){
  return new Promise((resolve,reject)=>{
    const s=net.createServer()
    s.on('error',reject)
    s.listen(0,'127.0.0.1',()=>{
      const addr=s.address()
      const port=addr&&typeof addr==='object'&&addr.port?addr.port:null
      s.close(()=>resolve(port))
    })
  })
}
function get(url){
  return new Promise((resolve,reject)=>{
    const req=http.get(url,res=>{
      const chunks=[]
      res.on('data',c=>chunks.push(c))
      res.on('end',()=>{
        const body=Buffer.concat(chunks).toString('utf8')
        resolve({status:res.statusCode,body})
      })
    })
    req.on('error',reject)
    req.setTimeout(3000,()=>{req.destroy(new Error('timeout'))})
  })
}
function requestJson(url,{method='GET',headers={},body=null}={}){
  return new Promise((resolve,reject)=>{
    const u=new URL(url)
    const req=http.request({method,hostname:u.hostname,port:u.port,path:u.pathname+u.search,headers},res=>{
      const chunks=[]
      res.on('data',c=>chunks.push(c))
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8')
        let jsonObj=null
        try{jsonObj=JSON.parse(text||'null')}catch{}
        resolve({status:res.statusCode,body:text,json:jsonObj,headers:res.headers})
      })
    })
    req.on('error',reject)
    req.setTimeout(3000,()=>{req.destroy(new Error('timeout'))})
    if(body!=null)req.write(body)
    req.end()
  })
}
async function tryHealth(port){
  try{
    return await get('http://127.0.0.1:'+port+'/api/health')
  }catch(e){
    return null
  }
}
function startServer(port){
  const env={...process.env,MYSQL_PORT:'3307',PORT:String(port)}
  const child=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']})
  return child
}
async function waitForReady(port,timeoutMs=10000){
  const start=Date.now()
  while(Date.now()-start<timeoutMs){
    const res=await tryHealth(port)
    if(res&&res.status===200)return res
    await new Promise(r=>setTimeout(r,300))
  }
  throw new Error('server not responding on /api/health:'+port)
}
test('server responds on /api/health',async t=>{
  const port=String(await getFreePort()||TEST_PORT)
  const child=startServer(port)
  t.after(()=>{try{child.kill()}catch{}})
  const res=await waitForReady(port)
  assert.equal(res.status,200)
  const obj=JSON.parse(res.body)
  assert.equal(typeof obj.ok,'boolean')

  const login=await requestJson('http://127.0.0.1:'+port+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'test',password:'test',remember:false})})
  assert.equal(login.status,200)
  assert.equal(Boolean(login.json&&login.json.token),true)

  const me=await requestJson('http://127.0.0.1:'+port+'/api/auth/me',{method:'GET',headers:{Authorization:'Bearer '+login.json.token}})
  assert.equal(me.status,200)
  assert.equal(me.json&&me.json.user&&me.json.user.name,'test')
})
