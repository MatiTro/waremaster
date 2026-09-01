"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileDown,
  MapPin,
  PackageCheck,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { WorkforceSummary } from "./schedule-module";

type FinishedView = "inventory" | "map" | "shipments" | "schedule";
type ShipmentTab = "today" | "week";

export function FinishedDashboard({
  onNavigate,
}: {
  onNavigate: (view: FinishedView) => void;
}) {
  return (
    <div className="view-stack finished-dashboard">
      <section className="command-hero">
        <div>
          <span className="hero-label">
            <Sparkles size={14} /> Szybki dostęp do pracy magazynu
          </span>
          <h2>Magazyn wyrobów gotowych w jednym miejscu</h2>
          <p>
            Sprawdź stan wyrobów, przejdź do mapy, otwórz plan wysyłek albo
            uzupełnij grafik zespołu.
          </p>
        </div>
      </section>

      <WorkforceSummary area="finished" />

      <section className="kpi-grid" aria-label="Wskaźniki magazynu wyrobów gotowych">
        <article className="metric-card metric-primary">
          <div><span>Palety wyrobów</span><Boxes /></div>
          <strong>—</strong>
          <p>Oczekiwanie na dane magazynowe</p>
        </article>
        <article className="metric-card">
          <div><span>Wysyłki dzisiaj</span><Truck /></div>
          <strong>—<small> wysyłek</small></strong>
          <p>Plan zostanie pobrany z D365</p>
        </article>
        <article className="metric-card">
          <div><span>W przygotowaniu</span><Clock3 /></div>
          <strong>—<small> ładunków</small></strong>
          <p>Oczekiwanie na statusy ładunków</p>
        </article>
        <article className="metric-card">
          <div><span>Gotowe</span><PackageCheck /></div>
          <strong>—<small> ładunków</small></strong>
          <p>Gotowe do wydania przewoźnikowi</p>
        </article>
      </section>

      <section className="quick-grid">
        <button onClick={() => onNavigate("inventory")} type="button">
          <span className="quick-icon"><BarChart3 /></span>
          <span>
            <small>Zestawienie magazynowe</small>
            <strong>Sprawdź stan wyrobów</strong>
            <em>Palety, indeksy i blokady jakościowe</em>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => onNavigate("shipments")} type="button">
          <span className="quick-icon"><Truck /></span>
          <span>
            <small>Plan operacyjny</small>
            <strong>Otwórz wysyłki</strong>
            <em>Dzisiaj i plan całego tygodnia</em>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => onNavigate("schedule")} type="button">
          <span className="quick-icon"><CalendarDays /></span>
          <span>
            <small>Organizacja zespołu</small>
            <strong>Przejdź do grafiku</strong>
            <em>Zmiany, weekendy i zaplanowane urlopy</em>
          </span>
          <ChevronRight />
        </button>
      </section>

      <section className="dashboard-grid">
        <article className="panel stock-overview">
          <div className="panel-heading">
            <div>
              <span>PLAN WYSYŁEK</span>
              <h3>Najbliższe wysyłki</h3>
            </div>
            <button
              onClick={() => onNavigate("shipments")}
              type="button"
            >
              Pełny widok <ChevronRight />
            </button>
          </div>
          <div className="empty-report-state">
            <strong>Brak danych o wysyłkach</strong>
            <span>Plan dzienny i tygodniowy pojawi się po podłączeniu D365.</span>
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><span>KONTROLA JAKOŚCI</span><h3>Blokady i wyjątki</h3></div>
            <span className="status-badge info">Dane D365</span>
          </div>
          <div className="activity-list">
            <div className="empty-report-state">
              <strong>Brak danych o blokadach</strong>
              <span>Palety na lokalizacji blokady jakościowej pojawią się tutaj.</span>
            </div>
          </div>
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
            Widok przeznaczony wyłącznie dla wyrobów gotowych — z indeksami,
            partiami, paletami, lokalizacją oraz blokadą jakościową.
          </p>
        </div>
        <button className="secondary-button" disabled type="button">
          <FileDown /> Raport po integracji
        </button>
      </section>

      <section className="finished-kpi-grid">
        {[
          ["Palety wyrobów", Boxes],
          ["Indeksy wyrobów", ClipboardList],
          ["Wolne miejsca", MapPin],
          ["Palety w blokadzie jakościowej", AlertTriangle],
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
                <th>Indeks / nr pozycji</th><th>Nazwa wyrobu</th><th>Partia</th>
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
