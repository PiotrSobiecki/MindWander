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
const { buildHelpers } = require("./build-helpers.js");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let helpers;
const loadHelpers = async () => {
  if (!helpers) helpers = await import(await buildHelpers());
  return helpers;
};

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
  const { safeHttpUrl } = await loadHelpers();
  assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeHttpUrl("http://example.com/"), "http://example.com/");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,<script>x</script>"), null);
  assert.equal(safeHttpUrl("nie-url"), null);
});

test("sugestia przyjmuje wyłącznie adres z wyników wyszukiwarki", async () => {
  const { matchResult } = await loadHelpers();
  const results = [
    { title: "A", url: "https://example.org/tekst/", description: "" },
    { title: "B", url: "https://inny.example/b", description: "" },
  ];

  // Model przepisał adres — z drobną różnicą w zapisie, którą tolerujemy.
  assert.equal(
    matchResult(results, "https://www.example.org/tekst")?.title,
    "A"
  );
  // Model podstawił adres spoza listy: strona mogła go wstrzyknąć w treści.
  assert.equal(matchResult(results, "https://phishing.example/a"), null);
  assert.equal(matchResult(results, "javascript:alert(1)"), null);
  assert.equal(matchResult(results, ""), null);
});

test("strony wrażliwe nie trafiają do analizy", async () => {
  const { skipReason } = await loadHelpers();

  assert.equal(skipReason("https://blog.example/artykul", false), null);

  assert.ok(skipReason("https://www.mbank.pl/konto", false));
  assert.ok(skipReason("https://mail.google.com/u/0", false));
  assert.ok(skipReason("https://pacjent.gov.pl/wizyty", false));
  assert.ok(skipReason("http://localhost:3000/", false));
  assert.ok(skipReason("http://192.168.0.1/admin", false));
  assert.ok(skipReason("file:///C:/dokumenty/notatka.html", false));
  assert.ok(skipReason("chrome://extensions/", false));

  // Strona spoza listy, ale z formularzem logowania.
  assert.equal(
    skipReason("https://forum.example/login", true),
    "strona z formularzem logowania"
  );
});

test("content script pyta o pole hasła przed wysłaniem treści", () => {
  const src = read("src/content.ts");
  assert.match(src, /input\[type="password"\]/, "brak sprawdzenia pola hasła");
  assert.match(src, /skipReason\(/, "brak bramki pageGuard");
});

test("klucze API nie wracają do źródeł", () => {
  const service = read("src/services/suggestionService.ts");
  assert.doesNotMatch(
    service,
    /from "\.\.\/config\.js"/,
    "serwis znów importuje config — klucze pojechałyby w paczce"
  );
  assert.match(service, /readSettings\(/, "klucze mają iść z chrome.storage");
});
