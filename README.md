# Warehouse Masterpress

Firmowa aplikacja magazynowa Masterpress do:

- raportowania dostaw surowców i planowania wysyłek wyrobów gotowych,
- obsługi dwóch niezależnych magazynów w jednym portalu,
- analizowania zapasu według rodzaju surowca lub wyrobu,
- ręcznego liczenia palet według siedmiu rodzajów surowca,
- przeglądania i filtrowania historii dostaw,
- generowania kodów tylko dla prawidłowych lokalizacji,
- układania grafiku zmian i planowania urlopów,
- przekazywania zadań, komunikatów i problemów między zmianami,
- pobierania roboczych wzorów CMR i WZ,
- tworzenia i drukowania kart mycia w PDF-ie.

## Konta testowe GitHub Pages

- lider: login `lider`, hasło `lider` — dostęp do wszystkich modułów,
- magazynier: login `magazynier`, hasło `magazynier` — mapa, dostawy lub
  wysyłki, dokumentacja, tablica zmianowa i kody kreskowe w magazynie surowców.

Konto magazyniera po zalogowaniu otwiera Tablicę zmianową. To demonstracyjny
podział widoków w statycznej stronie GitHub Pages, a nie docelowe zabezpieczenie
danych. Prawdziwe uwierzytelnianie i uprawnienia wymagają części serwerowej.

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

- Portal ma dwa niezależne obszary: magazyn surowców oraz magazyn wyrobów
  gotowych. Każdy ma własne menu, widoki, grafik, tablicę zmianową i kartę mycia.
- Oba obszary korzystają obecnie z czytelnego widoku całego regału A–G,
  odpowiadającego układowi magazynu głównego. Dane każdego obszaru pozostają
  rozdzielone i mogą później otrzymać niezależne mapowanie z bazy.
- Aplikacja startuje bez fikcyjnych zapasów, dostawców, dostaw i numerów NI.
- Do czasu integracji stan lokalizacji jest oznaczony jako „Brak danych”, a nie
  jako wolny lub zajęty.
- Rejestr dostaw i kartoteka dostawców są zachowywane lokalnie w przeglądarce.
- Lista pracowników, grafik, urlopy i odpowiedzialność za sprzątanie są również
  zachowywane lokalnie do czasu podłączenia wspólnej bazy danych.
- Grafik pozwala ręcznie przypisać pracownika do całego zakresu dat albo
  pojedynczego dnia oraz wpisać zmianę 1–3 lub indywidualne godziny, również
  przechodzące przez północ.
- Licznik „dni ze zmianą” pokazuje unikalne daty kalendarzowe, podgląd
  poprzedniego miesiąca pomaga w planowaniu, a zapisane wersje trafiają do
  osobnej historii każdego magazynu.
- Praca weekendowa ma osobną listę, a kolizje z urlopem i komunikaty o obsadzie
  są oznaczone na czerwono.
- Wydruk grafiku ma układ poziomy i pełnostronicową tabelę: dni są w wierszach,
  a pracownicy w kolumnach. Nagłówek jednoznacznie wskazuje magazyn surowców
  albo magazyn wyrobów gotowych, a całe wiersze sobót i niedziel są szare.
- Tablica zmianowa przechowuje osobno dla każdego magazynu zadania, komunikaty
  i problemy wraz z priorytetem, odpowiedzialną osobą, terminem i statusem.
- Moduł Dokumentacja udostępnia robocze wzory CMR oraz WZ w formacie PDF.
  CMR korzysta z 24-polowego układu modelu IRU 2007 i nie zawiera logo firmy,
  a WZ jest przygotowane do czytelnego wydruku czarno-białego.
- Moduł Lista palet jest dostępny wyłącznie w magazynie surowców. Rozróżnia
  wartość `0` od rodzaju jeszcze niepoliczonego, automatycznie sumuje palety,
  zapisuje miesiąc, osobę, uwagi i historię pomiarów.
- VIKI jest dostępna jako mały przycisk mikrofonu bez panelu czatu. Po ręcznym
  włączeniu czuwa na hasło „VIKI” i korzysta z lokalnego słownika poleceń.
- Karta mycia obsługuje formularze F-02a, F-02b i F-02c dla magazynu surowców
  oraz magazynu wyrobów gotowych i generuje wydruk PDF.
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
