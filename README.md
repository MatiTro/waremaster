# Warehouse Masterpress

Firmowy prototyp aplikacji magazynowej Masterpress do:

- raportowania dostaw,
- kontrolowania palet w magazynach A i B,
- analizowania zapasu według rodzaju surowca,
- przeglądania i filtrowania historii dostaw.

## Uruchomienie na Windows

### Wymagania

- Node.js `22.13.0` lub nowszy; zalecany Node.js 24 LTS
- npm instalowany razem z Node.js

### Start

1. Rozpakuj archiwum.
2. Otwórz PowerShell w katalogu projektu.
3. Zainstaluj zależności:

   ```powershell
   npm.cmd install
   ```

4. Uruchom aplikację:

   ```powershell
   npm.cmd run dev
   ```

5. Otwórz adres pokazany w terminalu, standardowo:

   ```text
   http://localhost:5173
   ```

Użycie `npm.cmd` omija blokadę uruchamiania skryptu `npm.ps1`, często
włączoną na komputerach firmowych. Zatrzymanie aplikacji: `Ctrl+C`.

## Ważne informacje

- Dane w tej wersji są demonstracyjne.
- Dodanie dostawy aktualizuje liczniki i statystyki w bieżącej sesji.
- Odświeżenie strony przywraca dane początkowe.
- Trwały zapis będzie wymagał podłączenia bazy danych.

## Najważniejsze pliki

- `app/page.tsx` — interfejs i logika aplikacji
- `app/globals.css` — firmowy wygląd i responsywność
- `public/masterpress-logo-white.png` — logo na ciemnym tle
- `public/masterpress-logo-dark.png` — logo na jasnym tle
- `public/masterpress-mark.png` — sygnet i ikona aplikacji
- `package.json` — zależności i polecenia uruchomieniowe
