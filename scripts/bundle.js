// scripts/bundle.js
//
// Content script i strony rozszerzenia ładują się jako KLASYCZNE skrypty.
// W MV3 wpis w content_scripts nie ma opcji "type": "module", a <script> bez
// type="module" nie przyjmie importu — plik z `import` na pierwszej linii
// wywala się na SyntaxError, zanim wykona cokolwiek. tsc sam z siebie zostawia
// importy, więc te trzy wejścia muszą przejść przez bundler do formatu IIFE.
//
// Service worker jest wyjątkiem: manifest deklaruje mu "type": "module",
// więc jego bundle zostaje modułem ESM.

const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const ENTRIES = [
  { in: "src/content.ts", out: "dist/content.js", format: "iife" },
  { in: "src/popup.ts", out: "dist/popup.js", format: "iife" },
  { in: "src/options.ts", out: "dist/options.js", format: "iife" },
  { in: "src/background.ts", out: "dist/background.js", format: "esm" },
];

async function main() {
  // Czyścimy dist, żeby po zmianie struktury nie zostawały tam pliki
  // z poprzedniego układu — kiedyś lądował tu skompilowany config.js
  // z kluczami API i nikt tego nie sprzątał.
  fs.rmSync(dist, { recursive: true, force: true });

  for (const entry of ENTRIES) {
    await esbuild.build({
      entryPoints: [path.join(root, entry.in)],
      outfile: path.join(root, entry.out),
      bundle: true,
      format: entry.format,
      target: "chrome120",
      platform: "browser",
      charset: "utf8",
      logLevel: "warning",
    });
    console.log(`  ${entry.in} -> ${entry.out} (${entry.format})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
