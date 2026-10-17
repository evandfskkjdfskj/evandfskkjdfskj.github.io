const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(2000);
  // scroll to stats
  await p.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find(e => (e.innerText||"").includes("122+") && e.children.length < 5);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200);
  });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "verify-shots/align-ref-stats.png" });

  // precise structure around portfolio intro
  const info = await p.evaluate(() => {
    const find = (re) => [...document.querySelectorAll("*")].filter(e => re.test((e.innerText||"").trim()) && (e.innerText||"").length < 40);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { t:(el.innerText||"").slice(0,40), x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), tag:el.tagName, cls:(el.className||"").toString().slice(0,40) };
    };
    // get text nodes near case studies
    const caseEl = [...document.querySelectorAll("h1,h2,h3,div,p,span")].find(e => /^CASE$/i.test((e.innerText||"").trim()));
    const studies = [...document.querySelectorAll("h1,h2,h3,div,p,span")].find(e => /^STUDIES\.?$/i.test((e.innerText||"").trim()));
    const kick = [...document.querySelectorAll("div,p,span")].find(e => /02\s*PORTFOLIO/i.test((e.innerText||"").trim()) && (e.innerText||"").trim().length < 20);
    const lead = [...document.querySelectorAll("div,p,span")].find(e => /Each project shows/i.test(e.innerText||"") && e.innerText.length < 100);
    const allp = [...document.querySelectorAll("a,div,p,span")].find(e => /All Projects/i.test((e.innerText||"").trim()) && (e.innerText||"").trim().length < 20);

    // relative gaps
    const cb = box(caseEl), sb = box(studies), kb = box(kick), lb = box(lead), ab = box(allp);
    return {
      kick: kb,
      case: cb,
      studies: sb,
      lead: lb,
      allProjects: ab,
      gapKickCase: kb && cb ? cb.y - (kb.y + kb.h) : null,
      gapCaseStudies: cb && sb ? sb.y - (cb.y + cb.h) : null,
      gapStudiesLead: sb && lb ? lb.y - (sb.y + sb.h) : null,
      // stats visible
      stats: find(/^(01|02|03|04)\s/i).slice(0,8).map(box),
      nums: [...document.querySelectorAll("*")].filter(e => /^\d+\+$/.test((e.innerText||"").trim()) && e.getBoundingClientRect().height>40).slice(0,8).map(box),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // screenshot case studies area
  await p.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find(e => /^CASE$/i.test((e.innerText||"").trim()));
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: "verify-shots/align-ref-case.png" });
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
