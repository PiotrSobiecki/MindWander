// src/services/suggestionService.ts

import {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  GOOGLE_API_KEY,
  GOOGLE_CX,
  GOOGLE_API_URL,
  MODEL_AI,
} from "../config.js";

interface Suggestion {
  title: string;
  url: string;
  description: string;
  source: string;
  category: string;
}

// Nowa funkcja: AI generuje kreatywny prompt do Google i opis do wybranej strony
async function generateSerendipityPromptAndDescription(
  keywords: string[],
  content: string,
  googleResults: { title: string; url: string }[]
): Promise<Suggestion | null> {
  const prompt = `
Na podstawie poniższych słów kluczowych i kontekstu strony wykonaj dwa zadania:
1. Wygeneruj krótkie, nieoczywiste, inspirujące zapytanie do wyszukiwarki Google, które pozwoli znaleźć zaskakujące, interdyscyplinarne lub kreatywne powiązania. Unikaj dosłownych powtórzeń, szukaj mostów do innych dziedzin. Zwróć tylko jedno krótkie zapytanie (maksymalnie 8 słów).
2. Spośród poniższych wyników Google wybierz jeden najbardziej serendipity (nieoczywisty, inspirujący) i napisz do niego inspirujący opis powiązania z kontekstem strony. Unikaj oczywistych skojarzeń, szukaj głębokich analogii, zaskakujących odniesień lub mniej znanych faktów.

Słowa kluczowe: ${keywords.join(", ")}
Kontekst: ${content.slice(0, 300)}

Wyniki Google:
${googleResults.map((a, i) => `${i + 1}. ${a.title}: ${a.url}`).join("\n")}

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

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_AI,
      messages: [
        {
          role: "system",
          content:
            "Jesteś ekspertem w kreatywnym wyszukiwaniu i opisywaniu powiązań między tematami.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 400,
    }),
  });

  const data = await response.json();
  const resultText = data.choices[0].message.content;
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
  // 1. AI generuje kreatywny prompt do Google
  const aiPrompt = `Na podstawie słów kluczowych i kontekstu strony wygeneruj krótkie, nieoczywiste zapytanie do Google (maks 8 słów, bez powtórzeń):\nSłowa kluczowe: ${keywords.join(
    ", "
  )}\nKontekst: ${content.slice(0, 300)}`;
  const aiPromptResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_AI,
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w kreatywnym wyszukiwaniu powiązań.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 50,
    }),
  });
  const aiPromptData = await aiPromptResponse.json();
  const googleQuery = aiPromptData.choices[0].message.content
    .trim()
    .replace(/^"|"$/g, "");

  // 2. Szukaj w Google na podstawie promptu od AI
  const response = await fetch(
    `${GOOGLE_API_URL}?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(
      googleQuery
    )}&num=5`
  );
  const data = await response.json();
  if (!data.items) return [];
  const googleResults = data.items.map((item: any) => ({
    title: item.title,
    url: item.link,
  }));

  // 3. AI wybiera i opisuje jedną stronę z wyników Google
  const suggestion = await generateSerendipityPromptAndDescription(
    keywords,
    content,
    googleResults
  );
  return suggestion ? [suggestion] : [];
}
