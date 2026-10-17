const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const s = server().listen(3493);
  const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
  await p.goto("http://127.0.0.1:3493/", { waitUntil: "load" });
  await p.evaluate(() => {
    const y = document.querySelector("#pricing").getBoundingClientRect().top + scrollY;
    scrollTo(0, y);
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: "verify-shots/local-pricing-after.png" });
  const m = await p.evaluate(() => {
    const cards = [...document.querySelectorAll(".price-card")].map(c => {
      const r = c.getBoundingClientRect();
      const cta = c.querySelector(".price-cta").getBoundingClientRect();
      return { h: Math.round(r.height), ctaY: Math.round(cta.top), label: c.querySelector(".price-label")?.innerText.trim() };
    });
    const lead = getComputedStyle(document.querySelector(".pricing-head .section-lead"));
    return { cards, leadFs: lead.fontSize, leadLh: lead.lineHeight };
  });
  console.log(JSON.stringify(m,null,2));
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
