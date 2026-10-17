const { chromium } = require("playwright");
const path = require("path"); const http = require("http"); const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".woff2":"font/woff2",".woff":"font/woff" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const s=server().listen(3475);
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("http://127.0.0.1:3475/",{waitUntil:"load"});
  await p.waitForTimeout(800);
  await p.evaluate(()=>{const el=document.querySelector(".stat-cards"); if(el) window.scrollTo(0, el.getBoundingClientRect().top+scrollY-120);});
  await p.waitForTimeout(400);
  const m=await p.evaluate(()=>{
    const cards=[...document.querySelectorAll(".stat-card")].map(el=>{const r=el.getBoundingClientRect();const accent=el.querySelector(".stat-accent");return{label:el.querySelector(".stat-card-top span")?.innerText,x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),accent:!!accent};});
    return {cards, stagger: cards[2]?cards[2].y-cards[0].y:null};
  });
  console.log(JSON.stringify(m,null,2));
  await p.screenshot({path:"verify-shots/local-stats-stagger.png"});
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
