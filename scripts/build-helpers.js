// scripts/build-helpers.js
//
// Czyste funkcje ze źródeł wtyczki (walidacja URL-a, lista wykluczeń,
// dopasowanie wyniku wyszukiwarki) testujemy bez przeglądarki. Node nie
// rozwiąże importów w stylu "./settings.js" wskazujących na pliki .ts,
// więc do testów budujemy je esbuildem do jednego modułu.

const esbuild = require("esbuild");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.join(__dirname, "..");

const ENTRY = `
export { safeHttpUrl } from "../src/safeDom.js";
export { skipReason, isSensitiveHost, isPrivateAddress } from "../src/pageGuard.js";
export { matchResult } from "../src/services/suggestionService.js";
`;

/** Buduje moduł z czystymi funkcjami i zwraca jego URL do importu. */
async function buildHelpers() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mindwander-test-"));
  const outfile = path.join(outDir, "helpers.mjs");

  await esbuild.build({
    stdin: {
      contents: ENTRY,
      resolveDir: path.join(root, "scripts"),
      loader: "ts",
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "node22",
    charset: "utf8",
    logLevel: "warning",
  });

  return pathToFileURL(outfile).href;
}

module.exports = { buildHelpers };
