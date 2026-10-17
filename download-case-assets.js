const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node download-case-assets.js <slug>");
  console.error("Example: node download-case-assets.js galileo");
  process.exit(1);
}

const REF = `https://hanza-template.framer.website/portfolio/${slug}`;

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
  await page.waitForTimeout(2500);

  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((img) => ({
        src: img.src,
        alt: img.alt || "",
        nw: img.naturalWidth,
        nh: img.naturalHeight,
        rect: {
          x: Math.round(img.getBoundingClientRect().x),
          y: Math.round(img.getBoundingClientRect().y),
          w: Math.round(img.getBoundingClientRect().width),
          h: Math.round(img.getBoundingClientRect().height),
        },
      }))
      .filter((i) => i.src.includes("framerusercontent"))
  );

  const projectImgs = imgs.filter((i) => i.alt === "Project Image");
  const hero = imgs.find((i) => i.alt === "Preview Image" || (i.rect.h > 400 && i.rect.x < 400));
  const author = imgs.find((i) => i.alt === "Author");
  const logo = imgs.find(
    (i) =>
      i.alt === "" &&
      i.rect.w >= 80 &&
      i.rect.w <= 140 &&
      i.rect.h >= 24 &&
      i.rect.h <= 40 &&
      i.rect.y > 500 &&
      i.rect.y < 700
  );

  const map = {
    [`${slug}-hero.webp`]: hero?.src,
    [`${slug}-logo.webp`]: logo?.src,
    [`${slug}-shot-1.webp`]: projectImgs[0]?.src,
    [`${slug}-shot-2.webp`]: projectImgs[1]?.src,
    [`${slug}-shot-3.webp`]: projectImgs[2]?.src,
    [`${slug}-author.webp`]: author?.src,
  };

  fs.writeFileSync(`ref-${slug}-assets.json`, JSON.stringify({ slug, imgs, map }, null, 2));

  for (const [name, url] of Object.entries(map)) {
    if (!url) {
      console.warn("missing", name);
      continue;
    }
    const full = url.includes("width=") ? url : `${url.split("?")[0]}?width=2400`;
    await download(full, path.join("assets", name));
    console.log("saved", name);
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
