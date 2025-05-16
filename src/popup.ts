// src/popup.ts

// Interfejs dla sugestii
interface Suggestion {
  title: string;
  url: string;
  description: string;
  timestamp?: number;
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

  if (suggestions.length === 0) {
    suggestionsList.innerHTML =
      '<p class="status">Brak ostatnich sugestii.</p>';
    return;
  }

  suggestionsList.innerHTML = suggestions
    .map(
      (suggestion) => `
    <div class="suggestion">
      <h3>${suggestion.title}</h3>
      <p>${suggestion.description}</p>
      <a href="${suggestion.url}" target="_blank">Przeczytaj więcej →</a>
      ${
        suggestion.timestamp
          ? `<div class="date-right">${formatDate(suggestion.timestamp)}</div>`
          : ""
      }
    </div>
  `
    )
    .join("");
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
  const result = await chrome.storage.local.get(["isEnabled"]);
  return result.isEnabled !== undefined ? result.isEnabled : true; // domyślnie włączona
}

// Inicjalizacja popup
document.addEventListener("DOMContentLoaded", async () => {
  // Pobierz i wyświetl sugestie
  const result = await chrome.storage.local.get(["recentSuggestions"]);
  const suggestions: Suggestion[] = result.recentSuggestions || [];
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
