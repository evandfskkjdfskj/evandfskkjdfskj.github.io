const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("https://hanza-template.framer.website/", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(1500);
  // force scroll through about to animate counters then measure absolute
  await p.evaluate(async () => {
    for (let y=800; y<2800; y+=200){ scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); }
  });
  await p.waitForTimeout(800);
  const data = await p.evaluate(() => {
    const abs = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { t:(el.innerText||"").replace(/\s+/g," ").slice(0,50), x:Math.round(r.left+scrollX), y:Math.round(r.top+scrollY), w:Math.round(r.width), h:Math.round(r.height), fs:cs.fontSize, fw:cs.fontWeight, lh:cs.lineHeight, ls:cs.letterSpacing, color:cs.color };
    };
    const near = (re, max=50) => [...document.querySelectorAll("div,p,span,a,h2,h3")].find(e => re.test((e.innerText||"").trim()) && (e.innerText||"").trim().length <= max);
    const kick = near(/^02\s*PORTFOLIO$/i, 20) || [...document.querySelectorAll("div")].find(e => (e.innerText||"").trim() === "02\n\nPORTFOLIO" || /^02\s*PORTFOLIO$/i.test((e.innerText||"").replace(/\n+/g," ").trim()) && (e.innerText||"").replace(/\s+/g," ").trim().length<16);
    const caseW = [...document.querySelectorAll("span")].find(e => (e.innerText||"").trim()==="CASE");
    const stud = [...document.querySelectorAll("span")].find(e => (e.innerText||"").trim()==="STUDIES.");
    // lead - smallest element containing the sentence
    const leads = [...document.querySelectorAll("div,p,span")].filter(e => /EACH PROJECT SHOWS HOW I APPROACH/i.test(e.innerText||""));
    leads.sort((a,b)=>a.innerText.length-b.innerText.length);
    const lead = leads[0];
    const allp = [...document.querySelectorAll("div,a,span")].filter(e => /^<?\s*ALL PROJECTS$/i.test((e.innerText||"").trim()));
    // labels
    const labs = ["01 PROJECTS","02 WEBSITES","03 YEARS","04 CLIENTS"].map(lab => {
      const el = [...document.querySelectorAll("div,span,p")].find(e => (e.innerText||"").replace(/\n+/g," ").replace(/\s+/g," ").trim().toUpperCase() === lab);
      return abs(el);
    });
    // visible final numbers - look for text matching
    const numEls = ["122+","84+","12+","48+"].map(n => {
      const el = [...document.querySelectorAll("p,span,div")].find(e => (e.innerText||"").trim()===n && e.getBoundingClientRect().height>40);
      return abs(el);
    });
    const k=abs(kick), c=abs(caseW), s=abs(stud), l=abs(lead);
    return {
      kick:k, case:c, studies:s, lead:l,
      allProjects: allp.map(abs),
      labs, nums: numEls,
      gaps: {
        kickToCase: k&&c ? c.y - (k.y+k.h) : null,
        caseToStudiesLine: c&&s ? s.y - c.y : null, // line box start delta
        studiesToLead: s&&l ? l.y - (s.y + Math.min(s.h,72)) : null,
      }
    };
  });
  console.log(JSON.stringify(data,null,2));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
