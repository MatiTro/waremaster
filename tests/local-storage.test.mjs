import assert from 'node:assert/strict';
import test from 'node:test';
import { readStoredJson, readStoredValue, writeStoredValue, subscribeData } from '../app/shared-storage.ts';
import { safeReadArray, workforceStorageKeysByArea } from '../app/workforce-model.ts';

const values = new Map();
const events = new EventTarget();
globalThis.window = {
  localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
  dispatchEvent: event => events.dispatchEvent(event),
};

test('Start → grafik, karta mycia i lista palet: pusty podgląd nie zatruwa danych modułów', () => {
  for (const keys of Object.values(workforceStorageKeysByArea)) {
    // Kolejność odczytów WorkforceSummary na ekranie Start.
    for (const key of [keys.employees, keys.leaves, keys.assignments]) {
      assert.deepEqual(safeReadArray(key), []);
    }
    // Następnie useSharedState w trzech zgłoszonych modułach.
    const emptyEmployees = [];
    const employees = readStoredValue(keys.employees, emptyEmployees);
    assert.strictEqual(employees, emptyEmployees);
    assert.deepEqual(employees.filter(employee => employee.active), []);
    assert.deepEqual(readStoredValue(keys.leaves, []).filter(leave => leave.from), []);
    assert.deepEqual(readStoredValue(keys.assignments, []).filter(assignment => assignment.date), []);
    assert.deepEqual(readStoredValue(keys.cleaningResponsibilities, []).filter(item => item.week), []);
  }
  assert.equal(values.size, 0, 'Samo otwarcie widoku nie zapisuje ani nie usuwa danych');
});

test('brak wartości używa domyślnej wartości konkretnego odbiorcy i stabilnej referencji', () => {
  const key = 'test:separate-fallbacks';
  const draft = { counts: {}, countedBy: '' };
  assert.equal(readStoredJson(key), 'null');
  assert.strictEqual(readStoredValue(key, draft), draft);
  assert.strictEqual(readStoredValue(key, draft), draft);
  assert.equal(readStoredJson(key), 'null');
  const list = [];
  assert.strictEqual(readStoredValue(key, list), list);
});

test('zapisane null i nieprawidłowy JSON dają bezpieczną wartość domyślną bez kasowania zapisu', () => {
  values.set('test:null', 'null');
  values.set('test:broken-json', '{');
  const empty = [];
  assert.strictEqual(readStoredValue('test:null', empty), empty);
  assert.strictEqual(readStoredValue('test:null', empty), empty);
  assert.strictEqual(readStoredValue('test:broken-json', empty), empty);
  assert.equal(values.get('test:broken-json'), '{');
});

test('istniejące dane i nowe zapisy pozostają dostępne dla wszystkich modułów', () => {
  const key = 'test:existing-employees';
  const employees = [{ id: 'e1', name: 'Osoba testowa', active: true }];
  values.set(key, JSON.stringify(employees));
  assert.deepEqual(safeReadArray(key), employees);
  const first = readStoredValue(key, []);
  assert.strictEqual(readStoredValue(key, []), first);
  let notifications = 0;
  const unsubscribe = subscribeData(() => notifications++);
  const updated = [...employees, { id: 'e2', name: 'Druga osoba', active: true }];
  writeStoredValue(key, updated);
  assert.strictEqual(readStoredValue(key, []), updated);
  assert.deepEqual(safeReadArray(key), updated);
  assert.equal(notifications, 1);
  assert.deepEqual(JSON.parse(values.get(key)), updated);
  unsubscribe();
});

test('zero, false i pusty tekst nie są zastępowane wartością domyślną', () => {
  for (const value of [0, false, '']) {
    const key = `test:primitive:${typeof value}`;
    values.set(key, JSON.stringify(value));
    assert.strictEqual(readStoredValue(key, 'fallback'), value);
  }
});
