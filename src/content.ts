// src/content.ts

import { createDisclosureBadge, markAiGenerated } from "./aiDisclosure.js";
import { skipReason } from "./pageGuard.js";
import { clear, el, safeHttpUrl } from "./safeDom.js";

const POPUP_ID = "serendipity-suggestion";

// Po ilu milisekundach popup znika sam.
const POPUP_LIFETIME_MS = 10 * 60 * 1000;

type PageSuggestion = {
  title: string;
  url: string;
  description: string;
  source?: string;
  category?: string;
  model?: string;
};

// Flaga blokująca wielokrotne wywołanie sugestii na jednej stronie.
// Odstęp między analizami tej samej domeny pilnuje background w storage —
// zmienna w content scripcie nie przeżywa przeładowania strony, więc
// nie nadaje się na licznik czasu.
let suggestionShown = false;

// Funkcja do pobierania głównej treści strony
function getPageContent(): {
  title: string;
  content: string;
  keywords: string[];
} {
  const maxContentLength = 1500;

  return {
    title: document.title,
    content: findMainContent().slice(0, maxContentLength),
    keywords: getKeywords(),
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

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const clone = element.cloneNode(true) as HTMLElement;
      removeUnwantedElements(clone);
      return clone.innerText.trim();
    }
  }

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
    "input",
    "textarea",
    ".comments",
    ".sidebar",
    ".advertisement",
    ".ad",
    ".social-share",
    ".related-posts",
  ];

  unwantedSelectors.forEach((selector) => {
    element.querySelectorAll(selector).forEach((node) => node.remove());
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

// Funkcja do wyświetlania popupu z sugestią
function showSuggestion(suggestion: PageSuggestion) {
  if (document.getElementById(POPUP_ID)) return;

  const host = document.createElement("div");
  host.id = POPUP_ID;
  host.style.cssText = `
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
    pointer-events: auto;
  `;
  document.body.appendChild(host);
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
      "background:none; border:none; color:#2563eb; cursor:pointer; font-size:22px; line-height:1; margin-left:12px; pointer-events:auto;",
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

  const lifetime = setTimeout(() => {
    host.style.opacity = "0";
    setTimeout(() => host.remove(), 500);
  }, POPUP_LIFETIME_MS);

  closeBtn.onclick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    clearTimeout(lifetime);
    host.remove();
  };
}

// Funkcja do analizy strony z opóźnieniem
function analyzePageWithDelay() {
  if (suggestionShown) return;

  const reason = skipReason(
    window.location.href,
    document.querySelector('input[type="password"]') !== null
  );
  if (reason) {
    console.log(`MindWander - pomijam tę stronę: ${reason}`);
    return;
  }

  // Dodaj losowe opóźnienie między 10 a 30 sekund
  const delay = Math.floor(Math.random() * 20000) + 10000;

  setTimeout(() => {
    // Formularz logowania mógł dojechać po załadowaniu strony.
    if (document.querySelector('input[type="password"]')) {
      console.log("MindWander - pomijam tę stronę: pojawiło się pole hasła");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "processPageContent",
        data: getPageContent(),
        url: window.location.href,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Błąd wysyłania wiadomości:",
            chrome.runtime.lastError.message
          );
          return;
        }
        if (response?.suggestion) {
          suggestionShown = true;
          showSuggestion(response.suggestion);
        } else if (response?.status) {
          console.log("MindWander -", response.status);
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

// Nasłuchiwanie na wiadomości o zmianie stanu wtyczki
chrome.runtime.onMessage.addListener((request) => {
  if (request?.action !== "extensionStateChanged") return;

  if (!request.isEnabled) {
    document.getElementById(POPUP_ID)?.remove();
  } else {
    analyzePageWithDelay();
  }
});
