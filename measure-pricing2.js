const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const root = process.cwd();
const mime = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff",".mp4":"video/mp4" };
function server(){return http.createServer((req,res)=>{let u=decodeURIComponent((req.url||"/").split("?")[0]);if(u==="/")u="/index.html";const file=path.normalize(path.join(root,u));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end("no");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);});}
(async()=>{
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const s = server().listen(3492);

  async function shotPricing(page, out) {
    await page.evaluate(() => {
      const el = document.querySelector("#pricing") || [...document.querySelectorAll("h2")].find(h => /Website Packages/i.test(h.textContent||""));
      if (el) el.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(500);
    const box = await page.evaluate(() => {
      const el = document.querySelector("#pricing") || [...document.querySelectorAll("h2")].find(h => /Website Packages/i.test(h.textContent||""))?.closest("section");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { y: r.top + scrollY, h: Math.min(r.height, 1400), w: r.width };
    });
    if (box) {
      await page.screenshot({ path: out, clip: { x: 0, y: Math.max(0, box.y - scrollYApprox(page)), width: 1440, height: Math.min(1100, box.h) } }).catch(()=>{});
    }
    // simpler full viewport after scroll
    await page.screenshot({ path: out });
  }
  function scrollYApprox(){return 0}

  // LOCAL pricing
  const local = await b.newPage({ viewport: { width: 1440, height: 1200 } });
  await local.goto("http://127.0.0.1:3492/", { waitUntil: "load" });
  await local.evaluate(() => document.querySelector("#pricing").scrollIntoView({ block: "start" }));
  await local.waitForTimeout(300);
  const ly = await local.evaluate(() => document.querySelector("#pricing").getBoundingClientRect().top + scrollY);
  await local.evaluate((y) => scrollTo(0, y), ly);
  await local.waitForTimeout(200);
  await local.screenshot({ path: "verify-shots/local-pricing-full.png" });

  // REF - go directly via text search scroll
  const ref = await b.newPage({ viewport: { width: 1440, height: 1200 } });
  await ref.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 90000 });
  // Framer often puts content in deep divs; scroll until pricing visible in viewport
  let foundY = null;
  for (let i=0;i<60;i++) {
    foundY = await ref.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if ((n.nodeValue || "").trim() === "Website Packages.") {
          const el = n.parentElement;
          const r = el.getBoundingClientRect();
          return r.top + window.scrollY - 80;
        }
      }
      return null;
    });
    if (foundY != null) break;
    await ref.evaluate(() => window.scrollBy(0, 1200));
    await ref.waitForTimeout(150);
  }
  if (foundY != null) {
    await ref.evaluate((y) => window.scrollTo(0, y), foundY);
    await ref.waitForTimeout(500);
  }
  await ref.screenshot({ path: "verify-shots/ref-pricing-full.png" });

  // Deep measure ref pricing cards
  const refM = await ref.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n, titleEl;
    while ((n = walker.nextNode())) {
      if ((n.nodeValue || "").trim() === "Website Packages.") { titleEl = n.parentElement; break; }
    }
    if (!titleEl) return { err: "no title" };
    const titleCs = getComputedStyle(titleEl);
    // find $7,500 and climb to card
    function findText(str) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let t;
      while ((t = w.nextNode())) {
        if ((t.nodeValue || "").replace(/\s+/g," ").trim() === str) return t.parentElement;
      }
      return null;
    }
    const p7500 = findText("$7,500");
    const p3500 = findText("$3,500");
    const p12500 = findText("$12,500");
    function cardRoot(priceEl) {
      let el = priceEl;
      // climb until contains Get Started
      for (let i=0;i<25;i++) {
        if (!el.parentElement) break;
        el = el.parentElement;
        const t = el.innerText || "";
        if (t.includes("Get Started") && t.includes("Project timeline") && el.getBoundingClientRect().width < 520) return el;
      }
      return priceEl;
    }
    const cards = [p3500, p7500, p12500].filter(Boolean).map(p => {
      const c = cardRoot(p);
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      const priceCs = getComputedStyle(p);
      const cta = [...c.querySelectorAll("a,button,div")].find(e => /Get Started/i.test(e.innerText||"") && (e.innerText||"").length < 40);
      const ctaCs = cta ? getComputedStyle(cta) : null;
      const ctaR = cta ? cta.getBoundingClientRect() : null;
      return {
        w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x),
        pad: cs.padding, bg: cs.backgroundColor, borderTop: cs.borderTopWidth + " " + cs.borderTopStyle + " " + cs.borderTopColor,
        priceFs: priceCs.fontSize, priceFw: priceCs.fontWeight, priceLh: priceCs.lineHeight, priceFF: priceCs.fontFamily.slice(0,60),
        cta: cta ? { w: Math.round(ctaR.width), h: Math.round(ctaR.height), bg: ctaCs.backgroundColor, border: ctaCs.border, fs: ctaCs.fontSize } : null,
        textHead: (c.innerText||"").slice(0,200)
      };
    });
    // lead
    let lead = titleEl.parentElement;
    for (let i=0;i<6;i++) {
      if ((lead.innerText||"").includes("smooth path")) break;
      lead = lead.parentElement;
    }
    const leadNode = [...lead.querySelectorAll("*")].find(e => /smooth path/i.test(e.textContent||"") && (e.textContent||"").length < 120);
    return {
      title: { fs: titleCs.fontSize, fw: titleCs.fontWeight, lh: titleCs.lineHeight, ls: titleCs.letterSpacing, color: titleCs.color, ff: titleCs.fontFamily.slice(0,50), w: Math.round(titleEl.getBoundingClientRect().width) },
      lead: leadNode ? { fs: getComputedStyle(leadNode).fontSize, color: getComputedStyle(leadNode).color, t: leadNode.textContent.trim() } : null,
      cards,
      titleY: titleEl.getBoundingClientRect().top
    };
  });
  console.log(JSON.stringify(refM, null, 2));

  await local.close(); await ref.close(); s.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
