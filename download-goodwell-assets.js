const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");

const REF = "https://hanza-template.framer.website/portfolio/goodwell";

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(REF, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
      };
    };

    const byText = (t) =>
      [...document.querySelectorAll("*")].find(
        (el) => el.children.length === 0 && (el.textContent || "").trim() === t
      );

    return {
      brand: m(byText("Hanza®") || byText("HANZA®")),
      h1: m(byText("Goodwell")),
      heroImg: m(document.querySelector('img[alt="Preview Image"]')),
      heroLogo: m(document.querySelector('img[alt=""]')?.closest("div")?.querySelector("img")),
      quote: m(document.querySelector("blockquote") || byText("A clearer structure helped users understand the product faster and move through the site with more confidence.")?.closest("p,blockquote,div")),
      quoteImg: m(document.querySelector('img[alt="Author"]')),
      overviewH: m([...document.querySelectorAll("h2,h3,p")].find((el) => (el.textContent || "").includes("calm digital experience"))),
      shot1: m(document.querySelector('img[alt="Project Image"]')),
      headerCta: m(byText("Start Project")?.closest("a,div")),
      ctaAvatar: m(document.querySelector('img[src*="width=120"]')),
    };
  });

  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((img) => ({ src: img.src, alt: img.alt || "", w: img.naturalWidth, h: img.naturalHeight }))
      .filter((i) => i.src.includes("framerusercontent"))
  );

  fs.writeFileSync("ref-goodwell-detail.json", JSON.stringify({ data, imgs }, null, 2));

  const map = {
    "goodwell-hero.webp": imgs.find((i) => i.alt === "Preview Image")?.src,
    "goodwell-logo.webp": imgs.find((i) => i.src.includes("HZnp5GWrpy6u6") || (i.w === 199 && i.h === 64))?.src,
    "goodwell-shot-1.webp": imgs.find((i) => i.alt === "Project Image")?.src,
    "goodwell-shot-2.webp": imgs.filter((i) => i.alt === "Project Image")[1]?.src,
    "goodwell-shot-3.webp": imgs.filter((i) => i.alt === "Project Image")[2]?.src,
    "goodwell-author.webp": imgs.find((i) => i.alt === "Author")?.src,
  };

  for (const [name, url] of Object.entries(map)) {
    if (!url) {
      console.warn("missing", name);
      continue;
    }
    const full = url.includes("width=") ? url : `${url}?width=2400`;
    await download(full, path.join("assets", name));
    console.log("saved", name);
  }

  await browser.close();
})();
