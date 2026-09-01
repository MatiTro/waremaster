"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  FileDown,
  History,
  Minus,
  PackageOpen,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  safeReadArray,
  workforceStorageKeysByArea,
  type Employee,
} from "./workforce-model";
import {
  inventoryDataAvailable,
  localWarehouseSnapshot,
} from "./warehouse-model";

export const palletCountCategories = [
  { id: "shrink-film", label: "Folia termokurczliwa", short: "Folia termokurczliwa" },
  { id: "self-adhesive-paper", label: "Papier samoprzylepny", short: "Papier samoprzylepny" },
  { id: "cardboard", label: "Tektura", short: "Tektura" },
  { id: "coated-paper", label: "Papier kredowy", short: "Papier kredowy" },
  { id: "buckets", label: "Wiadra", short: "Wiadra" },
  { id: "cs-film-laminate", label: "Folia CS i laminat", short: "Folia CS i laminat" },
  { id: "plates", label: "Płyty", short: "Płyty" },
  { id: "other", label: "Inne", short: "Inne" },
] as const;

type CategoryId = (typeof palletCountCategories)[number]["id"];
type PalletCounts = Record<CategoryId, number | null>;

type PalletCountDraft = {
  id: string;
  period: string;
  countedBy: string;
  note: string;
  counts: PalletCounts;
  updatedAt: string;
  completedAt: string;
};

type PalletCountRecord = PalletCountDraft & {
  savedAt: string;
  systemPallets: number | null;
};

const draftStorageKey = "warehouse-masterpress:pallet-count:draft:v1";
const historyStorageKey = "warehouse-masterpress:pallet-count:history:v1";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function localMonth() {
  return localDate().slice(0, 7);
}

function emptyCounts(): PalletCounts {
  return Object.fromEntries(
    palletCountCategories.map((category) => [category.id, null]),
  ) as PalletCounts;
}

function createDraft(): PalletCountDraft {
  return {
    id: `COUNT-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    period: localMonth(),
    countedBy: "",
    note: "",
    counts: emptyCounts(),
    updatedAt: new Date().toISOString(),
    completedAt: "",
  };
}

function safeReadDraft(): PalletCountDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...createDraft(),
      ...parsed,
      counts: { ...emptyCounts(), ...(parsed.counts || {}) },
    };
  } catch {
    return null;
  }
}

function formatPeriod(value: string) {
  if (!value) return "Bez okresu";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatSavedAt(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99_999, Math.trunc(value)));
}

function totalCounts(counts: PalletCounts) {
  return palletCountCategories.reduce(
    (sum, category) => sum + (counts[category.id] ?? 0),
    0,
  );
}

export function PalletCountModule() {
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<PalletCountDraft>(() => createDraft());
  const [history, setHistory] = useState<PalletCountRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [undoStack, setUndoStack] = useState<PalletCounts[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [printActive, setPrintActive] = useState(false);
  const [printRecord, setPrintRecord] = useState<PalletCountRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(safeReadDraft() || createDraft());
      setHistory(safeReadArray<PalletCountRecord>(historyStorageKey));
      setEmployees(safeReadArray<Employee>(workforceStorageKeysByArea.raw.employees));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, ready]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => {
      setSaveMessage("");
      setSaveError(false);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  useEffect(() => {
    const finish = () => setPrintActive(false);
    window.addEventListener("afterprint", finish);
    return () => window.removeEventListener("afterprint", finish);
  }, []);

  const total = useMemo(() => totalCounts(draft.counts), [draft.counts]);
  const countedCategories = palletCountCategories.filter(
    (category) => draft.counts[category.id] !== null,
  ).length;
  const allCategoriesEntered = countedCategories === palletCountCategories.length;
  const lastSavedRecord = history.find((record) => record.id === draft.id);
  const lastSaved = lastSavedRecord?.savedAt || "";
  const sessionCompleted = Boolean(
    lastSavedRecord && draft.completedAt === lastSavedRecord.savedAt,
  );
  const systemPallets = inventoryDataAvailable
    ? localWarehouseSnapshot.A
    : null;
  const difference = systemPallets === null ? null : total - systemPallets;
  const printTotal = printRecord ? totalCounts(printRecord.counts) : 0;
  const printDifference = printRecord?.systemPallets == null
    ? null
    : printTotal - printRecord.systemPallets;

  function updateCount(id: CategoryId, next: number | null) {
    setUndoStack((current) => [...current.slice(-19), { ...draft.counts }]);
    setDraft((current) => ({
      ...current,
      counts: { ...current.counts, [id]: next === null ? null : normalizeCount(next) },
      updatedAt: new Date().toISOString(),
      completedAt: "",
    }));
  }

  function updateDraftMeta(
    patch: Partial<Pick<PalletCountDraft, "period" | "countedBy" | "note">>,
  ) {
    setDraft((current) => ({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      completedAt: "",
    }));
  }

  function undoLastChange() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setDraft((current) => ({
      ...current,
      counts: previous,
      updatedAt: new Date().toISOString(),
      completedAt: "",
    }));
    setUndoStack((current) => current.slice(0, -1));
  }

  function startNewCount() {
    const hasValues = Object.values(draft.counts).some((value) => value !== null);
    if (hasValues && !window.confirm(
      "Rozpocząć nowe liczenie? Bieżące wartości pozostaną tylko wtedy, gdy wcześniej zapiszesz wynik.",
    )) return;
    setDraft(createDraft());
    setUndoStack([]);
    setSaveError(false);
    setSaveMessage("Rozpoczęto nowe liczenie");
  }

  function saveAndPrint() {
    if (!allCategoriesEntered) {
      setSaveError(true);
      setSaveMessage(
        "Uzupełnij wszystkie pozycje. Jeśli danego rodzaju nie ma, wpisz 0.",
      );
      return;
    }
    const now = new Date().toISOString();
    const completedDraft: PalletCountDraft = {
      ...draft,
      updatedAt: now,
      completedAt: now,
    };
    const record: PalletCountRecord = {
      ...completedDraft,
      savedAt: now,
      systemPallets,
    };
    const nextHistory = [
      record,
      ...history.filter((entry) => entry.id !== draft.id),
    ].slice(0, 24);
    setDraft(completedDraft);
    setHistory(nextHistory);
    window.localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
    setPrintRecord(record);
    setPrintActive(true);
    setSaveError(false);
    setSaveMessage("Liczenie zatwierdzone. Otwieram dokument do wydruku lub zapisu PDF.");
    window.setTimeout(() => window.print(), 100);
  }

  function printSavedRecord(record: PalletCountRecord) {
    setPrintRecord({
      ...record,
      systemPallets: record.systemPallets ?? null,
    });
    setPrintActive(true);
    window.setTimeout(() => window.print(), 100);
  }

  function restoreRecord(record: PalletCountRecord) {
    setDraft({
      id: record.id,
      period: record.period,
      countedBy: record.countedBy,
      note: record.note,
      counts: { ...emptyCounts(), ...record.counts },
      updatedAt: new Date().toISOString(),
      completedAt: record.savedAt,
    });
    setUndoStack([]);
    setSaveError(false);
    setSaveMessage("Wczytano zapisane liczenie");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteRecord(id: string) {
    const nextHistory = history.filter((entry) => entry.id !== id);
    setHistory(nextHistory);
    window.localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
  }

  return (
    <div className="view-stack pallet-count-module">
      <section className="view-intro pallet-count-intro">
        <div>
          <span>RĘCZNE LICZENIE · MAGAZYN SUROWCÓW</span>
          <h2>Lista palet</h2>
          <p>
            Wygodne liczenie rodzajów surowca, porównanie ze stanem systemowym
            Magazynu głównego i gotowy dokument do zatwierdzenia.
          </p>
        </div>
        <div className="pallet-count-actions">
          <button
            className="secondary-button"
            disabled={undoStack.length === 0}
            onClick={undoLastChange}
            type="button"
          >
            <RotateCcw /> Cofnij
          </button>
          <button className="secondary-button" onClick={startNewCount} type="button">
            <Plus /> Nowe liczenie
          </button>
          <button className="primary-button" onClick={saveAndPrint} type="button">
            <FileDown /> Zapisz i drukuj PDF
          </button>
        </div>
      </section>

      {saveMessage && (
        <div
          className={`pallet-save-message ${saveError ? "danger" : ""}`}
          role="status"
        >
          {saveError ? <ClipboardList /> : <CheckCircle2 />} {saveMessage}
        </div>
      )}

      <section className="pallet-count-overview">
        <article className="pallet-total-card">
          <span><PackageOpen /></span>
          <div><small>RAZEM</small><strong>{total}</strong><p>palet surowca</p></div>
        </article>
        <article className="panel pallet-reconciliation-card">
          <header>
            <span><Database /></span>
            <div>
              <small>MAGAZYN GŁÓWNY</small>
              <strong>Porównanie ze stanem systemowym</strong>
            </div>
          </header>
          <div className="pallet-reconciliation-values">
            <span><small>STAN SYSTEMOWY</small><strong>{systemPallets ?? "—"}</strong></span>
            <span><small>POLICZONO RĘCZNIE</small><strong>{total}</strong></span>
            <span className={difference === null ? "neutral" : difference === 0 ? "match" : "mismatch"}>
              <small>RÓŻNICA</small>
              <strong>{difference === null ? "—" : difference > 0 ? `+${difference}` : difference}</strong>
            </span>
          </div>
          <p>
            {systemPallets === null
              ? "Stan systemowy pojawi się automatycznie po podłączeniu danych magazynowych."
              : "Różnica pokazuje wynik liczenia ręcznego względem bieżącego stanu aplikacji."}
          </p>
        </article>
        <article className="panel pallet-session-card">
          <label>
            <CalendarDays /> Miesiąc liczenia
            <input
              onChange={(event) => updateDraftMeta({ period: event.target.value })}
              type="month"
              value={draft.period}
            />
          </label>
          <label>
            <UserRound /> Osoba licząca
            <input
              list="pallet-count-employees"
              onChange={(event) => updateDraftMeta({ countedBy: event.target.value })}
              placeholder="Opcjonalnie"
              value={draft.countedBy}
            />
            <datalist id="pallet-count-employees">
              {employees.filter((employee) => employee.active).map((employee) => (
                <option key={employee.id} value={employee.name} />
              ))}
            </datalist>
          </label>
          <div className={`pallet-session-status ${sessionCompleted ? "complete" : allCategoriesEntered ? "ready" : "active"}`}>
            <i />
            <span>
              <small>STATUS LICZENIA</small>
              <strong>
                {sessionCompleted
                  ? "Policzono i zapisano"
                  : allCategoriesEntered
                    ? "Gotowe do zatwierdzenia"
                    : "Liczenie w toku"}
              </strong>
            </span>
          </div>
          <small>Ostatnie zatwierdzenie: {formatSavedAt(lastSaved)}</small>
        </article>
      </section>

      <section className="pallet-counter-grid">
        {palletCountCategories.map((category, index) => {
          const value = draft.counts[category.id];
          const entered = value !== null;
          const state = sessionCompleted && entered
            ? "verified"
            : entered
              ? "entered"
              : "pending";
          return (
            <article
              className={`panel pallet-counter-card ${state}`}
              key={category.id}
            >
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>
                    {state === "verified"
                      ? "ZATWIERDZONE"
                      : state === "entered"
                        ? "WPROWADZONO"
                        : "DO UZUPEŁNIENIA"}
                  </small>
                  <h3>{category.label}</h3>
                </div>
                {state === "verified" && <CheckCircle2 />}
              </header>
              <div className="pallet-counter-control">
                <button
                  aria-label={`Odejmij paletę: ${category.label}`}
                  disabled={!entered || value === 0}
                  onClick={() => updateCount(category.id, Math.max(0, (value ?? 0) - 1))}
                  type="button"
                >
                  <Minus />
                </button>
                <label>
                  <input
                    aria-label={`Liczba palet: ${category.label}`}
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => updateCount(
                      category.id,
                      event.target.value === "" ? null : Number(event.target.value),
                    )}
                    placeholder="—"
                    type="number"
                    value={value ?? ""}
                  />
                  <span>palet</span>
                </label>
                <button
                  aria-label={`Dodaj paletę: ${category.label}`}
                  className="add"
                  onClick={() => updateCount(category.id, (value ?? 0) + 1)}
                  type="button"
                >
                  <Plus />
                </button>
              </div>
              <footer>
                <button onClick={() => updateCount(category.id, (value ?? 0) + 5)} type="button">+5 palet</button>
                <button onClick={() => updateCount(category.id, 0)} type="button">Wpisz 0</button>
                <button className="clear" disabled={!entered} onClick={() => updateCount(category.id, null)} type="button">Wyczyść</button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className="panel pallet-count-note">
        <label>
          <ClipboardList /> Uwagi do liczenia
          <textarea
            onChange={(event) => updateDraftMeta({ note: event.target.value })}
            placeholder="Np. palety uszkodzone, nieoznaczone lub wymagające ponownego sprawdzenia…"
            rows={3}
            value={draft.note}
          />
        </label>
      </section>

      <section className="panel pallet-history-panel">
        <div className="panel-heading">
          <div><span>HISTORIA</span><h3>Zapisane wyniki liczenia</h3></div>
          <strong>{history.length}</strong>
        </div>
        {history.length > 0 ? (
          <div className="pallet-history-list">
            {history.map((record) => {
              const recordTotal = palletCountCategories.reduce(
                (sum, category) => sum + (record.counts[category.id] ?? 0),
                0,
              );
              const recordSystem = record.systemPallets ?? null;
              const recordDifference = recordSystem === null
                ? null
                : recordTotal - recordSystem;
              return (
                <article key={record.id}>
                  <span><History /></span>
                  <div className="pallet-history-main">
                    <small>{formatPeriod(record.period)} · {formatSavedAt(record.savedAt)}</small>
                    <strong>{record.countedBy || "Nie podano osoby"}</strong>
                    <p>
                      Zatwierdzono · {recordTotal} palet
                      {recordDifference === null
                        ? " · brak stanu systemowego"
                        : ` · różnica ${recordDifference > 0 ? "+" : ""}${recordDifference}`}
                    </p>
                  </div>
                  <div className="pallet-history-breakdown">
                    {palletCountCategories.map((category) => (
                      <span key={category.id}>
                        {category.short}<b>{record.counts[category.id] ?? "—"}</b>
                      </span>
                    ))}
                  </div>
                  <div className="pallet-history-actions">
                    <button onClick={() => restoreRecord(record)} type="button">Wczytaj</button>
                    <button aria-label="Drukuj zapis" onClick={() => printSavedRecord(record)} type="button"><Printer /></button>
                    <button aria-label="Usuń zapis" className="delete" onClick={() => deleteRecord(record.id)} type="button"><Trash2 /></button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="pallet-history-empty">
            <History />
            <div><strong>Brak zatwierdzonych pomiarów</strong><span>Pierwszy wynik pojawi się po zapisaniu i przygotowaniu PDF.</span></div>
          </div>
        )}
      </section>

      {printRecord && (
        <div
          className={`pallet-count-print-document ${printActive ? "print-active" : ""}`}
        >
          <section className="pallet-count-report">
            <header>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Masterpress"
                src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`}
              />
              <div>
                <small>MAGAZYN SUROWCÓW · MAGAZYN GŁÓWNY</small>
                <h1>Protokół ręcznego liczenia palet</h1>
                <p>{formatPeriod(printRecord.period)}</p>
              </div>
              <aside>
                <small>DATA ZATWIERDZENIA</small>
                <strong>{formatSavedAt(printRecord.savedAt)}</strong>
              </aside>
            </header>

            <div className="pallet-report-summary">
              <span><small>POLICZONO RĘCZNIE</small><strong>{printTotal}</strong><em>palet</em></span>
              <span><small>STAN SYSTEMOWY</small><strong>{printRecord.systemPallets ?? "—"}</strong><em>palet</em></span>
              <span><small>RÓŻNICA</small><strong>{printDifference === null ? "—" : printDifference > 0 ? `+${printDifference}` : printDifference}</strong><em>palet</em></span>
              <span><small>OSOBA LICZĄCA</small><strong>{printRecord.countedBy || "—"}</strong></span>
            </div>

            <table>
              <thead>
                <tr><th>Lp.</th><th>Rodzaj surowca</th><th>Liczba palet</th><th>Potwierdzenie</th></tr>
              </thead>
              <tbody>
                {palletCountCategories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{index + 1}</td>
                    <td>{category.label}</td>
                    <td><strong>{printRecord.counts[category.id] ?? 0}</strong></td>
                    <td>✓ uwzględniono w podsumowaniu</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>RAZEM</td><td>{printTotal}</td><td /></tr>
              </tfoot>
            </table>

            <section className="pallet-report-notes">
              <small>UWAGI DO LICZENIA</small>
              <p>{printRecord.note || "Brak uwag."}</p>
            </section>

            <div className="pallet-report-signatures">
              <span><i />Osoba licząca</span>
              <span><i />Osoba weryfikująca</span>
            </div>

            <footer>
              <span>Warehouse Masterpress</span>
              <span>Dokument wygenerowany automatycznie</span>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
