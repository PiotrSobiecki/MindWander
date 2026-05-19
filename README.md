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

### 2. Konfiguracja

```bash
cp src/config.ts_example.ts src/config.ts
```

Edytuj `src/config.ts`:

| Zmienna | Skąd wziąć |
|---------|------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `BRAVE_API_KEY` | [brave.com/search/api](https://brave.com/search/api/) → dashboard → API key |

`OPENAI_API_URL`, `BRAVE_API_URL` i `MODEL_AI` zostaw jak w przykładzie, chyba że chcesz inny model OpenAI.

Plik `src/config.ts` jest w `.gitignore` — **nie commituj kluczy**.

### 3. Build

```bash
npm run build
```

### 4. Weryfikacja API (opcjonalnie)

```bash
npm run test:apis
```

Powinny przejść: OpenAI (chat), Brave Search, pełny pipeline `getSuggestions`.

### 5. Załaduj wtyczkę

- Chrome: `chrome://extensions/`
- Brave: `brave://extensions/`

Włącz **Tryb dewelopera** → **Wczytaj rozpakowane** → wybierz folder **`dist`** (nie `src`).

## Użytkowanie

MindWander działa w tle na stronach z treścią. Po załadowaniu strony (zwykle po **10–30 s**) może pojawić się sugestia w prawym dolnym rogu. Ikona rozszerzenia otwiera popup z ostatnimi sugestiami i przełącznikiem włącz/wyłącz.

Każda sugestia zawiera tytuł, opis powiązania i link do źródła.

**Uwaga:** na tej samej domenie sugestie są ograniczone częstotliwością (ok. 90 min między analizami) — do testów użyj nowej strony lub domeny.

## Rozwój

```bash
npm run watch
```

Po zmianach w TypeScript uruchom ponownie `npm run copy-files` lub pełne `npm run build`.

```bash
npm run validate   # sprawdza dist/ (manifest, importy, host_permissions)
npm run test:apis  # testy OpenAI + Brave
```

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `npm run build` | ikony + kompilacja TS + kopiowanie manifestu i HTML |
| `npm run watch` | kompilacja TS w trybie watch |
| `npm run test:apis` | test kluczy API |
| `npm run validate` | walidacja zbudowanej wtyczki w `dist/` |

## Licencja

MIT — zobacz plik LICENSE.

## Autor

Piotr Sobiecki

## Inspiracja

Koncepcja **serendipity** — wartościowe odkrycia, których się nie szukało — oraz przełamywanie baniek filtrujących w internecie.
