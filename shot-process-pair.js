const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const b = await chromium.launch({ headless: true });
  const mk = async (url, out) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(url, { waitUntil: url.startsWith("file") ? "load" : "domcontentloaded", timeout: 90000 });
    await p.waitForTimeout(url.startsWith("file") ? 600 : 2000);
    if (url.startsWith("file")) await p.evaluate(() => document.fonts.ready);
    const sel = url.includes("hanza") ? "#home-process" : "#process";
    await p.locator(sel).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    // align section top to viewport top
    await p.evaluate((s) => {
      const el = document.querySelector(s);
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, y);
    }, sel);
    await p.waitForTimeout(200);
    await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    await p.close();
  };
  await mk("https://hanza-template.framer.website/", "verify-shots/ref-05-process.png");
  await mk("file:///" + path.resolve("index.html").replace(/\\/g, "/"), "verify-shots/local-05-process.png");
  await b.close();
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
