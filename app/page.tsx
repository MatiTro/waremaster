"use client";

import JsBarcode from "jsbarcode";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Menu,
  Mic,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Printer,
  Power,
  QrCode,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type View = "dashboard" | "inventory" | "map" | "deliveries" | "suppliers" | "barcodes";
type WarehouseKey = "A" | "B";
type MaterialName = "Papier" | "Folia" | "Farby" | "Kleje" | "Inne";
type RackMaterial = "Papier" | "Folia" | "Karton" | "Tuleje";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Delivery = {
  id: string;
  supplier: string;
  pallets: number;
  material: MaterialName;
  warehouse: WarehouseKey;
  notes: string;
  time: string;
};

type StockOperation = {
  id: string;
  action: "Dodano" | "Wydano" | "Przesunięto";
  pallets: number;
  material: MaterialName;
  location: string;
  time: string;
};

type SupplierEntry = {
  id: number;
  name: string;
  material: MaterialName;
  active: boolean;
};

const capacities: Record<WarehouseKey, number> = { A: 900, B: 700 };
const initialSupplierCatalog: SupplierEntry[] = [
  { id: 1, name: "Kurier", material: "Inne", active: true },
  { id: 2, name: "Klockner", material: "Folia", active: true },
  { id: 3, name: "Far Eastern", material: "Papier", active: true },
  { id: 4, name: "Itochu", material: "Papier", active: true },
  { id: 5, name: "Liveo", material: "Folia", active: true },
  { id: 6, name: "Avery", material: "Papier", active: true },
  { id: 7, name: "Raflatac", material: "Papier", active: true },
  { id: 8, name: "Jinda", material: "Folia", active: true },
  { id: 9, name: "Magzew", material: "Farby", active: true },
  { id: 10, name: "Andersa", material: "Kleje", active: true },
];
const materialColors: Record<MaterialName, string> = {
  Papier: "#002855",
  Folia: "#24679e",
  Farby: "#5385ad",
  Kleje: "#8bb0cc",
  Inne: "#d7e1e9",
};

const rackMaterials: RackMaterial[] = ["Papier", "Folia", "Karton", "Tuleje"];
const rackMaterialClass: Record<RackMaterial, string> = {
  Papier: "material-paper",
  Folia: "material-foil",
  Karton: "material-cardboard",
  Tuleje: "material-cores",
};

function getRackMaterial(column: number, level: number, slot: number, rack: number): RackMaterial {
  return rackMaterials[(column * 3 + level + slot + rack) % rackMaterials.length];
}

const initialDeliveries: Delivery[] = [
  { id: "D-0251", supplier: "Raflatac", pallets: 24, material: "Papier", warehouse: "A", notes: "Rampa 2", time: "Dziś, 08:42" },
  { id: "D-0250", supplier: "Klockner", pallets: 18, material: "Folia", warehouse: "B", notes: "", time: "Dziś, 07:56" },
  { id: "D-0249", supplier: "Avery", pallets: 12, material: "Papier", warehouse: "B", notes: "Awizacja 11:30", time: "Wczoraj, 14:18" },
];

const rackCapacity = {
  M1: [
    [1, 162, 216], [2, 204, 216], [3, 152, 216], [4, 206, 216],
    [5, 126, 216], [6, 210, 216], [7, 132, 216], [8, 172, 216],
  ],
  M2: [
    [1, 171, 216], [2, 205, 216], [3, 140, 216], [4, 187, 216],
    [5, 122, 216], [6, 200, 216], [7, 106, 216], [8, 164, 216],
    [9, 144, 216], [10, 207, 216], [11, 149, 216],
  ],
  M3: [
    [1, 162, 216], [2, 185, 216], [3, 126, 216], [4, 208, 216],
    [5, 134, 216], [6, 172, 216], [7, 201, 216], [8, 113, 216],
    [9, 157, 216], [10, 177, 216],
  ],
} satisfies Record<string, [number, number, number][]>;

const initialOperations: StockOperation[] = [
  { id: "OP-581", action: "Dodano", pallets: 24, material: "Papier", location: "Magazyn A", time: "08:45" },
  { id: "OP-580", action: "Przesunięto", pallets: 8, material: "Folia", location: "A → B", time: "07:20" },
  { id: "OP-579", action: "Wydano", pallets: 6, material: "Farby", location: "Magazyn B", time: "Wczoraj" },
];

const navItems: { id: View; label: string; description: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Centrum", description: "Przegląd operacji", icon: LayoutDashboard },
  { id: "inventory", label: "Stan zapasów", description: "Palety A / B", icon: Boxes },
  { id: "map", label: "Mapa magazynu", description: "Regały i pojemność", icon: MapPin },
  { id: "deliveries", label: "Dostawy", description: "Rejestr i raporty", icon: Truck },
  { id: "suppliers", label: "Kartoteka dostawców", description: "Automaty surowców", icon: BookOpen },
  { id: "barcodes", label: "Kody kreskowe", description: "Ładunki i lokalizacje", icon: QrCode },
];

function Barcode({ value, compact = false }: { value: string; compact?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      lineColor: "#071b2f",
      background: "#ffffff",
      width: compact ? 1.65 : 2.2,
      height: compact ? 54 : 88,
      margin: compact ? 8 : 14,
      displayValue: true,
      font: "monospace",
      fontSize: compact ? 12 : 16,
    });
  }, [compact, value]);

  return <svg aria-label={`Kod kreskowy ${value}`} className="barcode-svg" ref={ref} />;
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: "success" | "pending" | "info" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [warehouses, setWarehouses] = useState<Record<WarehouseKey, number>>({ A: 742, B: 506 });
  const [materials, setMaterials] = useState<Record<MaterialName, number>>({ Papier: 468, Folia: 322, Farby: 214, Kleje: 156, Inne: 88 });
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [operations, setOperations] = useState<StockOperation[]>(initialOperations);
  const [toast, setToast] = useState<string | null>(null);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [deliverySupplier, setDeliverySupplier] = useState("");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [stockMode, setStockMode] = useState<"add" | "remove" | "transfer">("add");
  const [barcodeTab, setBarcodeTab] = useState<"load" | "location">("load");
  const [loadId, setLoadId] = useState("LD-000847");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [loadSupplier, setLoadSupplier] = useState("");
  const [searchedLoad, setSearchedLoad] = useState("LD-000847");
  const [loadCodes, setLoadCodes] = useState(["LP000008471", "LP000008472", "LP000008473", "LP000008474"]);
  const [location, setLocation] = useState({ block: "M2", rack: "04", column: "07", place: "12" });
  const [mapBlock, setMapBlock] = useState<keyof typeof rackCapacity>("M2");
  const [selectedRack, setSelectedRack] = useState(4);
  const [selectedMapSlot, setSelectedMapSlot] = useState({ column: 3, level: 4, slot: 1 });
  const [supplierCatalog, setSupplierCatalog] = useState<SupplierEntry[]>(initialSupplierCatalog);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAnswer, setVoiceAnswer] = useState("Dotknij mikrofonu i zadaj pytanie dotyczące magazynu.");

  const totalPallets = warehouses.A + warehouses.B;
  const todayDeliveries = deliveries.filter((delivery) => delivery.time.startsWith("Dziś")).length;
  const todayPallets = deliveries.filter((delivery) => delivery.time.startsWith("Dziś")).reduce((sum, delivery) => sum + delivery.pallets, 0);
  const suppliers = supplierCatalog.filter((supplier) => supplier.active).map((supplier) => supplier.name);
  const matchedDeliverySupplier = supplierCatalog.find((supplier) => supplier.active && supplier.name.toLocaleLowerCase("pl") === deliverySupplier.trim().toLocaleLowerCase("pl"));
  const automaticMaterial = matchedDeliverySupplier?.material || "Inne";
  const filteredSuppliers = supplierCatalog.filter((supplier) =>
    [supplier.name, supplier.material].join(" ").toLocaleLowerCase("pl").includes(supplierSearch.trim().toLocaleLowerCase("pl")),
  );
  const selectedRackData = rackCapacity[mapBlock].find(([rack]) => rack === selectedRack) || rackCapacity[mapBlock][0];
  const selectedRackPercent = Math.round(selectedRackData[1] / selectedRackData[2] * 100);
  const selectedPlaceNumber = (selectedMapSlot.level - 1) * 3 + selectedMapSlot.slot;
  const selectedSlotOccupied = ((selectedMapSlot.column * 17 + selectedMapSlot.level * 23 + selectedMapSlot.slot * 29 + selectedRack * 11) % 100) < selectedRackPercent;
  const selectedRackMaterial = getRackMaterial(selectedMapSlot.column, selectedMapSlot.level, selectedMapSlot.slot, selectedRack);
  const selectedLocationIds = selectedSlotOccupied
    ? Array.from({ length: 1 + ((selectedMapSlot.column + selectedMapSlot.level + selectedMapSlot.slot + selectedRack) % 3) }, (_, index) => `LP${String(selectedRack).padStart(2, "0")}${String(selectedMapSlot.column).padStart(2, "0")}${String(selectedPlaceNumber).padStart(2, "0")}${index + 1}`)
    : [];
  const selectedMapLocation = `${mapBlock}.${String(selectedRack).padStart(2, "0")}.${String(selectedMapSlot.column).padStart(2, "0")}.${String(selectedPlaceNumber).padStart(2, "0")}`;

  const donut = useMemo(() => {
    let cursor = 0;
    return `conic-gradient(${Object.entries(materials).map(([material, value]) => {
      const start = cursor;
      cursor += (value / totalPallets) * 100;
      return `${materialColors[material as MaterialName]} ${start}% ${cursor}%`;
    }).join(",")})`;
  }, [materials, totalPallets]);

  const filteredDeliveries = deliveries.filter((delivery) =>
    [delivery.id, delivery.supplier, delivery.material, delivery.warehouse]
      .join(" ")
      .toLocaleLowerCase("pl")
      .includes(deliverySearch.toLocaleLowerCase("pl").trim()),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(view: View) {
    setActiveView(view);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function speakAnswer(text: string) {
    setVoiceAnswer(text);
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pl-PL";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function runVoiceCommand(command: string) {
    const normalized = command.toLocaleLowerCase("pl");
    setVoiceTranscript(command);

    if (normalized.includes("identyfik") || normalized.includes("numer ni") || normalized.includes("numery ni") || /\bni\b/.test(normalized)) {
      navigate("map");
      const answer = selectedLocationIds.length
        ? `Na lokalizacji ${selectedMapLocation} znajdują się ${selectedLocationIds.length} numery identyfikacyjne: ${selectedLocationIds.join(", ")}.`
        : `Lokalizacja ${selectedMapLocation} jest wolna i nie ma przypisanych numerów identyfikacyjnych.`;
      speakAnswer(`${answer} Pokazuję szczegóły po prawej stronie mapy.`);
      return;
    }

    if (normalized.includes("stan") || normalized.includes("ile palet") || normalized.includes("liczba palet")) {
      navigate("inventory");
      speakAnswer(`Łączny stan wynosi ${totalPallets} palet. Magazyn A ma ${warehouses.A} palety, a magazyn B ${warehouses.B}. Otwieram stan zapasów.`);
      return;
    }

    const material = rackMaterials.find((item) => normalized.includes(item.toLocaleLowerCase("pl")));
    if (material) {
      navigate("map");
      speakAnswer(`${material} oznaczamy w panelu szczegółów lokalizacji. Na wybranym regale wykryłam 18 zajętych miejsc tego rodzaju. Otwieram mapę magazynu.`);
      return;
    }

    if (normalized.includes("woln") || normalized.includes("gdzie odłożyć") || normalized.includes("gdzie odlozyc") || normalized.includes("znajdź miejsce") || normalized.includes("znajdz miejsce")) {
      let best = { block: "M1" as keyof typeof rackCapacity, rack: 1, free: 0 };
      (Object.keys(rackCapacity) as (keyof typeof rackCapacity)[]).forEach((block) => rackCapacity[block].forEach(([rack, occupied, capacity]) => {
        if (capacity - occupied > best.free) best = { block, rack, free: capacity - occupied };
      }));
      setMapBlock(best.block);
      setSelectedRack(best.rack);
      setSelectedMapSlot({ column: 3, level: 4, slot: 1 });
      navigate("map");
      speakAnswer(`Najwięcej wolnych miejsc ma regał ${best.block} ${String(best.rack).padStart(2, "0")}. Dostępnych jest tam ${best.free} miejsc. Pokazuję go na mapie.`);
      return;
    }

    if (normalized.includes("co potrafisz") || normalized.includes("pomoc") || normalized.includes("komendy")) {
      speakAnswer("Możesz zapytać: gdzie jest najwięcej wolnych miejsc, ile palet jest w magazynie, jakie numery identyfikacyjne są na tej lokalizacji albo gdzie znajduje się papier, folia, karton lub tuleje.");
      return;
    }

    speakAnswer("Mogę wskazać wolne miejsca, podać stan palet, wyszukać numery identyfikacyjne albo przeanalizować rodzaj surowca. Spróbuj zadać jedno z tych pytań.");
  }

  function startVoiceListening() {
    const browserWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      speakAnswer("Ta przeglądarka nie obsługuje rozpoznawania mowy. Na tablecie użyj aktualnej wersji Chrome lub Edge.");
      return;
    }
    window.speechSynthesis?.cancel();
    const recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => runVoiceCommand(event.results[0][0].transcript);
    recognition.onerror = () => speakAnswer("Nie udało mi się usłyszeć pytania. Dotknij mikrofonu i spróbuj ponownie.");
    recognition.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    setVoiceAnswer("Słucham…");
    recognition.start();
  }

  function supplierMaterialFor(name: string): MaterialName {
    return supplierCatalog.find((supplier) => supplier.active && supplier.name.toLocaleLowerCase("pl") === name.trim().toLocaleLowerCase("pl"))?.material || "Inne";
  }

  function addStockOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const pallets = Math.max(1, Number(form.get("pallets")) || 1);
    const material = String(form.get("material")) as MaterialName;
    const warehouse = String(form.get("warehouse")) as WarehouseKey;
    const target = String(form.get("target")) as WarehouseKey;

    if (stockMode === "transfer") {
      if (warehouse === target) {
        setToast("Wybierz dwa różne magazyny.");
        return;
      }
      if (warehouses[warehouse] < pallets) {
        setToast(`W magazynie ${warehouse} nie ma tylu palet.`);
        return;
      }
      setWarehouses((current) => ({ ...current, [warehouse]: current[warehouse] - pallets, [target]: current[target] + pallets }));
    } else {
      const delta = stockMode === "add" ? pallets : -pallets;
      if (warehouses[warehouse] + delta < 0) {
        setToast(`W magazynie ${warehouse} nie ma tylu palet.`);
        return;
      }
      setWarehouses((current) => ({ ...current, [warehouse]: current[warehouse] + delta }));
      setMaterials((current) => ({ ...current, [material]: Math.max(0, current[material] + delta) }));
    }

    const action = stockMode === "add" ? "Dodano" : stockMode === "remove" ? "Wydano" : "Przesunięto";
    setOperations((current) => [{
      id: `OP-${582 + current.length - initialOperations.length}`,
      action,
      pallets,
      material,
      location: stockMode === "transfer" ? `${warehouse} → ${target}` : `Magazyn ${warehouse}`,
      time: "Przed chwilą",
    }, ...current]);
    setToast(`${action} ${pallets} palet. Liczniki zostały zaktualizowane.`);
    event.currentTarget.reset();
  }

  function saveDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier = String(form.get("supplier")).trim();
    const payload = {
      supplier,
      pallets: Math.max(1, Number(form.get("pallets")) || 1),
      material: supplierMaterialFor(supplier),
      warehouse: String(form.get("warehouse")) as WarehouseKey,
      notes: String(form.get("notes") || ""),
    };

    if (editingDelivery) {
      const previous = deliveries.find((delivery) => delivery.id === editingDelivery);
      if (previous) {
        setWarehouses((current) => ({
          ...current,
          [previous.warehouse]: current[previous.warehouse] - previous.pallets,
          [payload.warehouse]: current[payload.warehouse] + payload.pallets - (previous.warehouse === payload.warehouse ? previous.pallets : 0),
        }));
        setMaterials((current) => ({
          ...current,
          [previous.material]: Math.max(0, current[previous.material] - previous.pallets),
          [payload.material]: current[payload.material] + payload.pallets - (previous.material === payload.material ? previous.pallets : 0),
        }));
      }
      setDeliveries((current) => current.map((delivery) => delivery.id === editingDelivery ? { ...delivery, ...payload } : delivery));
      setToast(`Zapisano zmiany w ${editingDelivery}.`);
    } else {
      const id = `D-${String(252 + deliveries.length - initialDeliveries.length).padStart(4, "0")}`;
      setDeliveries((current) => [{ ...payload, id, time: "Dziś, przed chwilą" }, ...current]);
      setWarehouses((current) => ({ ...current, [payload.warehouse]: current[payload.warehouse] + payload.pallets }));
      setMaterials((current) => ({ ...current, [payload.material]: current[payload.material] + payload.pallets }));
      setOperations((current) => [{ id: `OP-${582 + current.length - initialOperations.length}`, action: "Dodano", pallets: payload.pallets, material: payload.material, location: `Magazyn ${payload.warehouse}`, time: "Przed chwilą" }, ...current]);
      setToast(`Dostawa ${id} zapisana. Stan magazynu został zaktualizowany.`);
    }
    setEditingDelivery(null);
    setDeliverySupplier("");
    setDeliveryModal(false);
  }

  function deleteDelivery(id: string) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return;
    setWarehouses((current) => ({ ...current, [delivery.warehouse]: Math.max(0, current[delivery.warehouse] - delivery.pallets) }));
    setMaterials((current) => ({ ...current, [delivery.material]: Math.max(0, current[delivery.material] - delivery.pallets) }));
    setDeliveries((current) => current.filter((item) => item.id !== id));
    setToast(`Usunięto ${id} i skorygowano stan magazynu.`);
  }

  function openEdit(delivery: Delivery) {
    setEditingDelivery(delivery.id);
    setDeliverySupplier(delivery.supplier);
    setDeliveryModal(true);
  }

  function openSupplierForm(supplier?: SupplierEntry) {
    setEditingSupplierId(supplier?.id || null);
    setSupplierModalOpen(true);
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const material = String(form.get("material")) as MaterialName;
    if (!name) return;
    if (editingSupplierId) {
      setSupplierCatalog((current) => current.map((supplier) => supplier.id === editingSupplierId ? { ...supplier, name, material } : supplier));
      setToast(`Zaktualizowano automat dla dostawcy ${name}.`);
    } else {
      setSupplierCatalog((current) => [...current, { id: Date.now(), name, material, active: true }]);
      setToast(`Dodano dostawcę ${name} → ${material}.`);
    }
    setSupplierModalOpen(false);
    setEditingSupplierId(null);
  }

  function toggleSupplier(id: number) {
    const supplier = supplierCatalog.find((item) => item.id === id);
    if (!supplier) return;
    setSupplierCatalog((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item));
    setToast(`${supplier.name}: automat ${supplier.active ? "wyłączony" : "włączony"}.`);
  }

  function searchLoad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = loadId.trim().toUpperCase();
    const normalizedOrder = purchaseOrder.trim().toUpperCase();
    const normalizedSupplier = loadSupplier.trim();
    if (!normalized && !normalizedOrder && !normalizedSupplier) {
      setToast("Wpisz numer ładunku, zamówienie zakupu albo dostawcę.");
      return;
    }
    const source = normalized || normalizedOrder || normalizedSupplier;
    const numericPart = source.replace(/\D/g, "");
    const checksum = Array.from(source).reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const digits = (numericPart || String(checksum)).slice(-6).padStart(6, "0");
    const resultLabel = normalized || (normalizedOrder ? `Zamówienie ${normalizedOrder}` : `Dostawca ${normalizedSupplier}`);
    setSearchedLoad(resultLabel);
    setLoadCodes([1, 2, 3, 4].map((index) => `LP${digits}${index}`));
    setToast(`Znaleziono 4 identyfikatory: ${resultLabel}.`);
  }

  const visualLocationCode = `${location.block}.${location.rack}.${location.column}.${location.place}`;
  const locationBarcodeValue = `${location.block.replace(/^M/, "")}.${location.rack}.${location.column}.${location.place}`;
  const edited = editingDelivery ? deliveries.find((delivery) => delivery.id === editingDelivery) : undefined;
  const editedSupplier = editingSupplierId ? supplierCatalog.find((supplier) => supplier.id === editingSupplierId) : undefined;

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <button aria-label="Zamknij menu" className="mobile-close" onClick={() => setMobileNav(false)} type="button"><X /></button>
          <img alt="Masterpress" src={`${import.meta.env.BASE_URL}masterpress-logo-white.png`} />
        </div>

        <nav className="main-nav" aria-label="Nawigacja główna">
          <p>Centrum dowodzenia</p>
          {navItems.map(({ id, label, description, icon: Icon }) => (
            <button className={activeView === id ? "active" : ""} key={id} onClick={() => navigate(id)} type="button">
              <span className="nav-icon"><Icon size={20} /></span>
              <span><strong>{label}</strong><small>{description}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div><span className="pulse" /><strong>Tryb demonstracyjny</strong></div>
          <p>Interfejs jest gotowy. Serwer i D365 podłączymy w kolejnym etapie.</p>
        </div>

        <div className="station-row">
          <span><Warehouse size={18} /></span>
          <div><strong>Stanowisko magazynowe</strong><small>Bez logowania imiennego</small></div>
        </div>
      </aside>

      {mobileNav && <button aria-label="Zamknij menu" className="nav-backdrop" onClick={() => setMobileNav(false)} type="button" />}

      <section className="workspace">
        <header className="topbar">
          <button aria-label={sidebarCollapsed ? "Pokaż menu" : "Ukryj menu"} className="menu-button" onClick={() => { if (window.matchMedia("(max-width: 940px)").matches) setMobileNav(true); else setSidebarCollapsed((value) => !value); }} type="button"><Menu /></button>
          <div className="topbar-title">
            <p>MASTERPRESS · WAREHOUSE CENTER</p>
            <h1>{navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
        </header>

        {activeView === "dashboard" && (
          <div className="view-stack">
            <section className="command-hero">
              <div>
                <span className="hero-label"><Sparkles size={14} /> Jedno miejsce dla całego magazynu</span>
                <h2>Aktualny obraz magazynu</h2>
                <p>Stany, dostawy i kody kreskowe są teraz częścią jednego procesu.</p>
              </div>
              <div className="hero-sync"><span>Ostatnia aktualizacja</span><strong>Dzisiaj, 09:12</strong><small>Dane demonstracyjne</small></div>
            </section>

            <section className="kpi-grid">
              <article className="metric-card metric-primary"><div><span>Łącznie palet</span><PackageOpen /></div><strong>{totalPallets.toLocaleString("pl-PL")}</strong><p><b>+86</b> od początku tygodnia</p></article>
              <article className="metric-card"><div><span>Magazyn A</span><Warehouse /></div><strong>{warehouses.A}<small> / {capacities.A}</small></strong><div className="progress"><i style={{ width: `${warehouses.A / capacities.A * 100}%` }} /></div><p>{capacities.A - warehouses.A} wolnych miejsc</p></article>
              <article className="metric-card"><div><span>Magazyn B</span><Warehouse /></div><strong>{warehouses.B}<small> / {capacities.B}</small></strong><div className="progress"><i style={{ width: `${warehouses.B / capacities.B * 100}%` }} /></div><p>{capacities.B - warehouses.B} wolnych miejsc</p></article>
              <article className="metric-card"><div><span>Dostawy dzisiaj</span><Truck /></div><strong>{todayDeliveries}<small> dostawy</small></strong><p><b>{todayPallets}</b> palet zarejestrowanych</p></article>
            </section>

            <section className="quick-grid">
              <button onClick={() => navigate("inventory")} type="button"><span className="quick-icon"><ArrowLeftRight /></span><span><small>Szybka operacja</small><strong>Zmień stan palet</strong><em>Dodaj, wydaj lub przesuń palety</em></span><ChevronRight /></button>
              <button onClick={() => { navigate("deliveries"); setEditingDelivery(null); setDeliverySupplier(""); setDeliveryModal(true); }} type="button"><span className="quick-icon"><ClipboardList /></span><span><small>Rejestr dostaw</small><strong>Dodaj nową dostawę</strong><em>Formularz przygotowany pod telefon</em></span><ChevronRight /></button>
              <button onClick={() => navigate("barcodes")} type="button"><span className="quick-icon"><QrCode /></span><span><small>Generator</small><strong>Pokaż kody ładunku</strong><em>Szukaj po ładunku, PO lub dostawcy</em></span><ChevronRight /></button>
            </section>

            <section className="dashboard-grid">
              <article className="panel stock-overview">
                <div className="panel-heading"><div><span>STRUKTURA ZAPASU</span><h3>Palety według surowca</h3></div><button onClick={() => navigate("inventory")} type="button">Pełny widok <ChevronRight /></button></div>
                <div className="material-overview">
                  <div className="donut" style={{ background: donut }}><div><strong>{totalPallets}</strong><span>palet</span></div></div>
                  <div className="material-legend">{(Object.entries(materials) as [MaterialName, number][]).map(([material, value]) => <div key={material}><i style={{ background: materialColors[material] }} /><span>{material}</span><strong>{value}</strong></div>)}</div>
                </div>
              </article>
              <article className="panel activity-panel">
                <div className="panel-heading"><div><span>OSTATNIE OPERACJE</span><h3>Co dzieje się w magazynie</h3></div><StatusBadge tone="success"><span className="pulse" /> na żywo</StatusBadge></div>
                <div className="activity-list">{operations.slice(0, 4).map((operation) => <div key={operation.id}><span className={`activity-icon ${operation.action === "Wydano" ? "out" : operation.action === "Przesunięto" ? "move" : "in"}`}>{operation.action === "Wydano" ? <ArrowUpFromLine /> : operation.action === "Przesunięto" ? <ArrowLeftRight /> : <ArrowDownToLine />}</span><span><strong>{operation.action} {operation.pallets} palet</strong><small>{operation.material} · {operation.location}</small></span><time>{operation.time}</time></div>)}</div>
              </article>
            </section>
          </div>
        )}

        {activeView === "inventory" && (
          <div className="view-stack">
            <section className="view-intro"><div><span>STANY MAGAZYNOWE</span><h2>Stan zapasów</h2><p>Liczniki palet, struktura surowców oraz szybkie korekty stanu magazynów.</p></div><StatusBadge tone="info">Dane demonstracyjne</StatusBadge></section>
            <section className="warehouse-cards">
              {(["A", "B"] as WarehouseKey[]).map((warehouse) => <article key={warehouse}><span className="warehouse-letter">{warehouse}</span><div><small>MAGAZYN {warehouse}</small><strong>{warehouses[warehouse]} <em>palet</em></strong><div className="progress"><i style={{ width: `${warehouses[warehouse] / capacities[warehouse] * 100}%` }} /></div><p><b>{Math.round(warehouses[warehouse] / capacities[warehouse] * 100)}%</b> zajęto · {capacities[warehouse] - warehouses[warehouse]} wolnych</p></div></article>)}
              <article className="warehouse-total"><span><Boxes /></span><div><small>RAZEM</small><strong>{totalPallets} <em>palet</em></strong><p>Pojemność łączna: {capacities.A + capacities.B}</p></div></article>
            </section>
            <section className="inventory-grid">
              <article className="panel calculator-panel">
                <div className="panel-heading"><div><span>NOWA OPERACJA</span><h3>Zaktualizuj stan</h3></div></div>
                <div className="segmented">{([['add', 'Dodaj', ArrowDownToLine], ['remove', 'Wydaj', ArrowUpFromLine], ['transfer', 'Przesuń', ArrowLeftRight]] as const).map(([mode, label, Icon]) => <button className={stockMode === mode ? "active" : ""} key={mode} onClick={() => setStockMode(mode)} type="button"><Icon />{label}</button>)}</div>
                <form className="form-stack" onSubmit={addStockOperation}>
                  <label>{stockMode === "transfer" ? "Z magazynu" : "Magazyn"}<select name="warehouse" defaultValue="A"><option value="A">Magazyn A</option><option value="B">Magazyn B</option></select><ChevronDown /></label>
                  {stockMode === "transfer" && <label>Do magazynu<select name="target" defaultValue="B"><option value="A">Magazyn A</option><option value="B">Magazyn B</option></select><ChevronDown /></label>}
                  <div className="form-row"><label>Surowiec<select name="material" defaultValue="Papier">{Object.keys(materials).map((material) => <option key={material}>{material}</option>)}</select><ChevronDown /></label><label>Liczba palet<input min="1" name="pallets" placeholder="np. 24" required type="number" /></label></div>
                  <label>Powód / uwagi<input name="reason" placeholder="Opcjonalnie, np. korekta po inwentaryzacji" /></label>
                  <button className="primary-button full-button" type="submit"><Check /> Zapisz operację</button>
                </form>
              </article>
              <article className="panel material-panel">
                <div className="panel-heading"><div><span>SUROWCE</span><h3>Struktura palet</h3></div><strong>{totalPallets}</strong></div>
                <div className="material-bars">{(Object.entries(materials) as [MaterialName, number][]).map(([material, value]) => <div key={material}><div><span><i style={{ background: materialColors[material] }} />{material}</span><strong>{value} palet</strong></div><div className="progress"><i style={{ background: materialColors[material], width: `${value / Math.max(...Object.values(materials)) * 100}%` }} /></div></div>)}</div>
              </article>
            </section>
            <article className="panel operations-table"><div className="panel-heading"><div><span>HISTORIA</span><h3>Ostatnie zmiany stanu</h3></div><FileText /></div><div className="table-scroll"><table><thead><tr><th>Operacja</th><th>Surowiec</th><th>Liczba</th><th>Lokalizacja</th><th>Czas</th></tr></thead><tbody>{operations.map((operation) => <tr key={operation.id}><td><strong>{operation.action}</strong></td><td>{operation.material}</td><td>{operation.pallets} palet</td><td>{operation.location}</td><td>{operation.time}</td></tr>)}</tbody></table></div></article>
          </div>
        )}

        {activeView === "map" && (
          <div className="view-stack location-navigator-view">
            <section className="navigator-hero">
              <div><span><Sparkles /> CYFROWY NAWIGATOR</span><h2>Znajdź konkretne miejsce</h2><p>Wybierz blok i regał, a następnie kliknij dokładną lokalizację na widoku regału od frontu.</p></div>
              <div className="navigator-path"><div className="done"><i>1</i><span><small>BLOK</small><strong>{mapBlock}</strong></span></div><b /><div className="done"><i>2</i><span><small>REGAŁ</small><strong>{String(selectedRack).padStart(2, "0")}</strong></span></div><b /><div><i>3</i><span><small>LOKALIZACJA</small><strong>{String(selectedMapSlot.column).padStart(2, "0")}.{String(selectedPlaceNumber).padStart(2, "0")}</strong></span></div></div>
            </section>

            <section className="navigator-controls">
              <article className="panel block-selector-panel"><div><small>KROK 1</small><h3>Wybierz blok magazynu</h3></div><div className="navigator-blocks">{(["M1", "M2", "M3"] as const).map((block) => { const occupied = rackCapacity[block].reduce((sum, [, value]) => sum + value, 0); const capacity = rackCapacity[block].reduce((sum, [, , value]) => sum + value, 0); return <button className={mapBlock === block ? "active" : ""} key={block} onClick={() => { setMapBlock(block); setSelectedRack(1); setSelectedMapSlot({ column: 3, level: 4, slot: 1 }); }} type="button"><span><Warehouse /></span><div><strong>Blok {block}</strong><small>{rackCapacity[block].length} regałów</small></div><em>{Math.round(occupied / capacity * 100)}%</em></button>; })}</div></article>
              <article className="panel rack-selector-panel"><div><small>KROK 2</small><h3>Wybierz regał</h3></div><div className="navigator-racks">{rackCapacity[mapBlock].map(([rack, occupied, capacity]) => { const percent = Math.round(occupied / capacity * 100); return <button className={`${selectedRack === rack ? "active" : ""} ${percent >= 90 ? "critical" : ""}`} key={rack} onClick={() => { setSelectedRack(rack); setSelectedMapSlot({ column: 3, level: 4, slot: 1 }); }} type="button"><span>{String(rack).padStart(2, "0")}</span><i><b style={{ width: `${percent}%` }} /></i><small>{capacity - occupied} wolnych</small></button>; })}</div></article>
            </section>

            <section className="navigator-workspace">
              <article className="panel rack-facade-panel">
                <div className="facade-heading"><div><span><Boxes /></span><div><small>KROK 3 · WIDOK REGAŁU OD FRONTU</small><h3>Regał {mapBlock}-{String(selectedRack).padStart(2, "0")}</h3><p>Każda kolumna na każdym poziomie ma 3 osobne miejsca paletowe.</p></div></div><div className="facade-summary"><span><i className="slot-free" /> wolne</span><span><i className="slot-taken" /> zajęte</span><strong><b>{selectedRackData[2] - selectedRackData[1]}</b> z 216 miejsc wolnych</strong></div></div>
                <div className="rack-facade-scroll"><div className="rack-facade"><div className="facade-corner">POZIOM</div><div className="column-labels">{Array.from({ length: 9 }, (_, column) => <span key={column}>KOLUMNA {String(column).padStart(2, "0")}</span>)}</div>{Array.from({ length: 8 }, (_, rowIndex) => 8 - rowIndex).map((level) => <div className="facade-row" key={level}><strong><small>POZIOM</small>{String(level).padStart(2, "0")}</strong><div>{Array.from({ length: 9 }, (_, column) => <div className="facade-cell" key={column}><span>K{String(column).padStart(2, "0")}</span><div>{[1, 2, 3].map((slot) => { const placeNumber = (level - 1) * 3 + slot; const occupied = ((column * 17 + level * 23 + slot * 29 + selectedRack * 11) % 100) < selectedRackPercent; const selected = selectedMapSlot.column === column && selectedMapSlot.level === level && selectedMapSlot.slot === slot; const locationCode = `${mapBlock}.${String(selectedRack).padStart(2, "0")}.${String(column).padStart(2, "0")}.${String(placeNumber).padStart(2, "0")}`; return <button aria-label={`${locationCode} — ${occupied ? "zajęte" : "wolne"}`} className={`${occupied ? "taken" : "free"} ${selected ? "selected" : ""}`} key={slot} onClick={() => setSelectedMapSlot({ column, level, slot })} title={locationCode} type="button"><i>{occupied ? <PackageOpen /> : <Plus />}</i><span>{String(placeNumber).padStart(2, "0")}</span></button>; })}</div></div>)}</div></div>)}<div className="facade-base"><span /><strong>REGAŁ {mapBlock}-{String(selectedRack).padStart(2, "0")}</strong><span /></div></div></div>
              </article>

              <aside className="panel location-inspector">
                <div className="inspector-heading"><span><MapPin /></span><div><small>WYBRANA LOKALIZACJA</small><h3>{selectedMapLocation}</h3></div></div>
                <div className={`location-status-card ${selectedSlotOccupied ? "taken" : "free"}`}><span>{selectedSlotOccupied ? <PackageOpen /> : <Check />}</span><div><small>STATUS MIEJSCA</small><strong>{selectedSlotOccupied ? "Zajęte" : "Wolne"}</strong><p>{selectedSlotOccupied ? "Na lokalizacji znajduje się paleta." : "Miejsce jest dostępne do odłożenia."}</p></div></div>
                <div className="location-properties"><div><span>Blok</span><strong>{mapBlock}</strong></div><div><span>Regał</span><strong>{String(selectedRack).padStart(2, "0")}</strong></div><div><span>Kolumna</span><strong>{String(selectedMapSlot.column).padStart(2, "0")}</strong></div><div><span>Poziom</span><strong>{String(selectedMapSlot.level).padStart(2, "0")}</strong></div><div><span>Miejsce na poziomie</span><strong>{selectedMapSlot.slot} / 3</strong></div><div><span>Numer miejsca</span><strong>{String(selectedPlaceNumber).padStart(2, "0")}</strong></div></div>
                {selectedSlotOccupied && <div className={`location-content ${rackMaterialClass[selectedRackMaterial]}`}><small>RODZAJ SUROWCA</small><div><span><PackageCheck /></span><div><strong>{selectedRackMaterial}</strong><p>{selectedLocationIds.length} {selectedLocationIds.length === 1 ? "numer identyfikacyjny" : "numery identyfikacyjne"}</p></div></div><ul>{selectedLocationIds.map((licensePlate) => <li key={licensePlate}><span>NI</span><strong>{licensePlate}</strong></li>)}</ul></div>}
                <div className="barcode-preview-note"><small>WARTOŚĆ KODU KRESKOWEGO</small><strong>{selectedMapLocation.replace(/^M/, "")}</strong><p>Litera M nie zostanie zapisana w kodzie.</p></div>
                <button className="primary-button full-button" onClick={() => { setLocation({ block: mapBlock, rack: String(selectedRack).padStart(2, "0"), column: String(selectedMapSlot.column).padStart(2, "0"), place: String(selectedPlaceNumber).padStart(2, "0") }); setBarcodeTab("location"); navigate("barcodes"); }} type="button"><QrCode /> Wygeneruj kod lokalizacji</button>
              </aside>
            </section>
          </div>
        )}

        {activeView === "deliveries" && (
          <div className="view-stack">
            <section className="view-intro"><div><span>REJESTR DOSTAW</span><h2>Dostawy w jednym miejscu</h2><p>Wpis trafia bezpośrednio do rejestru, a rodzaj surowca uzupełnia się z kartoteki dostawcy.</p></div><button className="primary-button" onClick={() => { setEditingDelivery(null); setDeliverySupplier(""); setDeliveryModal(true); }} type="button"><Plus /> Nowa dostawa</button></section>
            <section className="delivery-kpis"><article><span><Truck /></span><div><small>DOSTAWY DZISIAJ</small><strong>{todayDeliveries}</strong></div></article><article><span><PackageOpen /></span><div><small>PALETY DZISIAJ</small><strong>{todayPallets}</strong></div></article><article><span><ClipboardList /></span><div><small>DOSTAWCY DZISIAJ</small><strong>{new Set(deliveries.filter((item) => item.time.startsWith("Dziś")).map((item) => item.supplier)).size}</strong></div></article><article><span><BarChart3 /></span><div><small>PALETY W MIESIĄCU</small><strong>638</strong></div></article></section>
            <article className="panel deliveries-panel">
              <div className="delivery-toolbar"><div><span>DZISIEJSZY REJESTR</span><h3>Dostawy</h3></div><div><label className="search-field"><Search /><input onChange={(event) => setDeliverySearch(event.target.value)} placeholder="Szukaj dostawy..." value={deliverySearch} /></label><button className="secondary-button" onClick={() => setReportOpen(true)} type="button"><FileText /> Raport dnia</button></div></div>
              <div className="delivery-list">{filteredDeliveries.map((delivery) => <article key={delivery.id}><div className="delivery-main"><span className="delivery-icon"><Truck /></span><div><div className="delivery-title"><strong>{delivery.supplier}</strong><span>{delivery.id}</span></div><p>{delivery.pallets} palet · <b>{delivery.material}</b> automatycznie · Magazyn {delivery.warehouse}</p>{delivery.notes && <small>{delivery.notes}</small>}</div></div><time>{delivery.time}</time><div className="row-actions"><button onClick={() => openEdit(delivery)} type="button">Edytuj</button><button aria-label={`Usuń ${delivery.id}`} className="delete-button" onClick={() => deleteDelivery(delivery.id)} type="button"><Trash2 /></button></div></article>)}</div>
            </article>
          </div>
        )}

        {activeView === "suppliers" && (
          <div className="view-stack">
            <section className="view-intro supplier-intro"><div><span>KARTOTEKA DOSTAWCÓW</span><h2>Automaty surowców</h2><p>Jeden wpis wystarczy, aby przy każdej dostawie rodzaj surowca uzupełniał się automatycznie.</p></div><button className="primary-button" onClick={() => openSupplierForm()} type="button"><Plus /> Dodaj dostawcę</button></section>
            <section className="supplier-summary">
              <article><span className="supplier-summary-icon"><BookOpen /></span><div><small>WSZYSTKIE WPISY</small><strong>{supplierCatalog.length}</strong><p>dostawców w kartotece</p></div></article>
              <article><span className="supplier-summary-icon success"><Check /></span><div><small>AKTYWNE AUTOMATY</small><strong>{supplierCatalog.filter((supplier) => supplier.active).length}</strong><p>działa przy nowych dostawach</p></div></article>
              <article><span className="supplier-summary-icon muted"><Power /></span><div><small>WYŁĄCZONE</small><strong>{supplierCatalog.filter((supplier) => !supplier.active).length}</strong><p>zachowane w kartotece</p></div></article>
            </section>
            <article className="panel supplier-master-panel">
              <div className="supplier-toolbar"><div><span>BAZA POWIĄZAŃ</span><h3>Dostawca → rodzaj surowca</h3><p>Edytuj przypisanie albo wyłącz automat bez usuwania dostawcy.</p></div><label className="search-field"><Search /><input onChange={(event) => setSupplierSearch(event.target.value)} placeholder="Szukaj dostawcy lub surowca..." value={supplierSearch} /></label></div>
              <div className="supplier-list">
                {filteredSuppliers.map((supplier) => (
                  <article className={!supplier.active ? "inactive" : ""} key={supplier.id}>
                    <span className="supplier-monogram">{supplier.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <div className="supplier-name"><strong>{supplier.name}</strong><small>ID kartoteki · SUP-{String(supplier.id).padStart(3, "0")}</small></div>
                    <div className="supplier-mapping"><small>AUTOMATYCZNY SUROWIEC</small><span className="material-chip"><i style={{ background: materialColors[supplier.material] }} />{supplier.material}</span></div>
                    <span className={`supplier-state ${supplier.active ? "active" : ""}`}><i />{supplier.active ? "Aktywny" : "Wyłączony"}</span>
                    <div className="supplier-actions"><button onClick={() => openSupplierForm(supplier)} type="button"><Pencil /> Edytuj</button><button aria-label={supplier.active ? `Wyłącz automat ${supplier.name}` : `Włącz automat ${supplier.name}`} className="power-button" onClick={() => toggleSupplier(supplier.id)} type="button"><Power /></button></div>
                  </article>
                ))}
                {filteredSuppliers.length === 0 && <div className="empty-suppliers"><Search /><strong>Brak pasujących wpisów</strong><p>Zmień wyszukiwaną frazę albo dodaj nowego dostawcę.</p></div>}
              </div>
            </article>
          </div>
        )}

        {activeView === "barcodes" && (
          <div className="view-stack">
            <section className="view-intro"><div><span>KODY KRESKOWE</span><h2>Generator dla magazynu</h2><p>Wybierz kody konkretnego ładunku albo wygeneruj kod lokalizacji magazynowej.</p></div><StatusBadge tone="info">Tablet ready</StatusBadge></section>
            <div className="barcode-tabs"><button className={barcodeTab === "load" ? "active" : ""} onClick={() => setBarcodeTab("load")} type="button"><QrCode /> Kody ładunku<small>Planowane połączenie z D365</small></button><button className={barcodeTab === "location" ? "active" : ""} onClick={() => setBarcodeTab("location")} type="button"><MapPin /> Kod lokalizacji<small>Generator z aplikacji tabletowej</small></button></div>
            {barcodeTab === "load" ? (
              <section className="barcode-layout">
                <article className="panel load-search-panel">
                  <span>WYSZUKIWANIE W D365</span><h3>Znajdź strukturę pakowania</h3><p>Wystarczy uzupełnić jedno pole. Gdy nie ma numeru ładunku, wyszukaj po zamówieniu zakupu albo dostawcy.</p>
                  <form className="load-search-form" onSubmit={searchLoad}>
                    <label>Numer ładunku<input autoCapitalize="characters" onChange={(event) => setLoadId(event.target.value)} placeholder="np. LD-000847" value={loadId} /></label>
                    <div className="search-divider"><span>lub</span></div>
                    <label>Zamówienie zakupu<input autoCapitalize="characters" onChange={(event) => setPurchaseOrder(event.target.value)} placeholder="np. PO-004923" value={purchaseOrder} /></label>
                    <div className="search-divider"><span>lub</span></div>
                    <label>Dostawca<input list="load-suppliers" onChange={(event) => setLoadSupplier(event.target.value)} placeholder="Wpisz lub wybierz dostawcę" value={loadSupplier} /><datalist id="load-suppliers">{suppliers.map((supplier) => <option key={supplier} value={supplier} />)}</datalist></label>
                    <button className="primary-button full-button" type="submit"><Search /> Wyszukaj i pobierz kody</button>
                  </form>
                  <div className="connection-note"><span><Settings /></span><div><strong>Tryb demonstracyjny</strong><p>Wyniki są przykładowe. Później ten krok połączymy z usługą D365 on-prem.</p></div></div>
                </article>
                <article className="panel barcode-results print-area">
                  <div className="panel-heading"><div><span>STRUKTURA PAKOWANIA</span><h3>{searchedLoad}</h3></div><button className="secondary-button no-print" onClick={() => window.print()} type="button"><Printer /> Drukuj wszystkie</button></div>
                  <div className="result-summary"><span><PackageCheck /></span><div><strong>{loadCodes.length} kody gotowe</strong><p>Tylko identyfikatory LicensePlateId z tego ładunku</p></div><StatusBadge tone="success"><Check /> Gotowe</StatusBadge></div>
                  <div className="barcode-list">{loadCodes.map((code, index) => <div key={code}><span className="barcode-number">{String(index + 1).padStart(2, "0")}</span><Barcode compact value={code} /><button className="no-print" onClick={() => { navigator.clipboard?.writeText(code); setToast(`Skopiowano ${code}.`); }} type="button">Kopiuj</button></div>)}</div>
                </article>
              </section>
            ) : (
              <section className="location-layout">
                <article className="panel location-picker">
                  <div className="panel-heading"><div><span>WYBIERZ LOKALIZACJĘ</span><h3>{visualLocationCode}</h3></div><MapPin /></div>
                  <div className="picker-step"><label>1. Blok</label><div className="touch-grid three">{["M1", "M2", "M3"].map((value) => <button className={location.block === value ? "active" : ""} key={value} onClick={() => setLocation((current) => ({ ...current, block: value }))} type="button">{value}</button>)}</div></div>
                  <div className="picker-step"><label>2. Regał</label><div className="touch-grid six">{Array.from({ length: location.block === "M2" ? 11 : location.block === "M3" ? 10 : 8 }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => <button className={location.rack === value ? "active" : ""} key={value} onClick={() => setLocation((current) => ({ ...current, rack: value }))} type="button">{value}</button>)}</div></div>
                  <div className="picker-row"><label>3. Kolumna<input max="24" min="0" onChange={(event) => setLocation((current) => ({ ...current, column: String(Number(event.target.value)).padStart(2, "0") }))} type="number" value={Number(location.column)} /></label><label>4. Miejsce<input max="24" min="1" onChange={(event) => setLocation((current) => ({ ...current, place: String(Number(event.target.value)).padStart(2, "0") }))} type="number" value={Number(location.place)} /></label></div>
                </article>
                <article className="panel location-result print-area"><div className="location-path"><span>Blok {location.block}</span><ChevronRight /><span>Regał {location.rack}</span><ChevronRight /><span>Kolumna {location.column}</span><ChevronRight /><span>Miejsce {location.place}</span></div><div className="large-barcode"><span>KOD LOKALIZACJI · WARTOŚĆ BEZ LITERY M</span><Barcode value={locationBarcodeValue} /></div><div className="barcode-value-note"><small>Widok lokalizacji</small><strong>{visualLocationCode}</strong><span>W kodzie zapisano: {locationBarcodeValue}</span></div><button className="primary-button no-print" onClick={() => window.print()} type="button"><Printer /> Drukuj kod lokalizacji</button></article>
              </section>
            )}
          </div>
        )}

        <footer><span>Warehouse Masterpress · centrum operacyjne</span><span>Prototyp funkcjonalny · dane demonstracyjne</span></footer>
      </section>

      <button aria-label="Otwórz asystenta głosowego" className={`voice-assistant-trigger ${voiceListening ? "listening" : ""}`} onClick={() => setVoiceOpen((value) => !value)} type="button"><Mic /><span>Asystent głosowy</span></button>

      {voiceOpen && <aside aria-label="Asystent głosowy magazynu" className="voice-assistant-panel">
        <header><div><span><Mic /></span><div><small>ASYSTENT MAGAZYNU</small><strong>Zapytaj głosowo</strong></div></div><button aria-label="Zamknij asystenta" onClick={() => setVoiceOpen(false)} type="button"><X /></button></header>
        <div className={`voice-orb ${voiceListening ? "listening" : ""}`}><button aria-label={voiceListening ? "Asystent słucha" : "Rozpocznij mówienie"} disabled={voiceListening} onClick={startVoiceListening} type="button"><Mic /></button><div>{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div><strong>{voiceListening ? "SŁUCHAM…" : "DOTKNIJ I MÓW"}</strong></div>
        <div className="voice-result" aria-live="polite"><small>{voiceTranscript ? "USŁYSZAŁEM" : "ODPOWIEDŹ GŁOSOWA"}</small>{voiceTranscript && <span>„{voiceTranscript}”</span>}<p>{voiceAnswer}</p></div>
        <div className="voice-examples"><small>PRZYKŁADOWE PYTANIA</small><button onClick={() => runVoiceCommand("Gdzie jest najwięcej wolnych miejsc?")} type="button">Gdzie jest najwięcej wolnych miejsc?</button><button onClick={() => runVoiceCommand("Jakie numery identyfikacyjne są na tej lokalizacji?")} type="button">Jakie NI są na tej lokalizacji?</button><button onClick={() => runVoiceCommand("Ile palet jest na magazynie?")} type="button">Ile palet jest na magazynie?</button></div>
        <p className="voice-demo-note">Demonstracja korzysta z danych zapisanych w aplikacji.</p>
      </aside>}

      {deliveryModal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDeliveryModal(false); }}>
          <div aria-modal="true" className="modal delivery-modal" role="dialog">
            <div className="modal-heading"><div><span>{editingDelivery ? "EDYCJA ZGŁOSZENIA" : "MOBILNY REJESTR"}</span><h2>{editingDelivery ? `Dostawa ${editingDelivery}` : "Nowa dostawa"}</h2><p>Krótki formularz przygotowany również do obsługi na telefonie.</p></div><button aria-label="Zamknij" onClick={() => setDeliveryModal(false)} type="button"><X /></button></div>
            <form className="form-stack" onSubmit={saveDelivery}>
              <label>Dostawca<input defaultValue={edited?.supplier} list="suppliers" name="supplier" onChange={(event) => setDeliverySupplier(event.target.value)} placeholder="Wpisz lub wybierz dostawcę" required /><datalist id="suppliers">{suppliers.map((supplier) => <option key={supplier} value={supplier} />)}</datalist></label>
              <div className="auto-material"><span><Sparkles /></span><div><small>RODZAJ SUROWCA — AUTOMATYCZNIE</small><strong>{automaticMaterial}</strong><p>{matchedDeliverySupplier ? "Na podstawie kartoteki dostawcy." : "Nowy dostawca: tymczasowo kategoria Inne; można go później przypisać w kartotece."}</p></div></div>
              <div className="form-row"><label>Liczba palet<input defaultValue={edited?.pallets} min="1" name="pallets" placeholder="0" required type="number" /></label><label>Magazyn docelowy<select defaultValue={edited?.warehouse || "A"} name="warehouse"><option value="A">Magazyn A</option><option value="B">Magazyn B</option></select><ChevronDown /></label></div>
              <label>Uwagi<textarea defaultValue={edited?.notes} name="notes" placeholder="Opcjonalne uwagi, numer rampy, godzina..." rows={3} /></label>
              <div className="modal-actions"><button className="secondary-button" onClick={() => setDeliveryModal(false)} type="button">Anuluj</button><button className="primary-button" type="submit"><Check /> {editingDelivery ? "Zapisz zmiany" : "Zarejestruj dostawę"}</button></div>
            </form>
          </div>
        </div>
      )}

      {supplierModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setSupplierModalOpen(false); }}>
          <div aria-modal="true" className="modal supplier-modal" role="dialog">
            <div className="modal-heading"><div><span>KARTOTEKA DOSTAWCÓW</span><h2>{editedSupplier ? "Edytuj automat" : "Nowy dostawca"}</h2><p>Przypisany surowiec będzie uzupełniany automatycznie w formularzu dostawy.</p></div><button aria-label="Zamknij" onClick={() => setSupplierModalOpen(false)} type="button"><X /></button></div>
            <form className="form-stack" onSubmit={saveSupplier}>
              <label>Nazwa dostawcy<input autoFocus defaultValue={editedSupplier?.name} name="name" placeholder="np. Raflatac" required /></label>
              <label>Automatyczny rodzaj surowca<select defaultValue={editedSupplier?.material || "Papier"} name="material">{(Object.keys(materialColors) as MaterialName[]).map((material) => <option key={material}>{material}</option>)}</select><ChevronDown /></label>
              <div className="supplier-modal-note"><Sparkles /><div><strong>Mniej wpisywania przy dostawie</strong><p>Po wybraniu tego dostawcy magazynier nie będzie musiał osobno określać rodzaju surowca.</p></div></div>
              <div className="modal-actions"><button className="secondary-button" onClick={() => setSupplierModalOpen(false)} type="button">Anuluj</button><button className="primary-button" type="submit"><Check /> {editedSupplier ? "Zapisz zmiany" : "Dodaj do kartoteki"}</button></div>
            </form>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setReportOpen(false); }}>
          <div aria-modal="true" className="modal report-modal" role="dialog"><div className="modal-heading"><div><span>RAPORT DZIENNY</span><h2>Rejestr dostaw</h2><p>Podsumowanie gotowe do zapisania lub wysłania.</p></div><button aria-label="Zamknij" onClick={() => setReportOpen(false)} type="button"><X /></button></div><div className="report-sheet"><div><span>Data</span><strong>04.08.2026</strong></div><div><span>Liczba dostaw</span><strong>{todayDeliveries}</strong></div><div><span>Łącznie palet</span><strong>{deliveries.filter((item) => item.time.startsWith("Dziś")).reduce((sum, item) => sum + item.pallets, 0)}</strong></div>{deliveries.filter((item) => item.time.startsWith("Dziś")).map((delivery) => <p key={delivery.id}><b>{delivery.time.replace("Dziś, ", "")}</b><span>{delivery.supplier}</span><strong>{delivery.pallets} palet</strong></p>)}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setReportOpen(false)} type="button">Zamknij</button><button className="primary-button" onClick={() => { setToast("Raport został przygotowany do wysłania."); setReportOpen(false); }} type="button"><FileText /> Przygotuj e-mail</button></div></div>
        </div>
      )}

      {toast && <div aria-live="polite" className="toast" role="status"><span><Check /></span>{toast}</div>}
    </main>
  );
}
