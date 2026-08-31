import assert from "node:assert/strict";
import test from "node:test";

import {
  answerScheduleVoiceCommand,
  findScheduleEmployees,
  resolveScheduleDates,
  resolveScheduleHours,
  resolveScheduleShift,
} from "../app/schedule-voice.ts";

const now = new Date(2026, 8, 1, 12);
const snapshot = {
  employees: [
    { id: "anna", name: "Anna Kowalska", active: true },
    { id: "jan", name: "Jan Nowak", active: true },
  ],
  assignments: [
    { date: "2026-09-01", employeeId: "anna", shift: "I" },
    {
      date: "2026-09-01",
      employeeId: "jan",
      fromTime: "10:00",
      toTime: "18:00",
    },
    { date: "2026-09-02", employeeId: "anna", shift: "II" },
  ],
  leaves: [
    {
      id: "leave-1",
      employeeId: "jan",
      from: "2026-09-02",
      to: "2026-09-03",
      note: "",
    },
  ],
  weekendAssignments: [
    {
      id: "weekend-1",
      date: "2026-09-05",
      employeeId: "jan",
      fromTime: "08:00",
      toTime: "16:00",
    },
  ],
};

test("VIKI rozpoznaje daty względne, dni tygodnia i zmianę", () => {
  assert.equal(resolveScheduleDates("kto pracuje jutro", now).dates[0], "2026-09-02");
  assert.equal(resolveScheduleDates("kto pracuje w sobotę", now).dates[0], "2026-09-05");
  assert.equal(resolveScheduleShift("kto jest na drugiej zmianie"), "II");
  assert.equal(resolveScheduleDates("grafik 2026-09-05", now).dates[0], "2026-09-05");
  assert.equal(resolveScheduleDates("grafik we wrześniu", now).period, "month");
});

test("VIKI rozpoznaje pracownika po imieniu lub nazwisku", () => {
  assert.deepEqual(
    findScheduleEmployees("Jak pracuje Kowalska?", snapshot.employees).map((item) => item.id),
    ["anna"],
  );
});

test("VIKI odpowiada, kto pracuje na konkretnej zmianie", () => {
  const answer = answerScheduleVoiceCommand(
    "Kto pracuje dzisiaj na pierwszej zmianie?",
    snapshot,
    now,
  );
  assert.match(answer?.spoken || "", /Anna Kowalska/);
  assert.match(answer?.spoken || "", /zmianie 1/);
});

test("VIKI podaje urlop konkretnego pracownika", () => {
  const answer = answerScheduleVoiceCommand(
    "Czy Jan Nowak ma jutro urlop?",
    snapshot,
    now,
  );
  assert.match(answer?.spoken || "", /Jan Nowak/);
  assert.match(answer?.spoken || "", /urlop/);
});

test("VIKI wyszukuje indywidualne godziny", () => {
  assert.deepEqual(resolveScheduleHours("kto pracuje od 10 do 18"), {
    fromTime: "10:00",
    toTime: "18:00",
  });
  assert.deepEqual(resolveScheduleHours("kto pracuje od 06:30 do 18:30"), {
    fromTime: "06:30",
    toTime: "18:30",
  });
  const answer = answerScheduleVoiceCommand(
    "Kto pracuje dzisiaj od 10 do 18?",
    snapshot,
    now,
  );
  assert.match(answer?.spoken || "", /Jan Nowak/);
  assert.match(answer?.spoken || "", /10:00–18:00/);
});

test("VIKI zna grafik weekendowy i polecenie wydruku", () => {
  const weekend = answerScheduleVoiceCommand(
    "Kto pracuje w sobotę?",
    snapshot,
    now,
  );
  assert.match(weekend?.spoken || "", /Jan Nowak/);
  assert.equal(
    answerScheduleVoiceCommand("Wydrukuj grafik PDF", snapshot, now)?.action,
    "print",
  );
});
