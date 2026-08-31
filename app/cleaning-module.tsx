"use client";

import {
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Droplets,
  FileDown,
  Printer,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  currentMonthKey,
  currentWeekKey,
  formatDate,
  formatMonth,
  formatWeekday,
  safeReadArray,
  weekDates,
  weekNumber,
  weeksInIsoYear,
  workforceStorageKeys,
  yearFromWeekKey,
  type CleaningFrequency,
  type CleaningResponsibility,
  type CleaningWarehouse,
  type Employee,
} from "./workforce-model";

const warehouseLabels: Record<CleaningWarehouse, string> = {
  raw: "Magazyn surowców",
  finished: "Magazyn wyrobów gotowych",
};

const weeklyTasks: Record<CleaningWarehouse, string[]> = {
  raw: [
    "Regały magazynowe (Nowy magazyn)",
    "Wózki elektryczne i prostowniki",
    "Stanowisko komputerowe na Nowym magazynie",
    "Regał na materiały pomocnicze",
    "Palety plastikowe",
  ],
  finished: [
    "Regały magazynowe (symbol K)",
    "Wózki elektryczne i prostownik",
    "Owijarka",
    "Stanowisko komputerowe przy owijarce",
    "Regał nadwyżek",
  ],
};

const monthlyTasks: Record<CleaningWarehouse, string[]> = {
  raw: [
    "Drzwi magazyn – druga hala",
    "Drzwi ramp (nr 3–4) i drzwi rampa–magazyn",
    "Okna w biurze magazynu",
  ],
  finished: [
    "Drzwi ramp (nr 1–2) i drzwi rampa–magazyn",
    "Drzwi w magazynie chemicznym",
    "Okna w biurze magazynu",
  ],
};

const dailyTasks = [
  "Podłoga ramp",
  "Podłoga magazynu",
  "Podłoga magazynu chemicznego",
];

const formCodes: Record<CleaningFrequency, string> = {
  daily: "F-02a/P-H-03 · wydanie 3",
  weekly: "F-02b/P-H-03 · wydanie 3",
  monthly: "F-02c/P-H-03 · wydanie 3",
};

function employeeName(employees: Employee[], id: string) {
  return employees.find((employee) => employee.id === id)?.name || "";
}

function frequencyLabel(frequency: CleaningFrequency) {
  if (frequency === "daily") return "codziennym";
  if (frequency === "weekly") return "tygodniowym";
  return "miesięcznym";
}

export function CleaningModule() {
  const [ready, setReady] = useState(false);
  const [warehouse, setWarehouse] = useState<CleaningWarehouse>("raw");
  const [frequency, setFrequency] = useState<CleaningFrequency>("weekly");
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [planYear, setPlanYear] = useState(new Date().getFullYear());
  const [planStartWeek, setPlanStartWeek] = useState(
    weekNumber(currentWeekKey()),
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responsibilities, setResponsibilities] = useState<
    CleaningResponsibility[]
  >([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [printMode, setPrintMode] = useState<"card" | "plan" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(safeReadArray<Employee>(workforceStorageKeys.employees));
      setResponsibilities(
        safeReadArray<CleaningResponsibility>(
          workforceStorageKeys.cleaningResponsibilities,
        ),
      );
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      workforceStorageKeys.cleaningResponsibilities,
      JSON.stringify(responsibilities),
    );
  }, [ready, responsibilities]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const finish = () => setPrintMode(null);
    window.addEventListener("afterprint", finish);
    return () => window.removeEventListener("afterprint", finish);
  }, []);

  const week = weekNumber(selectedWeek);
  const weekYear = yearFromWeekKey(selectedWeek);
  const selectedWeekDates = weekDates(selectedWeek);
  const activeEmployees = employees.filter((employee) => employee.active);
  const tasks = frequency === "monthly"
    ? monthlyTasks[warehouse]
    : frequency === "daily"
      ? dailyTasks
      : weeklyTasks[warehouse];

  const periodLabel = frequency === "monthly"
    ? formatMonth(selectedMonth)
    : `Tydzień ${week} · ${formatDate(selectedWeekDates[0] || "", false)}–${formatDate(selectedWeekDates[6] || "")}`;

  const selectedResponsible = useMemo(() => {
    if (frequency !== "monthly") {
      const entry = responsibilities.find(
        (item) =>
          item.warehouse === warehouse &&
          item.year === weekYear &&
          item.week === week,
      );
      return employeeName(employees, entry?.employeeId || "");
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    const names = new Set<string>();
    responsibilities
      .filter((item) => item.warehouse === warehouse && item.year === year)
      .forEach((item) => {
        const dates = weekDates(
          `${item.year}-W${String(item.week).padStart(2, "0")}`,
        );
        if (dates.some((date) => Number(date.slice(5, 7)) === month)) {
          const name = employeeName(employees, item.employeeId);
          if (name) names.add(name);
        }
      });
    return [...names].join(", ");
  }, [employees, frequency, responsibilities, selectedMonth, warehouse, week, weekYear]);

  const cardRows = (() => {
    if (frequency === "daily") {
      return selectedWeekDates.slice(0, 5).flatMap((date) =>
        dailyTasks.map((task) => ({
          period: `${formatWeekday(date, true)} ${formatDate(date, false)}`,
          task,
        })),
      );
    }
    return tasks.map((task) => ({
      period: frequency === "weekly" ? `T${week}` : formatMonth(selectedMonth),
      task,
    }));
  })();

  const planWeeks = Array.from(
    {
      length: Math.min(
        12,
        Math.max(0, weeksInIsoYear(planYear) - planStartWeek + 1),
      ),
    },
    (_, index) => planStartWeek + index,
  );

  function setResponsibility(targetWeek: number, employeeId: string) {
    setResponsibilities((current) => {
      const without = current.filter(
        (item) =>
          !(
            item.warehouse === warehouse &&
            item.year === planYear &&
            item.week === targetWeek
          ),
      );
      return employeeId
        ? [...without, { warehouse, year: planYear, week: targetWeek, employeeId }]
        : without;
    });
  }

  function printDocument(mode: "card" | "plan") {
    setPrintMode(mode);
    window.setTimeout(() => window.print(), 80);
  }

  async function exportWord() {
    setWordBusy(true);
    try {
      const { downloadCleaningWord } = await import("./cleaning-word-export");
      const safeArea = warehouse === "raw" ? "Surowce" : "Wyroby-gotowe";
      const safePeriod = frequency === "monthly"
        ? selectedMonth
        : selectedWeek.replace("-W", "-T");
      await downloadCleaningWord({
        title: `Karta mycia i dezynfekcji (w układzie ${frequencyLabel(frequency)})`,
        formCode: formCodes[frequency],
        area: warehouseLabels[warehouse],
        periodLabel,
        responsible: selectedResponsible,
        rows: cardRows,
        fileName: `Karta-mycia-${safeArea}-${safePeriod}.docx`,
      });
      setNotice("Dokument Word został utworzony z aktualnym logo Masterpress.");
    } catch {
      setNotice("Nie udało się utworzyć dokumentu Word. Spróbuj ponownie.");
    } finally {
      setWordBusy(false);
    }
  }

  return (
    <div className="view-stack cleaning-module">
      <section className="view-intro cleaning-intro">
        <div>
          <span>DOKUMENTACJA HIGIENY</span>
          <h2>Karta mycia i dezynfekcji</h2>
          <p>
            Wybierz obszar i okres. Daty, rok i numer tygodnia uzupełnią się
            automatycznie.
          </p>
        </div>
      </section>

      {notice && (
        <div aria-live="polite" className="module-notice" role="status">
          <CheckCircle2 /> <span>{notice}</span>
        </div>
      )}

      <section className="cleaning-builder-grid">
        <article className="panel cleaning-builder">
          <div className="panel-heading">
            <div><span>KREATOR DOKUMENTU</span><h3>Ustaw kartę w trzech krokach</h3></div>
          </div>

          <div className="builder-step">
            <span>1</span>
            <div><strong>Wybierz magazyn</strong><small>Zakres czynności dopasuje się automatycznie.</small></div>
          </div>
          <div className="choice-cards two">
            <button className={warehouse === "raw" ? "active" : ""} onClick={() => setWarehouse("raw")} type="button">
              <Droplets /><strong>Magazyn surowców</strong><small>Nowy magazyn i materiały</small>
            </button>
            <button className={warehouse === "finished" ? "active" : ""} onClick={() => setWarehouse("finished")} type="button">
              <ClipboardCheck /><strong>Magazyn wyrobów gotowych</strong><small>Regały K, owijarka i rampy</small>
            </button>
          </div>

          <div className="builder-step">
            <span>2</span>
            <div><strong>Wybierz układ dokumentu</strong><small>Zgodny z F-02a, F-02b lub F-02c.</small></div>
          </div>
          <div className="frequency-switch">
            {(["daily", "weekly", "monthly"] as CleaningFrequency[]).map((item) => (
              <button className={frequency === item ? "active" : ""} key={item} onClick={() => setFrequency(item)} type="button">
                {item === "daily" ? "Codzienny" : item === "weekly" ? "Tygodniowy" : "Miesięczny"}
              </button>
            ))}
          </div>

          <div className="builder-step">
            <span>3</span>
            <div><strong>Wskaż okres</strong><small>Aplikacja wyliczy poprawne oznaczenia dokumentu.</small></div>
          </div>
          {frequency === "monthly" ? (
            <label className="builder-period-control">
              Miesiąc i rok
              <input onChange={(event) => setSelectedMonth(event.target.value)} type="month" value={selectedMonth} />
            </label>
          ) : (
            <label className="builder-period-control">
              Tydzień
              <input
                onChange={(event) => {
                  setSelectedWeek(event.target.value);
                  setPlanYear(yearFromWeekKey(event.target.value));
                  setPlanStartWeek(weekNumber(event.target.value));
                }}
                type="week"
                value={selectedWeek}
              />
            </label>
          )}

          <div className="generated-document-summary">
            <div><span><CalendarRange /></span><p><small>OKRES</small><strong>{periodLabel}</strong></p></div>
            <div><span><Users /></span><p><small>ODPOWIEDZIALNY</small><strong>{selectedResponsible || "Nie przypisano"}</strong></p></div>
            <div><span><ClipboardCheck /></span><p><small>FORMULARZ</small><strong>{formCodes[frequency]}</strong></p></div>
          </div>

          <div className="cleaning-actions">
            <button className="secondary-button" disabled={wordBusy} onClick={exportWord} type="button">
              <Download /> {wordBusy ? "Tworzę Word…" : "Pobierz Word"}
            </button>
            <button className="primary-button" onClick={() => printDocument("card")} type="button">
              <FileDown /> Drukuj / zapisz PDF
            </button>
          </div>
        </article>

        <article className="panel cleaning-preview-panel">
          <div className="panel-heading">
            <div><span>PODGLĄD</span><h3>Gotowa karta</h3></div>
          </div>
          <div className="cleaning-mini-document">
            <header>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Masterpress" src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`} />
              <span>{formCodes[frequency]}</span>
            </header>
            <h4>Karta mycia i dezynfekcji</h4>
            <p>w układzie {frequencyLabel(frequency)}</p>
            <dl>
              <div><dt>Obszar</dt><dd>{warehouseLabels[warehouse]}</dd></div>
              <div><dt>Okres</dt><dd>{periodLabel}</dd></div>
              <div><dt>Osoba</dt><dd>{selectedResponsible || "—"}</dd></div>
            </dl>
            <div className="mini-task-list">
              {tasks.map((task, index) => <span key={task}><i>{index + 1}</i>{task}</span>)}
            </div>
          </div>
        </article>
      </section>

      <section className="panel responsibility-panel">
        <div className="panel-heading responsibility-heading">
          <div>
            <span>GRAFIK SPRZĄTANIA</span>
            <h3>Odpowiedzialność według tygodni</h3>
            <p>Przypisanie jest automatycznie używane w generowanych kartach.</p>
          </div>
          <div className="responsibility-controls">
            <label>Rok <input min="2024" max="2100" onChange={(event) => setPlanYear(Number(event.target.value))} type="number" value={planYear} /></label>
            <label>Od tygodnia <input min="1" max={weeksInIsoYear(planYear)} onChange={(event) => setPlanStartWeek(Math.max(1, Number(event.target.value)))} type="number" value={planStartWeek} /></label>
            <button className="secondary-button" onClick={() => printDocument("plan")} type="button"><Printer /> Drukuj plan</button>
          </div>
        </div>
        <div className="responsibility-table-wrap">
          <table className="responsibility-table">
            <thead><tr><th>Nr tygodnia</th><th>Zakres dat</th><th>Osoba odpowiedzialna</th><th>Status</th></tr></thead>
            <tbody>
              {planWeeks.map((targetWeek) => {
                const key = `${planYear}-W${String(targetWeek).padStart(2, "0")}`;
                const dates = weekDates(key);
                const entry = responsibilities.find((item) => item.warehouse === warehouse && item.year === planYear && item.week === targetWeek);
                return (
                  <tr key={targetWeek}>
                    <td><strong>{targetWeek}</strong></td>
                    <td>{formatDate(dates[0] || "", false)}–{formatDate(dates[6] || "")}</td>
                    <td>
                      <select onChange={(event) => setResponsibility(targetWeek, event.target.value)} value={entry?.employeeId || ""}>
                        <option value="">Nie przypisano</option>
                        {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                      </select>
                    </td>
                    <td><span className={`responsibility-status ${entry ? "ready" : "empty"}`}>{entry ? "Gotowe" : "Do uzupełnienia"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {activeEmployees.length === 0 && (
          <div className="responsibility-empty-note"><Users /> Dodaj pracowników w module „Grafik”, aby przypisywać ich do tygodni.</div>
        )}
      </section>

      <div className={`cleaning-print-document cleaning-card-print ${printMode === "card" ? "print-active" : ""}`}>
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Masterpress" src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`} />
          <div><small>{formCodes[frequency]}</small><h1>Karta mycia i dezynfekcji</h1><p>w układzie {frequencyLabel(frequency)}</p></div>
        </header>
        <section className="cleaning-print-meta">
          <div><span>OBSZAR</span><strong>{warehouseLabels[warehouse]}</strong></div>
          <div><span>OKRES</span><strong>{periodLabel}</strong></div>
          <div><span>ODPOWIEDZIALNY</span><strong>{selectedResponsible || "Nie przypisano"}</strong></div>
        </section>
        <table>
          <thead><tr><th>Lp.</th><th>Obszar / czynność</th><th>Data / tydzień</th><th>Mycie X</th><th>Dezynfekcja X</th><th>Sprawdzenie P/N</th><th>Podpis wykonującego</th><th>Podpis sprawdzającego / uwagi</th></tr></thead>
          <tbody>{cardRows.map((row, index) => <tr key={`${row.period}-${row.task}`}><td>{index + 1}</td><td>{row.task}</td><td>{row.period}</td><td /><td /><td /><td /><td /></tr>)}</tbody>
        </table>
        <p className="cleaning-legend">Wykonanie mycia i dezynfekcji potwierdzamy X. Sprawdzenie: P – pozytywny, N – negatywny. Wynik negatywny należy opisać w polu uwag.</p>
        <footer><span>Masterpress S.A.</span><span>Dokument wygenerowany w Warehouse Masterpress</span></footer>
      </div>

      <div className={`cleaning-print-document cleaning-plan-print ${printMode === "plan" ? "print-active" : ""}`}>
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Masterpress" src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`} />
          <div><small>WAREHOUSE MASTERPRESS</small><h1>Grafik sprzątania w układzie tygodniowym</h1><p>{warehouseLabels[warehouse]} · {planYear}</p></div>
        </header>
        <table>
          <thead><tr><th>Nr tygodnia</th><th>Zakres dat</th><th>Osoba wykonująca</th><th>Podpis</th></tr></thead>
          <tbody>{planWeeks.map((targetWeek) => {
            const dates = weekDates(`${planYear}-W${String(targetWeek).padStart(2, "0")}`);
            const entry = responsibilities.find((item) => item.warehouse === warehouse && item.year === planYear && item.week === targetWeek);
            return <tr key={targetWeek}><td>{targetWeek}</td><td>{formatDate(dates[0] || "", false)}–{formatDate(dates[6] || "")}</td><td>{employeeName(employees, entry?.employeeId || "") || ""}</td><td /></tr>;
          })}</tbody>
        </table>
        <footer><span>Masterpress S.A.</span><span>Dokument wygenerowany w Warehouse Masterpress</span></footer>
      </div>
    </div>
  );
}
