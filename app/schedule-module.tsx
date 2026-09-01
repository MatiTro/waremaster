"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  Plus,
  Trash2,
  Umbrella,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  currentMonthKey,
  dateRange,
  employeeInitials,
  formatDate,
  formatMonth,
  formatWorkHours,
  formatWeekday,
  leaveIncludesDate,
  leaveOverlapsMonth,
  isWeekend,
  localIsoDate,
  makeRecordId,
  monthDates,
  safeReadArray,
  shifts,
  workforceStorageKeysByArea,
  workforceUpdateEvent,
  type Employee,
  type PlannedLeave,
  type ShiftAssignment,
  type ShiftId,
  type WeekendAssignment,
  type WorkforceArea,
} from "./workforce-model";

type ScheduleTab = "planner" | "weekends" | "employees" | "leaves";
type NoticeTone = "success" | "warning" | "danger";
type ModuleNotice = { message: string; tone: NoticeTone };
type SelectedCell = { date: string; employeeId: string };

const shiftNumber: Record<ShiftId, string> = { I: "1", II: "2", III: "3" };
const weekdayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];

function employeeName(employees: Employee[], id: string) {
  return employees.find((employee) => employee.id === id)?.name ||
    "Nieznany pracownik";
}

function writeWorkforceData<T>(
  key: string,
  value: T[],
  area: WorkforceArea,
) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(workforceUpdateEvent(area)));
}

function addMonths(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1, 12);
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0");
}

const areaLabels: Record<WorkforceArea, string> = {
  raw: "Magazyn surowców",
  finished: "Magazyn wyrobów gotowych",
};

export function WorkforceSummary({ area = "raw" }: { area?: WorkforceArea }) {
  const storageKeys = workforceStorageKeysByArea[area];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<PlannedLeave[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const month = currentMonthKey();

  useEffect(() => {
    const load = () => {
      setEmployees(safeReadArray<Employee>(storageKeys.employees));
      setLeaves(safeReadArray<PlannedLeave>(storageKeys.leaves));
      setAssignments(
        safeReadArray<ShiftAssignment>(storageKeys.assignments),
      );
    };
    load();
    const updateEvent = workforceUpdateEvent(area);
    window.addEventListener(updateEvent, load);
    return () => window.removeEventListener(updateEvent, load);
  }, [area, storageKeys]);

  const monthlyLeaves = leaves.filter((leave) =>
    leaveOverlapsMonth(leave, month)
  );
  const fullShifts = monthDates(month).reduce((total, date) => {
    return total + shifts.filter((shift) =>
      assignments.filter(
        (assignment) => assignment.date === date &&
          assignment.shift === shift,
      ).length >= 3
    ).length;
  }, 0);

  return (
    <section className="workforce-summary">
      <div className="workforce-summary-heading">
        <span><CalendarDays /></span>
        <div>
          <small>GRAFIK · {areaLabels[area].toLocaleUpperCase("pl")}</small>
          <h3>{formatMonth(month)}</h3>
        </div>
      </div>
      <div className="workforce-summary-metrics">
        <div>
          <strong>{employees.filter((employee) => employee.active).length}</strong>
          <span>aktywnych pracowników</span>
        </div>
        <div>
          <strong>{monthlyLeaves.length}</strong>
          <span>zaplanowanych urlopów</span>
        </div>
        <div>
          <strong>{fullShifts}</strong>
          <span>zmian z obsadą min. 3 osób</span>
        </div>
      </div>
      <div className="workforce-summary-note">
        <Umbrella />
        {monthlyLeaves.length > 0 ? (
          <p>
            W tym miesiącu urlop planują: {monthlyLeaves.map((leave) =>
              employeeName(employees, leave.employeeId) + " (" +
              formatDate(leave.from, false) + "–" +
              formatDate(leave.to, false) + ")"
            ).join(", ")}.
          </p>
        ) : (
          <p>Brak zaplanowanych urlopów w bieżącym miesiącu.</p>
        )}
      </div>
    </section>
  );
}

export function ScheduleModule({ area = "raw" }: { area?: WorkforceArea }) {
  const storageKeys = workforceStorageKeysByArea[area];
  const today = localIsoDate();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ScheduleTab>("planner");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [leaves, setLeaves] = useState<PlannedLeave[]>([]);
  const [weekendAssignments, setWeekendAssignments] = useState<
    WeekendAssignment[]
  >([]);
  const [draftFrom, setDraftFrom] = useState(today);
  const [draftTo, setDraftTo] = useState(today);
  const [selectingRangeEnd, setSelectingRangeEnd] = useState(false);
  const [draftShift, setDraftShift] = useState<ShiftId>("I");
  const [draftEmployee, setDraftEmployee] = useState("");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [customEditorOpen, setCustomEditorOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("10:00");
  const [customTo, setCustomTo] = useState("18:00");
  const [customNote, setCustomNote] = useState("");
  const [weekendDate, setWeekendDate] = useState("");
  const [weekendEmployee, setWeekendEmployee] = useState("");
  const [weekendFrom, setWeekendFrom] = useState("08:00");
  const [weekendTo, setWeekendTo] = useState("16:00");
  const [notice, setNotice] = useState<ModuleNotice | null>(null);
  const [printActive, setPrintActive] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(safeReadArray<Employee>(storageKeys.employees));
      setAssignments(
        safeReadArray<ShiftAssignment>(storageKeys.assignments),
      );
      setLeaves(safeReadArray<PlannedLeave>(storageKeys.leaves));
      setWeekendAssignments(
        safeReadArray<WeekendAssignment>(
          storageKeys.weekendAssignments,
        ),
      );
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKeys]);

  useEffect(() => {
    if (ready) writeWorkforceData(storageKeys.employees, employees, area);
  }, [area, employees, ready, storageKeys]);

  useEffect(() => {
    if (ready) {
      writeWorkforceData(storageKeys.assignments, assignments, area);
    }
  }, [area, assignments, ready, storageKeys]);

  useEffect(() => {
    if (ready) writeWorkforceData(storageKeys.leaves, leaves, area);
  }, [area, leaves, ready, storageKeys]);

  useEffect(() => {
    if (ready) {
      writeWorkforceData(
        storageKeys.weekendAssignments,
        weekendAssignments,
        area,
      );
    }
  }, [area, ready, storageKeys, weekendAssignments]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const finish = () => setPrintActive(false);
    window.addEventListener("afterprint", finish);
    return () => window.removeEventListener("afterprint", finish);
  }, []);

  useEffect(() => {
    const printFromViki = () => printSchedule();
    window.addEventListener("warehouse-print-schedule", printFromViki);
    return () =>
      window.removeEventListener("warehouse-print-schedule", printFromViki);
  }, []);

  const dates = useMemo(() => monthDates(selectedMonth), [selectedMonth]);
  const calendarDates = useMemo(
    () => monthDates(calendarMonth),
    [calendarMonth],
  );
  const activeEmployees = employees.filter((employee) => employee.active);
  const monthlyLeaves = leaves.filter((leave) =>
    leaveOverlapsMonth(leave, selectedMonth)
  );
  const monthlyAssignments = assignments.filter((assignment) =>
    assignment.date.startsWith(selectedMonth)
  );
  const monthlyWeekendAssignments = weekendAssignments.filter((assignment) =>
    assignment.date.startsWith(selectedMonth)
  );
  const weekendDates = useMemo(() => dates.filter(isWeekend), [dates]);
  const calendarLeadingDays = useMemo(() => {
    const first = calendarDates[0];
    if (!first) return 0;
    return (new Date(first + "T12:00:00").getDay() + 6) % 7;
  }, [calendarDates]);

  const effectiveDraftEmployee = draftEmployee ||
    activeEmployees[0]?.id || "";
  const effectiveWeekendEmployee = weekendEmployee ||
    activeEmployees[0]?.id || "";
  const effectiveWeekendDate =
    weekendDate.startsWith(selectedMonth) && isWeekend(weekendDate)
      ? weekendDate
      : weekendDates[0] || "";

  const shiftWarnings = useMemo(() => {
    return dates.flatMap((date) =>
      shifts.flatMap((shift) => {
        const count = monthlyAssignments.filter(
          (item) => item.date === date && item.shift === shift,
        ).length;
        return count >= 3 ? [{ date, shift, count }] : [];
      })
    );
  }, [dates, monthlyAssignments]);

  const leaveCollisions = monthlyAssignments.filter((assignment) =>
    leaves.some((leave) =>
      leave.employeeId === assignment.employeeId &&
      leaveIncludesDate(leave, assignment.date)
    )
  );

  const printEmployeeGroups: Employee[][] = [];
  for (let index = 0; index < activeEmployees.length; index += 7) {
    printEmployeeGroups.push(activeEmployees.slice(index, index + 7));
  }
  if (printEmployeeGroups.length === 0) printEmployeeGroups.push([]);

  function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("employeeName") || "").trim();
    if (!name) return;
    if (
      employees.some((employee) =>
        employee.name.toLocaleLowerCase("pl") ===
          name.toLocaleLowerCase("pl")
      )
    ) {
      setNotice({
        message: "Taki pracownik znajduje się już na liście.",
        tone: "danger",
      });
      return;
    }
    const employee = { id: makeRecordId("EMP"), name, active: true };
    setEmployees((current) => [...current, employee]);
    if (!draftEmployee) setDraftEmployee(employee.id);
    if (!weekendEmployee) setWeekendEmployee(employee.id);
    event.currentTarget.reset();
    setNotice({
      message: "Dodano pracownika: " + name + ".",
      tone: "success",
    });
  }

  function toggleEmployee(id: string) {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id
          ? { ...employee, active: !employee.active }
          : employee
      )
    );
  }

  function removeEmployee(id: string) {
    if (
      assignments.some((assignment) => assignment.employeeId === id) ||
      leaves.some((leave) => leave.employeeId === id) ||
      weekendAssignments.some((assignment) => assignment.employeeId === id)
    ) {
      setNotice({
        message:
          "Pracownik ma zapisany grafik, weekend lub urlop. Najpierw usuń powiązane wpisy albo ustaw go jako nieaktywnego.",
        tone: "danger",
      });
      return;
    }
    setEmployees((current) =>
      current.filter((employee) => employee.id !== id)
    );
  }

  function selectCalendarDate(date: string) {
    if (isWeekend(date)) return;
    if (!selectingRangeEnd) {
      setDraftFrom(date);
      setDraftTo(date);
      setSelectingRangeEnd(true);
      return;
    }
    setDraftFrom(date < draftFrom ? date : draftFrom);
    setDraftTo(date < draftFrom ? draftFrom : date);
    setSelectingRangeEnd(false);
  }

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveDraftEmployee) {
      setNotice({
        message: "Najpierw dodaj i wybierz pracownika.",
        tone: "danger",
      });
      return;
    }
    const requestedDates = dateRange(draftFrom, draftTo).filter(
      (date) => !isWeekend(date),
    );
    if (requestedDates.length === 0) {
      setNotice({
        message: "W wybranym zakresie nie ma dni roboczych.",
        tone: "danger",
      });
      return;
    }

    let skippedLeave = 0;
    const acceptedDates = requestedDates.filter((date) => {
      const onLeave = leaves.some((leave) =>
        leave.employeeId === effectiveDraftEmployee &&
        leaveIncludesDate(leave, date)
      );
      if (onLeave) skippedLeave += 1;
      return !onLeave;
    });
    const requestedSet = new Set(acceptedDates);
    const retained = assignments.filter((assignment) =>
      assignment.employeeId !== effectiveDraftEmployee ||
      !requestedSet.has(assignment.date)
    );
    const added: ShiftAssignment[] = acceptedDates.map((date) => ({
      date,
      shift: draftShift,
      employeeId: effectiveDraftEmployee,
    }));
    const next = [...retained, ...added];
    setAssignments(next);
    changeMonth(draftFrom.slice(0, 7));

    const crowded = added.filter((entry) =>
      next.filter((assignment) =>
        assignment.date === entry.date &&
        assignment.shift === entry.shift
      ).length >= 3
    ).length;
    setNotice({
      message: "Ustawiono " + added.length + " " +
        (added.length === 1 ? "dzień" : "dni") +
        (skippedLeave
          ? ". Pominięto " + skippedLeave + " z powodu urlopu."
          : ".") +
        (crowded
          ? " " + crowded + " zmian ma obsadę co najmniej 3 osób."
          : ""),
      tone: skippedLeave > 0 || crowded > 0 ? "danger" : "success",
    });
  }

  function setCellShift(shift: ShiftId | null) {
    if (!selectedCell) return;
    const { date, employeeId } = selectedCell;
    if (
      shift &&
      leaves.some((leave) =>
        leave.employeeId === employeeId && leaveIncludesDate(leave, date)
      )
    ) {
      setNotice({
        message: "Nie można przypisać zmiany w dniu zaplanowanego urlopu.",
        tone: "danger",
      });
      return;
    }
    setAssignments((current) => {
      const retained = current.filter((assignment) =>
        assignment.date !== date || assignment.employeeId !== employeeId
      );
      return shift
        ? [...retained, { date, employeeId, shift }]
        : retained;
    });
    setNotice({
      message: employeeName(employees, employeeId) + ": " +
        (shift
          ? "ustawiono zmianę " + shiftNumber[shift] + " na " +
            formatDate(date) + "."
          : "wyczyszczono " + formatDate(date) + "."),
      tone: "success",
    });
    setCustomEditorOpen(false);
  }

  function selectScheduleCell(date: string, employeeId: string) {
    const existing = assignments.find((assignment) =>
      assignment.date === date && assignment.employeeId === employeeId
    );
    setSelectedCell({ date, employeeId });
    setCustomFrom(existing?.fromTime || "10:00");
    setCustomTo(existing?.toTime || "18:00");
    setCustomNote(existing?.note || "");
    setCustomEditorOpen(Boolean(existing?.fromTime && existing?.toTime));
  }

  function saveCustomHours() {
    if (!selectedCell) return;
    const { date, employeeId } = selectedCell;
    if (
      leaves.some((leave) =>
        leave.employeeId === employeeId && leaveIncludesDate(leave, date)
      )
    ) {
      setNotice({
        message: "Nie można ustawić godzin w dniu zaplanowanego urlopu.",
        tone: "danger",
      });
      return;
    }
    if (!customFrom || !customTo || customFrom === customTo) {
      setNotice({
        message: "Podaj różne godziny rozpoczęcia i zakończenia pracy.",
        tone: "danger",
      });
      return;
    }
    setAssignments((current) => {
      const retained = current.filter((assignment) =>
        assignment.date !== date || assignment.employeeId !== employeeId
      );
      return [...retained, {
        date,
        employeeId,
        fromTime: customFrom,
        toTime: customTo,
        note: customNote.trim(),
      }];
    });
    setNotice({
      message: employeeName(employees, employeeId) + ": ustawiono " +
        formatWorkHours(customFrom, customTo) + " na " + formatDate(date) +
        (customTo < customFrom ? " (zmiana przez północ)." : "."),
      tone: "success",
    });
    setCustomEditorOpen(false);
  }

  function openWeekend(date: string, employeeId?: string) {
    setWeekendDate(date);
    if (employeeId) setWeekendEmployee(employeeId);
    setTab("weekends");
  }

  function addWeekendAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !effectiveWeekendDate ||
      !effectiveWeekendEmployee ||
      !isWeekend(effectiveWeekendDate)
    ) {
      setNotice({
        message: "Wybierz dzień weekendowy i pracownika.",
        tone: "danger",
      });
      return;
    }
    if (weekendFrom >= weekendTo) {
      setNotice({
        message: "Godzina zakończenia musi być późniejsza od rozpoczęcia.",
        tone: "danger",
      });
      return;
    }
    if (
      leaves.some((leave) =>
        leave.employeeId === effectiveWeekendEmployee &&
        leaveIncludesDate(leave, effectiveWeekendDate)
      )
    ) {
      setNotice({
        message: "Ta osoba ma w wybranym dniu zaplanowany urlop.",
        tone: "danger",
      });
      return;
    }
    setWeekendAssignments((current) => {
      const retained = current.filter((assignment) =>
        assignment.date !== effectiveWeekendDate ||
        assignment.employeeId !== effectiveWeekendEmployee
      );
      return [...retained, {
        id: makeRecordId("WKE"),
        date: effectiveWeekendDate,
        employeeId: effectiveWeekendEmployee,
        fromTime: weekendFrom,
        toTime: weekendTo,
      }];
    });
    setNotice({
      message: "Dodano " +
        employeeName(employees, effectiveWeekendEmployee) +
        " do pracy weekendowej " + formatDate(effectiveWeekendDate) + ".",
      tone: "success",
    });
  }

  function addLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = String(form.get("leaveEmployee") || "");
    const from = String(form.get("leaveFrom") || "");
    const to = String(form.get("leaveTo") || "");
    const note = String(form.get("leaveNote") || "").trim();
    if (!employeeId || !from || !to) return;
    if (from > to) {
      setNotice({
        message:
          "Data zakończenia urlopu nie może być wcześniejsza od rozpoczęcia.",
        tone: "danger",
      });
      return;
    }
    setLeaves((current) => [
      ...current,
      { id: makeRecordId("LEV"), employeeId, from, to, note },
    ]);
    const collisions = assignments.filter((assignment) =>
      assignment.employeeId === employeeId &&
      assignment.date >= from &&
      assignment.date <= to
    ).length + weekendAssignments.filter((assignment) =>
      assignment.employeeId === employeeId &&
      assignment.date >= from &&
      assignment.date <= to
    ).length;
    event.currentTarget.reset();
    setNotice({
      message: collisions > 0
        ? "Urlop zapisany. Uwaga: koliduje z " + collisions +
          " wpisami w grafiku."
        : "Zaplanowany urlop został zapisany.",
      tone: collisions > 0 ? "danger" : "success",
    });
  }

  function scheduleMark(date: string, employeeId: string) {
    const leave = leaves.some((item) =>
      item.employeeId === employeeId && leaveIncludesDate(item, date)
    );
    if (leave) return { value: "U", detail: "Urlop", tone: "leave" };
    const weekend = weekendAssignments.find((item) =>
      item.employeeId === employeeId && item.date === date
    );
    if (weekend) {
      return {
        value: "W",
        detail: weekend.fromTime + "–" + weekend.toTime,
        tone: "weekend-work",
      };
    }
    const assignment = assignments.find((item) =>
      item.employeeId === employeeId && item.date === date
    );
    if (assignment?.fromTime && assignment.toTime) {
      return {
        value: formatWorkHours(
          assignment.fromTime,
          assignment.toTime,
          true,
        ),
        detail: "Godziny indywidualne " +
          formatWorkHours(assignment.fromTime, assignment.toTime) +
          (assignment.note ? " · " + assignment.note : ""),
        tone: "custom-hours",
      };
    }
    if (assignment?.shift) {
      return {
        value: shiftNumber[assignment.shift],
        detail: "Zmiana " + shiftNumber[assignment.shift],
        tone: "shift-" + shiftNumber[assignment.shift],
      };
    }
    return { value: "", detail: "Brak przypisania", tone: "empty" };
  }

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setCalendarMonth(month);
    setSelectedCell(null);
    setCustomEditorOpen(false);
  }

  function printSchedule() {
    setPrintActive(true);
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <div className="view-stack workforce-module">
      <section className="view-intro workforce-intro">
        <div>
          <span>PLANOWANIE ZESPOŁU · {areaLabels[area]}</span>
          <h2>Grafik pracowników</h2>
          <p>
            Ustaw zmiany w czytelnym arkuszu, zaplanuj weekendy i sprawdź
            urlopy.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={printSchedule}
          type="button"
        >
          <FileDown /> Drukuj / zapisz PDF
        </button>
      </section>

      {notice && (
        <div
          aria-live="polite"
          className={"module-notice " + notice.tone}
          role="status"
        >
          {notice.tone === "success" ? <CheckCircle2 /> : <AlertTriangle />}
          <span>{notice.message}</span>
        </div>
      )}

      <section className="workforce-kpis">
        <article>
          <span><Users /></span>
          <div>
            <strong>{activeEmployees.length}</strong>
            <small>aktywnych osób</small>
          </div>
        </article>
        <article>
          <span><CalendarDays /></span>
          <div>
            <strong>{monthlyAssignments.length}</strong>
            <small>dni ze zmianą</small>
          </div>
        </article>
        <article>
          <span><CalendarClock /></span>
          <div>
            <strong>{monthlyWeekendAssignments.length}</strong>
            <small>obsady weekendowe</small>
          </div>
        </article>
        <article className={leaveCollisions.length ? "danger" : "success"}>
          <span><AlertTriangle /></span>
          <div>
            <strong>{leaveCollisions.length}</strong>
            <small>kolizji z urlopem</small>
          </div>
        </article>
      </section>

      <section className="panel workforce-alerts">
        <div className="panel-heading">
          <div>
            <span>KOMUNIKATY GRAFIKU</span>
            <h3>{formatMonth(selectedMonth)}</h3>
          </div>
          <label className="month-control">
            <span>Miesiąc grafiku</span>
            <input
              onChange={(event) => changeMonth(event.target.value)}
              type="month"
              value={selectedMonth}
            />
          </label>
        </div>
        <div className="alert-feed">
          {monthlyLeaves.length > 0
            ? monthlyLeaves.map((leave) => (
              <div className="alert-feed-item leave danger" key={leave.id}>
                <Umbrella />
                <p>
                  <strong>{employeeName(employees, leave.employeeId)}</strong>
                  {" — urlop "}{formatDate(leave.from)}–{formatDate(leave.to)}
                  {leave.note ? " · " + leave.note : ""}
                </p>
              </div>
            ))
            : (
              <div className="alert-feed-item neutral">
                <Umbrella />
                <p>Brak zaplanowanych urlopów w tym miesiącu.</p>
              </div>
            )}
          {shiftWarnings.map((warning) => (
            <div
              className="alert-feed-item danger"
              key={warning.date + "-" + warning.shift}
            >
              <AlertTriangle />
              <p>
                <strong>
                  {formatDate(warning.date)} · zmiana{" "}
                  {shiftNumber[warning.shift]}
                </strong>
                {" — przypisano "}{warning.count} osoby.
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="module-tabs" role="tablist" aria-label="Sekcje grafiku">
        <button
          className={tab === "planner" ? "active" : ""}
          onClick={() => setTab("planner")}
          type="button"
        >
          <CalendarDays /> Grafik zmian
        </button>
        <button
          className={tab === "weekends" ? "active" : ""}
          onClick={() => setTab("weekends")}
          type="button"
        >
          <CalendarClock /> Praca weekend
        </button>
        <button
          className={tab === "employees" ? "active" : ""}
          onClick={() => setTab("employees")}
          type="button"
        >
          <Users /> Pracownicy
        </button>
        <button
          className={tab === "leaves" ? "active" : ""}
          onClick={() => setTab("leaves")}
          type="button"
        >
          <Umbrella /> Urlopy
        </button>
      </div>

      {tab === "planner" && (
        <>
          <form
            className="panel schedule-range-builder"
            id="schedule-range-builder"
            onSubmit={addAssignment}
          >
            <div className="schedule-range-settings">
              <div className="schedule-section-title">
                <span>SZYBKIE UZUPEŁNIANIE</span>
                <h3>Ustaw zmianę dla zakresu dni</h3>
                <p>
                  Wybierz pierwszy i ostatni dzień w dużym kalendarzu.
                  Weekendy są obsługiwane osobno.
                </p>
              </div>
              <div
                className="schedule-range-summary"
                aria-label="Wybrany zakres"
              >
                <button
                  onClick={() => {
                    setCalendarMonth(draftFrom.slice(0, 7));
                    setSelectingRangeEnd(false);
                  }}
                  type="button"
                >
                  <small>OD</small>
                  <strong>{formatDate(draftFrom)}</strong>
                </button>
                <span>—</span>
                <button
                  onClick={() => {
                    setCalendarMonth(draftTo.slice(0, 7));
                    setSelectingRangeEnd(true);
                  }}
                  type="button"
                >
                  <small>DO</small>
                  <strong>{formatDate(draftTo)}</strong>
                </button>
              </div>
              <label>
                Pracownik
                <select
                  onChange={(event) => setDraftEmployee(event.target.value)}
                  required
                  value={effectiveDraftEmployee}
                >
                  <option value="">Wybierz osobę</option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="shift-choice">
                <legend>Zmiana</legend>
                {shifts.map((shift) => (
                  <button
                    className={draftShift === shift ? "active" : ""}
                    key={shift}
                    onClick={() => setDraftShift(shift)}
                    type="button"
                  >
                    <strong>{shiftNumber[shift]}</strong>
                    <span>zmiana</span>
                  </button>
                ))}
              </fieldset>
              <button
                className="primary-button schedule-range-submit"
                type="submit"
              >
                <CheckCircle2 /> Ustaw wybrany zakres
              </button>
            </div>

            <div className="range-calendar">
              <div className="range-calendar-header">
                <button
                  aria-label="Poprzedni miesiąc"
                  onClick={() =>
                    setCalendarMonth(addMonths(calendarMonth, -1))}
                  type="button"
                >
                  <ChevronLeft />
                </button>
                <div>
                  <small>
                    {selectingRangeEnd
                      ? "WYBIERZ DZIEŃ DO"
                      : "WYBIERZ DZIEŃ OD"}
                  </small>
                  <strong>{formatMonth(calendarMonth)}</strong>
                </div>
                <button
                  aria-label="Następny miesiąc"
                  onClick={() =>
                    setCalendarMonth(addMonths(calendarMonth, 1))}
                  type="button"
                >
                  <ChevronRight />
                </button>
              </div>
              <div className="range-calendar-weekdays">
                {weekdayLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="range-calendar-grid">
                {Array.from({ length: calendarLeadingDays }, (_, index) => (
                  <span
                    aria-hidden="true"
                    className="calendar-spacer"
                    key={"spacer-" + index}
                  />
                ))}
                {calendarDates.map((date) => {
                  const weekend = isWeekend(date);
                  const inRange = date >= draftFrom && date <= draftTo;
                  const endpoint = date === draftFrom || date === draftTo;
                  const employeeLeave = leaves.some((leave) =>
                    leave.employeeId === effectiveDraftEmployee &&
                    leaveIncludesDate(leave, date)
                  );
                  const classNames = [
                    "calendar-day",
                    weekend ? "weekend" : "",
                    inRange ? "in-range" : "",
                    endpoint ? "endpoint" : "",
                    employeeLeave ? "has-leave" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <button
                      aria-label={formatDate(date) +
                        (weekend ? ", weekend" : "")}
                      className={classNames}
                      disabled={weekend}
                      key={date}
                      onClick={() => selectCalendarDate(date)}
                      type="button"
                    >
                      <strong>{Number(date.slice(-2))}</strong>
                      {employeeLeave && <span>U</span>}
                    </button>
                  );
                })}
              </div>
              <div className="range-calendar-legend">
                <span><i className="range-dot" /> Wybrany zakres</span>
                <span><i className="leave-dot" /> Urlop</span>
                <span><i className="weekend-dot" /> Weekend</span>
              </div>
            </div>
          </form>

          <section className="panel schedule-board">
            <div className="panel-heading">
              <div>
                <span>GRAFIK MIESIĘCZNY</span>
                <h3>{formatMonth(selectedMonth)}</h3>
              </div>
              <small className="board-hint">
                Dotknij komórkę, a potem wybierz numer zmiany.
              </small>
            </div>

            {selectedCell && !isWeekend(selectedCell.date) && (
              <div className="schedule-cell-editor-wrap">
                <div className="schedule-cell-editor">
                  <div>
                    <small>EDYTUJ WPIS</small>
                    <strong>
                      {employeeName(employees, selectedCell.employeeId)} ·{" "}
                      {formatDate(selectedCell.date)}
                    </strong>
                  </div>
                  <span>Wybierz zmianę:</span>
                  {shifts.map((shift) => (
                    <button
                      key={shift}
                      onClick={() => setCellShift(shift)}
                      type="button"
                    >
                      {shiftNumber[shift]}
                    </button>
                  ))}
                  <button
                    className="custom"
                    onClick={() => setCustomEditorOpen((current) => !current)}
                    type="button"
                  >
                    <Clock3 /> Inne godziny
                  </button>
                  <button
                    className="clear"
                    onClick={() => setCellShift(null)}
                    type="button"
                  >
                    Wyczyść
                  </button>
                </div>
                {customEditorOpen && (
                  <div className="schedule-custom-hours">
                    <div>
                      <Clock3 />
                      <span>
                        <strong>Indywidualne godziny pracy</strong>
                        <small>
                          Możesz zapisać także zmianę przez północ, np.
                          20:00–06:00.
                        </small>
                      </span>
                    </div>
                    <label>
                      Od
                      <input
                        onChange={(event) => setCustomFrom(event.target.value)}
                        type="time"
                        value={customFrom}
                      />
                    </label>
                    <label>
                      Do
                      <input
                        onChange={(event) => setCustomTo(event.target.value)}
                        type="time"
                        value={customTo}
                      />
                    </label>
                    <label className="note">
                      Uwagi
                      <input
                        onChange={(event) => setCustomNote(event.target.value)}
                        placeholder="opcjonalnie"
                        value={customNote}
                      />
                    </label>
                    <button
                      className="primary-button"
                      onClick={saveCustomHours}
                      type="button"
                    >
                      <CheckCircle2 /> Zapisz godziny
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="schedule-table-scroll">
              <table className="schedule-table schedule-matrix">
                <thead>
                  <tr>
                    <th>Data</th>
                    {activeEmployees.map((employee) => (
                      <th key={employee.id}><span>{employee.name}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date) => {
                    const weekend = isWeekend(date);
                    return (
                      <tr className={weekend ? "weekend" : ""} key={date}>
                        <td className="schedule-date-cell">
                          <strong>{formatDate(date, false)}</strong>
                          <small>{formatWeekday(date, true)}</small>
                        </td>
                        {activeEmployees.map((employee) => {
                          const mark = scheduleMark(date, employee.id);
                          const isSelected =
                            selectedCell?.date === date &&
                            selectedCell.employeeId === employee.id;
                          return (
                            <td key={employee.id}>
                              <button
                                aria-label={employee.name + ", " +
                                  formatDate(date) + ": " + mark.detail}
                                className={"schedule-matrix-cell " +
                                  mark.tone +
                                  (isSelected ? " selected" : "")}
                                onClick={() =>
                                  weekend
                                    ? openWeekend(date, employee.id)
                                    : selectScheduleCell(date, employee.id)}
                                title={mark.detail}
                                type="button"
                              >
                                <strong>{mark.value || "·"}</strong>
                                {mark.tone === "weekend-work" && (
                                  <small>{mark.detail}</small>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {activeEmployees.length === 0 && (
                <div className="module-empty schedule-empty">
                  <Users />
                  <strong>Najpierw dodaj pracowników</strong>
                  <p>
                    Po dodaniu osób każda z nich otrzyma własną kolumnę
                    w grafiku.
                  </p>
                </div>
              )}
            </div>
            <div className="schedule-matrix-legend">
              <span><i className="shift-one" /> 1 · pierwsza zmiana</span>
              <span><i className="shift-two" /> 2 · druga zmiana</span>
              <span><i className="shift-three" /> 3 · trzecia zmiana</span>
              <span>
                <i className="custom-hours" /> Godziny indywidualne
              </span>
              <span><i className="leave" /> U · urlop</span>
              <span><i className="weekend-work" /> W · praca weekend</span>
            </div>
          </section>
        </>
      )}

      {tab === "weekends" && (
        <section className="panel weekend-work-panel">
          <div className="panel-heading">
            <div>
              <span>OSOBNE PLANOWANIE</span>
              <h3>Praca weekend · {formatMonth(selectedMonth)}</h3>
            </div>
            <small className="board-hint">
              Weekend nie miesza się ze zwykłym grafikiem zmianowym.
            </small>
          </div>
          <form className="weekend-work-form" onSubmit={addWeekendAssignment}>
            <label>
              Sobota lub niedziela
              <select
                onChange={(event) => setWeekendDate(event.target.value)}
                required
                value={effectiveWeekendDate}
              >
                {weekendDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)} · {formatWeekday(date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pracownik
              <select
                onChange={(event) => setWeekendEmployee(event.target.value)}
                required
                value={effectiveWeekendEmployee}
              >
                <option value="">Wybierz osobę</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Od
              <input
                onChange={(event) => setWeekendFrom(event.target.value)}
                required
                type="time"
                value={weekendFrom}
              />
            </label>
            <label>
              Do
              <input
                onChange={(event) => setWeekendTo(event.target.value)}
                required
                type="time"
                value={weekendTo}
              />
            </label>
            <button className="primary-button" type="submit">
              <Plus /> Dodaj do listy
            </button>
          </form>
          <div className="weekend-days-list">
            {weekendDates.map((date) => {
              const entries = weekendAssignments.filter(
                (assignment) => assignment.date === date,
              );
              return (
                <article className={entries.length ? "filled" : ""} key={date}>
                  <header>
                    <span>
                      <strong>{formatDate(date, false)}</strong>
                      <small>{formatWeekday(date)}</small>
                    </span>
                    <em>
                      {entries.length} {entries.length === 1 ? "osoba" : "osób"}
                    </em>
                  </header>
                  <div>
                    {entries.length
                      ? entries.map((entry) => (
                        <p key={entry.id}>
                          <span className="person-avatar small">
                            {employeeInitials(
                              employeeName(employees, entry.employeeId),
                            )}
                          </span>
                          <strong>
                            {employeeName(employees, entry.employeeId)}
                          </strong>
                          <small>
                            <Clock3 /> {entry.fromTime}–{entry.toTime}
                          </small>
                          <button
                            aria-label={"Usuń " +
                              employeeName(employees, entry.employeeId) +
                              " z weekendu"}
                            className="icon-danger-button"
                            onClick={() =>
                              setWeekendAssignments((current) =>
                                current.filter((item) => item.id !== entry.id)
                              )}
                            type="button"
                          >
                            <Trash2 />
                          </button>
                        </p>
                      ))
                      : (
                        <span className="weekend-empty">
                          Brak zaplanowanej obsady
                        </span>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === "employees" && (
        <section className="panel people-panel">
          <div className="panel-heading">
            <div>
              <span>LISTA ZESPOŁU</span>
              <h3>Pracownicy magazynu</h3>
            </div>
          </div>
          <form className="employee-add-form" onSubmit={addEmployee}>
            <label>
              Imię i nazwisko
              <input
                name="employeeName"
                placeholder="np. Jan Kowalski"
                required
              />
            </label>
            <button className="primary-button" type="submit">
              <UserRoundPlus /> Dodaj pracownika
            </button>
          </form>
          <div className="people-list">
            {employees.length > 0
              ? employees.map((employee) => (
                <article
                  className={!employee.active ? "inactive" : ""}
                  key={employee.id}
                >
                  <span className="person-avatar">
                    {employeeInitials(employee.name)}
                  </span>
                  <div>
                    <strong>{employee.name}</strong>
                    <small>
                      {employee.active ? "Aktywny w grafiku" : "Nieaktywny"}
                    </small>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => toggleEmployee(employee.id)}
                    type="button"
                  >
                    {employee.active ? "Dezaktywuj" : "Aktywuj"}
                  </button>
                  <button
                    aria-label={"Usuń " + employee.name}
                    className="icon-danger-button"
                    onClick={() => removeEmployee(employee.id)}
                    type="button"
                  >
                    <Trash2 />
                  </button>
                </article>
              ))
              : (
                <div className="module-empty">
                  <Users />
                  <strong>Lista pracowników jest pusta</strong>
                  <p>
                    Dodaj osoby, które mają pojawiać się w grafiku i kartach
                    mycia.
                  </p>
                </div>
              )}
          </div>
        </section>
      )}

      {tab === "leaves" && (
        <section className="panel leave-panel">
          <div className="panel-heading">
            <div>
              <span>PLAN NIEOBECNOŚCI</span>
              <h3>Zaplanowane urlopy</h3>
            </div>
          </div>
          <form className="leave-add-form" onSubmit={addLeave}>
            <label>
              Pracownik
              <select name="leaveEmployee" required defaultValue="">
                <option disabled value="">Wybierz osobę</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Od <input name="leaveFrom" required type="date" />
            </label>
            <label>
              Do <input name="leaveTo" required type="date" />
            </label>
            <label>
              Uwagi <input name="leaveNote" placeholder="opcjonalnie" />
            </label>
            <button className="primary-button" type="submit">
              <Plus /> Zaplanuj urlop
            </button>
          </form>
          <div className="leave-list">
            {leaves.length > 0
              ? [...leaves].sort((a, b) => a.from.localeCompare(b.from)).map(
                (leave) => (
                  <article key={leave.id}>
                    <span><Umbrella /></span>
                    <div>
                      <strong>
                        {employeeName(employees, leave.employeeId)}
                      </strong>
                      <p>
                        {formatDate(leave.from)}–{formatDate(leave.to)}
                        {leave.note ? " · " + leave.note : ""}
                      </p>
                    </div>
                    <button
                      aria-label="Usuń urlop"
                      className="icon-danger-button"
                      onClick={() =>
                        setLeaves((current) =>
                          current.filter((item) => item.id !== leave.id)
                        )}
                      type="button"
                    >
                      <Trash2 />
                    </button>
                  </article>
                ),
              )
              : (
                <div className="module-empty">
                  <Umbrella />
                  <strong>Nie ma jeszcze zaplanowanych urlopów</strong>
                  <p>
                    Dodany urlop pojawi się w komunikatach i w tabeli grafiku.
                  </p>
                </div>
              )}
          </div>
        </section>
      )}

      <div
        className={"schedule-print-document " +
          (printActive ? "print-active" : "")}
      >
        {printEmployeeGroups.map((group, groupIndex) => (
          <section
            className="schedule-print-page"
            key={"print-group-" + groupIndex}
          >
            <header>
              <div className="schedule-print-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Masterpress"
                  src={import.meta.env.BASE_URL + "masterpress-logo-dark.png"}
                />
                <span>WAREHOUSE MASTERPRESS · {areaLabels[area]}</span>
              </div>
              <div className="schedule-print-heading">
                <h1>Grafik pracowników</h1>
                <p>{formatMonth(selectedMonth)}</p>
              </div>
              <aside>
                {printEmployeeGroups.length > 1 && (
                  <small>
                    ZESPÓŁ {groupIndex + 1}/{printEmployeeGroups.length}
                  </small>
                )}
                <small>DATA WYDRUKU</small>
                <strong>{formatDate(localIsoDate())}</strong>
              </aside>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  {group.map((employee) => (
                    <th key={employee.id}>{employee.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr
                    className={isWeekend(date) ? "weekend" : ""}
                    key={date}
                  >
                    <td>
                      <strong>{formatDate(date)}</strong>
                    </td>
                    {group.map((employee) => {
                      const mark = scheduleMark(date, employee.id);
                      return (
                        <td className={mark.tone} key={employee.id}>
                          <strong>{mark.value}</strong>
                          {mark.tone === "weekend-work" && (
                            <small>{mark.detail}</small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="schedule-print-legend">
              <span><b>1 / 2 / 3</b> numer zmiany</span>
              <span><b>10–18</b> indywidualne godziny</span>
              <span><b>U</b> urlop</span>
              <span><b>W</b> praca weekend</span>
            </div>
            <footer>
              <span>Masterpress S.A.</span>
              <span>Grafik wygenerowany w Warehouse Masterpress</span>
            </footer>
          </section>
        ))}
      </div>
    </div>
  );
}
