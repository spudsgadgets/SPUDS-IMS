const http=require('http')
const fs=require('fs')
const path=require('path')
const port=Number(process.argv[2])||3200
const root=process.cwd()
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.csv':'text/csv'}
const srv=http.createServer((req,res)=>{
  if(req.url==='/__debug'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({port,root,now:new Date().toISOString()}));return}
  let u=decodeURIComponent((req.url||'/').split('?')[0])
  if(u==='/')u='/index.html'
  let fp=path.join(root,u.replace(/^\/+/,''))
  fs.stat(fp,(e,st)=>{
    if(!e&&st.isDirectory())fp=path.join(fp,'index.html')
    fs.readFile(fp,(e2,buf)=>{
      if(e2){
        fs.readFile(path.join(root,'index.html'),(e3,buf2)=>{
          if(e3){res.writeHead(404);res.end('Not found');return}
          res.writeHead(200,{'Content-Type':'text/html'});res.end(buf2)
        })
        return
      }
      const ext=path.extname(fp).toLowerCase()
      res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'})
      res.end(buf)
    })
  })
})
srv.listen(port,'0.0.0.0',()=>{console.log(JSON.stringify({port,root,url:'http://localhost:'+port+'/' }))})
