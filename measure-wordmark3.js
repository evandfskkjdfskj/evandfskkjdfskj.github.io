const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3472);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3472/",{waitUntil:"load"});
  await p.waitForTimeout(800);
  let best=null;
  for(let fs=200;fs<=240;fs+=1){
    for(let ls=-0.14;ls<=-0.08;ls+=0.005){
      const m=await p.evaluate(({fs,ls})=>{
        const wm=document.querySelector(".hero-wordmark-text");
        wm.style.fontSize=fs+"px"; wm.style.lineHeight="1"; wm.style.height="auto"; wm.style.letterSpacing=ls+"em";
        const range=document.createRange(); range.selectNodeContents(wm);
        const r=range.getBoundingClientRect();
        const targetLeft=720, targetRight=1392;
        const total=Math.abs(r.left-targetLeft)+Math.abs(r.right-targetRight);
        return {fs,ls:ls.toFixed(3),w:Math.round(r.width),right:Math.round(r.right),h:Math.round(r.height),total};
      },{fs,ls});
      if(!best||m.total<best.total||(m.total===best.total&&m.fs>best.fs)) best=m;
    }
  }
  console.log(JSON.stringify(best,null,2));
  await p.screenshot({path:"verify-shots/wordmark-test.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
