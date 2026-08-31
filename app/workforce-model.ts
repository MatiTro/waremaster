export type ShiftId = "I" | "II" | "III";

export type Employee = {
  id: string;
  name: string;
  active: boolean;
};

export type ShiftAssignment = {
  date: string;
  shift: ShiftId;
  employeeId: string;
};

export type PlannedLeave = {
  id: string;
  employeeId: string;
  from: string;
  to: string;
  note: string;
};

export type CleaningWarehouse = "raw" | "finished";
export type CleaningFrequency = "daily" | "weekly" | "monthly";

export type CleaningResponsibility = {
  warehouse: CleaningWarehouse;
  year: number;
  week: number;
  employeeId: string;
};

export const workforceStorageKeys = {
  employees: "warehouse-masterpress:employees:production:v1",
  assignments: "warehouse-masterpress:shift-assignments:production:v1",
  leaves: "warehouse-masterpress:planned-leaves:production:v1",
  cleaningResponsibilities:
    "warehouse-masterpress:cleaning-responsibilities:production:v1",
} as const;

export const shifts: ShiftId[] = ["I", "II", "III"];
export const rotationShifts: ShiftId[] = ["I", "III", "II"];

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function utcIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function isoWeekMonday(value: string) {
  const date = utcDate(value);
  if (!date) return null;
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date;
}

export function dateRange(from: string, to: string) {
  const start = utcDate(from);
  const end = utcDate(to);
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(utcIsoDate(date));
  }
  return dates;
}

export function isWeekend(value: string) {
  const date = utcDate(value);
  return date ? [0, 6].includes(date.getUTCDay()) : false;
}

export function rotationShiftForDate(
  startDate: string,
  date: string,
  firstShift: ShiftId,
) {
  const startMonday = isoWeekMonday(startDate);
  const dateMonday = isoWeekMonday(date);
  const startIndex = rotationShifts.indexOf(firstShift);
  if (!startMonday || !dateMonday || startIndex < 0) return firstShift;
  const weekOffset = Math.floor(
    (dateMonday.getTime() - startMonday.getTime()) / (7 * 86_400_000),
  );
  const normalizedOffset = ((weekOffset % rotationShifts.length) + rotationShifts.length) % rotationShifts.length;
  return rotationShifts[(startIndex + normalizedOffset) % rotationShifts.length];
}

function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthKey(date = new Date()) {
  return localIsoDate(date).slice(0, 7);
}

export function formatDate(value: string, withYear = true) {
  const date = localDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function formatMonth(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const label = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toLocaleUpperCase("pl") + label.slice(1);
}

export function formatWeekday(value: string, short = false) {
  const date = localDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: short ? "short" : "long",
  }).format(date);
}

export function monthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return [];
  const count = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, monthNumber - 1, index + 1, 12);
    return localIsoDate(date);
  });
}

export function isoWeekParts(date: Date) {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const year = target.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((target.getTime() - firstDay.getTime()) / 86_400_000 + 1) / 7,
  );
  return { year, week };
}

export function currentWeekKey(date = new Date()) {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weekDates(weekKey: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return [];
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(
    januaryFourth.getUTCDate() - januaryFourthDay + 1 + (week - 1) * 7,
  );
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
  });
}

export function weekNumber(weekKey: string) {
  return Number(weekKey.split("W")[1]) || 1;
}

export function yearFromWeekKey(weekKey: string) {
  return Number(weekKey.slice(0, 4)) || new Date().getFullYear();
}

export function weeksInIsoYear(year: number) {
  return isoWeekParts(new Date(year, 11, 28, 12)).week;
}

export function leaveIncludesDate(leave: PlannedLeave, date: string) {
  return leave.from <= date && leave.to >= date;
}

export function leaveOverlapsMonth(leave: PlannedLeave, month: string) {
  const first = `${month}-01`;
  const dates = monthDates(month);
  const last = dates.at(-1) || first;
  return leave.from <= last && leave.to >= first;
}

export function employeeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("pl"))
    .join("");
}

export function safeReadArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export function makeRecordId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
