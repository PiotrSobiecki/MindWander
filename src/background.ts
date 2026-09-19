// src/background.ts

import { getSuggestions } from "./services/suggestionService.js";
import { withDisclosure } from "./aiDisclosure.js";
import { safeHttpUrl } from "./safeDom.js";
import { hasKeys, MissingKeysError } from "./settings.js";
import { readLocal } from "./storage.js";

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
  model: string;
  timestamp?: number;
}

// Maksymalna liczba przechowywanych sugestii
const MAX_SUGGESTIONS = 5;

// Ile czekamy, zanim znów przeanalizujemy tę samą stronę i zanim znów
// zaproponujemy tę samą domenę docelową.
const DOMAIN_COOLDOWN_MS = 90 * 60 * 1000;

// Powiadomienie ma otwierać swój własny link, nie najnowszy z listy.
// Service worker bywa ubijany między wyświetleniem a kliknięciem, więc
// mapowanie idzie do storage, nie do zmiennej modułowej.
const NOTIFICATION_TARGETS = "notificationTargets";

type TimestampMap = Record<string, number>;

// Powiadomienie zamknięte przez system nie zawsze odpala onClosed, więc mapa
// adresów mogłaby rosnąć bez końca. Trzymamy tylko ostatnie wpisy.
const MAX_NOTIFICATION_TARGETS = 20;

function prune(targets: Record<string, string>): Record<string, string> {
  const entries = Object.entries(targets);
  if (entries.length <= MAX_NOTIFICATION_TARGETS) return targets;
  return Object.fromEntries(entries.slice(-MAX_NOTIFICATION_TARGETS));
}

async function showSuggestionNotification(suggestion: Suggestion) {
  try {
    const notificationId = await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "MindWander - Nowa sugestia",
      // Powiadomienie systemowe to czysty tekst, więc ujawnienie z art. 50
      // wchodzi w treść wiadomości — nie ma go gdzie pokazać inaczej.
      message: withDisclosure(`${suggestion.title}\n\n${suggestion.description}`),
      buttons: [{ title: "Otwórz" }],
      priority: 2,
    });

    const href = safeHttpUrl(suggestion.url);
    if (href) {
      const targets = await readLocal<Record<string, string>>(
        NOTIFICATION_TARGETS,
        {}
      );
      targets[notificationId] = href;
      await chrome.storage.local.set({
        [NOTIFICATION_TARGETS]: prune(targets),
      });
    }
  } catch (error) {
    console.error("Błąd podczas wyświetlania powiadomienia:", error);
  }
}

async function notifyMissingKeys() {
  try {
    await chrome.notifications.create("mindwander-missing-keys", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "MindWander - brak kluczy API",
      message:
        "Wtyczka potrzebuje Twoich kluczy OpenAI i Brave Search. " +
        "Otwórz opcje rozszerzenia i wklej je tam.",
      priority: 2,
    });
  } catch (error) {
    console.error("Błąd powiadomienia o brakujących kluczach:", error);
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

/** Czy minął cooldown dla wpisu w podanej mapie znaczników czasu. */
async function isCooledDown(mapKey: string, entry: string): Promise<boolean> {
  try {
    const timestamps = await readLocal<TimestampMap>(mapKey, {});
    const last = timestamps[entry];
    if (!last) return true;
    return Date.now() - last > DOMAIN_COOLDOWN_MS;
  } catch (error) {
    console.error("Błąd podczas sprawdzania cooldownu:", error);
    return true;
  }
}

async function markSeen(mapKey: string, entry: string) {
  try {
    const timestamps = await readLocal<TimestampMap>(mapKey, {});
    timestamps[entry] = Date.now();
    await chrome.storage.local.set({ [mapKey]: timestamps });
  } catch (error) {
    console.error("Błąd podczas zapisu cooldownu:", error);
  }
}

// Funkcja do zapisywania sugestii w chrome.storage
async function saveSuggestion(suggestion: Suggestion) {
  try {
    const domain = getDomain(suggestion.url);
    if (!domain) {
      console.error("Nie można wyciągnąć domeny z URL sugestii");
      return;
    }

    // Ta sama domena docelowa nie wraca w kółko.
    if (!(await isCooledDown("suggestedDomains", domain))) {
      console.log("Domena", domain, "była już proponowana niedawno");
      return;
    }

    const recentSuggestions = await readLocal<Suggestion[]>(
      "recentSuggestions",
      []
    );

    const newSuggestion = {
      ...suggestion,
      timestamp: Date.now(),
    };

    recentSuggestions.unshift(newSuggestion);

    if (recentSuggestions.length > MAX_SUGGESTIONS) {
      recentSuggestions.length = MAX_SUGGESTIONS;
    }

    await chrome.storage.local.set({ recentSuggestions });
    await markSeen("suggestedDomains", domain);
    await showSuggestionNotification(newSuggestion);
  } catch (error) {
    console.error("Błąd podczas zapisywania sugestii:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("MindWander - Wtyczka zainstalowana.");
  chrome.storage.local.set({
    recentSuggestions: [],
    analyzedDomains: {},
    suggestedDomains: {},
    [NOTIFICATION_TARGETS]: {},
  });
});

/** Otwiera link przypisany do konkretnego powiadomienia. */
async function openNotificationTarget(notificationId: string) {
  const targets = await readLocal<Record<string, string>>(
    NOTIFICATION_TARGETS,
    {}
  );
  const href = safeHttpUrl(targets[notificationId] ?? "");
  if (!href) {
    console.warn("Powiadomienie bez poprawnego adresu docelowego");
    return;
  }
  await chrome.tabs.create({ url: href });
  delete targets[notificationId];
  await chrome.storage.local.set({ [NOTIFICATION_TARGETS]: targets });
}

chrome.notifications.onButtonClicked.addListener((notificationId, index) => {
  if (notificationId === "mindwander-missing-keys") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (index === 0) {
    void openNotificationTarget(notificationId);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "mindwander-missing-keys") {
    chrome.runtime.openOptionsPage();
    return;
  }
  void openNotificationTarget(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId) => {
  void (async () => {
    const targets = await readLocal<Record<string, string>>(
      NOTIFICATION_TARGETS,
      {}
    );
    if (targets[notificationId]) {
      delete targets[notificationId];
      await chrome.storage.local.set({ [NOTIFICATION_TARGETS]: targets });
    }
  })();
});

/** Przetwarza treść strony i zwraca sugestię albo powód jej braku. */
async function handlePageContent(
  pageData: PageData,
  pageUrl: string
): Promise<{ suggestion?: Suggestion; status?: string }> {
  const isEnabled = await readLocal<boolean>("isEnabled", true);
  if (!isEnabled) {
    return { status: "Wtyczka wyłączona" };
  }

  // Cooldown sprawdzamy PRZED wywołaniem modelu. Wcześniej ta bramka stała
  // za zapytaniami do OpenAI i Brave, więc każde wejście na stronę kosztowało
  // trzy wywołania API, nawet gdy wynik i tak szedł do kosza.
  const pageDomain = getDomain(pageUrl);
  if (!pageDomain) {
    return { status: "Adres strony nie do przetworzenia" };
  }
  if (!(await isCooledDown("analyzedDomains", pageDomain))) {
    return { status: "Ta domena była analizowana niedawno" };
  }

  // Brak kluczy sprawdzamy przed oznaczeniem domeny jako przeanalizowanej.
  // Inaczej pierwsze wejście bez kluczy zamykałoby domenę na 90 minut i po
  // wpisaniu kluczy w opcjach nic by się nie działo.
  if (!(await hasKeys())) {
    console.warn("MindWander: klucze API nieskonfigurowane");
    await notifyMissingKeys();
    return { status: "Brak kluczy API" };
  }

  console.log("Przetwarzanie danych strony:", {
    contentLength: pageData.content.length,
    keywordCount: pageData.keywords.length,
  });

  await markSeen("analyzedDomains", pageDomain);

  try {
    const suggestions = await getSuggestions(
      pageData.keywords,
      pageData.content
    );
    if (suggestions.length === 0) {
      return { status: "Brak sugestii" };
    }
    await saveSuggestion(suggestions[0]);
    return { suggestion: suggestions[0] };
  } catch (error) {
    if (error instanceof MissingKeysError) {
      console.warn("MindWander: klucze API nieskonfigurowane");
      await notifyMissingKeys();
      return { status: "Brak kluczy API" };
    }
    console.error("Błąd podczas pobierania sugestii:", error);
    return { status: "Błąd podczas pobierania sugestii" };
  }
}

async function broadcastState(isEnabled: boolean) {
  await chrome.storage.local.set({ isEnabled });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id) continue;
    chrome.tabs
      .sendMessage(tab.id, { action: "extensionStateChanged", isEnabled })
      .catch(() => {
        // Taby bez content scriptu — nic do zrobienia.
      });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Wiadomości przyjmujemy tylko od własnego rozszerzenia. externally_connectable
  // nie jest zadeklarowane, więc strony i tak nie dosięgną — ale bramka ma być
  // w kodzie, a nie w domyśle o konfiguracji.
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  if (request?.action === "toggleExtension") {
    void broadcastState(Boolean(request.isEnabled));
    return false;
  }

  if (request?.action === "processPageContent") {
    const data = request.data;
    if (
      !data ||
      typeof data.content !== "string" ||
      !Array.isArray(data.keywords)
    ) {
      sendResponse({ status: "Niepoprawne dane strony" });
      return false;
    }

    handlePageContent(data as PageData, String(request.url ?? ""))
      .then(sendResponse)
      .catch((error) => {
        console.error("Nieobsłużony błąd przetwarzania strony:", error);
        sendResponse({ status: "Błąd przetwarzania" });
      });

    return true; // Wymagane dla asynchronicznego sendResponse
  }

  return false;
});

console.log("MindWander - Background script załadowany.");
