"use client";

import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileDown,
  MapPin,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { useState } from "react";

type ShipmentTab = "today" | "week";

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
