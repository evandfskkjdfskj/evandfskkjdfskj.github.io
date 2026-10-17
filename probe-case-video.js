const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => window.scrollTo(0, 9900));
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    const vids = [...document.querySelectorAll("video")].map((v) => {
      const r = v.getBoundingClientRect();
      const section = v.closest("section");
      return {
        src: (v.currentSrc || "").split("/").pop(),
        x: Math.round(r.left),
        y: Math.round(r.top + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        section: section?.id || "",
        parent: (v.parentElement?.className || "").toString().slice(0, 60),
      };
    });
    // nearby text
    const texts = [...document.querySelectorAll("h2,p,blockquote")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top > -100 && r.top < 900 && /clearer structure|Case Study|Ikigai|Impressions/i.test(el.innerText || "");
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60),
          x: Math.round(r.left),
          y: Math.round(r.top),
          w: Math.round(r.width),
        };
      });
    return { vids, texts, scrollY: window.scrollY };
  });
  console.log(JSON.stringify(info, null, 2));
  await p.screenshot({ path: "verify-shots/ref-case-highlight.png" });
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
