const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(1500);
  // scroll through portfolio
  await p.evaluate(async()=>{for(let y=2500;y<4200;y+=200){scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}});
  await p.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200);
  });
  await p.waitForTimeout(600);
  const data=await p.evaluate(()=>{
    // find large containers with bg images or videos
    const all=[...document.querySelectorAll("div,section,figure,img,video")];
    const big=all.filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>600 && r.height>300 && r.top<900 && r.bottom>100;
    }).slice(0,25).map(el=>{
      const r=el.getBoundingClientRect();
      const cs=getComputedStyle(el);
      const bg=cs.backgroundImage;
      return {
        tag:el.tagName,
        cls:(el.className||"").toString().slice(0,50),
        x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
        bg:bg && bg!=="none"?bg.slice(0,120):null,
        transform:cs.transform,
        overflow:cs.overflow,
        pos:cs.position,
        src:el.src?String(el.src).slice(-60):null,
        filter:cs.filter,
      };
    });
    return big;
  });
  console.log(JSON.stringify(data,null,2));
  await p.screenshot({path:"verify-shots/ref-case-full.png"});
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
