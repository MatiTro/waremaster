# Warehouse Masterpress — przekazanie do wdrożenia

## Co zawiera paczka

- `www/` — gotowa, skompilowana aplikacja do publikacji na serwerze WWW,
- `source/` — kod źródłowy potrzebny do kolejnych aktualizacji,
- `IIS-web.config.example` — minimalny przykład dla IIS,
- `nginx-warehouse.conf.example` — przykład konfiguracji Nginx,
- dokumentację uruchomienia oraz integracji danych.

## Najprostsze uruchomienie testowe w sieci firmowej

1. Utworzyć wewnętrzną witrynę, np. `https://warehouse.masterpress.local`.
2. Skopiować **zawartość** katalogu `www` do katalogu głównego witryny.
3. Ustawić `index.html` jako dokument domyślny.
4. Dodać certyfikat HTTPS zaufany przez tablety i komputery.
5. Ograniczyć dostęp do odpowiednich sieci firmowych.
6. Dla `index.html` ustawić brak długiego cache; pliki z katalogu `assets`
   mogą być buforowane długoterminowo, ponieważ mają wersję w nazwie.

Do samego pilotażu interfejsu nie jest wymagany proces Node.js ani pulpit
zdalny dla użytkowników. Administrator potrzebuje zwykłego dostępu serwisowego
do konfiguracji hostingu, certyfikatu i logów.

## Kontrola po wdrożeniu

- strona otwiera się z laptopa i tabletu pod jednym adresem,
- logo i ikony są widoczne, a konsola nie zgłasza błędów 404 dla `assets`,
- PDF grafiku ma jedną stronę A4 w poziomie na każdy zespół pracowników,
- przełącznik rozdziela magazyn surowców i wyrobów gotowych,
- po aktualizacji `index.html` użytkownik otrzymuje nową wersję strony.

## Dane wspólne dla wszystkich urządzeń

Aktualny pakiet można od razu opublikować do testów, ale wpisy operacyjne są
jeszcze lokalne dla przeglądarki. Aby grafik, urlopy, dostawy i karty mycia były
aktualne na każdym urządzeniu, potrzebne są:

- firmowa baza aplikacji (preferowany SQL Server, jeżeli jest standardem IT),
- bezpieczne API aplikacji,
- konto techniczne aplikacji,
- wewnętrzny DNS i HTTPS,
- kopie zapasowe i logowanie błędów.

Do własnej bazy aplikacji będą zapisywane co najmniej: pracownicy, przypisania
zmian, godziny indywidualne, urlopy, praca weekendowa, dostawy oraz
odpowiedzialność za mycie. Widok z D365 powinien być tylko źródłem odczytu danych
magazynowych i ładunków.

## Informacje potrzebne od działu IT do następnego etapu

- system i sposób hostowania: IIS/Windows, Nginx/Linux lub firmowa platforma,
- docelowa nazwa DNS i sposób wydania certyfikatu,
- nazwa instancji oraz bazy SQL przeznaczonej dla aplikacji,
- sposób uwierzytelnienia konta technicznego,
- adres i schemat przygotowanego widoku D365 albo API,
- zasady kopii zapasowych, logów i dostępu z sieci magazynowej.

Nie należy przesyłać haseł w wiadomości ani wpisywać ich do plików ZIP. Sekrety
powinny zostać ustawione dopiero na serwerze w firmowym magazynie sekretów lub
zmiennych środowiskowych.
