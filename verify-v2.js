const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".mp4":"video/mp4",".woff2":"font/woff2",".woff":"font/woff" };
function server() {
  return http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u === "/") u = "/index.html";
    const file = path.normalize(path.join(root, u));
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end("no"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const s = server().listen(3466);
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:3466/", { waitUntil: "load" });
  await p.evaluate(() => document.querySelectorAll(".stat-value[data-count]").forEach(el => { el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix")||""); }));
  await p.evaluate(() => {
    const el = document.querySelector(".about-portfolio-intro .section-title");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: "verify-shots/align-local-case-v2.png" });
  await p.evaluate(() => {
    const el = document.querySelector(".stat-cards");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 60);
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: "verify-shots/align-local-stats-v2.png" });
  const m = await p.evaluate(() => {
    const abs = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x:Math.round(r.left), y:Math.round(r.top), t:(el.innerText||"").slice(0,30), color:getComputedStyle(el).color }; };
    return {
      allp: abs(document.querySelector(".profile-all-projects, .all-projects")),
      kick: abs(document.querySelector(".about-portfolio-intro .section-kicker")),
      mute: abs(document.querySelector(".title-mute")),
      meta: [...document.querySelectorAll(".case-meta > *")].map(abs),
      nums: [...document.querySelectorAll(".stat-value")].map(el => ({t:el.innerText, x:Math.round(el.getBoundingClientRect().left), y:Math.round(el.getBoundingClientRect().top)})),
    };
  });
  console.log(JSON.stringify(m,null,2));
  await p.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
