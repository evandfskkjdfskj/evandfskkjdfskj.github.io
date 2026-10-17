const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(1500);
  // scroll to first case
  await p.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el) window.scrollTo(0, el.getBoundingClientRect().top+scrollY-200);
  });
  await p.waitForTimeout(400);
  const samples=[];
  for (const dy of [0, 80, 160, 240, 320]) {
    await p.evaluate((d)=>window.scrollBy(0,d), dy===0?0:80);
    await p.waitForTimeout(120);
    const m=await p.evaluate(()=>{
      // find parallax bg divs with transform and large bg image
      const nodes=[...document.querySelectorAll("div")].filter(el=>{
        const r=el.getBoundingClientRect();
        const cs=getComputedStyle(el);
        const bg=cs.backgroundImage||"";
        return r.width>1000 && r.height>800 && bg.includes("framerusercontent") && cs.position==="absolute";
      });
      return nodes.slice(0,3).map(el=>{
        const r=el.getBoundingClientRect();
        const cs=getComputedStyle(el);
        return {
          y:Math.round(r.top), h:Math.round(r.height),
          transform:cs.transform,
          bgSize:cs.backgroundSize,
          bgPos:cs.backgroundPosition,
          top:cs.top, height:cs.height
        };
      });
    });
    samples.push({scrollY: await p.evaluate(()=>Math.round(scrollY)), m});
  }
  console.log(JSON.stringify(samples,null,2));
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
