const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3471);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3471/",{waitUntil:"load"});
  await p.waitForTimeout(800);
  const results=[];
  for (const fs of [141,160,180,200,220,240]) {
    for (const ls of [-0.04,-0.06,-0.08,-0.10,-0.12]) {
      const m=await p.evaluate(({fs,ls})=>{
        const wm=document.querySelector(".hero-wordmark-text");
        wm.style.fontSize=fs+"px"; wm.style.lineHeight=fs+"px"; wm.style.height=fs+"px"; wm.style.letterSpacing=ls+"em";
        const range=document.createRange();
        range.selectNodeContents(wm);
        const r=range.getBoundingClientRect();
        const targetLeft=720, targetRight=1392;
        return {fs,ls,x:Math.round(r.left),w:Math.round(r.width),right:Math.round(r.right),h:Math.round(r.height),diffL:r.left-targetLeft,diffR:r.right-targetRight,total:Math.abs(r.left-targetLeft)+Math.abs(r.right-targetRight)};
      },{fs,ls});
      results.push(m);
    }
  }
  results.sort((a,b)=>a.total-b.total || b.fs-a.fs);
  console.log(JSON.stringify(results.slice(0,8),null,2));
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
