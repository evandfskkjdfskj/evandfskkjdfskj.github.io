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
async function snap(page, file, findRe) {
  await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, "i");
    const el = [...document.querySelectorAll("h2,span,div")].find((e) => re.test((e.innerText || "").trim()) && (e.innerText||"").trim().length < 20);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120);
  }, findRe);
  await page.waitForTimeout(500);
  await page.screenshot({ path: file });
}
async function metrics(page) {
  return page.evaluate(() => {
    const abs = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { t:(el.innerText||"").replace(/\s+/g," ").slice(0,40), x:Math.round(r.left+scrollX), y:Math.round(r.top+scrollY), w:Math.round(r.width), h:Math.round(r.height), color:getComputedStyle(el).color, fs:getComputedStyle(el).fontSize };
    };
    const kick = document.querySelector(".about-portfolio-intro .section-kicker") || [...document.querySelectorAll("div")].find(e => /^02\s*PORTFOLIO$/i.test((e.innerText||"").replace(/\n+/g," ").trim()) && (e.innerText||"").length < 20);
    const mute = document.querySelector(".title-mute") || [...document.querySelectorAll("span")].find(e => (e.innerText||"").trim()==="CASE");
    const solid = document.querySelector(".title-solid") || [...document.querySelectorAll("span")].find(e => (e.innerText||"").trim()==="STUDIES.");
    const lead = document.querySelector(".about-portfolio-intro .section-lead") || [...document.querySelectorAll("p")].find(e => /Each project shows/i.test(e.innerText||""));
    const allp = document.querySelector(".about-portfolio-kicker .all-projects, .all-projects");
    const nums = [...document.querySelectorAll(".stat-value")].map(abs);
    const labs = [...document.querySelectorAll(".stat-card-top span:first-child")].map(abs);
    const k=abs(kick), m=abs(mute), s=abs(solid), l=abs(lead), a=abs(allp);
    return {
      kick:k, mute:m, solid:s, lead:l, allp:a, nums, labs,
      rel: {
        kickToMute: k&&m ? m.y - (k.y+k.h) : null,
        muteToSolid: m&&s ? s.y - m.y : null,
        solidToLead: s&&l ? l.y - (s.y + 72) : null,
        leadVsAllp: l&&a ? a.y - l.y : null,
      }
    };
  });
}
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const s = server().listen(3464);
  const ploc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await ploc.goto("http://127.0.0.1:3464/", { waitUntil: "load" });
  await ploc.waitForTimeout(600);
  await ploc.evaluate(() => document.querySelectorAll("[data-count]").forEach(el => { el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix")||""); }));
  const loc = await metrics(ploc);
  await snap(ploc, "verify-shots/align-local-case-now.png", "^CASE$");
  console.log("LOCAL", JSON.stringify(loc, null, 2));
  await ploc.close();

  const pref = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pref.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await pref.waitForTimeout(1500);
  await pref.evaluate(async () => { for (let y=800;y<2900;y+=250){scrollTo(0,y); await new Promise(r=>setTimeout(r,100)); } });
  const ref = await metrics(pref);
  await snap(pref, "verify-shots/align-ref-case-now.png", "^CASE$");
  console.log("REF", JSON.stringify(ref, null, 2));
  await pref.close();
  s.close();
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
