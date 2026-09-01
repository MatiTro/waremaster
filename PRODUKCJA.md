# Uruchomienie na serwerze firmowym

## Wersja gotowa do wdrożenia teraz

Aktualna aplikacja jest statycznym interfejsem webowym. Dział IT może umieścić
zawartość katalogu `www` z paczki serwerowej na IIS, Nginx, Apache lub innym
firmowym serwerze plików WWW. Nie trzeba uruchamiać Node.js na serwerze, jeśli
publikowana jest już skompilowana zawartość `www`.

Wymagane są:

- wewnętrzny adres DNS, np. `warehouse.masterpress.local`,
- HTTPS z certyfikatem zaufanym przez tablety i komputery,
- dostęp z sieci magazynowej,
- ustawienie `index.html` jako dokumentu domyślnego,
- wyłączenie długiego cache dla `index.html`, aby aktualizacje były widoczne.

HTTPS pozostaje zalecany dla ochrony danych i przyszłych funkcji urządzeń.
VIKI jest celowo wyłączona w bieżącej wersji interfejsu.

## Ponowne zbudowanie frontendu

Jeżeli dział IT chce zbudować aplikację ze źródeł:

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run lint
npm.cmd run build:static
```

Gotowe pliki pojawią się w katalogu `docs`. Na serwer należy opublikować jego
zawartość, a nie pliki `app/*.tsx` ani główny `index.html` projektu.

## Ważne ograniczenie przed podłączeniem bazy

Serwer WWW udostępni tę samą aplikację wszystkim urządzeniom, ale obecnie
rejestr dostaw, pracownicy, grafik, urlopy, praca weekendowa oraz plan mycia są
zapisywane w pamięci konkretnej przeglądarki. Wpis z tabletu A nie pojawi się
jeszcze automatycznie na tablecie B.

Wspólny zapis wymaga backendu i bazy aplikacji. D365 powinien pozostać źródłem
odczytu danych magazynowych; przeglądarki nie powinny łączyć się bezpośrednio z
bazą D365.

## Docelowy etap wielostanowiskowy

Dział IT powinien przygotować:

1. Bazę aplikacji, najlepiej SQL Server zgodny ze standardem firmy.
2. Konto techniczne aplikacji z minimalnymi uprawnieniami.
3. Backend/API dostępny tylko w sieci firmowej przez HTTPS.
4. Widok D365 lub API tylko do odczytu stanów, lokalizacji, NI, materiałów,
   dostawców, partii, ilości i masy.
5. Kopie bezpieczeństwa, retencję logów i monitoring dostępności.

Zakres rekordów i proponowanych endpointów opisuje `INTEGRACJA_DANYCH.md`.
