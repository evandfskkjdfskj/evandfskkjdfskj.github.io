const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  // Use page scroll + query check for $7,500 visible
  for (let i = 0; i < 80; i++) {
    const hit = await p.evaluate(() => {
      const texts = [];
      const walk = (node) => {
        if (node.nodeType === 3) {
          const v = (node.nodeValue || "").trim();
          if (v === "$7,500" || v === "Website Packages.") texts.push({ v, y: node.parentElement.getBoundingClientRect().top });
        } else if (node.shadowRoot) walk(node.shadowRoot);
        for (const c of node.childNodes || []) walk(c);
      };
      walk(document.body);
      return texts;
    });
    const pkg = hit.find(t => t.v === "Website Packages.");
    if (pkg && pkg.y > 0 && pkg.y < 400) {
      console.log("found at scroll", await p.evaluate(() => scrollY), hit);
      break;
    }
    await p.evaluate(() => window.scrollBy(0, 700));
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(400);
  await p.screenshot({ path: "verify-shots/ref-pricing-correct.png" });

  const layout = await p.evaluate(() => {
    function findExact(str) {
      const walk = (node, acc=[]) => {
        if (node.nodeType === 3) {
          if ((node.nodeValue || "").trim() === str) acc.push(node.parentElement);
        } else {
          if (node.shadowRoot) walk(node.shadowRoot, acc);
          for (const c of node.childNodes || []) walk(c, acc);
        }
        return acc;
      };
      return walk(document.body)[0];
    }
    const title = findExact("Website Packages.");
    const p1 = findExact("$3,500");
    const p2 = findExact("$7,500");
    const p3 = findExact("$12,500");
    if (!title || !p1) return { err: "missing", title: !!title, p1: !!p1 };
    const tr = title.getBoundingClientRect();
    const r1 = p1.getBoundingClientRect();
    const r2 = p2.getBoundingClientRect();
    const r3 = p3.getBoundingClientRect();
    const kicker = findExact("07 Pricing") || findExact("Pricing");
    return {
      title: { x: Math.round(tr.x), y: Math.round(tr.y), w: Math.round(tr.width), fs: getComputedStyle(title).fontSize, fw: getComputedStyle(title).fontWeight, lh: getComputedStyle(title).lineHeight, ta: getComputedStyle(title).textAlign },
      prices: [
        { x: Math.round(r1.x), y: Math.round(r1.y), fs: getComputedStyle(p1).fontSize },
        { x: Math.round(r2.x), y: Math.round(r2.y), fs: getComputedStyle(p2).fontSize },
        { x: Math.round(r3.x), y: Math.round(r3.y), fs: getComputedStyle(p3).fontSize },
      ],
      // Is title centered on page or in middle column?
      titleCenter: Math.round(tr.x + tr.width/2),
      pageCenter: 720,
      kicker: kicker ? { x: Math.round(kicker.getBoundingClientRect().x), t: kicker.textContent } : null,
      // relative: are side prices ABOVE or BELOW title?
      sideVsTitle: { leftDy: Math.round(r1.y - tr.y), midDy: Math.round(r2.y - tr.y), rightDy: Math.round(r3.y - tr.y) }
    };
  });
  console.log(JSON.stringify(layout, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
