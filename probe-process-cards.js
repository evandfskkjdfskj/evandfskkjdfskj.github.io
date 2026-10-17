const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(2500);

  const data = await p.evaluate(() => {
    const root = [...document.querySelectorAll("section")].find((s) => (s.id || "").includes("process"));
    const rb = root.getBoundingClientRect();
    // Find containers that look like step cards (~335 wide, tall)
    const cards = [...root.querySelectorAll("div")].filter((el) => {
      const t = (el.innerText || "").replace(/\s+/g, " ");
      const b = el.getBoundingClientRect();
      const isStep =
        /^(01|02|03|04|05)\s+(PLAN|STRUCTURE|DESIGN|BUILD|LAUNCH)/i.test(t.trim()) ||
        (/Ready To Start/i.test(t) && b.width > 250 && b.height > 200);
      return isStep && Math.abs(b.width - 335) < 40 && b.height > 200;
    });
    // Prefer leaf-ish unique cards
    const seen = new Set();
    const out = [];
    for (const el of cards) {
      const b = el.getBoundingClientRect();
      const key = `${Math.round(b.left)}:${Math.round(b.top)}:${Math.round(b.height)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const cs = getComputedStyle(el);
      out.push({
        t,
        x: Math.round(b.left),
        y: Math.round(b.top - rb.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
        pad: cs.padding,
        borderTop: cs.borderTop,
        bg: cs.backgroundColor,
      });
    }
    out.sort((a, b) => a.y - b.y || a.x - b.x);

    // also look for Ready CTA anywhere on page near process
    const ready = [...document.querySelectorAll("div,aside,a")].find((el) =>
      /^Ready To Start/i.test((el.innerText || "").trim().slice(0, 20))
    );
    let readyBox = null;
    if (ready) {
      const b = ready.getBoundingClientRect();
      readyBox = {
        t: (ready.innerText || "").replace(/\s+/g, " ").slice(0, 60),
        x: Math.round(b.left),
        y: Math.round(b.top - rb.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
        bg: getComputedStyle(ready).backgroundColor,
      };
    }

    return {
      section: {
        h: Math.round(rb.height),
        pad: getComputedStyle(root).padding,
        y: Math.round(rb.top + window.scrollY),
      },
      cards: out,
      readyBox,
      colW: Math.round((1440 - 48 * 2) / 4),
    };
  });

  console.log(JSON.stringify(data, null, 2));

  // Screenshot full process
  await p.evaluate((yy) => window.scrollTo(0, yy), data.section.y);
  await p.setViewportSize({ width: 1440, height: Math.min(1800, data.section.h + 40) });
  await p.waitForTimeout(500);
  await p.screenshot({
    path: "verify-shots/ref-process-full.png",
    clip: { x: 0, y: 0, width: 1440, height: Math.min(1600, data.section.h) },
  });

  // about / testimonials section metrics
  for (const key of ["about", "testimonial"]) {
    const info = await p.evaluate((k) => {
      const s = [...document.querySelectorAll("section")].find((el) =>
        (el.id || "").toLowerCase().includes(k)
      );
      if (!s) return null;
      const b = s.getBoundingClientRect();
      const imgs = [...s.querySelectorAll("img")].map((img) => {
        const ib = img.getBoundingClientRect();
        return { src: (img.src || "").slice(-40), w: Math.round(ib.width), h: Math.round(ib.height), x: Math.round(ib.left), y: Math.round(ib.top - b.top) };
      });
      return {
        id: s.id,
        h: Math.round(b.height),
        pad: getComputedStyle(s).padding,
        imgs: imgs.slice(0, 10),
      };
    }, key);
    console.log(key, JSON.stringify(info, null, 2));
  }

  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
