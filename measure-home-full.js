const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const REF = "https://hanza-template.framer.website/";
const LOCAL = "file:///" + path.resolve("index.html").replace(/\\/g, "/");
const OUT = "verify-shots";
fs.mkdirSync(OUT, { recursive: true });

async function deepMeasure(page, label) {
  return page.evaluate((label) => {
    const m = (el, name) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        name,
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
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
        bg: cs.backgroundColor,
        pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        gap: cs.gap,
      };
    };

    const find = (t) =>
      [...document.querySelectorAll("h1,h2,h3,p,a,span,strong,button,li")].find(
        (e) => (e.textContent || "").replace(/\s+/g, " ").trim().startsWith(t)
      );

    const findExact = (t) =>
      [...document.querySelectorAll("h1,h2,h3,p,a,span,strong,button")].find(
        (e) => (e.textContent || "").replace(/\s+/g, " ").trim() === t
      );

    const sections = {};
    const keys = [
      ["menu", "Menu"],
      ["brand", "Hanza"],
      ["brandW", "Winnie"],
      ["time", "Local Time"],
      ["cta", "Start Project"],
      ["tagline", "I help founders"],
      ["webDesign", "/01"],
      ["trusted", "Trusted by"],
      ["rating", "4.92"],
      ["mission", "Ahoj"],
      ["projects", "01 Projects"],
      ["caseStudies", "Case Studies"],
      ["whatICreate", "What I Create"],
      ["fiveSteps", "5 Steps"],
      ["clientStories", "Client Stories"],
      ["packages", "Website Packages"],
      ["quickAnswers", "Quick Answers"],
      ["designNotes", "Design Notes"],
      ["contact", "Create Your"],
    ];
    for (const [k, t] of keys) {
      const el = find(t) || findExact(t);
      sections[k] = m(el, k);
    }

    // Prefer brand that is header brand
    const brandEl =
      findExact("Hanza®") ||
      findExact("Winnie®") ||
      [...document.querySelectorAll("a")].find((a) => /^(Hanza|Winnie)/i.test((a.textContent || "").trim()));
    sections.brandHeader = m(brandEl, "brandHeader");

    const cta = find("Start Project")?.closest("a") || find("Start Project");
    sections.ctaBox = m(cta, "ctaBox");

    const imgs = [...document.querySelectorAll("img")]
      .map((img) => {
        const r = img.getBoundingClientRect();
        if (r.width < 20 || r.height < 10) return null;
        return {
          alt: img.alt || "",
          src: (img.currentSrc || img.src || "").split("/").pop().slice(0, 50),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter(Boolean);

    // Section tops by scrolling labels
    const sectionYs = {};
    for (const [k, t] of [
      ["heroTag", "I help founders"],
      ["ticker", "Kintsugi"],
      ["mission", "My Mission"],
      ["portfolio", "Case Studies"],
      ["services", "What I Create"],
      ["process", "5 Steps"],
      ["testimonials", "Client Stories"],
      ["pricing", "Website Packages"],
      ["faq", "Quick Answers"],
      ["blog", "Design Notes"],
      ["contactH", "Create Your"],
    ]) {
      const el = find(t);
      if (el) {
        const r = el.getBoundingClientRect();
        sectionYs[k] = Math.round(r.y + window.scrollY);
      }
    }

    return {
      label,
      viewport: { w: innerWidth, h: innerHeight },
      bodyFont: getComputedStyle(document.body).fontFamily,
      sections,
      sectionYs,
      imgs: imgs.slice(0, 40),
      docH: document.documentElement.scrollHeight,
    };
  }, label);
}

async function shotFull(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

async function shotClip(page, name, y, h = 900) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, name),
    clip: { x: 0, y: 0, width: 1440, height: h },
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // REF
  await page.goto(REF, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(3000);
  await shotClip(page, "ref-01-hero.png", 0);
  const ref = await deepMeasure(page, "ref");

  // scroll sections for screenshots
  for (const [name, key] of [
    ["ref-02-about.png", "mission"],
    ["ref-03-portfolio.png", "portfolio"],
    ["ref-04-services.png", "services"],
    ["ref-05-process.png", "process"],
    ["ref-06-testimonials.png", "testimonials"],
    ["ref-07-pricing.png", "pricing"],
    ["ref-08-faq.png", "faq"],
    ["ref-09-blog.png", "blog"],
    ["ref-10-contact.png", "contactH"],
  ]) {
    const y = Math.max(0, (ref.sectionYs[key] || 0) - 80);
    await shotClip(page, name, y);
  }

  // LOCAL
  await page.goto(LOCAL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);
  await shotClip(page, "local-01-hero.png", 0);
  const local = await deepMeasure(page, "local");

  for (const [name, key] of [
    ["local-02-about.png", "mission"],
    ["local-03-portfolio.png", "portfolio"],
    ["local-04-services.png", "services"],
    ["local-05-process.png", "process"],
    ["local-06-testimonials.png", "testimonials"],
    ["local-07-pricing.png", "pricing"],
    ["local-08-faq.png", "faq"],
    ["local-09-blog.png", "blog"],
    ["local-10-contact.png", "contactH"],
  ]) {
    const y = Math.max(0, (local.sectionYs[key] || 0) - 80);
    await shotClip(page, name, y);
  }

  // Diffs
  const diffs = [];
  for (const k of Object.keys(ref.sections)) {
    const a = ref.sections[k];
    const b = local.sections[k];
    if (!a && !b) continue;
    if (!a || !b) {
      diffs.push({ key: k, issue: !a ? "missing on ref" : "missing on local", ref: a, local: b });
      continue;
    }
    const d = {
      key: k,
      dx: b.x - a.x,
      dy: b.y - a.y,
      dw: b.w - a.w,
      dh: b.h - a.h,
      fontSize: a.fontSize !== b.fontSize ? `${a.fontSize}→${b.fontSize}` : null,
      fontWeight: a.fontWeight !== b.fontWeight ? `${a.fontWeight}→${b.fontWeight}` : null,
      lineHeight: a.lineHeight !== b.lineHeight ? `${a.lineHeight}→${b.lineHeight}` : null,
      letterSpacing: a.letterSpacing !== b.letterSpacing ? `${a.letterSpacing}→${b.letterSpacing}` : null,
      ref: { x: a.x, y: a.y, w: a.w, h: a.h, fs: a.fontSize, fw: a.fontWeight, lh: a.lineHeight, ls: a.letterSpacing, text: a.text },
      local: { x: b.x, y: b.y, w: b.w, h: b.h, fs: b.fontSize, fw: b.fontWeight, lh: b.lineHeight, ls: b.letterSpacing, text: b.text },
    };
    if (Math.abs(d.dx) > 4 || Math.abs(d.dy) > 8 || Math.abs(d.dw) > 8 || d.fontSize || d.fontWeight || d.lineHeight || d.letterSpacing) {
      diffs.push(d);
    }
  }

  const result = { ref, local, diffs, docH: { ref: ref.docH, local: local.docH } };
  fs.writeFileSync("measure-home-full.json", JSON.stringify(result, null, 2));

  console.log("DOC HEIGHT ref", ref.docH, "local", local.docH);
  console.log("BODY FONT ref", ref.bodyFont);
  console.log("BODY FONT local", local.bodyFont);
  console.log("\n=== SECTION Y ===");
  for (const k of Object.keys(ref.sectionYs)) {
    console.log(k, "ref", ref.sectionYs[k], "local", local.sectionYs[k], "d", (local.sectionYs[k] || 0) - (ref.sectionYs[k] || 0));
  }
  console.log("\n=== KEY DIFFS (" + diffs.length + ") ===");
  diffs.slice(0, 40).forEach((d) => {
    if (d.issue) console.log(d.key, d.issue);
    else
      console.log(
        d.key,
        `dx=${d.dx} dy=${d.dy} dw=${d.dw} dh=${d.dh}`,
        d.fontSize || "",
        d.fontWeight || "",
        d.lineHeight || "",
        d.letterSpacing || ""
      );
  });

  console.log("\n=== REF HERO KEYS ===");
  ["tagline", "ctaBox", "rating", "trusted", "caseStudies", "packages", "contact"].forEach((k) => {
    const v = ref.sections[k];
    if (v) console.log(k, JSON.stringify(v));
  });
  console.log("\n=== LOCAL HERO KEYS ===");
  ["tagline", "ctaBox", "rating", "trusted", "caseStudies", "packages", "contact"].forEach((k) => {
    const v = local.sections[k];
    if (v) console.log(k, JSON.stringify(v));
  });

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
