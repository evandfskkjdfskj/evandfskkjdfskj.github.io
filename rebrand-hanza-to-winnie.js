const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const SKIP_DIRS = new Set(["node_modules", "ref-html", "ref-shots", "verify-shots", ".git"]);
const EXT = new Set([".html", ".js", ".css", ".md", ".json"]);

const REPLACEMENTS = [
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
  ["avatar-hanza.webp", "avatar-winnie.webp"],
  ["hanza-portrait.webp", "winnie-portrait.webp"],
  ["logo-hanza-word.webp", "logo-winnie-word.png"],
];

function rebrandText(text) {
  // Keep reference fetch URLs intact (hanza-template.framer.website)
  const placeholder = "__FRAMER_TEMPLATE_HOST__";
  let out = text.split("hanza-template.framer.website").join(placeholder);
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out.split(placeholder).join("hanza-template.framer.website");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function copyIfExists(from, to) {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log("asset", path.basename(to));
  }
}

// Copy / rename brand assets
copyIfExists(path.join(ROOT, "assets", "avatar-hanza.webp"), path.join(ROOT, "assets", "avatar-winnie.webp"));
copyIfExists(path.join(ROOT, "assets", "hanza-portrait.webp"), path.join(ROOT, "assets", "winnie-portrait.webp"));

const userLogo = path.join(
  ROOT,
  "assets",
  "c__Users_w8520_AppData_Roaming_Cursor_User_workspaceStorage_fafbbef7235362e0c0773c0d9c761ed9_images______20260902_004454-4340528b-3017-4fb9-be00-e65cf9bb2cb2.png"
);
copyIfExists(userLogo, path.join(ROOT, "assets", "logo-winnie-word.png"));

let changed = 0;
for (const file of walk(ROOT)) {
  if (file.includes("rebrand-hanza-to-winnie.js")) continue;
  if (file.endsWith("convert-framer-pages.js")) continue;
  if (file.endsWith("verify-results.json")) continue;

  const original = fs.readFileSync(file, "utf8");
  const updated = rebrandText(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
    console.log("updated", path.relative(ROOT, file));
  }
}

console.log(`\nDone. ${changed} files updated.`);
