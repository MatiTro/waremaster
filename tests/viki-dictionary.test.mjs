import assert from "node:assert/strict";
import test from "node:test";

import {
  extractFirstVikiNumber,
  hasIntent,
  isIncompleteVikiCommand,
  normalizeVikiText,
  parseVikiWarehouseReference,
  voiceIntents,
} from "../app/viki-dictionary.ts";

test("zachowuje polskie ł jako l", () => {
  assert.equal(normalizeVikiText("regał — odłożyć"), "regal odlozyc");
});

test("rozpoznaje blok i liczbowy numer regału", () => {
  assert.deepEqual(
    parseVikiWarehouseReference("Pokaż M2 regał 11"),
    {
      warehouse: "new",
      block: "M2",
      rack: 11,
      explicitWarehouse: true,
      explicitBlock: true,
      explicitRack: true,
    },
  );
});

test("rozpoznaje mówione oznaczenia bloku i regału", () => {
  const reference = parseVikiWarehouseReference("em trzy regał dziesięć");
  assert.equal(reference.warehouse, "new");
  assert.equal(reference.block, "M3");
  assert.equal(reference.rack, 10);
});

test("rozpoznaje literowy regał magazynu głównego", () => {
  const reference = parseVikiWarehouseReference("opowiedz o regale be");
  assert.equal(reference.warehouse, "main");
  assert.equal(reference.rack, "B");
});

test("korzysta z kontekstu przy pytaniu o ten sam regał", () => {
  const reference = parseVikiWarehouseReference("ile tam wolnych", {
    warehouse: "new",
    block: "M2",
    rack: 11,
  });
  assert.equal(reference.warehouse, "new");
  assert.equal(reference.block, "M2");
  assert.equal(reference.rack, 11);
});

test("pojedyncze konkretne komendy są kompletne", () => {
  for (const command of ["pomoc", "mapa", "papier", "M2"]) {
    assert.equal(isIncompleteVikiCommand(command), false);
  }
  assert.equal(isIncompleteVikiCommand("gdzie"), true);
});

test("rozpoznaje krótkie odpowiedzi liczbowe w dialogu dostawy", () => {
  assert.equal(extractFirstVikiNumber("30"), 30);
  assert.equal(extractFirstVikiNumber("trzydzieści palet"), 30);
  assert.equal(extractFirstVikiNumber("osiemset"), 800);
});

test("otwiera głosem grafik i kartę mycia", () => {
  assert.equal(hasIntent("pokaż grafik zmian", voiceIntents.openSchedule), true);
  assert.equal(hasIntent("otwórz kartę mycia", voiceIntents.openCleaning), true);
});
