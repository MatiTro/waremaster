"use client";
import { useCallback, useState, useSyncExternalStore, type SetStateAction } from "react";
import {
  subscribeData, readStoredValue, writeStoredValue, serverMode, getSyncState,
  flushSharedWrites, refreshSharedData, discardPendingAndReload, exportPending, hasPendingWrites,
} from "./shared-storage";

export function useSharedState<T>(key: string, initial: T | (() => T)): [T, (value: SetStateAction<T>) => void] {
  const [fallback] = useState<T>(() => typeof initial === "function" ? (initial as () => T)() : initial);
  const get = useCallback(() => readStoredValue(key, fallback), [fallback,key]);
  const value = useSyncExternalStore(subscribeData, get, () => fallback);
  const set = useCallback((update: SetStateAction<T>) => {
    const next = typeof update === "function" ? (update as (current:T) => T)(get()) : update;
    writeStoredValue(key,next);
  }, [key,get]);
  return [value,set];
}

export function ServerSyncStatus() {
  const status = useSyncExternalStore(subscribeData,getSyncState,getSyncState);
  if (!serverMode) return null;
  return (
    <div className={`server-sync-state sync-${status.phase}`} role={status.phase === "error" ? "alert" : "status"} aria-live="polite">
      <span>{status.message}</span>
      {status.phase === "error" && <div>
        {!status.conflict && <button type="button" onClick={() => { void flushSharedWrites().then(refreshSharedData).catch(() => {}); }}>Ponów połączenie / zapis</button>}
        {hasPendingWrites() && <>
          <button type="button" onClick={exportPending}>Pobierz niezapisane zmiany</button>
          <button type="button" onClick={() => {
            if (window.confirm("Wczytać dane z serwera i odrzucić lokalne zmiany? Najpierw pobierz kopię niezapisanych zmian, jeśli chcesz je zachować."))
              void discardPendingAndReload().catch(() => {});
          }}>Wczytaj dane z serwera</button>
        </>}
      </div>}
    </div>
  );
}
