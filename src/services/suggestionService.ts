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

async function chatCompletion(
  messages: { role: string; content: string }[],
  maxTokens: number
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
      temperature: 0.8,
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

async function braveSearch(query: string): Promise<{ title: string; url: string }[]> {
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
  return results.map((item: { title: string; url: string }) => ({
    title: item.title,
    url: item.url,
  }));
}

// Nowa funkcja: AI generuje kreatywny prompt do Google i opis do wybranej strony
async function generateSerendipityPromptAndDescription(
  keywords: string[],
  content: string,
  searchResults: { title: string; url: string }[]
): Promise<Suggestion | null> {
  const prompt = `
Na podstawie poniższych słów kluczowych i kontekstu strony wykonaj dwa zadania:
1. Wygeneruj krótkie, nieoczywiste, inspirujące zapytanie do wyszukiwarki Google, które pozwoli znaleźć zaskakujące, interdyscyplinarne lub kreatywne powiązania. Unikaj dosłownych powtórzeń, szukaj mostów do innych dziedzin. Zwróć tylko jedno krótkie zapytanie (maksymalnie 8 słów).
2. Spośród poniższych wyników Google wybierz jeden najbardziej serendipity (nieoczywisty, inspirujący) i napisz do niego inspirujący opis powiązania z kontekstem strony. Unikaj oczywistych skojarzeń, szukaj głębokich analogii, zaskakujących odniesień lub mniej znanych faktów.

Słowa kluczowe: ${keywords.join(", ")}
Kontekst: ${content.slice(0, 300)}

Wyniki Google:
${searchResults.map((a, i) => `${i + 1}. ${a.title}: ${a.url}`).join("\n")}

Zwróć wynik jako obiekt JSON:
{
  "google_query": "...",
  "suggestion": {
    "title": "...",
    "url": "...",
    "description": "...",
    "source": "Internet",
    "category": "nauka/sztuka/technologia/filozofia/itp."
  }
}
`;

  const resultText = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Jesteś ekspertem w kreatywnym wyszukiwaniu i opisywaniu powiązań między tematami.",
      },
      { role: "user", content: prompt },
    ],
    400
  );
  try {
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestion || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSuggestions(
  keywords: string[],
  content: string
): Promise<Suggestion[]> {
  const aiPrompt = `Na podstawie słów kluczowych i kontekstu strony wygeneruj krótkie, nieoczywiste zapytanie do Google (maks 8 słów, bez powtórzeń):\nSłowa kluczowe: ${keywords.join(
    ", "
  )}\nKontekst: ${content.slice(0, 300)}`;

  const googleQuery = (
    await chatCompletion(
      [
        {
          role: "system",
          content: "Jesteś ekspertem w kreatywnym wyszukiwaniu powiązań.",
        },
        { role: "user", content: aiPrompt },
      ],
      50
    )
  )
    .trim()
    .replace(/^"|"$/g, "");

  console.log("[MindWander] Zapytanie wyszukiwania od AI:", googleQuery);

  const searchResults = await braveSearch(googleQuery);
  if (searchResults.length === 0) {
    console.warn("[MindWander] Brave zwróciło 0 wyników dla:", googleQuery);
    return [];
  }

  const suggestion = await generateSerendipityPromptAndDescription(
    keywords,
    content,
    searchResults
  );
  return suggestion ? [suggestion] : [];
}
