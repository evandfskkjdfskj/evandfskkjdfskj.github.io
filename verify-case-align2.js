const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3479);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3479/",{waitUntil:"load"});
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollTo(0, el.getBoundingClientRect().top+scrollY);});
  await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{
    const abs=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return{t:(el.innerText||"").replace(/\s+/g," ").slice(0,40),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
    const card=document.querySelector(".case-card");
    return {
      side:abs(card.querySelector(".case-side")),
      thumb:abs(card.querySelector(".case-thumb")),
      view:abs(card.querySelector(".view-project")),
      copy:abs(card.querySelector(".case-copy")),
      tags:abs(card.querySelector(".case-tags")),
      meta:abs(card.querySelector(".case-meta")),
      grid:!!card.querySelector(".case-grid"),
    };
  });
  console.log(JSON.stringify(m,null,2));
  await p.screenshot({path:"verify-shots/local-case-align2.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
