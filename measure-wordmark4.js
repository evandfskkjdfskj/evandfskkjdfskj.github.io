const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3473);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3473/",{waitUntil:"load"});
  const test=async (fs,ls,html)=>{
    await p.evaluate(({fs,ls,html})=>{
      const wm=document.querySelector(".hero-wordmark-text");
      wm.innerHTML=html; wm.style.fontSize=fs+"px"; wm.style.lineHeight="1"; wm.style.height="auto"; wm.style.letterSpacing=ls+"em"; wm.style.width="100%";
    },{fs,ls,html});
    await p.waitForTimeout(100);
    return p.evaluate(()=>{
      const wm=document.querySelector(".hero-wordmark-text");
      const range=document.createRange(); range.selectNodeContents(wm);
      const r=range.getBoundingClientRect(); const br=wm.getBoundingClientRect();
      return {text:{x:Math.round(r.left),w:Math.round(r.width),right:Math.round(r.right),h:Math.round(r.height)},box:{x:Math.round(br.left),w:Math.round(br.width),right:Math.round(br.right)},targetL:720,targetR:1392};
    });
  };
  const html='WINNIE<sup>?</sup>';
  let best=null;
  for(let fs=190;fs<=230;fs++){
    for(let ls=-0.16;ls<=-0.08;ls+=0.002){
      const m=await test(fs,ls,html);
      const total=Math.abs(m.text.x-m.targetL)+Math.abs(m.text.right-m.targetR);
      if(!best||total<best.total) best={fs,ls:ls.toFixed(3),...m,total};
    }
  }
  console.log(JSON.stringify(best,null,2));
  await p.evaluate(({fs,ls,html})=>{
    const wm=document.querySelector(".hero-wordmark-text");
    wm.innerHTML=html; wm.style.fontSize=fs+"px"; wm.style.lineHeight="1"; wm.style.letterSpacing=ls+"em"; wm.style.width="100%";
  },{fs:best.fs,ls:parseFloat(best.ls),html});
  await p.screenshot({path:"verify-shots/wordmark-best.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
