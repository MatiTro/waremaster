# Warehouse Masterpress · Projekt 04

Poprawiona wersja do testów na GitHub Pages, 2 października 2026.

## Aktualizacja

1. Rozpakuj ZIP i otwórz folder `Warehouse-Masterpress`.
2. Wgraj jego zawartość do obecnego repozytorium, **w tym cały folder docs**.
3. W **Settings → Pages** zachowaj **Deploy from a branch → main → /docs**.
4. Poczekaj na ukończenie publikacji w Actions, następnie odśwież **Ctrl+F5**.

Nie wgrywaj samego ZIP-a ani folderu nadrzędnego. Nie musisz usuwać repozytorium ani czyścić danych przeglądarki.
Na dole aplikacji powinien pojawić się napis **GitHub · projekt 04 · 02.10.2026**.
Folder `docs` zawiera gotową aplikację; do wgrania tej wersji nie potrzeba npm.

## Co poprawiono

- **Logowanie:** nowy układ na pełnym tle magazynu, duża typografia, jasna karta formularza, kompaktowe przyciski kont testowych i pokazywanie/ukrywanie hasła.
- **Lista palet, grafik i karta mycia:** poprawiony wspólny odczyt danych. Start mógł zapamiętać `null` dla pustej listy pracowników, a następnie przekazać tę wartość do modułów wymagających tablicy. Cache przechowuje teraz odczytaną wartość, a każdy odbiorca otrzymuje własną wartość domyślną, gdy danych brak. Odczyt nie nadpisuje istniejących zapisów.
- **Menu:** przezroczyste tło aktywnych ikon w obu obszarach, bez jasnego kwadratu i obwódki.
- **Start:** mapa i pojemność w jednym panelu; dostawy i dzienne podsumowanie w jednym miejscu; cztery szybkie działania; pojedyncza tablica zadań oraz podgląd grafiku. Usunięto osobne liczniki zadań i dodatkową sekcję pojemności.

Konta, uprawnienia i klucze zapisanych danych są zachowane. VIKI pozostaje wyłączona. Nie dodano przykładowych rekordów.
Dekoracyjny rysunek regałów nie pokazuje zajętości. Dane stanów i wysyłek nadal wymagają podłączenia źródła danych.

## Konta testowe

- Lider: `lider` / `lider` — Start i wszystkie moduły.
- Magazynier: `magazynier` / `magazynier` — dotychczasowy zakres modułów, początek na Tablicy.

Przyciski na ekranie logowania uzupełniają dane wybranej roli; następnie kliknij **Przejdź do magazynu**.
Dane GitHub Pages zapisują się lokalnie w przeglądarce. Docelowe logowanie i synchronizacja wymagają wersji serwerowej.

## Weryfikacja

- TypeScript i kompilacja GitHub Pages: poprawnie.
- 26 testów: poprawnie, w tym 5 nowych testów odczytu lokalnych danych.
- Nowy test odtworzył błąd starej wersji; po poprawce przechodzi dla obu obszarów.
- Dodatkowo sprawdzono generowanie HTML: lista palet oraz grafik, karta mycia i Start dla obu obszarów (7 przypadków).
- Kontrola wizualna i interakcje w przeglądarce nie zostały wykonane — lokalny podgląd zablokowała polityka przeglądarki. Testy HTML nie zastępują takiej kontroli.

## Kod źródłowy

Źródła: `app`. Zasoby: `public`. Gotowy build: `docs`.
Nowe logowanie: `app/portal-design.css` i komponent `LoginScreen` w `app/page.tsx`.
Start: `app/operations-home.tsx` i `app/home-refresh.css`.
Naprawa danych: `app/shared-storage.ts`; regresja: `tests/local-storage.test.mjs`.

Do własnych zmian użyj Node zgodnego z `package.json`:

```text
npm.cmd ci
npm.cmd run dev:local
npm.cmd run check
npm.cmd test
npm.cmd run build:static
```

Po zmianach prześlij również nowy `docs`. Nie otwieraj źródłowego `index.html` dwuklikiem.
