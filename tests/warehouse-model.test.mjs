import assert from "node:assert/strict";
import test from "node:test";

import {
  capacities,
  getNewLocationMaxPlace,
  getNewRackColumns,
  localWarehouseSnapshot,
  rackCounts,
  resolveMainLocation,
  resolveNewLocation,
} from "../app/warehouse-model.ts";

test("utrzymuje docelową pojemność obu magazynów", () => {
  assert.deepEqual(capacities, { A: 2040, B: 6633 });
  assert.equal(localWarehouseSnapshot.A, 0);
  assert.equal(localWarehouseSnapshot.B, 0);
});

test("zna wszystkie regały Nowego magazynu", () => {
  assert.deepEqual(rackCounts, { M1: 21, M2: 11, M3: 10 });
  assert.deepEqual(getNewRackColumns("M1", 1), [1, 2, 3, 4, 5]);
  assert.deepEqual(getNewRackColumns("M1", 21), [0, 1, 2, 3, 4, 5, 6]);
});

test("waliduje kolumny z trzema miejscami w Magazynie głównym", () => {
  assert.deepEqual(resolveMainLocation("B", 5, 15), {
    column: 5,
    level: 4,
    slot: 3,
    place: 15,
  });
  assert.equal(resolveMainLocation("B", 5, 16), null);
  assert.ok(resolveMainLocation("A", 5, 20));
});

test("waliduje potrójny balkon M2-11", () => {
  assert.equal(getNewLocationMaxPlace("M2", 11, 0), 12);
  assert.deepEqual(resolveNewLocation("M2", 11, 0, 12), {
    column: 0,
    level: 7,
    slot: 12,
    place: 12,
  });
  assert.equal(resolveNewLocation("M2", 11, 0, 13), null);
});
