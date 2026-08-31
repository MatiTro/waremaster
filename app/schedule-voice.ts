import { normalizeVikiText } from "./viki-dictionary.ts";
import {
  formatDate,
  formatMonth,
  formatWorkHours,
  leaveIncludesDate,
  localIsoDate,
  monthDates,
  type Employee,
  type PlannedLeave,
  type ShiftAssignment,
  type ShiftId,
  type WeekendAssignment,
} from "./workforce-model.ts";

export type WorkforceVoiceSnapshot = {
  employees: Employee[];
  assignments: ShiftAssignment[];
  leaves: PlannedLeave[];
  weekendAssignments: WeekendAssignment[];
};

export type ScheduleVoiceAnswer = {
  text: string;
  spoken: string;
  action?: "print";
};

type DatePeriod = "day" | "week" | "month" | "weekend";

export type ScheduleDateSelection = {
  dates: string[];
  label: string;
  period: DatePeriod;
  explicit: boolean;
};

const shiftNumber: Record<ShiftId, string> = { I: "1", II: "2", III: "3" };
const monthNumbers: Record<string, number> = {
  styczen: 1,
  stycznia: 1,
  luty: 2,
  lutego: 2,
  marzec: 3,
  marca: 3,
  kwiecien: 4,
  kwietnia: 4,
  maj: 5,
  maja: 5,
  czerwiec: 6,
  czerwca: 6,
  lipiec: 7,
  lipca: 7,
  sierpien: 8,
  sierpnia: 8,
  wrzesien: 9,
  wrzesnia: 9,
  pazdziernik: 10,
  pazdziernika: 10,
  listopad: 11,
  listopada: 11,
  grudzien: 12,
  grudnia: 12,
  styczniu: 1,
  lutym: 2,
  marcu: 3,
  kwietniu: 4,
  maju: 5,
  czerwcu: 6,
  lipcu: 7,
  sierpniu: 8,
  wrzesniu: 9,
  pazdzierniku: 10,
  listopadzie: 11,
  grudniu: 12,
};

const weekdayNumbers: Array<[RegExp, number]> = [
  [/\bponiedzial(?:ek|ku|kowy|kowa)?\b/, 1],
  [/\bwtorek|wtorku|wtorkowy|wtorkowa\b/, 2],
  [/\bsroda|srode|srody|srodowy|srodowa\b/, 3],
  [/\bczwartek|czwartku|czwartkowy|czwartkowa\b/, 4],
  [/\bpiatek|piatku|piatkowy|piatkowa\b/, 5],
  [/\bsobota|sobote|soboty|sobotni|sobotnia\b/, 6],
  [/\bniedziela|niedziele|niedzieli|niedzielny|niedzielna\b/, 0],
];

const spokenHours: Record<string, number> = {
  zero: 0,
  pierwszej: 1,
  pierwsza: 1,
  drugiej: 2,
  druga: 2,
  trzeciej: 3,
  trzecia: 3,
  czwartej: 4,
  czwarta: 4,
  piatej: 5,
  piata: 5,
  szostej: 6,
  szosta: 6,
  siodmej: 7,
  siodma: 7,
  osmej: 8,
  osma: 8,
  dziewiatej: 9,
  dziewiata: 9,
  dziesiatej: 10,
  dziesiata: 10,
  jedenastej: 11,
  jedenasta: 11,
  dwunastej: 12,
  dwunasta: 12,
  trzynastej: 13,
  trzynasta: 13,
  czternastej: 14,
  czternasta: 14,
  pietnastej: 15,
  pietnasta: 15,
  szesnastej: 16,
  szesnasta: 16,
  siedemnastej: 17,
  siedemnasta: 17,
  osiemnastej: 18,
  osiemnasta: 18,
  dziewietnastej: 19,
  dziewietnasta: 19,
  dwudziestej: 20,
  dwudziesta: 20,
  dwudziestejpierwszej: 21,
  dwudziestapierwsza: 21,
  dwudziestejdrugiej: 22,
  dwudziestadruga: 22,
  dwudziestejtrzeciej: 23,
  dwudziestatrzecia: 23,
};

function addDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
  return result;
}

function isoForParts(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined;
  return localIsoDate(date);
}

function datesBetween(from: Date, count: number) {
  return Array.from({ length: count }, (_, index) => localIsoDate(addDays(from, index)));
}

function monthSelection(date: Date, label: string): ScheduleDateSelection {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return { dates: monthDates(month), label, period: "month", explicit: true };
}

function nextWeekday(now: Date, weekday: number) {
  const delta = (weekday - now.getDay() + 7) % 7;
  return addDays(now, delta);
}

function readableDay(value: string, now: Date) {
  const today = localIsoDate(now);
  const tomorrow = localIsoDate(addDays(now, 1));
  const dayAfterTomorrow = localIsoDate(addDays(now, 2));
  if (value === today) return "Dzisiaj";
  if (value === tomorrow) return "Jutro";
  if (value === dayAfterTomorrow) return "Pojutrze";
  const date = new Date(`${value}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(date);
  return `${weekday.charAt(0).toLocaleUpperCase("pl") + weekday.slice(1)}, ${formatDate(value)}`;
}

export function resolveScheduleDates(
  command: string,
  now = new Date(),
): ScheduleDateSelection {
  const normalized = normalizeVikiText(command);
  const rawIso = command.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (rawIso) {
    const date = isoForParts(
      Number(rawIso[1]),
      Number(rawIso[2]),
      Number(rawIso[3]),
    );
    if (date) return { dates: [date], label: readableDay(date, now), period: "day", explicit: true };
  }

  const rawNumeric = command.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{4}))?\b/);
  if (rawNumeric) {
    const date = isoForParts(
      Number(rawNumeric[3] || now.getFullYear()),
      Number(rawNumeric[2]),
      Number(rawNumeric[1]),
    );
    if (date) return { dates: [date], label: readableDay(date, now), period: "day", explicit: true };
  }

  const monthNamePattern = Object.keys(monthNumbers).join("|");
  const namedDate = normalized.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNamePattern})(?:\\s+(\\d{4}))?\\b`));
  if (namedDate) {
    const date = isoForParts(
      Number(namedDate[3] || now.getFullYear()),
      monthNumbers[namedDate[2]],
      Number(namedDate[1]),
    );
    if (date) return { dates: [date], label: readableDay(date, now), period: "day", explicit: true };
  }

  if (/\bpojutrze\b/.test(normalized)) {
    const date = localIsoDate(addDays(now, 2));
    return { dates: [date], label: "Pojutrze", period: "day", explicit: true };
  }
  if (/\bjutro\b/.test(normalized)) {
    const date = localIsoDate(addDays(now, 1));
    return { dates: [date], label: "Jutro", period: "day", explicit: true };
  }
  if (/\b(dzis|dzisiaj|teraz)\b/.test(normalized)) {
    const date = localIsoDate(now);
    return { dates: [date], label: "Dzisiaj", period: "day", explicit: true };
  }

  if (/\b(w tym|ten) miesiac\w*\b/.test(normalized)) {
    return monthSelection(now, "W tym miesiącu");
  }
  if (/\b(w przyszlym|nastepny) miesiac\w*\b/.test(normalized)) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12);
    return monthSelection(nextMonth, "W przyszłym miesiącu");
  }

  const monthOnly = Object.entries(monthNumbers).find(([name]) =>
    new RegExp(`\\b${name}\\b`).test(normalized)
  );
  if (monthOnly) {
    const requestedYear = Number(normalized.match(/\b20\d{2}\b/)?.[0] || now.getFullYear());
    const requestedMonth = new Date(requestedYear, monthOnly[1] - 1, 1, 12);
    return monthSelection(requestedMonth, formatMonth(localIsoDate(requestedMonth).slice(0, 7)));
  }

  if (/\b(w tym|ten) tygodni\w*\b/.test(normalized)) {
    const monday = addDays(now, -((now.getDay() + 6) % 7));
    return { dates: datesBetween(monday, 7), label: "W tym tygodniu", period: "week", explicit: true };
  }
  if (/\b(w przyszlym|nastepny) tygodni\w*\b/.test(normalized)) {
    const monday = addDays(now, 7 - ((now.getDay() + 6) % 7));
    return { dates: datesBetween(monday, 7), label: "W przyszłym tygodniu", period: "week", explicit: true };
  }

  if (/\bweekend\w*\b/.test(normalized)) {
    let saturday = nextWeekday(now, 6);
    if (now.getDay() === 0) saturday = addDays(now, 6);
    return {
      dates: [localIsoDate(saturday), localIsoDate(addDays(saturday, 1))],
      label: "W najbliższy weekend",
      period: "weekend",
      explicit: true,
    };
  }

  for (const [pattern, weekday] of weekdayNumbers) {
    if (!pattern.test(normalized)) continue;
    const date = localIsoDate(nextWeekday(now, weekday));
    return { dates: [date], label: readableDay(date, now), period: "day", explicit: true };
  }

  const today = localIsoDate(now);
  return { dates: [today], label: "Dzisiaj", period: "day", explicit: false };
}

export function resolveScheduleShift(command: string): ShiftId | undefined {
  const normalized = normalizeVikiText(command);
  const patterns: Array<[ShiftId, RegExp]> = [
    ["I", /(?:pierwsz\w*\s+zmian|zmian\w*\s+(?:pierwsz\w*|1|jeden)|na\s+pierwsz\w*)/],
    ["II", /(?:drug\w*\s+zmian|zmian\w*\s+(?:drug\w*|2|dwa)|na\s+drug\w*)/],
    ["III", /(?:trzec\w*\s+zmian|zmian\w*\s+(?:trzec\w*|3|trzy)|na\s+trzec\w*)/],
  ];
  return patterns.find(([, pattern]) => pattern.test(normalized))?.[0];
}

function hourToken(value: string) {
  const normalized = normalizeVikiText(value).replace(/\s/g, "");
  const numeric = normalized.match(/^\d{1,2}$/);
  const hour = numeric ? Number(numeric[0]) : spokenHours[normalized];
  return hour !== undefined && hour >= 0 && hour <= 23
    ? String(hour).padStart(2, "0") + ":00"
    : undefined;
}

export function resolveScheduleHours(command: string) {
  const normalized = normalizeVikiText(command);
  const numeric = normalized.match(/\bod\s+(\d{1,2})(?:\s+(\d{2}))?\s+do\s+(\d{1,2})(?:\s+(\d{2}))?\b/);
  if (numeric) {
    const fromHour = Number(numeric[1]);
    const fromMinute = Number(numeric[2] || 0);
    const toHour = Number(numeric[3]);
    const toMinute = Number(numeric[4] || 0);
    if (fromHour <= 23 && toHour <= 23 && fromMinute <= 59 && toMinute <= 59) {
      return {
        fromTime: `${String(fromHour).padStart(2, "0")}:${String(fromMinute).padStart(2, "0")}`,
        toTime: `${String(toHour).padStart(2, "0")}:${String(toMinute).padStart(2, "0")}`,
      };
    }
  }
  const range = normalized.match(/\bod\s+([a-z0-9 ]{1,24}?)\s+do\s+([a-z0-9 ]{1,24}?)(?=\s+(?:dzis|jutro|pojutrze|w\s|na\s|kto|prac|zmian|godzin)|$)/);
  if (!range) return undefined;
  const fromTime = hourToken(range[1]);
  const toTime = hourToken(range[2]);
  return fromTime && toTime ? { fromTime, toTime } : undefined;
}

export function findScheduleEmployees(command: string, employees: Employee[]) {
  const normalized = ` ${normalizeVikiText(command)} `;
  const fullMatches = employees.filter((employee) =>
    normalized.includes(` ${normalizeVikiText(employee.name)} `)
  );
  if (fullMatches.length) return fullMatches;

  const matches = employees.filter((employee) =>
    normalizeVikiText(employee.name)
      .split(" ")
      .filter((part) => part.length >= 3)
      .some((part) => normalized.includes(` ${part} `))
  );
  return matches;
}

export function isScheduleVoiceQuery(command: string, employees: Employee[] = []) {
  const normalized = normalizeVikiText(command);
  if (/\b(grafik|urlop|obsad|pracownik|weekend|dyzur)\w*\b/.test(normalized)) return true;
  if (/\b(?:pierwsz|drug|trzec)\w*\s+zmian|\bzmian\w*\b/.test(normalized)) return true;
  if (/\b(?:kto|ile osob|czy ktos)\b.*\b(?:pracuj|ma wolne|jest w pracy|jest na zmianie)\w*/.test(normalized)) return true;
  if (/\b(?:bez wpisu|bez zmiany|nie ma wpisan|nie pracuje)\b/.test(normalized)) return true;
  if (findScheduleEmployees(command, employees).length > 0 && /\b(?:pracuj|godzin|zmian|wolne|urlop|grafik)\w*/.test(normalized)) return true;
  return false;
}

function employeeName(snapshot: WorkforceVoiceSnapshot, employeeId: string) {
  return snapshot.employees.find((employee) => employee.id === employeeId)?.name;
}

function personCount(value: number) {
  if (value === 1) return "1 osoba";
  const lastTwo = value % 100;
  const last = value % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${value} osoby`;
  return `${value} osób`;
}

function namesList(names: string[], limit = 6) {
  const unique = [...new Set(names)];
  const visible = unique.slice(0, limit);
  const suffix = unique.length > limit ? ` i ${unique.length - limit} innych` : "";
  if (visible.length === 0) return "nikt";
  if (visible.length === 1) return visible[0] + suffix;
  return visible.slice(0, -1).join(", ") + " i " + visible.at(-1) + suffix;
}

function workDescription(
  date: string,
  employeeId: string,
  snapshot: WorkforceVoiceSnapshot,
) {
  if (snapshot.leaves.some((leave) => leave.employeeId === employeeId && leaveIncludesDate(leave, date))) {
    return "urlop";
  }
  const weekend = snapshot.weekendAssignments.find((entry) =>
    entry.date === date && entry.employeeId === employeeId
  );
  if (weekend) return `praca od ${formatWorkHours(weekend.fromTime, weekend.toTime)}`;
  const assignment = snapshot.assignments.find((entry) =>
    entry.date === date && entry.employeeId === employeeId
  );
  if (assignment?.shift) return `zmiana ${shiftNumber[assignment.shift]}`;
  if (assignment?.fromTime && assignment.toTime) {
    return `praca od ${formatWorkHours(assignment.fromTime, assignment.toTime)}`;
  }
  return undefined;
}

function isCountQuestion(normalized: string) {
  return /\bile\b|liczba|obsada|ilu/.test(normalized);
}

function leaveAnswer(
  normalized: string,
  selection: ScheduleDateSelection,
  employeeMatches: Employee[],
  snapshot: WorkforceVoiceSnapshot,
  now: Date,
) {
  if (employeeMatches.length === 1 && /\bkiedy\b/.test(normalized)) {
    const employee = employeeMatches[0];
    const today = localIsoDate(now);
    const nextLeave = snapshot.leaves
      .filter((leave) => leave.employeeId === employee.id && leave.to >= today)
      .sort((left, right) => left.from.localeCompare(right.from))[0];
    return nextLeave
      ? `${employee.name} ma najbliższy urlop od ${formatDate(nextLeave.from)} do ${formatDate(nextLeave.to)}.`
      : `${employee.name} nie ma zaplanowanego przyszłego urlopu.`;
  }

  const matchingLeaves = snapshot.leaves.filter((leave) =>
    selection.dates.some((date) => leaveIncludesDate(leave, date)) &&
    (employeeMatches.length === 0 || employeeMatches.some((employee) => employee.id === leave.employeeId))
  );
  const names = matchingLeaves
    .map((leave) => employeeName(snapshot, leave.employeeId))
    .filter((name): name is string => Boolean(name));

  if (employeeMatches.length === 1 && selection.period === "day") {
    return matchingLeaves.length
      ? `${employeeMatches[0].name} ma ${selection.label.toLocaleLowerCase("pl")} urlop.`
      : `${employeeMatches[0].name} nie ma ${selection.label.toLocaleLowerCase("pl")} urlopu.`;
  }
  return names.length
    ? `${selection.label} urlop mają: ${namesList(names)}.`
    : `${selection.label} nikt nie ma zaplanowanego urlopu.`;
}

function weekendAnswer(
  selection: ScheduleDateSelection,
  snapshot: WorkforceVoiceSnapshot,
  now: Date,
) {
  const parts = selection.dates.map((date) => {
    const entries = snapshot.weekendAssignments.filter((entry) => entry.date === date);
    if (!entries.length) return `${readableDay(date, now)}: brak wpisów`;
    const workers = entries.map((entry) => {
      const name = employeeName(snapshot, entry.employeeId) || "Nieznany pracownik";
      return `${name}, ${formatWorkHours(entry.fromTime, entry.toTime)}`;
    });
    return `${readableDay(date, now)}: ${workers.join("; ")}`;
  });
  return parts.join(". ") + ".";
}

function employeeAnswer(
  employee: Employee,
  selection: ScheduleDateSelection,
  snapshot: WorkforceVoiceSnapshot,
  now: Date,
) {
  if (selection.period === "day") {
    const description = workDescription(selection.dates[0], employee.id, snapshot);
    return description
      ? `${employee.name}: ${selection.label.toLocaleLowerCase("pl")} ${description}.`
      : `${employee.name} nie ma ${selection.label.toLocaleLowerCase("pl")} wpisu w grafiku.`;
  }

  const entries = selection.dates
    .map((date) => ({ date, description: workDescription(date, employee.id, snapshot) }))
    .filter((entry): entry is { date: string; description: string } => Boolean(entry.description));
  if (!entries.length) return `${employee.name} nie ma wpisów ${selection.label.toLocaleLowerCase("pl")}.`;
  const details = entries.slice(0, 7).map((entry) =>
    `${readableDay(entry.date, now)}: ${entry.description}`
  );
  return `${employee.name}. ${details.join(". ")}.`;
}

function hoursAnswer(
  selection: ScheduleDateSelection,
  fromTime: string,
  toTime: string,
  snapshot: WorkforceVoiceSnapshot,
) {
  const ids = [
    ...snapshot.assignments.filter((entry) =>
      selection.dates.includes(entry.date) && entry.fromTime === fromTime && entry.toTime === toTime
    ).map((entry) => entry.employeeId),
    ...snapshot.weekendAssignments.filter((entry) =>
      selection.dates.includes(entry.date) && entry.fromTime === fromTime && entry.toTime === toTime
    ).map((entry) => entry.employeeId),
  ];
  const names = ids
    .map((id) => employeeName(snapshot, id))
    .filter((name): name is string => Boolean(name));
  const hours = formatWorkHours(fromTime, toTime);
  return names.length
    ? `${selection.label} od ${hours} pracują: ${namesList(names)}.`
    : `${selection.label} nikt nie ma wpisanych godzin ${hours}.`;
}

function staffingAnswer(
  normalized: string,
  selection: ScheduleDateSelection,
  shift: ShiftId | undefined,
  snapshot: WorkforceVoiceSnapshot,
) {
  if (selection.period !== "day") {
    const counts = snapshot.employees
      .filter((employee) => employee.active)
      .map((employee) => ({
        name: employee.name,
        days: selection.dates.filter((date) => Boolean(workDescription(date, employee.id, snapshot))).length,
      }))
      .filter((entry) => entry.days > 0);
    return counts.length
      ? `${selection.label} wpisy mają: ${counts.map((entry) => `${entry.name}, ${entry.days} dni`).join("; ")}.`
      : `${selection.label} grafik nie ma jeszcze wpisów.`;
  }

  const date = selection.dates[0];
  const missingQuestion = /bez wpisu|bez zmiany|nie ma wpisan|kto nie pracuje|kto ma wolne/.test(normalized);
  if (missingQuestion) {
    const names = snapshot.employees
      .filter((employee) => employee.active && !workDescription(date, employee.id, snapshot))
      .map((employee) => employee.name);
    return names.length
      ? `${selection.label} bez wpisu są: ${namesList(names)}.`
      : `${selection.label} każdy aktywny pracownik ma wpis w grafiku.`;
  }

  if (shift) {
    const names = snapshot.assignments
      .filter((entry) => entry.date === date && entry.shift === shift)
      .map((entry) => employeeName(snapshot, entry.employeeId))
      .filter((name): name is string => Boolean(name));
    if (!names.length) return `${selection.label} zmiana ${shiftNumber[shift]} nie ma jeszcze obsady.`;
    return isCountQuestion(normalized)
      ? `${selection.label} na zmianie ${shiftNumber[shift]} są ${personCount(names.length)}: ${namesList(names)}.`
      : `${selection.label} na zmianie ${shiftNumber[shift]} pracują: ${namesList(names)}.`;
  }

  const shiftParts = (["I", "II", "III"] as ShiftId[]).map((candidate) => {
    const names = snapshot.assignments
      .filter((entry) => entry.date === date && entry.shift === candidate)
      .map((entry) => employeeName(snapshot, entry.employeeId))
      .filter((name): name is string => Boolean(name));
    return { shift: shiftNumber[candidate], names };
  });
  const custom = snapshot.assignments.filter((entry) =>
    entry.date === date && entry.fromTime && entry.toTime
  );
  const weekend = snapshot.weekendAssignments.filter((entry) => entry.date === date);
  if (shiftParts.every((part) => part.names.length === 0) && custom.length === 0 && weekend.length === 0) {
    return `${selection.label} grafik nie ma jeszcze wpisów.`;
  }

  if (isCountQuestion(normalized) || /za malo|brakuje|minimum|pelna obsada|obsad/.test(normalized)) {
    const details = shiftParts.map((part) => `zmiana ${part.shift}: ${personCount(part.names.length)}`);
    const extras = custom.length + weekend.length;
    return `${selection.label}: ${details.join(", ")}${extras ? `, godziny indywidualne: ${personCount(extras)}` : ""}.`;
  }

  const details = shiftParts
    .filter((part) => part.names.length)
    .map((part) => `zmiana ${part.shift}: ${namesList(part.names)}`);
  const extras = [...custom, ...weekend].map((entry) => {
    const name = employeeName(snapshot, entry.employeeId) || "Nieznany pracownik";
    return `${name} ${formatWorkHours(entry.fromTime || "", entry.toTime || "")}`;
  });
  if (extras.length) details.push(`inne godziny: ${extras.join(", ")}`);
  return `${selection.label}. ${details.join(". ")}.`;
}

export function answerScheduleVoiceCommand(
  command: string,
  snapshot: WorkforceVoiceSnapshot,
  now = new Date(),
): ScheduleVoiceAnswer | null {
  const normalized = normalizeVikiText(command);
  if (!isScheduleVoiceQuery(command, snapshot.employees)) return null;

  const pureNavigation =
    /^(?:otworz|pokaz|przejdz do|wejdz w) (?:modul )?(?:grafik|plan zmian)(?: pracownikow| zmian)?$/
      .test(normalized) ||
    /^(?:grafik pracownikow|grafik zmian|plan zmian)$/.test(normalized);
  if (pureNavigation) return null;

  if (/\b(?:drukuj|wydrukuj|pdf|zapisz)\b/.test(normalized) && /\bgrafik\w*\b/.test(normalized)) {
    return {
      text: "Otwieram podgląd wydruku grafiku.",
      spoken: "Otwieram podgląd wydruku.",
      action: "print",
    };
  }

  if (
    /\b(?:dodaj|ustaw|zaplanuj|edytuj|zmien|usun)\w*\b/.test(normalized) &&
    /\b(?:grafik|zmian|urlop|pracownik)\w*\b/.test(normalized)
  ) {
    const answer = "Otwieram grafik. Zmiany, pracowników i urlopy możesz ustawić w odpowiedniej zakładce.";
    return { text: answer, spoken: "Otwieram grafik." };
  }

  const hasData = snapshot.employees.length > 0;
  if (!hasData) {
    const answer = "Grafik jest jeszcze pusty. Otwieram moduł, aby dodać pracowników i zmiany.";
    return { text: answer, spoken: "Grafik jest jeszcze pusty. Otwieram moduł." };
  }

  let selection = resolveScheduleDates(command, now);
  const employeeMatches = findScheduleEmployees(command, snapshot.employees);
  const leaveQuestion = /\burlop\w*\b|nieobecn\w*/.test(normalized);
  if (
    leaveQuestion &&
    !selection.explicit &&
    /\b(?:pokaz|lista|zaplanowan|nadchodzac)\w*\b/.test(normalized)
  ) {
    selection = monthSelection(now, "W tym miesiącu");
  }

  if (
    /\b(?:lista|pokaz|wymien|ilu|ile)\w*\b.*\bpracownik\w*\b|\blista pracownik\w*\b/.test(normalized) &&
    !/\bpracuj\w*|\bzmian\w*|\burlop\w*/.test(normalized)
  ) {
    const active = snapshot.employees.filter((employee) => employee.active);
    const answer = active.length
      ? `Aktywni pracownicy, ${personCount(active.length)}: ${namesList(active.map((employee) => employee.name))}.`
      : "Nie ma aktywnych pracowników.";
    return { text: answer, spoken: answer };
  }
  if (leaveQuestion) {
    const answer = leaveAnswer(normalized, selection, employeeMatches, snapshot, now);
    return { text: answer, spoken: answer };
  }

  if (/\bweekend\w*|\bsobot\w*|\bniedziel\w*/.test(normalized)) {
    const answer = weekendAnswer(selection, snapshot, now);
    return { text: answer, spoken: answer };
  }

  if (employeeMatches.length > 1) {
    const answer = `Znalazłam kilka osób: ${namesList(employeeMatches.map((employee) => employee.name))}. Podaj imię i nazwisko.`;
    return { text: answer, spoken: answer };
  }
  if (employeeMatches.length === 1) {
    const answer = employeeAnswer(employeeMatches[0], selection, snapshot, now);
    return { text: answer, spoken: answer };
  }

  const hours = resolveScheduleHours(command);
  if (hours) {
    const answer = hoursAnswer(selection, hours.fromTime, hours.toTime, snapshot);
    return { text: answer, spoken: answer };
  }

  const answer = staffingAnswer(
    normalized,
    selection,
    resolveScheduleShift(command),
    snapshot,
  );
  return { text: answer, spoken: answer };
}
