// Plik konfiguracyjny MindWander
// Skopiuj: cp src/config.ts_example.ts src/config.ts

// OpenAI — https://platform.openai.com/api-keys
const OPENAI_API_KEY = "TWÓJ_KLUCZ_OPENAI_API";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Brave Search — https://brave.com/search/api/
const BRAVE_API_KEY = "TWÓJ_KLUCZ_BRAVE_SEARCH";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

// Modele OpenAI: gpt-4o-mini (domyślny), gpt-4o, gpt-3.5-turbo
const MODEL_AI = "gpt-4o-mini";

export {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  BRAVE_API_KEY,
  BRAVE_API_URL,
  MODEL_AI,
};
