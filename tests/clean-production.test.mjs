import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("VIKI jest ukryta w wersji budującej dwa obszary pracy", () => {
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
  assert.equal(pageSource.includes("voice-assistant-trigger"), false);
  assert.equal(pageSource.includes("<span>VIKI</span>"), false);
});

test("portal rozdziela magazyn surowców i wyrobów gotowych", () => {
  assert.match(pageSource, /type WarehouseArea = "raw" \| "finished"/);
  assert.match(pageSource, /className="warehouse-area-switcher"/);
  assert.match(pageSource, /const rawNavItems/);
  assert.match(pageSource, /const finishedNavItems/);
  assert.match(pageSource, /id: "shipments"/);
  assert.match(pageSource, /<FinishedMap/);
  assert.match(finishedSource, /Mapa magazynu wyrobów gotowych/);
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
  assert.match(scheduleSource, /WAREHOUSE<br \/>MASTERPRESS/);
  assert.match(scheduleSource, /<small>\{areaLabels\[area\]\}<\/small>/);
  assert.match(globalStyles, /@page workforce-landscape/);
  assert.match(globalStyles, /size: A4 landscape/);
  assert.match(globalStyles, /workforce-module > \*:not\(\.schedule-print-document\)/);
  assert.match(globalStyles, /schedule-print-page tbody tr\.weekend/);
  assert.match(globalStyles, /schedule-matrix-cell\.custom-hours/);
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
