// src/content.ts

import {
  createDisclosureBadge,
  markAiGenerated,
} from "./aiDisclosure.js";
import { clear, el, safeHttpUrl } from "./safeDom.js";

console.log(
  "MindWander - Content script załadowany na stronie:",
  window.location.href
);

// Minimalny czas (w milisekundach) między analizami tej samej strony
const MIN_ANALYSIS_INTERVAL = 90 * 60 * 1000; // 1.5 godziny

// Ostatni czas analizy dla aktualnej strony
let lastAnalysisTime = 0;

// Przechowywanie sugestii dla bieżącej strony
type PageSuggestion = {
  title: string;
  url: string;
  description: string;
  source?: string;
  category?: string;
  model?: string;
};

let currentPageSuggestions: PageSuggestion[] = [];

// Flaga blokująca wielokrotne wywołanie sugestii na jednej stronie
let suggestionShown = false;

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

function getKeywords(): string[] {
  const keywords: string[] = [];

  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute("content");
    if (content) {
      keywords.push(...content.split(",").map((k) => k.trim()));
    }
  }

  if (document.title) {
    keywords.push(document.title);
  }

  return [...new Set(keywords)].filter((k) => k.length > 1);
}

// Funkcja do wyświetlania popupu z możliwością przewijania sugestii
function showSuggestionsNavigator(
  suggestions: PageSuggestion[],
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

  // Wczesny return wyżej gwarantuje, że elementu jeszcze nie ma.
  const suggestionElement = document.createElement("div");
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

  function render() {
    const suggestion = suggestions[currentIndex];
    const host = suggestionElement;
    clear(host);

    // Znacznik odczytywalny maszynowo — art. 50 ust. 2 AI Act.
    markAiGenerated(host, suggestion.model ?? "nieznany");

    const header = el(document, "div", {
      style:
        "display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;",
    });
    header.appendChild(
      el(document, "span", {
        text: suggestion.title,
        style: "font-size:18px; font-weight:700; color:#2563eb;",
      })
    );
    const closeBtn = el(document, "button", {
      text: "×",
      id: "serendipity-close",
      title: "Zamknij",
      style:
        "background:none; border:none; color:#2563eb; cursor:pointer; font-size:22px; line-height:1; margin-left:12px;",
    });
    header.appendChild(closeBtn);
    host.appendChild(header);

    // Ujawnienie pada nad treścią, nie pod nią.
    host.appendChild(createDisclosureBadge(document));

    host.appendChild(
      el(document, "p", {
        text: suggestion.description,
        style: "margin:0 0 12px 0; font-size:15px; color:#222;",
      })
    );

    // javascript: i data: nie mają tu wstępu.
    const href = safeHttpUrl(suggestion.url);
    if (href) {
      const link = el(document, "a", {
        text: "Przeczytaj więcej →",
        style:
          "color:#2563eb; text-decoration:underline; font-size:15px; word-break:break-all;",
      });
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      host.appendChild(link);
    }

    if (suggestions.length > 1) {
      const nav = el(document, "div", {
        style: "display:flex; justify-content:center; gap:10px; margin-top:8px;",
      });
      const btnStyle =
        "padding:4px 12px; font-size:18px; border-radius:6px; border:1px solid #e0e0e0; background:#f5f5f5; cursor:pointer;";
      if (currentIndex > 0) {
        const prev = el(document, "button", { text: "←", style: btnStyle });
        prev.onclick = () => {
          currentIndex--;
          render();
        };
        nav.appendChild(prev);
      }
      if (currentIndex < suggestions.length - 1) {
        const next = el(document, "button", { text: "→", style: btnStyle });
        next.onclick = () => {
          currentIndex++;
          render();
        };
        nav.appendChild(next);
      }
      host.appendChild(nav);
      host.appendChild(
        el(document, "div", {
          text: `${currentIndex + 1} / ${suggestions.length}`,
          style:
            "text-align:center; font-size:12px; color:#888; margin-top:2px;",
        })
      );
    }

    closeBtn.onclick = (event) => {
      event.stopPropagation();
      event.preventDefault();
      host.remove();
    };
    closeBtn.style.pointerEvents = "auto";
    host.style.pointerEvents = "auto";
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
  if (suggestionShown) {
    return;
  }
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
          suggestionShown = true;
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
