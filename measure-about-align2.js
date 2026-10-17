const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".mp4":"video/mp4",".woff2":"font/woff2",".woff":"font/woff",".ttf":"font/ttf" };
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
async function measure(page) {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("h2")].find((h) => /Case\s*Studies/i.test(h.textContent || ""));
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140);
  });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { t:(el.innerText||"").replace(/\s+/g," ").slice(0,60), x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), fs:cs.fontSize, fw:cs.fontWeight, lh:cs.lineHeight, ls:cs.letterSpacing, color:cs.color, ff:cs.fontFamily.slice(0,40) };
    };
    const byText = (re, sel="*") => [...document.querySelectorAll(sel)].find((e) => re.test((e.innerText||"").trim()) && (e.innerText||"").trim().length < 80);
    const title = [...document.querySelectorAll("h2")].find((h) => /Case/i.test(h.textContent || ""));
    const children = title ? [...title.childNodes].map((n) => {
      if (n.nodeType === 3) return { text: n.textContent.trim() };
      if (n.tagName === "BR") return { br:true };
      return pick(n);
    }) : [];
    const nums = [...document.querySelectorAll("p,div,span,h3,h4")]
      .filter((el) => /^\d+\+$/.test((el.innerText||"").trim()) && el.getBoundingClientRect().height > 28)
      .slice(0,8).map(pick);
    const leftCol = [...document.querySelectorAll("div,aside,a,span")].filter(el => {
      const r = el.getBoundingClientRect();
      return r.left < 400 && r.top > 80 && r.top < 700 && r.width > 40 && r.width < 420;
    }).slice(0,12).map(pick);
    return {
      scrollY: Math.round(window.scrollY),
      vw: innerWidth,
      caseTitle: pick(title),
      children,
      caseLead: pick(byText(/Each project shows/i)),
      portfolioKicker: pick(byText(/02\s*Portfolio/i)),
      allProjects: pick(byText(/All Projects/i)),
      nums,
      leftTexts: leftCol.filter(Boolean).map(p => ({t:p.t,x:p.x,y:p.y,w:p.w})),
      bg: getComputedStyle(document.body).backgroundColor,
    };
  });
}
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const pref = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pref.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await pref.waitForTimeout(3000);
  const ref = await measure(pref);
  await pref.screenshot({ path: "verify-shots/align-ref-about.png", fullPage: false });
  console.log("REF", JSON.stringify(ref, null, 2));
  await pref.close();
  const s = server().listen(3462);
  const ploc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await ploc.goto("http://127.0.0.1:3462/", { waitUntil: "load", timeout: 30000 });
  await ploc.waitForTimeout(1000);
  const loc = await measure(ploc);
  await ploc.screenshot({ path: "verify-shots/align-local-about.png", fullPage: false });
  console.log("LOCAL", JSON.stringify(loc, null, 2));
  await ploc.close();
  s.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
