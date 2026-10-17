const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2000);
  // click the menu button area
  const clicked = await p.evaluate(() => {
    const candidates = [...document.querySelectorAll("button, a, div, span")].filter((el) =>
      /^(Menu|MENU)$/i.test((el.textContent || "").trim()) || /menu/i.test(el.getAttribute("aria-label") || "")
    );
    const el = candidates[0];
    if (!el) return false;
    el.click();
    return true;
  });
  console.log("clicked", clicked);
  await p.waitForTimeout(1500);
  const imgs = await p.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((img) => {
        const r = img.getBoundingClientRect();
        return {
          src: (img.currentSrc || img.src || "").split("?")[0],
          w: Math.round(r.width),
          h: Math.round(r.height),
          x: Math.round(r.left),
          y: Math.round(r.top),
          alt: img.alt || "",
          vis: r.width > 0 && r.height > 0 && getComputedStyle(img).opacity !== "0",
        };
      })
      .filter((i) => i.vis && i.w > 80 && /framerusercontent/.test(i.src))
      .sort((a, b) => a.y - b.y || a.x - b.x)
  );
  console.log(JSON.stringify(imgs, null, 2));
  await p.screenshot({ path: "verify-shots/ref-menu-open.png" });
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
