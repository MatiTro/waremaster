export type WarehouseKey = "A" | "B";
export type MapWarehouse = "main" | "new";
export type MainRack = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type NewBlock = "M1" | "M2" | "M3";
export type MaterialName =
  | "Papier"
  | "Folia"
  | "Karton"
  | "Tuleje"
  | "Inne";
export type RackMaterial = Exclude<MaterialName, "Inne">;

export type BalconyColumn = {
  column: number;
  startLevel: number;
  levelCount: number;
  slots: number;
};

export type NewRackConfig = {
  levels: number;
  columns: { column: number; slots: number }[];
  balconies: BalconyColumn[];
  capacity: number;
};

export type RackStats = {
  warehouse: MapWarehouse;
  block?: NewBlock;
  rack: MainRack | number;
  occupied: number;
  free: number;
  capacity: number;
};

export type ResolvedLocation = {
  column: number;
  level: number;
  slot: number;
  place: number;
};

export const warehouseNames: Record<WarehouseKey, string> = {
  A: "Magazyn główny",
  B: "Nowy magazyn",
};

export const materialColors: Record<MaterialName, string> = {
  Papier: "#002855",
  Folia: "#6750a4",
  Karton: "#a76715",
  Tuleje: "#177a78",
  Inne: "#d7e1e9",
};

export const rackMaterials: RackMaterial[] = [
  "Papier",
  "Folia",
  "Karton",
  "Tuleje",
];

// Do czasu podłączenia bazy aplikacja zna wyłącznie strukturę magazynów.
// Brak danych nie może być interpretowany jako wolna lub zajęta lokalizacja.
export const inventoryDataAvailable = false;

export const mainRacks: MainRack[] = ["A", "B", "C", "D", "E", "F", "G"];

export const mainRackCapacity: Record<MainRack, number> = {
  A: 300,
  B: 290,
  C: 290,
  D: 290,
  E: 290,
  F: 290,
  G: 290,
};

export const rackCounts: Record<NewBlock, number> = {
  M1: 21,
  M2: 11,
  M3: 10,
};

export function getMainRackNumber(rack: MainRack): number {
  return rack.charCodeAt(0) - 64;
}

// Stan lokalizacji zostanie zwrócony przez API po podłączeniu bazy.
export function isMainSlotOccupied(
  rack: MainRack,
  column: number,
  level: number,
  slot: number,
): boolean {
  void rack;
  void column;
  void level;
  void slot;
  return false;
}

export function getMainSlotsPerLevel(rack: MainRack, column: number): number {
  return rack !== "A" && [5, 12].includes(column) ? 3 : 4;
}

export function getMainRackStats(rack: MainRack) {
  let occupied = 0;
  for (let column = 1; column <= 15; column += 1) {
    const slots = getMainSlotsPerLevel(rack, column);
    for (let level = 0; level <= 4; level += 1) {
      for (let slot = 1; slot <= slots; slot += 1) {
        if (isMainSlotOccupied(rack, column, level, slot)) occupied += 1;
      }
    }
  }
  return { occupied, free: mainRackCapacity[rack] - occupied };
}

export function getNewRackConfig(
  block: NewBlock,
  rack: number,
): NewRackConfig {
  if (block === "M1") {
    const columns = Array.from({ length: 5 }, (_, index) => ({
      column: index + 1,
      slots: 4,
    }));
    const balconies =
      rack === 1
        ? []
        : [
            { column: 0, startLevel: 3, levelCount: 4, slots: 1 },
            { column: 6, startLevel: 2, levelCount: 5, slots: 1 },
          ];
    return {
      levels: 7,
      columns,
      balconies,
      capacity:
        140 +
        balconies.reduce(
          (sum, item) => sum + item.levelCount * item.slots,
          0,
        ),
    };
  }

  if (block === "M2") {
    const columns = Array.from({ length: 7 }, (_, index) => ({
      column: index + 1,
      slots: index === 0 ? 2 : 3,
    }));
    const balconies =
      rack === 11
        ? [{ column: 0, startLevel: 4, levelCount: 4, slots: 3 }]
        : [
            { column: 0, startLevel: 4, levelCount: 4, slots: 1 },
            { column: 8, startLevel: 2, levelCount: 6, slots: 1 },
          ];
    return {
      levels: 8,
      columns,
      balconies,
      capacity:
        160 +
        balconies.reduce(
          (sum, item) => sum + item.levelCount * item.slots,
          0,
        ),
    };
  }

  const columns = Array.from({ length: 7 }, (_, index) => ({
    column: index + 1,
    slots: index === 0 ? 2 : 3,
  }));

  if (rack === 1) {
    return {
      levels: 7,
      columns,
      balconies: [{ column: 0, startLevel: 3, levelCount: 4, slots: 3 }],
      capacity: 152,
    };
  }

  if (rack === 10) {
    return {
      levels: 6,
      columns,
      balconies: [{ column: 0, startLevel: 3, levelCount: 3, slots: 3 }],
      capacity: 129,
    };
  }

  return {
    levels: 8,
    columns,
    balconies: [
      { column: 0, startLevel: 4, levelCount: 4, slots: 1 },
      { column: 8, startLevel: 2, levelCount: 6, slots: 1 },
    ],
    capacity: 170,
  };
}

export function getBalconyPlaces(
  balcony: BalconyColumn,
  level: number,
): number[] {
  if (
    level < balcony.startLevel ||
    level >= balcony.startLevel + balcony.levelCount
  ) {
    return [];
  }
  const offset = (level - balcony.startLevel) * balcony.slots;
  return Array.from(
    { length: balcony.slots },
    (_, index) => offset + index + 1,
  );
}

export const rackCapacity = Object.fromEntries(
  (Object.keys(rackCounts) as NewBlock[]).map((block) => [
    block,
    Array.from({ length: rackCounts[block] }, (_, index) => {
      const rack = index + 1;
      const capacity = getNewRackConfig(block, rack).capacity;
      const occupied = 0;
      return [rack, occupied, capacity] as [number, number, number];
    }),
  ]),
) as Record<NewBlock, [number, number, number][]>;

export const capacities: Record<WarehouseKey, number> = {
  A: Object.values(mainRackCapacity).reduce((sum, value) => sum + value, 0),
  B: (Object.keys(rackCapacity) as NewBlock[]).reduce(
    (sum, block) =>
      sum + rackCapacity[block].reduce((blockSum, [, , value]) => blockSum + value, 0),
    0,
  ),
};

export function getAllRackStats(): RackStats[] {
  const main = mainRacks.map((rack) => {
    const stats = getMainRackStats(rack);
    return {
      warehouse: "main" as const,
      rack,
      occupied: stats.occupied,
      free: stats.free,
      capacity: mainRackCapacity[rack],
    };
  });
  const modern = (Object.keys(rackCapacity) as NewBlock[]).flatMap((block) =>
    rackCapacity[block].map(([rack, occupied, capacity]) => ({
      warehouse: "new" as const,
      block,
      rack,
      occupied,
      free: capacity - occupied,
      capacity,
    })),
  );
  return [...main, ...modern];
}

export function blockStats(block: NewBlock) {
  const racks = rackCapacity[block];
  const occupied = racks.reduce((sum, [, value]) => sum + value, 0);
  const capacity = racks.reduce((sum, [, , value]) => sum + value, 0);
  return { racks: racks.length, occupied, capacity, free: capacity - occupied };
}

export const localWarehouseSnapshot: Record<WarehouseKey, number> = {
  A: 0,
  B: 0,
};

export function getNewRackColumns(block: NewBlock, rack: number): number[] {
  const config = getNewRackConfig(block, rack);
  return [
    ...config.columns.map((item) => item.column),
    ...config.balconies.map((item) => item.column),
  ].sort((left, right) => left - right);
}

export function getNewLocationMaxPlace(
  block: NewBlock,
  rack: number,
  column: number,
): number {
  const config = getNewRackConfig(block, rack);
  const balcony = config.balconies.find((item) => item.column === column);
  if (balcony) return balcony.levelCount * balcony.slots;
  const regular = config.columns.find((item) => item.column === column);
  return regular ? config.levels * regular.slots : 0;
}

export function resolveMainLocation(
  rack: MainRack,
  column: number,
  place: number,
): ResolvedLocation | null {
  if (!Number.isInteger(column) || column < 1 || column > 15) return null;
  const slots = getMainSlotsPerLevel(rack, column);
  if (!Number.isInteger(place) || place < 1 || place > slots * 5) return null;
  return {
    column,
    level: Math.floor((place - 1) / slots),
    slot: ((place - 1) % slots) + 1,
    place,
  };
}

export function resolveNewLocation(
  block: NewBlock,
  rack: number,
  column: number,
  place: number,
): ResolvedLocation | null {
  if (!Number.isInteger(rack) || rack < 1 || rack > rackCounts[block]) return null;
  const config = getNewRackConfig(block, rack);
  const balcony = config.balconies.find((item) => item.column === column);
  if (balcony) {
    const max = balcony.levelCount * balcony.slots;
    if (!Number.isInteger(place) || place < 1 || place > max) return null;
    return {
      column,
      level: balcony.startLevel + Math.floor((place - 1) / balcony.slots),
      // Na mapie balkon przechowuje numer miejsca liczony przez wszystkie poziomy.
      slot: place,
      place,
    };
  }
  const regular = config.columns.find((item) => item.column === column);
  if (!regular) return null;
  const max = config.levels * regular.slots;
  if (!Number.isInteger(place) || place < 1 || place > max) return null;
  return {
    column,
    level: Math.floor((place - 1) / regular.slots),
    slot: ((place - 1) % regular.slots) + 1,
    place,
  };
}
