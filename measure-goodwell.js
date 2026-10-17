const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const REF = "https://hanza-template.framer.website/portfolio/goodwell";
const LOCAL = "file:///" + path.resolve("portfolio/goodwell/index.html").replace(/\\/g, "/");

async function measure(page, label) {
  return page.evaluate((label) => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim().slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
        color: cs.color,
      };
    };

    const allH1 = [...document.querySelectorAll("h1, h2, h3, p, a, dt, dd, img")].slice(0, 80);
    const texts = allH1.map((el) => {
      const t = (el.textContent || "").trim();
      if (!t || t.length > 80) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        text: t.slice(0, 50),
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
    }).filter(Boolean);

    const imgs = [...document.querySelectorAll("img")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        src: (el.src || "").slice(-40),
        alt: el.alt,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }).filter((i) => i.w > 20);

    return { label, viewport: { w: innerWidth, h: innerHeight }, texts, imgs };
  }, label);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(REF, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "ref-measure-goodwell.png" });
  const ref = await measure(page, "ref");

  await page.goto(LOCAL, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "local-measure-goodwell.png" });
  const local = await measure(page, "local");

  fs.writeFileSync("measure-goodwell.json", JSON.stringify({ ref, local }, null, 2));

  // Print key diffs for hero
  const refTexts = ref.texts.filter((t) => /GOODWELL|Year|2026|Explore|All Projects|Start Project/i.test(t.text));
  const localTexts = local.texts.filter((t) => /Goodwell|Year|2026|Explore|All Projects|Start Project/i.test(t.text));

  console.log("=== REF KEY TEXTS ===");
  refTexts.forEach((t) => console.log(JSON.stringify(t)));
  console.log("\n=== LOCAL KEY TEXTS ===");
  localTexts.forEach((t) => console.log(JSON.stringify(t)));

  console.log("\n=== REF IMAGES (top 8) ===");
  ref.imgs.slice(0, 8).forEach((i) => console.log(JSON.stringify(i)));
  console.log("\n=== LOCAL IMAGES (top 8) ===");
  local.imgs.slice(0, 8).forEach((i) => console.log(JSON.stringify(i)));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
