# VIKI — lokalny słownik pytań magazynowych

VIKI działa lokalnie, bez modelu AI i bez płatnego API. Rozpoznaje sens pytania na
podstawie słownika, odmian, wariantów wymowy oraz dopasowania podobnych wyrazów.

## Jak działa czuwanie

1. Kliknij mały przycisk „VIKI” w prawym dolnym rogu. Zielona kropka oznacza czuwanie.
2. Powiedz samo „VIKI” i poczekaj na krótkie „Słucham”.
3. Dopiero wtedy wypowiedz całe polecenie normalnym tempem.

Moduł nie pokazuje czatu, transkrypcji ani podpowiedzi. Odpowiedzi są wyłącznie
głosowe, a ponowne kliknięcie przycisku wyłącza czuwanie.

Nasłuchiwanie jest rozdzielone na osobne fazy. Kiedy VIKI mówi, mikrofon
rozpoznawania jest wyłączony, dzięki czemu asystentka nie odpowiada sama sobie.
W fazie czuwania wszystkie rozmowy bez hasła są ignorowane. Na urządzeniach,
które zapisują krótkie „VIKI” jako samą kropkę, dokładnie taki samotny znak jest
akceptowany wyłącznie jako hasło aktywujące — nigdy jako polecenie.

VIKI zbiera wyniki częściowe i uruchamia komendę dopiero po zakończeniu zdania.
Jeżeli rozpoznawanie zwróci tylko początek, np. „gdzie”, asystentka czeka dalej
zamiast natychmiast odpowiadać „powtórz”.

## Wiedza o magazynach i regałach

VIKI pobiera strukturę bezpośrednio z tej samej konfiguracji, z której powstaje
mapa. Zna Magazyn główny, Nowy magazyn, bloki M1–M3 oraz wszystkie 49 regałów.

- „VIKI, opowiedz o Magazynie głównym.”
- „VIKI, ile regałów ma Nowy magazyn?”
- „VIKI, porównaj oba magazyny.”
- „VIKI, opisz blok M2.”
- „VIKI, pokaż M3 regał 10.”
- „VIKI, ile wolnych miejsc ma M1 regał 21?”
- „VIKI, ile poziomów ma regał B?”
- „VIKI, czy M2 regał 11 ma balkon?”
- „VIKI, który regał ma najwięcej wolnych miejsc?”
- „VIKI, który regał jest najbardziej zapełniony w M3?”

Po wskazaniu regału działa kontekst rozmowy:

- „A ile tam jest wolnych?”
- „Ile ma poziomów?”
- „Czy ma balkon?”
- „Pokaż go na mapie.”

Oznaczenia można mówić naturalnie. Przykładowo „regał B” może zostać zapisany
jako „regał be”, a „M3” jako „em trzy”. Oba warianty są rozpoznawane.

## Dialog przy przyjęciu dostawy

VIKI nie wymaga podawania wszystkich informacji w jednym zdaniu. Zapamiętuje
odpowiedzi w ramach bieżącej dostawy.

> Magazynier: „VIKI, mam dostawę.”  
> VIKI: „Ile palet przyjechało i do którego magazynu: głównego czy nowego?”  
> Magazynier: „30 palet na Nowy magazyn.”  
> VIKI: „Jaki to dostawca lub surowiec i ile waży jedna paleta?”  
> Magazynier: „Raflatac, 800 kilo.”  
> VIKI: „Proponuję regał M2-03. Pokazuję na mapie.”

Krótkie odpowiedzi „30”, „Nowy”, „Raflatac” i „800” również są rozumiane,
jeżeli wynikają z poprzedniego pytania.

Magazyn pracy można ustawić poleceniem głosowym:

- „VIKI, pracuję na Nowym magazynie.”
- „VIKI, ustaw Magazyn główny.”
- „VIKI, zmień magazyn pracy na Nowy.”

Po ustawieniu magazynu VIKI używa go domyślnie dla kolejnych dostaw. Można też
powiedzieć „VIKI, pytaj o magazyn”, aby przy każdej nowej dostawie poprosiła o
magazyn docelowy. Odpowiedzi głosowe są celowo krótkie.

## Proponowanie miejsca

- „VIKI, gdzie odłożyć 12 palet papieru od Raflatac po 800 kilo?”
- „VIKI, do którego regału dać dostawę Avery?”
- „VIKI, znajdź miejsce na folię od Klockner.”
- „VIKI, zaproponuj miejsce dla 6 palet tulei.”
- „VIKI, gdzie może iść ta dostawa?”

Jeżeli brakuje dostawcy, surowca albo masy, VIKI dopyta. W krótkim oknie po
pytaniu można odpowiedzieć bez ponownego hasła.

## Reguły dostawców, surowców i masy

- „VIKI, jakie regały są dla Raflatac?”
- „VIKI, gdzie trzymamy Avery?”
- „VIKI, czy regał B przyjmie 1050 kilogramów?”
- „VIKI, jaki jest udźwig regału B?”
- „VIKI, gdzie można składować folię?”
- „VIKI, na które regały może jechać Klockner?”

## Wolne miejsca i mapa

- „VIKI, gdzie jest najwięcej wolnych miejsc?”
- „VIKI, ile miejsca zostało?”
- „VIKI, pokaż wolny regał.”
- „VIKI, otwórz mapę magazynu.”
- „VIKI, czy wybrana lokalizacja jest wolna?”
- „VIKI, co znajduje się w tym miejscu?”

## Numery identyfikacyjne i zapasy

- „VIKI, jakie NI są na tej lokalizacji?”
- „VIKI, odczytaj numery identyfikacyjne.”
- „VIKI, jaki jest stan magazynu?”
- „VIKI, ile mamy palet?”
- „VIKI, pokaż raport zapasów.”

## Dostawy, raporty i kody

- „VIKI, ile dostaw było w tym miesiącu?”
- „VIKI, ile dostaw było od Avery?”
- „VIKI, pokaż miesięczny raport dostaw.”
- „VIKI, otwórz listę dostaw.”
- „VIKI, otwórz generator kodów.”
- „VIKI, zgłoś brak ładunku do logistyki.”

## Grafik i karty mycia

- „VIKI, pokaż grafik zmian.”
- „VIKI, otwórz listę pracowników.”
- „VIKI, pokaż zaplanowane urlopy.”
- „VIKI, otwórz kartę mycia.”
- „VIKI, pokaż grafik sprzątania.”

## Warianty rozpoznawania dostawców

- Raflatac: `raflatak`, `raf tak`, `raf latak`, `raf latek`, `raf latac`.
- Klockner: `klokner`, `klekner`, `kloeckner`.
- Avery: `awery`, `averi`, `aweri`, `ewery`.
- Itochu: `itoczu`, `ito czu`, `itociu`.
- Liveo: `liweo`, `li veo`, `liwio`.
- Far Eastern: `far ist`, `faristern`, `far istern`.
- Jinda: `dzinda`, `zinda`, `żinda`, `dżinda`.
- Magzew: `mak zew`, `mag zew`, `makzew`.
- Andersa: `anders`, `andersa kleje`.

Nowe warianty można dopisywać w `app/viki-dictionary.ts`. Najlepszym źródłem
będą rzeczywiste błędne zapisy widoczne w polu „Usłyszałam” podczas testów.
