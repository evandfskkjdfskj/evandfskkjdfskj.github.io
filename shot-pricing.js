const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const s = server().listen(3494);
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto("http://127.0.0.1:3494/", { waitUntil: "load" });
  const box = await p.evaluate(() => {
    const el = document.querySelector("#pricing");
    const r = el.getBoundingClientRect();
    return { y: r.top + window.scrollY, h: r.height };
  });
  await p.setViewportSize({ width: 1440, height: Math.min(Math.ceil(box.h) + 40, 1600) });
  await p.evaluate((y) => window.scrollTo(0, y), box.y);
  await p.waitForTimeout(200);
  await p.screenshot({ path: "verify-shots/local-pricing-final.png", clip: { x: 0, y: 0, width: 1440, height: Math.min(box.h + 20, 1500) } });
  console.log("shot", box);
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
