const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const { chromium } = require("playwright");

const ROUTES = [
  "/portfolio",
  "/about",
  "/contact",
  "/blog",
  "/portfolio/goodwell",
  "/portfolio/galileo",
  "/portfolio/ikigai",
  "/portfolio/flora",
  "/blog/what-makes-a-website-project-run-smoothly",
  "/blog/how-visual-direction-shapes-a-stronger-website",
  "/blog/building-better-websites-in-framer",
  "/blog/creating-a-digital-presence-that-feels-clear",
  "/blog/small-details-that-make-websites-feel-premium",
];

const LOCAL_MAP = {
  "/portfolio": "portfolio/index.html",
  "/about": "about/index.html",
  "/contact": "contact/index.html",
  "/blog": "blog/index.html",
  "/portfolio/goodwell": "portfolio/goodwell/index.html",
  "/portfolio/galileo": "portfolio/galileo/index.html",
  "/portfolio/ikigai": "portfolio/ikigai/index.html",
  "/portfolio/flora": "portfolio/flora/index.html",
  "/blog/what-makes-a-website-project-run-smoothly":
    "blog/what-makes-a-website-project-run-smoothly/index.html",
  "/blog/how-visual-direction-shapes-a-stronger-website":
    "blog/how-visual-direction-shapes-a-stronger-website/index.html",
  "/blog/building-better-websites-in-framer":
    "blog/building-better-websites-in-framer/index.html",
  "/blog/creating-a-digital-presence-that-feels-clear":
    "blog/creating-a-digital-presence-that-feels-clear/index.html",
  "/blog/small-details-that-make-websites-feel-premium":
    "blog/small-details-that-make-websites-feel-premium/index.html",
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const file = fs.createWriteStream(dest);
    mod
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try {
            fs.unlinkSync(dest);
          } catch {}
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`${url} -> ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(fs.statSync(dest).size)));
      })
      .on("error", reject);
  });
}

(async () => {
  fs.mkdirSync("ref-html", { recursive: true });
  fs.mkdirSync("verify-shots", { recursive: true });

  console.log("=== Re-fetch reference HTML ===");
  for (const route of ROUTES) {
    const slug = route.replace(/^\//, "").replace(/\//g, "__") || "home";
    const url = "https://hanza-template.framer.website" + route;
    const size = await download(url, path.join("ref-html", `${slug}.html`));
    console.log("OK", route, `${(size / 1024).toFixed(0)} KB`);
  }

  console.log("\n=== Re-convert ===");
  require("./convert-framer-pages.js");

  console.log("\n=== Verify local pages ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const results = [];
  for (const route of ROUTES) {
    const local = LOCAL_MAP[route];
    const fileUrl = "file:///" + path.resolve(local).replace(/\\/g, "/");
    const slug = route.replace(/^\//, "").replace(/\//g, "__") || "home";

    try {
      await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join("verify-shots", `${slug}.png`) });

      const info = await page.evaluate(() => ({
        title: document.title,
        text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 200),
        hasMain: !!document.getElementById("main"),
        imgCount: document.querySelectorAll("img").length,
        visibleTextLen: document.body.innerText.replace(/\s/g, "").length,
      }));

      const ok = info.hasMain && info.visibleTextLen > 500;
      results.push({ route, local, ok, ...info });
      console.log(ok ? "PASS" : "FAIL", route, `| text:${info.visibleTextLen} | imgs:${info.imgCount}`);
    } catch (e) {
      results.push({ route, local, ok: false, error: e.message });
      console.log("FAIL", route, e.message);
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${ROUTES.length} pages OK ===`);
  fs.writeFileSync("verify-results.json", JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
