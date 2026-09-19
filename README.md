# MindWander

Rozszerzenie do przeglądarki (Chrome, Brave, Edge), które analizuje przeglądaną stronę i proponuje nieoczywiste, inspirujące treści powiązane z tym, co właśnie czytasz — zamiast pogłębiać bańkę informacyjną.

## Funkcje

- **Analiza zawartości strony** — rozpoznawanie głównej treści i słów kluczowych
- **Kreatywne wyszukiwanie** — OpenAI generuje nieoczywiste zapytanie na podstawie kontekstu
- **Wyniki z sieci** — [Brave Search API](https://brave.com/search/api/) dostarcza strony do wyboru
- **Sugestia serendipity** — AI wybiera jeden wynik i opisuje zaskakujące powiązanie z Twoją stroną
- **Nieinwazyjny UI** — popup w prawym dolnym rogu, powiadomienia, przełącznik w popupie rozszerzenia

## Technologie

- TypeScript, Chrome Extensions API (Manifest V3)
- [OpenAI API](https://platform.openai.com/) (`gpt-4o-mini` domyślnie)
- [Brave Search API](https://brave.com/search/api/) zamiast Google Custom Search JSON API

> **Dlaczego Brave, a nie Google?**  
> Google Custom Search JSON API nie jest już dostępne dla nowych projektów (deprecacja, migracja do 2027). Konsola GCP może nadal pokazywać API jako „włączone”, ale zapytania zwracają 403. Brave ma darmowy tier (~2000 zapytań/miesiąc) i prostszą konfigurację (sam klucz API).

## Wymagania

- Node.js i npm
- Przeglądarka Chromium (Chrome, Brave, Edge)
- Klucz [OpenAI](https://platform.openai.com/api-keys)
- Klucz [Brave Search](https://brave.com/search/api/)

## Instalacja

### 1. Repozytorium i zależności

```bash
git clone https://github.com/PiotrSobiecki/MindWander.git
cd MindWander
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Załaduj wtyczkę

- Chrome: `chrome://extensions/`
- Brave: `brave://extensions/`

Włącz **Tryb dewelopera** → **Wczytaj rozpakowane** → wybierz folder **`dist`** (nie `src`).

### 4. Klucze API

Klucze nie są częścią kodu. Otwórz opcje rozszerzenia (ikona wtyczki → *Klucze API i model*) i wklej tam swoje:

| Klucz | Skąd wziąć |
|-------|------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Brave Search | [brave.com/search/api](https://brave.com/search/api/) → dashboard → API key |

Klucze trafiają do `chrome.storage.local` w profilu tej przeglądarki. Nigdzie ich nie commitujesz i nie ma ich w zbudowanej paczce — skompilowane rozszerzenie leży na dysku w postaci jawnej, więc klucz wpisany do źródeł byłby kluczem opublikowanym. Do czasu wpisania kluczy wtyczka nie wykona żadnego zapytania i powie o tym w popupie.

### 5. Weryfikacja API (opcjonalnie)

```bash
OPENAI_API_KEY=... BRAVE_API_KEY=... npm run smoke:apis
```

Skrypt czyta klucze ze zmiennych środowiskowych i sprawdza, czy oba API odpowiadają.

## Użytkowanie

MindWander działa w tle na stronach z treścią. Po załadowaniu strony (zwykle po **10–30 s**) może pojawić się sugestia w prawym dolnym rogu. Ikona rozszerzenia otwiera popup z ostatnimi sugestiami i przełącznikiem włącz/wyłącz.

Każda sugestia zawiera tytuł, opis powiązania i link do źródła.

**Uwaga:** na tej samej domenie sugestie są ograniczone częstotliwością (ok. 90 min między analizami) — do testów użyj nowej strony lub domeny.

### Czego wtyczka nie czyta

Bankowość, poczta, strony administracji, adresy w sieci lokalnej i każda strona z widocznym polem hasła są pomijane — treść stamtąd nie trafia do OpenAI. Najostrzejsze przypadki wyklucza `exclude_matches` w manifeście (content script w ogóle się nie wstrzykuje), resztę `src/pageGuard.ts`.

## Rozwój

```bash
npm run watch      # tsc --noEmit w trybie watch
npm run build      # typecheck + bundle + manifest, HTML i ikony do dist/
```

Content script i strony rozszerzenia ładują się jako klasyczne skrypty, więc `tsc` sam nie wystarcza — `npm run bundle` składa je esbuildem do samodzielnych plików IIFE. Service worker zostaje modułem ESM, bo tak deklaruje go manifest.

```bash
npm test             # ujawnienie AI (art. 50), brak innerHTML, format bundli
npm run validate     # sprawdza dist/ (manifest, host_permissions)
npm run smoke:apis   # zapytanie do OpenAI i Brave (klucze z env)
```

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `npm run build` | typecheck + bundle + manifest, HTML i ikony do dist/ |
| `npm run typecheck` | sam TypeScript, bez emisji |
| `npm run bundle` | esbuild: content/popup/options jako IIFE, background jako ESM |
| `npm run validate` | walidacja zbudowanej wtyczki w `dist/` |
| `npm run smoke:apis` | test kluczy API ze zmiennych środowiskowych |

## Licencja

MIT — zobacz plik LICENSE.

## Autor

Piotr Sobiecki

## Inspiracja

Koncepcja **serendipity** — wartościowe odkrycia, których się nie szukało — oraz przełamywanie baniek filtrujących w internecie.
