const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);

  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map((img) => ({
      src: img.src,
      alt: img.alt || "",
      x: Math.round(img.getBoundingClientRect().x),
      y: Math.round(img.getBoundingClientRect().y),
      w: Math.round(img.getBoundingClientRect().width),
      h: Math.round(img.getBoundingClientRect().height),
    })).filter((i) => i.src.includes("framerusercontent") && i.w > 20)
  );

  const map = {
    "home-wordmark.webp": imgs.find((i) => i.w > 600 && i.alt === "Logo")?.src,
    "ticker-kintsugi.webp": imgs.find((i) => i.x < 0 && i.w === 88)?.src,
    "ticker-interlock.webp": imgs.find((i) => i.x === 165 && i.w === 109)?.src,
    "ticker-ikigai.webp": imgs.find((i) => i.x === 395)?.src,
    "ticker-goodwell.webp": imgs.find((i) => i.x === 617)?.src,
    "ticker-layers.webp": imgs.find((i) => i.x === 826)?.src,
    "trust-avatar-1.webp": imgs.find((i) => i.alt === "User" && i.x === 48)?.src,
    "trust-avatar-2.webp": imgs.find((i) => i.alt === "User" && i.x === 74)?.src,
    "trust-avatar-3.webp": imgs.find((i) => i.alt === "User" && i.x === 100)?.src,
    "trust-avatar-4.webp": imgs.find((i) => i.alt === "User" && i.x === 126)?.src,
    "home-cta-avatar.webp": imgs.find((i) => i.w === 50 && i.y === 48)?.src,
  };

  for (const [name, url] of Object.entries(map)) {
    if (!url) { console.warn("missing", name); continue; }
    const full = url.includes("width=") ? url : url.split("?")[0] + "?width=800";
    await download(full, path.join("assets", name));
    console.log("ok", name);
  }

  const els = await page.evaluate(() => {
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing };
    };
    const find = (t) => [...document.querySelectorAll("*")].find((e) => e.children.length <= 2 && (e.textContent || "").trim().startsWith(t));
    return {
      trust: m(find("4.92")),
      tagline: m(find("I help founders")),
      service1: m(find("/01")),
      wordmark: m(document.querySelector('img[alt="Logo"]')?.closest("div") || document.querySelector('img[alt="Logo"]')),
      localTime: m(find("Local Time")?.parentElement),
    };
  });
  fs.writeFileSync("ref-home-hero-detail.json", JSON.stringify({ imgs, els, map }, null, 2));
  console.log(JSON.stringify(els, null, 2));
  await browser.close();
})();
