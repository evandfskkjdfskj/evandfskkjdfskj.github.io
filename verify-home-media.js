const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
};

const root = process.cwd();
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end("missing");
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(3460, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:3460/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const vids = [...document.querySelectorAll("video")];
    for (const v of vids) {
      v.muted = true;
      try {
        await v.play();
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1500));
  });

  const vids = await page.evaluate(() =>
    [...document.querySelectorAll("video")].map((v) => ({
      src: (v.currentSrc || "").split("/").pop(),
      w: Math.round(v.getBoundingClientRect().width),
      h: Math.round(v.getBoundingClientRect().height),
      ready: v.readyState,
      paused: v.paused,
    }))
  );
  console.log("videos", vids);

  await page.screenshot({ path: "verify-shots/local-01-hero.png" });

  await page.locator("#portfolio").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.getElementById("portfolio");
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 180);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "verify-shots/local-03-portfolio.png" });

  await page.locator("#case-study").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "verify-shots/local-case-highlight.png" });

  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "verify-shots/local-02-about.png" });

  const broken = await page.evaluate(() =>
    [...document.images]
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.getAttribute("src"))
  );
  console.log("broken", broken);

  const sizes = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".case-feature > img, .case-thumb img, .blog-media img, .hero-video, .case-visual, .plan-person img, .profile-photo img"
      ),
    ].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        src: (el.currentSrc || el.src || el.getAttribute("src") || "").split("/").pop(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        nw: el.naturalWidth || 0,
        nh: el.naturalHeight || 0,
      };
    })
  );
  console.log(JSON.stringify(sizes, null, 2));

  await browser.close();
  server.close();
});
