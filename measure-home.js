const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");

const REF = "https://hanza-template.framer.website/";
const LOCAL = "file:///" + path.resolve("index.html").replace(/\\/g, "/");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return download(res.headers.location, dest).then(resolve, reject);
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function measure(page, label) {
  return page.evaluate((label) => {
    const items = [];
    const pick = (sel) => document.querySelector(sel);
    const m = (el, name) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        name,
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
      };
    };

    const byText = (t) =>
      [...document.querySelectorAll("h1,h2,h3,p,a,span,strong,button")].find(
        (el) => (el.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );

    const data = {
      heroH1: m(byText("Design, Build") || pick(".hero h1"), "heroH1"),
      heroSub: m(byText("I help founders") || pick(".hero-lead"), "heroSub"),
      brand: m(byText("Hanza") || byText("Winnie") || pick(".brand"), "brand"),
      cta: m(byText("Start Project")?.closest("a"), "cta"),
      ctaAvatar: m(document.querySelector('.header-cta img, .compound img, img[src*="width=120"]'), "ctaAvatar"),
      missionH: m(byText("A Clear") || byText("clear direction"), "missionH"),
      portfolioH: m(byText("Case Studies") || byText("Selected Work"), "portfolioH"),
      contactH: m(byText("Create Your") || byText("Next Website"), "contactH"),
    };

    const imgs = [...document.querySelectorAll("img")]
      .map((img) => {
        const r = img.getBoundingClientRect();
        if (r.width < 20) return null;
        return {
          alt: img.alt || "",
          src: (img.currentSrc || img.src || "").slice(-60),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter(Boolean)
      .slice(0, 25);

    return { label, viewport: { w: innerWidth, h: innerHeight }, data, imgs };
  }, label);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(REF, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "ref-home-hero.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
  const ref = await measure(page, "ref");

  const refImgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((img) => ({
        src: img.src,
        alt: img.alt || "",
        w: img.naturalWidth,
        h: img.naturalHeight,
        rect: img.getBoundingClientRect(),
      }))
      .filter((i) => i.src.includes("framerusercontent") && i.rect.width > 30)
  );

  await page.goto(LOCAL, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "local-home-hero.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
  const local = await measure(page, "local");

  fs.writeFileSync("measure-home.json", JSON.stringify({ ref, local, refImgs: refImgs.slice(0, 30) }, null, 2));

  console.log("=== REF DATA ===");
  Object.entries(ref.data).forEach(([k, v]) => v && console.log(k, JSON.stringify(v)));
  console.log("\n=== LOCAL DATA ===");
  Object.entries(local.data).forEach(([k, v]) => v && console.log(k, JSON.stringify(v)));
  console.log("\n=== REF IMGS (first 12) ===");
  refImgs.slice(0, 12).forEach((i) =>
    console.log(JSON.stringify({ alt: i.alt, w: Math.round(i.rect.width), h: Math.round(i.rect.height), x: Math.round(i.rect.x), y: Math.round(i.rect.y), src: i.src.slice(-50) }))
  );

  // Download hero + key homepage assets
  const heroImg = refImgs.find((i) => i.alt === "Hero Image" || (i.rect.height > 400 && i.rect.x > 700));
  const portrait = refImgs.find((i) => i.alt === "User" || i.src.includes("OV4oW912"));
  const avatar = refImgs.find((i) => i.src.includes("width=120") && i.rect.width <= 60);

  const downloads = {
    "home-hero-portrait.webp": heroImg?.src,
    "home-profile.webp": portrait?.src,
  };
  if (avatar?.src) downloads["home-cta-avatar.webp"] = avatar.src;

  for (const [name, url] of Object.entries(downloads)) {
    if (!url) {
      console.warn("skip", name);
      continue;
    }
    const full = url.includes("width=") ? url : `${url.split("?")[0]}?width=1600`;
    await download(full, path.join("assets", name));
    console.log("saved", name);
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
