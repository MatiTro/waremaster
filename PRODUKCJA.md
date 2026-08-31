# Uruchomienie produkcyjne

## Wymagania serwera

- Node.js 24 LTS lub co najmniej 22.13,
- dostęp z sieci magazynowej,
- wewnętrzna nazwa DNS, np. `warehouse.masterpress.local`,
- certyfikat HTTPS,
- reverse proxy IIS, Nginx albo inny mechanizm firmowy,
- usługa uruchamiająca aplikację automatycznie po restarcie serwera.

HTTPS jest istotny na tabletach: przeglądarka może zablokować mikrofon VIKI,
jeżeli aplikacja zostanie otwarta przez zwykły adres `http://adres-ip`.
Wyjątkiem jest uruchomienie na tym samym komputerze przez `localhost`.

## Budowanie wydania

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run start
```

Serwer lub reverse proxy powinien kierować ruch HTTPS do portu aplikacji.
Port można ustawić zgodnie ze standardem działu IT. Nie należy udostępniać
procesu Node bezpośrednio do Internetu.

## Stan przed integracją

- mapy, pojemności i walidacja kodów korzystają z jednego modelu,
- aplikacja uruchamia się z pustym stanem, bez rekordów demonstracyjnych,
- dostawy i kartoteka dostawców zapisują się w pamięci przeglądarki,
- zapis lokalny nie jest współdzielony między tabletami,
- wyszukiwanie ładunków nie generuje wyników do czasu podłączenia źródła danych,
- zajętość miejsc, numery NI i rekomendacje VIKI pozostają niedostępne do czasu
  podłączenia rzeczywistych danych oraz reguł,
- pełne testy wielostanowiskowe należy rozpocząć po podłączeniu bazy aplikacji.

## Zalecane kroki działu IT

1. Przygotować maszynę lub kontener dla aplikacji.
2. Nadać wewnętrzną nazwę DNS i certyfikat HTTPS.
3. Otworzyć dostęp wyłącznie z wymaganych sieci firmowych.
4. Uruchomić aplikację jako usługę z automatycznym restartem.
5. Przygotować kopie bezpieczeństwa bazy po jej podłączeniu.
6. Włączyć logowanie błędów i kontrolę dostępności usługi.

Nie jest wymagany pulpit zdalny dla magazynierów. Administrator powinien mieć
dostęp serwisowy do wdrożenia, konfiguracji i logów.
