/**
 * Test OpenAI + Google Custom Search (credentials from dist/config.js)
 * Run: node scripts/test-apis.js
 */

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const configPath = path.join(__dirname, "../dist/config.js");

async function main() {
  if (!fs.existsSync(configPath)) {
    console.error("Brak dist/config.js — uruchom najpierw: npm run build");
    process.exit(1);
  }

  const mod = await import(pathToFileURL(configPath).href);
  const {
    OPENAI_API_KEY,
    OPENAI_API_URL,
    BRAVE_API_KEY,
    BRAVE_API_URL,
    MODEL_AI,
  } = mod;

  const mask = (s) =>
    s ? `${s.slice(0, 8)}…${s.slice(-4)} (len=${s.length})` : "(brak)";

  console.log("\n=== Test API MindWander ===\n");
  console.log("OpenAI key:", mask(OPENAI_API_KEY));
  console.log("Model:", MODEL_AI);
  console.log("Brave API key:", mask(BRAVE_API_KEY));

  let failed = 0;

  // 1. OpenAI — minimal chat
  console.log("\n--- 1. OpenAI (chat) ---");
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_AI,
        messages: [{ role: "user", content: "Odpowiedz jednym słowem: las" }],
        max_completion_tokens: 50,
      }),
    });
    const data = await res.json();
    console.log("HTTP status:", res.status);
    if (!res.ok) {
      console.log("BŁĄD:", JSON.stringify(data, null, 2));
      failed++;
    } else if (!data.choices?.[0]?.message?.content) {
      console.log(
        "BŁĄD: brak choices w odpowiedzi:",
        JSON.stringify(data, null, 2)
      );
      failed++;
    } else {
      console.log("OK — odpowiedź:", data.choices[0].message.content.trim());
    }
  } catch (e) {
    console.log("BŁĄD sieci:", e.message);
    failed++;
  }

  // 2. Brave Search
  console.log("\n--- 2. Brave Search ---");
  try {
    const q = "forest ecology India";
    const url = `${BRAVE_API_URL}?q=${encodeURIComponent(q)}&count=3`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });
    const data = await res.json();
    console.log("HTTP status:", res.status);
    if (!res.ok || data.error) {
      console.log("BŁĄD Brave:", JSON.stringify(data, null, 2));
      failed++;
    } else if (!data?.web?.results?.length) {
      console.log(
        "BŁĄD: brak wyników. Odpowiedź:",
        JSON.stringify(data, null, 2).slice(0, 500)
      );
      failed++;
    } else {
      console.log("OK — liczba wyników:", data.web.results.length);
      data.web.results.forEach((it, i) =>
        console.log(`  ${i + 1}. ${(it.title || "").slice(0, 60)}`)
      );
    }
  } catch (e) {
    console.log("BŁĄD sieci:", e.message);
    failed++;
  }

  // 3. Full pipeline (like extension)
  console.log("\n--- 3. Pełny pipeline (getSuggestions) ---");
  try {
    const svcPath = path.join(
      __dirname,
      "../dist/services/suggestionService.js"
    );
    const { getSuggestions } = await import(pathToFileURL(svcPath).href);
    const keywords = ["forest", "India", "road", "wikimedia"];
    const content =
      "A road between forest in India 2016 photograph nature landscape";
    const suggestions = await getSuggestions(keywords, content);
    if (suggestions.length === 0) {
      console.log(
        "BŁĄD: getSuggestions zwróciło [] — w przeglądarce = brak popupu"
      );
      failed++;
    } else {
      console.log("OK — sugestia:");
      console.log(JSON.stringify(suggestions[0], null, 2));
    }
  } catch (e) {
    console.log("BŁĄD pipeline:", e.message);
    failed++;
  }

  console.log("\n--- Jak naprawić ---");
  if (failed > 0) {
    console.log(
      "OpenAI błąd → sprawdź klucz i billing: https://platform.openai.com/account/billing"
    );
    console.log(
      "Brave 401/403 → sprawdź klucz w dashboardzie: https://api.search.brave.com/app/dashboard"
    );
    console.log(
      "Potem: edytuj src/config.ts, npm run build, przeładuj wtyczkę"
    );
  }

  console.log("\n=== Podsumowanie ===");
  if (failed === 0) {
    console.log(
      "Wszystkie testy OK. Jeśli brak popupu: service worker, limit 90 min, domena w storage.\n"
    );
  } else {
    console.log(
      `${failed} test(ów) nie przeszło. Zaktualizuj src/config.ts i npm run build.\n`
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
