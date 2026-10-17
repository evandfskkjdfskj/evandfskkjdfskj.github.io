const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 60000 });
  // scroll to pricing
  await p.evaluate(() => {
    const els = [...document.querySelectorAll("h2,h3,p,div")];
    const t = els.find(e => /Website Packages/i.test(e.textContent||"") && (e.textContent||"").length < 40);
    if (t) t.scrollIntoView({ block: "start" });
  });
  await p.waitForTimeout(800);
  // measure pricing-like structure
  const info = await p.evaluate(() => {
    const root = [...document.querySelectorAll("*")].find(e => (e.innerText||"").includes("Website Packages") && (e.innerText||"").includes("$7,500"));
    if (!root) return { err: "not found" };
    // climb to section-ish
    let sec = root;
    for (let i=0;i<12;i++) {
      if (sec.parentElement && sec.parentElement.innerText.includes("$3,500") && sec.parentElement.innerText.includes("$12,500")) sec = sec.parentElement;
      else break;
    }
    const r = sec.getBoundingClientRect();
    const text = sec.innerText.slice(0, 2500);
    const styles = getComputedStyle(sec);
    // find cards by $ prices
    const prices = [...sec.querySelectorAll("*")].filter(e => /^\$\d/.test((e.textContent||"").trim()) && e.children.length===0);
    return {
      secTag: sec.tagName,
      w: Math.round(r.width), h: Math.round(r.height),
      bg: styles.backgroundColor,
      text,
      priceCount: prices.length,
      priceSamples: prices.slice(0,6).map(e => {
        const cs = getComputedStyle(e);
        const pr = e.parentElement ? getComputedStyle(e.parentElement) : null;
        return { t: e.textContent.trim(), fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily.slice(0,40), color: cs.color };
      })
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await p.screenshot({ path: "verify-shots/ref-pricing.png", fullPage: false });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
