const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2000);
  const info = await p.evaluate(() => {
    const root = document.getElementById("home-process");
    const cards = [...root.querySelectorAll("div")].filter((el) => {
      const t = (el.innerText || "").replace(/\s+/g, " ");
      const b = el.getBoundingClientRect();
      return /^(01 PLAN|02 STRUCTURE|03 DESIGN)/.test(t) && Math.abs(b.width - 335) < 20 && b.height > 400 && b.height < 600;
    });
    const seen = new Set();
    return cards
      .map((el) => {
        const b = el.getBoundingClientRect();
        const k = `${Math.round(b.left)}:${Math.round(b.height)}`;
        if (seen.has(k)) return null;
        seen.add(k);
        const cs = getComputedStyle(el);
        let cur = el;
        const chain = [];
        for (let i = 0; i < 5 && cur && cur !== root; i++) {
          const c = getComputedStyle(cur);
          chain.push({
            pos: c.position,
            top: c.top,
            sticky: c.position.includes("sticky") || c.position.includes("fixed"),
            h: Math.round(cur.getBoundingClientRect().height),
          });
          cur = cur.parentElement;
        }
        return {
          t: (el.innerText || "").slice(0, 20),
          pos: cs.position,
          top: cs.top,
          chain,
        };
      })
      .filter(Boolean);
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
