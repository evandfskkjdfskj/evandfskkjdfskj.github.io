const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>window.scrollTo(0,1700));
  await p.waitForTimeout(1000);
  const data=await p.evaluate(()=>{
    const findCard=(n,word)=>{
      const el=[...document.querySelectorAll("div,p,span")].find(e=>{
        const t=(e.innerText||"").replace(/\n+/g," ").trim().toUpperCase();
        return t===`${n} ${word}` || t.startsWith(`${n} ${word}`);
      });
      if(!el) return null;
      let cur=el, best=null;
      for(let i=0;i<10;i++){
        if(!cur) break;
        const r=cur.getBoundingClientRect();
        if(r.height>140 && r.height<420 && r.width>220 && r.width<400) best=cur;
        cur=cur.parentElement;
      }
      if(!best) return null;
      const r=best.getBoundingClientRect();
      const cs=getComputedStyle(best);
      // check orange top bar - look for child with accent bg at top
      const topChild=[...best.querySelectorAll("*")].find(c=>{
        const cr=c.getBoundingClientRect(); const ccs=getComputedStyle(c);
        return cr.height<=6 && cr.width>100 && (ccs.backgroundColor.includes("255, 96, 68")||ccs.backgroundColor.includes("244, 95")||ccs.backgroundColor.includes("255, 96"));
      });
      const tr=topChild?topChild.getBoundingClientRect():null;
      return {label:`${n} ${word}`,x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY),w:Math.round(r.width),h:Math.round(r.height),bg:cs.backgroundColor,borderTop:cs.borderTopWidth,topBar:tr?{h:Math.round(tr.height),y:Math.round(tr.top+scrollY),bg:getComputedStyle(topChild).backgroundColor}:null};
    };
    return {
      c01:findCard("01","PROJECTS"),
      c02:findCard("02","WEBSITES"),
      c03:findCard("03","YEARS"),
      c04:findCard("04","CLIENTS"),
    };
  });
  console.log(JSON.stringify(data,null,2));
  if(data.c01&&data.c03) console.log("stagger", data.c03.y - data.c01.y);
  if(data.c01&&data.c02) console.log("leftGap", data.c02.y - (data.c01.y+data.c01.h));
  await p.screenshot({path:"verify-shots/ref-stats-stagger.png"});
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
