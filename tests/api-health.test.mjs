import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'

const TEST_PORT=process.env.TEST_PORT||'3205'
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
  let res=await tryHealth(TEST_PORT)
  let child=null
  if(!res){
    child=startServer(TEST_PORT)
    await t.cleanup(()=>{try{child.kill()}catch{}})
    res=await waitForReady(TEST_PORT)
  }
  assert.equal(res.status,200)
  const obj=JSON.parse(res.body)
  assert.equal(typeof obj.ok,'boolean')
})
