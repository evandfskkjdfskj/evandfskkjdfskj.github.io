const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const root = process.cwd();
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".mp4": "video/mp4",
};

function server() {
  return http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u === "/") u = "/index.html";
    const file = path.normalize(path.join(root, u));
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("no");
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

async function measure(page, label) {
  // scroll until Case Studies title is near mid/upper viewport
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("h2")].find((h) =>
      /Case\s*Studies/i.test(h.textContent || "")
    );
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo(0, y);
    }
  });
  await page.waitForTimeout(400);

  return page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        t: (el.innerText || "").replace(/\s+/g, " ").slice(0, 50),
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: cs.fontSize,
        fw: cs.fontWeight,
        lh: cs.lineHeight,
        ls: cs.letterSpacing,
        color: cs.color,
      };
    };
    const byText = (re, sel = "h2,h3,p,div,span,a,dt,dd,strong") =>
      [...document.querySelectorAll(sel)].find((e) => re.test((e.textContent || "").trim()) && e.children.length < 4);

    const title = [...document.querySelectorAll("h2")].find((h) =>
      /Case/i.test(h.textContent || "")
    );
    const titleSpans = title
      ? [...title.querySelectorAll("span, br")].map((n) => {
          if (n.tagName === "BR") return { br: true };
          return pick(n);
        })
      : [];

    const stats = [...document.querySelectorAll(".stat-card, [class*='stat']")]
      .filter((el) => el.querySelector && (el.innerText || "").match(/\d/))
      .slice(0, 8)
      .map(pick);

    // broader: find large numbers
    const nums = [...document.querySelectorAll("p,div,span,h3,h4")]
      .filter((el) => /^\d+\+?$/.test((el.innerText || "").trim()) && el.getBoundingClientRect().height > 30)
      .slice(0, 8)
      .map(pick);

    return {
      scrollY: Math.round(window.scrollY),
      portfolioKicker: pick(byText(/02\s*Portfolio/i)),
      allProjects: pick(byText(/All Projects/i)),
      caseTitle: pick(title),
      titleSpans,
      caseLead: pick(byText(/Each project shows/i)),
      missionMuted: pick(byText(/usability/i)),
      profileName: pick(byText(/^(Winnie|Hanza)/i, "strong,h3,div")),
      profession: pick(byText(/^Profession$/i, "dt,div,span")),
      location: pick(byText(/^Location$/i, "dt,div,span")),
      nums,
      stats: stats.filter(Boolean).slice(0, 4),
      aboutBg: getComputedStyle(document.querySelector(".about, #about, #home-about") || document.body)
        .backgroundColor,
    };
  });
}

(async () => {
  const b = await chromium.launch({ headless: true });

  const pref = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pref.goto("https://hanza-template.framer.website/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await pref.waitForTimeout(2500);
  const ref = await measure(pref, "ref");
  await pref.screenshot({ path: "verify-shots/align-ref-about.png" });
  console.log("REF", JSON.stringify(ref, null, 2));
  await pref.close();

  const s = server().listen(3462);
  const ploc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await ploc.goto("http://127.0.0.1:3462/", { waitUntil: "load", timeout: 30000 });
  await ploc.waitForTimeout(800);
  const loc = await measure(ploc, "local");
  await ploc.screenshot({ path: "verify-shots/align-local-about.png" });
  console.log("LOCAL", JSON.stringify(loc, null, 2));
  await ploc.close();
  s.close();
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
