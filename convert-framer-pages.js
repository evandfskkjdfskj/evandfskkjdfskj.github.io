const fs = require("fs");
const path = require("path");

/**
 * DEPRECATED for local editing — produces Framer CDN-dependent pages.
 * Use `_build-pages.js` instead for fully offline static HTML.
 */
const SITE = "https://hanza-template.framer.website";

const ROUTE_MAP = {
  "/": "index.html",
  "/portfolio": "portfolio/index.html",
  "/about": "about/index.html",
  "/contact": "contact/index.html",
  "/blog": "blog/index.html",
  "/portfolio/goodwell": "portfolio/goodwell/index.html",
  "/portfolio/galileo": "portfolio/galileo/index.html",
  "/portfolio/ikigai": "portfolio/ikigai/index.html",
  "/portfolio/flora": "portfolio/flora/index.html",
  "/blog/what-makes-a-website-project-run-smoothly":
    "blog/what-makes-a-website-project-run-smoothly/index.html",
  "/blog/how-visual-direction-shapes-a-stronger-website":
    "blog/how-visual-direction-shapes-a-stronger-website/index.html",
  "/blog/building-better-websites-in-framer":
    "blog/building-better-websites-in-framer/index.html",
  "/blog/creating-a-digital-presence-that-feels-clear":
    "blog/creating-a-digital-presence-that-feels-clear/index.html",
  "/blog/small-details-that-make-websites-feel-premium":
    "blog/small-details-that-make-websites-feel-premium/index.html",
};

const REF_FILES = {
  portfolio: "portfolio.html",
  about: "about.html",
  contact: "contact.html",
  blog: "blog.html",
  "portfolio/goodwell": "portfolio__goodwell.html",
  "portfolio/galileo": "portfolio__galileo.html",
  "portfolio/ikigai": "portfolio__ikigai.html",
  "portfolio/flora": "portfolio__flora.html",
  "blog/what-makes-a-website-project-run-smoothly":
    "blog__what-makes-a-website-project-run-smoothly.html",
  "blog/how-visual-direction-shapes-a-stronger-website":
    "blog__how-visual-direction-shapes-a-stronger-website.html",
  "blog/building-better-websites-in-framer":
    "blog__building-better-websites-in-framer.html",
  "blog/creating-a-digital-presence-that-feels-clear":
    "blog__creating-a-digital-presence-that-feels-clear.html",
  "blog/small-details-that-make-websites-feel-premium":
    "blog__small-details-that-make-websites-feel-premium.html",
};

function routeToLocal(route, fromFile) {
  const target = ROUTE_MAP[route];
  if (!target) return null;
  const fromDir = path.dirname(fromFile).split(path.sep);
  const rel = path.relative(fromDir.join(path.sep) || ".", target).split(path.sep).join("/");
  return rel || "index.html";
}

function rewriteLinks(html, fromFile) {
  let out = html;

  const routes = Object.keys(ROUTE_MAP).sort((a, b) => b.length - a.length);

  for (const route of routes) {
    const local = routeToLocal(route, fromFile);
    if (!local) continue;

    const fullUrl = `${SITE}${route === "/" ? "" : route}`;
    out = out.split(fullUrl).join(local);

    if (route !== "/") {
      out = out.replace(new RegExp(`href="${route.replace(/\//g, "\\/")}"`, "g"), `href="${local}"`);
      out = out.replace(new RegExp(`href='${route.replace(/\//g, "\\/")}'`, "g"), `href='${local}'`);
    } else {
      out = out.replace(/href="\/"/g, `href="${local}"`);
      out = out.replace(/href='\/'/g, `href='${local}'`);
    }
  }

  const relativeRoutes = [
    ["portfolio/goodwell", "/portfolio/goodwell"],
    ["portfolio/galileo", "/portfolio/galileo"],
    ["portfolio/ikigai", "/portfolio/ikigai"],
    ["portfolio/flora", "/portfolio/flora"],
    ["portfolio", "/portfolio"],
    ["about", "/about"],
    ["contact", "/contact"],
    ["blog/what-makes-a-website-project-run-smoothly", "/blog/what-makes-a-website-project-run-smoothly"],
    ["blog/how-visual-direction-shapes-a-stronger-website", "/blog/how-visual-direction-shapes-a-stronger-website"],
    ["blog/building-better-websites-in-framer", "/blog/building-better-websites-in-framer"],
    ["blog/creating-a-digital-presence-that-feels-clear", "/blog/creating-a-digital-presence-that-feels-clear"],
    ["blog/small-details-that-make-websites-feel-premium", "/blog/small-details-that-make-websites-feel-premium"],
    ["blog", "/blog"],
  ].sort((a, b) => b[0].length - a[0].length);

  for (const [rel, fullRoute] of relativeRoutes) {
    const local = routeToLocal(fullRoute, fromFile);
    if (!local) continue;
    out = out.replace(new RegExp(`href="${rel.replace(/\//g, "\\/")}"`, "g"), `href="${local}"`);
    out = out.replace(new RegExp(`href='${rel.replace(/\//g, "\\/")}'`, "g"), `href='${local}'`);
  }

  return out;
}

function rebrandToWinnie(html) {
  const replacements = [
    ["HANZA NOVÁK", "WINNIE"],
    ["Hanza Novák", "Winnie"],
    ["HANZA®", "WINNIE®"],
    ["Hanza®", "Winnie®"],
    ["Honza®", "Winnie®"],
    ["HANZA", "WINNIE"],
    ["Honza", "Winnie"],
    ["Hanza", "Winnie"],
    ["/HANZA", "/WINNIE"],
    ["/Hanza", "/Winnie"],
    ["/hanza", "/winnie"],
    ["ahoj@hanza.cz", "hello@winnie.studio"],
  ];
  let out = html;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  return out;
}

function injectSatoshi(html) {
  const fontOverride = `
<style id="local-satoshi-override">
@font-face {
  font-family: 'Satoshi';
  src: local('Satoshi'), local('Satoshi-Regular');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Satoshi';
  src: local('Satoshi Medium'), local('Satoshi-Medium');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Satoshi';
  src: local('Satoshi Bold'), local('Satoshi-Bold');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Satoshi';
  src: local('Satoshi Black'), local('Satoshi-Black');
  font-weight: 900;
  font-style: normal;
}
html, body, * {
  font-family: 'Satoshi', sans-serif !important;
}
</style>`;

  let out = html
    .replace(/font-family:\s*'Geist[^']*'/g, "font-family: 'Satoshi'")
    .replace(/font-family:\s*'Zalando Sans[^']*'/g, "font-family: 'Satoshi'")
    .replace(/font-family:\s*Geist[^;]*/g, "font-family: 'Satoshi'")
    .replace(/font-family:\s*Zalando Sans[^;]*/g, "font-family: 'Satoshi'");

  if (!out.includes("local-satoshi-override")) {
    out = out.replace("</head>", `${fontOverride}\n</head>`);
  }

  return out;
}

function injectFileNavigation(html) {
  const script = `
<script id="local-file-navigation">
(function () {
  var routeMap = ${JSON.stringify(ROUTE_MAP)};
  var site = ${JSON.stringify(SITE)};

  function resolveLocal(href) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
    if (href.startsWith("http") && !href.startsWith(site)) return null;
    var route = href.replace(site, "");
    if (!route.startsWith("/")) route = "/" + route.replace(/^\\.\\//, "");
    route = route.replace(/\\/index\\.html$/, "").replace(/\\.html$/, "");
    if (route.endsWith("/") && route.length > 1) route = route.slice(0, -1);
    if (route === "") route = "/";
    if (routeMap[route]) return routeMap[route];
    return null;
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var local = resolveLocal(a.getAttribute("href"));
    if (!local) return;
    e.preventDefault();
    e.stopPropagation();
    window.location.href = local;
  }, true);
})();
</script>`;

  if (html.includes("local-file-navigation")) return html;
  return html.replace("</body>", `${script}\n</body>`);
}

function convert(route, refName, outRel) {
  const src = path.join("ref-html", refName);
  const dest = path.join(outRel);
  if (!fs.existsSync(src)) {
    console.warn("skip missing", src);
    return;
  }

  let html = fs.readFileSync(src, "utf8");
  html = rewriteLinks(html, outRel);
  html = rebrandToWinnie(html);
  html = injectSatoshi(html);
  html = injectFileNavigation(html);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log("wrote", dest, `(${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
}

for (const [route, refName] of Object.entries(REF_FILES)) {
  const outRel = ROUTE_MAP[`/${route}`];
  convert(route, refName, outRel);
}

console.log("done");
