// src/aiDisclosure.ts
//
// Art. 50 ust. 2 AI Act (rozp. UE 2024/1689, obowiązuje od 2.08.2026):
// treść wygenerowana przez model musi być oznaczona dla odbiorcy ORAZ
// w formie odczytywalnej maszynowo.
//
// Ujawnienie wymusza ten moduł, a nie prompt. Prompt to prośba do modelu —
// model może ją pominąć albo sparafrazować. Tu jest stała i funkcja, przez
// którą przechodzi każda ścieżka renderowania sugestii.
//
// Testu scripts/test-ai-disclosure.js nie wyłączaj: pilnuje, że żadna
// z powierzchni (popup w stronie, popup wtyczki, powiadomienie) nie emituje
// sugestii bez oznaczenia. To zmiana prawna, nie kosmetyczna.

export const AI_DISCLOSURE_SHORT = "Wygenerowane przez AI";

export const AI_DISCLOSURE_LONG =
  "Tę sugestię wygenerował model językowy. Może być niedokładna — potraktuj ją jako punkt wyjścia, nie jako źródło.";

// Znacznik odczytywalny maszynowo (art. 50 ust. 2).
export const AI_GENERATED_ATTR = "data-ai-generated";
export const AI_PROVIDER_ATTR = "data-ai-provider";

/** Oznacza kontener sugestii maszynowo. Wołane z każdej ścieżki renderu. */
export function markAiGenerated(element: HTMLElement, model: string): void {
  element.setAttribute(AI_GENERATED_ATTR, "true");
  element.setAttribute(AI_PROVIDER_ATTR, model);
}

/** Widoczna plakietka. Zwraca element, więc nie da się jej pominąć po cichu. */
export function createDisclosureBadge(document: Document): HTMLElement {
  const badge = document.createElement("div");
  badge.setAttribute(AI_GENERATED_ATTR, "true");
  badge.style.cssText =
    "font-size:11px; color:#6b7280; letter-spacing:.02em; text-transform:uppercase; display:flex; align-items:center; gap:6px;";
  badge.title = AI_DISCLOSURE_LONG;
  badge.textContent = AI_DISCLOSURE_SHORT;
  return badge;
}

/** Ujawnienie dla kanałów czysto tekstowych (powiadomienia systemowe). */
export function withDisclosure(message: string): string {
  return `[${AI_DISCLOSURE_SHORT}] ${message}`;
}
