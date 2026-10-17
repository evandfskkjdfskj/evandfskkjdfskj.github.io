const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const root = process.cwd();
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(root, urlPath.replace(/\//g, path.sep)));
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("missing");
  }
  const ext = path.extname(file);
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".webp": "image/webp",
    ".png": "image/png",
    ".mp4": "video/mp4",
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(3461, async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:3461/", { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      for (const v of document.querySelectorAll("video")) {
        v.muted = true;
        try {
          await v.play();
        } catch {}
      }
    });
    await page.waitForTimeout(2000);
    const vids = await page.evaluate(() =>
      [...document.querySelectorAll("video")].map((v) => ({
        src: (v.currentSrc || "").split("/").pop(),
        ready: v.readyState,
        paused: v.paused,
        vw: v.videoWidth,
        vh: v.videoHeight,
        w: v.clientWidth,
        h: v.clientHeight,
      }))
    );
    console.log("videos", vids);
    await page.screenshot({ path: "verify-shots/local-01-hero.png" });
    await page.evaluate(() => {
      const el = document.getElementById("case-study");
      window.scrollTo(0, el ? el.offsetTop : 0);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "verify-shots/local-case-highlight.png" });
    await page.evaluate(() => {
      const el = document.getElementById("portfolio");
      window.scrollTo(0, el ? el.offsetTop + 220 : 0);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "verify-shots/local-03-portfolio.png" });
    await browser.close();
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});
