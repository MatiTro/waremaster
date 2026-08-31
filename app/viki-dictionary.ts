// Lokalny słownik VIKI. Nie korzysta z API ani usług AI.
// Tutaj można bezpiecznie dopisywać kolejne warianty wymowy zebrane podczas testów.

export const supplierPronunciations: Record<string, string[]> = {
  Kurier: ["kurier", "kurjer"],
  Klockner: ["klockner", "klokner", "klekner", "klok n er", "kloeckner"],
  "Far Eastern": ["far eastern", "far ist", "faristern", "far easterny", "far istern"],
  Itochu: ["itochu", "itoczu", "ito czu", "ito czół", "itociu"],
  Liveo: ["liveo", "liweo", "li veo", "liwio", "liveło"],
  Avery: ["avery", "awery", "averi", "aweri", "ewery"],
  Raflatac: [
    "raflatac",
    "raflatak",
    "raf tak",
    "raf latak",
    "raf latek",
    "raflatacz",
    "rafla tak",
    "raf latac",
    "raf lata",
  ],
  Jinda: ["jinda", "dzinda", "zinda", "żinda", "dżinda"],
  Magzew: ["magzew", "mak zew", "mag zew", "makzew", "mag żew"],
  Andersa: ["andersa", "anders", "andersa kleje", "andersa magazyn"],
};

export const materialPronunciations: Record<string, string[]> = {
  Papier: ["papier", "papieru", "papierem", "papiery", "rolki papieru", "papierowy"],
  Folia: ["folia", "folii", "folie", "folią", "foliowy", "rolki folii"],
  Karton: ["karton", "kartonu", "kartony", "kartonem", "tektura", "tektury"],
  Tuleje: ["tuleje", "tuleja", "tulei", "tuleją", "tuby", "rdzenie", "gilzy"],
};

export const voiceIntents = {
  greeting: [
    "czesc", "hej", "dzien dobry", "witaj", "witaj viki", "jak sie masz",
    "jestes tam", "slyszysz mnie",
  ],
  warehouseKnowledge: [
    "opowiedz o magazynie", "opisz magazyn", "jak wyglada magazyn",
    "jak zbudowany jest magazyn", "co wiesz o magazynie", "informacje o magazynie",
    "ile magazyn ma miejsc", "ile jest regallow", "ile jest regalow",
    "ile ma regalow", "jakie sa bloki", "ile jest blokow", "pojemnosc magazynu",
    "porownaj magazyny", "ktory magazyn", "roznica miedzy magazynami",
  ],
  rackKnowledge: [
    "opowiedz o regale", "opisz regal", "co wiesz o regale", "informacje o regale",
    "ile regal ma miejsc", "pojemnosc regalu", "ile jest wolnych w regale",
    "ile jest zajetych w regale", "zajetosc regalu", "pokaz regal", "otworz regal",
    "przejdz do regalu", "znajdz regal", "ile ma poziomow", "ile ma kolumn",
    "czy ma balkon", "jakie ma balkony", "gdzie jest balkon", "ile miejsc na poziom",
    "najbardziej pusty regal", "najbardziej pelny regal", "najwiecej wolnych w regale",
    "najmniej wolnych w regale",
  ],
  placement: [
    "gdzie odlozyc", "gdzie polozyc", "gdzie postawic", "gdzie wstawic",
    "gdzie wrzucic", "gdzie dac", "znajdz miejsce", "poszukaj miejsca",
    "zaproponuj miejsce", "polec miejsce", "jaki regal", "ktory regal",
    "do ktorego regalu", "gdzie ma isc", "gdzie moze isc", "miejsce dla dostawy",
    "miejsce na palety", "rozlokuj dostawe", "przydziel miejsce",
    "gdzie skladowac", "gdzie zawiezc", "gdzie przewiezc", "dokad z paleta",
    "dokad z dostawa", "wybierz lokalizacje", "dobierz lokalizacje",
    "znajdz lokalizacje", "zaplanuj odlozenie", "gdzie bedzie najlepiej",
    "mam dostawe", "przyjechala dostawa", "przyjechal towar", "przyjechalo palet",
    "przywiezli palety", "gdzie z dostawa", "gdzie z paletami", "co z ta dostawa",
    "musze rozladowac", "zaczynam rozladunek", "gdzie to wstawic",
  ],
  freePlaces: [
    "wolne miejsce", "wolnych miejsc", "gdzie jest wolne", "najwiecej miejsca",
    "najwiecej wolnych", "pusty regal", "wolny regal", "gdzie jest luz",
    "ile wolnego", "ile miejsca zostalo", "co jest wolne", "pokaz wolne",
    "wolna lokalizacja", "puste miejsce", "puste lokalizacje", "gdzie sa luki",
    "ktory regal ma miejsce", "gdzie sie zmiesci", "czy mamy miejsce", "wolne",
  ],
  stock: [
    "stan magazynu", "stan zapasow", "ile palet", "liczba palet", "ile towaru",
    "ile mamy", "zajetosc magazynu", "podsumowanie zapasow", "raport zapasow",
    "co mamy na stanie", "co jest na magazynie", "pokaz zapasy", "podaj zapasy",
    "ile jest zajete", "jaka jest zajetosc", "podsumuj magazyn", "zapasy",
  ],
  identifiers: [
    "numer identyfikacyjny", "numery identyfikacyjne", "numer ni", "numery ni",
    "jakie ni", "pokaz ni", "odczytaj ni", "co lezy na miejscu", "co jest na lokalizacji",
    "identyfikatory lokalizacji", "lista ni", "numery na miejscu", "numery na paletach",
    "jakie palety tu stoja", "co stoi na lokalizacji", "zawartosc miejsca",
  ],
  deliveryReport: [
    "raport dostaw", "statystyki dostaw", "dostawy w miesiacu", "miesieczny raport",
    "ile dostaw", "najwiecej dostaw", "dostawy dostawcy", "podsumowanie dostaw",
    "podsumuj dostawy", "zestawienie dostaw", "raport miesieczny dostaw",
    "ile przyjechalo", "ktory dostawca mial najwiecej dostaw",
  ],
  openDeliveries: [
    "otworz dostawy", "pokaz dostawy", "przejdz do dostaw", "lista dostaw",
    "wejdz w dostawy", "rejestr dostaw", "dostawy",
  ],
  openMap: [
    "otworz mape", "pokaz mape", "przejdz do mapy", "mapa magazynu",
    "wejdz na mape", "pokaz regaly", "widok magazynu", "mapa",
  ],
  openBarcodes: [
    "otworz kody", "pokaz kody", "generator kodow", "kod kreskowy",
    "wygeneruj kod", "wydrukuj kod", "drukuj kod", "zrob kod", "pokaz kod",
    "kod lokalizacji", "kod ladunku", "przejdz do kodow", "kody",
  ],
  openSchedule: [
    "otworz grafik", "pokaz grafik", "przejdz do grafiku", "grafik zmian",
    "grafik pracownikow", "wejdz w grafik", "otworz plan zmian", "plan zmian",
  ],
  openCleaning: [
    "otworz karte mycia", "pokaz karte mycia", "karta mycia",
    "mycie i dezynfekcja", "grafik sprzatania", "plan sprzatania",
    "dokument mycia", "kto sprzata", "odpowiedzialny za sprzatanie",
  ],
  missingLoad: [
    "zglos brak ladunku", "brak ladunku", "nie ma ladunku", "nie znaleziono ladunku",
    "wyslij mail do logistyki", "napisz do logistyki", "zglos brak zamowienia",
    "nie znajduje ladunku", "brakuje ladunku", "ladunku nie ma", "brak w systemie",
    "powiadom logistyke", "wyslij zgloszenie braku",
  ],
  rackRules: [
    "gdzie moze jechac dostawca", "regaly dostawcy", "regal dla dostawcy",
    "gdzie skladowac dostawce", "gdzie trzymamy", "przypisany regal",
    "dozwolone regaly", "jakie regaly", "na ktore regaly", "regaly dla surowca",
    "gdzie moze stac", "gdzie wolno skladowac", "przeznaczone regaly",
  ],
  selectedLocation: [
    "czy to miejsce jest wolne", "czy lokalizacja jest wolna", "status lokalizacji",
    "co jest tutaj", "co jest w tym miejscu", "wybrane miejsce", "wybrana lokalizacja",
    "sprawdz to miejsce", "sprawdz lokalizacje", "czy tutaj jest wolne",
    "jaki regal jest wybrany", "jaka lokalizacja jest wybrana", "co teraz pokazujesz",
  ],
  help: [
    "co potrafisz", "pomoc", "jakie komendy", "co umiesz", "w czym pomozesz",
    "co moge powiedziec", "jak z toba rozmawiac", "podaj przyklady",
  ],
  finish: [
    "dziekuje", "dzieki", "to wszystko", "koniec", "zasnij", "mozesz spac",
    "wystarczy", "anuluj", "niewazne", "nic wiecej",
  ],
} as const;

const numberWords: Record<string, number> = {
  zero: 0, jeden: 1, jedna: 1, jedno: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4,
  piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10,
  jedenascie: 11, dwanascie: 12, trzynascie: 13, czternascie: 14,
  pietnascie: 15, szesnascie: 16, siedemnascie: 17, osiemnascie: 18,
  dziewietnascie: 19, dwadziescia: 20, trzydziesci: 30, czterdziesci: 40,
  piecdziesiat: 50, szescdziesiat: 60, siedemdziesiat: 70, osiemdziesiat: 80,
  dziewiecdziesiat: 90, sto: 100, dwiescie: 200, trzysta: 300, czterysta: 400,
  piecset: 500, szescset: 600, siedemset: 700, osiemset: 800, dziewiecset: 900,
  tysiac: 1000,
};

export function normalizeVikiText(value: string) {
  return value
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const wakeAliases = [
  "viki",
  "wiki",
  "wiky",
  "wikii",
  "vicky",
  "vicki",
  "hej viki",
  "hej wiki",
] as const;

export function isOnlyRecognitionPunctuation(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && !/[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed);
}

export function detectVikiWake(transcripts: string[]) {
  for (const transcript of transcripts) {
    const normalized = normalizeVikiText(transcript);
    if (!normalized) continue;
    const words = normalized.split(" ");
    for (const alias of wakeAliases) {
      const normalizedAlias = normalizeVikiText(alias);
      const aliasWords = normalizedAlias.split(" ");
      for (let index = 0; index <= words.length - aliasWords.length; index += 1) {
        const candidate = words.slice(index, index + aliasWords.length).join(" ");
        const compactCandidate = candidate.replace(/\s/g, "");
        const compactAlias = normalizedAlias.replace(/\s/g, "");
        const tolerance = compactAlias.length >= 5 ? 1 : 0;
        if (
          candidate === normalizedAlias ||
          compactCandidate === compactAlias ||
          distance(compactCandidate, compactAlias) <= tolerance
        ) {
          return {
            heard: true,
            transcript,
            command: words
              .slice(index + aliasWords.length)
              .join(" ")
              .trim(),
          };
        }
      }
    }
  }
  return { heard: false, transcript: "", command: "" };
}

export function isIncompleteVikiCommand(value: string) {
  const normalized = normalizeVikiText(value);
  if (!normalized) return true;
  const words = normalized.split(" ");
  const unfinishedEndings = new Set([
    "gdzie", "ile", "jaki", "jaka", "jakie", "ktory", "ktora", "ktore",
    "czy", "pokaz", "otworz", "znajdz", "zglos", "wygeneruj", "dla", "od",
  ]);
  if (words.length === 1) return unfinishedEndings.has(words[0]);
  return unfinishedEndings.has(words.at(-1) || "");
}

export function hasIntent(text: string, phrases: readonly string[]) {
  const normalized = normalizeVikiText(text);
  return phrases.some((phrase) => matchesAlias(normalized, phrase));
}

function distance(left: string, right: string) {
  const rows = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return rows[right.length];
}

function matchesAlias(text: string, alias: string) {
  const normalizedText = normalizeVikiText(text);
  const normalizedAlias = normalizeVikiText(alias);
  if (normalizedText.includes(normalizedAlias)) return true;
  const aliasWords = normalizedAlias.split(" ");
  const words = normalizedText.split(" ");
  for (let size = Math.max(1, aliasWords.length - 1); size <= aliasWords.length + 1; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const candidate = words.slice(index, index + size).join(" ");
      const tolerance = normalizedAlias.length >= 8 ? 2 : normalizedAlias.length >= 5 ? 1 : 0;
      if (distance(candidate, normalizedAlias) <= tolerance) return true;
    }
  }
  return false;
}

export function findSupplier(text: string, supplierNames: string[]) {
  for (const name of supplierNames) {
    const aliases = [name, ...(supplierPronunciations[name] || [])];
    if (aliases.some((alias) => matchesAlias(text, alias))) return name;
  }
  return undefined;
}

export function findRackMaterial(text: string) {
  for (const [material, aliases] of Object.entries(materialPronunciations)) {
    if (aliases.some((alias) => matchesAlias(text, alias))) return material;
  }
  return undefined;
}

function parseWordNumber(words: string[]) {
  let value = 0;
  let found = false;
  for (const word of words) {
    if (numberWords[word] === undefined) continue;
    value += numberWords[word];
    found = true;
  }
  return found ? value : undefined;
}

export function extractFirstVikiNumber(text: string) {
  const normalized = normalizeVikiText(text);
  const digit = normalized.match(/\b\d{1,5}\b/);
  if (digit) return Number(digit[0]);
  return parseWordNumber(normalized.split(" "));
}

export function extractNumberNear(text: string, unitPattern: RegExp) {
  const normalized = normalizeVikiText(text);
  const digitMatch = normalized.match(new RegExp(`(\\d{1,5})\\s*(?:${unitPattern.source})`));
  if (digitMatch) return Number(digitMatch[1]);
  const words = normalized.split(" ");
  const unitIndex = words.findIndex((word) => unitPattern.test(word));
  if (unitIndex < 0) return undefined;
  return parseWordNumber(words.slice(Math.max(0, unitIndex - 4), unitIndex));
}

export type VikiWarehouseReference = {
  warehouse?: "main" | "new";
  block?: "M1" | "M2" | "M3";
  rack?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | number;
  explicitWarehouse: boolean;
  explicitBlock: boolean;
  explicitRack: boolean;
};

const spokenRackLetters: Record<string, VikiWarehouseReference["rack"]> = {
  a: "A",
  b: "B",
  be: "B",
  c: "C",
  ce: "C",
  d: "D",
  de: "D",
  e: "E",
  f: "F",
  ef: "F",
  g: "G",
  gie: "G",
};

const blockAliases: Record<"M1" | "M2" | "M3", string[]> = {
  M1: ["m1", "m 1", "em 1", "em jeden", "blok 1", "blok jeden", "blok pierwszy", "pierwszy blok"],
  M2: ["m2", "m 2", "em 2", "em dwa", "blok 2", "blok dwa", "blok drugi", "drugi blok"],
  M3: ["m3", "m 3", "em 3", "em trzy", "blok 3", "blok trzy", "blok trzeci", "trzeci blok"],
};

function hasWholePhrase(text: string, phrase: string) {
  return (` ${text} `).includes(` ${normalizeVikiText(phrase)} `);
}

function numberAfterRackWord(normalized: string) {
  const words = normalized.split(" ");
  const rackIndex = words.findIndex((word) => word.startsWith("regal"));
  if (rackIndex < 0) return undefined;
  const candidates = words.slice(rackIndex + 1, rackIndex + 5)
    .filter((word) => !["numer", "numerze", "nr", "na", "w"].includes(word));
  const digit = candidates.find((word) => /^\d{1,2}$/.test(word));
  if (digit) return Number(digit);
  return parseWordNumber(candidates);
}

export function parseVikiWarehouseReference(
  text: string,
  context: Partial<VikiWarehouseReference> = {},
): VikiWarehouseReference {
  const normalized = normalizeVikiText(text);
  const words = normalized.split(" ").filter(Boolean);
  const mainMention =
    /magazyn\w* glown|glown\w* magazyn|stary\w* magazyn/.test(normalized);
  const newMention =
    /now\w* magazyn|magazyn\w* now/.test(normalized);

  let block: VikiWarehouseReference["block"];
  for (const [candidate, aliases] of Object.entries(blockAliases) as ["M1" | "M2" | "M3", string[]][]) {
    if (aliases.some((alias) => hasWholePhrase(normalized, alias))) {
      block = candidate;
      break;
    }
  }

  const rackWordIndex = words.findIndex((word) => word.startsWith("regal"));
  const spokenLetter = rackWordIndex >= 0
    ? words.slice(rackWordIndex + 1, rackWordIndex + 4)
      .map((word) => spokenRackLetters[word])
      .find(Boolean)
    : undefined;
  let rack: VikiWarehouseReference["rack"] = spokenLetter;

  const numericAfterRack = numberAfterRackWord(normalized);
  const compactBlockRack = normalized.match(/\bm\s*([123])\s+(\d{1,2})\b/);
  if (!rack && numericAfterRack !== undefined) rack = numericAfterRack;
  if (!rack && compactBlockRack) {
    block = `M${compactBlockRack[1]}` as "M1" | "M2" | "M3";
    rack = Number(compactBlockRack[2]);
  }

  const explicitRack = rack !== undefined;
  const explicitBlock = block !== undefined;
  const explicitWarehouse = mainMention || newMention || explicitBlock || typeof rack === "string";
  let warehouse: VikiWarehouseReference["warehouse"] = mainMention
    ? "main"
    : newMention || block || typeof rack === "number"
      ? "new"
      : undefined;

  const contextualPhrase = /\b(tam|tego|temu|tym|ten|go|jego|w nim|na nim|tutaj)\b/.test(normalized);
  if (!warehouse && (contextualPhrase || /regal|magazyn|blok/.test(normalized))) {
    warehouse = context.warehouse;
  }
  if (!block && warehouse === "new" && (contextualPhrase || explicitRack || /blok|regal/.test(normalized))) {
    block = context.block;
  }
  if (!rack && contextualPhrase) rack = context.rack;

  if (typeof rack === "string") {
    warehouse = "main";
    block = undefined;
  }
  if (typeof rack === "number" && !block && context.warehouse === "new") {
    block = context.block;
  }

  return {
    warehouse,
    block,
    rack,
    explicitWarehouse,
    explicitBlock,
    explicitRack,
  };
}
