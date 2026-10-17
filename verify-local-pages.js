const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const pages = [
    "portfolio/goodwell/index.html",
    "about/index.html",
    "portfolio/index.html",
    "blog/small-details-that-make-websites-feel-premium/index.html",
  ];

  for (const p of pages) {
    const fileUrl = "file:///" + path.resolve(p).replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(2000);
    const slug = p.replace(/\//g, "__").replace(/\.html$/, "");
    await page.screenshot({ path: path.join("ref-shots", `local-${slug}.png`) });
    const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log(p, "\n", text, "\n---");
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
