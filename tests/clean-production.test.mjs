import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);
const modelSource = await readFile(
  new URL("../app/warehouse-model.ts", import.meta.url),
  "utf8",
);
const scheduleSource = await readFile(
  new URL("../app/schedule-module.tsx", import.meta.url),
  "utf8",
);
const cleaningSource = await readFile(
  new URL("../app/cleaning-module.tsx", import.meta.url),
  "utf8",
);
const finishedSource = await readFile(
  new URL("../app/finished-warehouse.tsx", import.meta.url),
  "utf8",
);
const shiftBoardSource = await readFile(
  new URL("../app/shift-board.tsx", import.meta.url),
  "utf8",
);
const documentationSource = await readFile(
  new URL("../app/documentation-module.tsx", import.meta.url),
  "utf8",
);
const palletCountSource = await readFile(
  new URL("../app/pallet-count-module.tsx", import.meta.url),
  "utf8",
);
const documentGeneratorSource = await readFile(
  new URL("../scripts/generate-document-templates.py", import.meta.url),
  "utf8",
);
const indexSource = await readFile(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("wersja produkcyjna nie zawiera startowych rekordów", () => {
  assert.match(pageSource, /const initialDeliveries: Delivery\[\] = \[\];/);
  assert.match(pageSource, /const initialSupplierCatalog: SupplierEntry\[\] = \[\];/);
  assert.match(pageSource, /const placementRules: PlacementRule\[\] = \[\];/);
});

test("wersja produkcyjna nie generuje fikcyjnych ładunków ani zajętości", () => {
  for (const forbidden of [
    "LD-000847",
    "PO-004923",
    "D-0251",
    "Rampa 2",
    "knownLocalResult",
  ]) {
    assert.equal(pageSource.includes(forbidden), false, forbidden);
  }
  assert.equal(modelSource.includes("const seed ="), false);
  assert.match(modelSource, /export const inventoryDataAvailable = false;/);
});

test("VIKI wraca jako mały moduł głosowy bez okna czatu", () => {
  for (const forbidden of [
    'className="voice-assistant-panel"',
    'className="voice-result"',
    'className="voice-examples"',
    "PRZYKŁADOWE POLECENIA",
    "voiceTranscript",
    "voiceAnswer",
  ]) {
    assert.equal(pageSource.includes(forbidden), false, forbidden);
  }
  assert.match(pageSource, /className=\{`voice-assistant-trigger/);
  assert.match(pageSource, /<Mic \/>/);
  assert.match(pageSource, /<span>VIKI<\/span>/);
  assert.match(pageSource, /onClick=\{wakeMode \? stopWakeMode : startWakeMode\}/);
  assert.match(pageSource, /aria-label=\{wakeMode \? "Wyłącz VIKI" : "Włącz VIKI"\}/);
});

test("wersja GitHub Pages rozdziela konto lidera i magazyniera", async () => {
  assert.match(pageSource, /type UserRole = "leader" \| "warehouse_worker"/);
  assert.match(pageSource, /username: "lider"/);
  assert.match(pageSource, /password: "lider"/);
  assert.match(pageSource, /username: "magazynier"/);
  assert.match(pageSource, /password: "magazynier"/);
  assert.match(pageSource, /warehouse-masterpress:test-session:v1/);
  assert.match(pageSource, /const warehouseWorkerViews = new Set<View>/);
  for (const allowed of [
    '"map"',
    '"palletcount"',
    '"deliveries"',
    '"shipments"',
    '"shiftboard"',
    '"documentation"',
    '"barcodes"',
  ]) assert.match(pageSource, new RegExp(allowed));
  assert.match(pageSource, /stored\.role === "warehouse_worker" \? "shiftboard" : "dashboard"/);
  assert.match(pageSource, /className="login-screen"/);
  assert.match(pageSource, /masterpress-login-logo\.png/);
  assert.match(pageSource, /warehouse-login-bg\.svg/);
  assert.match(pageSource, /Magazyn w dobrym/);
  assert.match(pageSource, /<h2>Witaj<\/h2>/);
  assert.match(pageSource, /className="login-capability-strip"/);
  assert.match(pageSource, /<strong>Dostawy<\/strong>/);
  assert.match(pageSource, /<strong>Lokalizacje<\/strong>/);
  assert.match(pageSource, /<strong>Wysyłki<\/strong>/);
  assert.equal(pageSource.includes("Witaj ponownie"), false);
  assert.equal(pageSource.includes("CENTRUM OPERACJI MAGAZYNOWYCH"), false);
  assert.equal(pageSource.includes('className="login-orbit"'), false);
  assert.equal(pageSource.includes('className="login-scan-line"'), false);
  assert.equal(pageSource.includes("przygotowanym do pracy na tablecie"), false);
  assert.match(pageSource, /Warehouse Masterpress/);
  assert.match(pageSource, /Wersja demonstracyjna GitHub Pages/);
  assert.match(pageSource, /className="sidebar-account"/);
  assert.match(pageSource, /Ten moduł jest dostępny na koncie lidera/);
  const loginLogo = await stat(new URL(
    "../public/masterpress-login-logo.png",
    import.meta.url,
  ));
  assert.ok(loginLogo.size > 10_000);
  const warehouseBackdrop = await stat(new URL(
    "../public/warehouse-login-bg.svg",
    import.meta.url,
  ));
  assert.ok(warehouseBackdrop.size > 5_000);
});

test("portal rozdziela magazyn surowców i wyrobów gotowych", () => {
  assert.match(pageSource, /type WarehouseArea = "raw" \| "finished"/);
  assert.match(pageSource, /className="warehouse-area-switcher"/);
  assert.match(pageSource, /const rawNavItems/);
  assert.match(pageSource, /const finishedNavItems/);
  assert.match(pageSource, /id: "shipments"/);
  assert.equal(pageSource.includes("<FinishedMap"), false);
  assert.match(pageSource, /finished-main-map-heading/);
  assert.match(pageSource, /Regały A–G/);
  assert.match(pageSource, /activeView === "map"/);
  assert.match(finishedSource, /Brak zaimportowanych stanów wyrobów/);
  assert.match(finishedSource, /className="command-hero"/);
  assert.match(finishedSource, /Indeksy wyrobów/);
  assert.match(finishedSource, /Palety w blokadzie jakościowej/);
  assert.equal(finishedSource.includes("Partie gotowe do wydania"), false);
  assert.equal(finishedSource.includes('["history", "Historia"]'), false);
  assert.equal(finishedSource.includes("LD-"), false);
});

test("Grafik ma zwarty arkusz, osobne weekendy i profesjonalny wydruk", () => {
  assert.match(pageSource, /id: "schedule"/);
  assert.match(scheduleSource, /safeReadArray<Employee>/);
  assert.equal(scheduleSource.includes("Automat rotacji"), false);
  assert.equal(scheduleSource.includes("Uwzględnij weekendy"), false);
  assert.equal(scheduleSource.includes("shift-add"), false);
  assert.match(scheduleSource, /Praca weekend/);
  assert.match(scheduleSource, /schedule-range-builder/);
  assert.match(scheduleSource, /range-calendar-grid/);
  assert.match(scheduleSource, /schedule-matrix-cell/);
  assert.match(scheduleSource, /effectiveWeekendDate/);
  assert.match(scheduleSource, /Pominięto/);
  assert.match(scheduleSource, /tone: "danger"/);
  assert.match(scheduleSource, /schedule-print-document/);
  assert.match(scheduleSource, /schedule-print-page/);
  assert.match(scheduleSource, /printEmployeeGroups/);
  assert.match(scheduleSource, /Inne godziny/);
  assert.match(scheduleSource, /schedule-custom-hours/);
  assert.match(scheduleSource, /customTo < customFrom/);
  assert.match(scheduleSource, /formatWorkHours/);
  assert.match(scheduleSource, /const scheduledDayCount = new Set\(/);
  assert.match(scheduleSource, /monthlyAssignments\.map\(\(assignment\) => assignment\.date\)/);
  assert.match(scheduleSource, /Poprzedni miesiąc/);
  assert.match(scheduleSource, /Otwórz pełny grafik/);
  assert.match(scheduleSource, /type ScheduleHistoryRecord/);
  assert.match(scheduleSource, /schedule-history:raw:v1/);
  assert.match(scheduleSource, /schedule-history:finished:v1/);
  assert.match(scheduleSource, /Zapisz wersję/);
  assert.match(scheduleSource, /setTab\("history"\)/);
  assert.equal(scheduleSource.includes("WAREHOUSE<br />MASTERPRESS"), false);
  assert.match(scheduleSource, /MAGAZYN<br \/>SUROWCÓW/);
  assert.match(scheduleSource, /MAGAZYN WYROBÓW<br \/>GOTOWYCH/);
  assert.match(globalStyles, /@page workforce-landscape/);
  assert.match(globalStyles, /size: A4 landscape/);
  assert.match(globalStyles, /workforce-module > \*:not\(\.schedule-print-document\)/);
  assert.match(globalStyles, /schedule-print-page tbody tr\.weekend/);
  assert.match(globalStyles, /tbody tr\.weekend td\.custom-hours/);
  assert.match(globalStyles, /background: #d9d9d9 !important/);
  assert.match(globalStyles, /schedule-matrix-cell\.custom-hours/);
});

test("Tablica zmianowa działa osobno dla obu magazynów", () => {
  const occurrences = pageSource.match(/id: "shiftboard"/g) ?? [];
  assert.equal(occurrences.length, 2);
  assert.match(shiftBoardSource, /shift-board:raw:v1/);
  assert.match(shiftBoardSource, /shift-board:finished:v1/);
  assert.match(shiftBoardSource, /Zadanie/);
  assert.match(shiftBoardSource, /Komunikat/);
  assert.match(shiftBoardSource, /Problem/);
  assert.match(shiftBoardSource, /Do zrobienia/);
  assert.match(shiftBoardSource, /W trakcie/);
  assert.match(shiftBoardSource, /Gotowe/);
  assert.equal(shiftBoardSource.includes("const initial"), false);
  assert.match(finishedSource, /ShiftBoardSummary/);
});

test("Dokumentacja udostępnia wzory CMR i WZ w obu obszarach", async () => {
  const occurrences = pageSource.match(/id: "documentation"/g) ?? [];
  assert.equal(occurrences.length, 2);
  assert.match(documentationSource, /Warehouse-Masterpress-wzor-CMR\.pdf/);
  assert.match(documentationSource, /Warehouse-Masterpress-wzor-WZ\.pdf/);
  assert.match(documentationSource, /WZÓR ROBOCZY/);
  const cmr = await stat(new URL(
    "../public/documents/Warehouse-Masterpress-wzor-CMR.pdf",
    import.meta.url,
  ));
  const wz = await stat(new URL(
    "../public/documents/Warehouse-Masterpress-wzor-WZ.pdf",
    import.meta.url,
  ));
  assert.ok(cmr.size > 10_000);
  assert.ok(wz.size > 10_000);
});

test("CMR korzysta z układu IRU 2007, a dokumenty są czytelne w czerni i bieli", () => {
  const cmrGenerator = documentGeneratorSource.slice(
    documentGeneratorSource.indexOf("def generate_cmr"),
    documentGeneratorSource.indexOf("def simple_field"),
  );
  assert.match(cmrGenerator, /model IRU CMR 2007/);
  assert.match(cmrGenerator, /numbered_box\(c, margin, top, left, 71, 1/);
  assert.match(cmrGenerator, /24, "Odbiorca"/);
  assert.equal(cmrGenerator.includes("LOGO"), false);
  assert.equal(documentGeneratorSource.includes("NAVY"), false);
  assert.match(documentationSource, /druku czarno-białego/);
});

test("karta przeglądarki używa sygnetu Masterpress", () => {
  assert.match(indexSource, /rel="icon"[^>]+masterpress-mark\.png/);
  assert.equal(indexSource.includes("favicon.svg"), false);
});

test("Lista palet jest dostępna magazynierowi w surowcach i kończy się raportem", () => {
  assert.match(pageSource, /id: "palletcount"/);
  assert.equal((pageSource.match(/id: "palletcount"/g) ?? []).length, 1);
  assert.match(pageSource, /warehouseArea === "raw" && activeView === "palletcount"/);
  for (const category of [
    "Folia termokurczliwa",
    "Papier samoprzylepny",
    "Tektura",
    "Papier kredowy",
    "Wiadra",
    "Folia CS i laminat",
    "Płyty",
    "Inne",
  ]) assert.match(palletCountSource, new RegExp(category));
  assert.match(palletCountSource, /pallet-count:draft:v1/);
  assert.match(palletCountSource, /pallet-count:history:v1/);
  assert.match(palletCountSource, /Record<CategoryId, number \| null>/);
  assert.match(palletCountSource, /\+5 palet/);
  assert.match(palletCountSource, /Wpisz 0/);
  assert.match(palletCountSource, /Zapisz i drukuj PDF/);
  assert.match(palletCountSource, /const allCategoriesEntered/);
  assert.match(palletCountSource, /completedAt/);
  assert.match(palletCountSource, /systemPallets/);
  assert.match(palletCountSource, /localWarehouseSnapshot\.A/);
  assert.match(palletCountSource, /pallet-count-print-document/);
  assert.match(palletCountSource, /Protokół ręcznego liczenia palet/);
  assert.match(palletCountSource, /Gotowe do zatwierdzenia/);
  assert.match(palletCountSource, /Policzono i zapisano/);
  assert.equal(palletCountSource.includes("POSTĘP LICZENIA"), false);
  assert.equal(palletCountSource.includes("{progress}%"), false);
  assert.match(globalStyles, /@page pallet-count-report/);
  assert.equal(palletCountSource.includes("initialPallet"), false);
});

test("Dostawy mają tylko dostawcę i liczbę palet, a konfiguracja znika z menu", () => {
  assert.equal(pageSource.includes('label: "Konfiguracja"'), false);
  const deliveryForm = pageSource.slice(
    pageSource.indexOf('className="modal delivery-modal"'),
    pageSource.indexOf("{deliveryToDelete &&"),
  );
  assert.match(deliveryForm, /name="supplier"/);
  assert.match(deliveryForm, /name="pallets"/);
  assert.equal(deliveryForm.includes('name="warehouse"'), false);
  assert.equal(deliveryForm.includes('name="date"'), false);
  assert.equal(deliveryForm.includes('name="notes"'), false);
});

test("Karta mycia obsługuje trzy formularze i osobny obszar magazynu", () => {
  assert.match(pageSource, /id: "cleaning"/);
  assert.match(cleaningSource, /F-02a\/P-H-03/);
  assert.match(cleaningSource, /F-02b\/P-H-03/);
  assert.match(cleaningSource, /F-02c\/P-H-03/);
  assert.match(cleaningSource, /Magazyn surowców/);
  assert.match(cleaningSource, /Magazyn wyrobów gotowych/);
  assert.match(cleaningSource, /warehouse: CleaningWarehouse/);
  assert.equal(cleaningSource.includes("setWarehouse"), false);
  assert.equal(cleaningSource.includes("Pobierz Word"), false);
  assert.equal(cleaningSource.includes("downloadCleaningWord"), false);
});
