// src/settings.ts
//
// Klucze API nie wchodzą do paczki wtyczki. Wszystko, co skompilowane, ląduje
// na dysku każdego użytkownika i daje się wyjąć z rozpakowanego rozszerzenia —
// klucz w źródle to klucz opublikowany. Użytkownik wkleja własny w ekranie
// opcji, a ten moduł jest jedynym miejscem, które go czyta.

import { readLocal } from "./storage.js";

export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
export const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export const DEFAULT_MODEL = "gpt-4o-mini";

export const AVAILABLE_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5-turbo",
] as const;

export const STORAGE_KEYS = {
  openai: "openaiApiKey",
  brave: "braveApiKey",
  model: "model",
} as const;

export interface Settings {
  openaiKey: string;
  braveKey: string;
  model: string;
}

/** Rzucany, gdy użytkownik nie skonfigurował jeszcze kluczy. */
export class MissingKeysError extends Error {
  constructor(missing: string[]) {
    super(`Brak kluczy: ${missing.join(", ")}`);
    this.name = "MissingKeysError";
  }
}

export async function readSettings(): Promise<Settings> {
  const [openaiKey, braveKey, model] = await Promise.all([
    readLocal<string>(STORAGE_KEYS.openai, ""),
    readLocal<string>(STORAGE_KEYS.brave, ""),
    readLocal<string>(STORAGE_KEYS.model, DEFAULT_MODEL),
  ]);

  const missing: string[] = [];
  if (!openaiKey.trim()) missing.push("OpenAI");
  if (!braveKey.trim()) missing.push("Brave Search");
  if (missing.length) throw new MissingKeysError(missing);

  return {
    openaiKey: openaiKey.trim(),
    braveKey: braveKey.trim(),
    model: model.trim() || DEFAULT_MODEL,
  };
}

/** Sprawdza obecność kluczy bez wyciągania wartości. */
export async function hasKeys(): Promise<boolean> {
  try {
    await readSettings();
    return true;
  } catch {
    return false;
  }
}
