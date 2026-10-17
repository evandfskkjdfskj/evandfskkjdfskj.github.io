const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2000);

  const about = await p.evaluate(() => {
    const root = document.getElementById("home-about");
    const rb = root.getBoundingClientRect();
    const pick = (sel) =>
      [...root.querySelectorAll(sel)].slice(0, 20).map((el) => {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 55),
          x: Math.round(b.left),
          y: Math.round(b.top - rb.top),
          w: Math.round(b.width),
          h: Math.round(b.height),
          fs: cs.fontSize,
          fw: cs.fontWeight,
          lh: cs.lineHeight,
          ls: cs.letterSpacing,
        };
      });
    return {
      h: Math.round(rb.height),
      pad: getComputedStyle(root).padding,
      h2: pick("h2"),
      p: pick("p").filter((x) => x.h > 40),
      imgs: pick("img"),
    };
  });
  console.log("ABOUT", JSON.stringify(about, null, 2));

  const testi = await p.evaluate(() => {
    const root = document.getElementById("home-testimonials");
    const rb = root.getBoundingClientRect();
    const cards = [...root.querySelectorAll("div")].filter((el) => {
      const t = (el.innerText || "");
      const b = el.getBoundingClientRect();
      return /Anna Marek|David Klein|Jakub|Emma Novak/i.test(t) && b.height > 180 && b.width > 250 && b.width < 400;
    });
    const seen = new Set();
    const out = [];
    for (const el of cards) {
      const b = el.getBoundingClientRect();
      const k = `${Math.round(b.left)}:${Math.round(b.top)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40),
        x: Math.round(b.left),
        y: Math.round(b.top - rb.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
      });
    }
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return { h: Math.round(rb.height), pad: getComputedStyle(root).padding, cards: out.slice(0, 8) };
  });
  console.log("TESTI", JSON.stringify(testi, null, 2));

  // Process step card inner metrics
  const step = await p.evaluate(() => {
    const root = document.getElementById("home-process");
    const card = [...root.querySelectorAll("div")].find((el) => {
      const t = (el.innerText || "").replace(/\s+/g, " ");
      const b = el.getBoundingClientRect();
      return t.startsWith("01 PLAN") && Math.round(b.height) === 535;
    });
    if (!card) return null;
    const rb = card.getBoundingClientRect();
    return [...card.querySelectorAll("h2,h3,h4,p,span,div,strong")].slice(0, 30).map((el) => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40),
        x: Math.round(b.left - rb.left),
        y: Math.round(b.top - rb.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
        fs: cs.fontSize,
        fw: cs.fontWeight,
        color: cs.color,
        borderTop: cs.borderTop,
      };
    });
  });
  console.log("STEP01", JSON.stringify(step, null, 2));

  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
