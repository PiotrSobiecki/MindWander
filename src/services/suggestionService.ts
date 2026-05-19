// src/services/suggestionService.ts

import {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  BRAVE_API_KEY,
  BRAVE_API_URL,
  MODEL_AI,
} from "../config.js";

interface Suggestion {
  title: string;
  url: string;
  description: string;
  source: string;
  category: string;
}

interface Extraction {
  domain: string;
  mechanism: string;
  forbidden_words: string[];
}

const TARGET_DOMAINS = [
  "filozofia",
  "biologia",
  "sztuka",
  "historia",
  "fizyka",
  "antropologia",
  "muzyka",
  "matematyka",
  "architektura",
  "mitologia",
] as const;

const MAX_ATTEMPTS = 2;

async function chatCompletion(
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_AI,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg =
      data?.error?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(`OpenAI: ${msg}`);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI: brak treści w odpowiedzi");
  }
  return text;
}

async function braveSearch(
  query: string
): Promise<{ title: string; url: string; description: string }[]> {
  const response = await fetch(
    `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    }
  );
  const data = await response.json();
  if (!response.ok || data.error) {
    const msg = data?.error?.detail || data?.message || `HTTP ${response.status}`;
    throw new Error(`Brave Search: ${msg}`);
  }
  const results = data?.web?.results;
  if (!results?.length) {
    return [];
  }
  return results.map(
    (item: { title: string; url: string; description?: string }) => ({
      title: item.title,
      url: item.url,
      description: item.description ?? "",
    })
  );
}

function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function extractDomainAndMechanism(
  keywords: string[],
  content: string
): Promise<Extraction> {
  const prompt = `Przeczytaj fragment strony i wyodrębnij trzy rzeczy w JSON:

1. "domain" — w 2-4 słowach, do jakiej dziedziny należy ten tekst (np. "trading finansowy", "kultura jedzenia", "programowanie webowe", "polityka międzynarodowa").
2. "mechanism" — abstrakcyjny wzorzec / mechanizm / pytanie filozoficzne, które kryje się pod powierzchnią tekstu, a daje się przenieść do zupełnie innej dziedziny. Jedno zdanie. Przykłady: "samoorganizacja kolejki bez centralnego sterowania", "decyzja pod niepewnością i percepcja czasu teraźniejszego", "kompromis między eksploracją a eksploatacją", "rytuał jako mechanizm budowy zaufania".
3. "forbidden_words" — lista 6-12 słów kluczowych charakterystycznych DLA TEJ DZIEDZINY (terminy fachowe, nazwiska, marki, instytucje). Te słowa NIE mogą pojawić się w późniejszym zapytaniu. Po polsku i po angielsku, jeśli oczywiste.

Tytuł i meta: ${keywords.join(", ")}
Treść: ${content.slice(0, 800)}

Zwróć WYŁĄCZNIE JSON, bez komentarza:
{"domain": "...", "mechanism": "...", "forbidden_words": ["...", "..."]}`;

  const text = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Jesteś analitykiem tekstów. Twoim zadaniem jest wyabstrahować z konkretu uniwersalny mechanizm. Odpowiadasz wyłącznie poprawnym JSON.",
      },
      { role: "user", content: prompt },
    ],
    300,
    0.3
  );

  const parsed = extractJson(text);
  if (!parsed || !parsed.domain || !parsed.mechanism) {
    throw new Error("Extract: niepoprawny JSON z modelu");
  }
  return {
    domain: String(parsed.domain),
    mechanism: String(parsed.mechanism),
    forbidden_words: Array.isArray(parsed.forbidden_words)
      ? parsed.forbidden_words.map((w: unknown) => String(w).toLowerCase())
      : [],
  };
}

async function generateBridgeQuery(
  extraction: Extraction,
  targetDomain: string
): Promise<string> {
  const prompt = `Mechanizm do przeniesienia: "${extraction.mechanism}"
Dziedzina źródłowa (UNIKAJ): ${extraction.domain}
Dziedzina docelowa (SZUKAJ TAM): ${targetDomain}
Słowa ZAKAZANE (nie mogą pojawić się w zapytaniu): ${extraction.forbidden_words.join(", ")}

Napisz JEDNO zapytanie do wyszukiwarki (maks. 7 słów), które znajdzie tekst o tym mechanizmie w dziedzinie ${targetDomain}. Nie używaj słów zakazanych ani synonimów dziedziny źródłowej. Zwróć samo zapytanie, bez cudzysłowów ani komentarza.`;

  const query = (
    await chatCompletion(
      [
        {
          role: "system",
          content:
            "Jesteś ekspertem od interdyscyplinarnych analogii. Generujesz krótkie, precyzyjne zapytania, które prowadzą do zaskakujących powiązań.",
        },
        { role: "user", content: prompt },
      ],
      60,
      0.9
    )
  )
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");

  return query;
}

async function selectAndDescribe(
  extraction: Extraction,
  results: { title: string; url: string; description: string }[],
  targetDomain: string
): Promise<Suggestion | null> {
  const resultsBlock = results
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Opis: ${r.description.slice(0, 200)}`
    )
    .join("\n\n");

  const prompt = `Czytelnik właśnie czyta tekst z dziedziny: ${extraction.domain}.
Pod powierzchnią tego tekstu działa mechanizm: "${extraction.mechanism}".
Szukamy tego mechanizmu w dziedzinie: ${targetDomain}.

Wyniki wyszukiwania:

${resultsBlock}

Wybierz JEDEN wynik, który:
- należy do dziedziny ${targetDomain} (lub innej odległej od ${extraction.domain}),
- pozwala dostrzec mechanizm "${extraction.mechanism}" w nowym kontekście,
- wywoła reakcję "w życiu bym tego nie wyszukał".

ODRZUĆ wyniki, które:
- należą do dziedziny ${extraction.domain} lub jej bezpośredniego sąsiedztwa,
- powtarzają któreś ze słów zakazanych: ${extraction.forbidden_words.join(", ")}.

Jeśli ŻADEN wynik nie spełnia tych kryteriów, zwróć dokładnie: {"suggestion": null}

W przeciwnym razie zwróć JSON:
{
  "suggestion": {
    "title": "<oryginalny tytuł wyniku>",
    "url": "<oryginalny URL wyniku>",
    "description": "<jedno zdanie po polsku: dlaczego ten tekst łączy się z tym, co czytelnik czyta teraz — przez wskazany mechanizm, nie przez powierzchowne podobieństwo>",
    "source": "Internet",
    "category": "${targetDomain}"
  }
}

Zwróć WYŁĄCZNIE JSON.`;

  const text = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Jesteś kuratorem serendipity. Wolisz milczeć niż pokazać sugestię z tej samej bańki tematycznej. Odpowiadasz wyłącznie poprawnym JSON.",
      },
      { role: "user", content: prompt },
    ],
    400,
    0.5
  );

  const parsed = extractJson(text);
  if (!parsed) return null;
  const s = parsed.suggestion;
  if (!s || !s.title || !s.url || !s.description) return null;

  const haystack = `${s.title} ${s.description}`.toLowerCase();
  const overlap = extraction.forbidden_words.filter(
    (w) => w.length > 2 && haystack.includes(w)
  );
  if (overlap.length >= 2) {
    console.log("[MindWander] Odrzucono sugestię — overlap z forbidden:", overlap);
    return null;
  }

  return {
    title: String(s.title),
    url: String(s.url),
    description: String(s.description),
    source: "Internet",
    category: String(s.category || targetDomain),
  };
}

function pickTargetDomain(
  sourceDomain: string,
  tried: Set<string>
): string | null {
  const sourceLower = sourceDomain.toLowerCase();
  const available = TARGET_DOMAINS.filter(
    (d) => !tried.has(d) && !sourceLower.includes(d)
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export async function getSuggestions(
  keywords: string[],
  content: string
): Promise<Suggestion[]> {
  const extraction = await extractDomainAndMechanism(keywords, content);
  console.log("[MindWander] Extraction:", extraction);

  const tried = new Set<string>();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const targetDomain = pickTargetDomain(extraction.domain, tried);
    if (!targetDomain) break;
    tried.add(targetDomain);

    const query = await generateBridgeQuery(extraction, targetDomain);
    console.log(
      `[MindWander] Próba ${attempt + 1}/${MAX_ATTEMPTS} — dziedzina: ${targetDomain}, zapytanie: ${query}`
    );

    const results = await braveSearch(query);
    if (results.length === 0) {
      console.warn("[MindWander] Brave: 0 wyników");
      continue;
    }

    const suggestion = await selectAndDescribe(extraction, results, targetDomain);
    if (suggestion) {
      return [suggestion];
    }
    console.log("[MindWander] Wszystkie wyniki w bańce — retry");
  }

  console.log("[MindWander] Brak sugestii spełniającej kryteria — cisza");
  return [];
}
