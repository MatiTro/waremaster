# Warehouse Masterpress · Projekt 03

Wersja do testów na GitHub Pages, 2 października 2026.

## Wgranie

1. Rozpakuj ZIP i otwórz folder `Warehouse-Masterpress`.
2. Prześlij zawartość tego folderu do obecnego repozytorium, przede wszystkim **cały folder docs**. Nie wgrywaj samego ZIP-a ani folderu nadrzędnego.
3. W **Settings → Pages** pozostaw **Deploy from a branch → main → /docs**.
4. Zaczekaj na zakończenie publikacji w Actions i odśwież stronę (Ctrl+F5).

Na dole aplikacji zobaczysz **GitHub · projekt 03 · 02.10.2026**.
Pliki w `docs` są już skompilowane. Aktualizacja strony nie wymaga npm ani ręcznej kompilacji.
Nie musisz usuwać repozytorium. Dane w tej samej przeglądarce i pod tym samym adresem korzystają z dotychczasowych kluczy zapisu.

## Zmiany

- Jednolicie granatowe menu: logo, moduły, przełącznik obszaru i konto w jednej oprawie. Jasny akcent wskazuje aktywny moduł.
- Nowa strona Start w obu obszarach: główny panel z motywem regałów i wejściem do mapy.
- Osobne podsumowanie dnia z klikalnymi licznikami oraz wyróżnieniem pilnych spraw.
- Cztery szybkie działania, kompaktowe komunikaty przy braku danych i przeprojektowany podgląd pojemności.
- Układy dla komputera, tabletu i telefonu; krótkie animacje respektujące ustawienie ograniczenia ruchu.
- Zachowane funkcje pozostałych modułów, konta, uprawnienia i klucze danych. Bez przykładowych rekordów.
- Motyw regałów na banerze jest dekoracją; rzeczywistą mapę otwiera przycisk. Zajętość oraz wysyłki nadal wymagają podłączenia danych.
- VIKI pozostaje wyłączona.

## Dostęp testowy

Lider: `lider` / `lider` — nowy Start jest widoczny po zalogowaniu.
Magazynier: `magazynier` / `magazynier` — zaczyna na Tablicy zgodnie z dotychczasowym zakresem modułów.
Dane tej wersji zapisują się w przeglądarce; nie synchronizują się między urządzeniami.
Konta GitHub Pages są testowe. Docelowe uwierzytelnianie i ochrona danych wymagają serwera.

## Kod źródłowy

Źródła są w `app`, zasoby w `public`, a `docs` zawiera wynik kompilacji.
Nową warstwę wizualną dodano w `app/home-refresh.css`, stronę Start w `app/operations-home.tsx`.
Do lokalnych zmian potrzebujesz Node zgodnego z `package.json`:

```text
npm.cmd ci
npm.cmd run dev:local
```

Po zmianie kodu wykonaj `npm.cmd run build:static` i prześlij nowy folder `docs`.
Nie uruchamiaj źródłowego `index.html` dwuklikiem.

## Sprawdzenie wydania

- `npm run check` — poprawnie.
- `npm test` — 21/21 poprawnie.
- `npm run build:static` — poprawnie.
- Sprawdzono spójność ZIP-a i lokalne odnośniki w gotowym `docs/index.html`.
- Nie wykonano wizualnego testu w przeglądarce: polityka bezpieczeństwa zablokowała otwarcie lokalnego podglądu.

Po publikacji warto sprawdzić Start na komputerze i tablecie, wejście do mapy,
skróty działań, przełączanie obszaru i rozwijanie menu.
