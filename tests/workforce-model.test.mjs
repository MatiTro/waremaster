import assert from "node:assert/strict";
import test from "node:test";
import {
  dateRange,
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
