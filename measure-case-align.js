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
  await pref.waitForTimeout(1500);
  await pref.evaluate(async()=>{for(let y=2800;y<3800;y+=150){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}});
  await pref.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el){ const card=el.closest("div")||el; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 280); }
  });
  await pref.waitForTimeout(500);
  const ref=await pref.evaluate(()=>{
    const abs=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return{t:(el.innerText||"").replace(/\s+/g," ").slice(0,50),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
    const view=[...document.querySelectorAll("a,div,p,span")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    // climb to thumb card
    let thumb=view, best=null;
    for(let i=0;i<10 && thumb;i++){
      const r=thumb.getBoundingClientRect();
      if(r.width>250 && r.width<520 && r.height>350 && r.height<700) best=thumb;
      thumb=thumb.parentElement;
    }
    const num=abs([...document.querySelectorAll("div,span,p")].find(e=>/^0?1$/.test((e.innerText||"").trim()) && e.getBoundingClientRect().top<120));
    const client=abs([...document.querySelectorAll("div,span,p")].find(e=>/CLIENT/i.test(e.innerText||"") && /GOODWELL/i.test(e.innerText||"") && (e.innerText||"").length<40));
    const year=abs([...document.querySelectorAll("div,span,p")].find(e=>/YEAR/i.test(e.innerText||"") && /202[0-9]/i.test(e.innerText||"") && (e.innerText||"").length<30));
    const desc=abs([...document.querySelectorAll("div,p,span")].find(e=>/CALM, EDITORIAL/i.test(e.innerText||"") && (e.innerText||"").length<120));
    const design=abs([...document.querySelectorAll("div,span,p")].find(e=>/^DESIGN$/i.test((e.innerText||"").trim())));
    const develop=abs([...document.querySelectorAll("div,span,p")].find(e=>/^DEVELOPMENT$/i.test((e.innerText||"").trim())));
    const goodwell=abs([...document.querySelectorAll("div,span,p,strong,img")].find(e=>{
      const t=(e.innerText||e.alt||"").trim();
      return /^Goodwell$/i.test(t) || (e.tagName==="IMG" && /goodwell/i.test(e.alt||"") && e.getBoundingClientRect().width<200);
    }));
    // visible imgs near thumb
    const imgs=[...document.querySelectorAll("img")].filter(i=>{const r=i.getBoundingClientRect();return r.width>200&&r.height>300&&r.left<500&&r.top>50&&r.top<700;}).map(i=>{const r=i.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),y:Math.round(r.top)};});
    return {thumb:abs(best),view:abs(view),num,client,year,desc,design,develop,goodwell,imgs};
  });
  console.log("REF", JSON.stringify(ref,null,2));
  await pref.screenshot({path:"verify-shots/ref-case-align.png"});
  await pref.close();

  // LOCAL
  const s=server().listen(3478);
  const ploc=await b.newPage({viewport:{width:1440,height:900}});
  await ploc.goto("http://127.0.0.1:3478/",{waitUntil:"load"});
  await ploc.evaluate(()=>{const el=document.querySelector(".case-card"); window.scrollTo(0, el.getBoundingClientRect().top+scrollY);});
  await ploc.waitForTimeout(400);
  const loc=await ploc.evaluate(()=>{
    const abs=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return{t:(el.innerText||"").replace(/\s+/g," ").slice(0,50),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
    const card=document.querySelector(".case-card");
    return {
      card:abs(card),
      thumb:abs(card.querySelector(".case-thumb")),
      side:abs(card.querySelector(".case-side")),
      view:abs(card.querySelector(".view-project")),
      meta:abs(card.querySelector(".case-meta")),
      num:abs(card.querySelector(".case-num")),
      overlay:abs(card.querySelector(".case-overlay")),
      logo:abs(card.querySelector(".case-logo")),
      desc:abs(card.querySelector(".case-overlay p")),
      tags:abs(card.querySelector(".tags")),
      grid:!!document.querySelector(".portfolio .grid-lines"),
    };
  });
  console.log("LOCAL", JSON.stringify(loc,null,2));
  await ploc.screenshot({path:"verify-shots/local-case-align.png"});
  await ploc.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
