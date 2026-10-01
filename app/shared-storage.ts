// Tryb jest ustalany podczas budowania. Wersja serwerowa NIGDY nie przechodzi
// awaryjnie na localStorage i nie ufa roli przesłanej przez przeglądarkę.
export const serverMode = import.meta.env?.VITE_SERVER_MODE === "true";
export type ServerUser = { username: string; displayName: string; role: "leader" | "warehouse_worker" };
type DocumentRow = { key: string; version: number; data: unknown };
type Pending = { version: number; data: unknown };
type Batch = { requestId: string; changes: DocumentRow[] };
type SyncState = { phase: "loading" | "saved" | "saving" | "error"; message: string; conflict: boolean };
const confirmed = new Map<string, DocumentRow>();
const pending = new Map<string, Pending>();
const localCache = new Map<string, unknown>();
let state: SyncState = { phase: "loading", message: "Łączenie z serwerem…", conflict: false };
let csrfToken = "";
let activeUser = "";
let live: EventSource | null = null;
let recovery: Batch | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let activeSave: Promise<void> | null = null;
let restoring: Promise<ServerUser | null> | null = null;
let epoch = 0;
const listeners = new Set<() => void>();

export function subscribeData(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function emit() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    for (const area of ["raw", "finished"]) {
      window.dispatchEvent(new Event(`warehouse-workforce-updated:${area}`));
      window.dispatchEvent(new Event(`warehouse-shift-board-updated:${area}`));
    }
  }
}
export function getSyncState() { return state; }
function status(phase: SyncState["phase"], message: string, conflict = false) { state = { phase, message, conflict }; emit(); }
export function hasPendingWrites() { return pending.size > 0 || !!recovery || !!activeSave; }
export function readStoredValue<T>(key: string, fallback: T): T {
  if (serverMode) return (pending.get(key)?.data ?? confirmed.get(key)?.data ?? fallback) as T;
  if (localCache.has(key)) return localCache.get(key) as T;
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const value = raw === null ? fallback : JSON.parse(raw);
    localCache.set(key, value);
    return value as T;
  } catch { return fallback; }
}
export function readStoredJson(key: string) { return JSON.stringify(readStoredValue(key, null)); }
export function writeStoredValue<T>(key: string, value: T) {
  if (serverMode) {
    if (!csrfToken || !confirmed.has(key)) throw new Error("Brak dostępu do zapisu tego modułu.");
    if (JSON.stringify(readStoredValue(key, null)) === JSON.stringify(value)) return;
    pending.set(key, { version: pending.get(key)?.version ?? confirmed.get(key)!.version, data: value });
    if (state.phase === "error") { emit(); return; }
    status("saving", "Zapisywanie zmian…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void flushSharedWrites().catch(() => {}); }, 220);
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
    localCache.set(key, value); emit();
  }
}

class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(csrfToken ? { "X-WM-CSRF": csrfToken } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, result.error || "Nie można połączyć się z serwerem.");
  return result;
}
function accept(rows: DocumentRow[]) {
  for (const row of rows) if (row.version >= (confirmed.get(row.key)?.version || 0)) confirmed.set(row.key, row);
  emit();
}
export async function refreshSharedData() {
  if (!serverMode || !csrfToken) return;
  const generation = epoch;
  try {
    const result = await api("state");
    if (generation !== epoch) return;
    accept(result.documents);
    if (!hasPendingWrites()) status("saved", "Dane aktualne");
  } catch (error) {
    if (generation === epoch) status("error", error instanceof Error ? error.message : "Brak połączenia. Nie zamykaj strony.", state.conflict);
  }
}
function liveUpdates() {
  live?.close();
  live = new EventSource("/api/events", { withCredentials: true });
  live.addEventListener("changed", () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { void refreshSharedData(); }, 100);
  });
  live.addEventListener("session-expired", () => { live?.close(); status("error", "Sesja wygasła. Zabezpiecz niezapisane zmiany i zaloguj się ponownie."); });
  live.addEventListener("unavailable", () => status("error", "Baza jest niedostępna. Nie zamykaj strony."));
  live.onerror = () => status("error", "Połączenie przerwane. Ponowne łączenie…", state.conflict);
  live.onopen = () => { void refreshSharedData(); };
}
export function openServerSession(username?: string, password?: string): Promise<ServerUser | null> {
  if (username !== undefined) return initializeSession(username, password);
  restoring ??= initializeSession().finally(() => { restoring = null; });
  return restoring;
}
async function initializeSession(username?: string, password?: string): Promise<ServerUser | null> {
  if (hasPendingWrites()) throw new Error("Najpierw zabezpiecz niezapisane zmiany.");
  try {
    const result = username === undefined ? await api("session") : await api("login", "POST", { username, password });
    csrfToken = result.csrfToken;
    const snapshot = await api("state");
    epoch++; confirmed.clear(); pending.clear(); recovery = null;
    activeUser = result.user.username; accept(snapshot.documents);
    status("saved", "Dane aktualne"); liveUpdates();
    return result.user;
  } catch (error) {
    csrfToken = "";
    if (username === undefined && error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
export async function closeServerSession() {
  if (hasPendingWrites()) throw new Error("Są niezapisane zmiany. Pobierz ich kopię lub ponów zapis przed wylogowaniem.");
  try { await api("logout", "POST", {}); }
  catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  epoch++; live?.close(); live = null; csrfToken = ""; activeUser = "";
  clearTimeout(refreshTimer); clearTimeout(saveTimer); confirmed.clear(); pending.clear(); localCache.clear(); emit();
}
export function flushSharedWrites(): Promise<void> {
  if (!serverMode) return Promise.resolve();
  if (activeSave) return activeSave;
  clearTimeout(saveTimer);
  activeSave = (async () => {
    if (state.conflict) throw new Error(state.message);
    if (state.phase === "error" && !pending.size && !recovery) {
      try { accept((await api("state")).documents); }
      catch (error) { throw error; }
    }
    while (pending.size || recovery) {
      const batch: Batch = recovery || { requestId: crypto.randomUUID(), changes: [...pending].map(([key,value]) => ({key,...value})) };
      recovery = batch; status("saving", "Zapisywanie zmian…");
      try {
        const result = await api("state", "POST", batch);
        for (const row of result.documents as DocumentRow[]) {
          const sent = batch.changes.find(item => item.key === row.key)!;
          const waiting = pending.get(row.key);
          if (waiting && JSON.stringify(waiting.data) === JSON.stringify(sent.data)) pending.delete(row.key);
          else if (waiting) pending.set(row.key, { ...waiting, version: row.version });
        }
        recovery = null; accept(result.documents);
      } catch (error) {
        const conflict = error instanceof ApiError && [403,409,422].includes(error.status);
        status("error", error instanceof Error ? error.message : "Nie udało się potwierdzić zapisu. Nie zamykaj strony.", conflict);
        throw error;
      }
    }
    status("saved", "Zapisano na serwerze");
  })().finally(() => { activeSave = null; });
  return activeSave;
}
export async function discardPendingAndReload() {
  if (activeSave) return;
  // Pobierz najpierw. Awaria odczytu nie może skasować jedynej roboczej kopii.
  const result = await api("state");
  pending.clear(); recovery = null; confirmed.clear(); accept(result.documents);
  status("saved", "Wczytano dane z serwera");
}
export function exportPending() {
  const blob = new Blob([JSON.stringify({ user: activeUser, savedAt: new Date().toISOString(), pending: [...pending].map(([key,value]) => ({key,...value})), recovery }, null, 2)], {type:"application/json"});
  const href = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href=href; link.download="Warehouse-niezapisane-zmiany.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

if (typeof window !== "undefined" && serverMode) {
  window.addEventListener("beforeunload", event => { if (hasPendingWrites()) { event.preventDefault(); event.returnValue=""; } });
  window.addEventListener("online", () => { void refreshSharedData(); });
  window.addEventListener("focus", () => { void refreshSharedData(); });
}
