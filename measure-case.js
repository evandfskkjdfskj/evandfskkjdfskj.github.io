const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const slug = process.argv[2];
const localFile = process.argv[3];
if (!slug || !localFile) {
  console.error("Usage: node measure-case.js <slug> <local-html-path>");
  process.exit(1);
}

const REF = `https://hanza-template.framer.website/portfolio/${slug}`;
const LOCAL = "file:///" + path.resolve(localFile).replace(/\\/g, "/");

async function measure(page, slugName) {
  return page.evaluate((slugName) => {
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
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
      [...document.querySelectorAll("h1,h2,h3,p,dt,dd,a")].find((el) =>
        (el.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );

    const heroImg = document.querySelector('.hero-frame img, img[alt*="preview" i], img[alt*="project visual" i]');
    const shots = [...document.querySelectorAll(".shot img, img[alt='Project Image']")];

    return {
      h1: m(byText(slugName) || document.querySelector("h1")),
      heroImg: m(heroImg),
      cta: m(byText("Start Project")?.closest("a")),
      explore: m(byText("Explore Project")?.closest("a")),
      shot1: m(shots[0]),
      imgs: [...document.querySelectorAll("img")]
        .map((img) => {
          const r = img.getBoundingClientRect();
          if (r.width < 30) return null;
          return {
            alt: img.alt || "",
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        })
        .filter(Boolean)
        .slice(0, 12),
    };
  }, slugName);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(REF, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);
  const ref = await measure(page, slug.charAt(0).toUpperCase() + slug.slice(1));

  await page.goto(LOCAL, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1000);
  const local = await measure(page, slug.charAt(0).toUpperCase() + slug.slice(1));

  fs.writeFileSync(`measure-${slug}.json`, JSON.stringify({ ref, local }, null, 2));

  console.log(`=== ${slug.toUpperCase()} REF ===`);
  ["h1", "heroImg", "cta", "explore", "shot1"].forEach((k) => ref[k] && console.log(k, JSON.stringify(ref[k])));
  console.log(`\n=== ${slug.toUpperCase()} LOCAL ===`);
  ["h1", "heroImg", "cta", "explore", "shot1"].forEach((k) => local[k] && console.log(k, JSON.stringify(local[k])));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
