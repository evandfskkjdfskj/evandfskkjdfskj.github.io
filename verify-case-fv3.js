const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3483);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3483/",{waitUntil:"load"});
  await p.evaluate(()=>{
    const el=document.querySelector(".case-card");
    el.scrollIntoView({block:"start"});
  });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{
    const el=document.querySelector(".case-card");
    const delta=el.getBoundingClientRect().top;
    window.scrollBy(0, delta);
  });
  await p.waitForTimeout(400);
  const pos=await p.evaluate(()=>{
    const abs=(sel)=>{const el=document.querySelector(sel);const r=el.getBoundingClientRect();return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
    return {card:abs(".case-card"),side:abs(".case-side"),copy:abs(".case-copy"),tags:abs(".case-tags"),view:abs(".view-project")};
  });
  console.log(JSON.stringify(pos,null,2));
  await p.screenshot({path:"verify-shots/local-case-fullview3.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
