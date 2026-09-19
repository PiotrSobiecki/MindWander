// src/pageGuard.ts
//
// Wtyczka wysyła fragment czytanej strony do OpenAI. Dla bloga czy artykułu
// to jest cena funkcji, którą użytkownik zna z PRIVACY.md. Dla bankowości,
// poczty, panelu zdrowia albo wewnętrznej aplikacji firmowej ceną jest
// wyciek cudzych danych i nikt na to nie pisał się świadomie.
//
// Manifest ma krótką listę exclude_matches dla najgorszych przypadków —
// tam content script w ogóle się nie wstrzykuje. Ten moduł jest siecią
// właściwą: działa na każdej stronie, którą manifest przepuścił.

/** Fragmenty nazw hostów, których nie czytamy. */
export const SENSITIVE_HOST_PATTERNS = [
  // Bankowość i płatności
  "bank",
  "mbank",
  "ipko",
  "pkobp",
  "santander",
  "millennium",
  "pekao",
  "alior",
  "revolut",
  "paypal",
  "przelewy24",
  "payu",
  "stripe.com",
  "checkout",
  "platnosc",
  // Poczta i logowanie
  "mail.",
  "poczta.",
  "webmail",
  "outlook.",
  "accounts.google",
  "login.",
  "signin",
  "auth.",
  // Zdrowie, podatki, administracja
  "gov.pl",
  "zus.pl",
  "nfz.pl",
  "pacjent.",
  "e-recepta",
  "medicover",
  "luxmed",
  // Środowiska lokalne i wewnętrzne
  "localhost",
  "127.0.0.1",
  ".local",
  ".internal",
  ".lan",
  "intranet",
] as const;

/** Czy host wygląda na miejsce, z którego nie czytamy treści. */
export function isSensitiveHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  return SENSITIVE_HOST_PATTERNS.some((pattern) => host.includes(pattern));
}

/** Adresy IP w sieciach prywatnych — panele routerów, serwery firmowe. */
export function isPrivateAddress(hostname: string): boolean {
  if (hostname === "127.0.0.1" || hostname === "::1") return true;
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) {
    return false;
  }
  const [a, b] = parts.map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export type SkipReason =
  | "schemat inny niż http(s)"
  | "host na liście wykluczeń"
  | "adres w sieci prywatnej"
  | "strona z formularzem logowania";

/**
 * Powód pominięcia strony albo null, gdy wolno ją przeanalizować.
 * `hasPasswordField` podaje wywołujący, żeby moduł dało się testować
 * bez DOM-u.
 */
export function skipReason(
  href: string,
  hasPasswordField: boolean
): SkipReason | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "schemat inny niż http(s)";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "schemat inny niż http(s)";
  }
  if (isPrivateAddress(url.hostname)) {
    return "adres w sieci prywatnej";
  }
  if (isSensitiveHost(url.hostname)) {
    return "host na liście wykluczeń";
  }
  // Pole hasła to najprostszy sygnał, że użytkownik jest na stronie
  // z uwierzytelnianiem, której lista wykluczeń nie zna.
  if (hasPasswordField) {
    return "strona z formularzem logowania";
  }

  return null;
}
