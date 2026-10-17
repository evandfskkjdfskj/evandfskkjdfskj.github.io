const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  async function sectionHeights(url, label) {
    await page.goto(url, { waitUntil: label === "ref" ? "networkidle" : "load", timeout: 120000 });
    await page.waitForTimeout(2000);
    return page.evaluate((label) => {
      const sections = [...document.querySelectorAll("section")].map((s) => {
        const r = s.getBoundingClientRect();
        return {
          id: s.id || s.className.toString().slice(0, 24),
          y: Math.round(r.y + window.scrollY),
          h: Math.round(r.height),
        };
      });
      return { label, docH: document.documentElement.scrollHeight, sections };
    }, label);
  }

  const ref = await sectionHeights("https://hanza-template.framer.website/", "ref");
  const local = await sectionHeights(
    "file:///" + path.resolve("index.html").replace(/\\/g, "/"),
    "local"
  );
  fs.writeFileSync("section-heights.json", JSON.stringify({ ref, local }, null, 2));
  console.log("REF docH", ref.docH);
  ref.sections.forEach((s) => console.log("R", s.h, s.id));
  console.log("LOCAL docH", local.docH);
  local.sections.forEach((s) => console.log("L", s.h, s.id));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
