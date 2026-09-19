// src/safeDom.ts
//
// Tytuł, opis i URL sugestii pochodzą z wyników Brave Search przepuszczonych
// przez model, który ma instrukcję przepisać je dosłownie. To dane obce:
// kto umie wypozycjonować stronę na niszowe zapytanie, ten kontroluje treść
// tych pól. Dlatego nigdzie nie wchodzą przez innerHTML.

/** Przepuszcza wyłącznie http(s). Ucina javascript:, data:, blob: itd. */
export function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

type ElementOptions = {
  text?: string;
  style?: string;
  id?: string;
  title?: string;
  attrs?: Record<string, string>;
};

/** Tworzy element z tekstem przez textContent — nigdy przez innerHTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  options: ElementOptions = {}
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.text !== undefined) node.textContent = options.text;
  if (options.style) node.style.cssText = options.style;
  if (options.id) node.id = options.id;
  if (options.title) node.title = options.title;
  for (const [k, v] of Object.entries(options.attrs ?? {})) {
    node.setAttribute(k, v);
  }
  return node;
}

/** Usuwa wszystkie dzieci bez dotykania innerHTML. */
export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
