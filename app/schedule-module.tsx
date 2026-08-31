"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileDown,
  Plus,
  Trash2,
  Umbrella,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  currentMonthKey,
  employeeInitials,
  formatDate,
  formatMonth,
  formatWeekday,
  leaveIncludesDate,
  leaveOverlapsMonth,
  localIsoDate,
  makeRecordId,
  monthDates,
  safeReadArray,
  shifts,
  workforceStorageKeys,
  type Employee,
  type PlannedLeave,
  type ShiftAssignment,
  type ShiftId,
} from "./workforce-model";

type ScheduleTab = "planner" | "employees" | "leaves";

function employeeName(employees: Employee[], id: string) {
  return employees.find((employee) => employee.id === id)?.name ||
    "Nieznany pracownik";
}

function writeWorkforceData<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("warehouse-workforce-updated"));
}

export function WorkforceSummary() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<PlannedLeave[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const month = currentMonthKey();

  useEffect(() => {
    const load = () => {
      setEmployees(
        safeReadArray<Employee>(workforceStorageKeys.employees),
      );
      setLeaves(safeReadArray<PlannedLeave>(workforceStorageKeys.leaves));
      setAssignments(
        safeReadArray<ShiftAssignment>(workforceStorageKeys.assignments),
      );
    };
    load();
    window.addEventListener("warehouse-workforce-updated", load);
    return () => window.removeEventListener("warehouse-workforce-updated", load);
  }, []);

  const monthlyLeaves = leaves.filter((leave) =>
    leaveOverlapsMonth(leave, month),
  );
  const fullShifts = monthDates(month).reduce((total, date) => {
    return total + shifts.filter((shift) =>
      assignments.filter(
        (assignment) => assignment.date === date && assignment.shift === shift,
      ).length >= 3
    ).length;
  }, 0);

  return (
    <section className="workforce-summary">
      <div className="workforce-summary-heading">
        <span><CalendarDays /></span>
        <div>
          <small>GRAFIK I NIEOBECNOŚCI</small>
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
              `${employeeName(employees, leave.employeeId)} (${formatDate(leave.from, false)}–${formatDate(leave.to, false)})`
            ).join(", ")}.
          </p>
        ) : (
          <p>Brak zaplanowanych urlopów w bieżącym miesiącu.</p>
        )}
      </div>
    </section>
  );
}

export function ScheduleModule() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ScheduleTab>("planner");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [leaves, setLeaves] = useState<PlannedLeave[]>([]);
  const [draftDate, setDraftDate] = useState(localIsoDate());
  const [draftShift, setDraftShift] = useState<ShiftId>("I");
  const [draftEmployee, setDraftEmployee] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [printActive, setPrintActive] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(safeReadArray<Employee>(workforceStorageKeys.employees));
      setAssignments(
        safeReadArray<ShiftAssignment>(workforceStorageKeys.assignments),
      );
      setLeaves(safeReadArray<PlannedLeave>(workforceStorageKeys.leaves));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeWorkforceData(workforceStorageKeys.employees, employees);
  }, [employees, ready]);

  useEffect(() => {
    if (!ready) return;
    writeWorkforceData(workforceStorageKeys.assignments, assignments);
  }, [assignments, ready]);

  useEffect(() => {
    if (!ready) return;
    writeWorkforceData(workforceStorageKeys.leaves, leaves);
  }, [leaves, ready]);

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

  const dates = useMemo(() => monthDates(selectedMonth), [selectedMonth]);
  const activeEmployees = employees.filter((employee) => employee.active);
  const monthlyLeaves = leaves.filter((leave) =>
    leaveOverlapsMonth(leave, selectedMonth),
  );
  const monthlyAssignments = assignments.filter((assignment) =>
    assignment.date.startsWith(selectedMonth),
  );

  const shiftWarnings = useMemo(() => {
    return dates.flatMap((date) =>
      shifts.flatMap((shift) => {
        const assigned = monthlyAssignments.filter(
          (item) => item.date === date && item.shift === shift,
        );
        if (assigned.length < 3) return [];
        return [{
          date,
          shift,
          count: assigned.length,
          tone: assigned.length === 3 ? "good" : "warning",
        } as const];
      }),
    );
  }, [dates, monthlyAssignments]);

  const leaveCollisions = monthlyAssignments.filter((assignment) =>
    leaves.some(
      (leave) =>
        leave.employeeId === assignment.employeeId &&
        leaveIncludesDate(leave, assignment.date),
    ),
  );

  function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("employeeName") || "").trim();
    if (!name) return;
    if (
      employees.some(
        (employee) =>
          employee.name.toLocaleLowerCase("pl") ===
          name.toLocaleLowerCase("pl"),
      )
    ) {
      setNotice("Taki pracownik znajduje się już na liście.");
      return;
    }
    const employee = { id: makeRecordId("EMP"), name, active: true };
    setEmployees((current) => [...current, employee]);
    if (!draftEmployee) setDraftEmployee(employee.id);
    event.currentTarget.reset();
    setNotice(`Dodano pracownika: ${name}.`);
  }

  function toggleEmployee(id: string) {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id
          ? { ...employee, active: !employee.active }
          : employee,
      ),
    );
  }

  function removeEmployee(id: string) {
    if (
      assignments.some((assignment) => assignment.employeeId === id) ||
      leaves.some((leave) => leave.employeeId === id)
    ) {
      setNotice(
        "Pracownik ma zapisany grafik lub urlop. Najpierw usuń powiązane wpisy albo ustaw go jako nieaktywnego.",
      );
      return;
    }
    setEmployees((current) => current.filter((employee) => employee.id !== id));
  }

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftEmployee) {
      setNotice("Najpierw dodaj pracownika i wybierz go z listy.");
      return;
    }
    if (
      leaves.some(
        (leave) =>
          leave.employeeId === draftEmployee &&
          leaveIncludesDate(leave, draftDate),
      )
    ) {
      setNotice("Ta osoba ma w wybranym dniu zaplanowany urlop.");
      return;
    }
    if (
      assignments.some(
        (assignment) =>
          assignment.date === draftDate &&
          assignment.employeeId === draftEmployee,
      )
    ) {
      setNotice("Ta osoba jest już przypisana do zmiany w wybranym dniu.");
      return;
    }
    const next = [
      ...assignments,
      { date: draftDate, shift: draftShift, employeeId: draftEmployee },
    ];
    setAssignments(next);
    const count = next.filter(
      (assignment) =>
        assignment.date === draftDate && assignment.shift === draftShift,
    ).length;
    setNotice(
      count === 3
        ? `Pełna obsada: na ${draftShift} zmianie są teraz 3 osoby.`
        : count > 3
          ? `Uwaga: na ${draftShift} zmianie są już ${count} osoby.`
          : "Pracownik został dodany do grafiku.",
    );
  }

  function removeAssignment(assignment: ShiftAssignment) {
    setAssignments((current) =>
      current.filter(
        (item) =>
          !(
            item.date === assignment.date &&
            item.shift === assignment.shift &&
            item.employeeId === assignment.employeeId
          ),
      ),
    );
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
      setNotice("Data zakończenia urlopu nie może być wcześniejsza od rozpoczęcia.");
      return;
    }
    setLeaves((current) => [
      ...current,
      { id: makeRecordId("LEV"), employeeId, from, to, note },
    ]);
    const collisions = assignments.filter(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.date >= from &&
        assignment.date <= to,
    ).length;
    event.currentTarget.reset();
    setNotice(
      collisions > 0
        ? `Urlop zapisany. Uwaga: koliduje z ${collisions} wpisami w grafiku.`
        : "Zaplanowany urlop został zapisany.",
    );
  }

  function prepareAssignment(date: string, shift: ShiftId) {
    setDraftDate(date);
    setDraftShift(shift);
    setTab("planner");
    document.getElementById("schedule-quick-add")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function printSchedule() {
    setPrintActive(true);
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <div className="view-stack workforce-module">
      <section className="view-intro workforce-intro">
        <div>
          <span>PLANOWANIE ZESPOŁU</span>
          <h2>Grafik pracowników</h2>
          <p>
            Ustaw obsadę zmian, zaplanuj urlopy i od razu sprawdź konflikty.
          </p>
        </div>
        <button className="primary-button" onClick={printSchedule} type="button">
          <FileDown /> Drukuj / zapisz PDF
        </button>
      </section>

      {notice && (
        <div aria-live="polite" className="module-notice" role="status">
          <CheckCircle2 /> <span>{notice}</span>
        </div>
      )}

      <section className="workforce-kpis">
        <article>
          <span><Users /></span>
          <div><strong>{activeEmployees.length}</strong><small>aktywnych osób</small></div>
        </article>
        <article>
          <span><CalendarDays /></span>
          <div><strong>{monthlyAssignments.length}</strong><small>przypisań w miesiącu</small></div>
        </article>
        <article>
          <span><Umbrella /></span>
          <div><strong>{monthlyLeaves.length}</strong><small>urlopów w miesiącu</small></div>
        </article>
        <article className={leaveCollisions.length ? "danger" : "success"}>
          <span><AlertTriangle /></span>
          <div><strong>{leaveCollisions.length}</strong><small>kolizji z urlopem</small></div>
        </article>
      </section>

      <section className="panel workforce-alerts">
        <div className="panel-heading">
          <div>
            <span>AUTOMATYCZNE KOMUNIKATY</span>
            <h3>{formatMonth(selectedMonth)}</h3>
          </div>
          <label className="month-control">
            <span>Miesiąc grafiku</span>
            <input
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setDraftDate(`${event.target.value}-01`);
              }}
              type="month"
              value={selectedMonth}
            />
          </label>
        </div>
        <div className="alert-feed">
          {monthlyLeaves.length > 0 ? monthlyLeaves.map((leave) => (
            <div className="alert-feed-item leave" key={leave.id}>
              <Umbrella />
              <p>
                <strong>{employeeName(employees, leave.employeeId)}</strong> — urlop
                {" "}{formatDate(leave.from)}–{formatDate(leave.to)}
                {leave.note ? ` · ${leave.note}` : ""}
              </p>
            </div>
          )) : (
            <div className="alert-feed-item neutral">
              <Umbrella /> <p>Brak zaplanowanych urlopów w tym miesiącu.</p>
            </div>
          )}
          {shiftWarnings.map((warning) => (
            <div
              className={`alert-feed-item ${warning.tone}`}
              key={`${warning.date}-${warning.shift}`}
            >
              {warning.tone === "good" ? <CheckCircle2 /> : <AlertTriangle />}
              <p>
                <strong>{formatDate(warning.date)} · {warning.shift} zmiana</strong>
                {" "}— przypisano {warning.count} osoby.
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="module-tabs" role="tablist" aria-label="Sekcje grafiku">
        <button className={tab === "planner" ? "active" : ""} onClick={() => setTab("planner")} type="button">
          <CalendarDays /> Grafik zmian
        </button>
        <button className={tab === "employees" ? "active" : ""} onClick={() => setTab("employees")} type="button">
          <Users /> Pracownicy
        </button>
        <button className={tab === "leaves" ? "active" : ""} onClick={() => setTab("leaves")} type="button">
          <Umbrella /> Urlopy
        </button>
      </div>

      {tab === "planner" && (
        <>
          <form className="panel schedule-quick-add" id="schedule-quick-add" onSubmit={addAssignment}>
            <div>
              <span>SZYBKIE PRZYPISANIE</span>
              <h3>Dodaj osobę do zmiany</h3>
            </div>
            <label>
              Data
              <input onChange={(event) => setDraftDate(event.target.value)} required type="date" value={draftDate} />
            </label>
            <label>
              Zmiana
              <select onChange={(event) => setDraftShift(event.target.value as ShiftId)} value={draftShift}>
                {shifts.map((shift) => <option key={shift} value={shift}>{shift} zmiana</option>)}
              </select>
            </label>
            <label>
              Pracownik
              <select onChange={(event) => setDraftEmployee(event.target.value)} required value={draftEmployee}>
                <option value="">Wybierz osobę</option>
                {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
            <button className="primary-button" type="submit"><Plus /> Dodaj</button>
          </form>

          <section className="panel schedule-board">
            <div className="panel-heading">
              <div>
                <span>GRAFIK MIESIĘCZNY</span>
                <h3>{formatMonth(selectedMonth)}</h3>
              </div>
              <small className="board-hint">Dotknij „+”, aby przygotować przypisanie.</small>
            </div>
            <div className="schedule-table-scroll">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dzień</th>
                    {shifts.map((shift) => <th key={shift}>{shift} zmiana</th>)}
                    <th>Nieobecności</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date) => {
                    const weekend = ["sobota", "niedziela"].includes(formatWeekday(date));
                    const dayLeaves = leaves.filter((leave) => leaveIncludesDate(leave, date));
                    return (
                      <tr className={weekend ? "weekend" : ""} key={date}>
                        <td><strong>{formatDate(date, false)}</strong></td>
                        <td>{formatWeekday(date, true)}</td>
                        {shifts.map((shift) => {
                          const cellAssignments = assignments.filter(
                            (assignment) => assignment.date === date && assignment.shift === shift,
                          );
                          return (
                            <td key={shift}>
                              <div className={`shift-cell ${cellAssignments.length >= 3 ? "full" : ""}`}>
                                {cellAssignments.map((assignment) => (
                                  <span className="employee-chip" key={assignment.employeeId}>
                                    <i>{employeeInitials(employeeName(employees, assignment.employeeId))}</i>
                                    {employeeName(employees, assignment.employeeId)}
                                    <button aria-label={`Usuń ${employeeName(employees, assignment.employeeId)} z grafiku`} onClick={() => removeAssignment(assignment)} type="button"><X /></button>
                                  </span>
                                ))}
                                <button className="shift-add" onClick={() => prepareAssignment(date, shift)} type="button"><Plus /> Dodaj</button>
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          <div className="leave-cell">
                            {dayLeaves.map((leave) => (
                              <span key={leave.id}><Umbrella /> {employeeName(employees, leave.employeeId)}</span>
                            ))}
                            {dayLeaves.length === 0 && <small>—</small>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "employees" && (
        <section className="panel people-panel">
          <div className="panel-heading">
            <div><span>LISTA ZESPOŁU</span><h3>Pracownicy magazynu</h3></div>
          </div>
          <form className="employee-add-form" onSubmit={addEmployee}>
            <label>
              Imię i nazwisko
              <input name="employeeName" placeholder="np. Jan Kowalski" required />
            </label>
            <button className="primary-button" type="submit"><UserRoundPlus /> Dodaj pracownika</button>
          </form>
          <div className="people-list">
            {employees.length > 0 ? employees.map((employee) => (
              <article className={!employee.active ? "inactive" : ""} key={employee.id}>
                <span className="person-avatar">{employeeInitials(employee.name)}</span>
                <div><strong>{employee.name}</strong><small>{employee.active ? "Aktywny w grafiku" : "Nieaktywny"}</small></div>
                <button className="secondary-button" onClick={() => toggleEmployee(employee.id)} type="button">
                  {employee.active ? "Dezaktywuj" : "Aktywuj"}
                </button>
                <button aria-label={`Usuń ${employee.name}`} className="icon-danger-button" onClick={() => removeEmployee(employee.id)} type="button"><Trash2 /></button>
              </article>
            )) : (
              <div className="module-empty"><Users /><strong>Lista pracowników jest pusta</strong><p>Dodaj osoby, które mają pojawiać się w grafiku i kartach mycia.</p></div>
            )}
          </div>
        </section>
      )}

      {tab === "leaves" && (
        <section className="panel leave-panel">
          <div className="panel-heading">
            <div><span>PLAN NIEOBECNOŚCI</span><h3>Zaplanowane urlopy</h3></div>
          </div>
          <form className="leave-add-form" onSubmit={addLeave}>
            <label>
              Pracownik
              <select name="leaveEmployee" required defaultValue="">
                <option disabled value="">Wybierz osobę</option>
                {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
            <label>Od <input name="leaveFrom" required type="date" /></label>
            <label>Do <input name="leaveTo" required type="date" /></label>
            <label>Uwagi <input name="leaveNote" placeholder="opcjonalnie" /></label>
            <button className="primary-button" type="submit"><Plus /> Zaplanuj urlop</button>
          </form>
          <div className="leave-list">
            {leaves.length > 0 ? [...leaves].sort((a, b) => a.from.localeCompare(b.from)).map((leave) => (
              <article key={leave.id}>
                <span><Umbrella /></span>
                <div><strong>{employeeName(employees, leave.employeeId)}</strong><p>{formatDate(leave.from)}–{formatDate(leave.to)}{leave.note ? ` · ${leave.note}` : ""}</p></div>
                <button aria-label="Usuń urlop" className="icon-danger-button" onClick={() => setLeaves((current) => current.filter((item) => item.id !== leave.id))} type="button"><Trash2 /></button>
              </article>
            )) : (
              <div className="module-empty"><Umbrella /><strong>Nie ma jeszcze zaplanowanych urlopów</strong><p>Dodany urlop pojawi się w komunikatach i w tabeli grafiku.</p></div>
            )}
          </div>
        </section>
      )}

      <div className={`schedule-print-document ${printActive ? "print-active" : ""}`}>
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Masterpress" src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`} />
          <div><span>WAREHOUSE MASTERPRESS</span><h1>Grafik pracowników</h1><p>{formatMonth(selectedMonth)}</p></div>
          <aside><small>Wygenerowano</small><strong>{formatDate(localIsoDate())}</strong></aside>
        </header>
        <table>
          <thead><tr><th>Data</th><th>Dzień</th>{shifts.map((shift) => <th key={shift}>{shift} zmiana</th>)}<th>Urlop</th></tr></thead>
          <tbody>
            {dates.map((date) => (
              <tr key={date}>
                <td>{formatDate(date, false)}</td>
                <td>{formatWeekday(date, true)}</td>
                {shifts.map((shift) => (
                  <td key={shift}>{assignments.filter((item) => item.date === date && item.shift === shift).map((item) => employeeName(employees, item.employeeId)).join(", ") || "—"}</td>
                ))}
                <td>{leaves.filter((leave) => leaveIncludesDate(leave, date)).map((leave) => employeeName(employees, leave.employeeId)).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer><span>Masterpress S.A.</span><span>Grafik wygenerowany w Warehouse Masterpress</span></footer>
      </div>
    </div>
  );
}
