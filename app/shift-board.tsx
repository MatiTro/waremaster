"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Megaphone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  safeReadArray,
  workforceStorageKeysByArea,
  type Employee,
  type WorkforceArea,
} from "./workforce-model";

type BoardKind = "task" | "notice" | "issue";
type BoardPriority = "normal" | "important" | "urgent";
type BoardStatus = "todo" | "progress" | "done";

type ShiftBoardItem = {
  id: string;
  kind: BoardKind;
  priority: BoardPriority;
  status: BoardStatus;
  title: string;
  description: string;
  responsible: string;
  dueDate: string;
  createdAt: string;
};

const areaLabels: Record<WorkforceArea, string> = {
  raw: "Magazyn surowców",
  finished: "Magazyn wyrobów gotowych",
};

const boardStorageKeys: Record<WorkforceArea, string> = {
  raw: "warehouse-masterpress:shift-board:raw:v1",
  finished: "warehouse-masterpress:shift-board:finished:v1",
};

const kindLabels: Record<BoardKind, string> = {
  task: "Zadanie",
  notice: "Komunikat",
  issue: "Problem",
};

const priorityLabels: Record<BoardPriority, string> = {
  normal: "Normalny",
  important: "Ważny",
  urgent: "Pilny",
};

const statusLabels: Record<BoardStatus, string> = {
  todo: "Do zrobienia",
  progress: "W trakcie",
  done: "Gotowe",
};

const statusOrder: BoardStatus[] = ["todo", "progress", "done"];
const priorityWeight: Record<BoardPriority, number> = {
  normal: 1,
  important: 2,
  urgent: 3,
};

function boardEvent(area: WorkforceArea) {
  return `warehouse-shift-board-updated:${area}`;
}

function formatBoardDate(value: string) {
  if (!value) return "Bez terminu";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function makeBoardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `BOARD-${crypto.randomUUID()}`;
  }
  return `BOARD-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function kindIcon(kind: BoardKind) {
  if (kind === "notice") return Megaphone;
  if (kind === "issue") return Wrench;
  return ClipboardList;
}

function sortBoardItems(items: ShiftBoardItem[]) {
  return [...items].sort((a, b) => {
    const priority = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priority) return priority;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate) ||
      b.createdAt.localeCompare(a.createdAt);
  });
}

export function ShiftBoardSummary({
  area,
  onOpen,
}: {
  area: WorkforceArea;
  onOpen: () => void;
}) {
  const [items, setItems] = useState<ShiftBoardItem[]>([]);

  useEffect(() => {
    const load = () => {
      setItems(safeReadArray<ShiftBoardItem>(boardStorageKeys[area]));
    };
    load();
    const eventName = boardEvent(area);
    window.addEventListener(eventName, load);
    return () => window.removeEventListener(eventName, load);
  }, [area]);

  const active = sortBoardItems(
    items.filter((item) => item.status !== "done"),
  ).slice(0, 3);

  return (
    <section className="panel shift-board-summary">
      <div className="panel-heading">
        <div>
          <span>TABLICA ZMIANOWA</span>
          <h3>Najważniejsze na teraz</h3>
        </div>
        <button onClick={onOpen} type="button">
          Otwórz tablicę <ArrowRight />
        </button>
      </div>
      {active.length > 0 ? (
        <div className="shift-summary-list">
          {active.map((item) => {
            const Icon = kindIcon(item.kind);
            return (
              <article className={`priority-${item.priority}`} key={item.id}>
                <span><Icon /></span>
                <div>
                  <small>{kindLabels[item.kind]} · {priorityLabels[item.priority]}</small>
                  <strong>{item.title}</strong>
                  <p>
                    {item.responsible || "Bez przypisanej osoby"} · {formatBoardDate(item.dueDate)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="shift-summary-empty">
          <CheckCircle2 />
          <div>
            <strong>Brak aktywnych wpisów</strong>
            <span>Dodaj zadanie, komunikat albo zgłoszenie dla kolejnej zmiany.</span>
          </div>
        </div>
      )}
    </section>
  );
}

export function ShiftBoardModule({ area }: { area: WorkforceArea }) {
  const storageKey = boardStorageKeys[area];
  const employeeKey = workforceStorageKeysByArea[area].employees;
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<ShiftBoardItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState<"all" | BoardKind>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<BoardKind>("task");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(safeReadArray<ShiftBoardItem>(storageKey));
      setEmployees(safeReadArray<Employee>(employeeKey));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [employeeKey, storageKey]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    window.dispatchEvent(new Event(boardEvent(area)));
  }, [area, items, ready, storageKey]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pl");
    return sortBoardItems(items).filter((item) => {
      const matchesKind = filter === "all" || item.kind === filter;
      const matchesQuery = !normalized ||
        [item.title, item.description, item.responsible]
          .join(" ")
          .toLocaleLowerCase("pl")
          .includes(normalized);
      return matchesKind && matchesQuery;
    });
  }, [filter, items, query]);

  const counts = {
    todo: items.filter((item) => item.status === "todo").length,
    progress: items.filter((item) => item.status === "progress").length,
    urgent: items.filter(
      (item) => item.priority === "urgent" && item.status !== "done",
    ).length,
    done: items.filter((item) => item.status === "done").length,
  };

  function openForm(kind: BoardKind) {
    setDraftKind(kind);
    setFormOpen(true);
  }

  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const item: ShiftBoardItem = {
      id: makeBoardId(),
      kind: String(form.get("kind") || draftKind) as BoardKind,
      priority: String(form.get("priority") || "normal") as BoardPriority,
      status: "todo",
      title,
      description: String(form.get("description") || "").trim(),
      responsible: String(form.get("responsible") || "").trim(),
      dueDate: String(form.get("dueDate") || ""),
      createdAt: new Date().toISOString(),
    };
    setItems((current) => [item, ...current]);
    setFormOpen(false);
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const index = statusOrder.indexOf(item.status);
      const next = statusOrder[Math.min(2, Math.max(0, index + direction))];
      return { ...item, status: next };
    }));
  }

  return (
    <div className="view-stack shift-board-module">
      <section className="view-intro shift-board-intro">
        <div>
          <span>PRZEKAZANIE ZMIANY · {areaLabels[area]}</span>
          <h2>Tablica zmianowa</h2>
          <p>
            Zadania, ważne informacje i zgłoszenia są zapisane wyłącznie dla
            aktualnie wybranego magazynu.
          </p>
        </div>
        <div className="shift-board-actions">
          <button className="secondary-button" onClick={() => openForm("issue")} type="button">
            <AlertTriangle /> Zgłoś problem
          </button>
          <button className="primary-button" onClick={() => openForm("task")} type="button">
            <Plus /> Dodaj wpis
          </button>
        </div>
      </section>

      <section className="shift-board-kpis">
        <article><span><ClipboardList /></span><div><strong>{counts.todo}</strong><small>do zrobienia</small></div></article>
        <article><span><Clock3 /></span><div><strong>{counts.progress}</strong><small>w trakcie</small></div></article>
        <article className={counts.urgent ? "danger" : ""}><span><AlertTriangle /></span><div><strong>{counts.urgent}</strong><small>pilnych</small></div></article>
        <article><span><CheckCircle2 /></span><div><strong>{counts.done}</strong><small>zakończonych</small></div></article>
      </section>

      <section className="panel shift-board-toolbar">
        <div className="shift-filter-tabs">
          {([
            ["all", "Wszystkie"],
            ["task", "Zadania"],
            ["notice", "Komunikaty"],
            ["issue", "Problemy"],
          ] as const).map(([id, label]) => (
            <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)} type="button">
              {label}
            </button>
          ))}
        </div>
        <label className="shift-board-search">
          <Search />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj wpisu lub osoby…" value={query} />
        </label>
      </section>

      <section className="shift-board-columns">
        {statusOrder.map((status) => {
          const statusItems = filtered.filter((item) => item.status === status);
          return (
            <article className={`panel shift-board-column status-${status}`} key={status}>
              <header>
                <div><i /><strong>{statusLabels[status]}</strong></div>
                <span>{statusItems.length}</span>
              </header>
              <div className="shift-board-card-list">
                {statusItems.map((item) => {
                  const Icon = kindIcon(item.kind);
                  return (
                    <article className={`shift-board-card priority-${item.priority}`} key={item.id}>
                      <div className="shift-card-meta">
                        <span><Icon /> {kindLabels[item.kind]}</span>
                        <em>{priorityLabels[item.priority]}</em>
                      </div>
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                      <dl>
                        <div><UserRound /><dt>Osoba</dt><dd>{item.responsible || "Nie przypisano"}</dd></div>
                        <div><CalendarDays /><dt>Termin</dt><dd>{formatBoardDate(item.dueDate)}</dd></div>
                      </dl>
                      <footer>
                        <div>
                          {status !== "todo" && (
                            <button aria-label="Cofnij status" onClick={() => moveItem(item.id, -1)} type="button"><ArrowLeft /></button>
                          )}
                          {status !== "done" && (
                            <button aria-label="Przejdź dalej" onClick={() => moveItem(item.id, 1)} type="button"><ArrowRight /></button>
                          )}
                        </div>
                        <button aria-label="Usuń wpis" className="delete" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} type="button"><Trash2 /></button>
                      </footer>
                    </article>
                  );
                })}
                {statusItems.length === 0 && (
                  <div className="shift-column-empty"><CheckCircle2 /><span>Brak wpisów</span></div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setFormOpen(false);
        }}>
          <div aria-modal="true" className="modal shift-board-modal" role="dialog">
            <div className="modal-heading">
              <div><span>TABLICA ZMIANOWA</span><h2>Nowy wpis</h2><p>{areaLabels[area]}</p></div>
              <button aria-label="Zamknij" onClick={() => setFormOpen(false)} type="button"><X /></button>
            </div>
            <form className="form-stack" onSubmit={saveItem}>
              <div className="form-grid two">
                <label>Rodzaj
                  <select defaultValue={draftKind} name="kind">
                    <option value="task">Zadanie</option>
                    <option value="notice">Komunikat</option>
                    <option value="issue">Problem</option>
                  </select>
                </label>
                <label>Priorytet
                  <select defaultValue={draftKind === "issue" ? "important" : "normal"} name="priority">
                    <option value="normal">Normalny</option>
                    <option value="important">Ważny</option>
                    <option value="urgent">Pilny</option>
                  </select>
                </label>
              </div>
              <label>Tytuł
                <input autoFocus name="title" placeholder="Np. sprawdzić uszkodzoną lokalizację" required />
              </label>
              <label>Opis
                <textarea name="description" placeholder="Krótka informacja dla kolejnej zmiany" rows={4} />
              </label>
              <div className="form-grid two">
                <label>Osoba odpowiedzialna
                  <input list={`board-employees-${area}`} name="responsible" placeholder="Opcjonalnie" />
                  <datalist id={`board-employees-${area}`}>
                    {employees.filter((employee) => employee.active).map((employee) => <option key={employee.id} value={employee.name} />)}
                  </datalist>
                </label>
                <label>Termin / ważne do
                  <input name="dueDate" type="date" />
                </label>
              </div>
              <div className="form-actions">
                <button className="secondary-button" onClick={() => setFormOpen(false)} type="button">Anuluj</button>
                <button className="primary-button" type="submit"><Plus /> Dodaj na tablicę</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
