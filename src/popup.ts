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

// Funkcja do wyświetlania do 5 ostatnich sugestii w popup (bez nawigacji)
function displaySuggestions(suggestions: Suggestion[]) {
  const suggestionsList = document.getElementById("suggestions-list");
  if (!suggestionsList) return;

  if (suggestions.length === 0) {
    suggestionsList.innerHTML =
      '<p class="status">Brak ostatnich sugestii.</p>';
    return;
  }

  // Wyświetl do 5 ostatnich sugestii
  suggestionsList.innerHTML = suggestions
    .slice(0, 5)
    .map(
      (suggestion) => `
    <div class="suggestion">
      <h3>${suggestion.title}</h3>
      <p>${suggestion.description}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
        <a href="${
          suggestion.url
        }" target="_blank" style="color: #4A90E2; text-decoration: none; font-size: 12px;">Przeczytaj więcej →</a>
        ${
          suggestion.timestamp
            ? `<span style=\"font-size: 11px; color: #999;\">${formatDate(
                suggestion.timestamp
              )}</span>`
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");
}

// Pobierz ostatnie sugestie z chrome.storage
chrome.storage.local.get(["recentSuggestions"], (result) => {
  const suggestions: Suggestion[] = result.recentSuggestions || [];
  displaySuggestions(suggestions);
});
