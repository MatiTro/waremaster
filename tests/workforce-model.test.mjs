import assert from "node:assert/strict";
import test from "node:test";
import {
  dateRange,
  isWeekend,
  rotationShiftForDate,
} from "../app/workforce-model.ts";

test("zakres grafiku zawiera obie daty", () => {
  assert.deepEqual(dateRange("2026-09-01", "2026-09-03"), [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
  ]);
});

test("automat rotuje zmiany tygodniowo I, III, II", () => {
  assert.equal(rotationShiftForDate("2026-09-01", "2026-09-04", "I"), "I");
  assert.equal(rotationShiftForDate("2026-09-01", "2026-09-07", "I"), "III");
  assert.equal(rotationShiftForDate("2026-09-01", "2026-09-14", "I"), "II");
  assert.equal(rotationShiftForDate("2026-09-01", "2026-09-21", "I"), "I");
});

test("weekendy mogą zostać pominięte przez automat", () => {
  assert.equal(isWeekend("2026-09-05"), true);
  assert.equal(isWeekend("2026-09-06"), true);
  assert.equal(isWeekend("2026-09-07"), false);
});
