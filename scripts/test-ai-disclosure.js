// scripts/test-ai-disclosure.js
//
// Art. 50 AI Act wymaga, żeby użytkownik dowiedział się, że treść pochodzi
// od modelu — przy pierwszej ekspozycji i w formie odczytywalnej maszynowo.
// Ujawnienie ma wymuszać kod, a nie prompt; ten test pilnuje, że kod go nie
// zgubi przy refaktorze. Wyłączenie go to zmiana prawna, nie techniczna.
//
// Przy okazji przypina naprawę XSS-a: tytuł, opis i URL sugestii pochodzą
// z wyników wyszukiwania i nie mogą wracać do innerHTML.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("moduł ujawnienia definiuje niepustą treść i znacznik maszynowy", () => {
  const src = read("src/aiDisclosure.ts");
  const short = src.match(/AI_DISCLOSURE_SHORT\s*=\s*"([^"]+)"/);
  assert.ok(short, "brak stałej AI_DISCLOSURE_SHORT");
  assert.ok(short[1].trim().length >= 10, "ujawnienie jest puste albo zbyt krótkie");
  assert.match(src, /AI_GENERATED_ATTR\s*=\s*"data-ai-generated"/);
  assert.match(src, /art\.\s*50/i, "moduł ma wskazywać podstawę prawną");
});

for (const file of ["src/content.ts", "src/popup.ts"]) {
  test(`${file}: sugestia nie renderuje się bez ujawnienia`, () => {
    const src = read(file);
    assert.match(src, /from "\.\/aiDisclosure\.js"/, "brak importu ujawnienia");
    assert.match(src, /createDisclosureBadge\(/, "brak widocznej plakietki");
    assert.match(src, /markAiGenerated\(/, "brak znacznika maszynowego");
  });

  test(`${file}: dane z wyszukiwarki nie wracają do innerHTML`, () => {
    const src = read(file);
    const lines = src.split("\n").filter((l) => !l.trim().startsWith("//"));
    const assigns = lines.filter((l) => /\.innerHTML\s*=/.test(l));
    assert.deepEqual(assigns, [], `przypisanie do innerHTML: ${assigns.join(" | ")}`);
  });
}

test("powiadomienie systemowe niesie ujawnienie", () => {
  const src = read("src/background.ts");
  assert.match(src, /withDisclosure\(/, "treść powiadomienia omija ujawnienie");
});

test("popup informuje o AI przy pierwszym otwarciu", () => {
  const html = read("src/popup.html");
  assert.match(html, /class="ai-notice"/, "brak widocznego ujawnienia w popupie");
  assert.match(html, /model językowy/i);
});

test("safeHttpUrl przepuszcza tylko http i https", async () => {
  const mod = await import(
    require("node:url").pathToFileURL(path.join(root, "dist/safeDom.js")).href
  );
  assert.equal(mod.safeHttpUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(mod.safeHttpUrl("http://example.com/"), "http://example.com/");
  assert.equal(mod.safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(mod.safeHttpUrl("data:text/html,<script>x</script>"), null);
  assert.equal(mod.safeHttpUrl("nie-url"), null);
});
