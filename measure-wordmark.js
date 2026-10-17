const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3470);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3470/",{waitUntil:"load"});
  await p.waitForTimeout(800);
  const base=await p.evaluate(()=>{
    const grid=document.querySelector(".hero .grid-lines");
    const wm=document.querySelector(".hero-wordmark-text");
    const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};};
    const cols=[0,1,2,3].map(i=>{
      const el=document.querySelector(".hero-wordmark");
      const gr=el.getBoundingClientRect();
      const w=gr.width/4;
      return {left:Math.round(gr.left+i*w),right:Math.round(gr.left+(i+1)*w),w:Math.round(w)};
    });
    return {grid:r(grid),wm:r(wm),cols,fs:getComputedStyle(wm).fontSize,text:wm.innerText};
  });
  console.log("BASE",JSON.stringify(base,null,2));
  // binary search font size to fill col3-4
  const targetLeft=base.cols[2].left; const targetRight=base.cols[3].right;
  let best=null;
  for(let fs=120;fs<=260;fs++){
    const m=await p.evaluate(({fs,targetLeft,targetRight})=>{
      const wm=document.querySelector(".hero-wordmark-text");
      wm.style.fontSize=fs+"px"; wm.style.lineHeight=fs+"px"; wm.style.height=fs+"px";
      const r=wm.getBoundingClientRect();
      return {fs,x:Math.round(r.left),w:Math.round(r.width),right:Math.round(r.right),targetLeft,targetRight,diffL:Math.round(r.left-targetLeft),diffR:Math.round(r.right-targetRight)};
    },{fs,targetLeft,targetRight});
    if(Math.abs(m.diffL)<=2 && Math.abs(m.diffR)<=2){best=m;break;}
    if(!best || (Math.abs(m.diffL)+Math.abs(m.diffR) < Math.abs(best.diffL)+Math.abs(best.diffR))) best=m;
  }
  console.log("BEST",JSON.stringify(best,null,2));
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
