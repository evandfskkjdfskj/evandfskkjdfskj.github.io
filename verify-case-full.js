const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3476);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3476/",{waitUntil:"load"});
  await p.waitForTimeout(600);
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); if(el) window.scrollTo(0, el.getBoundingClientRect().top+scrollY);});
  await p.waitForTimeout(400);
  const m1=await p.evaluate(()=>{
    const card=document.querySelector(".case-card");
    const bg=card.querySelector(".case-bg-img");
    const thumb=card.querySelector(".case-thumb");
    const r=card.getBoundingClientRect(); const br=bg.getBoundingClientRect(); const tr=thumb.getBoundingClientRect();
    return {card:{x:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)}, bg:{y:Math.round(br.top),h:Math.round(br.height),transform:getComputedStyle(bg).transform}, thumb:{w:Math.round(tr.width),h:Math.round(tr.height)}};
  });
  console.log("AT TOP", JSON.stringify(m1,null,2));
  await p.screenshot({path:"verify-shots/local-case-full.png"});
  await p.evaluate(()=>window.scrollBy(0,220));
  await p.waitForTimeout(200);
  const m2=await p.evaluate(()=>{
    const bg=document.querySelector(".case-bg-img");
    return {transform:getComputedStyle(bg).transform, top:Math.round(bg.getBoundingClientRect().top)};
  });
  console.log("SCROLLED", JSON.stringify(m2,null,2));
  await p.screenshot({path:"verify-shots/local-case-full-scrolled.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
