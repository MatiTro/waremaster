"use client";

import { BarChart3, Boxes, CalendarDays, ClipboardList, MapPin, PackageOpen, Plus, QrCode, Truck, Warehouse } from "lucide-react";
import { useSharedState } from "./shared-data";
import { ShiftBoardSummary, boardStorageKeys, type ShiftBoardItem } from "./shift-board";
import { WorkforceSummary } from "./schedule-module";
import { capacities, inventoryDataAvailable, type MaterialName, materialColors } from "./warehouse-model";
import type { WorkforceArea } from "./workforce-model";

type HomeView = "map" | "inventory" | "deliveries" | "shipments" | "palletcount" | "barcodes" | "schedule" | "shiftboard";
type DeliveryPreview = { id: string; date: string; supplier: string; pallets: number };

export function OperationsHome({ area, onNavigate, onAddDelivery, deliveries = [], occupied = { A: 0, B: 0 }, materials }: {
  area: WorkforceArea;
  onNavigate: (view: HomeView) => void;
  onAddDelivery: () => void;
  deliveries?: DeliveryPreview[];
  occupied?: { A: number; B: number };
  materials?: Record<MaterialName, number>;
}) {
  const [items] = useSharedState<ShiftBoardItem[]>(boardStorageKeys[area], []);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const raw = area === "raw";
  const active = items.filter(item => item.status !== "done");
  const todayDeliveries = deliveries.filter(delivery => delivery.date === today);
  const recent = [...deliveries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 4);
  const total = occupied.A + occupied.B;
  const stats = [
    { label: "Do zrobienia", value: items.filter(item => item.status === "todo").length, detail: "na tablicy zmianowej", view: "shiftboard" as HomeView },
    { label: "W trakcie", value: items.filter(item => item.status === "progress").length, detail: "rozpoczęte sprawy", view: "shiftboard" as HomeView },
    { label: "Pilne sprawy", value: active.filter(item => item.priority === "urgent").length, detail: "wymagają uwagi", view: "shiftboard" as HomeView },
    { label: raw ? "Dostawy dzisiaj" : "Wysyłki dzisiaj", value: raw ? todayDeliveries.length : "—", detail: raw ? `${todayDeliveries.reduce((sum, delivery) => sum + delivery.pallets, 0)} palet w rejestrze` : "Oczekiwanie na dane", view: raw ? "deliveries" as HomeView : "shipments" as HomeView },
  ];

  return <div className="operations-home">
    <section className="operations-heading">
      <div><span className="section-eyebrow">PRZEGLĄD DNIA</span><h2>Dzisiaj w magazynie</h2></div>
      <div className="operations-date"><CalendarDays /><time dateTime={today}>{new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(now)}</time></div>
    </section>

    <section className="day-strip" aria-label="Podsumowanie dnia">
      {stats.map(stat => <button key={stat.label} onClick={() => onNavigate(stat.view)} type="button">
        <span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small>
      </button>)}
    </section>

    <div className="operations-main-grid">
      <ShiftBoardSummary area={area} onOpen={() => onNavigate("shiftboard")} />
      <section className="operations-actions" aria-label="Szybkie działania">
        <div className="operations-section-heading"><div><span className="section-eyebrow">POD RĘKĄ</span><h3>Szybkie działania</h3></div></div>
        <button className="map-action" onClick={() => onNavigate("map")} type="button"><span className="action-icon"><MapPin /></span><span><strong>Mapa magazynu</strong><small>Regały i lokalizacje</small></span><span className="action-key">MAPA</span></button>
        <div className="operations-shortcuts">
          <button onClick={raw ? onAddDelivery : () => onNavigate("shipments")} type="button"><Truck /><strong>{raw ? "Dodaj dostawę" : "Plan wysyłek"}</strong></button>
          <button onClick={() => onNavigate(raw ? "palletcount" : "schedule")} type="button">{raw ? <PackageOpen /> : <CalendarDays />}<strong>{raw ? "Policz palety" : "Grafik zespołu"}</strong></button>
          <button onClick={() => onNavigate("inventory")} type="button"><BarChart3 /><strong>Raport zapasów</strong></button>
          <button onClick={() => onNavigate(raw ? "barcodes" : "shiftboard")} type="button">{raw ? <QrCode /> : <ClipboardList />}<strong>{raw ? "Kody kreskowe" : "Tablica zmianowa"}</strong></button>
        </div>
      </section>
    </div>

    <div className="operations-bottom-grid">
      <section className="operations-stock">
        <div className="operations-section-heading"><div><span className="section-eyebrow">LOKALIZACJE</span><h3>Przestrzeń magazynu</h3></div><button className="text-action" onClick={() => onNavigate("map")} type="button">Otwórz mapę</button></div>
        <div className="capacity-list">
          {(raw ? ["A", "B"] as const : ["A"] as const).map(key => <article key={key}>
            <span className="capacity-icon"><Warehouse /></span>
            <div><h4>{key === "A" ? "Magazyn główny" : "Nowy magazyn"}</h4><p>{key === "A" ? "Regały A–G" : "Bloki 1, 2 i 3"}</p>
              {raw && inventoryDataAvailable && <div className="capacity-progress" role="progressbar" aria-label={`Zajętość ${key === "A" ? "magazynu głównego" : "nowego magazynu"}`} aria-valuenow={occupied[key]} aria-valuemin={0} aria-valuemax={capacities[key]}><i style={{ width: `${Math.min(100, occupied[key] / capacities[key] * 100)}%` }} /></div>}
            </div>
            <div className="capacity-number"><strong>{capacities[key].toLocaleString("pl-PL")}</strong><span>miejsc paletowych</span></div>
          </article>)}
        </div>
        <div className="inventory-connection"><Boxes /><p>{raw && inventoryDataAvailable ? `${total.toLocaleString("pl-PL")} palet w magazynach` : "Układ magazynu jest dostępny. Zajętość pojawi się po podłączeniu danych."}</p></div>
        {raw && inventoryDataAvailable && materials && <div className="home-materials">{Object.entries(materials).map(([name, count]) => <div key={name}><i style={{ background: materialColors[name as MaterialName] }} /><span>{name}</span><strong>{count}</strong></div>)}</div>}
      </section>
      <section className="operations-activity">
        <div className="operations-section-heading"><div><span className="section-eyebrow">{raw ? "REJESTR DOSTAW" : "PLAN WYSYŁEK"}</span><h3>{raw ? "Ostatnie przyjęcia" : "Najbliższe wysyłki"}</h3></div><button className="text-action" onClick={() => onNavigate(raw ? "deliveries" : "shipments")} type="button">Pełny widok</button></div>
        {raw && recent.length > 0 ? <div className="recent-deliveries">{recent.map(delivery => <article key={delivery.id}><span className="delivery-day">{delivery.date.slice(8, 10)}<small>{delivery.date.slice(5, 7)}</small></span><div><strong>{delivery.supplier}</strong><span>{delivery.id}</span></div><b>{delivery.pallets}<small>palet</small></b></article>)}</div> : <div className="operations-empty"><Truck /><h4>{raw ? "Tu zaczyna się rejestr dostaw" : "Plan wysyłek czeka na dane"}</h4><p>{raw ? "Dodaj dostawcę i liczbę palet. Ostatnie przyjęcia zobaczysz tutaj." : "Ładunki i terminy pojawią się po podłączeniu D365."}</p>{raw && <button className="secondary-button" onClick={onAddDelivery} type="button"><Plus /> Dodaj dostawę</button>}</div>}
      </section>
    </div>

    <section className="operations-team"><div className="operations-section-heading"><div><span className="section-eyebrow">ORGANIZACJA PRACY</span><h3>Zespół i grafik</h3></div><button className="text-action" onClick={() => onNavigate("schedule")} type="button">Otwórz grafik</button></div><WorkforceSummary area={area} /></section>
  </div>;
}
