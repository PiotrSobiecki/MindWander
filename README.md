# MindWander

## Opis projektu

MindWander to rozszerzenie do przeglądarki, które pomaga użytkownikom odkrywać nowe, inspirujące treści wykraczające poza ich zwykłe zainteresowania. W przeciwieństwie do tradycyjnych algorytmów rekomendacji, które pogłębiają bańki informacyjne, MindWander celowo proponuje nieoczywiste, zaskakujące połączenia między tematami, zachęcając do intelektualnej eksploracji i serendipity.

## Funkcje

- **Analiza zawartości strony** - automatyczne rozpoznawanie głównej treści przeglądanej strony
- **Kreatywne wyszukiwanie** - wykorzystanie AI do generowania nieoczywistych zapytań inspirowanych aktualnie przeglądaną treścią
- **Odkrywanie nowych połączeń** - wyświetlanie inspirujących sugestii z różnych dziedzin (nauka, sztuka, filozofia, itp.)
- **Nieinwazyjny interfejs** - delikatne powiadomienia i elegancki popup, który nie zakłóca normalnego przeglądania

## Technologie

- TypeScript
- Chrome Extensions API
- OpenRouter API (dostęp do zaawansowanych modeli AI)
- Google Custom Search API

## Instalacja

### Wymagania

- Node.js i npm
- Przeglądarka oparta na Chromium (Chrome, Edge, itp.)

### Kroki instalacji

1. Sklonuj repozytorium:

```
git clone https://github.com/PiotrSobiecki/MindWander.git
cd MindWander
```

2. Zainstaluj zależności:

```
npm install
```

3. Stwórz plik konfiguracyjny:

```
cp src/config.ts_example.ts src/config.ts
```

4. Edytuj `src/config.ts` i dodaj swoje klucze API:

   - Klucz OpenRouter API lub OPENAI
   - Klucz Google Custom Search API
   - Klucz Google CX

5. Zbuduj rozszerzenie:

```
npm run build
```

6. Zainstaluj rozszerzenie w Chrome:
   - Otwórz `chrome://extensions/`
   - Włącz "Tryb dewelopera"
   - Kliknij "Wczytaj rozpakowane"
   - Wybierz folder `dist` z tego repozytorium

## Użytkowanie

Po zainstalowaniu, MindWander działa w tle podczas przeglądania stron internetowych. Będzie analizować zawartość stron, a następnie prezentować inspirujące sugestie w formie dyskretnego popup'u w prawym dolnym rogu.

Każda sugestia zawiera:

- Tytuł
- Krótki opis wyjaśniający nieoczywisty związek z przeglądaną treścią
- Link do źródła, które można otworzyć w nowej karcie

## Rozwój

Aby pracować nad rozszerzeniem w trybie deweloperskim:

```
npm run dev
```

To uruchomi budowanie w trybie watch, automatycznie rekompilując kod po każdej zmianie.

## Licencja

Ten projekt jest udostępniany na licencji MIT. Zobacz plik LICENSE, aby uzyskać więcej informacji.

## Autorzy

Piotr Sobiecki - twórca projektu

## Źródła inspiracji

Projekt inspirowany koncepcją serendipity - odkrywania wartościowych rzeczy, których się nie szukało - oraz chęcią przełamania baniek filtrujących, które ograniczają naszą ekspozycję na różnorodne treści w internecie.
