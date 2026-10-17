const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3474);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3474/",{waitUntil:"load"});
  await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{
    const wm=document.querySelector(".hero-wordmark-text");
    const range=document.createRange(); range.selectNodeContents(wm);
    const r=range.getBoundingClientRect();
    const cs=getComputedStyle(wm);
    return {x:Math.round(r.left),w:Math.round(r.width),right:Math.round(r.right),h:Math.round(r.height),fs:cs.fontSize,ls:cs.letterSpacing,targetL:720,targetR:1392};
  });
  console.log(JSON.stringify(m,null,2));
  await p.screenshot({path:"verify-shots/wordmark-final.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
