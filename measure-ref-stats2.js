const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.evaluate(async()=>{for(let y=0;y<2200;y+=300){scrollTo(0,y);await new Promise(r=>setTimeout(r,150));}});
  await p.waitForTimeout(1000);
  await p.evaluate(()=>scrollTo(0,1650));
  await p.waitForTimeout(500);
  const data=await p.evaluate(()=>{
    const findLabel=(txt)=>{
      const el=[...document.querySelectorAll("div,p,span")].find(e=>(e.innerText||"").replace(/\s+/g," ").trim().toUpperCase()===txt);
      if(!el) return null;
      let cur=el, card=null;
      for(let i=0;i<12;i++){
        if(!cur) break;
        const r=cur.getBoundingClientRect();
        if(r.height>120 && r.height<380 && r.width>240 && r.width<380) card=cur;
        cur=cur.parentElement;
      }
      const node=card||el;
      const r=node.getBoundingClientRect();
      const accent=[...node.querySelectorAll("*")].find(c=>{
        const cr=c.getBoundingClientRect(); const bg=getComputedStyle(c).backgroundColor;
        return cr.height>0 && cr.height<=6 && cr.width>50 && (bg.includes("255, 96")||bg.includes("244, 95")||bg.includes("255, 104"));
      });
      const num=[...node.querySelectorAll("p,div,span")].find(e=>/^\d+\+$/.test((e.innerText||"").trim()));
      return {label:txt,x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY),w:Math.round(r.width),h:Math.round(r.height),num:num?.innerText.trim(),numY:num?Math.round(num.getBoundingClientRect().top+scrollY):null,accent:accent?{h:Math.round(accent.getBoundingClientRect().height),y:Math.round(accent.getBoundingClientRect().top+scrollY)}:null};
    };
    return {
      c01:findLabel("01 PROJECTS"),
      c02:findLabel("02 WEBSITES"),
      c03:findLabel("03 YEARS"),
      c04:findLabel("04 CLIENTS"),
    };
  });
  console.log(JSON.stringify(data,null,2));
  if(data.c01&&data.c03) console.log("stagger labels", data.c03.y-data.c01.y);
  if(data.c01&&data.c02) console.log("left vertical gap", data.c02.y-(data.c01.y+data.c01.h));
  await p.screenshot({path:"verify-shots/ref-stats-stagger2.png"});
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
