// src/background.ts

import { getSuggestions } from "./services/suggestionService.js";

// Interfejs dla danych strony
interface PageData {
  title: string;
  content: string;
  keywords: string[];
}

// Interfejs dla sugestii
interface Suggestion {
  title: string;
  url: string;
  description: string;
  source: string;
  category: string;
  timestamp?: number;
}

// Maksymalna liczba przechowywanych sugestii
const MAX_SUGGESTIONS = 5;

// Funkcja do wyświetlania powiadomienia
async function showSuggestionNotification(suggestion: Suggestion) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "MindWander - Nowa sugestia",
      message: `${suggestion.title}\n\n${suggestion.description}`,
      buttons: [{ title: "Otwórz" }],
      priority: 2,
    });
  } catch (error) {
    console.error("Błąd podczas wyświetlania powiadomienia:", error);
  }
}

// Funkcja do wyciągania domeny z URL
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

// Funkcja do sprawdzania, czy minęło 12 godzin od ostatniej sugestii dla domeny
async function canShowSuggestionForDomain(domain: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(["domainTimestamps"]);
    const timestamps = result.domainTimestamps || {};
    const lastTimestamp = timestamps[domain];

    if (!lastTimestamp) return true;

    const twelveHoursInMs = 90 * 60 * 1000; // 1.5 godziny
    return Date.now() - lastTimestamp > twelveHoursInMs;
  } catch (error) {
    console.error("Błąd podczas sprawdzania timestampu domeny:", error);
    return true;
  }
}

// Funkcja do aktualizacji timestampu dla domeny
async function updateDomainTimestamp(domain: string) {
  try {
    const result = await chrome.storage.local.get(["domainTimestamps"]);
    const timestamps = result.domainTimestamps || {};
    timestamps[domain] = Date.now();
    await chrome.storage.local.set({ domainTimestamps: timestamps });
  } catch (error) {
    console.error("Błąd podczas aktualizacji timestampu domeny:", error);
  }
}

// Funkcja do zapisywania sugestii w chrome.storage
async function saveSuggestion(suggestion: Suggestion) {
  try {
    const domain = getDomain(suggestion.url);
    if (!domain) {
      console.error("Nie można wyciągnąć domeny z URL:", suggestion.url);
      return;
    }

    // Sprawdź, czy można pokazać sugestię dla tej domeny
    const canShow = await canShowSuggestionForDomain(domain);
    if (!canShow) {
      console.log(
        "Sugestia dla domeny",
        domain,
        "była już pokazana w ciągu ostatnich 12 godzin"
      );
      return;
    }

    // Pobierz aktualne sugestie
    const result = await chrome.storage.local.get(["recentSuggestions"]);
    const recentSuggestions: Suggestion[] = result.recentSuggestions || [];

    // Dodaj timestamp do nowej sugestii
    const newSuggestion = {
      ...suggestion,
      timestamp: Date.now(),
    };

    // Dodaj nową sugestię na początek listy
    recentSuggestions.unshift(newSuggestion);

    // Ogranicz liczbę przechowywanych sugestii
    if (recentSuggestions.length > MAX_SUGGESTIONS) {
      recentSuggestions.length = MAX_SUGGESTIONS;
    }

    // Zapisz zaktualizowaną listę
    await chrome.storage.local.set({ recentSuggestions });

    // Aktualizuj timestamp dla domeny
    await updateDomainTimestamp(domain);

    // Wyświetl powiadomienie
    await showSuggestionNotification(newSuggestion);
  } catch (error) {
    console.error("Błąd podczas zapisywania sugestii:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("MindWander - Wtyczka zainstalowana.");
  // Inicjalizuj storage pustą listą sugestii i timestampów domen
  chrome.storage.local.set({
    recentSuggestions: [],
    domainTimestamps: {},
  });
});

// Obsługa kliknięcia w powiadomienie
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
      // Przycisk "Otwórz"
      chrome.storage.local.get(["recentSuggestions"], (result) => {
        const recentSuggestions = result.recentSuggestions || [];
        if (recentSuggestions.length > 0) {
          chrome.tabs.create({ url: recentSuggestions[0].url });
        }
      });
    }
  }
);

// Nasłuchiwanie na wiadomości od content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Wiadomość otrzymana w background.ts:", request);

  if (request.action === "processPageContent") {
    const pageData: PageData = request.data;
    console.log("Przetwarzanie danych strony:", {
      title: pageData.title,
      contentLength: pageData.content.length,
      keywords: pageData.keywords,
    });

    // Pobierz sugestie od OpenAI
    getSuggestions(pageData.keywords, pageData.content)
      .then((suggestions: Suggestion[]) => {
        if (suggestions.length > 0) {
          // Zapisz pierwszą sugestię
          saveSuggestion(suggestions[0]);
          sendResponse({ suggestion: suggestions[0] });
        } else {
          sendResponse({ status: "Brak sugestii" });
        }
      })
      .catch((error: any) => {
        console.error("Błąd podczas pobierania sugestii:", error);
        sendResponse({ status: "Błąd podczas pobierania sugestii" });
      });

    return true; // Wymagane dla asynchronicznego sendResponse
  }
});

console.log("MindWander - Background script załadowany.");
