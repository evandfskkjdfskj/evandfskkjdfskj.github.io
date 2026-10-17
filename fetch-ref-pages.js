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
  fs.mkdirSync("ref-shots", { recursive: true });

  for (const route of ROUTES) {
    const slug = route.replace(/^\//, "").replace(/\//g, "__") || "home";
    const url = "https://hanza-template.framer.website" + route;
    console.log("html", route);
    await download(url, path.join("ref-html", `${slug}.html`));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const route of ROUTES) {
    const slug = route.replace(/^\//, "").replace(/\//g, "__") || "home";
    await page.goto("https://hanza-template.framer.website" + route, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join("ref-shots", `${slug}-hero.png`) });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join("ref-shots", `${slug}-mid.png`) });
    console.log("shot", route);
  }

  await browser.close();
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
