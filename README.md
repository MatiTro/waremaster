# Warehouse Masterpress · Projekt 02

Wersja do testów na GitHub Pages, 1 października 2026.

## Wgranie

1. Otwórz obecne repozytorium. Nie usuwaj go.
2. Prześlij zawartość tego folderu, przede wszystkim **cały folder docs**.
3. W **Settings → Pages** pozostaw **Deploy from a branch → main → /docs**.
4. Zaczekaj na zakończenie publikacji w Actions i odśwież stronę (Ctrl+F5).

Na dole aplikacji zobaczysz **GitHub · projekt 02 · 01.10.2026**.
Pliki w `docs` są już skompilowane. Zwykła aktualizacja strony nie wymaga npm ani ręcznej kompilacji.

## Zmiany

- Wspólny Start obu magazynów: podsumowanie dnia, ważne sprawy, szybkie działania, pojemność i zespół.
- Jaśniejsze menu, pogrupowane moduły i wyraźny wybór magazynu na dole.
- Czytelna Tablica zmianowa: większe teksty, przyciski Rozpocznij/Zakończ/Cofnij.
- Układ dostosowany do ekranów komputera, tabletu i telefonu.
- VIKI nie jest dostępna ani uruchamiana w tym wydaniu. Jej kod pozostaje zachowany do osobnego projektu.
- Bez przykładowych rekordów. Dotychczasowe klucze danych i logowania pozostają te same.

## Dostęp testowy

Lider: `lider` / `lider`  
Magazynier: `magazynier` / `magazynier`

Magazynier rozpoczyna pracę na Tablicy i zachowuje dotychczasowy zakres modułów.
Dane tej wersji zapisują się w przeglądarce; nie synchronizują się między urządzeniami.
Nie wpisuj poufnych danych do publicznej wersji testowej. Wersja serwerowa ma osobny pakiet i mechanizm logowania.

## Kod źródłowy

Źródła są w `app`, zasoby w `public`. `docs` zawiera wynik kompilacji.
Do lokalnych zmian potrzebujesz Node zgodnego z `package.json`:

```text
npm.cmd ci
npm.cmd run dev:local
```

Po zmianie kodu wykonaj `npm.cmd run build:static` i prześlij nowy folder `docs`.
Nie uruchamiaj źródłowego `index.html` dwuklikiem.

## Sprawdzenie

Kompilacja statyczna, TypeScript oraz 21 istniejących testów modułów zakończyły się poprawnie.
Nie wykonano wizualnego testu w przeglądarce podczas przygotowania tego wydania.
Do odbioru: zalogować obie role, przełączyć magazyn, dodać wpis i zmienić jego status,
sprawdzić mapę oraz grafik na tablecie w obu orientacjach.
