const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("file:///" + path.resolve("index.html").replace(/\\/g, "/"), { waitUntil: "load" });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.fonts.ready);

  const data = await p.evaluate(() => {
    const root = document.getElementById("process");
    const rb = root.getBoundingClientRect();
    const cards = [...root.querySelectorAll(".process-card, .ready-card")].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 30),
        x: Math.round(b.left),
        y: Math.round(b.top - rb.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    });
    const title = root.querySelector(".section-title");
    const tb = title.getBoundingClientRect();
    const lead = root.querySelector(".section-lead");
    const lb = lead.getBoundingClientRect();
    return {
      h: Math.round(rb.height),
      title: { x: Math.round(tb.left), y: Math.round(tb.top - rb.top), fs: getComputedStyle(title).fontSize, h: Math.round(tb.height) },
      lead: { x: Math.round(lb.left), y: Math.round(lb.top - rb.top), w: Math.round(lb.width) },
      cards,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
