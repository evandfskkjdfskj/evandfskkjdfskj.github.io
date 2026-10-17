const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => window.scrollTo(0, 5200));
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const root = [...document.querySelectorAll("section")].find((s) => (s.id || "").includes("process"));
    if (!root) return null;
    const rb = root.getBoundingClientRect();
    return {
      h: Math.round(rb.height),
      kids: [...root.querySelectorAll(":scope > * , :scope *")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.height > 80 && b.width > 200;
        })
        .slice(0, 25)
        .map((el) => {
          const b = el.getBoundingClientRect();
          return {
            t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40),
            tag: el.tagName,
            cls: (el.className || "").toString().slice(0, 40),
            w: Math.round(b.width),
            h: Math.round(b.height),
            y: Math.round(b.top - rb.top),
          };
        }),
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
