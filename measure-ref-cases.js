const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/GOODWELL/i.test(e.innerText||"") && (e.innerText||"").length<40);
    if(el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 80);
  });
  await p.waitForTimeout(800);
  const data=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].filter(i=>{
      const r=i.getBoundingClientRect();
      return r.width>200 && r.height>200 && r.top<900 && r.bottom>0;
    }).map(i=>{
      const r=i.getBoundingClientRect();
      const cs=getComputedStyle(i);
      const p=i.parentElement;
      const pr=p.getBoundingClientRect();
      return {
        alt:i.alt, src:i.src.slice(-50),
        x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
        pos:cs.position, obj:cs.objectFit, transform:cs.transform,
        parent:{tag:p.tagName, w:Math.round(pr.width), h:Math.round(pr.height), overflow:getComputedStyle(p).overflow}
      };
    });
    const view=[...document.querySelectorAll("a,div,p,span")].find(e=>/VIEW PROJECT/i.test((e.innerText||"").trim()) && (e.innerText||"").length<40);
    const vr=view?view.getBoundingClientRect():null;
    return {imgs, view:vr?{x:Math.round(vr.left),y:Math.round(vr.top),w:Math.round(vr.width),h:Math.round(vr.height),t:view.innerText.slice(0,40)}:null};
  });
  console.log(JSON.stringify(data,null,2));
  await p.screenshot({path:"verify-shots/ref-case-full.png"});
  // scroll a bit and screenshot again
  await p.evaluate(()=>window.scrollBy(0,180));
  await p.waitForTimeout(300);
  await p.screenshot({path:"verify-shots/ref-case-full-scrolled.png"});
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
