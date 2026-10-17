const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  // local after fix
  const s=server().listen(3485);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3485/",{waitUntil:"load"});
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); el.scrollIntoView({block:"start"});});
  await p.waitForTimeout(200);
  await p.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollBy(0, el.getBoundingClientRect().top);});
  await p.waitForTimeout(300);
  const loc=await p.evaluate(()=>{
    const pad=48, col=336, lines=[48,384,720,1056,1392];
    const side=document.querySelector(".case-side").getBoundingClientRect();
    return {side:{l:Math.round(side.left),r:Math.round(side.right),w:Math.round(side.width)}, lines, alignL:Math.round(side.left)-lines[0], alignR:Math.round(side.right)-lines[1]};
  });
  console.log("LOCAL", JSON.stringify(loc));
  await p.screenshot({path:"verify-shots/local-card-col.png"});
  await p.close(); s.close();

  // ref
  const pref=await b.newPage({viewport:{width:1440,height:900}});
  await pref.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await pref.waitForTimeout(1000);
  await pref.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el) window.scrollTo(0, el.getBoundingClientRect().top+scrollY-300);
  });
  await pref.waitForTimeout(400);
  const ref=await pref.evaluate(()=>{
    const view=[...document.querySelectorAll("div,a")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()) && e.getBoundingClientRect().height<80);
    let side=view;
    for(let i=0;i<8&&side;i++){const r=side.getBoundingClientRect();if(r.height>400&&r.width>280&&r.width<500)break;side=side.parentElement;}
    const r=side.getBoundingClientRect();
    const lines=[48,384,720,1056,1392];
    return {side:{l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}, alignL:Math.round(r.left)-lines[0], alignR:Math.round(r.right)-lines[1]};
  });
  console.log("REF", JSON.stringify(ref));
  await pref.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
