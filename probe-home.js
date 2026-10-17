const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const REF = "https://hanza-template.framer.website/";
const LOCAL = "file:///" + path.resolve("index.html").replace(/\\/g, "/");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  async function probe(url, label) {
    await page.goto(url, { waitUntil: label === "ref" ? "networkidle" : "load", timeout: 120000 });
    await page.waitForTimeout(2500);
    return page.evaluate((label) => {
      const pick = (sel) => document.querySelector(sel);
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          fs: cs.fontSize,
          fw: cs.fontWeight,
          lh: cs.lineHeight,
          ls: cs.letterSpacing,
          ff: cs.fontFamily.slice(0, 40),
          color: cs.color,
          bg: cs.backgroundColor,
        };
      };
      const byText = (t) =>
        [...document.querySelectorAll("h1,h2,h3,p,span,strong,a,div")].find(
          (e) => (e.textContent || "").replace(/\s+/g, " ").trim().startsWith(t) && e.children.length < 5
        );

      // Hero wordmark large logo
      const logos = [...document.querySelectorAll("img")].filter((i) => {
        const r = i.getBoundingClientRect();
        return r.width > 400 && r.y > 500 && r.y < 900;
      });

      // Case cards / dark project blocks
      const darkBlocks = [...document.querySelectorAll("section, article, div")].filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return r.width > 1200 && r.height > 400 && r.height < 1200 && (cs.backgroundColor.includes("15, 15") || cs.backgroundColor.includes("14, 14") || cs.backgroundColor.includes("0, 0, 0") || cs.backgroundColor === "rgb(18, 18, 18)" || cs.backgroundColor === "rgb(14, 14, 14)");
      }).slice(0, 6);

      return {
        label,
        docH: document.documentElement.scrollHeight,
        hero: {
          section: box(pick(".home-hero, .hero") || byText("I help founders")?.closest("section")),
          tagline: box(byText("I help founders")),
          rating: box(byText("4.92")),
          trusted: box(byText("Trusted by")),
          service: box(byText("/01") || byText("/01 Web")),
          wordmark: logos[0]
            ? {
                ...box(logos[0]),
                src: (logos[0].src || "").slice(-40),
              }
            : null,
          avatars: [...document.querySelectorAll("img")].filter((i) => {
            const r = i.getBoundingClientRect();
            return r.width >= 35 && r.width <= 45 && r.y > 700 && r.y < 850;
          }).map((i) => box(i)),
        },
        titles: {
          caseStudies: box(byText("Case Studies")),
          whatICreate: box(byText("What I Create")),
          fiveSteps: box(byText("5 Steps")),
          clientStories: box(byText("Client Stories")),
          packages: box(byText("Website Packages")),
          faq: box(byText("Quick Answers")),
          designNotes: box(byText("Design Notes")),
          contact: box(byText("Create Your")),
          mission: box(byText("Ahoj") || byText("A clear") || byText("I help founders, studios")),
        },
        caseCount: [...document.querySelectorAll("article.case-card, [class*='case']")].filter((a) => a.getBoundingClientRect().height > 300).length,
        fonts: [...document.fonts].slice(0, 8).map((f) => `${f.family} ${f.status} ${f.weight}`),
      };
    }, label);
  }

  const ref = await probe(REF, "ref");
  const local = await probe(LOCAL, "local");
  fs.writeFileSync("probe-home.json", JSON.stringify({ ref, local }, null, 2));
  console.log(JSON.stringify({ ref, local }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
