/**
 * Ręczny test łączności z OpenAI i Brave Search.
 *
 * Klucze bierze ze zmiennych środowiskowych, nie z pliku w repo — wtyczka
 * trzyma je w chrome.storage, a skrypt nie ma czego z niej czytać.
 *
 *   OPENAI_API_KEY=... BRAVE_API_KEY=... node scripts/smoke-apis.js
 *
 * Z 1Password bez wklejania wartości do terminala:
 *   op run --env-file=secrets.tpl -- node scripts/smoke-apis.js
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const MODEL = process.env.MINDWANDER_MODEL || "gpt-4o-mini";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

function requireKeys() {
  const missing = [];
  if (!OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!BRAVE_API_KEY) missing.push("BRAVE_API_KEY");
  if (missing.length) {
    console.error(`Brak zmiennych środowiskowych: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function testOpenAI() {
  console.log("\n--- 1. OpenAI (chat) ---");
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: "Odpowiedz jednym słowem: las" }],
      max_completion_tokens: 50,
    }),
  });

  console.log("HTTP status:", res.status);
  const data = await res.json();
  if (!res.ok) {
    console.log("BŁĄD:", data?.error?.message || `HTTP ${res.status}`);
    return false;
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    console.log("BŁĄD: brak treści w odpowiedzi");
    return false;
  }
  console.log("Odpowiedź:", text.trim());
  return true;
}

async function testBrave() {
  console.log("\n--- 2. Brave Search ---");
  const res = await fetch(
    `${BRAVE_API_URL}?q=${encodeURIComponent("serendipity w nauce")}&count=3`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    }
  );

  console.log("HTTP status:", res.status);
  const data = await res.json();
  if (!res.ok || data.error) {
    console.log("BŁĄD:", data?.error?.detail || `HTTP ${res.status}`);
    return false;
  }
  const results = data?.web?.results ?? [];
  console.log(`Wyników: ${results.length}`);
  for (const r of results.slice(0, 3)) {
    console.log(`  - ${r.title}`);
  }
  return results.length > 0;
}

async function main() {
  requireKeys();
  console.log("\n=== Test API MindWander ===");
  console.log("Model:", MODEL);

  const results = [await testOpenAI(), await testBrave()];
  const failed = results.filter((ok) => !ok).length;

  console.log(
    failed === 0
      ? "\nOba API odpowiadają poprawnie.\n"
      : `\n${failed} z ${results.length} testów nie przeszło.\n`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Błąd:", error.message);
  process.exit(1);
});
