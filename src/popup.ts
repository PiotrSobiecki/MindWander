// src/popup.ts

import {
  createDisclosureBadge,
  markAiGenerated,
} from "./aiDisclosure.js";
import { clear, el, safeHttpUrl } from "./safeDom.js";
import { hasKeys } from "./settings.js";
import { readLocal } from "./storage.js";

// Interfejs dla sugestii
interface Suggestion {
  title: string;
  url: string;
  description: string;
  timestamp?: number;
  model?: string;
}

// Funkcja do formatowania daty
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Funkcja do renderowania sugestii
function renderSuggestions(suggestions: Suggestion[]) {
  const suggestionsList = document.getElementById("suggestions-list");
  if (!suggestionsList) return;

  clear(suggestionsList);

  if (suggestions.length === 0) {
    suggestionsList.appendChild(
      el(document, "p", {
        text: "Brak ostatnich sugestii.",
        attrs: { class: "status" },
      })
    );
    return;
  }

  for (const suggestion of suggestions) {
    // Tytuł, opis i URL pochodzą z wyników wyszukiwania — nigdy przez innerHTML.
    const card = el(document, "div", { attrs: { class: "suggestion" } });

    // Znacznik odczytywalny maszynowo — art. 50 ust. 2 AI Act.
    markAiGenerated(card, suggestion.model ?? "nieznany");

    card.appendChild(el(document, "h3", { text: suggestion.title }));
    card.appendChild(createDisclosureBadge(document));
    card.appendChild(el(document, "p", { text: suggestion.description }));

    const href = safeHttpUrl(suggestion.url);
    if (href) {
      const link = el(document, "a", { text: "Przeczytaj więcej →" });
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.appendChild(link);
    }

    if (suggestion.timestamp) {
      card.appendChild(
        el(document, "div", {
          text: formatDate(suggestion.timestamp),
          attrs: { class: "date-right" },
        })
      );
    }

    suggestionsList.appendChild(card);
  }
}
// Funkcja do aktualizacji stanu przełącznika
function updateToggleState(isEnabled: boolean) {
  const toggle = document.getElementById(
    "extension-toggle"
  ) as HTMLInputElement;
  if (toggle) {
    toggle.checked = isEnabled;
  }
}

// Funkcja do zapisywania stanu wtyczki
async function saveExtensionState(isEnabled: boolean) {
  await chrome.storage.local.set({ isEnabled });
}

// Funkcja do pobierania stanu wtyczki
async function getExtensionState(): Promise<boolean> {
  // Domyślnie włączona.
  return readLocal<boolean>("isEnabled", true);
}

/** Bez kluczy wtyczka nic nie zrobi — mówimy to zamiast milczeć. */
async function renderKeyState() {
  const banner = document.getElementById("keys-missing");
  if (!banner) return;
  banner.hidden = await hasKeys();
}

// Inicjalizacja popup
document.addEventListener("DOMContentLoaded", async () => {
  await renderKeyState();

  for (const id of ["open-options", "open-options-inline"]) {
    document.getElementById(id)?.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Pobierz i wyświetl sugestie
  const suggestions = await readLocal<Suggestion[]>("recentSuggestions", []);
  renderSuggestions(suggestions);

  // Inicjalizuj przełącznik
  const toggle = document.getElementById(
    "extension-toggle"
  ) as HTMLInputElement;
  if (toggle) {
    // Pobierz aktualny stan
    const isEnabled = await getExtensionState();
    updateToggleState(isEnabled);

    // Dodaj obsługę zmiany stanu
    toggle.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      await saveExtensionState(target.checked);

      // Wyślij wiadomość do background script
      chrome.runtime.sendMessage({
        action: "toggleExtension",
        isEnabled: target.checked,
      });
    });
  }
});
