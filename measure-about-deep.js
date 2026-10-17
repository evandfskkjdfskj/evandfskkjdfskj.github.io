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
async function deep(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  // force counters to final
  await page.evaluate(() => {
    document.querySelectorAll("[data-count]").forEach((el) => {
      const n = el.getAttribute("data-count");
      const s = el.getAttribute("data-suffix") || "";
      el.textContent = n + s;
    });
  });
  return page.evaluate(() => {
    const abs = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 50),
        x: Math.round(r.left + scrollX),
        y: Math.round(r.top + scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: cs.fontSize,
        fw: cs.fontWeight,
        lh: cs.lineHeight,
        ls: cs.letterSpacing,
        color: cs.color,
        mt: cs.marginTop,
        mb: cs.marginBottom,
        pt: cs.paddingTop,
        pb: cs.paddingBottom,
        pl: cs.paddingLeft,
        pr: cs.paddingRight,
      };
    };
    // find by walking Framer text
    const all = [...document.querySelectorAll("*")];
    const textEq = (re) => all.find((e) => re.test((e.innerText || "").trim()) && e.children.length <= 3 && (e.innerText || "").trim().length < 60);
    const textHas = (re) => all.filter((e) => re.test(e.innerText || "") && e.getBoundingClientRect().width > 10);

    const caseH = [...document.querySelectorAll("h1,h2,h3")].find((h) => /CASE/i.test(h.innerText || ""));
    const caseSpans = caseH ? [...caseH.querySelectorAll("span")].map(abs) : [];
    const lead = [...document.querySelectorAll("p,div")].find((e) => /Each project shows/i.test(e.innerText || "") && e.innerText.length < 120);
    const portKick = [...document.querySelectorAll("div,p,span,a")].find((e) => /^0?2\s*Portfolio$/i.test((e.innerText || "").replace(/\s+/g," ").trim()) || /^▪?\s*02\s*Portfolio$/i.test((e.innerText||"").trim()));
    const allProj = [...document.querySelectorAll("a,div,p,span")].find((e) => /^<?\s*All Projects$/i.test((e.innerText || "").trim()));
    const nums = [...document.querySelectorAll("p,div,span,h3,h4")]
      .filter((el) => /^\d+\+$/.test((el.innerText || "").trim()) && el.getBoundingClientRect().height > 40)
      .map(abs)
      .filter((n) => n && n.y > 1000 && n.y < 4000)
      .slice(0, 8);

    // about section box
    const about = document.querySelector(".about, #about") || textHas(/My Mission|01 My Mission/)[0];
    const statsLabels = ["01 Projects","02 Websites","03 Years","04 Clients","01 PROJECTS","02 WEBSITES","03 YEARS","04 CLIENTS"]
      .map((lab) => {
        const el = all.find((e) => (e.innerText || "").trim().toUpperCase() === lab.toUpperCase() && e.children.length < 2);
        return abs(el);
      })
      .filter(Boolean);

    const mission = [...document.querySelectorAll("p,div,h2")].find((e) => /usability/i.test(e.innerText || "") && e.innerText.length < 400);
    const profileName = [...document.querySelectorAll("strong,h3,div,p")].find((e) => /^(Winnie|Hanza)/i.test((e.innerText || "").trim()) && (e.innerText || "").trim().length < 30);

    // spacing chain
    const title = abs(caseH);
    const leadA = abs(lead);
    const kickA = abs(portKick);
    const gapTitleLead = title && leadA ? leadA.y - (title.y + title.h) : null;
    const lastStat = nums.sort((a,b)=>a.y-b.y).slice(-1)[0];
    const gapStatTitle = lastStat && title ? title.y - (lastStat.y + lastStat.h) : null;

    return {
      about: abs(about),
      profileName: abs(profileName),
      mission: abs(mission),
      statsLabels,
      nums: nums.sort((a,b)=>a.y-b.y || a.x-b.x),
      portKick: kickA,
      allProj: abs(allProj),
      caseTitle: title,
      caseSpans,
      caseLead: leadA,
      gapTitleLead,
      gapStatTitle,
      pad: getComputedStyle(document.documentElement).getPropertyValue("--pad") || "",
    };
  });
}
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const pref = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pref.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await pref.waitForTimeout(2000);
  // trigger counters by scrolling through about
  await pref.evaluate(async () => {
    for (let y = 0; y < 2800; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  });
  await pref.waitForTimeout(1500);
  const ref = await deep(pref, "ref");
  console.log("REF", JSON.stringify(ref, null, 2));
  await pref.close();

  const s = server().listen(3463);
  const ploc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await ploc.goto("http://127.0.0.1:3463/", { waitUntil: "load", timeout: 30000 });
  await ploc.waitForTimeout(800);
  await ploc.evaluate(async () => {
    for (let y = 0; y < 2500; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });
  await ploc.waitForTimeout(500);
  const loc = await deep(ploc, "local");
  console.log("LOCAL", JSON.stringify(loc, null, 2));
  await ploc.close();
  s.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
