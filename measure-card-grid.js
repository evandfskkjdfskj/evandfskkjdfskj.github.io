const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3484);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3484/",{waitUntil:"load"});
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); el.scrollIntoView({block:"start"});});
  await p.waitForTimeout(200);
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollBy(0, el.getBoundingClientRect().top);});
  await p.waitForTimeout(400);
  const m=await p.evaluate(()=>{
    const pad=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad"))||48;
    const contentW=1440-pad*2;
    const col=contentW/4;
    const lines=[0,1,2,3,4].map(i=>Math.round(pad+i*col));
    const side=document.querySelector(".case-side").getBoundingClientRect();
    return {
      pad, col:Math.round(col), lines,
      side:{left:Math.round(side.left), right:Math.round(side.right), w:Math.round(side.width), h:Math.round(side.height)},
      gapToLine2: Math.round(lines[1]-side.right),
    };
  });
  console.log(JSON.stringify(m,null,2));
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
