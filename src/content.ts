// src/content.ts

console.log(
  "MindWander - Content script załadowany na stronie:",
  window.location.href
);

// Minimalny czas (w milisekundach) między analizami tej samej strony
const MIN_ANALYSIS_INTERVAL = 90 * 60 * 1000; // 1.5 godziny

// Ostatni czas analizy dla aktualnej strony
let lastAnalysisTime = 0;

// Przechowywanie sugestii dla bieżącej strony
let currentPageSuggestions: {
  title: string;
  url: string;
  description: string;
  source?: string;
  category?: string;
}[] = [];

// Funkcja do pobierania głównej treści strony
function getPageContent(): {
  title: string;
  content: string;
  keywords: string[];
} {
  // Pobierz tytuł strony
  const title = document.title;

  // Znajdź główną treść strony
  const maxContentLength = 1500;
  const mainContent = findMainContent().slice(0, maxContentLength);

  // Pobierz słowa kluczowe z meta tagów
  const keywords = getKeywords();

  return {
    title,
    content: mainContent.slice(0, maxContentLength),
    keywords,
  };
}

// Funkcja do znajdowania głównej treści strony
function findMainContent(): string {
  // Priorytetowe elementy zawierające główną treść
  const contentSelectors = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".entry-content",
    "#content",
    ".content",
  ];

  // Spróbuj znaleźć główną treść używając selektywnego podejścia
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Usuń niepotrzebne elementy
      const clone = element.cloneNode(true) as HTMLElement;
      removeUnwantedElements(clone);
      return clone.innerText.trim();
    }
  }

  // Jeśli nie znaleziono głównej treści, użyj body
  const body = document.body.cloneNode(true) as HTMLElement;
  removeUnwantedElements(body);
  return body.innerText.trim();
}

// Funkcja do usuwania niepotrzebnych elementów
function removeUnwantedElements(element: HTMLElement) {
  const unwantedSelectors = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    ".comments",
    ".sidebar",
    ".advertisement",
    ".ad",
    ".social-share",
    ".related-posts",
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = element.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });
}

// Funkcja do pobierania słów kluczowych
function getKeywords(): string[] {
  const keywords: string[] = [];

  // Pobierz słowa kluczowe z meta tagów
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute("content");
    if (content) {
      keywords.push(...content.split(",").map((k) => k.trim()));
    }
  }

  // Pobierz słowa kluczowe z meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const content = metaDescription.getAttribute("content");
    if (content) {
      keywords.push(...content.split(" ").map((k) => k.trim()));
    }
  }

  // Dodaj tytuł strony jako słowo kluczowe
  keywords.push(document.title);

  // Usuń duplikaty i puste wartości
  return [...new Set(keywords)].filter((k) => k.length > 0);
}

// Funkcja do wyświetlania popupu z możliwością przewijania sugestii
function showSuggestionsNavigator(
  suggestions: { title: string; url: string; description: string }[],
  startIndex = 0
) {
  console.log(
    "[Serendipity] showSuggestionsNavigator: liczba sugestii w historii:",
    suggestions.length,
    "startIndex:",
    startIndex
  );
  if (document.getElementById("serendipity-suggestion")) return;

  let currentIndex = startIndex;

  let suggestionElement = document.getElementById("serendipity-suggestion");
  if (!suggestionElement) {
    suggestionElement = document.createElement("div");
    suggestionElement.id = "serendipity-suggestion";
    suggestionElement.style.cssText = `
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: #fff;
      color: #222;
      padding: 24px 28px 24px 24px;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      max-width: 420px;
      z-index: 10000;
      font-family: 'Segoe UI', Arial, sans-serif;
      border: 1px solid #e0e0e0;
      transition: opacity 0.5s;
      opacity: 1;
      line-height: 1.7;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(suggestionElement);
  }

  function render() {
    const suggestion = suggestions[currentIndex];
    suggestionElement!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 18px; font-weight: 700; color: #2563eb;">${
          suggestion.title
        }</span>
        <button id="serendipity-close" title="Zamknij" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 22px; line-height: 1; margin-left: 12px;">×</button>
      </div>
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #222;">${
        suggestion.description
      }</p>
      <a href="${
        suggestion.url
      }" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 15px; word-break: break-all;">Przeczytaj więcej →</a>
      ${
        suggestions.length > 1
          ? `
      <div style="display: flex; justify-content: center; gap: 10px; margin-top: 8px;">
        <button id="serendipity-prev" style="display: ${
          currentIndex > 0 ? "inline-block" : "none"
        }; padding: 4px 12px; font-size: 18px; border-radius: 6px; border: 1px solid #e0e0e0; background: #f5f5f5; cursor: pointer;">←</button>
        <button id="serendipity-next" style="display: ${
          currentIndex < suggestions.length - 1 ? "inline-block" : "none"
        }; padding: 4px 12px; font-size: 18px; border-radius: 6px; border: 1px solid #e0e0e0; background: #f5f5f5; cursor: pointer;">→</button>
      </div>
      <div style='text-align:center; font-size:12px; color:#888; margin-top:2px;'>${
        currentIndex + 1
      } / ${suggestions.length}</div>
      `
          : ""
      }
    `;
    // Obsługa zamykania
    const closeBtn = document.getElementById("serendipity-close");
    if (closeBtn) {
      closeBtn.onclick = (event) => {
        event.stopPropagation();
        event.preventDefault();
        suggestionElement!.remove();
      };
      closeBtn.style.pointerEvents = "auto";
    }
    suggestionElement!.style.pointerEvents = "auto";

    // Obsługa nawigacji tylko gdy mamy więcej niż jedną sugestię
    if (suggestions.length > 1) {
      const prevBtn = document.getElementById("serendipity-prev");
      if (prevBtn)
        prevBtn.onclick = () => {
          currentIndex--;
          render();
        };
      const nextBtn = document.getElementById("serendipity-next");
      if (nextBtn)
        nextBtn.onclick = () => {
          currentIndex++;
          render();
        };
    }
  }

  render();

  // Automatycznie znikaj po 10 minutach (600 000 ms)
  setTimeout(() => {
    if (suggestionElement) {
      suggestionElement.style.opacity = "0";
      setTimeout(() => suggestionElement.remove(), 500);
    }
  }, 600000);
}

// Funkcja do analizy strony z opóźnieniem
function analyzePageWithDelay() {
  const currentTime = Date.now();
  const timeSinceLastAnalysis = currentTime - lastAnalysisTime;

  if (timeSinceLastAnalysis < MIN_ANALYSIS_INTERVAL) {
    console.log(
      `Pominięto analizę - minęło tylko ${Math.round(
        timeSinceLastAnalysis / 1000
      )} sekund od ostatniej analizy`
    );
    return;
  }

  // Dodaj losowe opóźnienie między 10 a 30 sekund
  const delay = Math.floor(Math.random() * 20000) + 10000;
  console.log(
    `Analiza strony rozpocznie się za ${Math.round(delay / 1000)} sekund`
  );

  setTimeout(() => {
    const pageData = getPageContent();
    lastAnalysisTime = Date.now();

    chrome.runtime.sendMessage(
      {
        action: "processPageContent",
        data: pageData,
        url: window.location.href,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Błąd wysyłania wiadomości:",
            chrome.runtime.lastError.message
          );
        } else if (response && response.suggestion) {
          // Zapisz sugestię dla bieżącej strony
          currentPageSuggestions = [response.suggestion];
          showSuggestion();
        }
      }
    );
  }, delay);
}

// Rozpocznij analizę po załadowaniu strony
if (document.readyState === "complete") {
  analyzePageWithDelay();
} else {
  window.addEventListener("load", analyzePageWithDelay);
}

// Rozpocznij analizę po scrollowaniu
let scrollTimeout: number | null = null;
window.addEventListener("scroll", () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  scrollTimeout = window.setTimeout(analyzePageWithDelay, 1000);
});

async function urlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
    // Jeśli nie ma błędu, uznajemy, że istnieje (niestety no-cors nie daje statusu, ale nie rzuca błędu dla istniejących)
    return response.ok || response.type === "opaque";
  } catch {
    return false;
  }
}

// Zmieniona funkcja wyświetlania sugestii - używa sugestii z bieżącej strony
function showSuggestion() {
  console.log(
    "[Serendipity] showSuggestion (dolny popup): liczba sugestii dla bieżącej strony:",
    currentPageSuggestions.length,
    currentPageSuggestions
  );

  if (currentPageSuggestions.length === 0) return;
  showSuggestionsNavigator(currentPageSuggestions, 0);
}

// Na końcu pliku dodaj globalny nasłuchiwacz na kliknięcia na ×
document.addEventListener(
  "click",
  (e) => {
    const target = e.target as HTMLElement;
    if (target && target.id === "serendipity-close") {
      e.stopPropagation();
      e.preventDefault();
      const popup = document.getElementById("serendipity-suggestion");
      if (popup) popup.remove();
    }
  },
  true
);

// Nasłuchiwanie na wiadomości o zmianie stanu wtyczki
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extensionStateChanged") {
    if (!request.isEnabled) {
      // Jeśli wtyczka została wyłączona, usuń wszystkie sugestie
      const suggestionElement = document.getElementById(
        "serendipity-suggestion"
      );
      if (suggestionElement) {
        suggestionElement.remove();
      }
    } else {
      // Jeśli wtyczka została włączona, rozpocznij analizę
      analyzePageWithDelay();
    }
  }
});
