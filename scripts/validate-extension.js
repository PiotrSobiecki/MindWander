const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "../dist");
const manifestPath = path.join(distDir, "manifest.json");
const errors = [];
const warnings = [];

function fileExists(relativePath) {
  return fs.existsSync(path.join(distDir, relativePath));
}

function readJsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) readJsFiles(fullPath, files);
    else if (entry.name.endsWith(".js")) files.push(fullPath);
  }
  return files;
}

// 1. Manifest exists and parses
if (!fs.existsSync(manifestPath)) {
  console.error("FAIL: brak dist/manifest.json");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// 2. Required manifest files
const required = [
  manifest.background?.service_worker,
  ...(manifest.content_scripts?.flatMap((cs) => cs.js) || []),
  manifest.action?.default_popup,
  manifest.action?.default_icon?.["16"],
  manifest.action?.default_icon?.["48"],
  manifest.action?.default_icon?.["128"],
  manifest.icons?.["16"],
  manifest.icons?.["48"],
  manifest.icons?.["128"],
].filter(Boolean);

for (const file of required) {
  if (!fileExists(file)) errors.push(`Brak pliku wymaganego przez manifest: ${file}`);
}

// 3. popup.html references popup.js
const popupHtml = fs.readFileSync(path.join(distDir, "popup.html"), "utf8");
if (!popupHtml.includes('src="popup.js"')) {
  errors.push("popup.html nie odwołuje się do popup.js");
}

// 4. ES module imports resolve (background + services)
const jsFiles = readJsFiles(distDir).filter(
  (f) => !f.endsWith("config.ts_example.js")
);
const importRegex = /from\s+["'](\.\.?\/[^"']+)["']/g;
for (const jsFile of jsFiles) {
  const content = fs.readFileSync(jsFile, "utf8");
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const base = path.dirname(jsFile);
    const candidates = [
      path.join(base, importPath),
      path.join(base, importPath + ".js"),
    ];
    if (!candidates.some((c) => fs.existsSync(c))) {
      errors.push(
        `Nierozwiązywalny import "${importPath}" w ${path.relative(distDir, jsFile)}`
      );
    }
  }
}

// 5. host_permissions vs fetch URLs in compiled JS
const fetchUrlRegex = /fetch\s*\(\s*[`'"](https:\/\/[^`'"]+)/g;
const usedHosts = new Set();
for (const jsFile of jsFiles) {
  const content = fs.readFileSync(jsFile, "utf8");
  let match;
  while ((match = fetchUrlRegex.exec(content)) !== null) {
    try {
      usedHosts.add(new URL(match[1]).origin + "/*");
    } catch {}
  }
}
// Also check template literals with API URLs from config
for (const jsFile of jsFiles) {
  const content = fs.readFileSync(jsFile, "utf8");
  const urlConstRegex = /https:\/\/[a-z0-9.-]+\/[a-z0-9./_-]*/gi;
  let match;
  while ((match = urlConstRegex.exec(content)) !== null) {
    try {
      usedHosts.add(new URL(match[0]).origin + "/*");
    } catch {}
  }
}

const declared = new Set(manifest.host_permissions || []);
for (const host of usedHosts) {
  const covered = [...declared].some((perm) => {
    if (perm.endsWith("/*")) {
      const origin = perm.slice(0, -2);
      return host.startsWith(origin);
    }
    return perm === host;
  });
  if (!covered) {
    errors.push(`Brak host_permissions dla używanego API: ${host}`);
  }
}

// 6. Unused host_permissions (warning only)
for (const perm of declared) {
  const used = [...usedHosts].some((host) => host.startsWith(perm.replace("/*", "")));
  if (!used) warnings.push(`Nieużywane host_permissions: ${perm}`);
}

// 7. Manifest version
if (manifest.manifest_version !== 3) {
  errors.push(`Nieobsługiwana manifest_version: ${manifest.manifest_version}`);
}

// Report
console.log("\n=== Walidacja wtyczki MindWander ===\n");
console.log("Pliki w dist:");
fs.readdirSync(distDir, { recursive: true }).forEach((f) => {
  if (typeof f === "string" && !f.includes(path.sep)) {
    const stat = fs.statSync(path.join(distDir, f));
    if (stat.isFile()) console.log(`  ✓ ${f}`);
  }
});
for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    for (const sub of fs.readdirSync(path.join(distDir, entry.name))) {
      console.log(`  ✓ ${entry.name}/${sub}`);
    }
  }
}

console.log(`\nUżywane API: ${[...usedHosts].join(", ") || "(brak)"}`);
console.log(`host_permissions: ${[...declared].join(", ") || "(brak)"}`);

if (warnings.length) {
  console.log("\nOstrzeżenia:");
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

if (errors.length) {
  console.log("\nBŁĘDY:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
}

console.log("\n✓ Wtyczka poprawna — gotowa do załadowania w chrome://extensions/\n");
