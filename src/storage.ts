// src/storage.ts
//
// @types/chrome 0.3 przestał typować wynik chrome.storage.local.get jako any —
// zwraca teraz mapę o nieznanym kształcie. To słuszne, bo zawartość storage
// jest danymi, nie kontraktem. Rzutowanie trzymamy w jednym miejscu, zamiast
// rozsiewać `as any` po wywołaniach.

/** Czyta jeden klucz ze storage; przy braku wartości oddaje fallback. */
export async function readLocal<T>(key: string, fallback: T): Promise<T> {
  const result = (await chrome.storage.local.get([key])) as Record<
    string,
    unknown
  >;
  const value = result[key];
  return value === undefined ? fallback : (value as T);
}

/** Wyciąga jeden klucz z wyniku get() w wariancie z callbackiem. */
export function pickLocal<T>(
  result: unknown,
  key: string,
  fallback: T
): T {
  const value = (result as Record<string, unknown> | undefined)?.[key];
  return value === undefined ? fallback : (value as T);
}
