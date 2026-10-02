"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, Boxes, CalendarDays, ClipboardList, Clock3, MapPin, PackageOpen, Plus, QrCode, Truck, Warehouse } from "lucide-react";
import { useSharedState } from "./shared-data";
import { ShiftBoardSummary, boardStorageKeys, type ShiftBoardItem } from "./shift-board";
import { WorkforceSummary } from "./schedule-module";
import { capacities, inventoryDataAvailable, type MaterialName, materialColors } from "./warehouse-model";
import type { WorkforceArea } from "./workforce-model";

type HomeView = "map" | "inventory" | "deliveries" | "shipments" | "palletcount" | "barcodes" | "schedule" | "shiftboard";
type DeliveryPreview = { id: string; date: string; supplier: string; pallets: number };

// Dekoracyjny motyw regałów. Nie przedstawia stanów ani zajętości lokalizacji.
function WarehouseBlueprint() {
  return <div className="home-blueprint" aria-hidden="true">
    <div className="blueprint-caption"><span>REGAŁY / LOKALIZACJE</span><MapPin size={16} /></div>
    <svg viewBox="0 0 380 232" fill="none">
      <path d="M14 30V10H34M346 10H366V30M366 202V222H346M34 222H14V202" stroke="currentColor" opacity=".45" />
      <rect x="31" y="28" width="318" height="162" rx="8" stroke="currentColor" strokeDasharray="3 5" opacity=".25" />
      {Array.from({ length: 7 }, (_, rack) => <g key={rack}>
        <text x={54 + rack * 45} y="17" fill="currentColor" textAnchor="middle" fontSize="10" fontFamily="inherit">{String.fromCharCode(65 + rack)}</text>
        {Array.from({ length: 6 }, (_, cell) => <rect key={cell} x={40 + rack * 45} y={40 + cell * 24} width="28" height="17" rx="3" stroke="currentColor" fill="currentColor" fillOpacity=".07" strokeOpacity=".5" />)}
      </g>)}
      <path d="M39 205H340M332 201L340 205L332 209" stroke="currentColor" opacity=".6" />
      <circle cx="39" cy="205" r="3" fill="currentColor" />
    </svg>
    <div className="blueprint-footer"><span>MAGAZYN GŁÓWNY</span><span>A — G</span></div>
  </div>;
}

export function OperationsHome({ area, onNavigate, onAddDelivery, deliveries = [], occupied = { A: 0, B: 0 }, materials }: {
  area: WorkforceArea;
  onNavigate: (view: HomeView) => void;
  onAddDelivery: () => void;
  deliveries?: DeliveryPreview[];
  occupied?: { A: number; B: number };
  materials?: Record<MaterialName, number>;
}) {
  const [items] = useSharedState<ShiftBoardItem[]>(boardStorageKeys[area], []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const raw = area === "raw";
  const active = items.filter(item => item.status !== "done");
  const urgent = active.filter(item => item.priority === "urgent").length;
  const todayDeliveries = deliveries.filter(delivery => delivery.date === today);
  const recent = [...deliveries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 3);
  const total = occupied.A + occupied.B;
  const stats = [
    { label: "Do zrobienia", value: items.filter(item => item.status === "todo").length, view: "shiftboard" as HomeView, tone: "todo" },
    { label: "W trakcie", value: items.filter(item => item.status === "progress").length, view: "shiftboard" as HomeView, tone: "progress" },
    { label: "Pilne sprawy", value: urgent, view: "shiftboard" as HomeView, tone: urgent ? "urgent" : "neutral" },
    { label: raw ? "Dostawy dzisiaj" : "Wysyłki dzisiaj", value: raw ? todayDeliveries.length : "—", view: raw ? "deliveries" as HomeView : "shipments" as HomeView, tone: "neutral" },
  ];
  const shortcuts = [
    { title: raw ? "Dodaj dostawę" : "Plan wysyłek", detail: raw ? "Dostawca i liczba palet" : "Ładunki i terminy", icon: Truck, action: raw ? onAddDelivery : () => onNavigate("shipments") },
    { title: raw ? "Policz palety" : "Grafik zespołu", detail: raw ? "Liczenie i protokoły" : "Obsada i nieobecności", icon: raw ? PackageOpen : CalendarDays, action: () => onNavigate(raw ? "palletcount" : "schedule") },
    { title: "Raport zapasów", detail: "Przegląd stanów", icon: BarChart3, action: () => onNavigate("inventory") },
    { title: raw ? "Kody kreskowe" : "Tablica zmianowa", detail: raw ? "Ładunki i lokalizacje" : "Zadania i komunikaty", icon: raw ? QrCode : ClipboardList, action: () => onNavigate(raw ? "barcodes" : "shiftboard") },
  ];

  return <div className="operations-home home-v3">
    <div className="home-welcome">
      <span className="section-eyebrow">TWÓJ DZIEŃ. TWÓJ MAGAZYN.</span>
      <time dateTime={today}><CalendarDays size={16} />{new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now)}</time>
    </div>

    <div className="home-top-grid">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <span className="hero-area"><Warehouse size={15} />{raw ? "Magazyn surowców" : "Magazyn wyrobów gotowych"}</span>
          <h2 id="home-title">Wszystko<br />na swoim <em>miejscu.</em></h2>
          <p>Lokalizacje, zadania i {raw ? "dostawy" : "wysyłki"}.<br />Twój magazyn w jednym widoku.</p>
          <button className="home-map-button" type="button" onClick={() => onNavigate("map")}><MapPin size={18} /> Otwórz mapę magazynu <ArrowUpRight size={18} /></button>
        </div>
        <WarehouseBlueprint />
        <div className="hero-footnote"><span>WAREHOUSE</span><span>by Masterpress</span></div>
      </section>

      <section className="home-day-card" aria-label="Podsumowanie dnia">
        <header><div><span className="section-eyebrow">PRZEGLĄD DNIA</span><h3>Na pierwszy rzut oka</h3></div><Clock3 size={21} /></header>
        <div className="home-stat-grid">{stats.map(stat => <button key={stat.label} type="button" className={`stat-${stat.tone}`} onClick={() => onNavigate(stat.view)}>
          <span className="stat-top"><i /><ArrowUpRight size={15} /></span><strong>{stat.value}</strong><span>{stat.label}</span>
        </button>)}</div>
        <div className="home-day-note">{raw ? <><Truck size={16} /><span>Dzisiaj w rejestrze: <b>{todayDeliveries.reduce((sum, delivery) => sum + delivery.pallets, 0).toLocaleString("pl-PL")} palet</b></span></> : <><Boxes size={16} /><span>Dane wysyłek pojawią się po podłączeniu D365.</span></>}</div>
      </section>
    </div>

    <section className="home-quick-section" aria-labelledby="quick-title">
      <div className="home-section-label"><h3 id="quick-title">Co chcesz zrobić?</h3><span>Najważniejsze działania pod ręką</span></div>
      <div className="home-quick-grid">{shortcuts.map(({ title, detail, icon: Icon, action }) => <button type="button" key={title} onClick={action}>
        <span className="quick-icon"><Icon size={23} /></span><span className="quick-copy"><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight className="quick-arrow" size={18} />
      </button>)}</div>
    </section>

    <div className="home-work-grid">
      <ShiftBoardSummary area={area} onOpen={() => onNavigate("shiftboard")} />
      <section className="operations-activity">
        <div className="operations-section-heading"><div><span className="section-eyebrow">{raw ? "REJESTR DOSTAW" : "PLAN WYSYŁEK"}</span><h3>{raw ? "Ostatnie przyjęcia" : "Najbliższe wysyłki"}</h3></div><button className="text-action" onClick={() => onNavigate(raw ? "deliveries" : "shipments")} type="button">Zobacz wszystkie <ArrowRight size={16} /></button></div>
        {raw && recent.length > 0 ? <div className="recent-deliveries">{recent.map(delivery => <article key={delivery.id}><span className="delivery-day">{delivery.date.slice(8, 10)}<small>{delivery.date.slice(5, 7)}</small></span><div><strong>{delivery.supplier}</strong><span>{delivery.id}</span></div><b>{delivery.pallets}<small>palet</small></b></article>)}</div> : <div className="home-empty-state"><span className="home-empty-icon"><Truck size={26} /></span><div><h4>{raw ? "Gotowi na pierwszą dostawę" : "Miejsce na najbliższe wysyłki"}</h4><p>{raw ? "Zapisz przyjęcie. Tutaj znajdziesz ostatnie dostawy i liczbę palet." : "Ładunki i terminy zobaczysz tutaj po podłączeniu danych z D365."}</p>{raw && <button className="text-action" onClick={onAddDelivery} type="button"><Plus size={16} /> Dodaj dostawę</button>}</div></div>}
      </section>
    </div>

    <section className="home-space" aria-labelledby="space-title">
      <div className="home-space-heading"><span className="section-eyebrow">LOKALIZACJE</span><h3 id="space-title">Przestrzeń<br />do działania.</h3><button className="text-action" onClick={() => onNavigate("map")} type="button">Przejdź do mapy <ArrowRight size={16} /></button></div>
      <div className="home-capacities">{(raw ? ["A", "B"] as const : ["A"] as const).map(key => <button key={key} type="button" className="home-capacity" onClick={() => onNavigate("map")}>
        <div className="capacity-card-heading"><span><Warehouse size={19} />{key === "A" ? "Magazyn główny" : "Nowy magazyn"}</span><ArrowUpRight size={17} /></div>
        <p>{key === "A" ? "Regały A–G" : "Bloki 1, 2 i 3"}</p>
        <div className="capacity-card-number"><strong>{capacities[key].toLocaleString("pl-PL")}</strong><span>miejsc<br />paletowych</span></div>
        {raw && inventoryDataAvailable && <div className="capacity-progress" role="progressbar" aria-label={`Zajętość ${key === "A" ? "magazynu głównego" : "nowego magazynu"}`} aria-valuenow={occupied[key]} aria-valuemin={0} aria-valuemax={capacities[key]}><i style={{ width: `${Math.min(100, occupied[key] / capacities[key] * 100)}%` }} /></div>}
      </button>)}
      <p className="home-capacity-note"><Boxes size={16} />{raw && inventoryDataAvailable ? `${total.toLocaleString("pl-PL")} palet w magazynach` : "Układ regałów jest dostępny. Zajętość czeka na dane magazynowe."}</p>
      {raw && inventoryDataAvailable && materials && <div className="home-materials">{Object.entries(materials).map(([name, count]) => <div key={name}><i style={{ background: materialColors[name as MaterialName] }} /><span>{name}</span><strong>{count}</strong></div>)}</div>}
      </div>
    </section>

    <section className="operations-team"><div className="operations-section-heading"><div><span className="section-eyebrow">ORGANIZACJA PRACY</span><h3>Zespół i grafik</h3></div><button className="text-action" onClick={() => onNavigate("schedule")} type="button">Otwórz grafik <ArrowRight size={16} /></button></div><WorkforceSummary area={area} /></section>
  </div>;
}
