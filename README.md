# Warehouse Masterpress

Firmowa aplikacja magazynowa Masterpress do:

- raportowania dostaw,
- kontrolowania palet w magazynach A i B,
- analizowania zapasu według rodzaju surowca,
- przeglądania i filtrowania historii dostaw,
- generowania kodów tylko dla prawidłowych lokalizacji,
- układania grafiku zmian i planowania urlopów,
- tworzenia kart mycia w Wordzie i PDF-ie,
- obsługi głosowego asystenta VIKI.

## Uruchomienie na Windows

### Wymagania

- Node.js `22.13.0` lub nowszy; zalecany Node.js 24 LTS
- npm instalowany razem z Node.js

### Start

1. Rozpakuj archiwum.
2. Kliknij dwukrotnie `URUCHOM_WAREHOUSE.bat`.

Skrypt sprawdzi Node.js, zainstaluje zależności przy pierwszym starcie i otworzy
`http://localhost:5173`. Alternatywnie można użyć terminala:

   ```powershell
   npm.cmd ci --no-audit --no-fund
   ```

4. Uruchom aplikację:

   ```powershell
   npm.cmd run dev:local
   ```

5. Otwórz adres pokazany w terminalu, standardowo:

   ```text
   http://localhost:5173
   ```

Użycie `npm.cmd` omija blokadę uruchamiania skryptu `npm.ps1`, często
włączoną na komputerach firmowych. Zatrzymanie aplikacji: `Ctrl+C`.

## Ważne informacje

- Struktura obu magazynów jest wspólna dla mapy, raportów i generatora kodów.
- Aplikacja startuje bez fikcyjnych zapasów, dostawców, dostaw i numerów NI.
- Do czasu integracji stan lokalizacji jest oznaczony jako „Brak danych”, a nie
  jako wolny lub zajęty.
- Rejestr dostaw i kartoteka dostawców są zachowywane lokalnie w przeglądarce.
- Lista pracowników, grafik, urlopy i odpowiedzialność za sprzątanie są również
  zachowywane lokalnie do czasu podłączenia wspólnej bazy danych.
- Grafik pozwala ręcznie przypisać pracownika do całego zakresu dat albo
  pojedynczego dnia oraz wpisać zmianę 1–3 lub indywidualne godziny, również
  przechodzące przez północ.
- Praca weekendowa ma osobną listę, a kolizje z urlopem i komunikaty o obsadzie
  są oznaczone na czerwono.
- Wydruk grafiku ma układ poziomy i pełnostronicową tabelę: dni są w wierszach,
  a pracownicy w kolumnach.
- VIKI odczytuje zapisany grafik i odpowiada głosowo o obsadzie, zmianach,
  pracownikach, urlopach, weekendach i indywidualnych godzinach.
- Karta mycia obsługuje formularze F-02a, F-02b i F-02c dla magazynu surowców
  oraz magazynu wyrobów gotowych. Dokument Word zawiera aktualne logo firmy.
- Dane lokalne nie są współdzielone między urządzeniami. Wspólny zapis zapewni
  baza aplikacji po wykonaniu integracji.
- Gotowa instrukcja przekazania wdrożenia działowi IT znajduje się w pliku
  `DLA_INFORMATYKA.md`, a szersze uwagi serwerowe w `PRODUKCJA.md`.
- Zakres danych potrzebnych z D365 opisuje `INTEGRACJA_DANYCH.md`.

## Najważniejsze pliki

- `app/page.tsx` — interfejs i logika aplikacji
- `app/warehouse-model.ts` — jedna struktura magazynów i walidacja lokalizacji
- `app/globals.css` — firmowy wygląd i responsywność
- `public/masterpress-logo-white.png` — logo na ciemnym tle
- `public/masterpress-logo-dark.png` — logo na jasnym tle
- `public/masterpress-mark.png` — sygnet i ikona aplikacji
- `package.json` — zależności i polecenia uruchomieniowe
