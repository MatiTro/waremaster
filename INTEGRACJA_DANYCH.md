# Kontrakt integracji danych

Aplikacja powinna łączyć się z własnym backendem. Przeglądarka na tablecie nie
powinna wykonywać bezpośrednich zapytań do bazy D365.

## Podział odpowiedzialności

- D365 lub przygotowany widok SQL: źródło stanów, lokalizacji, NI, produktów,
  partii i struktur pakowania.
- Backend Warehouse Masterpress: synchronizacja, walidacja, historia, reguły i
  bezpieczne API.
- Aplikacja webowa: mapa, raporty, kody, rejestr dostaw i VIKI.

Rejestr dostaw pozostaje niezależny od D365. Może znajdować się w tej samej
bazie aplikacji, ale zapis dostawy nie może automatycznie zmieniać zapasu.

## Minimalne dane magazynowe

Każdy rekord zajętej lokalizacji powinien zawierać:

```json
{
  "warehouse": "main",
  "block": null,
  "rack": "B",
  "column": 5,
  "level": 2,
  "place": 7,
  "locationCode": "B.05.07",
  "occupied": true,
  "licensePlateId": "LP0008471",
  "itemId": "SUROWIEC-001",
  "itemName": "Papier przykładowy",
  "itemAlias": "PAPIER",
  "batchId": "PARTIA-01",
  "quantity": 1,
  "weightKg": 850,
  "supplier": "Raflatac",
  "materialType": "Papier",
  "updatedAt": "2026-08-08T12:00:00Z"
}
```

`materialType` może być wyliczany w backendzie na podstawie numeru pozycji,
nazwy lub aliasu według reguły ustalonej z biznesem.

## Minimalne operacje API

- `GET /api/warehouse/snapshot` — stany i zajętość obu magazynów,
- `GET /api/locations` — lokalizacje wraz z NI i zawartością,
- `GET /api/loads/search?loadId=...` — struktura pakowania ładunku,
- `GET /api/loads/search?purchaseOrder=...` — wyszukiwanie po zamówieniu,
- `GET /api/loads/search?supplier=...` — wyszukiwanie po dostawcy,
- `GET/POST/PUT/DELETE /api/deliveries` — niezależny rejestr dostaw,
- `GET/POST/PUT/DELETE /api/employees` — lista pracowników,
- `GET/POST/PUT/DELETE /api/schedule` — zmiany i indywidualne godziny pracy,
- `GET/POST/PUT/DELETE /api/leaves` — planowane urlopy,
- `GET/POST/PUT/DELETE /api/weekend-assignments` — praca weekendowa,
- `GET/POST/PUT/DELETE /api/cleaning-responsibilities` — odpowiedzialność za
  karty mycia,
- `GET/POST/PUT /api/rules` — dostawcy, surowce, masa i dozwolone regały.

## Późniejsza obsługa telewizora

Kanał tablet → telewizor powinien przechowywać kolejkę poleceń z identyfikatorem
lokalizacji, czasem wysłania, nadawcą, terminem ważności i statusem realizacji.
Transport można wykonać przez WebSocket albo Server-Sent Events po doprecyzowaniu
sprzętu oraz sposobu pracy telewizora.
