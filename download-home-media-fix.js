const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const lib = url.startsWith("http:") ? http : https;
    const req = lib.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          fs.writeFileSync(dest, Buffer.concat(chunks));
          resolve(dest);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

function assetUrl(file, width) {
  const base = `https://framerusercontent.com/images/${file}`;
  if (/\.mp4$/i.test(file) || file.includes("/assets/")) {
    return file.startsWith("http")
      ? file
      : `https://framerusercontent.com/assets/${file}`;
  }
  if (width) return `${base}?width=${width}&scale-down-to=2048`;
  return `${base}?scale-down-to=2048`;
}

// Mapped from live ref inventory (homepage)
const JOBS = [
  // videos
  ["home-hero.mp4", "https://framerusercontent.com/assets/q7kP8jHypD3vormI50Hujnug0es.mp4"],
  ["case-highlight.mp4", "https://framerusercontent.com/assets/TkfFG9WzEy7odN5LQ0dVVgO4cZQ.mp4"],

  // hero / chrome
  ["home-cta-avatar.webp", "nxrIdkDd6Y1sqhzSdeVsMugCCNk.webp", 200],
  ["trust-avatar-1.webp", "OwtdU2BGnc0dMRE7IkZYZlGfBtU.webp", 160],
  ["trust-avatar-2.webp", "3j6yNJGADoWDBfzMN3MTG2Fkvk.webp", 160],
  ["trust-avatar-3.webp", "iWIgAhHOUCXReoVH7RJ12DTejLU.webp", 160],
  ["trust-avatar-4.webp", "6vWPBMlL6qWuNfxxfBgHjLFwd8.webp", 160],
  ["avatar-winnie.webp", "nxrIdkDd6Y1sqhzSdeVsMugCCNk.webp", 200],

  // ticker logos (dark/light usable)
  ["logo-kintsugi.webp", "rpWxtpnQjEatsb4cidN6iCSOU.webp", 400],
  ["logo-interlock.webp", "njSY1vofkQx6kiMXnNInOp8xPo.webp", 400],
  ["logo-ikigai-labs.webp", "tKVSvCD2BXrjTdpP7b5fCA4ouI.webp", 400],
  ["logo-goodwell.webp", "WejkhJs0k28ahidPwTEVUa7UAQ.webp", 400],
  ["logo-layers.webp", "lWNXDUsAA1lisY0W7PS4Iln69HU.webp", 400],
  ["logo-leapyear.webp", "6327KxVOTRZ9nhdzpGqrKNfsq4.webp", 400],
  ["logo-galileo-mark.webp", "R9NZvMfCkuh7KfYAC5mQwEfUr4s.webp", 400],
  ["logo-fourpoints.webp", "lGBNjJpkXvM6ANJVGHNbMawZ4g.webp", 400],
  ["logo-extra.webp", "rdYH8Fpt5aPTxGpCY3SCXoox8U.webp", 400],

  // about / contact / pricing portrait
  ["winnie-portrait.webp", "OV4oW912RxrUXZuTYi5Z2PUOEqk.webp", 1200],
  ["hanza-portrait.webp", "OV4oW912RxrUXZuTYi5Z2PUOEqk.webp", 1200],
  ["pricing-visual.webp", "OV4oW912RxrUXZuTYi5Z2PUOEqk.webp", 800],

  // portfolio case thumbs (left column)
  ["goodwell-hero.webp", "Tg2bM2Ax2NMUNMjXUgpBNTXVW4.webp", 1000],
  ["galileo-hero.webp", "usY3IMJkjdi2OFfVikOPgJQTdww.webp", 1000],
  ["ikigai-hero.webp", "5n03cn39zkw03AOYNOG4IGEscdc.webp", 1000],

  // portfolio case feature backgrounds (wide cinematic)
  ["goodwell-shot-1.webp", "OBhRqYnNhzprFbDXTmYz6oMBA.webp", 2400],
  ["galileo-shot-1.webp", "pGfraVtrJQMelbsdPS4dvfBuQaU.webp", 2400],
  ["ikigai-shot-1.webp", "L2rXxsYb7zPRivbHPp3oRsvjWxE.webp", 2400],

  // case overlay logos
  ["goodwell-logo.webp", "mwMZjXODcUlLHZnp5GWrpy6u6Lc.webp", 400],
  ["galileo-logo.webp", "R9NZvMfCkuh7KfYAC5mQwEfUr4s.webp", 400],
  ["ikigai-logo.webp", "68Thke8izHQ97CzQmZ92cnXJw.webp", 600],
  ["logo-ikigai-wide.webp", "68Thke8izHQ97CzQmZ92cnXJw.webp", 600],

  // services
  ["services-avatar.webp", "zeniIu0DU3NmcSWU4yeBs0Gdk.webp", 400],

  // testimonials people (portrait crops used as avatars)
  ["avatar-anna.webp", "i287NdiVZUtn1mMd6mjKUnfIiA.webp", 400],
  ["avatar-david.webp", "PKZsny7qgu8w3UD9rJTVT6pP8.webp", 400],
  ["avatar-jakub.webp", "ZorUVFOsjfMZG8wsEheW8SLF3s.webp", 400],
  ["avatar-emma.webp", "q5DG4PtXMq1eVcsUGy6PeAbBWM.webp", 400],

  // also map avatar-1..4 used in testimonials trust
  ["avatar-1.webp", "OwtdU2BGnc0dMRE7IkZYZlGfBtU.webp", 160],
  ["avatar-2.webp", "3j6yNJGADoWDBfzMN3MTG2Fkvk.webp", 160],
  ["avatar-3.webp", "iWIgAhHOUCXReoVH7RJ12DTejLU.webp", 160],
  ["avatar-4.webp", "6vWPBMlL6qWuNfxxfBgHjLFwd8.webp", 160],

  // blog cards
  ["blog-1.webp", "lwpit2bNgoGUzyqkdPw3jyiPI.webp", 1000],
  ["blog-2.webp", "0UkNZE7S4qruVsivS70eDa2fsHk.webp", 1000],
  ["blog-3.webp", "XKNn5wdz0oZLzNZE43UWd43s3x0.webp", 1000],
  ["blog-4.webp", "P6MzQfBdpMKaZclGPIFk31ogUus.webp", 1000],

  // menu (opened separately if needed)
  ["menu-media-a.webp", "Du3BTduVuZ6ITMKZ3z9yHUZKztc.webp", 1200],
  ["menu-media-b.webp", "aNmmzqMc990oFx3uvtN2SJHyzvw.webp", 800],

  // noise / grain from framer
  ["noise-framer.png", "6mcf62RlDfRfU61Yg5vb2pefpi4.png", 512],
];

(async () => {
  const outDir = path.join(__dirname, "assets");
  fs.mkdirSync(outDir, { recursive: true });

  for (const job of JOBS) {
    const [name, fileOrUrl, width] = job;
    const url = fileOrUrl.startsWith("http")
      ? fileOrUrl
      : assetUrl(fileOrUrl, width);
    const dest = path.join(outDir, name);
    try {
      await download(url, dest);
      const size = fs.statSync(dest).size;
      console.log("ok", name, size);
    } catch (e) {
      console.error("FAIL", name, e.message);
    }
  }

  // Open menu to capture exact menu images
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://hanza-template.framer.website/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  // try click menu
  try {
    await page.getByText("Menu", { exact: false }).first().click({ timeout: 3000 });
    await page.waitForTimeout(1200);
  } catch {}
  const menuImgs = await page.evaluate(() =>
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
        };
      })
      .filter((i) => i.w > 100 && i.h > 100 && /framerusercontent/.test(i.src))
  );
  fs.writeFileSync("ref-menu-imgs.json", JSON.stringify(menuImgs, null, 2));
  console.log("menu candidates", menuImgs.slice(0, 8));

  // download top 2 largest unique menu-ish images if found
  const uniq = [];
  for (const m of menuImgs.sort((a, b) => b.w * b.h - a.w * a.h)) {
    if (uniq.find((u) => u.src === m.src)) continue;
    uniq.push(m);
    if (uniq.length >= 2) break;
  }
  if (uniq[0]) {
    await download(uniq[0].src + "?width=1200&scale-down-to=2048", path.join(outDir, "menu-top.webp"));
    console.log("ok menu-top.webp", uniq[0].src.split("/").pop());
  }
  if (uniq[1]) {
    await download(uniq[1].src + "?width=1200&scale-down-to=2048", path.join(outDir, "menu-bottom.webp"));
    console.log("ok menu-bottom.webp", uniq[1].src.split("/").pop());
  }

  await browser.close();
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
