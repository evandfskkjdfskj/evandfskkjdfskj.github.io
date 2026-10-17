const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const lib = url.startsWith("http:") ? http : https;
    const req = lib.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
    });
    req.on("error", (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function cleanUrl(url, width) {
  if (!url) return null;
  const base = url.split("?")[0];
  if (/\.(mp4|webm|mov)(\?|$)/i.test(base)) return base;
  if (width) return `${base}?width=${width}&scale-down-to=2048`;
  return base;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Collect network media
  const networkMedia = new Set();
  page.on("response", (res) => {
    const u = res.url();
    if (/framerusercontent\.com/i.test(u) && /\.(webp|png|jpg|jpeg|gif|mp4|webm|mov)(\?|$)/i.test(u)) {
      networkMedia.add(u.split("?")[0]);
    }
  });

  await page.goto("https://hanza-template.framer.website/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(2500);

  // Scroll full page to lazy-load
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);

  const media = await page.evaluate(() => {
    const out = [];
    const push = (item) => {
      if (!item.src) return;
      out.push(item);
    };

    [...document.querySelectorAll("img")].forEach((img) => {
      const r = img.getBoundingClientRect();
      const section = img.closest("section");
      push({
        kind: "img",
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.left),
        y: Math.round(r.top + window.scrollY),
        section: section?.id || section?.className?.toString?.().slice(0, 40) || "",
      });
    });

    [...document.querySelectorAll("video")].forEach((v) => {
      const r = v.getBoundingClientRect();
      const section = v.closest("section");
      const sources = [...v.querySelectorAll("source")].map((s) => s.src).filter(Boolean);
      push({
        kind: "video",
        src: v.currentSrc || v.src || sources[0] || "",
        sources,
        poster: v.poster || "",
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.left),
        y: Math.round(r.top + window.scrollY),
        section: section?.id || "",
        autoplay: v.autoplay,
        loop: v.loop,
        muted: v.muted,
      });
    });

    // CSS background images with framer urls
    [...document.querySelectorAll("*")].forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return;
      const m = bg.match(/url\(["']?(https:\/\/[^"')]+)["']?\)/);
      if (!m) return;
      if (!/framerusercontent/i.test(m[1])) return;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      const section = el.closest("section");
      push({
        kind: "bg",
        src: m[1],
        alt: "",
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.left),
        y: Math.round(r.top + window.scrollY),
        section: section?.id || "",
      });
    });

    return out;
  });

  // Also dump section-by-section notable images for mapping
  const bySection = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("section")];
    return sections.map((s) => {
      const id = s.id || "";
      const imgs = [...s.querySelectorAll("img, video")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          src: (el.currentSrc || el.src || "").split("?")[0],
          alt: el.alt || "",
          w: Math.round(r.width),
          h: Math.round(r.height),
          x: Math.round(r.left),
          y: Math.round(r.top - s.getBoundingClientRect().top),
        };
      });
      return { id, h: Math.round(s.getBoundingClientRect().height), imgs };
    });
  });

  fs.writeFileSync(
    "ref-home-media.json",
    JSON.stringify(
      {
        count: media.length,
        network: [...networkMedia],
        media,
        bySection,
      },
      null,
      2
    )
  );

  console.log("media items", media.length);
  console.log("videos", media.filter((m) => m.kind === "video").length);
  console.log("network unique", networkMedia.size);
  console.log(
    "video details",
    JSON.stringify(
      media.filter((m) => m.kind === "video" || /\.mp4|\.webm/i.test(m.src)),
      null,
      2
    )
  );

  // Print large images by section for mapping
  for (const sec of bySection) {
    const big = sec.imgs.filter((i) => i.w >= 80 || i.h >= 80);
    if (!big.length) continue;
    console.log("\n===", sec.id || "(no-id)", "h=" + sec.h);
    for (const i of big) {
      const name = (i.src || "").split("/").pop();
      console.log(`  ${i.tag} ${i.w}x${i.h} x=${i.x} y=${i.y} alt="${i.alt}" ${name}`);
    }
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
