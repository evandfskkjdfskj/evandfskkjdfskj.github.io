const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b = await chromium.launch({ channel: "chrome", headless: true });
  // LOCAL
  const s = server().listen(3491);
  const local = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await local.goto("http://127.0.0.1:3491/#pricing", { waitUntil: "load" });
  await local.evaluate(() => document.querySelector("#pricing")?.scrollIntoView({ block: "start" }));
  await local.waitForTimeout(400);
  await local.screenshot({ path: "verify-shots/local-pricing.png" });
  const localM = await local.evaluate(() => {
    const sec = document.querySelector("#pricing");
    const head = sec.querySelector(".pricing-head");
    const title = sec.querySelector(".section-title");
    const lead = sec.querySelector(".section-lead");
    const grid = sec.querySelector(".pricing-grid");
    const cards = [...sec.querySelectorAll(".price-card")].map(c => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        pad: cs.padding, borderTop: cs.borderTop,
        h3: c.querySelector("h3")?.textContent,
        h3fs: getComputedStyle(c.querySelector("h3")).fontSize,
        items: c.querySelectorAll(".check-list li").length,
        hasCta: !!c.querySelector(".price-cta"),
      };
    });
    return {
      titleFs: getComputedStyle(title).fontSize,
      titleLh: getComputedStyle(title).lineHeight,
      leadFs: getComputedStyle(lead).fontSize,
      headW: Math.round(head.getBoundingClientRect().width),
      gridGap: getComputedStyle(grid).gap,
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      cards,
      secPad: getComputedStyle(sec).padding,
    };
  });
  console.log("LOCAL", JSON.stringify(localM, null, 2));

  // REF
  const ref = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await ref.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await ref.waitForTimeout(2000);
  // scroll looking for pricing
  for (let i=0;i<40;i++) {
    const found = await ref.evaluate(() => {
      const t = document.body.innerText || "";
      if (t.includes("Website Packages") || t.includes("$7,500")) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n; while(n=walker.nextNode()){ if(/Website Packages/i.test(n.nodeValue||"")){ n.parentElement.scrollIntoView({block:"start"}); return true; } }
      }
      return false;
    });
    if (found) break;
    await ref.evaluate(() => window.scrollBy(0, 900));
    await ref.waitForTimeout(200);
  }
  await ref.waitForTimeout(600);
  await ref.screenshot({ path: "verify-shots/ref-pricing.png" });
  const refText = await ref.evaluate(() => {
    const all = [...document.querySelectorAll("h1,h2,h3,p,div,span,a,li")];
    const hit = all.find(e => /Website Packages/i.test(e.textContent||"") && (e.textContent||"").length < 60);
    if (!hit) return { err: "no title", sample: document.body.innerText.slice(0,500) };
    // find ancestor containing all 3 prices
    let el = hit;
    for (let i=0;i<20;i++) {
      const t = el.innerText || "";
      if (t.includes("$3,500") && t.includes("$12,500") && t.includes("Get Started")) break;
      if (!el.parentElement) break;
      el = el.parentElement;
    }
    const r = el.getBoundingClientRect();
    // collect leaf texts with styles for key bits
    const keys = ["07 Pricing","Website Packages","$3,500","$7,500","$12,500","Popular","Get Started","Project timeline"];
    const nodes = [];
    for (const k of keys) {
      const n = [...el.querySelectorAll("*")].find(e => (e.childNodes.length===1 || e.children.length===0) && (e.textContent||"").trim().includes(k) && (e.textContent||"").trim().length < 80);
      if (n) {
        const cs = getComputedStyle(n);
        const br = n.getBoundingClientRect();
        nodes.push({ k, t: n.textContent.trim().slice(0,60), fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, color: cs.color, x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width) });
      }
    }
    // find three columns
    const priceEls = [...el.querySelectorAll("*")].filter(e => /^\s*\$[\d,]+/.test((e.textContent||"").trim()) && (e.textContent||"").trim().length < 20);
    const cols = priceEls.slice(0,3).map(e => {
      let c = e;
      for (let i=0;i<8;i++) {
        if (c.parentElement && c.parentElement.getBoundingClientRect().width < 500) c = c.parentElement;
        else break;
      }
      const cr = c.getBoundingClientRect();
      return { w: Math.round(cr.width), h: Math.round(cr.height), x: Math.round(cr.x), borderTop: getComputedStyle(c).borderTop, pad: getComputedStyle(c).padding };
    });
    return { secW: Math.round(r.width), secH: Math.round(r.height), nodes, cols, textSnippet: el.innerText.slice(0,1800) };
  });
  console.log("REF", JSON.stringify(refText, null, 2));
  await local.close(); await ref.close(); s.close(); await b.close();
})().catch(e=>{console.error(e); process.exit(1);});
