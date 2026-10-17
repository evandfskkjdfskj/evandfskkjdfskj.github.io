const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3487);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3487/",{waitUntil:"load"});
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); el.scrollIntoView({block:"start"});});
  await p.waitForTimeout(200);
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollBy(0, el.getBoundingClientRect().top);});
  await p.waitForTimeout(300);
  const loc=await p.evaluate(()=>{
    const card=document.querySelector(".case-card");
    const side=card.querySelector(".case-side");
    const cr=card.getBoundingClientRect();
    const sr=side.getBoundingClientRect();
    return {gap:Math.round(cr.bottom-sr.bottom), sideBottom:Math.round(sr.bottom), cardBottom:Math.round(cr.bottom), sideH:Math.round(sr.height)};
  });
  console.log(JSON.stringify(loc));
  await p.screenshot({path:"verify-shots/local-bottom-gap.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
