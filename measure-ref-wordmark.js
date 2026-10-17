const { chromium } = require("playwright");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto("https://hanza-template.framer.website/",{waitUntil:"networkidle",timeout:120000});
  await p.waitForTimeout(2000);
  const ref=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].filter(i=>i.alt==="Logo"||/logo/i.test(i.alt||""));
    const logo=imgs.find(i=>i.getBoundingClientRect().width>400) || imgs.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
    const all=[...document.querySelectorAll("img,h1,h2,div,p,span")].filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>500 && r.height>80 && r.bottom>700 && r.top<850;
    }).slice(0,5).map(el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,alt:el.alt||"",x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};});
    const logoR=logo?logo.getBoundingClientRect():null;
    return {logo:logoR?{x:Math.round(logoR.left),y:Math.round(logoR.top),w:Math.round(logoR.width),h:Math.round(logoR.height),src:logo.src.slice(-40)}:null, candidates:all};
  });
  console.log(JSON.stringify(ref,null,2));
  await p.close(); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
