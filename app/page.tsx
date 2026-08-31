"use client";

import JsBarcode from "jsbarcode";
import {
  BarChart3,
  BookOpen,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Droplets,
  FileText,
  Mail,
  LayoutDashboard,
  MapPin,
  Maximize2,
  Menu,
  Mic,
  Minimize2,
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
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CleaningModule } from "./cleaning-module";
import { ScheduleModule, WorkforceSummary } from "./schedule-module";
import {
  detectVikiWake,
  extractFirstVikiNumber,
  extractNumberNear,
  findRackMaterial,
  findSupplier,
  hasIntent,
  isIncompleteVikiCommand,
  isOnlyRecognitionPunctuation,
  normalizeVikiText,
  parseVikiWarehouseReference,
  VikiWarehouseReference,
  voiceIntents,
} from "./viki-dictionary";
import {
  blockStats,
  capacities,
  getAllRackStats,
  getBalconyPlaces,
  getMainRackStats,
  getMainSlotsPerLevel,
  getNewLocationMaxPlace,
  getNewRackColumns,
  getNewRackConfig,
  inventoryDataAvailable,
  isMainSlotOccupied,
  localWarehouseSnapshot,
  mainRackCapacity,
  mainRacks,
  materialColors,
  rackCapacity,
  rackCounts,
  rackMaterials,
  resolveMainLocation,
  resolveNewLocation,
  warehouseNames,
  type MainRack,
  type MapWarehouse,
  type MaterialName,
  type NewBlock,
  type NewRackConfig,
  type RackMaterial,
  type RackStats,
  type WarehouseKey,
} from "./warehouse-model";

type View =
  | "dashboard"
  | "inventory"
  | "map"
  | "deliveries"
  | "schedule"
  | "cleaning"
  | "suppliers"
  | "barcodes";

type SpeechAlternativeLike = { transcript: string; confidence?: number };
type SpeechResultLike = ArrayLike<SpeechAlternativeLike> & { isFinal?: boolean };
type SpeechGrammarListLike = {
  addFromString: (grammar: string, weight?: number) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  grammars?: SpeechGrammarListLike;
  onresult:
    | ((event: { resultIndex?: number; results: ArrayLike<SpeechResultLike> }) => void)
    | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type VikiPhase = "off" | "wake" | "speaking" | "command";

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechGrammarListConstructor = new () => SpeechGrammarListLike;

type Delivery = {
  id: string;
  supplier: string;
  pallets: number;
  material: MaterialName;
  warehouse: WarehouseKey;
  notes: string;
  date: string;
};

type SupplierEntry = {
  id: number;
  name: string;
  material: MaterialName;
  active: boolean;
};

type GeneratorLocation = {
  warehouse: MapWarehouse;
  block: NewBlock;
  rack: string;
  column: number;
  place: number;
};

type PlacementDraft = {
  supplier?: string;
  weightKg?: number;
  pallets?: number;
  material?: RackMaterial;
  warehouse?: MapWarehouse;
  block?: NewBlock;
};

type PlacementRule = {
  warehouse: MapWarehouse;
  block?: NewBlock;
  rack: MainRack | number;
  maxWeightKg: number;
  suppliers: string[];
  materials: RackMaterial[];
};

const logisticsEmail = "logistyka@masterpress.com";
const storageKeys = {
  deliveries: "warehouse-masterpress:deliveries:production:v1",
  suppliers: "warehouse-masterpress:suppliers:production:v1",
} as const;

const initialSupplierCatalog: SupplierEntry[] = [];

const rackMaterialClass: Record<RackMaterial, string> = {
  Papier: "material-paper",
  Folia: "material-foil",
  Karton: "material-cardboard",
  Tuleje: "material-cores",
};

function isoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function relativeIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function monthKey(date = new Date()) {
  return isoDate(date).slice(0, 7);
}

function formatDeliveryDate(value: string) {
  if (value === isoDate()) return "Dziś";
  if (value === relativeIsoDate(-1)) return "Wczoraj";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function isDelivery(value: unknown): value is Delivery {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Delivery>;
  return (
    typeof item.id === "string" &&
    typeof item.supplier === "string" &&
    typeof item.pallets === "number" &&
    item.pallets > 0 &&
    typeof item.material === "string" &&
    Object.hasOwn(materialColors, item.material) &&
    (item.warehouse === "A" || item.warehouse === "B") &&
    typeof item.notes === "string" &&
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date)
  );
}

function isSupplierEntry(value: unknown): value is SupplierEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SupplierEntry>;
  return (
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.material === "string" &&
    Object.hasOwn(materialColors, item.material) &&
    typeof item.active === "boolean"
  );
}

function migrateDeliveries(value: unknown): Delivery[] | null {
  if (!Array.isArray(value)) return null;
  const migrated = value.map((entry) => {
    if (isDelivery(entry)) return entry;
    if (!entry || typeof entry !== "object") return entry;
    const legacy = entry as Record<string, unknown>;
    const legacyTime = String(legacy.time || "");
    const material = String(legacy.material || "Inne");
    return {
      ...legacy,
      material: Object.hasOwn(materialColors, material) ? material : "Inne",
      date: legacyTime.startsWith("Wczoraj")
        ? relativeIsoDate(-1)
        : isoDate(),
    };
  });
  return migrated.every(isDelivery) ? migrated : null;
}

function migrateSuppliers(value: unknown): SupplierEntry[] | null {
  if (!Array.isArray(value)) return null;
  const migrated = value.map((entry) => {
    if (isSupplierEntry(entry)) return entry;
    if (!entry || typeof entry !== "object") return entry;
    const legacy = entry as Record<string, unknown>;
    return {
      ...legacy,
      material: Object.hasOwn(materialColors, String(legacy.material || ""))
        ? legacy.material
        : "Inne",
    };
  });
  return migrated.every(isSupplierEntry) ? migrated : null;
}

function nextDeliveryId(deliveries: Delivery[]) {
  const highest = deliveries.reduce((current, delivery) => {
    const parsed = Number(delivery.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(current, parsed) : current;
  }, 0);
  return `D-${String(Math.max(1, highest + 1)).padStart(4, "0")}`;
}

function normalizeGeneratorLocation(
  candidate: GeneratorLocation,
): GeneratorLocation {
  if (candidate.warehouse === "main") {
    const rack = mainRacks.includes(candidate.rack as MainRack)
      ? (candidate.rack as MainRack)
      : "A";
    const column = Math.min(15, Math.max(1, Math.round(candidate.column || 1)));
    const maxPlace = getMainSlotsPerLevel(rack, column) * 5;
    return {
      ...candidate,
      rack,
      column,
      place: Math.min(maxPlace, Math.max(1, Math.round(candidate.place || 1))),
    };
  }

  const rack = Math.min(
    rackCounts[candidate.block],
    Math.max(1, Number(candidate.rack) || 1),
  );
  const columns = getNewRackColumns(candidate.block, rack);
  const column = columns.includes(candidate.column)
    ? candidate.column
    : (columns[0] ?? 1);
  const maxPlace = getNewLocationMaxPlace(candidate.block, rack, column);
  return {
    ...candidate,
    rack: String(rack).padStart(2, "0"),
    column,
    place: Math.min(maxPlace, Math.max(1, Math.round(candidate.place || 1))),
  };
}

const initialDeliveries: Delivery[] = [];

// Reguły zostaną uzupełnione po uzgodnieniu limitów i przypisań z magazynem.
const placementRules: PlacementRule[] = [];

const normalizeSpeech = normalizeVikiText;

function freePlacesForRule(rule: PlacementRule) {
  if (rule.warehouse === "main") {
    return getMainRackStats(rule.rack as MainRack).free;
  }
  const row = rackCapacity[rule.block as NewBlock].find(
    ([rack]) => rack === rule.rack,
  );
  return row ? row[2] - row[1] : 0;
}

function ruleLabel(rule: PlacementRule) {
  return rule.warehouse === "main"
    ? `regał ${rule.rack} w Magazynie głównym`
    : `regał ${rule.block}-${String(rule.rack).padStart(2, "0")} w Nowym magazynie`;
}

function rackStatsLabel(stats: RackStats) {
  return stats.warehouse === "main"
    ? `regał ${stats.rack} w Magazynie głównym`
    : `regał ${stats.block}-${String(stats.rack).padStart(2, "0")} w Nowym magazynie`;
}

const navItems: {
  id: View;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "dashboard",
    label: "Start",
    description: "Najważniejsze operacje",
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    label: "Raport zapasów",
    description: "Stany i wykorzystanie",
    icon: BarChart3,
  },
  {
    id: "map",
    label: "Mapa magazynu",
    description: "Lokalizacje paletowe",
    icon: MapPin,
  },
  {
    id: "deliveries",
    label: "Dostawy",
    description: "Rejestr i raporty",
    icon: Truck,
  },
  {
    id: "schedule",
    label: "Grafik",
    description: "Zmiany, pracownicy i urlopy",
    icon: CalendarDays,
  },
  {
    id: "cleaning",
    label: "Karta mycia",
    description: "Dokumenty i odpowiedzialność",
    icon: Droplets,
  },
  {
    id: "barcodes",
    label: "Kody kreskowe",
    description: "Ładunki i lokalizacje",
    icon: QrCode,
  },
];

function Barcode({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
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

  return (
    <svg
      aria-label={`Kod kreskowy ${value}`}
      className="barcode-svg"
      ref={ref}
    />
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "pending" | "info";
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const warehouses = localWarehouseSnapshot;
  const [materials] = useState<Record<MaterialName, number>>({
    Papier: 0,
    Folia: 0,
    Karton: 0,
    Tuleje: 0,
    Inne: 0,
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [storageReady, setStorageReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryMonth, setDeliveryMonth] = useState(monthKey());
  const [reportOpen, setReportOpen] = useState(false);
  const [stockReportOpen, setStockReportOpen] = useState(false);
  const [barcodeTab, setBarcodeTab] = useState<"load" | "location">("load");
  const [loadId, setLoadId] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [loadSupplier, setLoadSupplier] = useState("");
  const [searchedLoad, setSearchedLoad] = useState("Brak wyszukiwania");
  const [loadCodes, setLoadCodes] = useState<string[]>([]);
  const [loadNotFound, setLoadNotFound] = useState(false);
  const [location, setLocation] = useState<GeneratorLocation>({
    warehouse: "main",
    block: "M1",
    rack: "A",
    column: 1,
    place: 1,
  });
  const [mapBlock, setMapBlock] = useState<keyof typeof rackCapacity>("M1");
  const [mapWarehouse, setMapWarehouse] = useState<MapWarehouse>("main");
  const [selectedRack, setSelectedRack] = useState(1);
  const [selectedMainRack, setSelectedMainRack] = useState<MainRack>("A");
  const [selectedMapSlot, setSelectedMapSlot] = useState({
    column: 1,
    level: 0,
    slot: 1,
  });
  const [rackViewMode, setRackViewMode] = useState<"overview" | "readable">(
    "readable",
  );
  const [supplierCatalog, setSupplierCatalog] = useState<SupplierEntry[]>(
    initialSupplierCatalog,
  );
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(
    null,
  );
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [wakeMode, setWakeMode] = useState(false);
  const [vikiAwake, setVikiAwake] = useState(false);
  const placementDraftRef = useRef<PlacementDraft>({});
  const activeWarehouseRef = useRef<MapWarehouse | null>(null);
  const [mapBarcodeOpen, setMapBarcodeOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionGenerationRef = useRef(0);
  const vikiPhaseRef = useRef<VikiPhase>("off");
  const wakeModeRef = useRef(false);
  const vikiAwakeRef = useRef(false);
  const voiceSpeakingRef = useRef(false);
  const speechTokenRef = useRef(0);
  const wakeArmTimerRef = useRef<number | null>(null);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const commandSilenceTimerRef = useRef<number | null>(null);
  const commandPartsRef = useRef<string[]>([]);
  const commandInterimRef = useRef("");
  const queuedCommandRef = useRef("");
  const followUpTimeoutRef = useRef(12000);
  const listenAfterSpeechRef = useRef(false);
  const vikiContextRef = useRef<
    Partial<VikiWarehouseReference> & {
      material?: RackMaterial;
      supplier?: string;
      topic?: "warehouse" | "block" | "rack" | "placement" | "material" | "supplier";
    }
  >({ warehouse: "main", rack: "A", topic: "rack" });

  const totalPallets = warehouses.A + warehouses.B;
  const monthlyDeliveries = useMemo(
    () =>
      deliveries.filter((delivery) => delivery.date.startsWith(deliveryMonth)),
    [deliveries, deliveryMonth],
  );
  const todayDeliveries = deliveries.filter(
    (delivery) => delivery.date === isoDate(),
  ).length;
  const todayPallets = deliveries
    .filter((delivery) => delivery.date === isoDate())
    .reduce((sum, delivery) => sum + delivery.pallets, 0);
  const suppliers = Array.from(new Set([
    ...supplierCatalog
      .filter((supplier) => supplier.active)
      .map((supplier) => supplier.name),
    ...deliveries.map((delivery) => delivery.supplier),
  ])).sort((a, b) => a.localeCompare(b, "pl"));
  const filteredSuppliers = supplierCatalog.filter((supplier) =>
    [supplier.name, supplier.material]
      .join(" ")
      .toLocaleLowerCase("pl")
      .includes(supplierSearch.trim().toLocaleLowerCase("pl")),
  );
  const selectedRackData =
    rackCapacity[mapBlock].find(([rack]) => rack === selectedRack) ||
    rackCapacity[mapBlock][0];
  const selectedNewRackConfig = getNewRackConfig(mapBlock, selectedRack);
  const selectedNewColumn = selectedNewRackConfig.columns.find(
    (item) => item.column === selectedMapSlot.column,
  );
  const selectedNewBalcony = selectedNewRackConfig.balconies.find(
    (item) => item.column === selectedMapSlot.column,
  );
  const mainSlotsOnLevel = getMainSlotsPerLevel(
    selectedMainRack,
    selectedMapSlot.column,
  );
  const selectedPlaceNumber =
    mapWarehouse === "main"
      ? selectedMapSlot.level * mainSlotsOnLevel + selectedMapSlot.slot
      : selectedNewBalcony
        ? selectedMapSlot.slot
        : selectedMapSlot.level * (selectedNewColumn?.slots || 3) +
          selectedMapSlot.slot;
  const selectedSlotOccupied = inventoryDataAvailable &&
    (mapWarehouse === "main"
      ? isMainSlotOccupied(
          selectedMainRack,
          selectedMapSlot.column,
          selectedMapSlot.level,
          selectedMapSlot.slot,
        )
      : false);
  const selectedSlotState = inventoryDataAvailable
    ? selectedSlotOccupied
      ? "taken"
      : "free"
    : "unknown";
  const selectedRackMaterial: RackMaterial | null = null;
  const selectedLocationIds: string[] = [];
  const selectedMapLocation =
    mapWarehouse === "main"
      ? `${selectedMainRack}.${String(selectedMapSlot.column).padStart(2, "0")}.${String(selectedPlaceNumber).padStart(2, "0")}`
      : `${mapBlock}.${String(selectedRack).padStart(2, "0")}.${String(selectedMapSlot.column).padStart(2, "0")}.${String(selectedPlaceNumber).padStart(2, "0")}`;
  const selectedStructuralCapacity =
    mapWarehouse === "main"
      ? mainRackCapacity[selectedMainRack]
      : selectedRackData[2];
  const facadeColumns =
    mapWarehouse === "main"
      ? Array.from({ length: 15 }, (_, index) => index + 1)
      : [
          ...selectedNewRackConfig.columns.map((item) => item.column),
          ...selectedNewRackConfig.balconies.map((item) => item.column),
        ].sort((a, b) => a - b);
  const facadeLevels =
    mapWarehouse === "main"
      ? [4, 3, 2, 1, 0]
      : Array.from(
          { length: selectedNewRackConfig.levels },
          (_, index) => selectedNewRackConfig.levels - index - 1,
        );
  const generatorRackNumber = Math.max(1, Number(location.rack) || 1);
  const generatorColumns =
    location.warehouse === "main"
      ? Array.from({ length: 15 }, (_, index) => index + 1)
      : getNewRackColumns(location.block, generatorRackNumber);
  const generatorMaxPlace =
    location.warehouse === "main"
      ? getMainSlotsPerLevel(location.rack as MainRack, location.column) * 5
      : getNewLocationMaxPlace(
          location.block,
          generatorRackNumber,
          location.column,
        );

  const donut = useMemo(() => {
    if (!inventoryDataAvailable || totalPallets === 0) return "#e5ebf0";
    let cursor = 0;
    return `conic-gradient(${Object.entries(materials)
      .map(([material, value]) => {
        const start = cursor;
        cursor += (value / totalPallets) * 100;
        return `${materialColors[material as MaterialName]} ${start}% ${cursor}%`;
      })
      .join(",")})`;
  }, [materials, totalPallets]);

  const filteredDeliveries = monthlyDeliveries.filter((delivery) =>
    [
      delivery.id,
      delivery.supplier,
    ]
      .join(" ")
      .toLocaleLowerCase("pl")
      .includes(deliverySearch.toLocaleLowerCase("pl").trim()),
  );
  const deliverySupplierStats = useMemo(
    () =>
      Object.entries(
        monthlyDeliveries.reduce<Record<string, number>>((result, delivery) => {
          result[delivery.supplier] = (result[delivery.supplier] || 0) + 1;
          return result;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [monthlyDeliveries],
  );
  const deliverySupplierDetails = useMemo(
    () =>
      Object.values(
        monthlyDeliveries.reduce<
          Record<
            string,
            { supplier: string; deliveries: number; pallets: number }
          >
        >((result, delivery) => {
          const current = result[delivery.supplier] || {
            supplier: delivery.supplier,
            deliveries: 0,
            pallets: 0,
          };
          current.deliveries += 1;
          current.pallets += delivery.pallets;
          result[delivery.supplier] = current;
          return result;
        }, {}),
      ).sort((a, b) => b.deliveries - a.deliveries),
    [monthlyDeliveries],
  );
  const reportGeneratedAt = new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const reportMonth = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${deliveryMonth}-01T12:00:00`));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedDeliveries = migrateDeliveries(JSON.parse(
          window.localStorage.getItem(storageKeys.deliveries) || "null",
        ));
        if (storedDeliveries) {
          setDeliveries(storedDeliveries);
        }
        const storedSuppliers = migrateSuppliers(JSON.parse(
          window.localStorage.getItem(storageKeys.suppliers) || "null",
        ));
        if (storedSuppliers) {
          setSupplierCatalog(storedSuppliers);
        }
      } catch {
        // Nieprawidłowy lokalny zapis nie może zablokować uruchomienia aplikacji.
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(storageKeys.deliveries, JSON.stringify(deliveries));
  }, [deliveries, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(
      storageKeys.suppliers,
      JSON.stringify(supplierCatalog),
    );
  }, [storageReady, supplierCatalog]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    wakeModeRef.current = wakeMode;
  }, [wakeMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("viki-active-warehouse");
      if (saved === "main" || saved === "new") {
        activeWarehouseRef.current = saved;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    vikiAwakeRef.current = vikiAwake;
  }, [vikiAwake]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const polish = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLocaleLowerCase().startsWith("pl"));
      setSelectedVoiceName((current) => {
        if (current && polish.some((voice) => voice.name === current)) return current;
        return (
          polish.find((voice) => /microsoft zofia online.*natural/i.test(voice.name)) ||
          polish.find((voice) => /zofia|zosia/i.test(voice.name)) ||
          polish[0]
        )?.name || "";
      });
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(
    () => () => {
      wakeModeRef.current = false;
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
      if (wakeArmTimerRef.current) window.clearTimeout(wakeArmTimerRef.current);
      if (recognitionRestartTimerRef.current) window.clearTimeout(recognitionRestartTimerRef.current);
      if (commandSilenceTimerRef.current) window.clearTimeout(commandSilenceTimerRef.current);
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function navigate(view: View) {
    setActiveView(view);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMainLocation(
    rack: MainRack,
    column: number,
    place: number,
  ) {
    const resolved = resolveMainLocation(rack, column, place);
    if (!resolved) return false;
    setMapWarehouse("main");
    setSelectedMainRack(rack);
    setSelectedMapSlot({
      column: resolved.column,
      level: resolved.level,
      slot: resolved.slot,
    });
    setRackViewMode("readable");
    navigate("map");
    return true;
  }

  function openNewLocation(
    block: NewBlock,
    rack: number,
    column: number,
    place: number,
  ) {
    const resolved = resolveNewLocation(block, rack, column, place);
    if (!resolved) return false;
    setMapWarehouse("new");
    setMapBlock(block);
    setSelectedRack(rack);
    setSelectedMapSlot({
      column: resolved.column,
      level: resolved.level,
      slot: resolved.slot,
    });
    setRackViewMode("readable");
    navigate("map");
    return true;
  }

  function runGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = globalSearch.trim();
    const normalized = query.toLocaleUpperCase("pl").replace(/\s+/g, "");
    if (!normalized) {
      setToast("Wpisz lokalizację, NI, dostawę, ładunek lub dostawcę.");
      return;
    }

    const mainLocation = normalized.match(/^([A-G])\.(\d{1,2})\.(\d{1,2})$/);
    if (
      mainLocation &&
      openMainLocation(
        mainLocation[1] as MainRack,
        Number(mainLocation[2]),
        Number(mainLocation[3]),
      )
    ) {
      return;
    }

    const mainIdentifier = normalized.match(
      /^NI-([A-G])(\d{2})-(\d{2})-\d+$/,
    );
    if (
      mainIdentifier &&
      openMainLocation(
        mainIdentifier[1] as MainRack,
        Number(mainIdentifier[2]),
        Number(mainIdentifier[3]),
      )
    ) {
      return;
    }

    const newLocation = normalized.match(
      /^M?([123])\.(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/,
    );
    if (
      newLocation &&
      openNewLocation(
        `M${newLocation[1]}` as NewBlock,
        Number(newLocation[2]),
        Number(newLocation[3]),
        Number(newLocation[4]),
      )
    ) {
      return;
    }

    const newRack = normalized.match(/^M([123])\.(\d{1,2})$/);
    if (newRack) {
      const block = `M${newRack[1]}` as NewBlock;
      const rack = Number(newRack[2]);
      if (rack >= 1 && rack <= rackCounts[block]) {
        setMapWarehouse("new");
        setMapBlock(block);
        setSelectedRack(rack);
        setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
        navigate("map");
        return;
      }
    }

    if (/^[A-G]$/.test(normalized)) {
      setMapWarehouse("main");
      setSelectedMainRack(normalized as MainRack);
      setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
      navigate("map");
      return;
    }

    if (/^D-?\d+$/.test(normalized)) {
      setDeliverySearch(normalized.replace(/^D(?!-)/, "D-"));
      navigate("deliveries");
      return;
    }

    if (/^LD[-\w]+$/.test(normalized)) {
      setLoadId(normalized);
      setPurchaseOrder("");
      setLoadSupplier("");
      setBarcodeTab("load");
      navigate("barcodes");
      setToast("Numer ładunku jest gotowy do wyszukania.");
      return;
    }

    if (/^PO[-\w]+$/.test(normalized)) {
      setPurchaseOrder(normalized);
      setLoadId("");
      setLoadSupplier("");
      setBarcodeTab("load");
      navigate("barcodes");
      setToast("Numer zamówienia jest gotowy do wyszukania.");
      return;
    }

    const supplier = supplierCatalog.find((item) =>
      item.name.toLocaleLowerCase("pl").includes(query.toLocaleLowerCase("pl")),
    );
    if (supplier) {
      setDeliverySearch(supplier.name);
      navigate("deliveries");
      return;
    }

    setToast(
      "Nie znaleziono wyniku. Sprawdź format lokalizacji albo wpisz pełny numer.",
    );
  }

  function disposeRecognition() {
    recognitionGenerationRef.current += 1;
    const current = recognitionRef.current;
    recognitionRef.current = null;
    if (!current) return;
    try {
      if (current.abort) current.abort();
      else current.stop();
    } catch {
      // Sesja mogła już zostać zakończona przez silnik przeglądarki.
    }
  }

  function clearListeningTimers() {
    if (wakeArmTimerRef.current) window.clearTimeout(wakeArmTimerRef.current);
    if (recognitionRestartTimerRef.current) window.clearTimeout(recognitionRestartTimerRef.current);
    if (commandSilenceTimerRef.current) window.clearTimeout(commandSilenceTimerRef.current);
    wakeArmTimerRef.current = null;
    recognitionRestartTimerRef.current = null;
    commandSilenceTimerRef.current = null;
  }

  function speakAnswer(text: string, spokenText = text) {
    disposeRecognition();
    vikiPhaseRef.current = "speaking";
    if (!("speechSynthesis" in window)) {
      if (wakeModeRef.current) {
        if (listenAfterSpeechRef.current) startCommandRecognition(followUpTimeoutRef.current);
        else startWakeRecognition();
      }
      return;
    }
    const token = speechTokenRef.current + 1;
    speechTokenRef.current = token;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "pl-PL";
    utterance.rate = 1.06;
    utterance.pitch = 1.06;
    const voices = window.speechSynthesis.getVoices();
    const polishVoices = voices.filter((voice) => voice.lang.startsWith("pl"));
    utterance.voice =
      polishVoices.find((voice) => voice.name === selectedVoiceName) ||
      polishVoices.find((voice) => /microsoft zofia online.*natural/i.test(voice.name)) ||
      polishVoices.find((voice) => /zofia|zosia/i.test(voice.name)) ||
      polishVoices[0] || null;
    voiceSpeakingRef.current = true;
    utterance.onstart = () => setVoiceSpeaking(true);
    utterance.onend = () => {
      if (speechTokenRef.current !== token) return;
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
      resumeVikiAfterSpeech();
    };
    utterance.onerror = () => {
      if (speechTokenRef.current !== token) return;
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
      resumeVikiAfterSpeech();
    };
    window.speechSynthesis.speak(utterance);
  }

  function resumeVikiAfterSpeech() {
    if (!wakeModeRef.current) return;
    const continueConversation = listenAfterSpeechRef.current;
    listenAfterSpeechRef.current = false;
    recognitionRestartTimerRef.current = window.setTimeout(() => {
      if (!wakeModeRef.current || voiceSpeakingRef.current) return;
      if (continueConversation && queuedCommandRef.current) {
        const queued = queuedCommandRef.current;
        queuedCommandRef.current = "";
        setVikiAwake(false);
        vikiAwakeRef.current = false;
        runVoiceCommand(queued);
      } else if (continueConversation) startCommandRecognition(followUpTimeoutRef.current);
      else startWakeRecognition();
    }, continueConversation ? 450 : 850);
  }

  function parsePlacement(command: string): PlacementDraft {
    const normalized = normalizeSpeech(command);
    const supplier = findSupplier(normalized, supplierCatalog.map((item) => item.name));
    const weightKg = extractNumberNear(normalized, /kg|kilo|kilogram|kilogramy|kilogramow/);
    const pallets = extractNumberNear(normalized, /paleta|palety|palet|paletach/);
    const material = findRackMaterial(normalized) as RackMaterial | undefined;
    const warehouseReference = parseVikiWarehouseReference(normalized);
    const directMain =
      /\b(?:na|do|w)\s+glown\w*\b/.test(normalized) ||
      /^(?:magazyn )?glown\w*$/.test(normalized) ||
      /\bmagazyn a\b/.test(normalized);
    const directNew =
      /\b(?:na|do|w)\s+now\w*\b/.test(normalized) ||
      /^(?:magazyn )?now\w*$/.test(normalized) ||
      /\bmagazyn b\b/.test(normalized);
    const warehouse = warehouseReference.explicitWarehouse
      ? warehouseReference.warehouse
      : directMain
        ? "main"
        : directNew
          ? "new"
          : undefined;
    return {
      ...(supplier ? { supplier } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...(pallets ? { pallets } : {}),
      ...(material ? { material } : {}),
      ...(warehouse ? { warehouse } : {}),
      ...(warehouseReference.block ? { block: warehouseReference.block } : {}),
    };
  }

  function warehouseVoiceLabel(warehouse: MapWarehouse) {
    return warehouse === "main" ? "Magazyn główny" : "Nowy magazyn";
  }

  function persistActiveVoiceWarehouse(warehouse: MapWarehouse | null) {
    activeWarehouseRef.current = warehouse;
    if (warehouse) window.localStorage.setItem("viki-active-warehouse", warehouse);
    else window.localStorage.removeItem("viki-active-warehouse");
  }

  function mergePlacementDraft(update: PlacementDraft) {
    const current = placementDraftRef.current;
    const merged: PlacementDraft = {
      ...current,
      ...update,
      warehouse: update.warehouse ?? current.warehouse ?? activeWarehouseRef.current ?? undefined,
    };
    if (merged.warehouse === "main") delete merged.block;
    if (merged.supplier && !merged.material) {
      const supplierMaterial = supplierCatalog.find(
        (supplier) => supplier.name === merged.supplier,
      )?.material;
      if (supplierMaterial && rackMaterials.includes(supplierMaterial as RackMaterial)) {
        merged.material = supplierMaterial as RackMaterial;
      }
    }
    placementDraftRef.current = merged;
    return merged;
  }

  function continuePlacementDialogue(update: PlacementDraft = {}) {
    const draft = mergePlacementDraft(update);
    const ask = (question: string) => {
      armVikiForNextAnswer(15000);
      speakAnswer(question);
    };

    if (!draft.pallets && !draft.warehouse) {
      ask("Ile palet przyjechało i do którego magazynu: głównego czy nowego?");
      return;
    }
    if (!draft.pallets) {
      ask("Ile palet przyjechało?");
      return;
    }
    if (!draft.warehouse) {
      ask("Do którego magazynu: głównego czy nowego?");
      return;
    }
    if (!draft.supplier && !draft.material && !draft.weightKg) {
      ask("Jaki to dostawca lub surowiec i ile waży jedna paleta?");
      return;
    }
    if (!draft.supplier && !draft.material) {
      ask("Jaki to dostawca lub surowiec?");
      return;
    }
    if (!draft.weightKg) {
      ask("Ile waży jedna paleta?");
      return;
    }
    recommendPlacement(draft);
  }

  function findRackStats(reference: Partial<VikiWarehouseReference>) {
    if (reference.warehouse === "main" && typeof reference.rack === "string") {
      return getAllRackStats().find(
        (item) => item.warehouse === "main" && item.rack === reference.rack,
      );
    }
    if (
      reference.warehouse === "new" &&
      reference.block &&
      typeof reference.rack === "number"
    ) {
      return getAllRackStats().find(
        (item) =>
          item.warehouse === "new" &&
          item.block === reference.block &&
          item.rack === reference.rack,
      );
    }
    return undefined;
  }

  function rememberRack(stats: RackStats) {
    vikiContextRef.current = {
      ...vikiContextRef.current,
      warehouse: stats.warehouse,
      block: stats.block,
      rack: stats.rack,
      topic: "rack",
    };
  }

  function showRackOnMap(stats: RackStats) {
    rememberRack(stats);
    if (stats.warehouse === "main") {
      setMapWarehouse("main");
      setSelectedMainRack(stats.rack as MainRack);
      setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
    } else {
      setMapWarehouse("new");
      setMapBlock(stats.block as NewBlock);
      setSelectedRack(stats.rack as number);
      setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
    }
    navigate("map");
  }

  function rackBalconyDescription(config: NewRackConfig) {
    if (!config.balconies.length) return "Nie ma balkonu.";
    return config.balconies
      .map((balcony) => {
        const lastLevel = balcony.startLevel + balcony.levelCount - 1;
        const kind = balcony.slots === 1 ? "pojedynczy" : balcony.slots === 3 ? "potrójny" : `${balcony.slots}-miejscowy`;
        return `balkon ${String(balcony.column).padStart(2, "0")} jest ${kind} i obejmuje poziomy od ${balcony.startLevel} do ${lastLevel}`;
      })
      .join(", a ");
  }

  function fullRackDescription(stats: RackStats) {
    const percent = Math.round((stats.occupied / stats.capacity) * 100);
    const occupancy = inventoryDataAvailable
      ? `Obecnie zajętych jest ${stats.occupied}, wolnych ${stats.free}, czyli zajętość wynosi ${percent} procent.`
      : "Dane o zajętości pojawią się po podłączeniu bazy magazynowej.";
    if (stats.warehouse === "main") {
      const rack = stats.rack as MainRack;
      const places = rack === "A"
        ? "Każda sekcja ma po cztery miejsca paletowe."
        : "Kolumny 5 i 12 mają po trzy miejsca paletowe, a pozostałe po cztery.";
      return `Sprawdziłam ${rackStatsLabel(stats)}. Ma ${stats.capacity} miejsc, 15 kolumn i 5 poziomów, liczonych od zera do czterech. ${places} ${occupancy}`;
    }
    const config = getNewRackConfig(stats.block as NewBlock, stats.rack as number);
    const columnSlots = config.columns.every((column) => column.slots === config.columns[0].slots)
      ? `każda ma po ${config.columns[0].slots} miejsca paletowe`
      : `kolumna 1 ma ${config.columns[0].slots} miejsca paletowe, a pozostałe po ${Math.max(...config.columns.map((column) => column.slots))}`;
    return `Sprawdziłam ${rackStatsLabel(stats)}. Ma ${stats.capacity} miejsc, ${config.columns.length} zwykłych kolumn i ${config.levels} poziomów, liczonych od zera do ${config.levels - 1}. W zwykłych kolumnach ${columnSlots}. ${rackBalconyDescription(config)} ${occupancy}`;
  }

  function blockDescription(block: NewBlock) {
    const stats = blockStats(block);
    const percent = Math.round((stats.occupied / stats.capacity) * 100);
    const occupancy = inventoryDataAvailable
      ? `Zajętych jest ${stats.occupied}, wolnych ${stats.free}, czyli zajętość wynosi ${percent} procent.`
      : "Dane o zajętości pojawią się po podłączeniu bazy magazynowej.";
    const structure = block === "M1"
      ? "Regały mają zwykle 7 poziomów i kolumny od 1 do 5 po cztery miejsca. Regał 1 nie ma balkonów, a pozostałe mają balkony 00 i 06."
      : block === "M2"
        ? "Jest tu 11 regałów, zwykle po 8 poziomów. Regały 1–10 mają balkony 00 i 08, a regał 11 ma potrójny balkon 00."
        : "Regały 2–9 mają po 8 poziomów i balkony 00 oraz 08. Regał 1 ma 7 poziomów, a regał 10 ma 6 poziomów; oba mają potrójny balkon 00.";
    return `Blok ${block} ma ${stats.racks} regałów i ${stats.capacity} miejsc. ${occupancy} ${structure}`;
  }

  function handleWarehouseKnowledge(command: string, parsedPlacement: PlacementDraft) {
    const normalized = normalizeSpeech(command);
    const previousContext = vikiContextRef.current;
    let reference = parseVikiWarehouseReference(normalized, previousContext);
    const shortFollowUp =
      previousContext.topic === "rack" &&
      !parsedPlacement.supplier &&
      !parsedPlacement.material &&
      (/\b(tam|nim|jego|go|ten|regal|ma|posiada)\b/.test(normalized) ||
        /^(a )?(ile|czy|jaka|jakie|jaki).*(woln|zajet|miejsc|poziom|kolumn|balkon|pojemn)/.test(normalized));
    if (!reference.rack && shortFollowUp) {
      reference = {
        ...reference,
        warehouse: previousContext.warehouse,
        block: previousContext.block,
        rack: previousContext.rack,
      };
    }

    const asksFree = /woln|pust|ile miejsca zostalo|dostepn/.test(normalized);
    const asksOccupied = /zajet|wykorzyst|zapeln|pelny/.test(normalized);
    const asksCapacity = /pojemn|wszystkich miejsc|ile miejsc|ile.*pomiesci/.test(normalized);
    const asksLevels = /poziom|pieter|pietr/.test(normalized);
    const asksColumns = /kolumn/.test(normalized);
    const asksBalconies = /balkon/.test(normalized);
    const asksRacks = /ile.*regal|liczba regal|jakie regal/.test(normalized);
    const asksShow = /pokaz|otworz|przejdz|znajdz|wyswietl|gdzie jest/.test(normalized);
    const asksRule = /dostawc|surow|material|kg|kilogram|waga|udzwig|co mozna|czy.*przyjm/.test(normalized);
    const asksGeneralInfo = /opowiedz|opisz|co wiesz|informac|jak wyglada|jak zbudowan|co z |jak sytuacja|sprawdz regal/.test(normalized);
    const asksComparison = /porown|ktory magazyn|roznic.*magazyn|wieksz.*magazyn|wiecej miejsc.*magazyn/.test(normalized);
    const asksRanking =
      /najwiecej woln|najmniej woln|najbardziej pust|najbardziej peln|najbardziej zajet|najwiecej miejsca/.test(normalized);
    if (
      asksRanking &&
      !reference.explicitWarehouse &&
      !reference.explicitBlock &&
      !/\b(tam|tutaj|tym magazynie|tym bloku)\b/.test(normalized)
    ) {
      reference = {
        ...reference,
        warehouse: undefined,
        block: undefined,
        rack: undefined,
      };
    }
    const structuralQuestion =
      asksFree || asksOccupied || asksCapacity || asksLevels || asksColumns ||
      asksBalconies || asksRacks || asksShow || asksRule || asksGeneralInfo;
    const knowledgeIntent =
      hasIntent(normalized, voiceIntents.warehouseKnowledge) ||
      hasIntent(normalized, voiceIntents.rackKnowledge) ||
      asksComparison || asksRanking ||
      (reference.explicitRack && normalized.split(" ").length <= 5) ||
      (reference.explicitWarehouse && normalized.split(" ").length <= 4) ||
      (structuralQuestion && Boolean(reference.explicitRack || reference.explicitBlock || reference.explicitWarehouse || shortFollowUp));

    if (!knowledgeIntent) return false;

    if (asksComparison) {
      if (!inventoryDataAvailable) {
        vikiContextRef.current = { warehouse: "new", topic: "warehouse" };
        speakAnswer(
          `Magazyn główny ma ${capacities.A} miejsc, a Nowy magazyn ${capacities.B}. Nowy magazyn jest większy o ${capacities.B - capacities.A} miejsc. Nie mam jeszcze danych o zajętości.`,
          `Nowy magazyn jest większy. Dane o zajętości nie są jeszcze podłączone.`,
        );
        return true;
      }
      const freeMain = capacities.A - warehouses.A;
      const freeNew = capacities.B - warehouses.B;
      vikiContextRef.current = { warehouse: "new", topic: "warehouse" };
      speakAnswer(
        `Magazyn główny ma ${capacities.A} miejsc, z czego ${freeMain} jest wolnych. Nowy magazyn ma ${capacities.B} miejsc, z czego ${freeNew} jest wolnych. Nowy magazyn jest większy o ${capacities.B - capacities.A} miejsc i ma obecnie o ${freeNew - freeMain} więcej wolnych lokalizacji.`,
        `Nowy magazyn jest większy. Ma ${freeNew} wolnych miejsc, a główny ${freeMain}. Szczegóły pokazuję na ekranie.`,
      );
      return true;
    }

    if (!inventoryDataAvailable && (asksRanking || asksFree || asksOccupied)) {
      speakAnswer(
        "Nie mam jeszcze danych o zajętości ani wolnych miejscach. Znam konstrukcję magazynów, ale stan lokalizacji pojawi się dopiero po podłączeniu bazy danych.",
        "Brak danych o zajętości. Czekam na podłączenie bazy.",
      );
      return true;
    }

    if (asksRanking) {
      let candidates = getAllRackStats();
      if (reference.block) candidates = candidates.filter((item) => item.block === reference.block);
      else if (reference.warehouse) candidates = candidates.filter((item) => item.warehouse === reference.warehouse);
      const wantsFullest = /najmniej woln|najbardziej peln|najbardziej zajet/.test(normalized);
      candidates.sort((left, right) => wantsFullest
        ? right.occupied / right.capacity - left.occupied / left.capacity
        : right.free - left.free);
      const best = candidates[0];
      if (best) {
        showRackOnMap(best);
        const percent = Math.round((best.occupied / best.capacity) * 100);
        speakAnswer(
          wantsFullest
            ? `Najbardziej zapełniony jest ${rackStatsLabel(best)}. Zajętych jest ${best.occupied} z ${best.capacity} miejsc, czyli ${percent} procent. Pokazuję go na mapie.`
            : `Najwięcej wolnego miejsca ma ${rackStatsLabel(best)}. Wolnych jest ${best.free} z ${best.capacity} miejsc. Pokazuję go na mapie.`,
        );
      }
      return true;
    }

    const rackStats = findRackStats(reference);
    if (reference.rack !== undefined && !rackStats) {
      const scope = reference.block ? `bloku ${reference.block}` : "wybranym magazynie";
      speakAnswer(`Nie ma takiego regału w ${scope}. Mogę podać liczbę dostępnych regałów.`);
      return true;
    }

    if (rackStats) {
      rememberRack(rackStats);
      const percent = Math.round((rackStats.occupied / rackStats.capacity) * 100);
      if (asksShow && !asksFree && !asksOccupied && !asksCapacity && !asksLevels && !asksColumns && !asksBalconies && !asksRule) {
        showRackOnMap(rackStats);
        speakAnswer(`Jasne, pokazuję ${rackStatsLabel(rackStats)} na mapie.`);
        return true;
      }
      if (asksFree) {
        speakAnswer(`${rackStatsLabel(rackStats)} ma obecnie ${rackStats.free} wolnych miejsc z ${rackStats.capacity}.`);
        return true;
      }
      if (asksOccupied) {
        speakAnswer(`${rackStatsLabel(rackStats)} ma zajętych ${rackStats.occupied} z ${rackStats.capacity} miejsc. To ${percent} procent pojemności.`);
        return true;
      }
      if (asksCapacity) {
        speakAnswer(`${rackStatsLabel(rackStats)} ma łącznie ${rackStats.capacity} miejsc paletowych.`);
        return true;
      }
      if (asksLevels || asksColumns) {
        if (rackStats.warehouse === "main") {
          speakAnswer(`${rackStatsLabel(rackStats)} ma 15 kolumn i 5 poziomów, od poziomu zero do czterech.`);
        } else {
          const config = getNewRackConfig(rackStats.block as NewBlock, rackStats.rack as number);
          speakAnswer(`${rackStatsLabel(rackStats)} ma ${config.columns.length} zwykłych kolumn i ${config.levels} poziomów, od poziomu zero do ${config.levels - 1}.`);
        }
        return true;
      }
      if (asksBalconies) {
        speakAnswer(rackStats.warehouse === "main"
          ? `${rackStatsLabel(rackStats)} nie ma kolumn balkonowych.`
          : `${rackStatsLabel(rackStats)}: ${rackBalconyDescription(getNewRackConfig(rackStats.block as NewBlock, rackStats.rack as number))}`);
        return true;
      }
      if (asksRule) {
        const rule = placementRules.find((item) =>
          item.warehouse === rackStats.warehouse &&
          item.block === rackStats.block &&
          item.rack === rackStats.rack,
        );
        if (!rule) {
          speakAnswer(`Dla ${rackStatsLabel(rackStats)} nie zapisano jeszcze reguł dostawców, surowców ani maksymalnej masy. Dostępne są wyłącznie dane konstrukcyjne.`);
          return true;
        }
        if (parsedPlacement.weightKg) {
          speakAnswer(parsedPlacement.weightKg <= rule.maxWeightKg
            ? `Tak. ${rackStatsLabel(rackStats)} dopuszcza do ${rule.maxWeightKg} kilogramów, więc ${parsedPlacement.weightKg} kilogramów mieści się w limicie.`
            : `Nie. ${rackStatsLabel(rackStats)} dopuszcza najwyżej ${rule.maxWeightKg} kilogramów. Limit zostałby przekroczony o ${parsedPlacement.weightKg - rule.maxWeightKg} kilogramów.`);
          return true;
        }
        speakAnswer(`${rackStatsLabel(rackStats)} jest skonfigurowany dla surowców: ${rule.materials.join(" i ")}; oraz dostawców: ${rule.suppliers.join(", ")}. Maksymalna masa palety to ${rule.maxWeightKg} kilogramów.`);
        return true;
      }
      speakAnswer(
        fullRackDescription(rackStats),
        inventoryDataAvailable
          ? `${rackStatsLabel(rackStats)}: ${rackStats.free} wolnych z ${rackStats.capacity} miejsc. Szczegóły są na ekranie.`
          : `${rackStatsLabel(rackStats)} ma ${rackStats.capacity} miejsc. Brak danych o zajętości.`,
      );
      return true;
    }

    if (reference.block) {
      vikiContextRef.current = { warehouse: "new", block: reference.block, topic: "block" };
      const stats = blockStats(reference.block);
      speakAnswer(
        blockDescription(reference.block),
        inventoryDataAvailable
          ? `Blok ${reference.block} ma ${stats.racks} regałów i ${stats.free} wolnych miejsc. Szczegóły są na ekranie.`
          : `Blok ${reference.block} ma ${stats.racks} regałów. Brak danych o zajętości.`,
      );
      return true;
    }

    if (reference.warehouse === "main") {
      const free = capacities.A - warehouses.A;
      vikiContextRef.current = { warehouse: "main", topic: "warehouse" };
      speakAnswer(
        inventoryDataAvailable
          ? `Magazyn główny ma 7 regałów, oznaczonych od A do G, oraz ${capacities.A} miejsc paletowych. Zajętych jest ${warehouses.A}, a wolnych ${free}. Każdy regał ma 15 kolumn i poziomy od zera do czterech.`
          : `Magazyn główny ma 7 regałów, oznaczonych od A do G, oraz ${capacities.A} miejsc paletowych. Każdy regał ma 15 kolumn i poziomy od zera do czterech. Dane o zajętości nie są jeszcze podłączone.`,
        inventoryDataAvailable
          ? `Magazyn główny ma 7 regałów i ${free} wolnych miejsc. Szczegóły są na ekranie.`
          : `Magazyn główny ma 7 regałów. Brak danych o zajętości.`,
      );
      return true;
    }

    if (reference.warehouse === "new") {
      const free = capacities.B - warehouses.B;
      vikiContextRef.current = { warehouse: "new", topic: "warehouse" };
      speakAnswer(
        inventoryDataAvailable
          ? `Nowy magazyn ma 42 regały w trzech blokach: M1 ma 21 regałów, M2 ma 11, a M3 ma 10. Łączna pojemność to ${capacities.B} miejsc. Zajętych jest ${warehouses.B}, a wolnych ${free}.`
          : `Nowy magazyn ma 42 regały w trzech blokach: M1 ma 21 regałów, M2 ma 11, a M3 ma 10. Łączna pojemność to ${capacities.B} miejsc. Dane o zajętości nie są jeszcze podłączone.`,
        inventoryDataAvailable
          ? `Nowy magazyn ma 42 regały i ${free} wolnych miejsc. Szczegóły są na ekranie.`
          : `Nowy magazyn ma 42 regały. Brak danych o zajętości.`,
      );
      return true;
    }

    if (asksRacks || asksGeneralInfo) {
      speakAnswer(
        `Oba magazyny mają łącznie 49 regałów i ${capacities.A + capacities.B} miejsc paletowych. Magazyn główny ma regały A–G. Nowy magazyn składa się z bloków M1, M2 i M3.`,
        `Łącznie są 49 regałów. Główny ma regały A do G, a nowy bloki M1, M2 i M3.`,
      );
      return true;
    }

    return false;
  }

  function recommendPlacement(input: PlacementDraft) {
    if (!inventoryDataAvailable || placementRules.length === 0) {
      placementDraftRef.current = {};
      speakAnswer(
        "Nie mogę jeszcze bezpiecznie wskazać miejsca. Brakuje aktualnej zajętości oraz zatwierdzonych reguł dostawców, surowców i maksymalnej masy regałów. Po podłączeniu tych danych będę mogła przygotować rekomendację.",
        "Nie mam jeszcze danych potrzebnych do bezpiecznej rekomendacji.",
      );
      return;
    }
    const requestedPallets = input.pallets || 1;
    const candidates = placementRules
      .map((rule) => {
        const free = freePlacesForRule(rule);
        const warehouseMatch = input.warehouse
          ? rule.warehouse === input.warehouse
          : true;
        const blockMatch = input.block ? rule.block === input.block : true;
        const supplierMatch = input.supplier
          ? rule.suppliers.includes(input.supplier)
          : true;
        const materialMatch = input.material
          ? rule.materials.includes(input.material)
          : true;
        const weightMatch = input.weightKg
          ? input.weightKg <= rule.maxWeightKg
          : true;
        const capacityMatch = free >= requestedPallets;
        const score =
          (warehouseMatch ? 60 : -200) +
          (blockMatch ? 40 : -150) +
          (supplierMatch ? 40 : -80) +
          (materialMatch ? 30 : -50) +
          (weightMatch ? 25 : -100) +
          (capacityMatch ? 20 : -100) +
          Math.min(free, 50) / 10;
        return { rule, free, warehouseMatch, blockMatch, supplierMatch, materialMatch, weightMatch, capacityMatch, score };
      })
      .filter((item) =>
        item.warehouseMatch && item.blockMatch && item.supplierMatch &&
        item.materialMatch && item.weightMatch && item.capacityMatch,
      )
      .sort((a, b) => b.score - a.score || b.free - a.free);

    const best = candidates[0];
    if (!best) {
      placementDraftRef.current = {};
      speakAnswer(
        "Nie znalazłam regału spełniającego wszystkie zatwierdzone warunki. Nie wskażę miejsca orientacyjnie bez pełnej reguły.",
      );
      return;
    }

    if (best.rule.warehouse === "main") {
      setMapWarehouse("main");
      setSelectedMainRack(best.rule.rack as MainRack);
      setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
    } else {
      setMapWarehouse("new");
      setMapBlock(best.rule.block as NewBlock);
      setSelectedRack(best.rule.rack as number);
      setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
    }
    vikiContextRef.current = {
      warehouse: best.rule.warehouse,
      block: best.rule.block,
      rack: best.rule.rack,
      supplier: input.supplier,
      material: input.material,
      topic: "placement",
    };
    if (input.warehouse && !activeWarehouseRef.current) {
      persistActiveVoiceWarehouse(input.warehouse);
    }
    placementDraftRef.current = {};
    navigate("map");
    const reasons = [
      input.supplier ? `jest przypisany do dostawcy ${input.supplier}` : null,
      input.material ? `obsługuje surowiec ${input.material}` : null,
      input.weightKg ? `dopuszcza palety do ${best.rule.maxWeightKg} kilogramów` : null,
      `ma ${best.free} wolnych miejsc`,
    ].filter(Boolean);
    const fullAnswer = `Proponuję ${ruleLabel(best.rule)}, ponieważ ${reasons.join(", ")}. Pokazuję ten regał na mapie.`;
    speakAnswer(
      fullAnswer,
      `Proponuję ${ruleLabel(best.rule)}. Ma ${best.free} wolnych miejsc. Pokazuję na mapie.`,
    );
  }

  function runVoiceCommand(command: string) {
    const normalized = normalizeSpeech(command);

    if (hasIntent(normalized, voiceIntents.greeting)) {
      armVikiForNextAnswer(12000);
      speakAnswer(
        /slyszysz|jestes tam/.test(normalized)
          ? "Tak, słyszę Cię. W czym mogę pomóc?"
          : "Cześć. Jestem gotowa. Możesz zapytać o konstrukcję dowolnego magazynu, bloku lub regału albo otworzyć wybrany moduł.",
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.finish)) {
      placementDraftRef.current = {};
      setVikiAwake(false);
      speakAnswer("W porządku. Gdy będę potrzebna, powiedz VIKI.", "Dobrze.");
      return;
    }

    let parsedPlacement = parsePlacement(command);
    const currentPlacement = placementDraftRef.current;
    const placementInProgress = Object.keys(currentPlacement).length > 0;
    if (placementInProgress) {
      const bareNumber = extractFirstVikiNumber(normalized);
      if (bareNumber && !parsedPlacement.block) {
        if (!currentPlacement.pallets && !parsedPlacement.pallets && !parsedPlacement.weightKg) {
          parsedPlacement = { ...parsedPlacement, pallets: bareNumber };
        } else if (!currentPlacement.weightKg && !parsedPlacement.weightKg && currentPlacement.pallets) {
          parsedPlacement = { ...parsedPlacement, weightKg: bareNumber };
        }
      }
    }

    const setsWorkWarehouse =
      Boolean(parsedPlacement.warehouse) &&
      /jestem|pracuj|obslug|ustaw|zmien|dzis|teraz|moj magazyn|magazyn pracy/.test(normalized);
    if (setsWorkWarehouse && parsedPlacement.warehouse) {
      persistActiveVoiceWarehouse(parsedPlacement.warehouse);
      if (placementInProgress) {
        continuePlacementDialogue(parsedPlacement);
      } else {
        placementDraftRef.current = {};
        speakAnswer(
          `Ustawiam ${warehouseVoiceLabel(parsedPlacement.warehouse)} jako magazyn pracy.`,
          `${warehouseVoiceLabel(parsedPlacement.warehouse)} ustawiony.`,
        );
      }
      return;
    }

    if (placementInProgress && Object.keys(parsedPlacement).length > 0) {
      continuePlacementDialogue(parsedPlacement);
      return;
    }

    if (handleWarehouseKnowledge(command, parsedPlacement)) return;
    const rackWeightQuestion =
      /regal/.test(normalized) &&
      /kg|kilogram|waga|udzwig|przyjm|moze/.test(normalized);

    if (rackWeightQuestion) {
      const rackMatch = normalized.match(/regal\s*(?:m)?([123])?[ .-]*([a-g]|\d{1,2})/);
      if (rackMatch) {
        const rule = placementRules.find((item) => {
          if (/^[a-g]$/.test(rackMatch[2])) return item.warehouse === "main" && item.rack === rackMatch[2].toUpperCase();
          return item.block === (`M${rackMatch[1] || "2"}` as NewBlock) && item.rack === Number(rackMatch[2]);
        });
        if (rule) {
          const requestedWeight = parsedPlacement.weightKg;
          speakAnswer(
            requestedWeight
              ? requestedWeight <= rule.maxWeightKg
                ? `Tak. ${ruleLabel(rule)} dopuszcza do ${rule.maxWeightKg} kilogramów, więc paleta ważąca ${requestedWeight} kilogramów spełnia regułę wagową.`
                : `Nie. ${ruleLabel(rule)} dopuszcza najwyżej ${rule.maxWeightKg} kilogramów. Ta paleta przekracza limit o ${requestedWeight - rule.maxWeightKg} kilogramów.`
              : `${ruleLabel(rule)} dopuszcza paletę o masie do ${rule.maxWeightKg} kilogramów.`,
          );
          return;
        }
      }
    }
    const placementIntent = hasIntent(normalized, voiceIntents.placement) ||
      /mam dostawe|przyjechal|przywiez|rozlad|gdzie.*palet|co.*z.*dostaw/.test(normalized) ||
      (/gdzie|odloz|umies|wstaw|wrzuc|propon|polec|moze isc|przyjm/.test(normalized) &&
        (/palet|dostaw|towar|surow|regal|miejsce/.test(normalized) ||
          Boolean(parsedPlacement.supplier || parsedPlacement.weightKg || parsedPlacement.material)));

    if (placementIntent) {
      placementDraftRef.current = {};
      continuePlacementDialogue(parsedPlacement);
      return;
    }

    if (parsedPlacement.supplier && hasIntent(normalized, voiceIntents.rackRules)) {
      const rules = placementRules.filter((rule) =>
        rule.suppliers.includes(parsedPlacement.supplier as string),
      );
      vikiContextRef.current = {
        ...vikiContextRef.current,
        supplier: parsedPlacement.supplier,
        topic: "supplier",
      };
      speakAnswer(
        rules.length
          ? `Dla dostawcy ${parsedPlacement.supplier} skonfigurowano: ${rules.map(ruleLabel).join(", ")}. Ostateczny wybór zależy również od masy palety, surowca i wolnych miejsc.`
          : `Nie mam jeszcze skonfigurowanych regałów dla dostawcy ${parsedPlacement.supplier}.`,
        rules.length
          ? `${parsedPlacement.supplier} ma ${rules.length} pasujące regały. Pokazuję szczegóły na ekranie.`
          : `Brak reguły dla dostawcy ${parsedPlacement.supplier}.`,
      );
      return;
    }

    if (/ile.*kg|jaka.*waga|udzwig|maksymaln.*waga/.test(normalized)) {
      const rackMatch = normalized.match(/regal\s*(?:m)?([123])?[ .-]*([a-g]|\d{1,2})/);
      if (rackMatch) {
        const rule = placementRules.find((item) => {
          if (/^[a-g]$/.test(rackMatch[2])) return item.warehouse === "main" && item.rack === rackMatch[2].toUpperCase();
          return item.block === (`M${rackMatch[1] || "2"}` as NewBlock) && item.rack === Number(rackMatch[2]);
        });
        if (rule) {
          speakAnswer(`${ruleLabel(rule)} dopuszcza paletę o masie do ${rule.maxWeightKg} kilogramów.`);
          return;
        }
      }
      speakAnswer("Podaj oznaczenie regału, na przykład regał B albo M3 regał 2, a sprawdzę jego dopuszczalną masę.");
      return;
    }

    if (hasIntent(normalized, voiceIntents.missingLoad) ||
      ((normalized.includes("zglos") || normalized.includes("mail")) &&
        (normalized.includes("ladunk") || normalized.includes("zamow")))) {
      reportMissingLoad();
      speakAnswer(
        `Przygotowuję zgłoszenie braku dla ${currentLoadQuery()}. Otwieram wiadomość do logistyki.`,
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.deliveryReport) ||
      (normalized.includes("dostaw") && /miesia|raport|statyst|ile|podsum/.test(normalized))) {
      navigate("deliveries");
      const leader = deliverySupplierStats[0];
      const supplierCount = parsedPlacement.supplier
        ? deliveries.filter((delivery) => delivery.supplier === parsedPlacement.supplier).length
        : null;
      speakAnswer(
        supplierCount !== null
          ? `Dla dostawcy ${parsedPlacement.supplier} zapisano ${supplierCount} dostawy. Otwieram rejestr.`
          : `W wybranym miesiącu zapisano ${monthlyDeliveries.length} dostawy. Najwięcej, ${leader?.[1] || 0}, pochodzi od dostawcy ${leader?.[0] || "brak danych"}. Otwieram raport dostaw.`,
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.openDeliveries)) {
      navigate("deliveries");
      speakAnswer("Otwieram niezależny rejestr dostaw.");
      return;
    }
    if (hasIntent(normalized, voiceIntents.openBarcodes)) {
      navigate("barcodes");
      speakAnswer("Otwieram generator kodów kreskowych.");
      return;
    }

    if (hasIntent(normalized, voiceIntents.openSchedule)) {
      navigate("schedule");
      speakAnswer("Otwieram grafik pracowników, zmiany i zaplanowane urlopy.");
      return;
    }

    if (hasIntent(normalized, voiceIntents.openCleaning)) {
      navigate("cleaning");
      speakAnswer("Otwieram karty mycia i tygodniowy plan odpowiedzialności.");
      return;
    }

    if (hasIntent(normalized, voiceIntents.openMap)) {
      navigate("map");
      speakAnswer("Otwieram mapę magazynu.");
      return;
    }

    if (hasIntent(normalized, voiceIntents.selectedLocation)) {
      navigate("map");
      if (!inventoryDataAvailable) {
        speakAnswer(
          `Lokalizacja ${selectedMapLocation} istnieje w strukturze magazynu, ale nie mam jeszcze danych o jej zajętości.`,
        );
        return;
      }
      speakAnswer(
        selectedSlotOccupied
          ? `Lokalizacja ${selectedMapLocation} jest zajęta. Rodzaj surowca: ${selectedRackMaterial}. Znajduje się tam ${selectedLocationIds.length} numerów identyfikacyjnych.`
          : `Lokalizacja ${selectedMapLocation} jest wolna.`,
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.identifiers) ||
      normalized.includes("identyfik") || /\bni\b/.test(normalized)) {
      navigate("map");
      if (!inventoryDataAvailable) {
        speakAnswer(
          `Nie mam jeszcze numerów identyfikacyjnych dla lokalizacji ${selectedMapLocation}. Pojawią się po podłączeniu danych magazynowych.`,
        );
        return;
      }
      const answer = selectedLocationIds.length
        ? `Na lokalizacji ${selectedMapLocation} znajdują się ${selectedLocationIds.length} numery identyfikacyjne: ${selectedLocationIds.join(", ")}.`
        : `Lokalizacja ${selectedMapLocation} jest wolna i nie ma przypisanych numerów identyfikacyjnych.`;
      speakAnswer(
        `${answer} Pokazuję szczegóły po prawej stronie mapy.`,
        selectedLocationIds.length
          ? `Na tej lokalizacji są ${selectedLocationIds.length} numery identyfikacyjne. Lista jest na ekranie.`
          : "Ta lokalizacja jest wolna.",
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.stock) ||
      normalized.includes("stan") || normalized.includes("ile palet")) {
      navigate("inventory");
      if (!inventoryDataAvailable) {
        speakAnswer(
          "Dane o stanie zapasów nie są jeszcze podłączone. Otwieram przygotowany raport zapasów.",
        );
        return;
      }
      speakAnswer(
        `Łączny stan wynosi ${totalPallets} palet. Magazyn główny ma ${warehouses.A} palety, a Nowy magazyn ${warehouses.B}. Otwieram raport zapasów.`,
        `Łącznie jest ${totalPallets} palet. Otwieram raport zapasów.`,
      );
      return;
    }

    if (parsedPlacement.supplier && normalized.split(" ").length <= 3) {
      const supplierRules = placementRules.filter((rule) =>
        rule.suppliers.includes(parsedPlacement.supplier as string),
      );
      vikiContextRef.current = {
        ...vikiContextRef.current,
        supplier: parsedPlacement.supplier,
        topic: "supplier",
      };
      speakAnswer(
        supplierRules.length
          ? `${parsedPlacement.supplier} ma skonfigurowane miejsca na: ${supplierRules.map(ruleLabel).join(", ")}. Przy konkretnym odłożeniu sprawdzę jeszcze surowiec, masę i wolną pojemność.`
          : `Znam dostawcę ${parsedPlacement.supplier}, ale nie ma jeszcze przypisanej reguły składowania.`,
        supplierRules.length
          ? `${parsedPlacement.supplier}: znalazłam ${supplierRules.length} pasujące regały. Szczegóły są na ekranie.`
          : `Brak reguły składowania dla ${parsedPlacement.supplier}.`,
      );
      return;
    }

    const material = findRackMaterial(normalized) as RackMaterial | undefined;
    if (material) {
      const materialRules = placementRules.filter((rule) => rule.materials.includes(material));
      vikiContextRef.current = {
        ...vikiContextRef.current,
        material,
        topic: "material",
      };
      navigate("map");
      speakAnswer(
        materialRules.length
          ? `${material} można składować na: ${materialRules.map(ruleLabel).join(", ")}. Otwieram mapę magazynu.`
          : `Nie zapisano jeszcze reguł składowania dla surowca ${material}. Otwieram mapę magazynu.`,
        materialRules.length
          ? `${material}: znalazłam ${materialRules.length} pasujące regały. Otwieram mapę.`
          : `Brak reguł składowania dla surowca ${material}.`,
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.freePlaces) || normalized.includes("woln")) {
      if (!inventoryDataAvailable) {
        navigate("map");
        speakAnswer(
          "Nie mam jeszcze aktualnej zajętości, więc nie wskażę wolnego miejsca. Otwieram mapę konstrukcji magazynu.",
        );
        return;
      }
      const best = getAllRackStats().sort((left, right) => right.free - left.free)[0];
      showRackOnMap(best);
      speakAnswer(
        `Najwięcej wolnych miejsc ma ${rackStatsLabel(best)}. Dostępnych jest tam ${best.free} z ${best.capacity} miejsc. Pokazuję go na mapie.`,
      );
      return;
    }

    if (hasIntent(normalized, voiceIntents.help)) {
      speakAnswer(
        "Znam konstrukcję obu magazynów, wszystkie bloki, regały, kolumny, poziomy, balkony i pojemności. Mogę pokazać wskazany regał, otworzyć rejestr dostaw, grafik pracowników, karty mycia, generator kodów albo przygotować zgłoszenie brakującego ładunku. Informacje o zajętości, numerach identyfikacyjnych i rekomendacjach uruchomią się po podłączeniu danych oraz reguł magazynowych.",
        "Znam konstrukcję magazynów i obsługuję grafik, karty mycia oraz pozostałe moduły. Dane o zapasach czekają na integrację.",
      );
      return;
    }

    if (wakeModeRef.current) armVikiForNextAnswer(9000);
    speakAnswer(
      /regal|blok|magazyn/.test(normalized)
        ? "Rozpoznałam temat magazynu, ale nie jestem pewna, o którą informację chodzi. Możesz zapytać o pojemność, wolne miejsca, poziomy, kolumny, balkony albo poprosić o pokazanie regału."
        : "Nie jestem pewna, co mam sprawdzić. Spróbuj powiedzieć to innymi słowami albo powiedz „pomoc”, a podam przykłady.",
      "Nie jestem pewna. Powiedz to inaczej albo powiedz: pomoc.",
    );
  }

  function armVikiForNextAnswer(timeout = 12000) {
    if (!wakeModeRef.current) return;
    followUpTimeoutRef.current = timeout;
    listenAfterSpeechRef.current = true;
    setVikiAwake(true);
    vikiAwakeRef.current = true;
  }

  function stopWakeMode() {
    wakeModeRef.current = false;
    vikiPhaseRef.current = "off";
    setWakeMode(false);
    setVikiAwake(false);
    vikiAwakeRef.current = false;
    listenAfterSpeechRef.current = false;
    queuedCommandRef.current = "";
    commandPartsRef.current = [];
    commandInterimRef.current = "";
    clearListeningTimers();
    disposeRecognition();
    window.speechSynthesis?.cancel();
    voiceSpeakingRef.current = false;
    setVoiceSpeaking(false);
  }

  function speechRecognitionConstructor() {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
  }

  function restartRecognition(recognition: SpeechRecognitionLike, generation: number, delay = 350) {
    if (recognitionRestartTimerRef.current) window.clearTimeout(recognitionRestartTimerRef.current);
    recognitionRestartTimerRef.current = window.setTimeout(() => {
      if (
        !wakeModeRef.current ||
        recognitionGenerationRef.current !== generation ||
        recognitionRef.current !== recognition ||
        voiceSpeakingRef.current
      ) return;
      try {
        recognition.start();
      } catch {
        // Przeglądarka może chwilowo blokować ponowny start nasłuchiwania.
      }
    }, delay);
  }

  function startWakeRecognition() {
    if (!wakeModeRef.current) return;
    disposeRecognition();
    if (wakeArmTimerRef.current) window.clearTimeout(wakeArmTimerRef.current);
    if (commandSilenceTimerRef.current) window.clearTimeout(commandSilenceTimerRef.current);
    wakeArmTimerRef.current = null;
    commandSilenceTimerRef.current = null;
    commandPartsRef.current = [];
    commandInterimRef.current = "";
    queuedCommandRef.current = "";
    listenAfterSpeechRef.current = false;
    vikiPhaseRef.current = "wake";
    setVikiAwake(false);
    vikiAwakeRef.current = false;

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      speakAnswer("Tryb VIKI wymaga aktualnej wersji Chrome albo Edge.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 10;
    const browserWindow = window as typeof window & {
      SpeechGrammarList?: SpeechGrammarListConstructor;
      webkitSpeechGrammarList?: SpeechGrammarListConstructor;
    };
    const GrammarList =
      browserWindow.SpeechGrammarList || browserWindow.webkitSpeechGrammarList;
    if (GrammarList) {
      const grammars = new GrammarList();
      grammars.addFromString(
        "#JSGF V1.0; grammar viki; public <wake> = VIKI | Wiki | Viki | Wikii | Vicky | hej VIKI | hej Wiki;",
        1,
      );
      recognition.grammars = grammars;
    }
    const generation = recognitionGenerationRef.current + 1;
    recognitionGenerationRef.current = generation;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (
        voiceSpeakingRef.current ||
        vikiPhaseRef.current !== "wake" ||
        recognitionGenerationRef.current !== generation
      ) return;
      const start = event.resultIndex ?? Math.max(0, event.results.length - 1);
      for (let index = start; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        const transcripts = Array.from(result)
          .map((item) => item.transcript || "")
          .filter(Boolean);
        const detected = detectVikiWake(transcripts);
        const punctuationFallback =
          transcripts.length > 0 &&
          transcripts.every((value) => isOnlyRecognitionPunctuation(value) && value.trim().length <= 3);
        // Na części instalacji Edge krótkie „VIKI” pojawia się wyłącznie jako
        // tymczasowa kropka i nigdy nie dostaje wyniku finalnego. Dlatego w fazie
        // czuwania akceptujemy również taki wynik tymczasowy. Po aktywacji ten
        // wyjątek jest wyłączony, więc kropka nie może zostać poleceniem.
        if (!detected.heard && !punctuationFallback) continue;

        queuedCommandRef.current = detected.command;
        armVikiForNextAnswer(14000);
        speakAnswer("Słucham.");
        return;
      }
    };
    recognition.onerror = (event) => {
      if (recognitionGenerationRef.current !== generation) return;
      if (event?.error !== "aborted" && event?.error !== "no-speech") {
        setToast("VIKI utraciła dostęp do mikrofonu. Kliknij ikonę, aby włączyć ją ponownie.");
      }
    };
    recognition.onend = () => {
      if (
        recognitionGenerationRef.current !== generation ||
        vikiPhaseRef.current !== "wake"
      ) return;
      restartRecognition(recognition, generation);
    };
    try {
      recognition.start();
    } catch {
      // Brak startu zostanie obsłużony kolejną próbą czuwania.
    }
  }

  function finishVikiCommand() {
    const command = [...commandPartsRef.current, commandInterimRef.current]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!command || isIncompleteVikiCommand(command)) return false;
    clearListeningTimers();
    disposeRecognition();
    commandPartsRef.current = [];
    commandInterimRef.current = "";
    setVikiAwake(false);
    vikiAwakeRef.current = false;
    runVoiceCommand(command);
    return true;
  }

  function startCommandRecognition(timeout = 14000) {
    if (!wakeModeRef.current) return;
    disposeRecognition();
    if (wakeArmTimerRef.current) window.clearTimeout(wakeArmTimerRef.current);
    if (commandSilenceTimerRef.current) window.clearTimeout(commandSilenceTimerRef.current);
    commandPartsRef.current = [];
    commandInterimRef.current = "";
    vikiPhaseRef.current = "command";
    setVikiAwake(true);
    vikiAwakeRef.current = true;

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      stopWakeMode();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 10;
    const generation = recognitionGenerationRef.current + 1;
    recognitionGenerationRef.current = generation;
    recognitionRef.current = recognition;

    const scheduleFinish = () => {
      if (commandSilenceTimerRef.current) window.clearTimeout(commandSilenceTimerRef.current);
      commandSilenceTimerRef.current = window.setTimeout(() => {
        if (vikiPhaseRef.current !== "command") return;
        const combined = [...commandPartsRef.current, commandInterimRef.current]
          .filter(Boolean)
          .join(" ");
        if (isIncompleteVikiCommand(combined)) {
          return;
        }
        finishVikiCommand();
      }, 1400);
    };

    recognition.onresult = (event) => {
      if (
        voiceSpeakingRef.current ||
        vikiPhaseRef.current !== "command" ||
        recognitionGenerationRef.current !== generation
      ) return;
      const start = event.resultIndex ?? Math.max(0, event.results.length - 1);
      for (let index = start; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        const alternatives = Array.from(result)
          .map((item) => ({
            transcript: item.transcript?.trim() || "",
            confidence: item.confidence || 0,
          }))
          .filter((item) => item.transcript && !isOnlyRecognitionPunctuation(item.transcript))
          .sort((left, right) => {
            const wordDifference = normalizeSpeech(right.transcript).split(" ").length -
              normalizeSpeech(left.transcript).split(" ").length;
            return wordDifference || right.confidence - left.confidence;
          });
        const best = alternatives[0]?.transcript || "";
        if (!best) continue;
        if (result.isFinal === false) {
          commandInterimRef.current = best;
        } else {
          const normalizedBest = normalizeSpeech(best);
          const last = commandPartsRef.current.at(-1);
          if (!last || normalizeSpeech(last) !== normalizedBest) commandPartsRef.current.push(best);
          commandInterimRef.current = "";
        }
        scheduleFinish();
      }
    };
    recognition.onerror = (event) => {
      if (recognitionGenerationRef.current !== generation) return;
      if (event?.error === "aborted") return;
    };
    recognition.onend = () => {
      if (
        recognitionGenerationRef.current !== generation ||
        vikiPhaseRef.current !== "command"
      ) return;
      if (!finishVikiCommand()) restartRecognition(recognition, generation, 250);
    };

    wakeArmTimerRef.current = window.setTimeout(() => {
      if (vikiPhaseRef.current !== "command") return;
      if (finishVikiCommand()) return;
      disposeRecognition();
      commandPartsRef.current = [];
      commandInterimRef.current = "";
      setVikiAwake(false);
      vikiAwakeRef.current = false;
      recognitionRestartTimerRef.current = window.setTimeout(startWakeRecognition, 500);
    }, timeout);

    try {
      recognition.start();
    } catch {
      // Uprawnienie do mikrofonu może zostać przyznane dopiero po ponownej próbie.
    }
  }

  function startWakeMode() {
    if (!speechRecognitionConstructor()) {
      speakAnswer("Tryb VIKI wymaga aktualnej wersji Chrome albo Edge.");
      return;
    }
    stopWakeMode();
    wakeModeRef.current = true;
    vikiPhaseRef.current = "wake";
    setWakeMode(true);
    startWakeRecognition();
  }

  function saveDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier = String(form.get("supplier")).trim();
    const previous = editingDelivery
      ? deliveries.find((delivery) => delivery.id === editingDelivery)
      : undefined;
    const payload = {
      supplier,
      pallets: Math.max(1, Number(form.get("pallets")) || 1),
      material: previous?.material || ("Inne" as MaterialName),
      warehouse: previous?.warehouse || ("A" as WarehouseKey),
      notes: previous?.notes || "",
      date: previous?.date || isoDate(),
    };

    if (editingDelivery) {
      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === editingDelivery
            ? { ...delivery, ...payload }
            : delivery,
        ),
      );
      setToast(`Zapisano zmiany w ${editingDelivery}.`);
    } else {
      const id = nextDeliveryId(deliveries);
      setDeliveries((current) => [
        { ...payload, id },
        ...current,
      ]);
      setToast("Dostawa " + id + " zapisana: " + supplier + ", " +
        payload.pallets + " palet.");
    }
    setEditingDelivery(null);
    setDeliveryModal(false);
  }

  function deleteDelivery(id: string) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return;
    setDeliveries((current) => current.filter((item) => item.id !== id));
    setDeliveryToDelete(null);
    setToast(`Usunięto ${id} z rejestru dostaw.`);
  }

  function openEdit(delivery: Delivery) {
    setEditingDelivery(delivery.id);
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
      setSupplierCatalog((current) =>
        current.map((supplier) =>
          supplier.id === editingSupplierId
            ? { ...supplier, name, material }
            : supplier,
        ),
      );
      setToast(`Zaktualizowano automat dla dostawcy ${name}.`);
    } else {
      setSupplierCatalog((current) => [
        ...current,
        { id: Date.now(), name, material, active: true },
      ]);
      setToast(`Dodano dostawcę ${name} → ${material}.`);
    }
    setSupplierModalOpen(false);
    setEditingSupplierId(null);
  }

  function toggleSupplier(id: number) {
    const supplier = supplierCatalog.find((item) => item.id === id);
    if (!supplier) return;
    setSupplierCatalog((current) =>
      current.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    );
    setToast(
      `${supplier.name}: automat ${supplier.active ? "wyłączony" : "włączony"}.`,
    );
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
    setSearchedLoad(normalized || normalizedOrder || normalizedSupplier);
    setLoadCodes([]);
    setLoadNotFound(true);
    setToast(
      "Źródło danych ładunków nie jest jeszcze podłączone. Możesz zgłosić brak do logistyki.",
    );
  }

  function currentLoadQuery() {
    return (
      loadId.trim().toUpperCase() ||
      purchaseOrder.trim().toUpperCase() ||
      loadSupplier.trim() ||
      "niepodanego numeru"
    );
  }

  function reportMissingLoad() {
    const query = currentLoadQuery();
    const subject = encodeURIComponent(
      `Brak ładunku / zamówienia w Warehouse Masterpress: ${query}`,
    );
    const body = encodeURIComponent(
      `Dzień dobry,\n\nnie znaleziono danych dla wpisanej wartości: ${query}.\nProszę o weryfikację ładunku lub zamówienia w D365.\n\nWiadomość wygenerowana przez Warehouse Masterpress.`,
    );
    window.location.href = `mailto:${logisticsEmail}?subject=${subject}&body=${body}`;
  }

  function updateGeneratorLocation(patch: Partial<GeneratorLocation>) {
    setLocation((current) =>
      normalizeGeneratorLocation({ ...current, ...patch }),
    );
  }

  const visualLocationCode =
    location.warehouse === "main"
      ? `${location.rack}.${String(location.column).padStart(2, "0")}.${String(location.place).padStart(2, "0")}`
      : `${location.block}.${location.rack}.${String(location.column).padStart(2, "0")}.${String(location.place).padStart(2, "0")}`;
  const locationBarcodeValue = visualLocationCode.replace(/^M/, "");
  const edited = editingDelivery
    ? deliveries.find((delivery) => delivery.id === editingDelivery)
    : undefined;
  const editedSupplier = editingSupplierId
    ? supplierCatalog.find((supplier) => supplier.id === editingSupplierId)
    : undefined;

  return (
    <main
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <button
            aria-label="Zamknij menu"
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            type="button"
          >
            <X />
          </button>
          {/* Zwykły img zachowuje dynamiczny BASE_URL w buildzie lokalnym. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Masterpress"
            src={`${import.meta.env.BASE_URL}masterpress-logo-white.png`}
          />
        </div>

        <nav className="main-nav" aria-label="Nawigacja główna">
          {navItems.map(({ id, label, description, icon: Icon }) => (
            <button
              className={activeView === id ? "active" : ""}
              key={id}
              onClick={() => navigate(id)}
              type="button"
            >
              <span className="nav-icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>

        <div className="station-row">
          <span>
            <Warehouse size={18} />
          </span>
          <div>
            <strong>Stanowisko magazynowe</strong>
            <small>Bez logowania imiennego</small>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          aria-label="Zamknij menu"
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
          type="button"
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <button
            aria-label={sidebarCollapsed ? "Pokaż menu" : "Ukryj menu"}
            className="menu-button"
            onClick={() => {
              if (window.matchMedia("(max-width: 940px)").matches)
                setMobileNav(true);
              else setSidebarCollapsed((value) => !value);
            }}
            type="button"
          >
            <Menu />
          </button>
          <div className="topbar-title">
            <p>MASTERPRESS · SYSTEM MAGAZYNOWY</p>
            <h1>{navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
          <form className="topbar-search" onSubmit={runGlobalSearch}>
            <Search />
            <input
              aria-label="Szukaj w aplikacji"
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Lokalizacja, NI, dostawa, ładunek…"
              value={globalSearch}
            />
            <button type="submit">Szukaj</button>
          </form>
        </header>

        {activeView === "dashboard" && (
          <div className="view-stack">
            <section className="command-hero">
              <div>
                <span className="hero-label">
                  <Sparkles size={14} /> Szybki dostęp do pracy magazynu
                </span>
                <h2>Magazyn w jednym miejscu</h2>
                <p>
                  Sprawdź zajętość, znajdź lokalizację, zarejestruj dostawę
                  albo przygotuj kod kreskowy.
                </p>
              </div>
            </section>

            <WorkforceSummary />

            <section className="kpi-grid">
              <article className="metric-card metric-primary">
                <div>
                  <span>Łącznie palet</span>
                  <PackageOpen />
                </div>
                <strong>
                  {inventoryDataAvailable
                    ? totalPallets.toLocaleString("pl-PL")
                    : "—"}
                </strong>
                <p>
                  {inventoryDataAvailable ? (
                    <>
                      <b>
                        {Math.round(
                          (totalPallets / (capacities.A + capacities.B)) * 100,
                        )}
                        %
                      </b>{" "}
                      wykorzystania wszystkich lokalizacji
                    </>
                  ) : (
                    "Oczekiwanie na dane magazynowe"
                  )}
                </p>
              </article>
              <article className="metric-card">
                <div>
                  <span>Magazyn główny</span>
                  <Warehouse />
                </div>
                <strong>
                  {inventoryDataAvailable ? warehouses.A : "—"}
                  <small> / {capacities.A}</small>
                </strong>
                <div className="progress">
                  <i
                    style={{
                      width: inventoryDataAvailable
                        ? `${(warehouses.A / capacities.A) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <p>
                  {inventoryDataAvailable
                    ? `${capacities.A - warehouses.A} wolnych miejsc`
                    : "Brak danych o zajętości"}
                </p>
              </article>
              <article className="metric-card">
                <div>
                  <span>Nowy magazyn</span>
                  <Warehouse />
                </div>
                <strong>
                  {inventoryDataAvailable ? warehouses.B : "—"}
                  <small> / {capacities.B}</small>
                </strong>
                <div className="progress">
                  <i
                    style={{
                      width: inventoryDataAvailable
                        ? `${(warehouses.B / capacities.B) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <p>
                  {inventoryDataAvailable
                    ? `${capacities.B - warehouses.B} wolnych miejsc`
                    : "Brak danych o zajętości"}
                </p>
              </article>
              <article className="metric-card">
                <div>
                  <span>Dostawy dzisiaj</span>
                  <Truck />
                </div>
                <strong>
                  {todayDeliveries}
                  <small> dostawy</small>
                </strong>
                <p>
                  <b>{todayPallets}</b> palet zarejestrowanych
                </p>
              </article>
            </section>

            <section className="quick-grid">
              <button onClick={() => navigate("inventory")} type="button">
                <span className="quick-icon">
                  <BarChart3 />
                </span>
                <span>
                  <small>Zestawienie magazynowe</small>
                  <strong>Sprawdź stan zapasów</strong>
                  <em>Bieżący podgląd bez ręcznego wpisywania</em>
                </span>
                <ChevronRight />
              </button>
              <button
                onClick={() => {
                  navigate("deliveries");
                  setEditingDelivery(null);
                  setDeliveryModal(true);
                }}
                type="button"
              >
                <span className="quick-icon">
                  <ClipboardList />
                </span>
                <span>
                  <small>Rejestr dostaw</small>
                  <strong>Dodaj nową dostawę</strong>
                  <em>Formularz przygotowany pod telefon</em>
                </span>
                <ChevronRight />
              </button>
              <button onClick={() => navigate("barcodes")} type="button">
                <span className="quick-icon">
                  <QrCode />
                </span>
                <span>
                  <small>Generator</small>
                  <strong>Pokaż kody ładunku</strong>
                  <em>Szukaj po ładunku, PO lub dostawcy</em>
                </span>
                <ChevronRight />
              </button>
            </section>

            <section className="dashboard-grid">
              <article className="panel stock-overview">
                <div className="panel-heading">
                  <div>
                    <span>STRUKTURA ZAPASU</span>
                    <h3>Palety według surowca</h3>
                  </div>
                  <button onClick={() => navigate("inventory")} type="button">
                    Pełny widok <ChevronRight />
                  </button>
                </div>
                {inventoryDataAvailable ? (
                  <div className="material-overview">
                    <div className="donut" style={{ background: donut }}>
                      <div>
                        <strong>{totalPallets}</strong>
                        <span>palet</span>
                      </div>
                    </div>
                    <div className="material-legend">
                      {(
                        Object.entries(materials) as [MaterialName, number][]
                      ).map(([material, value]) => (
                        <div key={material}>
                          <i style={{ background: materialColors[material] }} />
                          <span>{material}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-report-state">
                    <strong>Brak danych o zapasach</strong>
                    <span>Struktura surowców pojawi się po podłączeniu bazy.</span>
                  </div>
                )}
              </article>
              <article className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <span>OSTATNIE DOSTAWY</span>
                    <h3>Ostatnio zarejestrowane</h3>
                  </div>
                  <StatusBadge tone="info">Dane aplikacji</StatusBadge>
                </div>
                <div className="activity-list">
                  {deliveries.slice(0, 4).map((delivery) => (
                    <div key={delivery.id}>
                      <span className="activity-icon in">
                        <Truck />
                      </span>
                      <span>
                        <strong>
                          Zarejestrowano {delivery.pallets} palet
                        </strong>
                        <small>
                          {delivery.supplier} · {warehouseNames[delivery.warehouse]}
                        </small>
                      </span>
                      <time>{formatDeliveryDate(delivery.date)}</time>
                    </div>
                  ))}
                  {deliveries.length === 0 && (
                    <div className="empty-report-state">
                      <strong>Brak zarejestrowanych dostaw</strong>
                      <span>Dodaj pierwszą dostawę w niezależnym rejestrze.</span>
                    </div>
                  )}
                </div>
              </article>
            </section>
          </div>
        )}

        {activeView === "inventory" && (
          <div className="view-stack">
            <section className="view-intro">
              <div>
                <span>DANE MAGAZYNOWE</span>
                <h2>Raport zapasów</h2>
                <p>
                  Podgląd pojemności, zajętości i struktury surowców. Moduł jest
                  przygotowany do zasilania danymi z bazy aplikacji.
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => setStockReportOpen(true)}
                type="button"
              >
                <FileText /> Generuj dokument
              </button>
            </section>
            <section className="warehouse-cards">
              {(["A", "B"] as WarehouseKey[]).map((warehouse) => (
                <article key={warehouse}>
                  <span className="warehouse-letter">
                    <Warehouse />
                  </span>
                  <div>
                    <small>{warehouseNames[warehouse].toUpperCase()}</small>
                    <strong>
                      {inventoryDataAvailable ? warehouses[warehouse] : "—"}{" "}
                      <em>palet</em>
                    </strong>
                    <div className="progress">
                      <i
                        style={{
                          width: inventoryDataAvailable
                            ? `${(warehouses[warehouse] / capacities[warehouse]) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <p>
                      {inventoryDataAvailable ? (
                        <>
                          <b>
                            {Math.round(
                              (warehouses[warehouse] / capacities[warehouse]) * 100,
                            )}
                            %
                          </b>{" "}
                          zajęto · {capacities[warehouse] - warehouses[warehouse]}{" "}
                          wolnych
                        </>
                      ) : (
                        "Brak danych o zajętości"
                      )}
                    </p>
                  </div>
                </article>
              ))}
              <article className="warehouse-total">
                <span>
                  <Boxes />
                </span>
                <div>
                  <small>RAZEM</small>
                  <strong>
                    {inventoryDataAvailable ? totalPallets : "—"} <em>palet</em>
                  </strong>
                  <p>Pojemność łączna: {capacities.A + capacities.B}</p>
                </div>
              </article>
            </section>
            <section className="inventory-grid report-only-grid">
              <article className="panel stock-report-summary">
                <div className="panel-heading">
                  <div>
                    <span>ZAJĘTOŚĆ</span>
                    <h3>Wykorzystanie magazynów</h3>
                  </div>
                  <BarChart3 />
                </div>
                {(["A", "B"] as WarehouseKey[]).map((warehouse) => (
                  <div className="report-warehouse-row" key={warehouse}>
                    <div>
                      <strong>{warehouseNames[warehouse]}</strong>
                      <span>
                        {inventoryDataAvailable
                          ? `${warehouses[warehouse]} z ${capacities[warehouse]} miejsc`
                          : `Pojemność: ${capacities[warehouse]} miejsc`}
                      </span>
                    </div>
                    <b>
                      {inventoryDataAvailable
                        ? `${Math.round(
                            (warehouses[warehouse] / capacities[warehouse]) * 100,
                          )}%`
                        : "—"}
                    </b>
                    <div className="progress">
                      <i
                        style={{
                          width: inventoryDataAvailable
                            ? `${(warehouses[warehouse] / capacities[warehouse]) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </article>
              <article className="panel material-panel">
                <div className="panel-heading">
                  <div>
                    <span>SUROWCE</span>
                    <h3>Struktura palet</h3>
                  </div>
                  <strong>{inventoryDataAvailable ? totalPallets : "—"}</strong>
                </div>
                {inventoryDataAvailable ? (
                  <div className="material-bars">
                    {(Object.entries(materials) as [MaterialName, number][]).map(
                      ([material, value]) => (
                        <div key={material}>
                          <div>
                            <span>
                              <i
                                style={{ background: materialColors[material] }}
                              />
                              {material}
                            </span>
                            <strong>{value} palet</strong>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                background: materialColors[material],
                                width: `${(value / Math.max(1, ...Object.values(materials))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="empty-report-state">
                    <strong>Brak danych o surowcach</strong>
                    <span>Dane pojawią się po uruchomieniu integracji.</span>
                  </div>
                )}
              </article>
            </section>
          </div>
        )}

        {activeView === "map" && (
          <div className="view-stack location-navigator-view">
            <section className="warehouse-switch panel">
              <div>
                <small>MAPA MAGAZYNÓW</small>
                <strong>Wybierz obiekt</strong>
              </div>
              <div>
                {(["main", "new"] as MapWarehouse[]).map((warehouse) => (
                  <button
                    className={mapWarehouse === warehouse ? "active" : ""}
                    key={warehouse}
                    onClick={() => {
                      setMapWarehouse(warehouse);
                      if (warehouse === "main") {
                        setSelectedMainRack("A");
                        setSelectedMapSlot({ column: 1, level: 0, slot: 1 });
                      } else {
                        setMapBlock("M1");
                        setSelectedRack(1);
                        setSelectedMapSlot({ column: 3, level: 4, slot: 1 });
                      }
                    }}
                    type="button"
                  >
                    <Warehouse />
                    {warehouse === "main" ? "Magazyn główny" : "Nowy magazyn"}
                  </button>
                ))}
              </div>
            </section>
            <section className="navigator-controls">
              {mapWarehouse === "main" ? (
                <article className="panel rack-selector-panel main-rack-selector">
                  <div>
                    <small>MAGAZYN GŁÓWNY</small>
                    <h3>Wybierz regał A–G</h3>
                  </div>
                  <div className="navigator-racks">
                    {mainRacks.map((rack) => {
                      const stats = getMainRackStats(rack);
                      return (
                        <button
                          className={selectedMainRack === rack ? "active" : ""}
                          key={rack}
                          onClick={() => {
                            setSelectedMainRack(rack);
                            setSelectedMapSlot({
                              column: 1,
                              level: 0,
                              slot: 1,
                            });
                          }}
                          type="button"
                        >
                          <span>{rack}</span>
                          <i>
                            <b
                              style={{
                                width: `${(stats.occupied / mainRackCapacity[rack]) * 100}%`,
                              }}
                            />
                          </i>
                          <small>
                            {inventoryDataAvailable
                              ? `${stats.free} wolnych`
                              : "Brak danych"}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ) : (
                <>
                  <article className="panel block-selector-panel">
                    <div>
                      <small>NOWY MAGAZYN</small>
                      <h3>Wybierz blok magazynu</h3>
                    </div>
                    <div className="navigator-blocks">
                      {(["M1", "M2", "M3"] as const).map((block) => {
                        const occupied = rackCapacity[block].reduce(
                          (sum, [, value]) => sum + value,
                          0,
                        );
                        const capacity = rackCapacity[block].reduce(
                          (sum, [, , value]) => sum + value,
                          0,
                        );
                        return (
                          <button
                            className={mapBlock === block ? "active" : ""}
                            key={block}
                            onClick={() => {
                              setMapBlock(block);
                              setSelectedRack(1);
                              setSelectedMapSlot({
                                column: 3,
                                level: 4,
                                slot: 1,
                              });
                            }}
                            type="button"
                          >
                            <span>
                              <Warehouse />
                            </span>
                            <div>
                              <strong>Blok {block}</strong>
                              <small>
                                {rackCapacity[block].length} regałów
                              </small>
                            </div>
                            <em>
                              {inventoryDataAvailable
                                ? `${Math.round((occupied / capacity) * 100)}%`
                                : "—"}
                            </em>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                  <article className="panel rack-selector-panel">
                    <div>
                      <small>NOWY MAGAZYN</small>
                      <h3>Wybierz regał</h3>
                    </div>
                    <div className="navigator-racks">
                      {rackCapacity[mapBlock].map(
                        ([rack, occupied, capacity]) => {
                          const percent = Math.round(
                            (occupied / capacity) * 100,
                          );
                          return (
                            <button
                              className={`${selectedRack === rack ? "active" : ""} ${percent >= 90 ? "critical" : ""}`}
                              key={rack}
                              onClick={() => {
                                setSelectedRack(rack);
                                setSelectedMapSlot({
                                  column: 3,
                                  level: 4,
                                  slot: 1,
                                });
                              }}
                              type="button"
                            >
                              <span>{String(rack).padStart(2, "0")}</span>
                              <i>
                                <b style={{ width: `${percent}%` }} />
                              </i>
                              <small>
                                {inventoryDataAvailable
                                  ? `${capacity - occupied} wolnych`
                                  : "Brak danych"}
                              </small>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </article>
                </>
              )}
            </section>

            <section className="navigator-workspace">
              <article className="panel rack-facade-panel">
                <div className="facade-heading">
                  <div>
                    <span>
                      <Boxes />
                    </span>
                    <div>
                      <small>WIDOK REGAŁU OD FRONTU</small>
                      <h3>
                        {mapWarehouse === "main"
                          ? `Regał ${selectedMainRack}`
                          : `Regał ${mapBlock}-${String(selectedRack).padStart(2, "0")}`}
                      </h3>
                      <p>
                        {mapWarehouse === "main"
                          ? "15 kolumn · 5 poziomów · kolumny 05 i 12 w regałach B–G mają po 3 miejsca."
                          : `${selectedNewRackConfig.columns.length} kolumn regałowych · ${selectedNewRackConfig.levels} poziomów · ${selectedNewRackConfig.balconies.length} ${selectedNewRackConfig.balconies.length === 1 ? "balkon" : "balkony"}.`}
                      </p>
                    </div>
                  </div>
                  <div className="facade-summary">
                    {inventoryDataAvailable ? (
                      <>
                        <span>
                          <i className="slot-free" /> wolne
                        </span>
                        <span>
                          <i className="slot-taken" /> zajęte
                        </span>
                      </>
                    ) : (
                      <span>
                        <i className="slot-unknown" /> brak danych o zajętości
                      </span>
                    )}
                    <strong>
                      <b>{selectedStructuralCapacity}</b> miejsc w strukturze
                      regału
                    </strong>
                    <div className="rack-view-actions">
                      <button
                        aria-pressed={rackViewMode === "overview"}
                        className={rackViewMode === "overview" ? "active" : ""}
                        onClick={() => setRackViewMode("overview")}
                        type="button"
                      >
                        <Minimize2 /> Cały regał
                      </button>
                      <button
                        aria-pressed={rackViewMode === "readable"}
                        className={rackViewMode === "readable" ? "active" : ""}
                        onClick={() => setRackViewMode("readable")}
                        type="button"
                      >
                        <Maximize2 /> Czytelny
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  className={`rack-facade-scroll readable-rack-scroll ${rackViewMode === "overview" ? "overview-scroll" : ""}`}
                >
                  <div
                    className={`rack-facade readable-rack ${rackViewMode === "overview" ? "rack-overview" : ""} ${mapWarehouse === "main" ? "main-warehouse-facade" : ""}`}
                  >
                    <div className="facade-corner">POZIOM</div>
                    <div
                      className="column-labels"
                      style={{
                        gridTemplateColumns: `repeat(${facadeColumns.length}, 1fr)`,
                      }}
                    >
                      {facadeColumns.map((column) => (
                        <span
                          className={
                            mapWarehouse === "new" &&
                            selectedNewRackConfig.balconies.some(
                              (item) => item.column === column,
                            )
                              ? "balcony-label"
                              : ""
                          }
                          key={column}
                        >
                          {mapWarehouse === "new" &&
                          selectedNewRackConfig.balconies.some(
                            (item) => item.column === column,
                          )
                            ? "BALKON"
                            : "KOLUMNA"}{" "}
                          {String(column).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                    {facadeLevels.map((level) => (
                      <div className="facade-row" key={level}>
                        <strong>
                          <small>POZIOM</small>
                          {String(level).padStart(2, "0")}
                        </strong>
                        <div
                          style={{
                            gridTemplateColumns: `repeat(${facadeColumns.length}, 1fr)`,
                          }}
                        >
                          {facadeColumns.map((column) => {
                            const balcony =
                              mapWarehouse === "new"
                                ? selectedNewRackConfig.balconies.find(
                                    (item) => item.column === column,
                                  )
                                : undefined;
                            const regularColumn =
                              mapWarehouse === "new"
                                ? selectedNewRackConfig.columns.find(
                                    (item) => item.column === column,
                                  )
                                : undefined;
                            const slotCount =
                              mapWarehouse === "main" &&
                              selectedMainRack !== "A" &&
                              [5, 12].includes(column)
                                ? 3
                                : mapWarehouse === "main"
                                  ? 4
                                  : regularColumn?.slots || balcony?.slots || 1;
                            const cellPlaces = balcony
                              ? getBalconyPlaces(balcony, level)
                              : Array.from(
                                  { length: slotCount },
                                  (_, slotIndex) => slotIndex + 1,
                                );
                            return (
                              <div
                                className={`facade-cell ${balcony ? "balcony-cell" : ""} ${cellPlaces.length === 0 ? "unavailable" : ""}`}
                                key={column}
                              >
                                <div
                                  style={{
                                    gridTemplateColumns: `repeat(${Math.max(1, balcony?.slots || slotCount)}, 1fr)`,
                                  }}
                                >
                                  {cellPlaces.map((slot) => {
                                    const placeNumber = balcony
                                      ? slot
                                      : mapWarehouse === "main"
                                        ? level * slotCount + slot
                                        : level * slotCount + slot;
                                    const occupied = inventoryDataAvailable &&
                                      mapWarehouse === "main" &&
                                      isMainSlotOccupied(
                                        selectedMainRack,
                                        column,
                                        level,
                                        slot,
                                      );
                                    const slotState = inventoryDataAvailable
                                      ? occupied
                                        ? "taken"
                                        : "free"
                                      : "unknown";
                                    const selected =
                                      selectedMapSlot.column === column &&
                                      selectedMapSlot.level === level &&
                                      selectedMapSlot.slot === slot;
                                    const locationCode =
                                      mapWarehouse === "main"
                                        ? `${selectedMainRack}.${String(column).padStart(2, "0")}.${String(placeNumber).padStart(2, "0")}`
                                        : `${mapBlock}.${String(selectedRack).padStart(2, "0")}.${String(column).padStart(2, "0")}.${String(placeNumber).padStart(2, "0")}`;
                                    return (
                                      <button
                                        aria-label={`${locationCode} — ${slotState === "unknown" ? "brak danych" : occupied ? "zajęte" : "wolne"}`}
                                        className={`${slotState} ${selected ? "selected" : ""}`}
                                        key={slot}
                                        onClick={() => {
                                          setSelectedMapSlot({
                                            column,
                                            level,
                                            slot,
                                          });
                                          if (rackViewMode === "overview") {
                                            setRackViewMode("readable");
                                          }
                                        }}
                                        title={locationCode}
                                        type="button"
                                      >
                                        <i>
                                          {slotState === "unknown" ? (
                                            <span>—</span>
                                          ) : occupied ? (
                                            <PackageOpen />
                                          ) : (
                                            <Plus />
                                          )}
                                        </i>
                                        <span>
                                          {String(placeNumber).padStart(2, "0")}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="facade-base">
                      <span />
                      <strong>
                        {mapWarehouse === "main"
                          ? `REGAŁ ${selectedMainRack}`
                          : `REGAŁ ${mapBlock}-${String(selectedRack).padStart(2, "0")}`}
                      </strong>
                      <span />
                    </div>
                  </div>
                </div>
              </article>

              <aside className="panel location-inspector">
                <div className="inspector-heading">
                  <span>
                    <MapPin />
                  </span>
                  <div>
                    <small>WYBRANA LOKALIZACJA</small>
                    <h3>{selectedMapLocation}</h3>
                  </div>
                </div>
                <div
                  className={`location-status-card ${selectedSlotState}`}
                >
                  <span>
                    {selectedSlotState === "unknown" ? (
                      <Settings />
                    ) : selectedSlotOccupied ? (
                      <PackageOpen />
                    ) : (
                      <Check />
                    )}
                  </span>
                  <div>
                    <small>STATUS MIEJSCA</small>
                    <strong>
                      {selectedSlotState === "unknown"
                        ? "Brak danych"
                        : selectedSlotOccupied
                          ? "Zajęte"
                          : "Wolne"}
                    </strong>
                    <p>
                      {selectedSlotState === "unknown"
                        ? "Stan pojawi się po podłączeniu źródła danych."
                        : selectedSlotOccupied
                          ? "Na lokalizacji znajduje się paleta."
                          : "Miejsce jest dostępne do odłożenia."}
                    </p>
                  </div>
                </div>
                <div className="location-properties">
                  <div>
                    <span>Magazyn</span>
                    <strong>
                      {mapWarehouse === "main" ? "Główny" : "Nowy"}
                    </strong>
                  </div>
                  {mapWarehouse === "new" && (
                    <div>
                      <span>Blok</span>
                      <strong>{mapBlock}</strong>
                    </div>
                  )}
                  <div>
                    <span>Regał</span>
                    <strong>
                      {mapWarehouse === "main"
                        ? selectedMainRack
                        : String(selectedRack).padStart(2, "0")}
                    </strong>
                  </div>
                  <div>
                    <span>Kolumna</span>
                    <strong>
                      {String(selectedMapSlot.column).padStart(2, "0")}
                    </strong>
                  </div>
                  <div>
                    <span>Poziom</span>
                    <strong>
                      {mapWarehouse === "new" && selectedNewBalcony
                        ? `Balkon · ${String(selectedMapSlot.level).padStart(2, "0")}`
                        : String(selectedMapSlot.level).padStart(2, "0")}
                    </strong>
                  </div>
                  <div>
                    <span>
                      {mapWarehouse === "new" && selectedNewBalcony
                        ? "Miejsce na balkonie"
                        : "Miejsce na poziomie"}
                    </span>
                    <strong>
                      {selectedMapSlot.slot} /{" "}
                      {mapWarehouse === "main"
                        ? mainSlotsOnLevel
                        : (selectedNewBalcony
                            ? selectedNewBalcony.levelCount *
                              selectedNewBalcony.slots
                            : undefined) ||
                          selectedNewColumn?.slots ||
                          3}
                    </strong>
                  </div>
                  <div>
                    <span>Numer miejsca</span>
                    <strong>
                      {String(selectedPlaceNumber).padStart(2, "0")}
                    </strong>
                  </div>
                </div>
                {selectedSlotOccupied && selectedRackMaterial && (
                  <div
                    className={`location-content ${rackMaterialClass[selectedRackMaterial]}`}
                  >
                    <small>RODZAJ SUROWCA</small>
                    <div>
                      <span>
                        <PackageCheck />
                      </span>
                      <div>
                        <strong>{selectedRackMaterial}</strong>
                        <p>
                          {selectedLocationIds.length}{" "}
                          {selectedLocationIds.length === 1
                            ? "numer identyfikacyjny"
                            : "numery identyfikacyjne"}
                        </p>
                      </div>
                    </div>
                    <ul>
                      {selectedLocationIds.map((licensePlate) => (
                        <li key={licensePlate}>
                          <span>NI</span>
                          <strong>{licensePlate}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="barcode-preview-note">
                  <small>WARTOŚĆ KODU KRESKOWEGO</small>
                  <strong>{selectedMapLocation.replace(/^M/, "")}</strong>
                </div>
                <button
                  className="primary-button full-button"
                  onClick={() => setMapBarcodeOpen(true)}
                  type="button"
                >
                  <QrCode /> Wygeneruj kod lokalizacji
                </button>
              </aside>
            </section>
          </div>
        )}

        {activeView === "deliveries" && (
          <div className="view-stack">
            <section className="view-intro">
              <div>
                <span>NIEZALEŻNY REJESTR</span>
                <h2>Dostawy i statystyki</h2>
                <p>
                  Wpisz dostawcę i liczbę palet. Data rejestracji uzupełni się
                  automatycznie, a raport miesięczny podsumuje dostawy.
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setEditingDelivery(null);
                  setDeliveryModal(true);
                }}
                type="button"
              >
                <Plus /> Nowa dostawa
              </button>
            </section>
            <section className="delivery-kpis">
              <article>
                <span>
                  <Truck />
                </span>
                <div>
                  <small>DOSTAWY DZISIAJ</small>
                  <strong>{todayDeliveries}</strong>
                </div>
              </article>
              <article>
                <span>
                  <BarChart3 />
                </span>
                <div>
                  <small>DOSTAWY W MIESIĄCU</small>
                  <strong>{monthlyDeliveries.length}</strong>
                </div>
              </article>
              <article>
                <span>
                  <ClipboardList />
                </span>
                <div>
                  <small>DOSTAWCY W MIESIĄCU</small>
                  <strong>{deliverySupplierStats.length}</strong>
                </div>
              </article>
              <article>
                <span>
                  <PackageOpen />
                </span>
                <div>
                  <small>PALETY W MIESIĄCU</small>
                  <strong>
                    {monthlyDeliveries.reduce(
                      (sum, item) => sum + item.pallets,
                      0,
                    )}
                  </strong>
                </div>
              </article>
            </section>
            <section className="panel delivery-month-report">
              <div className="panel-heading">
                <div>
                  <span>STATYSTYKI MIESIĘCZNE</span>
                  <h3>Dostawy według dostawcy</h3>
                </div>
                <div className="delivery-report-actions">
                  <label>
                    <span>Miesiąc</span>
                    <input
                      onChange={(event) => setDeliveryMonth(event.target.value)}
                      type="month"
                      value={deliveryMonth}
                    />
                  </label>
                  <button
                    className="secondary-button"
                    disabled={monthlyDeliveries.length === 0}
                    onClick={() => setReportOpen(true)}
                    type="button"
                  >
                    <FileText /> Raport miesiąca
                  </button>
                </div>
              </div>
              <div>
                {deliverySupplierStats.map(([supplier, count]) => (
                  <div className="supplier-stat-row" key={supplier}>
                    <span>{supplier}</span>
                    <div>
                      <i
                        style={{
                          width: `${(count / Math.max(1, deliverySupplierStats[0]?.[1] || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {count} {count === 1 ? "dostawa" : "dostawy"}
                    </strong>
                  </div>
                ))}
                {deliverySupplierStats.length === 0 && (
                  <div className="empty-report-state">
                    <strong>Brak dostaw w wybranym miesiącu</strong>
                    <span>Wybierz inny okres albo dodaj pierwszą dostawę.</span>
                  </div>
                )}
              </div>
            </section>
            <article className="panel deliveries-panel">
              <div className="delivery-toolbar">
                <div>
                  <span>REJESTR INFORMACYJNY</span>
                  <h3>Dostawy</h3>
                </div>
                <div>
                  <label className="search-field">
                    <Search />
                    <input
                      onChange={(event) =>
                        setDeliverySearch(event.target.value)
                      }
                      placeholder="Szukaj dostawy..."
                      value={deliverySearch}
                    />
                  </label>
                </div>
              </div>
              <div className="delivery-list">
                {filteredDeliveries.map((delivery) => (
                  <article key={delivery.id}>
                    <div className="delivery-main">
                      <span className="delivery-icon">
                        <Truck />
                      </span>
                      <div>
                        <div className="delivery-title">
                          <strong>{delivery.supplier}</strong>
                          <span>{delivery.id}</span>
                        </div>
                        <p>
                          {delivery.pallets} palet
                        </p>
                      </div>
                    </div>
                    <time>{formatDeliveryDate(delivery.date)}</time>
                    <div className="row-actions">
                      <button onClick={() => openEdit(delivery)} type="button">
                        Edytuj
                      </button>
                      <button
                        aria-label={`Usuń ${delivery.id}`}
                        className="delete-button"
                        onClick={() => setDeliveryToDelete(delivery.id)}
                        type="button"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                ))}
                {filteredDeliveries.length === 0 && (
                  <div className="empty-delivery-state">
                    <Search />
                    <strong>
                      {deliveries.length === 0
                        ? "Brak zarejestrowanych dostaw"
                        : "Brak pasujących dostaw"}
                    </strong>
                    <p>
                      {deliveries.length === 0
                        ? "Dodaj pierwszą dostawę przyciskiem u góry."
                        : "Zmień miesiąc lub wyszukiwaną frazę."}
                    </p>
                  </div>
                )}
              </div>
            </article>
          </div>
        )}

        {activeView === "suppliers" && (
          <div className="view-stack">
            <section className="view-intro supplier-intro">
              <div>
                <span>KARTOTEKA DOSTAWCÓW</span>
                <h2>Automaty surowców</h2>
                <p>
                  Jeden wpis wystarczy, aby przy każdej dostawie rodzaj surowca
                  uzupełniał się automatycznie.
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => openSupplierForm()}
                type="button"
              >
                <Plus /> Dodaj dostawcę
              </button>
            </section>
            <section className="supplier-summary">
              <article>
                <span className="supplier-summary-icon">
                  <BookOpen />
                </span>
                <div>
                  <small>WSZYSTKIE WPISY</small>
                  <strong>{supplierCatalog.length}</strong>
                  <p>dostawców w kartotece</p>
                </div>
              </article>
              <article>
                <span className="supplier-summary-icon success">
                  <Check />
                </span>
                <div>
                  <small>AKTYWNE AUTOMATY</small>
                  <strong>
                    {
                      supplierCatalog.filter((supplier) => supplier.active)
                        .length
                    }
                  </strong>
                  <p>działa przy nowych dostawach</p>
                </div>
              </article>
              <article>
                <span className="supplier-summary-icon muted">
                  <Power />
                </span>
                <div>
                  <small>WYŁĄCZONE</small>
                  <strong>
                    {
                      supplierCatalog.filter((supplier) => !supplier.active)
                        .length
                    }
                  </strong>
                  <p>zachowane w kartotece</p>
                </div>
              </article>
            </section>
            <article className="panel supplier-master-panel">
              <div className="supplier-toolbar">
                <div>
                  <span>BAZA POWIĄZAŃ</span>
                  <h3>Dostawca → rodzaj surowca</h3>
                  <p>
                    Edytuj przypisanie albo wyłącz automat bez usuwania
                    dostawcy.
                  </p>
                </div>
                <label className="search-field">
                  <Search />
                  <input
                    onChange={(event) => setSupplierSearch(event.target.value)}
                    placeholder="Szukaj dostawcy lub surowca..."
                    value={supplierSearch}
                  />
                </label>
              </div>
              <div className="supplier-list">
                {filteredSuppliers.map((supplier) => (
                  <article
                    className={!supplier.active ? "inactive" : ""}
                    key={supplier.id}
                  >
                    <span className="supplier-monogram">
                      {supplier.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="supplier-name">
                      <strong>{supplier.name}</strong>
                      <small>
                        ID kartoteki · SUP-
                        {String(supplier.id).padStart(3, "0")}
                      </small>
                    </div>
                    <div className="supplier-mapping">
                      <small>AUTOMATYCZNY SUROWIEC</small>
                      <span className="material-chip">
                        <i
                          style={{
                            background: materialColors[supplier.material],
                          }}
                        />
                        {supplier.material}
                      </span>
                    </div>
                    <span
                      className={`supplier-state ${supplier.active ? "active" : ""}`}
                    >
                      <i />
                      {supplier.active ? "Aktywny" : "Wyłączony"}
                    </span>
                    <div className="supplier-actions">
                      <button
                        onClick={() => openSupplierForm(supplier)}
                        type="button"
                      >
                        <Pencil /> Edytuj
                      </button>
                      <button
                        aria-label={
                          supplier.active
                            ? `Wyłącz automat ${supplier.name}`
                            : `Włącz automat ${supplier.name}`
                        }
                        className="power-button"
                        onClick={() => toggleSupplier(supplier.id)}
                        type="button"
                      >
                        <Power />
                      </button>
                    </div>
                  </article>
                ))}
                {filteredSuppliers.length === 0 && (
                  <div className="empty-suppliers">
                    <Search />
                    <strong>
                      {supplierCatalog.length === 0
                        ? "Kartoteka dostawców jest pusta"
                        : "Brak pasujących wpisów"}
                    </strong>
                    <p>
                      {supplierCatalog.length === 0
                        ? "Dodaj pierwszego dostawcę i przypisz rodzaj surowca."
                        : "Zmień wyszukiwaną frazę."}
                    </p>
                  </div>
                )}
              </div>
            </article>
          </div>
        )}

        {activeView === "barcodes" && (
          <div className="view-stack">
            <section className="view-intro">
              <div>
                <span>KODY KRESKOWE</span>
                <h2>Generator dla magazynu</h2>
                <p>
                  Wybierz kody konkretnego ładunku albo wygeneruj kod
                  lokalizacji magazynowej.
                </p>
              </div>
              <StatusBadge tone="info">Oczekuje na dane ładunków</StatusBadge>
            </section>
            <div className="barcode-tabs">
              <button
                className={barcodeTab === "load" ? "active" : ""}
                onClick={() => setBarcodeTab("load")}
                type="button"
              >
                <QrCode /> Kody ładunku
                <small>Ładunki i zamówienia</small>
              </button>
              <button
                className={barcodeTab === "location" ? "active" : ""}
                onClick={() => setBarcodeTab("location")}
                type="button"
              >
                <MapPin /> Kod lokalizacji
                <small>Generator z aplikacji tabletowej</small>
              </button>
            </div>
            {barcodeTab === "load" ? (
              <section className="barcode-layout">
                <article className="panel load-search-panel">
                  <span>WYSZUKIWANIE ŁADUNKU</span>
                  <h3>Znajdź strukturę pakowania</h3>
                  <p>
                    Wystarczy uzupełnić jedno pole. Gdy nie ma numeru ładunku,
                    wyszukaj po zamówieniu zakupu albo dostawcy.
                  </p>
                  <form className="load-search-form" onSubmit={searchLoad}>
                    <label>
                      Numer ładunku
                      <input
                        autoCapitalize="characters"
                        onChange={(event) => {
                          setLoadId(event.target.value);
                          setPurchaseOrder("");
                          setLoadSupplier("");
                        }}
                        placeholder="Wpisz numer ładunku"
                        value={loadId}
                      />
                    </label>
                    <div className="search-divider">
                      <span>lub</span>
                    </div>
                    <label>
                      Zamówienie zakupu
                      <input
                        autoCapitalize="characters"
                        onChange={(event) => {
                          setPurchaseOrder(event.target.value);
                          setLoadId("");
                          setLoadSupplier("");
                        }}
                        placeholder="Wpisz numer zamówienia"
                        value={purchaseOrder}
                      />
                    </label>
                    <div className="search-divider">
                      <span>lub</span>
                    </div>
                    <label>
                      Dostawca
                      <input
                        list="load-suppliers"
                        onChange={(event) => {
                          setLoadSupplier(event.target.value);
                          setLoadId("");
                          setPurchaseOrder("");
                        }}
                        placeholder="Wpisz lub wybierz dostawcę"
                        value={loadSupplier}
                      />
                      <datalist id="load-suppliers">
                        {suppliers.map((supplier) => (
                          <option key={supplier} value={supplier} />
                        ))}
                      </datalist>
                    </label>
                    <button
                      className="primary-button full-button"
                      type="submit"
                    >
                      <Search /> Wyszukaj i pobierz kody
                    </button>
                  </form>
                  <div className="connection-note">
                    <span>
                      <Settings />
                    </span>
                    <div>
                      <strong>Źródło danych</strong>
                      <p>
                        Dane ładunków nie są jeszcze podłączone. Po integracji
                        zostaną pobrane z przygotowanego źródła D365.
                      </p>
                    </div>
                  </div>
                </article>
                <article
                  className={`panel barcode-results print-area ${loadNotFound ? "load-missing" : ""}`}
                >
                  <div className="panel-heading">
                    <div>
                      <span>STRUKTURA PAKOWANIA</span>
                      <h3>{searchedLoad}</h3>
                    </div>
                    <button
                      className="secondary-button no-print"
                      onClick={() => window.print()}
                      type="button"
                    >
                      <Printer /> Drukuj wszystkie
                    </button>
                  </div>
                  {loadNotFound ? (
                    <div className="missing-load-card">
                      <span>
                        <Mail />
                      </span>
                      <h3>Nie znaleziono ładunku</h3>
                      <p>
                        Wpisana wartość: <strong>{searchedLoad}</strong>. Możesz
                        od razu przygotować wiadomość do logistyki z tym
                        numerem.
                      </p>
                      <button
                        className="primary-button"
                        onClick={reportMissingLoad}
                        type="button"
                      >
                        <Mail /> Zgłoś brak do logistyki
                      </button>
                      <small>
                        Jeżeli numer powinien istnieć, wyślij gotowe zgłoszenie
                        do logistyki albo sprawdź inną wartość.
                      </small>
                    </div>
                  ) : (
                    <>
                      <div className="result-summary">
                        <span>
                          <PackageCheck />
                        </span>
                        <div>
                          <strong>
                            {loadCodes.length
                              ? `${loadCodes.length} kody gotowe`
                              : "Wprowadź dane do wyszukania"}
                          </strong>
                          <p>
                            {loadCodes.length
                              ? "Tylko identyfikatory LicensePlateId z tego ładunku"
                              : "Możesz wyszukać po jednym z trzech pól."}
                          </p>
                        </div>
                        {loadCodes.length > 0 && (
                          <StatusBadge tone="success">
                            <Check /> Gotowe
                          </StatusBadge>
                        )}
                      </div>
                      <div className="barcode-list">
                        {loadCodes.map((code, index) => (
                          <div key={code}>
                            <span className="barcode-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Barcode compact value={code} />
                            <button
                              className="no-print"
                              onClick={() => {
                                navigator.clipboard?.writeText(code);
                                setToast(`Skopiowano ${code}.`);
                              }}
                              type="button"
                            >
                              Kopiuj
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              </section>
            ) : (
              <section className="location-layout">
                <article className="panel location-picker">
                  <div className="panel-heading location-picker-heading">
                    <div>
                      <span>WYBIERZ LOKALIZACJĘ</span>
                      <h3>{visualLocationCode}</h3>
                    </div>
                    <button
                      className="secondary-button use-map-location"
                      onClick={() =>
                        setLocation(
                          normalizeGeneratorLocation(
                            mapWarehouse === "main"
                              ? {
                                  warehouse: "main",
                                  block: location.block,
                                  rack: selectedMainRack,
                                  column: selectedMapSlot.column,
                                  place: selectedPlaceNumber,
                                }
                              : {
                                  warehouse: "new",
                                  block: mapBlock,
                                  rack: String(selectedRack).padStart(2, "0"),
                                  column: selectedMapSlot.column,
                                  place: selectedPlaceNumber,
                                },
                          ),
                        )
                      }
                      type="button"
                    >
                      <MapPin /> Użyj miejsca z mapy
                    </button>
                  </div>
                  <div className="picker-step">
                    <label>1. Magazyn</label>
                    <div className="touch-grid two">
                      {(["main", "new"] as MapWarehouse[]).map((value) => (
                        <button
                          className={location.warehouse === value ? "active" : ""}
                          key={value}
                          onClick={() =>
                            updateGeneratorLocation(
                              value === "main"
                                ? {
                                    warehouse: "main",
                                    rack: "A",
                                    column: 1,
                                    place: 1,
                                  }
                                : {
                                    warehouse: "new",
                                    block: "M1",
                                    rack: "01",
                                    column: 1,
                                    place: 1,
                                  },
                            )
                          }
                          type="button"
                        >
                          {value === "main" ? "Magazyn główny" : "Nowy magazyn"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {location.warehouse === "new" && (
                    <div className="picker-step">
                      <label>2. Blok</label>
                      <div className="touch-grid three">
                        {(["M1", "M2", "M3"] as NewBlock[]).map((value) => (
                          <button
                            className={location.block === value ? "active" : ""}
                            key={value}
                            onClick={() =>
                              updateGeneratorLocation({
                                block: value,
                                rack: "01",
                                column: 1,
                                place: 1,
                              })
                            }
                            type="button"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="picker-step">
                    <label>{location.warehouse === "new" ? "3" : "2"}. Regał</label>
                    <div className="touch-grid six">
                      {(location.warehouse === "main"
                        ? mainRacks
                        : Array.from(
                            { length: rackCounts[location.block] },
                            (_, index) => String(index + 1).padStart(2, "0"),
                          )
                      ).map((value) => (
                        <button
                          className={location.rack === value ? "active" : ""}
                          key={value}
                          onClick={() =>
                            updateGeneratorLocation({
                              rack: value,
                              place: 1,
                            })
                          }
                          type="button"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="picker-step">
                    <label>{location.warehouse === "new" ? "4" : "3"}. Kolumna</label>
                    <div className="touch-grid six location-columns">
                      {generatorColumns.map((value) => (
                        <button
                          className={location.column === value ? "active" : ""}
                          key={value}
                          onClick={() =>
                            updateGeneratorLocation({ column: value, place: 1 })
                          }
                          type="button"
                        >
                          {String(value).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="picker-row generator-place-row">
                    <label>
                      {location.warehouse === "new" ? "5" : "4"}. Miejsce
                      <input
                        max={generatorMaxPlace}
                        min="1"
                        onChange={(event) =>
                          updateGeneratorLocation({
                            place: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={location.place}
                      />
                    </label>
                    <div className="location-validation">
                      <Check />
                      <span>
                        Dozwolony zakres: 01–
                        {String(generatorMaxPlace).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </article>
                <article className="panel location-result print-area">
                  <div className="location-path">
                    <span>
                      {location.warehouse === "main"
                        ? "Magazyn główny"
                        : `Blok ${location.block}`}
                    </span>
                    <ChevronRight />
                    <span>Regał {location.rack}</span>
                    <ChevronRight />
                    <span>
                      Kolumna {String(location.column).padStart(2, "0")}
                    </span>
                    <ChevronRight />
                    <span>
                      Miejsce {String(location.place).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="large-barcode">
                    <span>KOD LOKALIZACJI</span>
                    <Barcode value={locationBarcodeValue} />
                  </div>
                  <div className="barcode-value-note">
                    <small>Widok lokalizacji</small>
                    <strong>{visualLocationCode}</strong>
                  </div>
                  <button
                    className="primary-button no-print"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <Printer /> Drukuj kod lokalizacji
                  </button>
                </article>
              </section>
            )}
          </div>
        )}

        {activeView === "schedule" && <ScheduleModule />}

        {activeView === "cleaning" && <CleaningModule />}

        <footer>
          <span>Warehouse Masterpress · system magazynowy</span>
          <span>Wersja operacyjna · gotowa do integracji danych</span>
        </footer>
      </section>

      <button
        aria-label={wakeMode ? "Wyłącz czuwanie VIKI" : "Włącz czuwanie VIKI"}
        aria-pressed={wakeMode}
        className={`voice-assistant-trigger ${wakeMode ? "active" : ""} ${vikiAwake ? "awake" : ""} ${voiceSpeaking ? "speaking" : ""}`}
        onClick={wakeMode ? stopWakeMode : startWakeMode}
        title={wakeMode ? "VIKI czuwa — kliknij, aby wyłączyć" : "Kliknij, aby włączyć VIKI"}
        type="button"
      >
        <Mic />
        <span>VIKI</span>
        <i aria-hidden="true" />
      </button>

      {deliveryModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDeliveryModal(false);
          }}
        >
          <div aria-modal="true" className="modal delivery-modal" role="dialog">
            <div className="modal-heading">
              <div>
                <span>
                  {editingDelivery ? "EDYCJA ZGŁOSZENIA" : "MOBILNY REJESTR"}
                </span>
                <h2>
                  {editingDelivery
                    ? `Dostawa ${editingDelivery}`
                    : "Nowa dostawa"}
                </h2>
                <p>
                  Wprowadź wyłącznie dostawcę i liczbę przyjętych palet.
                </p>
              </div>
              <button
                aria-label="Zamknij"
                onClick={() => setDeliveryModal(false)}
                type="button"
              >
                <X />
              </button>
            </div>
            <form className="form-stack" onSubmit={saveDelivery}>
              <label>
                Dostawca
                <input
                  defaultValue={edited?.supplier}
                  list="delivery-supplier-list"
                  name="supplier"
                  placeholder="Wpisz nazwę dostawcy"
                  required
                />
                <datalist id="delivery-supplier-list">
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier} />
                  ))}
                </datalist>
              </label>
              <label>
                Liczba palet
                <input
                  defaultValue={edited?.pallets}
                  min="1"
                  name="pallets"
                  placeholder="0"
                  required
                  type="number"
                />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setDeliveryModal(false)}
                  type="button"
                >
                  Anuluj
                </button>
                <button className="primary-button" type="submit">
                  <Check />{" "}
                  {editingDelivery ? "Zapisz zmiany" : "Zarejestruj dostawę"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deliveryToDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDeliveryToDelete(null);
          }}
        >
          <div
            aria-modal="true"
            className="modal confirm-modal"
            role="alertdialog"
          >
            <div className="confirm-icon">
              <Trash2 />
            </div>
            <h2>Usunąć dostawę {deliveryToDelete}?</h2>
            <p>
              Wpis zniknie z rejestru i raportu miesięcznego. Operacja wymaga
              świadomego potwierdzenia.
            </p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setDeliveryToDelete(null)}
                type="button"
              >
                Anuluj
              </button>
              <button
                className="danger-button"
                onClick={() => deleteDelivery(deliveryToDelete)}
                type="button"
              >
                <Trash2 /> Usuń wpis
              </button>
            </div>
          </div>
        </div>
      )}

      {supplierModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target)
              setSupplierModalOpen(false);
          }}
        >
          <div aria-modal="true" className="modal supplier-modal" role="dialog">
            <div className="modal-heading">
              <div>
                <span>KARTOTEKA DOSTAWCÓW</span>
                <h2>{editedSupplier ? "Edytuj automat" : "Nowy dostawca"}</h2>
                <p>
                  Przypisany surowiec będzie uzupełniany automatycznie w
                  formularzu dostawy.
                </p>
              </div>
              <button
                aria-label="Zamknij"
                onClick={() => setSupplierModalOpen(false)}
                type="button"
              >
                <X />
              </button>
            </div>
            <form className="form-stack" onSubmit={saveSupplier}>
              <label>
                Nazwa dostawcy
                <input
                  autoFocus
                  defaultValue={editedSupplier?.name}
                  name="name"
                  placeholder="Wpisz nazwę dostawcy"
                  required
                />
              </label>
              <label>
                Automatyczny rodzaj surowca
                <select
                  defaultValue={editedSupplier?.material || "Papier"}
                  name="material"
                >
                  {(Object.keys(materialColors) as MaterialName[]).map(
                    (material) => (
                      <option key={material}>{material}</option>
                    ),
                  )}
                </select>
                <ChevronDown />
              </label>
              <div className="supplier-modal-note">
                <Sparkles />
                <div>
                  <strong>Mniej wpisywania przy dostawie</strong>
                  <p>
                    Po wybraniu tego dostawcy magazynier nie będzie musiał
                    osobno określać rodzaju surowca.
                  </p>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setSupplierModalOpen(false)}
                  type="button"
                >
                  Anuluj
                </button>
                <button className="primary-button" type="submit">
                  <Check />{" "}
                  {editedSupplier ? "Zapisz zmiany" : "Dodaj do kartoteki"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mapBarcodeOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setMapBarcodeOpen(false);
          }}
        >
          <div
            aria-modal="true"
            className="modal map-barcode-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <span>KOD LOKALIZACJI</span>
                <h2>{selectedMapLocation}</h2>
              </div>
              <button
                aria-label="Zamknij"
                onClick={() => setMapBarcodeOpen(false)}
                type="button"
              >
                <X />
              </button>
            </div>
            <div className="map-modal-barcode">
              <Barcode value={selectedMapLocation.replace(/^M/, "")} />
            </div>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setMapBarcodeOpen(false)}
                type="button"
              >
                Zamknij
              </button>
              <button
                className="primary-button"
                onClick={() => window.print()}
                type="button"
              >
                <Printer /> Drukuj kod
              </button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setReportOpen(false);
          }}
        >
          <div
            aria-modal="true"
            className="modal professional-report-modal"
            role="dialog"
          >
            <div className="report-window-actions no-print">
              <button
                className="secondary-button"
                onClick={() => setReportOpen(false)}
                type="button"
              >
                Zamknij
              </button>
              <button
                className="primary-button"
                onClick={() => window.print()}
                type="button"
              >
                <Printer /> Drukuj raport
              </button>
            </div>
            <div className="print-document professional-report">
              <header className="document-header">
                {/* Logo musi pozostać zwykłym elementem img w dokumencie do druku. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Masterpress"
                  src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`}
                />
                <div>
                  <span>WAREHOUSE MASTERPRESS</span>
                  <h2>Miesięczny raport dostaw</h2>
                  <p>
                    Okres: <strong>{reportMonth}</strong>
                  </p>
                </div>
                <aside>
                  <span>Data wygenerowania</span>
                  <strong>{reportGeneratedAt}</strong>
                  <small>Dokument informacyjny</small>
                </aside>
              </header>
              <section className="document-kpis">
                <div>
                  <span>Liczba dostaw</span>
                  <strong>{monthlyDeliveries.length}</strong>
                </div>
                <div>
                  <span>Łącznie palet</span>
                  <strong>
                    {monthlyDeliveries.reduce(
                      (sum, item) => sum + item.pallets,
                      0,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Liczba dostawców</span>
                  <strong>{deliverySupplierDetails.length}</strong>
                </div>
              </section>
              <section className="document-section">
                <div className="document-section-title">
                  <span>01</span>
                  <div>
                    <h3>Podsumowanie według dostawcy</h3>
                    <p>Liczba przyjęć oraz palet w raportowanym okresie.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Dostawca</th>
                      <th>Liczba dostaw</th>
                      <th>Liczba palet</th>
                      <th>Udział dostaw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverySupplierDetails.map((item) => (
                      <tr key={item.supplier}>
                        <td>
                          <strong>{item.supplier}</strong>
                        </td>
                        <td>{item.deliveries}</td>
                        <td>{item.pallets}</td>
                        <td>
                          {Math.round(
                            (item.deliveries /
                              Math.max(1, monthlyDeliveries.length)) *
                              100,
                          )}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="document-section">
                <div className="document-section-title">
                  <span>02</span>
                  <div>
                    <h3>Rejestr dostaw</h3>
                    <p>Szczegółowe wpisy uwzględnione w raporcie.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Numer</th>
                      <th>Dostawca</th>
                      <th>Palety</th>
                      <th>Termin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyDeliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>
                          <strong>{delivery.id}</strong>
                        </td>
                        <td>{delivery.supplier}</td>
                        <td>{delivery.pallets}</td>
                        <td>{formatDeliveryDate(delivery.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <footer className="document-footer">
                <span>Masterpress S.A. · Raport operacyjny magazynu</span>
                <span>Warehouse Masterpress</span>
              </footer>
            </div>
          </div>
        </div>
      )}

      {stockReportOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setStockReportOpen(false);
          }}
        >
          <div
            aria-modal="true"
            className="modal professional-report-modal"
            role="dialog"
          >
            <div className="report-window-actions no-print">
              <button
                className="secondary-button"
                onClick={() => setStockReportOpen(false)}
                type="button"
              >
                Zamknij
              </button>
              <button
                className="primary-button"
                onClick={() => window.print()}
                type="button"
              >
                <Printer /> Drukuj raport
              </button>
            </div>
            <div className="print-document professional-report">
              <header className="document-header">
                {/* Logo musi pozostać zwykłym elementem img w dokumencie do druku. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Masterpress"
                  src={`${import.meta.env.BASE_URL}masterpress-logo-dark.png`}
                />
                <div>
                  <span>WAREHOUSE MASTERPRESS</span>
                  <h2>Raport stanu zapasów</h2>
                  <p>
                    Stan na dzień: <strong>{reportGeneratedAt}</strong>
                  </p>
                </div>
                <aside>
                  <span>Źródło danych</span>
                  <strong>
                    {inventoryDataAvailable
                      ? "Aplikacja magazynowa"
                      : "Niepodłączone"}
                  </strong>
                  <small>
                    {inventoryDataAvailable
                      ? "Dane bieżące"
                      : "Oczekiwanie na integrację"}
                  </small>
                </aside>
              </header>
              <section className="document-kpis four">
                <div>
                  <span>Zajęte miejsca</span>
                  <strong>{inventoryDataAvailable ? totalPallets : "—"}</strong>
                </div>
                <div>
                  <span>Pojemność</span>
                  <strong>{capacities.A + capacities.B}</strong>
                </div>
                <div>
                  <span>Wolne miejsca</span>
                  <strong>
                    {inventoryDataAvailable
                      ? capacities.A + capacities.B - totalPallets
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Wykorzystanie</span>
                  <strong>
                    {inventoryDataAvailable
                      ? `${Math.round(
                          (totalPallets / (capacities.A + capacities.B)) * 100,
                        )}%`
                      : "—"}
                  </strong>
                </div>
              </section>
              <section className="document-section">
                <div className="document-section-title">
                  <span>01</span>
                  <div>
                    <h3>Wykorzystanie magazynów</h3>
                    <p>Zestawienie zajętych i wolnych miejsc paletowych.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Magazyn</th>
                      <th>Zajęte</th>
                      <th>Wolne</th>
                      <th>Pojemność</th>
                      <th>Wykorzystanie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["A", "B"] as WarehouseKey[]).map((warehouse) => (
                      <tr key={warehouse}>
                        <td>
                          <strong>{warehouseNames[warehouse]}</strong>
                        </td>
                        <td>
                          {inventoryDataAvailable ? warehouses[warehouse] : "Brak danych"}
                        </td>
                        <td>
                          {inventoryDataAvailable
                            ? capacities[warehouse] - warehouses[warehouse]
                            : "Brak danych"}
                        </td>
                        <td>{capacities[warehouse]}</td>
                        <td>
                          {inventoryDataAvailable
                            ? `${Math.round(
                                (warehouses[warehouse] / capacities[warehouse]) *
                                  100,
                              )}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="document-section">
                <div className="document-section-title">
                  <span>02</span>
                  <div>
                    <h3>Struktura Nowego magazynu</h3>
                    <p>Pojemność docelowej mapy według bloków.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Blok</th>
                      <th>Liczba regałów</th>
                      <th>Zajęte</th>
                      <th>Wolne</th>
                      <th>Pojemność</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["M1", "M2", "M3"] as NewBlock[]).map((block) => {
                      const occupied = rackCapacity[block].reduce(
                        (sum, [, value]) => sum + value,
                        0,
                      );
                      const capacity = rackCapacity[block].reduce(
                        (sum, [, , value]) => sum + value,
                        0,
                      );
                      return (
                        <tr key={block}>
                          <td>
                            <strong>{block}</strong>
                          </td>
                          <td>{rackCapacity[block].length}</td>
                          <td>{inventoryDataAvailable ? occupied : "Brak danych"}</td>
                          <td>
                            {inventoryDataAvailable
                              ? capacity - occupied
                              : "Brak danych"}
                          </td>
                          <td>{capacity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
              <section className="document-section">
                <div className="document-section-title">
                  <span>03</span>
                  <div>
                    <h3>Struktura surowców</h3>
                    <p>Liczba palet według grupy materiałowej.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Rodzaj surowca</th>
                      <th>Liczba palet</th>
                      <th>Udział</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryDataAvailable ? (
                      (Object.entries(materials) as [MaterialName, number][]).map(
                        ([material, value]) => (
                          <tr key={material}>
                            <td>
                              <strong>{material}</strong>
                            </td>
                            <td>{value}</td>
                            <td>
                              {totalPallets > 0
                                ? `${Math.round((value / totalPallets) * 100)}%`
                                : "0%"}
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      <tr>
                        <td colSpan={3}>Brak danych — oczekiwanie na integrację.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              <footer className="document-footer">
                <span>Masterpress S.A. · Raport operacyjny magazynu</span>
                <span>Warehouse Masterpress</span>
              </footer>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div aria-live="polite" className="toast" role="status">
          <span>
            <Check />
          </span>
          {toast}
        </div>
      )}
    </main>
  );
}
