"use client";

import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileDown,
  MapPin,
  PackageCheck,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";
import { useState } from "react";

type FinishedView = "inventory" | "map" | "shipments" | "schedule";
type ShipmentTab = "today" | "week" | "history";

export function FinishedDashboard({
  onNavigate,
}: {
  onNavigate: (view: FinishedView) => void;
}) {
  return (
    <div className="view-stack finished-dashboard">
      <section className="finished-hero">
        <div>
          <span className="finished-eyebrow">
            <PackageCheck size={16} /> MAGAZYN WYROBÓW GOTOWYCH
          </span>
          <h2>Wysyłki pod kontrolą</h2>
          <p>
            Osobny obszar do obsługi gotowych wyrobów, planu wydań i pracy
            zespołu. Dane operacyjne pojawią się tutaj po podłączeniu widoku
            D365.
          </p>
          <div className="finished-hero-actions">
            <button
              className="primary-button"
              onClick={() => onNavigate("shipments")}
              type="button"
            >
              <Truck /> Otwórz wysyłki <ArrowRight />
            </button>
            <button
              className="secondary-button"
              onClick={() => onNavigate("inventory")}
              type="button"
            >
              <BarChart3 /> Raport wyrobów
            </button>
          </div>
        </div>
        <div className="finished-hero-mark" aria-hidden="true">
          <Warehouse />
          <span>WG</span>
        </div>
      </section>

      <section className="finished-kpi-grid" aria-label="Wskaźniki wysyłek">
        {[
          ["Wysyłki dzisiaj", Truck],
          ["Palety do wydania", Boxes],
          ["Gotowe ładunki", CheckCircle2],
          ["Wymagają uwagi", Clock3],
        ].map(([label, Icon]) => (
          <article key={String(label)}>
            <span><Icon /></span>
            <div><strong>—</strong><small>{String(label)}</small></div>
          </article>
        ))}
      </section>

      <section className="finished-dashboard-grid">
        <article className="panel finished-operation-panel">
          <div className="panel-heading">
            <div>
              <span>PLAN OPERACYJNY</span>
              <h3>Najbliższe wysyłki</h3>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("shipments")}
              type="button"
            >
              Pełny plan <ArrowRight />
            </button>
          </div>
          <div className="finished-empty-state compact">
            <CalendarDays />
            <div>
              <strong>Plan czeka na dane</strong>
              <p>
                Po integracji pokażemy kolejność wysyłek, klientów, okna
                czasowe i gotowość ładunków.
              </p>
            </div>
          </div>
        </article>

        <article className="panel finished-readiness-panel">
          <div className="panel-heading">
            <div><span>GOTOWOŚĆ</span><h3>Status obszaru</h3></div>
          </div>
          <ul>
            <li><span><ClipboardList /></span><div><strong>Plan wysyłek</strong><small>Oczekuje na dane D365</small></div><i /></li>
            <li><span><Boxes /></span><div><strong>Wyroby na lokalizacjach</strong><small>Oczekuje na mapę magazynu</small></div><i /></li>
            <li><span><PackageCheck /></span><div><strong>Gotowość ładunków</strong><small>Oczekuje na reguły biznesowe</small></div><i /></li>
          </ul>
        </article>
      </section>
    </div>
  );
}

export function FinishedInventory() {
  return (
    <div className="view-stack finished-module">
      <section className="view-intro finished-view-intro">
        <div>
          <span>MAGAZYN WYROBÓW GOTOWYCH</span>
          <h2>Raport zapasów</h2>
          <p>
            Widok przeznaczony wyłącznie dla wyrobów gotowych — z partiami,
            paletami, lokalizacją oraz gotowością do wysyłki.
          </p>
        </div>
        <button className="secondary-button" disabled type="button">
          <FileDown /> Raport po integracji
        </button>
      </section>

      <section className="finished-kpi-grid">
        {[
          ["Palety wyrobów", Boxes],
          ["Pozycje asortymentowe", ClipboardList],
          ["Partie gotowe do wydania", PackageCheck],
          ["Zablokowane", Clock3],
        ].map(([label, Icon]) => (
          <article key={String(label)}>
            <span><Icon /></span>
            <div><strong>—</strong><small>{String(label)}</small></div>
          </article>
        ))}
      </section>

      <section className="panel finished-data-panel">
        <div className="panel-heading">
          <div><span>DANE WYROBÓW</span><h3>Stan magazynu</h3></div>
          <label className="finished-inline-search">
            <Search />
            <input disabled placeholder="Pozycja, partia, lokalizacja…" />
          </label>
        </div>
        <div className="table-scroll">
          <table className="finished-table">
            <thead>
              <tr>
                <th>Nr pozycji</th><th>Nazwa wyrobu</th><th>Partia</th>
                <th>Palety</th><th>Lokalizacja</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="finished-empty-row">
                <td colSpan={6}>
                  <Boxes />
                  <strong>Brak zaimportowanych stanów wyrobów</strong>
                  <span>Tabela wypełni się automatycznie po podłączeniu danych.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function FinishedMap() {
  return (
    <div className="view-stack finished-module">
      <section className="view-intro finished-view-intro">
        <div>
          <span>ODRĘBNY UKŁAD MAGAZYNU</span>
          <h2>Mapa magazynu wyrobów gotowych</h2>
          <p>
            Ten widok nie korzysta z regałów magazynu surowców. Odwzorujemy
            tutaj rzeczywisty układ po otrzymaniu oznaczeń i planu obszaru.
          </p>
        </div>
      </section>

      <section className="finished-map-layout">
        <article className="panel finished-map-canvas">
          <div className="finished-map-grid" aria-hidden="true" />
          <div className="finished-map-empty">
            <span><MapPin /></span>
            <h3>Miejsce na docelową mapę</h3>
            <p>
              Strefy, regały i miejsca paletowe dodamy zgodnie z fizycznym
              układem magazynu wyrobów gotowych.
            </p>
          </div>
        </article>
        <aside className="panel finished-map-inspector">
          <span>WYBRANY OBSZAR</span>
          <h3>Brak wyboru</h3>
          <dl>
            <div><dt>Strefa</dt><dd>—</dd></div>
            <div><dt>Lokalizacja</dt><dd>—</dd></div>
            <div><dt>Palety</dt><dd>—</dd></div>
            <div><dt>Status</dt><dd>Oczekuje na mapę</dd></div>
          </dl>
        </aside>
      </section>
    </div>
  );
}

export function ShipmentsModule() {
  const [tab, setTab] = useState<ShipmentTab>("today");
  const labels: Record<ShipmentTab, string> = {
    today: "dzisiaj",
    week: "w tym tygodniu",
    history: "w historii",
  };

  return (
    <div className="view-stack finished-module">
      <section className="view-intro finished-view-intro">
        <div>
          <span>OBSŁUGA WYDAŃ</span>
          <h2>Wysyłki</h2>
          <p>
            Osobny plan wydań wyrobów gotowych. Docelowo pokaże dane ładunku,
            klienta, godzinę, liczbę palet i stan przygotowania.
          </p>
        </div>
      </section>

      <section className="finished-kpi-grid">
        {[
          ["Zaplanowane", CalendarDays],
          ["W przygotowaniu", Clock3],
          ["Gotowe", PackageCheck],
          ["Wydane", Truck],
        ].map(([label, Icon]) => (
          <article key={String(label)}>
            <span><Icon /></span>
            <div><strong>—</strong><small>{String(label)}</small></div>
          </article>
        ))}
      </section>

      <section className="panel finished-data-panel shipments-panel">
        <div className="shipment-tabs" role="tablist" aria-label="Zakres wysyłek">
          {([
            ["today", "Dzisiaj"],
            ["week", "Plan tygodnia"],
            ["history", "Historia"],
          ] as [ShipmentTab, string][]).map(([id, label]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="finished-empty-state shipments-empty">
          <Truck />
          <div>
            <strong>Brak danych o wysyłkach {labels[tab]}</strong>
            <p>
              Po integracji lista będzie aktualizowana z widoku D365 bez
              ręcznego przepisywania ładunków.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
