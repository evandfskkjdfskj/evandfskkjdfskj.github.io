const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2500);

  // Find process section scroll
  const y = await p.evaluate(() => {
    const s = [...document.querySelectorAll("section")].find((el) => (el.id || "").includes("process"));
    return s ? s.getBoundingClientRect().top + window.scrollY : 0;
  });
  await p.evaluate((yy) => window.scrollTo(0, yy - 40), y);
  await p.waitForTimeout(600);

  const data = await p.evaluate(() => {
    const root = [...document.querySelectorAll("section")].find((s) => (s.id || "").includes("process"));
    const rb = root.getBoundingClientRect();
    // Find step-like cards: elements with PLAN/STRUCTURE etc
    const texts = ["PLAN", "STRUCTURE", "DESIGN", "BUILD", "LAUNCH", "Ready", "5 STEPS", "04 PROCESS", "FROM THE FIRST"];
    const hits = [];
    const walk = (el) => {
      const t = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 220) return;
      const match = texts.some((k) => t.toUpperCase().includes(k));
      if (!match) return;
      const b = el.getBoundingClientRect();
      if (b.width < 40 || b.height < 14) return;
      hits.push({
        t: t.slice(0, 70),
        tag: el.tagName,
        w: Math.round(b.width),
        h: Math.round(b.height),
        x: Math.round(b.left),
        y: Math.round(b.top - rb.top),
        fs: getComputedStyle(el).fontSize,
        fw: getComputedStyle(el).fontWeight,
        lh: getComputedStyle(el).lineHeight,
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      });
    };
    root.querySelectorAll("h1,h2,h3,h4,p,span,div,a,button").forEach(walk);
    // dedupe similar
    const uniq = [];
    for (const h of hits) {
      const dup = uniq.find((u) => u.t === h.t && Math.abs(u.x - h.x) < 2 && Math.abs(u.y - h.y) < 2);
      if (!dup) uniq.push(h);
    }
    return { sectionH: Math.round(rb.height), pad: getComputedStyle(root).padding, hits: uniq.slice(0, 60) };
  });
  console.log(JSON.stringify(data, null, 2));

  // Full process section screenshot
  const box = await p.evaluate(() => {
    const s = [...document.querySelectorAll("section")].find((el) => (el.id || "").includes("process"));
    const b = s.getBoundingClientRect();
    return { y: b.top + window.scrollY, h: b.height };
  });
  await p.setViewportSize({ width: 1440, height: Math.min(2000, Math.ceil(box.h + 80)) });
  await p.evaluate((yy) => window.scrollTo(0, yy), box.y);
  await p.waitForTimeout(400);
  await p.screenshot({ path: "verify-shots/ref-process-full.png", fullPage: false });

  // Also about + testimonials heights internals
  for (const id of ["about", "testimonials"]) {
    const info = await p.evaluate((sid) => {
      const s = [...document.querySelectorAll("section")].find((el) => (el.id || "").toLowerCase().includes(sid));
      if (!s) return null;
      const b = s.getBoundingClientRect();
      return {
        id: sid,
        h: Math.round(b.height),
        pad: getComputedStyle(s).padding,
        titles: [...s.querySelectorAll("h2,h3,p")].slice(0, 12).map((el) => {
          const bb = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 50),
            fs: cs.fontSize,
            fw: cs.fontWeight,
            lh: cs.lineHeight,
            w: Math.round(bb.width),
            h: Math.round(bb.height),
            x: Math.round(bb.left),
            y: Math.round(bb.top - b.top),
          };
        }),
      };
    }, id);
    console.log("---", id, JSON.stringify(info, null, 2));
  }

  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
