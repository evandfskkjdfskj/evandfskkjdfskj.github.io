const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  // REF
  const pref=await b.newPage({viewport:{width:1440,height:900}});
  await pref.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await pref.waitForTimeout(1200);
  await pref.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el) window.scrollTo(0, el.getBoundingClientRect().top+scrollY-300);
  });
  await pref.waitForTimeout(400);
  const ref=await pref.evaluate(()=>{
    const view=[...document.querySelectorAll("div,a")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()) && e.getBoundingClientRect().height<80);
    let side=view;
    for(let i=0;i<8&&side;i++){const r=side.getBoundingClientRect();if(r.height>400&&r.width>280&&r.width<500)break;side=side.parentElement;}
    const sr=side.getBoundingClientRect();
    // find next section meta (02) or card bottom
    const next=[...document.querySelectorAll("div,span")].find(e=>{
      const t=(e.innerText||"").trim(); const r=e.getBoundingClientRect();
      return t==="02" && r.top>sr.bottom && r.top<sr.bottom+200 && r.height<40;
    });
    const nr=next?next.getBoundingClientRect():null;
    // find viewport bottom of case section container
    let section=side;
    for(let i=0;i<12&&section;i++){const r=section.getBoundingClientRect();if(r.height>700&&r.height<1100&&r.width>1000)break;section=section.parentElement;}
    const secr=section?section.getBoundingClientRect():null;
    return {
      sideBottom:Math.round(sr.bottom),
      sideTop:Math.round(sr.top),
      sideH:Math.round(sr.height),
      next02:nr?{y:Math.round(nr.top),gap:Math.round(nr.top-sr.bottom)}:null,
      section:secr?{top:Math.round(secr.top),bottom:Math.round(secr.bottom),h:Math.round(secr.height),gapBottom:Math.round(secr.bottom-sr.bottom)}:null,
      vh:900
    };
  });
  console.log("REF", JSON.stringify(ref,null,2));
  await pref.close();

  const s=server().listen(3486);
  const ploc=await b.newPage({viewport:{width:1440,height:900}});
  await ploc.goto("http://127.0.0.1:3486/",{waitUntil:"load"});
  await ploc.evaluate(()=>{const el=document.querySelector(".case-card"); el.scrollIntoView({block:"start"});});
  await ploc.waitForTimeout(200);
  await ploc.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollBy(0, el.getBoundingClientRect().top);});
  await ploc.waitForTimeout(300);
  const loc=await ploc.evaluate(()=>{
    const card=document.querySelector(".case-card");
    const side=card.querySelector(".case-side");
    const view=card.querySelector(".view-project");
    const copy=card.querySelector(".case-copy");
    const next=document.querySelectorAll(".case-card")[1];
    const cr=card.getBoundingClientRect();
    const sr=side.getBoundingClientRect();
    const vr=view.getBoundingClientRect();
    const nr=next?next.getBoundingClientRect():null;
    return {
      cardH:Math.round(cr.height),
      sideBottom:Math.round(sr.bottom),
      viewBottom:Math.round(vr.bottom),
      copyBottom:Math.round(copy.getBoundingClientRect().bottom),
      cardBottom:Math.round(cr.bottom),
      gapToCardBottom:Math.round(cr.bottom-sr.bottom),
      nextCardTop:nr?Math.round(nr.top):null,
      gapToNext:nr?Math.round(nr.top-sr.bottom):null,
      sideTop:Math.round(sr.top),
      sideH:Math.round(sr.height),
    };
  });
  console.log("LOCAL", JSON.stringify(loc,null,2));
  await ploc.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
