const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(1500);
  // Find Goodwell view project and center the case section
  await p.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>/^VIEW PROJECT$/i.test((e.innerText||"").trim()));
    if(el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 300);
  });
  await p.waitForTimeout(400);
  // precise: find all text near bottom half
  const data=await p.evaluate(()=>{
    const abs=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return{t:(el.innerText||el.alt||"").replace(/\s+/g," ").slice(0,60),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),fs:cs.fontSize,fw:cs.fontWeight,color:cs.color};};
    // thumb image
    const imgs=[...document.querySelectorAll("img")].filter(i=>{const r=i.getBoundingClientRect();return r.left>=40&&r.left<100&&r.width>280&&r.width<450&&r.height>350&&r.top>50&&r.bottom<900;});
    // view project bar
    const view=[...document.querySelectorAll("div,a,p,span")].find(e=>{
      const t=(e.innerText||"").replace(/\s+/g," ").trim();
      return /^VIEW PROJECT/i.test(t) && t.length<40 && e.getBoundingClientRect().height<60 && e.getBoundingClientRect().width>200;
    });
    // climb for side card (thumb+button)
    let side=view;
    for(let i=0;i<8&&side;i++){
      const r=side.getBoundingClientRect();
      if(r.height>400&&r.height<650&&r.width>280&&r.width<420) break;
      side=side.parentElement;
    }
    // texts in viewport bottom
    const texts=[...document.querySelectorAll("div,p,span,strong,a")].filter(e=>{
      const r=e.getBoundingClientRect();
      const t=(e.innerText||"").trim();
      return r.top>400 && r.top<860 && r.left>300 && r.width>20 && t.length>0 && t.length<80 && e.children.length<=3;
    }).slice(0,30).map(abs);

    // meta top
    const metas=[...document.querySelectorAll("div,span,p")].filter(e=>{
      const r=e.getBoundingClientRect();
      const t=(e.innerText||"").replace(/\s+/g," ").trim();
      return r.top>=0&&r.top<80 && r.height<40 && (/^01$|^CLIENT|^YEAR|GOODWELL|2026|2024/i.test(t));
    }).slice(0,15).map(abs);

    // grid lines - look for vertical lines
    const lines=[...document.querySelectorAll("div")].filter(e=>{
      const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      return r.width<=2 && r.height>400 && r.top<200 && (cs.backgroundColor.includes("255")||cs.borderLeftWidth!=="0px");
    }).slice(0,8).map(e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.left),h:Math.round(r.height),bg:getComputedStyle(e).backgroundColor};});

    return {
      thumbImgs:imgs.map(i=>{const r=i.getBoundingClientRect();return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}),
      side:abs(side),
      view:abs(view),
      metas,
      texts,
      lines,
    };
  });
  console.log(JSON.stringify(data,null,2));
  await p.screenshot({path:"verify-shots/ref-case-detail.png"});
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
