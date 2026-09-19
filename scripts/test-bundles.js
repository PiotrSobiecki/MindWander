// scripts/test-bundles.js
//
// Chrome ładuje content script i skrypty stron rozszerzenia jako KLASYCZNE
// skrypty. Plik z `import` na pierwszej linii wywala się na SyntaxError,
// zanim wykona pierwszą instrukcję — i wtedy nie działa ani UI, ani plakietka
// ujawnienia AI, a nic tego nie widać poza konsolą karty. Dokładnie to
// wydarzyło się po dodaniu aiDisclosure.ts i safeDom.ts.
//
// vm.Script parsuje kod w tych samych regułach co klasyczny <script>, więc
// ten test przewraca się dokładnie wtedy, co przeglądarka.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dist = path.join(__dirname, "..", "dist");

const CLASSIC_SCRIPTS = ["content.js", "popup.js", "options.js"];

for (const file of CLASSIC_SCRIPTS) {
  test(`${file} parsuje się jako klasyczny skrypt`, () => {
    const full = path.join(dist, file);
    assert.ok(fs.existsSync(full), `brak ${file} — uruchom npm run build`);
    const source = fs.readFileSync(full, "utf8");

    assert.doesNotThrow(
      () => new vm.Script(source, { filename: file }),
      `${file} nie ładuje się jako klasyczny skrypt (prawdopodobnie został modułem ES)`
    );
  });

  test(`${file} jest jednym plikiem, bez zewnętrznych importów`, () => {
    const source = fs.readFileSync(path.join(dist, file), "utf8");
    assert.doesNotMatch(
      source,
      /^\s*(import|export)\s/m,
      `${file} zawiera import lub export na poziomie modułu`
    );
  });
}

test("popup.html i options.html nie ładują skryptów jako modułów", () => {
  for (const page of ["popup.html", "options.html"]) {
    const html = fs.readFileSync(path.join(dist, page), "utf8");
    const tags = html.match(/<script[^>]*>/g) ?? [];
    for (const tag of tags) {
      assert.doesNotMatch(
        tag,
        /type\s*=\s*["']module["']/,
        `${page}: ${tag} deklaruje moduł, a bundle jest klasycznym skryptem`
      );
    }
  }
});

test("bundle nie zawiera wbudowanych kluczy API", () => {
  // Klucze czytamy ze storage, wypełnia je użytkownik w opcjach. Gdyby
  // wróciły do źródeł, pojechałyby do każdego, kto dostanie paczkę.
  const files = fs
    .readdirSync(dist)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(dist, f));

  assert.ok(files.length > 0, "brak zbudowanych plików");

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /sk-[A-Za-z0-9_-]{20,}/,
      `${path.basename(file)} zawiera coś, co wygląda na klucz OpenAI`
    );
    assert.doesNotMatch(
      source,
      /BSA[A-Za-z0-9_-]{20,}/,
      `${path.basename(file)} zawiera coś, co wygląda na klucz Brave`
    );
  }
});

test("dist nie zawiera pliku konfiguracyjnego z kluczami", () => {
  for (const name of ["config.js", "config.ts_example.js"]) {
    assert.ok(
      !fs.existsSync(path.join(dist, name)),
      `dist/${name} nie powinien już istnieć — klucze żyją w chrome.storage`
    );
  }
});
