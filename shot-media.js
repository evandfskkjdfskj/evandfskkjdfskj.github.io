const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const file = "file:///" + path.resolve("index.html").replace(/\\/g, "/");
  console.log("goto", file);
  await page.goto(file, { waitUntil: "load", timeout: 30000 });
  console.log("loaded");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "verify-shots/local-01-hero.png", timeout: 15000 });
  console.log("hero shot");
  await page.evaluate(() => {
    const el = document.getElementById("portfolio");
    if (el) window.scrollTo(0, el.offsetTop + 200);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "verify-shots/local-03-portfolio.png" });
  console.log("portfolio shot");
  await page.evaluate(() => {
    const el = document.getElementById("case-study");
    if (el) window.scrollTo(0, el.offsetTop);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "verify-shots/local-case-highlight.png" });
  console.log("case shot");
  const vids = await page.evaluate(() =>
    [...document.querySelectorAll("video")].map((v) => ({
      src: (v.querySelector("source")?.getAttribute("src") || "").split("/").pop(),
      w: v.clientWidth,
      h: v.clientHeight,
    }))
  );
  console.log(JSON.stringify(vids));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
