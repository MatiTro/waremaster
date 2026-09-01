"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  History,
  Minus,
  PackageOpen,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  safeReadArray,
  workforceStorageKeysByArea,
  type Employee,
} from "./workforce-model";

export const palletCountCategories = [
  { id: "shrink-film", label: "Folia termokurczliwa", short: "Folia termokurczliwa" },
  { id: "self-adhesive-paper", label: "Papier samoprzylepny", short: "Papier samoprzylepny" },
  { id: "cardboard", label: "Tektura", short: "Tektura" },
  { id: "coated-paper", label: "Papier kredowy", short: "Papier kredowy" },
  { id: "buckets", label: "Wiadra", short: "Wiadra" },
  { id: "cs-film-laminate", label: "Folia CS i laminat", short: "Folia CS i laminat" },
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
};

type PalletCountRecord = PalletCountDraft & {
  savedAt: string;
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

export function PalletCountModule() {
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<PalletCountDraft>(() => createDraft());
  const [history, setHistory] = useState<PalletCountRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [undoStack, setUndoStack] = useState<PalletCounts[]>([]);
  const [saveMessage, setSaveMessage] = useState("");

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
    const timer = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  const total = useMemo(
    () => palletCountCategories.reduce(
      (sum, category) => sum + (draft.counts[category.id] ?? 0),
      0,
    ),
    [draft.counts],
  );
  const countedCategories = palletCountCategories.filter(
    (category) => draft.counts[category.id] !== null,
  ).length;
  const progress = Math.round((countedCategories / palletCountCategories.length) * 100);
  const lastSaved = history.find((record) => record.id === draft.id)?.savedAt || "";

  function updateCount(id: CategoryId, next: number | null) {
    setUndoStack((current) => [...current.slice(-19), { ...draft.counts }]);
    setDraft((current) => ({
      ...current,
      counts: { ...current.counts, [id]: next === null ? null : normalizeCount(next) },
      updatedAt: new Date().toISOString(),
    }));
  }

  function undoLastChange() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setDraft((current) => ({
      ...current,
      counts: previous,
      updatedAt: new Date().toISOString(),
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
    setSaveMessage("Rozpoczęto nowe liczenie");
  }

  function saveResult() {
    const now = new Date().toISOString();
    const record: PalletCountRecord = { ...draft, savedAt: now };
    const nextHistory = [
      record,
      ...history.filter((entry) => entry.id !== draft.id),
    ].slice(0, 24);
    setHistory(nextHistory);
    window.localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
    setSaveMessage(
      countedCategories === palletCountCategories.length
        ? "Kompletne liczenie zostało zapisane"
        : `Zapisano wynik roboczy (${countedCategories}/${palletCountCategories.length} rodzajów)`,
    );
  }

  function restoreRecord(record: PalletCountRecord) {
    setDraft({
      id: record.id,
      period: record.period,
      countedBy: record.countedBy,
      note: record.note,
      counts: { ...emptyCounts(), ...record.counts },
      updatedAt: new Date().toISOString(),
    });
    setUndoStack([]);
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
            Duże liczniki do wygodnego podsumowania rodzajów surowca podczas
            obchodu magazynu z tabletem.
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
          <button className="primary-button" onClick={saveResult} type="button">
            <Save /> Zapisz wynik
          </button>
        </div>
      </section>

      {saveMessage && (
        <div className="pallet-save-message" role="status">
          <CheckCircle2 /> {saveMessage}
        </div>
      )}

      <section className="pallet-count-overview">
        <article className="pallet-total-card">
          <span><PackageOpen /></span>
          <div><small>RAZEM</small><strong>{total}</strong><p>palet surowca</p></div>
        </article>
        <article className="panel pallet-progress-card">
          <header>
            <div><small>POSTĘP LICZENIA</small><strong>{countedCategories}/{palletCountCategories.length} rodzajów</strong></div>
            <b>{progress}%</b>
          </header>
          <i><span style={{ width: `${progress}%` }} /></i>
          <p>
            Puste pole oznacza „niepoliczone”. Wartość 0 oznacza, że rodzaj
            został sprawdzony i nie ma żadnej palety.
          </p>
        </article>
        <article className="panel pallet-session-card">
          <label>
            <CalendarDays /> Miesiąc liczenia
            <input
              onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value }))}
              type="month"
              value={draft.period}
            />
          </label>
          <label>
            <UserRound /> Osoba licząca
            <input
              list="pallet-count-employees"
              onChange={(event) => setDraft((current) => ({ ...current, countedBy: event.target.value }))}
              placeholder="Opcjonalnie"
              value={draft.countedBy}
            />
            <datalist id="pallet-count-employees">
              {employees.filter((employee) => employee.active).map((employee) => (
                <option key={employee.id} value={employee.name} />
              ))}
            </datalist>
          </label>
          <small>Ostatni zapis: {formatSavedAt(lastSaved)}</small>
        </article>
      </section>

      <section className="pallet-counter-grid">
        {palletCountCategories.map((category, index) => {
          const value = draft.counts[category.id];
          const counted = value !== null;
          return (
            <article
              className={`panel pallet-counter-card ${counted ? "counted" : "pending"}`}
              key={category.id}
            >
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{counted ? "POLICZONO" : "DO POLICZENIA"}</small>
                  <h3>{category.label}</h3>
                </div>
                {counted && <CheckCircle2 />}
              </header>
              <div className="pallet-counter-control">
                <button
                  aria-label={`Odejmij paletę: ${category.label}`}
                  disabled={!counted || value === 0}
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
                <button className="clear" disabled={!counted} onClick={() => updateCount(category.id, null)} type="button">Wyczyść</button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className="panel pallet-count-note">
        <label>
          <ClipboardList /> Uwagi do liczenia
          <textarea
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
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
              const recordCounted = palletCountCategories.filter(
                (category) => record.counts[category.id] !== null,
              ).length;
              return (
                <article key={record.id}>
                  <span><History /></span>
                  <div className="pallet-history-main">
                    <small>{formatPeriod(record.period)} · {formatSavedAt(record.savedAt)}</small>
                    <strong>{record.countedBy || "Nie podano osoby"}</strong>
                    <p>{recordCounted}/{palletCountCategories.length} rodzajów · {recordTotal} palet</p>
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
                    <button aria-label="Usuń zapis" className="delete" onClick={() => deleteRecord(record.id)} type="button"><Trash2 /></button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="pallet-history-empty">
            <History />
            <div><strong>Brak zapisanych pomiarów</strong><span>Pierwszy wynik pojawi się tutaj po wybraniu „Zapisz wynik”.</span></div>
          </div>
        )}
      </section>
    </div>
  );
}
