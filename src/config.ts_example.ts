// Plik konfiguracyjny MindWander
// Skopiuj ten plik do config.ts i uzupełnij swoimi kluczami API

// Klucz API z OpenRouter lub OpenAI
const OPENAI_API_KEY = "TWÓJ_KLUCZ_OPENAI_API";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"; // dla OPENAI

// Klucz API Google Custom Search i ID wyszukiwarki
const GOOGLE_API_KEY = "TWÓJ_KLUCZ_GOOGLE_API"; // custom search API key
const GOOGLE_CX = "TWÓJ_ID_GOOGLE_CUSTOM_SEARCH"; // https://programmablesearchengine.google.com/controlpanel/all
const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";

// Model AI - wybierz jeden z dostępnych na OpenRouter
// Zalecane: "anthropic/claude-instant-1" (darmowy) lub "qwen/qwen3-235b-a22b" (najlepszy)
const MODEL_AI = "anthropic/claude-instant-1";

export {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  GOOGLE_API_KEY,
  GOOGLE_CX,
  GOOGLE_API_URL,
  MODEL_AI,
};
