const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);

  // Scroll to pricing
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      (e.textContent || "").trim().startsWith("Website Packages")
    );
    if (el) el.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
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
    const find = (t) =>
      [...document.querySelectorAll("h1,h2,h3,p,span,strong,a,button")].find((e) =>
        (e.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );

    return {
      pricingH: m(find("Website Packages")),
      starter: m(find("Starter") || find("Launch")),
      prices: [...document.querySelectorAll("h2,h3,p,span")]
        .filter((e) => /\$\d+|€\d+|from/i.test(e.textContent || ""))
        .slice(0, 12)
        .map((e) => m(e)),
      cards: [...document.querySelectorAll("h2,h3")]
        .filter((e) => /Starter|Growth|Studio|Launch|Pro|Custom|Package/i.test(e.textContent || ""))
        .map((e) => m(e)),
    };
  });

  // Blog page
  await page.goto("https://hanza-template.framer.website/blog", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);
  const blog = await page.evaluate(() => {
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
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
    const find = (t) =>
      [...document.querySelectorAll("h1,h2,h3,p,a")].find((e) =>
        (e.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );
    return {
      h1: m(find("Design Notes") || find("Blog") || document.querySelector("h1")),
      articles: [...document.querySelectorAll("h2,h3")]
        .slice(0, 10)
        .map((e) => m(e)),
    };
  });

  // Sample article
  await page.goto("https://hanza-template.framer.website/blog/what-makes-a-website-project-run-smoothly", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForTimeout(2000);
  const article = await page.evaluate(() => {
    const m = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100),
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
    return {
      h1: m(document.querySelector("h1")),
      paras: [...document.querySelectorAll("p")]
        .slice(0, 6)
        .map((e) => m(e)),
      imgs: [...document.querySelectorAll("img")]
        .filter((i) => i.getBoundingClientRect().width > 100)
        .slice(0, 6)
        .map((img) => {
          const r = img.getBoundingClientRect();
          return {
            alt: img.alt,
            src: img.src.slice(-60),
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        }),
    };
  });

  fs.writeFileSync(
    "ref-pricing-blog.json",
    JSON.stringify({ data, blog, article }, null, 2)
  );
  console.log("PRICING", JSON.stringify(data, null, 2));
  console.log("BLOG", JSON.stringify(blog, null, 2));
  console.log("ARTICLE", JSON.stringify(article, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
