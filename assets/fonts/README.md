# Czcionki

Pliki trzymane lokalnie, żeby strona nie ładowała niczego z obcych serwerów.

| Czcionka | Pliki | Użycie |
|---|---|---|
| Newsreader 400, prosta i kursywa | `newsreader-latin-*.woff2`, `newsreader-latin-ext-*.woff2` | nagłówki, monogram |
| IBM Plex Mono 400 | `ibm-plex-mono-latin-*.woff2`, `ibm-plex-mono-latin-ext-*.woff2` | etykiety, tagi, nawigacja |

- **Źródło:** paczki Fontsource `@fontsource/newsreader` i `@fontsource/ibm-plex-mono`, wersja 5.3.0,
  pobrane 2026-11-15 z `https://cdn.jsdelivr.net/fontsource/fonts/`.
- **Licencja:** SIL Open Font License 1.1 (pole `license: OFL-1.1` w `package.json` obu paczek).
  Pełny tekst licencji: https://openfontlicense.org/open-font-license-official-text/
- **Zestawy znaków:** `latin` (podstawowe) i `latin-ext` (m.in. polskie znaki). Zakresy `unicode-range`
  w `assets/css/style.css` są przepisane z plików CSS tych paczek.

Licencja OFL wymaga, żeby razem z czcionkami był rozpowszechniany jej tekst i nota o prawach
autorskich. Są w plikach `OFL-newsreader.txt` i `OFL-ibm-plex-mono.txt`, pobranych 16.11.2026
z `github.com/google/fonts` (`ofl/newsreader/OFL.txt`, `ofl/ibmplexmono/OFL.txt`).
