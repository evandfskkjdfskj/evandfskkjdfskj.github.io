const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("file:///" + path.resolve("index.html").replace(/\\/g, "/"), { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const data = await p.evaluate(async () => {
    await document.fonts.ready;
    const fonts = [...document.fonts].slice(0, 10).map((f) => `${f.family}|${f.status}|${f.weight}`);
    const m = (t) => {
      const el = [...document.querySelectorAll("h2,p,strong,a")].find((e) =>
        (e.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        t,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        ff: cs.fontFamily.slice(0, 30),
      };
    };
    return {
      fonts,
      tagline: m("I help founders"),
      rating: m("4.92"),
      trusted: m("Trusted by"),
      cases: m("Case"),
      packages: m("Website Packages"),
      wordmark: (() => {
        const img = document.querySelector(".hero-wordmark img");
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })(),
      docH: document.documentElement.scrollHeight,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await p.screenshot({ path: "verify-shots/local-01-hero.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
