import assert from "node:assert/strict";
import test from "node:test";
import {
  dateRange,
  formatWorkHours,
  isWeekend,
} from "../app/workforce-model.ts";

test("zakres grafiku zawiera obie daty", () => {
  assert.deepEqual(dateRange("2026-09-01", "2026-09-03"), [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
  ]);
});

test("weekendy są rozpoznawane niezależnie od zwykłego grafiku", () => {
  assert.equal(isWeekend("2026-09-05"), true);
  assert.equal(isWeekend("2026-09-06"), true);
  assert.equal(isWeekend("2026-09-07"), false);
});

test("indywidualne godziny zachowują zmianę przechodzącą przez północ", () => {
  assert.equal(formatWorkHours("10:00", "18:00", true), "10–18");
  assert.equal(formatWorkHours("20:00", "06:00", true), "20–06");
  assert.equal(formatWorkHours("06:30", "18:30", true), "06:30–18:30");
});
